import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { currentUser } from "../../config/currentUser";
import { ReactElement, useEffect, useState } from "react";
import { Location, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getRecord, pb } from "../../config/pocketbase";
import { useSettings } from "../../context/SettingsContext";

import Page from "../../components/layout/Page";
import PageLoader from "../../components/feedback/PageLoader";
import DownloadForm from "../../features/Pricing/components/customer/DownloadForm";
import {
  ImagePriceObject,
  Package,
  Price,
  Shooting,
  User,
} from "../../utils/types";
import PricingForm from "../../features/Pricing/components/customer/PricingForm";
import PaymentForm from "../../features/Pricing/components/customer/PaymentForm";
import PackageForm from "../../features/Pricing/components/customer/PackageForm";
import { fetchShootingPackage } from "../../utils/functions";

const steps = ["Preise auswählen", "Bezahlen", "Download"];

// Derselbe Bruchpunkt, an dem PricingForm direkt darunter auf zwei Spalten
// geht — die Kopfzeile soll mit ihrem Inhalt umschalten, nicht davor.
const DESKTOP = "@media (min-width: 900px)";

const s = stylex.create({
  stepper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    // Entwurf: jede Meta-Zeile steht über einer feinen Linie
    // (`border-b border-fine-edge pb-4`, beide Entwürfe). borderBottom
    // (eine Seite) überlebt StyleX — die Allseiten-Kurzform `border:` nicht.
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "var(--color-border)",
    // Blockrhythmus der Entwürfe: mobil 24px (`space-y-6`), am Desktop 40px
    // (`gap-10` der linken Spalte).
    marginBottom: { default: 24, [DESKTOP]: 40 },
  },
  step: { display: "flex", alignItems: "center", gap: 8 },
  dot: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    borderRadius: "var(--radius-full)",
    // Auszeichnungsschrift für Zahlen (DESIGN.md §3: 12px, Gewicht 400,
    // Tracking 0). Die Familie kommt aus der Theme-Rolle
    // `--font-family-code`, nicht als fester Name — welche Schrift das ist,
    // setzt die Fotografin unter /branding. Tracking steht hier nicht:
    // der Punkt erbt kein letter-spacing (gemessen "normal"), eine eigene
    // Null-Angabe erzeugt in StyleX keine Deklaration und wäre tote Zeile.
    fontFamily: "var(--font-family-code)",
    fontSize: 12,
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
    backgroundColor: "var(--color-background-muted)",
    color: "var(--color-text-secondary)",
  },
  dotActive: {
    backgroundColor: "var(--color-accent)",
    color: "var(--color-on-accent)",
  },
  sep: { width: 24, height: 1, backgroundColor: "var(--color-border)" },
  empty: { textAlign: "center", padding: "64px 16px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" },
});

// Draft cart per browser: survives reloads and lets the customer go back to
// the album without losing the price assignment.
const DRAFT_KEY = "pricingDraft";

type Draft = {
  shootingId: string;
  selectedImages: string[];
  imagePriceObjectList: ImagePriceObject[];
  // contact data survives the redirect to Stripe's hosted checkout page
  userData?: User;
};

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    return draft?.shootingId && Array.isArray(draft.selectedImages) ? draft : null;
  } catch {
    return null;
  }
}

