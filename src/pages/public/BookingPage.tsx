// Eigenständige Buchungsseite unter der Domain der Instanz.
//
// Dieselbe Oberfläche wie im eingebetteten Formular (src/features/Booking),
// nur mit Seitenrahmen: für Fotograf:innen ohne eigene Website, die einfach
// einen Link in die Instagram-Bio setzen — und als Ziel, das man einer Kundin
// am Telefon durchgeben kann (docs/terminbuchung.md §9.1).
//
// Ohne Login erreichbar; die Buchung selbst verlangt nie ein Konto (§1).

import { ReactElement } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Link, useSearchParams } from "react-router-dom";

import { settingsFileUrl } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import BrandLogo from "../../components/widgets/BrandLogo";
import BookingFlow from "../../features/Booking/BookingFlow";

const s = stylex.create({
  container: { maxWidth: 640, margin: "32px auto", padding: "0 16px", width: "100%" },
  header: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 16 },
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    overflow: "hidden",
  },
  // Setzt die Rechtslinks als eigenen, abgesetzten Abschnitt ab (Entwurf
  // termin-buchen-{desktop,mobil}.html: Trennlinie vor dem Footer), statt sie
  // ohne Übergang direkt unter die Karte laufen zu lassen. Gleiches Muster
  // wie LegalPage.tsx (Commit cbf95192).
  footer: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 24,
    paddingTop: 16,
    borderTop: "1px solid var(--color-border)",
  },
  footerLink: { color: "var(--color-text-secondary)", textDecoration: "none" },
});

export default function BookingPage(): ReactElement {
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const logoUrl = settingsFileUrl(settings, "logo");

  return (
    <div {...stylex.props(s.container)}>
      <div {...stylex.props(s.header)}>
        {logoUrl ? (
          <BrandLogo platz="seitenkopf" />
        ) : (
          <Heading level={4} accessibilityLevel={1}>
            {settings.businessName}
          </Heading>
        )}
        {settings.tagline && (
          <Text type="body" color="secondary">
            {settings.tagline}
          </Text>
        )}
      </div>

      <div {...stylex.props(s.card)}>
        {/* Der Slug in ?type= wählt eine Leistung vor — derselbe Parameter wie
            im eingebetteten Formular, damit ein Link überall gleich wirkt. */}
        <BookingFlow preselectedType={params.get("type") ?? undefined} />
      </div>

      <div {...stylex.props(s.footer)}>
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
