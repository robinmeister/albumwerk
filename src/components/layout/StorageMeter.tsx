import { useEffect, useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";

import { pb } from "../../config/pocketbase";

// Speicheranzeige für gehostete Instanzen: "18,4 von 25 GB".
//
// Wer verbrauchsabhängig abrechnet, muss den Verbrauch auch zeigen — sonst ist
// die Position auf der Rechnung eine Blackbox. Die Zahlen kommen über
// /api/custom/storage von der Control-Plane des Anbieters.
//
// Selbst gehostet antwortet der Endpoint mit 204; dann rendert die Komponente
// nichts. Gleiches gilt bei jedem Fehler: das hier ist eine Zusatzinformation,
// kein Bestandteil der App.

const GB = 1000 * 1000 * 1000;

type Usage = {
  usedBytes: number;
  includedBytes: number;
  overageCentsPerGb: number;
};

const s = stylex.create({
  root: {
    padding: "10px 20px 0",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "var(--color-border)",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 999,
    transition: "width .3s ease",
  },
});

function formatGb(bytes: number): string {
  return (bytes / GB).toFixed(1).replace(".", ",");
}

export default function StorageMeter(): React.ReactElement | null {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    // Nur für Admins: die Abrechnung ist Sache der Fotograf:innen, nicht ihrer
    // Kund:innen, die dieselbe Hülle sehen.
    if (!(pb.authStore.model as { isAdmin?: boolean } | null)?.isAdmin) return;

    let alive = true;
    pb.send("/api/custom/storage", { method: "GET" })
      .then((data: Usage | null) => {
        if (alive && data && data.includedBytes) setUsage(data);
      })
      .catch(() => {
        /* selbst gehostet oder Control-Plane offline — nichts anzeigen */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!usage) return null;

  const ratio = usage.usedBytes / usage.includedBytes;
  const over = ratio > 1;
  const color = over
    ? "var(--color-error, #b3261e)"
    : ratio >= 0.8
      ? "var(--color-warning, #b08d57)"
      : "var(--color-primary)";

  const extraGb = over ? Math.ceil((usage.usedBytes - usage.includedBytes) / GB) : 0;
  const extraEuro = ((extraGb * usage.overageCentsPerGb) / 100).toFixed(2).replace(".", ",");

  return (
    <div {...stylex.props(s.root)}>
      <Text type="supporting" color="secondary">
        {formatGb(usage.usedBytes)} von {formatGb(usage.includedBytes)} GB belegt
      </Text>
      <div {...stylex.props(s.track)}>
        <div
          {...stylex.props(s.bar)}
          style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: color }}
        />
      </div>
      {over && (
        <Text type="supporting" color="secondary">
          {extraGb} GB darüber — {extraEuro} € im Monat
        </Text>
      )}
    </div>
  );
}
