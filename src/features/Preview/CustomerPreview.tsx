import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useEffect, useRef, useState } from "react";

import { usePreviewSession } from "./usePreviewSession";

type Ansicht = "link" | "angemeldet";

const s = stylex.create({
  huelle: {
    position: "fixed", inset: 0, zIndex: 200,
    display: "flex", flexDirection: "column",
    backgroundColor: "var(--color-background-body)",
  },
  leiste: {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    padding: "8px 12px", borderBottom: "1px solid var(--color-border)",
  },
  wachsen: { flex: 1 },
  rahmen: { flex: 1, width: "100%", border: 0 },
});

function spiegeltText(anzahl: number, name: string): string {
  if (anzahl === 0) return "Diese Galerie ist noch niemandem zugeordnet";
  if (anzahl === 1) return `Zugriff von ${name || "einer Kundin"}`;
  return `Zugriff von ${anzahl} Personen — alle sehen dasselbe`;
}

export default function CustomerPreview({
  shootingId,
  onClose,
}: {
  shootingId: string;
  onClose: () => void;
}): ReactElement {
  const [ansicht, setAnsicht] = useState<Ansicht>("link");
  const { sitzung, starten, beenden, fehler } = usePreviewSession();
  const rahmen = useRef<HTMLIFrameElement>(null);

  // Das Schattenkonto entsteht erst beim Umschalten: die Link-Ansicht ist
  // anonym erreichbar (shootings.viewRule ist leer) und braucht kein Token.
  useEffect(() => {
    if (ansicht === "angemeldet" && !sitzung) void starten(shootingId);
  }, [ansicht, sitzung, shootingId, starten]);

  // Das Token geht per postMessage, nicht ueber die URL — dort landete es in
  // Verlauf und Serverlogs. Das iframe meldet sich bereit, wir antworten.
  useEffect(() => {
    const hoeren = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.typ !== "vorschau-bereit" || !sitzung) return;
      rahmen.current?.contentWindow?.postMessage(
        { typ: "vorschau-token", token: sitzung.token },
        window.location.origin,
      );
    };
    window.addEventListener("message", hoeren);
    return () => window.removeEventListener("message", hoeren);
  }, [sitzung]);

  const schliessen = () => {
    void beenden();
    // Setzt die Ansicht mit zurueck, nicht nur zur Optik: beenden() setzt
    // sitzung auf null, und bliebe die Komponente entgegen der Erwartung
    // (Elternteil raeumt sie beim Schliessen sofort aus dem Baum) doch noch
    // gemountet, wuerde der Umschalt-Effekt oben sonst sofort ein neues
    // Schattenkonto anfordern, weil "angemeldet && !sitzung" wieder zutrifft.
    setAnsicht("link");
    onClose();
  };

  const quelle =
    ansicht === "link"
      ? `/publicAlbum/${shootingId}?vorschau=1`
      : `/album?vorschau=1`;

  return (
    <div {...stylex.props(s.huelle)} data-testid="kundenansicht">
      <div {...stylex.props(s.leiste)}>
        <Button
          variant={ansicht === "link" ? "primary" : "secondary"}
          label="Mit Link geöffnet"
          onClick={() => setAnsicht("link")}
          data-testid="ansicht:link"
        />
        <Button
          variant={ansicht === "angemeldet" ? "primary" : "secondary"}
          label="Als angemeldete Kundin"
          onClick={() => setAnsicht("angemeldet")}
          data-testid="ansicht:angemeldet"
        />
        <div {...stylex.props(s.wachsen)}>
          <Text type="supporting" color="secondary">
            {fehler
              ? fehler
              : ansicht === "angemeldet" && sitzung
                ? `${spiegeltText(sitzung.spiegelt.anzahl, sitzung.spiegelt.name)} · Bestellungen und Downloads bleiben hier leer`
                : "Wie jemand die Galerie über den Freigabelink sieht"}
          </Text>
        </div>
        <Button variant="ghost" label="Schließen" onClick={schliessen} data-testid="vorschau:schliessen" />
      </div>
      {(ansicht === "link" || sitzung) && (
        <iframe
          ref={rahmen}
          key={ansicht}
          src={quelle}
          title="Kundenansicht"
          {...stylex.props(s.rahmen)}
        />
      )}
    </div>
  );
}
