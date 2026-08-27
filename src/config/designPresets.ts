import { DesignPresetKey, FontKey, FontStackKey } from "./settings";

// Ein Preset hat zwei Hälften mit unterschiedlichem Besitzer:
// `defaults` sind Vorgaben für die vier überschreibbaren Settings-Felder,
// `register` ist die Gestaltung selbst und nicht einzeln überschreibbar.
// Begründung und Farbmessungen: docs/design-presets.md
export interface DesignPreset {
  key: DesignPresetKey;
  name: string;
  description: string;
  defaults: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: FontKey;
    borderRadius: number;
  };
  register: {
    surfaces: {
      body: [string, string];
      surface: [string, string];
      card: [string, string];
    };
    headingFamily: FontStackKey;
    bodyFamily: FontStackKey;
    monoFamily: FontStackKey;
    // Astryx-Component-Overrides, Form wie in buildAstryxTheme
    components: Record<string, Record<string, Record<string, string>>>;
  };
}

// Astryx' Überschriftenskala ist am unteren Ende gestaucht: level 5 rendert
// 12px, level 6 noch kleiner — also KLEINER als der Fließtext (14px)
// darunter. Die App nutzt fast nur 4/5/6 (7/17/36 Stellen), damit stand auf
// fast jeder Seite die Überschrift unter ihrem eigenen Text. Zweimal
// geradegerückt statt an 60 Aufrufstellen — einmal hier für kontaktbogen und
// riss, einmal unten in passepartouts eigenem components-Block. Die zweite
// Kopie ist ein bekannter, kleiner Fleck (siehe Abschlussreview) und bleibt
// bewusst stehen.
//
// Gemeinsam für kontaktbogen und riss: flache Flächen, rechteckige Ecken,
// straffe Überschriften. Die Knopffüllung steht nicht hier — die setzt
// buildAstryxTheme (src/utils/theme.ts) aus der aufgelösten secondaryColor
// zusammen, damit ein individuell gesetztes Branding nicht die Registertinte
// behält (docs/design-presets.md, "Die Knopfregel").
function flachesRegister() {
  return {
    heading: {
      base: { fontWeight: "600", letterSpacing: "-0.035em" },
      "level:3": { fontSize: "var(--font-size-3xl)" },
      "level:4": { fontSize: "var(--font-size-2xl)" },
      "level:5": { fontSize: "var(--font-size-xl)" },
      "level:6": { fontSize: "var(--font-size-lg)" },
    },
    button: { base: { boxShadow: "none" } },
    card: { base: { boxShadow: "none", borderWidth: "1px" } },
  };
}

export const DESIGN_PRESETS: Record<DesignPresetKey, DesignPreset> = {
  kontaktbogen: {
    key: "kontaktbogen",
    name: "Kontaktbogen",
    description: "Auswahl als Handwerk. Positivpapier, Filmträger, Fettstift.",
    defaults: {
      primaryColor: "#cf2f22",
      secondaryColor: "#14130f",
      fontFamily: "public-sans",
      borderRadius: 0,
    },
    register: {
      surfaces: {
        body: ["#e4e1d6", "#191814"],
        surface: ["#edeae1", "#211f1a"],
        card: ["#edeae1", "#211f1a"],
      },
      headingFamily: "familjen-grotesk",
      bodyFamily: "public-sans",
      monoFamily: "martian-mono",
      components: flachesRegister(),
    },
  },
  riss: {
    key: "riss",
    name: "Riss",
    description: "Gerät, das dir gehört. Hell die Weißpause, dunkel die Blaupause.",
    defaults: {
      primaryColor: "#f2c400",
      secondaryColor: "#0a2233",
      fontFamily: "public-sans",
      borderRadius: 0,
    },
    register: {
      surfaces: {
        body: ["#dfe7eb", "#0d3550"],
        surface: ["#e9eef1", "#0f3d5c"],
        card: ["#e9eef1", "#0f3d5c"],
      },
      headingFamily: "familjen-grotesk",
      bodyFamily: "public-sans",
      monoFamily: "martian-mono",
      components: flachesRegister(),
    },
  },
  passepartout: {
    key: "passepartout",
    name: "Passepartout",
    description: "Das fertige Album. Karton, Buchleinen, tiefe Passepartouts.",
    defaults: {
      primaryColor: "#5e3128",
      secondaryColor: "#17181a",
      fontFamily: "newsreader",
      borderRadius: 0,
    },
    register: {
      surfaces: {
        body: ["#dfdcd4", "#1c1a17"],
        surface: ["#ece9e1", "#242119"],
        card: ["#ece9e1", "#242119"],
      },
      headingFamily: "instrument-serif",
      bodyFamily: "newsreader",
      monoFamily: "public-sans",
      components: {
        heading: {
          base: { fontWeight: "400", letterSpacing: "0" },
          "level:3": { fontSize: "var(--font-size-3xl)" },
          "level:4": { fontSize: "var(--font-size-2xl)" },
          "level:5": { fontSize: "var(--font-size-xl)" },
          "level:6": { fontSize: "var(--font-size-lg)" },
        },
        button: { base: { boxShadow: "none" } },
        card: { base: { boxShadow: "none", borderWidth: "1px" } },
      },
    },
  },
};

export const DEFAULT_PRESET: DesignPresetKey = "kontaktbogen";

// Ein unbekannter Schlüssel darf nicht auf einer ungestylten Seite enden —
// etwa nach einem Downgrade, wenn die DB ein neueres Register nennt.
export function getPreset(key: string | undefined): DesignPreset {
  return DESIGN_PRESETS[key as DesignPresetKey] ?? DESIGN_PRESETS[DEFAULT_PRESET];
}