export default function PricingPage(): ReactElement {
  const location: Location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { verkauf } = useSettings();

  // location.state wins (fresh from the album); the draft fills the gaps
  // after a reload or when returning to the tab
  const [draft] = useState<Draft | null>(readDraft);
  const stateShootingId: string | undefined = location.state?.shootingId;
  const shootingId = stateShootingId ?? draft?.shootingId;
  const draftUsable = draft !== null && draft.shootingId === shootingId;

  const [activeStep, setActiveStep] = useState(0);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>(
    location.state?.selectedImages ?? (draftUsable ? draft.selectedImages : [])
  );
  const [imagePriceObjectList, setImagePriceObjectList] = useState<ImagePriceObject[]>(() =>
    selected.map(
      (image) =>
        (draftUsable
          ? draft.imagePriceObjectList?.find((x) => x.image === image)
          : undefined) ?? { image, price: [] }
    )
  );
  const [prices, setPrices] = useState<Price[]>([]);
  const [shootingPackage, setShootingPackage] = useState<Package>();
  const [shooting, setShooting] = useState<Shooting>();
  const [createdOrderId, setCreatedOrderId] = useState<string>("");
  // order id created server-side after a verified payment (PayPal capture or
  // Stripe verify) — the client no longer creates orders or grants downloads
  const [serverOrderId, setServerOrderId] = useState<string>("");
  const [userData, setUserData] = useState<User>(
    (draftUsable ? draft.userData : undefined) ?? {
      uid:       currentUser()?.uid ?? "",
      firstName: "",
      lastName:  "",
      email:     currentUser()?.email ?? "",
      phone:     "",
      street:    "",
      state:     "",
      city:      "",
      zip:       "",
      isAdmin:   false,
    }
  );

  useEffect(() => { void fetchShooting(); }, []);

  useEffect(() => {
    const load = async () => {
      if (shooting && (shooting.priceIds?.length ?? 0) > 0) {
        await fetchPrices(shooting.priceIds);
      }
      if (shooting?.packageId && shooting.packageId !== "") {
        const pkg = await fetchShootingPackage(shooting.packageId);
        if (pkg) setShootingPackage(pkg);
      }
    };
    void load();
  }, [shooting]);

  // persist the draft while the customer is still assembling the order
  useEffect(() => {
    if (!shootingId || paymentCompleted || selected.length === 0) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ shootingId, selectedImages: selected, imagePriceObjectList, userData })
      );
    } catch { /* storage full/blocked — draft is a convenience only */ }
  }, [shootingId, selected, imagePriceObjectList, userData, paymentCompleted]);

  // returning from Stripe Checkout: verify the session server-side before
  // treating the order as paid
  useEffect(() => {
    if (searchParams.get("stripeCancelled")) {
      toast.info("Zahlung abgebrochen — deine Auswahl ist weiterhin da.");
      setActiveStep(1);
      setSearchParams({}, { replace: true });
      return;
    }
    const sessionId = searchParams.get("stripeSession");
    if (!sessionId) return;
    void (async () => {
      try {
        const res = await pb.send("/api/custom/stripe/verify", {
          method: "POST",
          body: { sessionId },
        });
        if (res.paid) {
          // the server has already created the order and granted downloads
          if (res.orderId) setServerOrderId(res.orderId);
          setPaymentCompleted(true);
        } else {
          toast.error("Die Zahlung wurde nicht abgeschlossen. Bitte versuche es erneut.");
          setActiveStep(1);
        }
      } catch (e) {
        console.error("stripe verification failed", e);
        toast.error("Die Zahlung konnte nicht überprüft werden. Bitte kontaktiere uns.");
      } finally {
        setSearchParams({}, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The order + download entitlement are created server-side after the payment
  // is verified (pb_hooks/paypal.pb.js, stripe.pb.js). Here we only advance the
  // UI and trigger the confirmation mail for the server-created order id.
  useEffect(() => {
    if (!paymentCompleted) return;
    setActiveStep(2);
    localStorage.removeItem(DRAFT_KEY);
    if (serverOrderId && serverOrderId !== createdOrderId) {
      setCreatedOrderId(serverOrderId);
      void sendOrderConfirmation(serverOrderId);
    }
  }, [paymentCompleted, serverOrderId]);

  async function fetchShooting() {
    if (!shootingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const record = await getRecord("shootings", shootingId);
      if (record) {
        setShooting({
          id:                record.id,
          type:              record.type,
          title:             record.title,
          description:       record.description,
          packageId:         record.packageId,
          priceIds:          record.priceIds,
          userIds:           record.userIds,
          withUserSelection: record.withUserSelection,
        });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function fetchPrices(priceIds: string[]) {
    const results = await Promise.all(
      priceIds.map(async (id) => {
        const record = await getRecord("prices", id);
        if (!record) return undefined;
        return {
          id:             record.id,
          title:          record.title,
          amount:         record.amount,
          description:    record.description,
          isDownloadable: record.isDownloadable,
        };
      })
    );
    setPrices(results.filter(Boolean) as Price[]);
  }

  // Server-side hook sends the customer confirmation and the notification to
  // the photographer via the instance's SMTP settings (pb_hooks/email.pb.js).
  async function sendOrderConfirmation(orderId: string) {
    try {
      await pb.send("/api/custom/order-confirmation", {
        method: "POST",
        body: { orderId },
      });
    } catch (e) {
      console.error("order confirmation email failed", e);
    }
  }

  function getDownloadableImages(): string[] {
    return imagePriceObjectList.flatMap(obj =>
      obj.price.filter(p => p.isDownloadable).map(() => obj.image)
    );
  }

  if (loading) {
    return <PageLoader />;
  }

  if (verkauf.gesperrt) {
    // Nennt bewusst keinen Grund: eine Kundin kann mit "es fehlt ein
    // Impressum" nichts anfangen, und die Instanz muss ihre
    // Konfigurationslücken nicht öffentlich aufzählen.
    //
    // Vor der shootingId-Prüfung: greift auch beim Direktaufruf ohne
    // Albumauswahl oder Entwurf, nicht nur nach einer laufenden Bestellung.
    return (
      <Page title="Bilder kaufen">
        <div data-testid="kauf-gesperrt">
          <Banner
            status="info"
            title="Der Bilderkauf ist gerade nicht möglich. Bitte später erneut versuchen."
          />
        </div>
      </Page>
    );
  }

  /* ── Nothing to order (direct visit without album selection or draft) ── */
  if (!shootingId) {
    return (
      <Page title="Bestellung" showTitleOnMobile>
        <div {...stylex.props(s.empty)}>
          <Heading level={6}>Keine Bestellung in Bearbeitung</Heading>
          <Text type="body" color="secondary">
            Wähle im Album Bilder aus und klicke auf „Kaufen", um eine Bestellung zu starten.
          </Text>
          <Button variant="primary" label="Zum Album" onClick={() => navigate("/album")} />
        </div>
      </Page>
    );
  }

  return (
    <Page title={shooting?.title ?? "Bestellung"} showTitleOnMobile>
      {selected.length > 0 && (
        // data-testid: Ankerpunkt für die E2E-Suite (Screenshot-Zuschnitt).
        <div data-testid="bestellschritte" {...stylex.props(s.stepper)}>
          {steps.map((label, idx) => (
            <div key={label} {...stylex.props(s.step)}>
              {idx > 0 && <span {...stylex.props(s.sep)} />}
              <span {...stylex.props(s.dot, idx <= activeStep && s.dotActive)}>
                {idx + 1}
              </span>
              <Text type="supporting" color={idx <= activeStep ? "primary" : "secondary"}>
                {label}
              </Text>
            </div>
          ))}
        </div>
      )}

      {activeStep === 0 && !shootingPackage && (
        <PricingForm
          prices={prices}
          selectedImages={selected}
          setSelectedImages={setSelected}
          imagePriceObjectList={imagePriceObjectList}
          setImagePriceObjectList={setImagePriceObjectList}
          onContinue={() => setActiveStep(1)}
        />
      )}
      {activeStep === 0 && shootingPackage && (
        <PackageForm
          selectedImages={selected}
          shootingPackage={shootingPackage}
          activeStep={activeStep}
          setActiveStep={setActiveStep}
        />
      )}
      {activeStep === 1 && (
        <PaymentForm
          handleBack={() => setActiveStep(s => s - 1)}
          handleNext={() => setActiveStep(s => s + 1)}
          shootingPackage={shootingPackage}
          shootingId={shootingId}
          selectedImages={selected}
          imagePriceObjectList={imagePriceObjectList}
          paymentCompleted={paymentCompleted}
          setPaymentCompleted={setPaymentCompleted}
          userData={userData}
          setUserData={setUserData}
          onPaid={(orderId) => setServerOrderId(orderId)}
        />
      )}
      {activeStep === 2 && (
        <DownloadForm
          imageList={getDownloadableImages()}
          shootingIds={[shootingId]}
          inDownloadPage={false}
          orderId={createdOrderId}
        />
      )}
    </Page>
  );
}
