import {
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
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

function SectionHeader({ title }: { title: string }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ letterSpacing: "0.08em", fontSize: "0.7rem" }}
    >
      {title}
    </Typography>
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setUserData((prev: any) => ({ ...prev, [name]: value }));
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

  const showError = (name: string) => Boolean(touched[name]) && !userData[name];

  const requiredFieldProps = (name: string) => ({
    name,
    required: true,
    onChange: handleChange,
    onBlur: handleBlur,
    error: showError(name),
    helperText: showError(name) ? "Pflichtfeld" : "",
  });

  const totalPrice = shootingPackage && calculateTotalPrice(imagePriceObjectList) === 0
    ? parseFloat(calculateTotalPackagePrice(shootingPackage, selectedImages.length))
    : calculateTotalPrice(imagePriceObjectList);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* ── Order summary ── */}
      <Box mb={3}>
        <SectionHeader title="Bestellübersicht" />
        <Divider sx={{ mb: 1.5 }} />

        {!shootingPackage && imagePriceObjectList.length > 0 && (
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {imagePriceObjectList.map((obj, idx) => (
              <Grid item xs={6} sm={4} md={3} key={obj.image}>
                <Card variant="outlined" sx={{ overflow: "hidden" }}>
                  <CardMedia
                    component="img"
                    image={thumbUrl(obj.image)}
                    alt={`Bild ${idx + 1}`}
                    sx={{ height: 100, objectFit: "cover" }}
                  />
                  <Box sx={{ px: 1, py: 0.75 }}>
                    {obj.price.map((p: PriceWithQuantity) => (
                      <Box key={p.id} display="flex" justifyContent="space-between">
                        <Typography variant="caption" noWrap sx={{ maxWidth: "60%" }}>
                          {p.quantity}× {p.title}
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {(parseFloat(p.amount) * p.quantity).toFixed(2)}€
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {shootingPackage && (
          <Box mb={1.5}>
            <Typography variant="body2">
              {shootingPackage.title} · {selectedImages.length} Bilder
            </Typography>
          </Box>
        )}

        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">Gesamtpreis</Typography>
          <Chip
            label={`${typeof totalPrice === "number" ? totalPrice.toFixed(2) : totalPrice} €`}
            color="primary"
            size="small"
            sx={{ fontWeight: 700, fontSize: "0.85rem", height: 28 }}
          />
        </Box>
      </Box>

      {/* ── Contact ── */}
      <Box mb={3}>
        <SectionHeader title="Kontakt" />
        <Divider sx={{ mb: 1.5 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Vorname"
              value={userData.firstName ?? ""}
              {...requiredFieldProps("firstName")}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nachname"
              value={userData.lastName ?? ""}
              {...requiredFieldProps("lastName")}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="E-Mail"
              value={userData.email ?? ""}
              {...requiredFieldProps("email")}
            />
          </Grid>
          {hasPhysical && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={userData.phone ?? ""}
                {...requiredFieldProps("phone")}
              />
            </Grid>
          )}
        </Grid>
      </Box>

      {/* ── Address — only when something has to be shipped ── */}
      {hasPhysical ? (
        <Box mb={3}>
          <SectionHeader title="Lieferadresse" />
          <Divider sx={{ mb: 1.5 }} />
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Straße & Hausnummer"
                value={userData.street ?? ""}
                {...requiredFieldProps("street")}
              />
            </Grid>
            <Grid item xs={5} sm={3}>
              <TextField
                fullWidth
                label="PLZ"
                value={userData.zip ?? ""}
                {...requiredFieldProps("zip")}
              />
            </Grid>
            <Grid item xs={7} sm={5}>
              <TextField
                fullWidth
                label="Stadt"
                value={userData.city ?? ""}
                {...requiredFieldProps("city")}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Bundesland"
                name="state"
                value={userData.state ?? ""}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Deine Bestellung enthält nur digitale Produkte — eine Lieferadresse ist nicht nötig.
        </Typography>
      )}

      {/* ── Payment ── */}
      <Box mb={2}>
        <SectionHeader title="Zahlung" />
        <Divider sx={{ mb: 1.5 }} />
        {paymentDisabled && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Bitte fülle alle Pflichtfelder aus, um die Zahlung fortzusetzen.
          </Typography>
        )}
        {!paypalAvailable && !stripeAvailable && <PaymentUnavailable />}
        {stripeAvailable && (
          <Box sx={{ mb: paypalAvailable ? 2 : 0 }}>
            <StripeForm
              description={`Fotobestellung (${selectedImages.length} Bilder)`}
              disabled={paymentDisabled}
              imagePriceObjectList={imagePriceObjectList}
              shootingId={shootingId}
              userData={userData}
            />
          </Box>
        )}
        {paypalAvailable && stripeAvailable && (
          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">oder</Typography>
          </Divider>
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
      </Box>

      {/* ── Back button ── */}
      <Box mt={2}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBack}>
          Zurück
        </Button>
      </Box>
    </Box>
  );
}
