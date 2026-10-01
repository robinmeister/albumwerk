import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Selector } from "@astryxdesign/core/Selector";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ArrowLeft as ArrowBack } from "lucide-react";
import { toast } from "react-toastify";
import { currentUser } from "../../../../config/currentUser";
import { getRecord, pb } from "../../../../config/pocketbase";
import { ReactElement, useContext, useEffect, useState } from "react";

import { ImagePriceObject, Package, PriceWithQuantity } from "../../../../utils/types";
import { calculateTotalPackagePrice, calculateTotalPrice } from "../../utils/functions";
import { AuthContext } from "../../../../context/AuthContext";
import { useSettings } from "../../../../context/SettingsContext";
import { hasLabItem, shippingFor } from "../../utils/shipping";
import PaypalForm from "./PaypalForm";
import StripeForm from "./StripeForm";
import PaymentUnavailable from "../../../../components/feedback/PaymentUnavailable";
import PageLoader from "../../../../components/feedback/PageLoader";
import { thumbUrl } from "../../../Album/components/AlbumImage";

type Props = {
  handleBack: () => void;
  handleNext: () => void;
  imagePriceObjectList: ImagePriceObject[];
  shootingPackage?: Package;
  shootingId?: string;
  selectedImages: string[];
  paymentCompleted: boolean;
  setPaymentCompleted: (paymentCompleted: boolean) => void;
  userData: any;
  setUserData: (userData: any) => void;
  onPaid: (orderId: string) => void;
};

const s = stylex.create({
  section: { marginBottom: 24 },
  sectionLabel: { letterSpacing: "0.08em", fontSize: "0.7rem" },
  divider: { marginBottom: 12, marginTop: 4 },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr 1fr",
      "@media (min-width: 600px)": "repeat(3, 1fr)",
      "@media (min-width: 900px)": "repeat(4, 1fr)",
    },
    gap: 12,
    marginBottom: 12,
  },
  card: {
    overflow: "hidden",
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
  },
  cardImg: { width: "100%", height: 100, objectFit: "cover", display: "block" },
  cardBody: { padding: "6px 8px" },
  cardLine: { display: "flex", justifyContent: "space-between", gap: 8 },
  totalRow: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 },
  formGrid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr" },
    gap: 16,
  },
  full: { gridColumn: "1 / -1" },
  // Anbieterwahl: Liste und Zahlbereich sitzen aneinander, eine Umrandung um
  // beides — der gewählte Weg gehört sichtbar zu der Zeile darüber.
  // StyleX verwirft die border-Kurzform, nur die Longhands kommen im Bundle an.
  // --color-border liegt zudem bei 10 % Deckkraft und verschwindet auf dem
  // hellen Grund; die Umrandung muss hier tragen, also der kräftigere Token.
  methodList: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--color-border-emphasized)",
    paddingBlock: 12,
    paddingInline: 14,
  },
  methodPanel: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderStyle: "solid",
    borderColor: "var(--color-border-emphasized)",
    padding: 16,
  },
  methodMarks: { display: "flex", gap: 4 },
  methodMark: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--color-border-emphasized)",
    color: "var(--color-text-secondary)",
    fontSize: "0.6rem",
    letterSpacing: "0.06em",
    lineHeight: 1,
    padding: "4px 5px",
  },
  // PayPal-Gelb ist die Marke, kein Theme-Wert — deshalb fest.
  paypalMark: {
    backgroundColor: "#ffc439",
    color: "#003087",
    fontSize: "0.78rem",
    fontWeight: 700,
    lineHeight: 1.35,
    padding: "3px 7px",
  },
  paypalMarkTail: { color: "#0070ba" },
  back: { marginTop: 16 },
});

// Länder, in die Prodigi aus der EU liefert und die hier realistisch bestellt
// werden. Erweitern ist eine Zeile; die Prüfung macht Prodigi beim Senden.
const LAENDER: { value: string; label: string }[] = [
  { value: "DE", label: "Deutschland" }, { value: "AT", label: "Österreich" },
  { value: "CH", label: "Schweiz" }, { value: "NL", label: "Niederlande" },
  { value: "BE", label: "Belgien" }, { value: "LU", label: "Luxemburg" },
  { value: "FR", label: "Frankreich" }, { value: "IT", label: "Italien" },
  { value: "DK", label: "Dänemark" }, { value: "PL", label: "Polen" },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <Text type="supporting" color="secondary" xstyle={s.sectionLabel}>
      {title}
    </Text>
  );
}

