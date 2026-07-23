import { defineTheme, type DefinedTheme, type ThemeMode } from "@astryxdesign/core";
import { neutralTheme } from "@astryxdesign/theme-neutral";

import { AppSettings, DEFAULT_SETTINGS, FontKey } from "../config/settings";

// Self-hosted font stacks; the families are loaded via @fontsource imports in
// main.tsx so no external font CDN is contacted (DSGVO). Split into primary
// family + fallbacks for Astryx's typography config.
type FontStack = { family: string; fallbacks: string };
const FONT_STACKS: Record<FontKey, FontStack> = {
  inter: { family: "Inter", fallbacks: '"Helvetica", "Arial", sans-serif' },
  lora: { family: "Lora", fallbacks: '"Georgia", serif' },
  playfair: { family: "Playfair Display", fallbacks: '"Georgia", serif' },
  montserrat: { family: "Montserrat", fallbacks: '"Helvetica", "Arial", sans-serif' },
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
      heading: {
        base: { fontWeight: "300", letterSpacing: "-0.02em" },
      },
      // pill buttons, flat (no elevation)
      button: {
        base: { borderRadius: "9999px", paddingInline: "20px", boxShadow: "none" },
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

// Legacy static theme for modules that still import a default; built from the
// neutral defaults. New code should use buildAstryxTheme + SettingsContext.
const theme = buildAstryxTheme(DEFAULT_SETTINGS);

export default theme;
