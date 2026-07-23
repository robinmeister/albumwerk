import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ArrowLeft as ArrowBack } from "lucide-react";
import { toast } from "react-toastify";
import { currentUser } from "../../../../config/currentUser";
import { doc, getDoc, updateDoc } from "../../../../config/firestore-compat";
import { ReactElement, useContext, useEffect, useState } from "react";

import { ImagePriceObject, Package, PriceWithQuantity } from "../../../../utils/types";
import { calculateTotalPackagePrice, calculateTotalPrice } from "../../utils/functions";
import { AuthContext } from "../../../../context/AuthContext";
import { useSettings } from "../../../../context/SettingsContext";
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
  orRow: { marginBlock: 16 },
  back: { marginTop: 16 },
});

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

  const paypalAvailable = Boolean(
    settings.paypalEnabled || import.meta.env.VITE_PAYPAL_CLIENT_ID
  );
  const stripeAvailable = Boolean(settings.stripeEnabled);

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
      const snap = await getDoc(doc("users", user.uid));
      if (snap.exists()) {
        setProfileId(snap.id);
        setUserData(snap.data());
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
      await updateDoc(doc("users", profileId), userData);
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

  const totalPrice = shootingPackage && calculateTotalPrice(imagePriceObjectList) === 0
    ? parseFloat(calculateTotalPackagePrice(shootingPackage, selectedImages.length))
    : calculateTotalPrice(imagePriceObjectList);

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

        <div {...stylex.props(s.totalRow)}>
          <Text type="body" color="secondary">Gesamtpreis</Text>
          <Badge
            variant="info"
            label={`${typeof totalPrice === "number" ? totalPrice.toFixed(2) : totalPrice} €`}
          />
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
            <div {...stylex.props(s.full)}>
              <TextInput
                width="100%"
                label="Bundesland"
                value={userData.state ?? ""}
                onChange={(v) => setUserData((prev: any) => ({ ...prev, state: v }))}
              />
            </div>
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
        {stripeAvailable && (
          <div style={{ marginBottom: paypalAvailable ? 16 : 0 }}>
            <StripeForm
              description={`Fotobestellung (${selectedImages.length} Bilder)`}
              disabled={paymentDisabled}
              imagePriceObjectList={imagePriceObjectList}
              shootingId={shootingId}
              userData={userData}
            />
          </div>
        )}
        {paypalAvailable && stripeAvailable && (
          <div {...stylex.props(s.orRow)}>
            <Divider label="oder" />
          </div>
        )}
        {paypalAvailable && (
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

      {/* ── Back button ── */}
      <div {...stylex.props(s.back)}>
        <Button variant="secondary" icon={<ArrowBack />} label="Zurück" onClick={handleBack} />
      </div>
    </div>
  );
}
