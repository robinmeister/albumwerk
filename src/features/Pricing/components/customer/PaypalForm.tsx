import { Text } from "@astryxdesign/core/Text";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "react-toastify";
import { ReactElement } from "react";

import { ImagePriceObject, User } from "../../../../utils/types";
import { useSettings } from "../../../../context/SettingsContext";
import { pb } from "../../../../config/pocketbase";

type Props = {
  paymentCompleted: boolean;
  setPaymentCompleted: (paymentCompleted: boolean) => void;
  disabled: boolean;
  userData: User;
  imagePriceObjectList: ImagePriceObject[];
  shootingId?: string;
  // called with the server-created order id once payment is verified
  onPaid: (orderId: string) => void;
};

// PayPal is driven entirely server-side (pb_hooks/paypal.pb.js): the button's
// createOrder/onApprove call our own endpoints, which price, create and capture
// the order with the instance's PayPal credentials. The browser never sets the
// amount and cannot grant itself the download.
export default function PaypalForm(props: Props): ReactElement {
  const { setPaymentCompleted, disabled, userData, imagePriceObjectList, shootingId, onPaid } = props;
  const { settings } = useSettings();

  // configured at runtime on the admin payments page — single source
  const clientId = settings.paypalClientId || "";

  // Ist Stripe eingerichtet, laufen Karten dort. PayPals eigener
  // Kartenknopf stünde sonst unter der Auswahl „PayPal" und hieße wieder
  // „Debit- oder Kreditkarte" — genau die Verwechslung, die die Auswahl
  // auflösen soll. Ohne Stripe bleibt er der einzige Kartenweg und bleibt an.
  const funding = [
    "bancontact", "eps", "ideal", "mercadopago", "mybank", "p24", "sepa",
    ...(settings.stripeEnabled ? ["card"] : []),
  ].join(",");

  // PaymentForm zeigt PayPal nur mit Client-ID an; hier bleibt nur der Notnagel.
  if (!clientId) return <></>;

  return (
    <PayPalScriptProvider options={{
      clientId,
      disableFunding: funding,
      currency: settings.currency || "EUR",
      locale: "de_DE",
    }}>
      {!disabled ? (<PayPalButtons
        createOrder={async (): Promise<string> => {
          const res = await pb.send("/api/custom/paypal/create-order", {
            method: "POST",
            body: { imagePriceObjectList, shootingId, userData },
          });
          return res.id as string;
        }}
        onApprove={async (data): Promise<void> => {
          const res = await pb.send("/api/custom/paypal/capture", {
            method: "POST",
            body: { orderID: data.orderID },
          });
          if (res?.status === "success") {
            toast.success("Bezahlung abgeschlossen");
            onPaid(res.orderId as string);
            setPaymentCompleted(true);
          } else {
            toast.error("Die Zahlung konnte nicht bestätigt werden.");
          }
        }}
        onError={(err: Record<string, unknown>) => {
          toast.error("Bezahlung fehlgeschlagen");
          console.error("Payment error: ", err);
        }}
      />) : (
        <div style={{ padding: 16 }}>
          <Text type="large">
            Bitte fülle alle oben stehenden Pflichtfelder aus, um fortzufahren.
          </Text>
        </div>
      )}
    </PayPalScriptProvider>
  )
}
