import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, ReactNode } from "react";
import { useDropzone } from "react-dropzone";

import HelpHint from "../../../components/widgets/HelpHint";

const f = stylex.create({
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    overflow: "hidden",
  },
  cardHead: { padding: "16px", borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 2 },
  cardTitleRow: { display: "flex", alignItems: "center", gap: 4 },
  cardBody: { padding: 16 },
  drop: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: "var(--radius-element)",
    padding: 16,
    textAlign: "center",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 16,
    minHeight: 72,
  },
  dropImg: { height: 48, width: 48, objectFit: "contain" },
  dropPlaceholder: { height: 48, width: 48, backgroundColor: "var(--color-background-muted)", borderRadius: "var(--radius-element)" },
  colorField: { display: "flex", flexDirection: "column", gap: 4 },
  colorInput: { width: "100%", height: 40, borderRadius: "var(--radius-element)", border: "1px solid var(--color-border)", background: "none", cursor: "pointer", padding: 2 },
});

// Geteilte StyleX-Regeln: mehr als eine Einstellungsseite braucht sie.
export const sf = stylex.create({
  grid1: { display: "grid", gridTemplateColumns: "1fr", gap: 16 },
  grid2: { display: "grid", gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr" }, gap: 16 },
  full: { gridColumn: "1 / -1" },
  sliderWrap: { display: "flex", flexDirection: "column", gap: 6 },
  regenRow: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" },
  saveRow: { display: "flex", justifyContent: "flex-end" },
  sections: { display: "flex", flexDirection: "column", gap: 16 },
  ol: { paddingLeft: 20, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 },
});

export function SectionCard({ title, subtitle, helpSlug, children }: { title: string; subtitle: string; helpSlug?: string; children: ReactNode }): ReactElement {
  return (
    // data-testid: Ankerpunkt für die E2E-Suite, die aus den Abschnitten die
    // Screenshots der Hilfe-Artikel zuschneidet. Der Titel ist bereits die
    // fachliche Kennung des Abschnitts — ein zweiter Bezeichner würde nur
    // auseinanderlaufen.
    <div data-testid={`abschnitt:${title}`} {...stylex.props(f.card)}>
      <div {...stylex.props(f.cardHead)}>
        <div {...stylex.props(f.cardTitleRow)}>
          <Heading level={6}>{title}</Heading>
          {helpSlug && <HelpHint slug={helpSlug} />}
        </div>
        <Text type="supporting" color="secondary">{subtitle}</Text>
      </div>
      <div {...stylex.props(f.cardBody)}>{children}</div>
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): ReactElement {
  return (
    <label {...stylex.props(f.colorField)}>
      <Text type="supporting" color="secondary">{label}</Text>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} {...stylex.props(f.colorInput)} />
    </label>
  );
}

// Zeigt neben einem der vier Register-Felder, ob der Wert vom Preset stammt
// oder bewusst gesetzt wurde — und im zweiten Fall einen Weg zurück. Auf
// Modulebene definiert (statt innerhalb von BrandingPage), damit die
// Komponente bei jedem Tastendruck im Formular ihre Identität behält — sonst
// hängt React sie bei jedem Re-Render neu ein und der Fokus (z. B. auf dem
// "… auf Preset zurücksetzen"-Knopf) springt zurück zum document.body.
//
// `feld` geht in den Button-Namen ein, sonst hätten alle vier Zurücksetzen-
// Knöpfe denselben Accessible Name "Auf Preset zurücksetzen" — für
// Screenreader-Nutzer:innen vier ununterscheidbare Knöpfe.
export function Herkunft({ feld, istGesetzt, onReset }: { feld: string; istGesetzt: boolean; onReset: () => void }): ReactElement {
  return istGesetzt ? (
    <Button variant="ghost" label={`${feld} auf Preset zurücksetzen`} onClick={onReset} />
  ) : (
    <Text type="supporting" color="secondary">vom Preset</Text>
  );
}

export function ImageDrop(props: {
  label: string;
  currentUrl: string;
  file: File | null;
  onFile: (file: File | null) => void;
}): ReactElement {
  const { label, currentUrl, file, onFile } = props;
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: { "image/*": [] },
    onDrop: (accepted) => accepted[0] && onFile(accepted[0]),
  });
  const previewUrl = file ? URL.createObjectURL(file) : currentUrl;

  return (
    <div
      {...getRootProps()}
      {...stylex.props(f.drop)}
      style={{ borderColor: isDragActive ? "var(--color-accent)" : "var(--color-border)" }}
    >
      <input {...getInputProps()} />
      {previewUrl ? (
        <img src={previewUrl} alt={label} {...stylex.props(f.dropImg)} />
      ) : (
        <div {...stylex.props(f.dropPlaceholder)} />
      )}
      <Text type="body" color="secondary">
        {label} — Bild hierher ziehen oder klicken
      </Text>
    </div>
  );
}