export default function PaymentForm(props: Props): ReactElement {
  const { user } = useContext(AuthContext);
  const { settings } = useSettings();
  const {
    handleBack,
    handleNext,
    imagePriceObjectList,
    shootingPackage,
    shootingId,
    selectedImages,
    paymentCompleted,
    setPaymentCompleted,
    userData,
    setUserData,
    onPaid,
  } = props;

  const [profileId, setProfileId]       = useState("");
  const [loading, setLoading]           = useState(true);
  const [paymentDisabled, setPaymentDisabled] = useState(true);
  // show validation errors only after the customer has interacted with a field
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // "eingerichtet" heißt: Schalter an UND Zugangsdaten da. Ohne Client-ID
  // (z. B. Demo-Seed) kann PayPal nicht laden — dann gar nicht anbieten.
  const paypalAvailable = Boolean(settings.paypalEnabled && settings.paypalClientId);
  const stripeAvailable = Boolean(settings.stripeEnabled);
  // Nur wenn beide Wege offen sind, muss der Kunde wählen. Steht genau einer
  // bereit, zeigt der Zahlbereich ihn direkt — ohne Auswahl ohne Alternative.
  const bothAvailable = paypalAvailable && stripeAvailable;
  const [method, setMethod] = useState<"stripe" | "paypal">("stripe");
  const activeMethod = bothAvailable ? method : stripeAvailable ? "stripe" : "paypal";

  // physical products (prints, canvases …) need a shipping address and a
  // phone number; a digital-only order does not. Package shootings may
  // include prints, so they keep the address to be safe.
  const hasPhysical =
    Boolean(shootingPackage) ||
    imagePriceObjectList.some((obj) =>
      obj.price.some((p) => !p.isDownloadable && p.quantity > 0)
    );

  useEffect(() => {
    if (currentUser()?.uid) {
      void fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPaymentDisabled(!isValidData(userData));
  }, [userData, hasPhysical]);

  useEffect(() => {
    if (paymentCompleted) {
      handleNext();
      if (isValidData(userData)) void updateProfile();
    }
  }, [paymentCompleted]);

  function isValidData(d: any): boolean {
    const emailRe = /^[^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*@[^[\]]+\.[a-zA-Z]{2,}$/;
    const contactOk = Boolean(d.firstName && d.lastName && d.email && emailRe.test(d.email));
    if (!hasPhysical) return contactOk;
    return contactOk && Boolean(d.phone && d.street && d.city && d.zip);
  }

  async function fetchUser() {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    try {
      const profile = await getRecord("users", user.uid);
      if (profile) {
        setProfileId(profile.id);
        setUserData(profile);
      }
    } catch (e) {
      console.error(e);
      toast.error("Deine gespeicherten Daten konnten nicht geladen werden.");
    }
    setLoading(false);
  }

  async function updateProfile() {
    // Best-effort persistence of the contact details for next time. Runs right
    // after a successful payment, so a failure here must not alarm the customer
    // (the order is already placed) — log only, no toast.
    try {
      // `userData` is the whole record the form was seeded from; PB rejects a
      // write that carries the record's own id back.
      const { id: _omit, ...fields } = userData;
      await pb.collection("users").update(profileId, fields);
    } catch (e) {
      console.error(e);
    }
  }

  const showError = (name: string) => Boolean(touched[name]) && !userData[name];

  // Adapts Astryx TextInput to the old required-field behaviour: value-first
  // onChange, blur marks the field touched, error status shows "Pflichtfeld".
  const req = (name: string) => ({
    isRequired: true,
    value: userData[name] ?? "",
    onChange: (v: string) => setUserData((prev: any) => ({ ...prev, [name]: v })),
    onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
    status: showError(name) ? ({ type: "error", message: "Pflichtfeld" } as const) : undefined,
  });

  const goodsTotal = shootingPackage && calculateTotalPrice(imagePriceObjectList) === 0
    ? parseFloat(calculateTotalPackagePrice(shootingPackage, selectedImages.length))
    : calculateTotalPrice(imagePriceObjectList);
  // Pakete verkaufen Bilder, keine Abzüge — Versand nur bei Einzelpreisen
  const hasLab = !shootingPackage && hasLabItem(imagePriceObjectList);
  const shipping = shippingFor(goodsTotal, hasLab, settings.shippingFlat ?? 0, settings.freeShippingFrom ?? 0);
  const totalPrice = goodsTotal + shipping;
  const totalLabel = `${totalPrice.toFixed(2)} €`;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div>
      {/* ── Order summary ── */}
      <div {...stylex.props(s.section)}>
        <SectionHeader title="Bestellübersicht" />
        <div {...stylex.props(s.divider)}><Divider /></div>

        {!shootingPackage && imagePriceObjectList.length > 0 && (
          <div {...stylex.props(s.summaryGrid)}>
            {imagePriceObjectList.map((obj, idx) => (
              <div key={obj.image} {...stylex.props(s.card)}>
                <img src={thumbUrl(obj.image)} alt={`Bild ${idx + 1}`} {...stylex.props(s.cardImg)} />
                <div {...stylex.props(s.cardBody)}>
                  {obj.price.map((p: PriceWithQuantity) => (
                    <div key={p.id} {...stylex.props(s.cardLine)}>
                      <Text type="supporting" maxLines={1}>
                        {p.quantity}× {p.title}
                      </Text>
                      <Text type="supporting" weight="semibold">
                        {(parseFloat(p.amount) * p.quantity).toFixed(2)}€
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {shootingPackage && (
          <div style={{ marginBottom: 12 }}>
            <Text type="body">
              {shootingPackage.title} · {selectedImages.length} Bilder
            </Text>
          </div>
        )}

        {hasLab && (
          <div {...stylex.props(s.totalRow)}>
            <Text type="body" color="secondary">Versand</Text>
            <Text type="body">{shipping > 0 ? `${shipping.toFixed(2)} €` : "kostenlos"}</Text>
          </div>
        )}
        <div {...stylex.props(s.totalRow)}>
          <Text type="body" color="secondary">Gesamtpreis</Text>
          <Badge variant="info" label={totalLabel} />
        </div>
      </div>

      {/* ── Contact ── */}
      <div {...stylex.props(s.section)}>
        <SectionHeader title="Kontakt" />
        <div {...stylex.props(s.divider)}><Divider /></div>
        <div {...stylex.props(s.formGrid)}>
          <TextInput width="100%" label="Vorname" {...req("firstName")} />
          <TextInput width="100%" label="Nachname" {...req("lastName")} />
          <TextInput width="100%" label="E-Mail" {...req("email")} />
          {hasPhysical && <TextInput width="100%" label="Telefon" {...req("phone")} />}
        </div>
      </div>

      {/* ── Address — only when something has to be shipped ── */}
      {hasPhysical ? (
        <div {...stylex.props(s.section)}>
          <SectionHeader title="Lieferadresse" />
          <div {...stylex.props(s.divider)}><Divider /></div>
          <div {...stylex.props(s.formGrid)}>
            <div {...stylex.props(s.full)}>
              <TextInput width="100%" label="Straße & Hausnummer" {...req("street")} />
            </div>
            <TextInput width="100%" label="PLZ" {...req("zip")} />
            <TextInput width="100%" label="Stadt" {...req("city")} />
            <TextInput
              width="100%"
              label="Bundesland"
              value={userData.state ?? ""}
              onChange={(v) => setUserData((prev: any) => ({ ...prev, state: v }))}
            />
            <Selector
              width="100%"
              label="Land"
              options={LAENDER}
              value={userData.country || "DE"}
              onChange={(v) => setUserData((prev: any) => ({ ...prev, country: v ?? "DE" }))}
            />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <Text type="body" color="secondary">
            Deine Bestellung enthält nur digitale Produkte — eine Lieferadresse ist nicht nötig.
          </Text>
        </div>
      )}

      {/* ── Payment ── */}
      <div {...stylex.props(s.section)}>
        <SectionHeader title="Zahlung" />
        <div {...stylex.props(s.divider)}><Divider /></div>
        {paymentDisabled && (
          <div style={{ marginBottom: 12 }}>
            <Text type="body" color="secondary">
              Bitte fülle alle Pflichtfelder aus, um die Zahlung fortzusetzen.
            </Text>
          </div>
        )}
        {!paypalAvailable && !stripeAvailable && <PaymentUnavailable />}

        {bothAvailable && (
          <div {...stylex.props(s.methodList)}>
            <RadioList
              label="Zahlungsart"
              isLabelHidden
              value={method}
              onChange={(v) => setMethod(v as "stripe" | "paypal")}
            >
              <RadioListItem
                value="stripe"
                label="Kreditkarte"
                description="Sichere Bezahlseite von Stripe"
                endContent={
                  <div {...stylex.props(s.methodMarks)}>
                    {["VISA", "MC", "AMEX"].map((m) => (
                      <span key={m} {...stylex.props(s.methodMark)}>{m}</span>
                    ))}
                  </div>
                }
              />
              <RadioListItem
                value="paypal"
                label="PayPal"
                description="Guthaben, Lastschrift oder hinterlegte Karte"
                endContent={
                  <span {...stylex.props(s.paypalMark)}>
                    Pay<span {...stylex.props(s.paypalMarkTail)}>Pal</span>
                  </span>
                }
              />
            </RadioList>
          </div>
        )}

        <div {...stylex.props(bothAvailable && s.methodPanel)}>
          {stripeAvailable && activeMethod === "stripe" && (
            <StripeForm
              description={`Fotobestellung (${selectedImages.length} Bilder)`}
              disabled={paymentDisabled}
              amountLabel={totalLabel}
              imagePriceObjectList={imagePriceObjectList}
              shootingId={shootingId}
              userData={userData}
            />
          )}
          {paypalAvailable && activeMethod === "paypal" && (
            <PaypalForm
              disabled={paymentDisabled}
              paymentCompleted={paymentCompleted}
              setPaymentCompleted={setPaymentCompleted}
              userData={userData}
              imagePriceObjectList={imagePriceObjectList}
              shootingId={shootingId}
              onPaid={onPaid}
            />
          )}
        </div>
      </div>

      {/* ── Back button ── */}
      <div {...stylex.props(s.back)}>
        <Button variant="secondary" icon={<ArrowBack />} label="Zurück" onClick={handleBack} />
      </div>
    </div>
  );
}
