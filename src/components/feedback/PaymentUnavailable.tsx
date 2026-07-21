import { Typography } from "@mui/material";
import { ReactElement } from "react";

// Shown when no online payment provider is configured. Single source of truth
// for this message (was duplicated with inconsistent Sie/du in PaymentForm and
// PaypalForm).
export default function PaymentUnavailable(): ReactElement {
  return (
    <Typography variant="subtitle1" component="div" sx={{ p: 2 }}>
      Online-Zahlung ist noch nicht eingerichtet. Bitte kontaktiere uns direkt.
    </Typography>
  );
}
