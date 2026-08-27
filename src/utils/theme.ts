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

// Astryx injects a theme's CSS exactly once per `theme.name` and remembers
// that module-wide (node_modules/@astryxdesign/core/src/theme/Theme.tsx:98,
// 117-120) — whichever <Theme> mounts a name first owns that name's CSS for
// the page's lifetime, no matter what values a later mount passes. The preset
// key alone isn't enough to name a theme: an override on the active preset
// changes the values without changing the key, so the root theme, the
// branding page's live preview and the preset-card probes can end up sharing
// a name while disagreeing on values. Fold the values that actually determine
// the CSS into the name, so identical settings always produce the same name
// and different settings never collide.
function fingerprint(parts: (string | number)[]): string {
  const str = parts.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
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

// Builds the Astryx theme from the instance settings. Colors, font and radius
// come from the flat settings fields; the design register (kontaktbogen /
// riss / passepartout) supplies the surfaces, font roles and component
// overrides layered on top of them — see docs/design-presets.md. Used by
// App.tsx, the branding page's live preview and the preset-picker probes.
//
// The brand primary drives Astryx's full accent scale (HCT-derived) — it's
// the register's mark color, never a filled area. The brand secondary is the
// ink: it is exposed as `--color-brand-secondary` for the few spots that
// reference it directly, and it fills `variant:primary` buttons (below),
// resolved here rather than baked into the preset catalogue so a
// custom-branded instance keeps its own ink instead of the register's
// ("Die Knopfregel", docs/design-presets.md).
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

  const name = `albumwerk-${preset.key}-${fingerprint([primary, secondary, heading.family, body.family, radiusPx])}`;

  // Nur `variant:primary` bekommt die Füllung — `base` träfe jede Variante
  // (secondary, ghost, jeder <Button> ohne Variantenangabe) und Astryx' eigene
  // Variantenregeln liegen in einer früheren @layer, die diese Theme-Ebene
  // überschreibt (docs/design-presets.md, "Die Knopfregel"). `secondary` ist
  // ein einzelner Wert für beide Modi (kein [hell, dunkel]-Paar wie die
  // Flächen); light-dark() hellt ihn im Dunkelmodus auf, statt der dunklen
  // Tinte auf dunkler Karte. Text folgt denselben neutralen Kontrast-Tokens,
  // die Astryx selbst für "hell auf dunkel" / "dunkel auf hell" bereithält.
  //
  // !important ist hier kein Stilmittel, sondern eine Notbremse gegen einen
  // Build-Zufall: `Button.tsx`s eigenes `variants.primary` (backgroundColor:
  // var(--color-accent), color: var(--color-on-accent)) landet — weil exakt
  // dieselben Werte wörtlich auch in eigenem App-Code stehen (z. B.
  // BrandingPage.tsx, PricingPage.tsx, BrandLogo.tsx) — als atomare StyleX-
  // Klasse ZUSÄTZLICH unlayered in dist/stylex.css (Vite extrahiert
  // stylex.create()-Aufrufe app-weit, nicht nur aus eigenem Code). Unlayered
  // schlägt jede @layer-Regel, unabhängig von Spezifität oder Layer-
  // Reihenfolge — die eigentlich vorgesehene Priorität "Component-Overrides
  // sitzen über StyleX" (astryxdesign/core generateThemeRules.ts) greift für
  // genau diese zwei Deklarationen deshalb nicht. Nachgemessen im laufenden
  // Dev-Container: ohne !important bleibt der Primär-Knopf bei
  // var(--color-accent) statt der Tinte, in main.css UND stylex.css
  // gleichermaßen vorhanden. Kein Vite/StyleX-Konfigurationseingriff hier —
  // das wäre ein eigenes, größeres Vorhaben.
  const button = {
    ...preset.register.components.button,
    "variant:primary": {
      backgroundColor: `light-dark(${secondary}, color-mix(in srgb, ${secondary} 35%, white)) !important`,
      color: "light-dark(var(--color-on-dark), var(--color-on-light)) !important",
    },
  };

  return defineTheme({
    name,
    extends: neutralTheme,
    color: { accent: primary },
    typography: {
      body: { family: body.family, fallbacks: body.fallbacks },
      heading: { family: heading.family, fallbacks: heading.fallbacks },
    },
    tokens: tokens as DefineThemeTokens,
    components: { ...preset.register.components, button },
  });
}

// The tokens map includes a custom property name, so we widen the type for the
// defineTheme call (Astryx only types core token names).
type DefineThemeTokens = Parameters<typeof defineTheme>[0]["tokens"];
