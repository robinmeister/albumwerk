import { defineTheme, type DefinedTheme, type ThemeMode } from "@astryxdesign/core";
import { neutralTheme } from "@astryxdesign/theme-neutral";

import { AppSettings, DEFAULT_SETTINGS, FontStackKey } from "../config/settings";

// Self-hosted font stacks; the families are loaded via @fontsource imports in
// main.tsx so no external font CDN is contacted (DSGVO). Split into primary
// family + fallbacks for Astryx's typography config.
export type FontStack = { family: string; fallbacks: string };

export const FONT_STACKS: Record<FontStackKey, FontStack> = {
  inter: { family: "Inter", fallbacks: '"Helvetica", "Arial", sans-serif' },
  lora: { family: "Lora", fallbacks: '"Georgia", serif' },
  playfair: { family: "Playfair Display", fallbacks: '"Georgia", serif' },
  montserrat: { family: "Montserrat", fallbacks: '"Helvetica", "Arial", sans-serif' },
  "familjen-grotesk": { family: "Familjen Grotesk", fallbacks: '"Helvetica", "Arial", sans-serif' },
  "public-sans": { family: "Public Sans", fallbacks: '"Helvetica", "Arial", sans-serif' },
  "martian-mono": { family: "Martian Mono", fallbacks: 'ui-monospace, "Menlo", monospace' },
  "instrument-serif": { family: "Instrument Serif", fallbacks: '"Georgia", serif' },
  newsreader: { family: "Newsreader", fallbacks: '"Georgia", serif' },
};

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function safeColor(value: string, fallback: string): string {
  return HEX_COLOR.test(value) ? value : fallback;
}

// Concrete light/dark for callers that need a resolved value (e.g. the
// theme-color meta tag in useBranding). `auto` follows the OS preference.
export function resolveMode(settings: AppSettings): "light" | "dark" {
  if (settings.themeMode === "dark") return "dark";
  if (settings.themeMode === "light") return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

// The mode passed to Astryx's <Theme>. `auto` maps to `system` so the tokens'
// light-dark() values and `color-scheme` follow the OS without extra JS.
export function themeModeProp(settings: AppSettings): ThemeMode {
  return settings.themeMode === "auto" ? "system" : settings.themeMode;
}

// Builds the Astryx theme from the instance settings. Photography-first look:
// near-monochrome chrome, the brand colors only appear as accents; images do
// the talking. Used by App.tsx and the branding page's live preview.
//
// The brand primary drives Astryx's full accent scale (HCT-derived). The brand
// secondary is exposed as a custom `--color-brand-secondary` token for the few
// spots that reference it. Editorial identity (light headlines, pill buttons,
// flat hairline cards) is applied as component overrides.
export function buildAstryxTheme(settings: AppSettings): DefinedTheme {
  const primary = safeColor(settings.primaryColor, DEFAULT_SETTINGS.primaryColor);
  const secondary = safeColor(
    settings.secondaryColor,
    DEFAULT_SETTINGS.secondaryColor,
  );
  const font = FONT_STACKS[settings.fontFamily] ?? FONT_STACKS[DEFAULT_SETTINGS.fontFamily];
  const radiusPx = Number.isFinite(settings.borderRadius)
    ? Math.min(Math.max(settings.borderRadius, 0), 32)
    : DEFAULT_SETTINGS.borderRadius;

  // Custom / non-core token names aren't in Astryx's TokenName union, so the
  // token map is built loosely and cast at the call site.
  const tokens: Record<string, string | [string, string]> = {
    // brand secondary accent (custom token consumed by a handful of components)
    "--color-brand-secondary": secondary,
    // instance corner radius drives interactive elements + containers
    "--radius-element": `${radiusPx}px`,
    "--radius-container": `${radiusPx}px`,
    // near-monochrome surfaces matching the current editorial palette [light, dark]
    "--color-background-body": ["#fafafa", "#0e0e0e"],
    "--color-background-surface": ["#ffffff", "#161616"],
    "--color-background-card": ["#ffffff", "#161616"],
  };

  return defineTheme({
    name: "albumwerk",
    extends: neutralTheme,
    color: { accent: primary },
    typography: {
      body: { family: font.family, fallbacks: font.fallbacks },
      heading: { family: font.family, fallbacks: font.fallbacks },
    },
    tokens: tokens as DefineThemeTokens,
    components: {
      // large, light headlines with tight tracking — editorial/portfolio look
      //
      // Astryx' Überschriftenskala ist am unteren Ende gestaucht: level 5
      // rendert 12px, level 6 noch kleiner — also KLEINER als der Fließtext
      // (14px) darunter. Die App nutzt fast nur 4/5/6 (7/17/36 Stellen), damit
      // stand auf fast jeder Seite die Überschrift unter ihrem eigenen Text.
      // Hier einmal geradegerückt statt an 60 Aufrufstellen.
      heading: {
        base: { fontWeight: "300", letterSpacing: "-0.02em" },
        "level:3": { fontSize: "var(--font-size-3xl)" }, // 29px  Seitentitel groß
        "level:4": { fontSize: "var(--font-size-2xl)" }, // 24px  Seitentitel
        "level:5": { fontSize: "var(--font-size-xl)" },  // 20px  Kartentitel
        "level:6": { fontSize: "var(--font-size-lg)" },  // 17px  Abschnitt
      },
      // flache Knöpfe ohne Schlagschatten. Die Rundung folgt der Instanz-
      // Einstellung: als feste Pille (9999px) standen in einem Formular drei
      // verschiedene Rundungen übereinander — Karte, Feld, Knopf.
      // Pillen zurück: borderRadius wieder auf "9999px".
      button: {
        base: { borderRadius: "var(--radius-element)", paddingInline: "20px", boxShadow: "none" },
      },
      // flat, hairline-bordered cards
      card: {
        base: { boxShadow: "none", borderWidth: "1px" },
      },
    },
  });
}

// The tokens map includes a custom property name, so we widen the type for the
// defineTheme call (Astryx only types core token names).
type DefineThemeTokens = Parameters<typeof defineTheme>[0]["tokens"];
