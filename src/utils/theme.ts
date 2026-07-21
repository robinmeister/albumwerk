import { Theme, createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

import { AppSettings, DEFAULT_SETTINGS, FontKey } from "../config/settings";

// Self-hosted font stacks; the families are loaded via @fontsource imports in
// main.tsx so no external font CDN is contacted (DSGVO).
const FONT_STACKS: Record<FontKey, string> = {
  inter: '"Inter", "Helvetica", "Arial", sans-serif',
  lora: '"Lora", "Georgia", serif',
  playfair: '"Playfair Display", "Georgia", serif',
  montserrat: '"Montserrat", "Helvetica", "Arial", sans-serif',
};

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function safeColor(value: string, fallback: string): string {
  return HEX_COLOR.test(value) ? value : fallback;
}

export function resolveMode(settings: AppSettings): "light" | "dark" {
  if (settings.themeMode === "dark") return "dark";
  if (settings.themeMode === "light") return "light";
  // auto → follow the OS preference
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

// Builds the MUI theme from the instance settings. Photography-first look:
// near-monochrome chrome, the brand colors only appear as accents; images do
// the talking. Used by App.tsx and the branding page's live preview.
export function buildTheme(settings: AppSettings): Theme {
  const fontFamily =
    FONT_STACKS[settings.fontFamily] ?? FONT_STACKS[DEFAULT_SETTINGS.fontFamily];
  const borderRadius = Number.isFinite(settings.borderRadius)
    ? Math.min(Math.max(settings.borderRadius, 0), 32)
    : DEFAULT_SETTINGS.borderRadius;
  const mode = resolveMode(settings);
  const dark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: safeColor(settings.primaryColor, DEFAULT_SETTINGS.primaryColor),
      },
      secondary: {
        main: safeColor(settings.secondaryColor, DEFAULT_SETTINGS.secondaryColor),
      },
      error: {
        main: red.A400,
      },
      background: dark
        ? { default: "#0e0e0e", paper: "#161616" }
        : { default: "#fafafa", paper: "#ffffff" },
      divider: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    },
    shape: {
      borderRadius,
    },
    typography: {
      fontFamily,
      // large, light headlines with tight tracking — editorial/portfolio look
      h1: { fontWeight: 300, letterSpacing: "-0.02em" },
      h2: { fontWeight: 300, letterSpacing: "-0.02em" },
      h3: { fontWeight: 300, letterSpacing: "-0.01em" },
      h4: { fontWeight: 400, letterSpacing: "-0.01em" },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle2: {
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontSize: "0.75rem",
        fontWeight: 600,
      },
      overline: { letterSpacing: "0.16em", fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.02em" },
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          // pill buttons
          root: {
            borderRadius: 999,
            paddingLeft: 20,
            paddingRight: 20,
          },
          sizeLarge: {
            paddingTop: 10,
            paddingBottom: 10,
          },
        },
      },
      // chrome stays neutral: flat app bar on paper with a hairline divider,
      // text follows the palette instead of the brand color
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: dark
              ? "rgba(22,22,22,0.85)"
              : "rgba(255,255,255,0.85)",
            color: theme.palette.text.primary,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }),
          // the color-variant classes would otherwise win over root
          colorPrimary: {
            backgroundColor: dark
              ? "rgba(22,22,22,0.85)"
              : "rgba(255,255,255,0.85)",
          },
          colorDefault: {
            backgroundColor: dark
              ? "rgba(22,22,22,0.85)"
              : "rgba(255,255,255,0.85)",
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: ({ theme }) => ({
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: "none",
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? "#161616" : "#ffffff",
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          img: {
            // photos fade in as they load (paired with the album components)
            transition: "opacity 0.3s ease",
          },
        },
      },
    },
  });
}

// Legacy static theme for modules that still import a default theme; built
// from the neutral defaults. New code should use buildTheme + SettingsContext.
const theme = buildTheme(DEFAULT_SETTINGS);

export default theme;
