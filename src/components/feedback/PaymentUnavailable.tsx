import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement } from "react";
import { Link } from "react-router-dom";

const s = stylex.create({
  root: { padding: 16 },
  link: { color: "var(--color-text-accent)", textDecoration: "underline" },
});

// Shown when no online payment provider is configured. Single source of truth
// for this message (was duplicated with inconsistent Sie/du in PaymentForm and
// PaypalForm).
export default function PaymentUnavailable(): ReactElement {
  return (
    <div {...stylex.props(s.root)}>
      <Text type="large">
        Online-Zahlung ist noch nicht eingerichtet. Bitte kontaktiere uns direkt
        über die <Link to="/support" {...stylex.props(s.link)}>Support-Seite</Link>.
      </Text>
    </div>
  );
}
