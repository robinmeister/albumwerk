// Gemeinsame Stile der Buchungsoberfläche.
//
// ====================== BINDENDE EINSCHRÄNKUNG ======================
// Bewusst OHNE Astryx. Die Komponentenbibliothek würde ihre komplette
// Stildatei ins Embed-Bundle ziehen (~188 KB CSS mit Schriften), und genau
// dafür gibt es den eigenen Einstiegspunkt (docs/terminbuchung.md §9.1).
// Hier nur StyleX und Systemschriften.
//
// Form nach dem Stitch-Entwurf "Termin buchen" (Screens 8a711b5c…, d104c574…):
// Leistung, Datum und Uhrzeit nebeneinander, darunter die Kontaktdaten.
// Radius 0, Ablage-Grau als Fläche, Tinte als Auswahl. Die Entwurfsschriften
// (Fraunces, Martian Mono) sind durch Systemstapel derselben Gattung ersetzt.
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

// Töne aus dem Register "Kontaktbogen" (DESIGN.md), wie im Entwurf.
const INK = "#14130f";
const NOTE = "#55534a";
const EDGE = "#dcd7c8";
const TRAY = "#f2efe6";
const FAINT = "#cbc6bd";
const SERIF = "ui-serif, 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const WIDE = "@media (min-width: 760px)";

