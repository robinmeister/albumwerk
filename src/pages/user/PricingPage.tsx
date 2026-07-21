import {
  Box,
  Button,
  CircularProgress,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { currentUser } from "../../config/currentUser";
import { ReactElement, useEffect, useState } from "react";
import { Location, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { doc, getDoc } from "../../config/firestore-compat";
import { pb } from "../../config/pocketbase";

import Page from "../../components/layout/Page";
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
      const snap = await getDoc(doc("shootings", shootingId));
      if (snap.exists()) {
        setShooting({
          id:                snap.id,
          type:              snap.data().type,
          title:             snap.data().title,
          description:       snap.data().description,
          packageId:         snap.data().packageId,
          priceIds:          snap.data().priceIds,
          userIds:           snap.data().userIds,
          withUserSelection: snap.data().withUserSelection,
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
        const snap = await getDoc(doc("prices", id));
        if (!snap.exists()) return undefined;
        return {
          id:             snap.id,
          title:          snap.data()?.title,
          amount:         snap.data()?.amount,
          description:    snap.data()?.description,
          isDownloadable: snap.data()?.isDownloadable,
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
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  /* ── Nothing to order (direct visit without album selection or draft) ── */
  if (!shootingId) {
    return (
      <Page title="Bestellung" showTitleOnMobile>
        <Box textAlign="center" py={8}>
          <Typography variant="h6" gutterBottom>
            Keine Bestellung in Bearbeitung
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Wähle im Album Bilder aus und klicke auf „Kaufen", um eine Bestellung zu starten.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/album")}>
            Zum Album
          </Button>
        </Box>
      </Page>
    );
  }

  return (
    <Page title={shooting?.title ?? "Bestellung"} showTitleOnMobile>
      {selected.length > 0 && (
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
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
