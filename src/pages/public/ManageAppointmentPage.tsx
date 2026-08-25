// Ziel des Storno-/Umbuchungslinks aus der Bestätigungsmail
// (docs/terminbuchung.md §4.3).
//
// Bewusst ohne Login und ohne Layout-Rahmen der App: Wer hier landet, kommt aus
// einer E-Mail und will genau zwei Dinge tun können — absagen oder verschieben.
// Ein Anmeldeformular davor wäre eine Sackgasse, denn die meisten haben gar
// kein Konto.

import { ReactElement } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Link, useParams } from "react-router-dom";

import { settingsFileUrl } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import ManageView from "../../features/Booking/ManageView";

const s = stylex.create({
  container: { maxWidth: 560, margin: "32px auto", padding: "0 16px", width: "100%" },
  header: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 16 },
  logo: { height: 48, maxWidth: 200, objectFit: "contain" },
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    overflow: "hidden",
  },
  footer: { display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 24 },
  footerLink: { color: "var(--color-text-secondary)", textDecoration: "none" },
});

export default function ManageAppointmentPage(): ReactElement {
  const { settings } = useSettings();
  const { token } = useParams();
  const logoUrl = settingsFileUrl(settings, "logo");

  return (
    <div {...stylex.props(s.container)}>
      <div {...stylex.props(s.header)}>
        {logoUrl ? (
          <img src={logoUrl} alt={settings.businessName} {...stylex.props(s.logo)} />
        ) : (
          <Heading level={4} accessibilityLevel={1}>
            {settings.businessName}
          </Heading>
        )}
      </div>

      <div {...stylex.props(s.card)}>
        <ManageView token={token ?? ""} />
      </div>

      <div {...stylex.props(s.footer)}>
        <Link to="/buchen" {...stylex.props(s.footerLink)}>
          <Text type="supporting" color="secondary">Neuen Termin buchen</Text>
        </Link>
        <Link to="/imprint" {...stylex.props(s.footerLink)}>
          <Text type="supporting" color="secondary">Impressum</Text>
        </Link>
        <Link to="/privacy" {...stylex.props(s.footerLink)}>
          <Text type="supporting" color="secondary">Datenschutz</Text>
        </Link>
      </div>
    </div>
  );
}
