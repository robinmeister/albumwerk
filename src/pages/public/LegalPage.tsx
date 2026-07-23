import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Link } from "@astryxdesign/core/Link";
import * as stylex from "@stylexjs/stylex";
import DOMPurify from "dompurify";
import { ReactElement, useMemo } from "react";

import { useSettings } from "../../context/SettingsContext";

type Props = {
  kind: "imprint" | "privacy";
};

const s = stylex.create({
  container: { maxWidth: 820, margin: "32px auto", padding: "0 16px" },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 24,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
});

// Public legal pages fed from the settings collection (admin-maintained HTML,
// sanitized before rendering).
export default function LegalPage({ kind }: Props): ReactElement {
  const { settings } = useSettings();
  const title = kind === "imprint" ? "Impressum" : "Datenschutzerklärung";
  const raw = kind === "imprint" ? settings.imprintHtml : settings.privacyHtml;

  const html = useMemo(() => DOMPurify.sanitize(raw || ""), [raw]);

  return (
    <div {...stylex.props(s.container)}>
      <div {...stylex.props(s.card)}>
        <Heading level={4} accessibilityLevel={1}>
          {title}
        </Heading>
        {html ? (
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <Text type="body" color="secondary">
            Diese Seite wurde noch nicht ausgefüllt.
          </Text>
        )}
        <Link href="/login">Zurück zur Anmeldung</Link>
      </div>
    </div>
  );
}
