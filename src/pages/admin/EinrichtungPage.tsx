import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Check, Circle, X } from "lucide-react";
import { ReactElement, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { SETTINGS_RECORD_ID } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import { PUNKT_TEXTE, type Punkt } from "../../utils/verkauf";

const s = stylex.create({
  kopf: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  balken: {
    height: 8,
    borderRadius: "var(--radius-full)",
    backgroundColor: "var(--color-background-muted)",
    overflow: "hidden",
  },
  fuellung: { height: "100%", backgroundColor: "var(--color-accent)" },
  gruppe: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 },
  zeile: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  label: { flex: 1, minWidth: 0 },
  offen: { color: "var(--color-text-danger, var(--color-text-primary))" },
  erledigt: { color: "var(--color-text-accent)" },
  neutral: { color: "var(--color-text-secondary)" },
});

function Zeile({ punkt, onGehe }: { punkt: Punkt; onGehe: (ziel: string) => void }): ReactElement {
  const { label, ziel } = PUNKT_TEXTE[punkt.key];
  // Weiche Punkte sind kein Versäumnis: eine eigene Domain zu haben ist eine
  // Entscheidung, kein Fehler. Deshalb ein neutraler Kreis statt eines Kreuzes.
  const Icon = punkt.erfuellt ? Check : punkt.hart ? X : Circle;
  const ton = punkt.erfuellt ? s.erledigt : punkt.hart ? s.offen : s.neutral;
  // Icon allein wäre für Screenreader nur ein Symbol ohne Bedeutung — der
  // Zustand steht deshalb zusätzlich als Text da (aria-hidden aufs Icon).
  const zustand = punkt.erfuellt ? "Erledigt" : punkt.hart ? "Offen" : "Empfohlen, noch offen";

  return (
    <div {...stylex.props(s.zeile)} data-testid={`punkt:${punkt.key}`}>
      <span {...stylex.props(ton)} aria-hidden="true"><Icon /></span>
      <span {...stylex.props(s.label)}>
        <Text type="body" weight="medium">{label}</Text>
        <Text type="supporting" color="secondary">{zustand}</Text>
      </span>
      {!punkt.erfuellt && (
        <Button variant="secondary" label="Einrichten" onClick={() => onGehe(ziel)} />
      )}
    </div>
  );
}

export default function EinrichtungPage(): ReactElement {
  const { settings, verkauf, loaded, refresh } = useSettings();
  const navigate = useNavigate();

  // "Gesehen" heißt gesehen, nicht "fertig": ein Fotograf ohne eigene Domain
  // hat einen offenen weichen Punkt und darf trotzdem nicht bei jedem Login
  // hierher umgeleitet werden.
  useEffect(() => {
    if (!loaded || settings.setupCompleted) return;
    pb.collection("settings")
      .update(SETTINGS_RECORD_ID, { setupCompleted: true })
      .then(() => refresh())
      .catch((error) => console.warn("setupCompleted konnte nicht gesetzt werden", error));
  }, [loaded, settings.setupCompleted, refresh]);

  // Es gibt immer neun Punkte — gesamt === 0 heisst also "noch nicht geladen".
  // Ohne diese Unterscheidung meldet die Seite kurz Entwarnung, bevor sie die
  // Lage kennt.
  const laedtVerkauf = verkauf.gesamt === 0;
  const offen = verkauf.offeneHarte.length;
  const anteil = verkauf.gesamt ? Math.round((verkauf.erledigt / verkauf.gesamt) * 100) : 0;
  const harte = verkauf.punkte.filter((p) => p.hart);
  const weiche = verkauf.punkte.filter((p) => !p.hart);

  return (
    <Page title="Einrichtung" showTitleOnMobile>
      <div {...stylex.props(s.kopf)}>
        <Heading level={5}>
          {laedtVerkauf
            ? "Wird geprüft …"
            : offen === 0
              ? "Du kannst deine Fotos verkaufen."
              : offen === 1
                ? "Noch 1 Ding bis zum Verkauf der Fotos"
                : `Noch ${offen} Dinge bis zum Verkauf der Fotos`}
        </Heading>
        <div {...stylex.props(s.balken)}>
          <div {...stylex.props(s.fuellung)} style={{ width: `${anteil}%` }} />
        </div>
        <Text type="supporting" color="secondary">
          {laedtVerkauf ? "\u00a0" : `${verkauf.erledigt} von ${verkauf.gesamt} erledigt`}
        </Text>
      </div>

      <div {...stylex.props(s.gruppe)}>
        <Text type="label" weight="semibold" color="secondary">PFLICHT FÜR DEN VERKAUF</Text>
        {harte.map((punkt) => <Zeile key={punkt.key} punkt={punkt} onGehe={navigate} />)}
      </div>

      <div {...stylex.props(s.gruppe)}>
        <Text type="label" weight="semibold" color="secondary">EMPFOHLEN</Text>
        {weiche.map((punkt) => <Zeile key={punkt.key} punkt={punkt} onGehe={navigate} />)}
      </div>
    </Page>
  );
}
