import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { CreditCard } from "@mui/icons-material";
import { ReactElement, useState } from "react";
import { toast } from "react-toastify";

import { pb } from "../../../../config/pocketbase";
import { ImagePriceObject, User } from "../../../../utils/types";

type Props = {
  description: string;
  disabled: boolean;
  imagePriceObjectList: ImagePriceObject[];
  shootingId?: string;
  userData: User;
};

// Card payment via Stripe Checkout: the server hook prices the selection,
// creates a session and stores a payment intent. We redirect to Stripe's hosted
// page; after payment Stripe sends the customer back to /pricing?stripeSession=…,
// where PricingPage verifies the session and the server finalizes the order.
export default function StripeForm(props: Props): ReactElement {
  const { description, disabled, imagePriceObjectList, shootingId, userData } = props;
  const [redirecting, setRedirecting] = useState(false);

  const startCheckout = async () => {
    setRedirecting(true);
    try {
      const session = await pb.send("/api/custom/stripe/create-checkout-session", {
        method: "POST",
        body: {
          imagePriceObjectList,
          shootingId,
          userData,
          description,
          origin: window.location.origin,
        },
      });
      window.location.href = session.url;
    } catch (error) {
      console.error("stripe checkout failed", error);
      toast.error("Die Kartenzahlung konnte nicht gestartet werden.");
      setRedirecting(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Button
        variant="contained"
        size="large"
        startIcon={redirecting ? <CircularProgress size={18} color="inherit" /> : <CreditCard />}
        disabled={disabled || redirecting}
        onClick={() => void startCheckout()}
      >
        {redirecting ? "Weiterleitung zu Stripe …" : "Mit Karte zahlen"}
      </Button>
      <Typography variant="caption" color="text.secondary">
        Du wirst zur sicheren Bezahlseite von Stripe weitergeleitet
        (Kreditkarte, Apple Pay, Google Pay u. a.).
      </Typography>
    </Box>
  );
}
