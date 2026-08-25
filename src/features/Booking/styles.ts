// Gemeinsame Stile der Buchungsoberfläche.
//
// ====================== BINDENDE EINSCHRÄNKUNG ======================
// Bewusst OHNE Astryx. Die Komponentenbibliothek würde ihre komplette
// Stildatei ins Embed-Bundle ziehen (~188 KB CSS mit Schriften), und genau
// dafür gibt es den eigenen Einstiegspunkt (docs/terminbuchung.md §9.1).
// Hier nur StyleX und Systemschriften.
//
// Zweiter Grund, der genauso wichtig ist: Das Formular steht im iframe auf der
// Website der Fotograf:in, nicht in unserer App. Es soll dort zurückhaltend
// wirken und die Markenfarbe der Instanz aufnehmen — nicht so aussehen wie das
// Albumwerk-Backend.
//
// Die Markenfarbe kommt zur Laufzeit aus den Einstellungen und wird als
// CSS-Variable am Wurzelelement gesetzt; StyleX kann keine dynamischen Werte.

import * as stylex from "@stylexjs/stylex";

/** Inline-Stil für das Wurzelelement: setzt die Markenfarbe als Variable. */
export function brandVars(primaryColor: string): Record<string, string> {
  return {
    "--booking-accent": primaryColor || "#3d4a3d",
  } as Record<string, string>;
}

export const s = stylex.create({
  root: {
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: 15,
    lineHeight: 1.5,
    color: "#1a1a1a",
    // Kein fester Hintergrund: Der iframe soll sich in die Seite der
    // Fotograf:in einfügen, nicht als weißer Kasten darauf liegen.
    backgroundColor: "transparent",
    padding: 16,
    boxSizing: "border-box",
  },
  stack: { display: "flex", flexDirection: "column", gap: 16 },
  stackTight: { display: "flex", flexDirection: "column", gap: 8 },
  headline: { fontSize: 18, fontWeight: 600, margin: 0 },
  subline: { fontSize: 14, color: "#5c5c5c", margin: 0 },
  muted: { fontSize: 13, color: "#5c5c5c", margin: 0 },
  error: {
    fontSize: 14,
    color: "#8a1c1c",
    backgroundColor: "#fdeaea",
    border: "1px solid #f2c2c2",
    borderRadius: 8,
    padding: "10px 12px",
    margin: 0,
  },
  success: {
    fontSize: 14,
    color: "#1c5c2e",
    backgroundColor: "#e9f6ec",
    border: "1px solid #bfe3c8",
    borderRadius: 8,
    padding: "10px 12px",
    margin: 0,
  },
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#ffffff",
    textAlign: "left",
    width: "100%",
    font: "inherit",
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    ":hover": { borderColor: "var(--booking-accent)" },
  },
  cardTitle: { fontWeight: 600 },
  cardMeta: { fontSize: 13, color: "#5c5c5c" },
  button: {
    appearance: "none",
    border: "1px solid transparent",
    borderRadius: 8,
    padding: "10px 18px",
    font: "inherit",
    fontWeight: 600,
    cursor: "pointer",
    backgroundColor: "var(--booking-accent)",
    color: "#ffffff",
    ":disabled": { opacity: 0.5, cursor: "default" },
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    color: "var(--booking-accent)",
    borderColor: "#d5d5d5",
  },
  buttonRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  monthBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  monthLabel: { fontWeight: 600 },
  iconButton: {
    appearance: "none",
    border: "1px solid #d5d5d5",
    borderRadius: 8,
    backgroundColor: "transparent",
    width: 36,
    height: 36,
    font: "inherit",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    color: "inherit",
    ":disabled": { opacity: 0.4, cursor: "default" },
  },
  dayBlock: { display: "flex", flexDirection: "column", gap: 6 },
  dayLabel: { fontSize: 14, fontWeight: 600 },
  slotRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  slot: {
    appearance: "none",
    border: "1px solid #d5d5d5",
    borderRadius: 999,
    padding: "7px 14px",
    font: "inherit",
    fontSize: 14,
    backgroundColor: "#ffffff",
    cursor: "pointer",
    color: "inherit",
    ":hover": { borderColor: "var(--booking-accent)" },
  },
  slotSelected: {
    backgroundColor: "var(--booking-accent)",
    borderColor: "var(--booking-accent)",
    color: "#ffffff",
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 14, fontWeight: 500 },
  input: {
    font: "inherit",
    fontSize: 15,
    padding: "9px 11px",
    border: "1px solid #d5d5d5",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "inherit",
    width: "100%",
    boxSizing: "border-box",
    ":focus": { outline: "2px solid var(--booking-accent)", outlineOffset: 1 },
  },
  textarea: {
    font: "inherit",
    fontSize: 15,
    padding: "9px 11px",
    border: "1px solid #d5d5d5",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "inherit",
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: 72,
    ":focus": { outline: "2px solid var(--booking-accent)", outlineOffset: 1 },
  },
  checkboxRow: { display: "flex", gap: 8, alignItems: "flex-start" },
  checkboxLabel: { fontSize: 14 },
  link: { color: "var(--booking-accent)" },
  summary: {
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fafafa",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  // Honeypot: für Menschen unsichtbar, für Bots ein verlockendes Feld.
  // Nicht `display:none` — manche Bots überspringen ausgeblendete Felder.
  honeypot: {
    position: "absolute",
    left: "-9999px",
    width: 1,
    height: 1,
    overflow: "hidden",
  },
});
