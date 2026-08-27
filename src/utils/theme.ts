import { defineTheme, type DefinedTheme, type ThemeMode } from "@astryxdesign/core";
import { neutralTheme } from "@astryxdesign/theme-neutral";

import { AppSettings, DEFAULT_SETTINGS, FontStackKey } from "../config/settings";
import { getPreset } from "../config/designPresets";
import { isOverridden } from "./themeOverrides";

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

  const preset = getPreset(settings.designPreset);
  const radiusPx = Number.isFinite(settings.borderRadius)
    ? Math.min(Math.max(settings.borderRadius, 0), 32)
    : preset.defaults.borderRadius;

  // Schriftregel (docs/design-presets.md): geerbt -> das Paar des Registers,
  // gesetzt -> eine Familie für alles, wie vor den Presets.
  const eigeneSchrift = isOverridden(settings, "fontFamily");
  const heading = eigeneSchrift
    ? FONT_STACKS[settings.fontFamily]
    : FONT_STACKS[preset.register.headingFamily];
  const body = eigeneSchrift
    ? FONT_STACKS[settings.fontFamily]
    : FONT_STACKS[preset.register.bodyFamily];
  const mono = FONT_STACKS[preset.register.monoFamily];

  const tokens: Record<string, string | [string, string]> = {
    "--color-brand-secondary": secondary,
    "--radius-element": `${radiusPx}px`,
    "--radius-container": `${radiusPx}px`,
    "--color-background-body": preset.register.surfaces.body,
    "--color-background-surface": preset.register.surfaces.surface,
    "--color-background-card": preset.register.surfaces.card,
    "--font-family-code": `"${mono.family}", ${mono.fallbacks}`,
  };

  return defineTheme({
    name: `albumwerk-${preset.key}`,
    extends: neutralTheme,
    color: { accent: primary },
    typography: {
      body: { family: body.family, fallbacks: body.fallbacks },
      heading: { family: heading.family, fallbacks: heading.fallbacks },
    },
    tokens: tokens as DefineThemeTokens,
    components: preset.register.components,
  });
}

// The tokens map includes a custom property name, so we widen the type for the
// defineTheme call (Astryx only types core token names).
type DefineThemeTokens = Parameters<typeof defineTheme>[0]["tokens"];