export const s = stylex.create({
  root: {
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: 16,
    lineHeight: 1.4,
    color: INK,
    // Kein fester Hintergrund: Der iframe soll sich in die Seite der
    // Fotograf:in einfügen, nicht als weißer Kasten darauf liegen.
    backgroundColor: "transparent",
    padding: 16,
    boxSizing: "border-box",
  },
  stack: { display: "flex", flexDirection: "column", gap: 24 },
  stackTight: { display: "flex", flexDirection: "column", gap: 12 },
  // Drei Spalten ab Tabletbreite, darunter eine. Maßgeblich ist die Breite
  // des iframes, nicht die der einbettenden Seite — genau richtig.
  columns: {
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr)", [WIDE]: "repeat(3, minmax(0, 1fr))" },
    gap: { default: 32, [WIDE]: 30 },
    alignItems: "start",
  },
  // Der Terminwähler belegt Spalte 2 und 3 und teilt sie selbst auf.
  spanTwo: {
    gridColumn: { default: "auto", [WIDE]: "span 2" },
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr)", [WIDE]: "repeat(2, minmax(0, 1fr))" },
    gap: { default: 32, [WIDE]: 30 },
    alignItems: "start",
  },
  kicker: {
    fontFamily: MONO,
    fontSize: 12,
    lineHeight: 1.4,
    textTransform: "uppercase",
    color: NOTE,
    margin: 0,
  },
  headline: { fontFamily: SERIF, fontSize: 24, fontWeight: 400, letterSpacing: "-0.3px", margin: 0 },
  subline: { fontSize: 14, color: NOTE, margin: 0 },
  muted: { fontSize: 13, color: NOTE, margin: 0 },
  error: {
    fontSize: 14,
    color: "#8a1c1c",
    backgroundColor: "#fdeaea",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#f2c2c2",
    padding: "10px 12px",
    margin: 0,
  },
  success: {
    fontSize: 14,
    color: "#1c5c2e",
    backgroundColor: "#e9f6ec",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#bfe3c8",
    padding: "10px 12px",
    margin: 0,
  },
  card: {
    appearance: "none",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dcd7c8",
    // Rahmen 2px bei Auswahl — innen per Schatten, damit nichts springt.
    boxShadow: "none",
    padding: 24,
    backgroundColor: TRAY,
    textAlign: "left",
    width: "100%",
    font: "inherit",
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    ":hover": { borderColor: INK },
    ":focus-visible": { outline: "2px solid var(--booking-accent)", outlineOffset: 2 },
  },
  cardSelected: { borderColor: INK, boxShadow: "inset 0 0 0 1px #14130f" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 },
  cardTitle: { fontFamily: SERIF, fontSize: 20, lineHeight: 1.1, letterSpacing: "-0.3px" },
  cardFoot: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    flexWrap: "wrap",
  },
  cardMeta: { fontSize: 14, color: NOTE },
  cardMono: { fontFamily: MONO, fontSize: 12, color: NOTE, whiteSpace: "nowrap" },
  price: { fontFamily: MONO, fontSize: 15, fontWeight: 500, color: INK, whiteSpace: "nowrap" },
  panel: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dcd7c8",
    backgroundColor: TRAY,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  button: {
    appearance: "none",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#14130f",
    borderRadius: 4,
    height: 42,
    padding: "0 32px",
    font: "inherit",
    cursor: "pointer",
    backgroundColor: INK,
    color: "#ffffff",
    ":disabled": { opacity: 0.5, cursor: "default" },
    ":focus-visible": { outline: "2px solid var(--booking-accent)", outlineOffset: 2 },
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    color: INK,
    borderColor: EDGE,
    ":hover": { borderColor: INK },
  },
  buttonRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" },
  monthBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  monthLabel: { fontFamily: SERIF, fontSize: 18 },
  iconButton: {
    appearance: "none",
    borderStyle: "none",
    backgroundColor: "transparent",
    width: 32,
    height: 32,
    font: "inherit",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    color: NOTE,
    ":hover": { color: INK },
    ":disabled": { opacity: 0.35, cursor: "default" },
    ":focus-visible": { outline: "2px solid var(--booking-accent)", outlineOffset: 2 },
  },
  weekGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 4,
    textAlign: "center",
    fontFamily: MONO,
  },
  weekday: { fontSize: 12, color: NOTE, paddingBottom: 8 },
  day: {
    appearance: "none",
    borderStyle: "none",
    backgroundColor: "transparent",
    font: "inherit",
    fontSize: 14,
    padding: "8px 0",
    color: INK,
    cursor: "pointer",
    ":hover": { backgroundColor: "#e7e2d6" },
    // Tage ohne freie Zeit: sichtbar, aber nicht wählbar.
    ":disabled": { color: FAINT, cursor: "default", backgroundColor: "transparent" },
    ":focus-visible": { outline: "2px solid var(--booking-accent)", outlineOffset: 2 },
  },
  daySelected: {
    backgroundColor: INK,
    color: "#ffffff",
    ":hover": { backgroundColor: INK },
  },
  dayLabel: { fontFamily: MONO, fontSize: 14, color: NOTE },
  slotRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 12,
  },
  slot: {
    appearance: "none",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dcd7c8",
    height: 42,
    font: "inherit",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    color: INK,
    ":hover": { borderColor: INK },
    ":focus-visible": { outline: "2px solid var(--booking-accent)", outlineOffset: 2 },
  },
  slotSelected: {
    backgroundColor: INK,
    borderColor: INK,
    color: "#ffffff",
  },
  formSection: {
    borderTop: "1px solid #dcd7c8",
    paddingTop: 40,
    maxWidth: 900,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr)", "@media (min-width: 600px)": "repeat(2, minmax(0, 1fr))" },
    gap: 24,
  },
  fullRow: { gridColumn: "1 / -1" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontFamily: MONO, fontSize: 12, color: NOTE },
  input: {
    font: "inherit",
    height: 42,
    padding: "0 12px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dcd7c8",
    borderRadius: 4,
    backgroundColor: "#ffffff",
    color: "inherit",
    width: "100%",
    boxSizing: "border-box",
    ":focus": { outline: "2px solid #14130f", outlineOffset: 0 },
  },
  textarea: {
    font: "inherit",
    padding: "10px 12px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dcd7c8",
    borderRadius: 4,
    backgroundColor: "#ffffff",
    color: "inherit",
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: 84,
    ":focus": { outline: "2px solid #14130f", outlineOffset: 0 },
  },
  checkboxRow: { display: "flex", gap: 8, alignItems: "flex-start" },
  checkboxLabel: { fontSize: 14 },
  link: { color: "var(--booking-accent)" },
  summary: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dcd7c8",
    padding: 16,
    backgroundColor: TRAY,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  // Honeypot: für Menschen unsichtbar, für Bots ein verlockendes Feld.
  // Nicht "display:none" — manche Bots überspringen ausgeblendete Felder.
  honeypot: {
    position: "absolute",
    left: "-9999px",
    width: 1,
    height: 1,
    overflow: "hidden",
  },
});
