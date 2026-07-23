import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { CreditCard } from "lucide-react";
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

const s = stylex.create({
  root: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" },
});

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
    <div {...stylex.props(s.root)}>
      <Button
        variant="primary"
        size="lg"
        icon={<CreditCard />}
        isLoading={redirecting}
        isDisabled={disabled || redirecting}
        label={redirecting ? "Weiterleitung zu Stripe …" : "Mit Karte zahlen"}
        onClick={() => void startCheckout()}
      />
      <Text type="supporting" color="secondary">
        Du wirst zur sicheren Bezahlseite von Stripe weitergeleitet
        (Kreditkarte, Apple Pay, Google Pay u. a.).
      </Text>
    </div>
  );
}
