import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildAstryxTheme, FONT_STACKS } from "../src/utils/theme";
import { DESIGN_PRESETS, getPreset } from "../src/config/designPresets";
import {
  applyPreset, clearOverride, isOverridden, setOverride, type ThemeFields,
} from "../src/utils/themeOverrides";
import { DEFAULT_SETTINGS, fetchSettings, readSettingsCache, SETTINGS_RECORD_ID } from "../src/config/settings";
import { pb } from "../src/config/pocketbase";

describe("Schrift-Stacks", () => {
  it("kennt jede Familie, die ein Register belegen kann", () => {
    for (const key of [
      "inter", "lora", "playfair", "montserrat",
      "familjen-grotesk", "public-sans", "martian-mono",
      "instrument-serif", "newsreader",
    ] as const) {
      expect(FONT_STACKS[key], key).toBeDefined();
      expect(FONT_STACKS[key].family.length).toBeGreaterThan(0);
      expect(FONT_STACKS[key].fallbacks.length).toBeGreaterThan(0);
    }
  });
});

describe("Preset-Katalog", () => {
  it("hält drei Register bereit", () => {
    expect(Object.keys(DESIGN_PRESETS).sort()).toEqual([
      "kontaktbogen", "passepartout", "riss",
    ]);
  });

  it("belegt in jedem Register alle drei Schriftrollen", () => {
    for (const preset of Object.values(DESIGN_PRESETS)) {
      expect(FONT_STACKS[preset.register.headingFamily], preset.key).toBeDefined();
      expect(FONT_STACKS[preset.register.bodyFamily], preset.key).toBeDefined();
      expect(FONT_STACKS[preset.register.monoFamily], preset.key).toBeDefined();
    }
  });

  it("setzt nie ein Beinahe-Schwarz als Akzent — Astryx macht daraus Senfgelb", () => {
    // siehe docs/design-presets.md, Messung vom 2026-08-27
    for (const preset of Object.values(DESIGN_PRESETS)) {
      const hex = preset.defaults.primaryColor.replace("#", "");
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const helligkeit = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      expect(helligkeit, `${preset.key} ist zu dunkel für color.accent`).toBeGreaterThan(0.08);
    }
  });

  it("fällt bei unbekanntem Schlüssel auf kontaktbogen zurück", () => {
    expect(getPreset("gibtesnicht").key).toBe("kontaktbogen");
    expect(getPreset(undefined).key).toBe("kontaktbogen");
    expect(getPreset("riss").key).toBe("riss");
  });
});

const basis: ThemeFields = {
  designPreset: "kontaktbogen",
  themeOverrides: [],
  primaryColor: "#cf2f22",
  secondaryColor: "#14130f",
  fontFamily: "public-sans",
  borderRadius: 0,
};

describe("Override-Logik", () => {
  it("übernimmt beim Preset-Wechsel alle geerbten Felder", () => {
    const nachher = applyPreset(basis, "riss");
    expect(nachher.designPreset).toBe("riss");
    expect(nachher.primaryColor).toBe("#f2c400");
    expect(nachher.secondaryColor).toBe("#0a2233");
    expect(nachher.borderRadius).toBe(0);
  });

  it("lässt gesetzte Felder beim Preset-Wechsel stehen", () => {
    const eigen = setOverride(basis, "primaryColor", "#0066ff");
    const nachher = applyPreset(eigen, "riss");
    expect(nachher.primaryColor).toBe("#0066ff");
    expect(nachher.secondaryColor).toBe("#0a2233"); // geerbt, zieht mit
    expect(nachher.themeOverrides).toEqual(["primaryColor"]);
  });

  it("merkt sich borderRadius 0 als bewusst gesetzt", () => {
    // 0 ist ein gültiger Wert — genau deshalb eine Namensliste statt Leerwerten
    const eigen = setOverride(basis, "borderRadius", 0);
    expect(isOverridden(eigen, "borderRadius")).toBe(true);
    expect(applyPreset(eigen, "passepartout").borderRadius).toBe(0);
  });

  it("stellt beim Zurücksetzen den Preset-Wert wieder her", () => {
    const eigen = setOverride(basis, "primaryColor", "#0066ff");
    const zurueck = clearOverride(eigen, "primaryColor");
    expect(zurueck.primaryColor).toBe("#cf2f22");
    expect(zurueck.themeOverrides).toEqual([]);
    expect(isOverridden(zurueck, "primaryColor")).toBe(false);
  });

  it("nimmt denselben Override nicht doppelt auf", () => {
    const zweimal = setOverride(setOverride(basis, "fontFamily", "lora"), "fontFamily", "inter");
    expect(zweimal.themeOverrides).toEqual(["fontFamily"]);
    expect(zweimal.fontFamily).toBe("inter");
  });

  it("verändert die Eingabe nicht", () => {
    const vorher = { ...basis, themeOverrides: [...basis.themeOverrides] };
    applyPreset(basis, "riss");
    setOverride(basis, "primaryColor", "#0066ff");
    expect(basis).toEqual(vorher);
  });

  it("lässt keinen falsch typisierten Wert durch", () => {
    // @ts-expect-error borderRadius ist eine Zahl, kein String
    setOverride(basis, "borderRadius", "null");
  });
});

describe("Settings-Normalisierung", () => {
  const CACHE_KEY = "app_settings_cache_v1";

  // vitest läuft hier mit environment: "node" (siehe vite.config.ts) — kein
  // localStorage vorhanden. Minimaler In-Memory-Ersatz nur für diesen Block.
  class MemoryStorage {
    private store = new Map<string, string>();
    getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
    setItem(key: string, value: string) { this.store.set(key, value); }
    clear() { this.store.clear(); }
  }

  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });
  afterEach(() => {
    delete (globalThis as unknown as { localStorage?: MemoryStorage }).localStorage;
    vi.restoreAllMocks();
  });

  it("readSettingsCache: ein alter Cache ohne die neuen Felder bekommt die Defaults", () => {
    const { designPreset: _p, themeOverrides: _o, ...alterCache } = DEFAULT_SETTINGS;
    localStorage.setItem(CACHE_KEY, JSON.stringify(alterCache));
    const settings = readSettingsCache();
    expect(settings?.designPreset).toBe("kontaktbogen");
    expect(settings?.themeOverrides).toEqual([]);
  });

  it("readSettingsCache: null aus einem nie beschriebenen Feld wird zum leeren Array", () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, designPreset: null, themeOverrides: null }),
    );
    const settings = readSettingsCache();
    expect(settings?.designPreset).toBe("kontaktbogen");
    expect(settings?.themeOverrides).toEqual([]);
  });

  it("readSettingsCache: unbekannte Werte fliegen raus statt durchgereicht zu werden", () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        designPreset: "gibtesnicht",
        themeOverrides: ["primaryColor", "unbekanntesFeld"],
      }),
    );
    const settings = readSettingsCache();
    expect(settings?.designPreset).toBe("kontaktbogen");
    expect(settings?.themeOverrides).toEqual(["primaryColor"]);
  });

  it("fetchSettings: ein nie beschriebenes PocketBase-JSON-Feld (null) wird normalisiert", async () => {
    vi.spyOn(pb, "collection").mockReturnValue({
      getOne: async () => ({
        ...DEFAULT_SETTINGS,
        id: SETTINGS_RECORD_ID,
        designPreset: null,
        themeOverrides: null,
      }),
    } as never);

    const settings = await fetchSettings();
    expect(settings.designPreset).toBe("kontaktbogen");
    expect(settings.themeOverrides).toEqual([]);
  });

  // Die vier Tests oben prüfen alle nur den Fallback-Pfad — keiner belegt,
  // dass ein gültiger, vom Standard abweichender Wert unangetastet
  // durchgereicht wird.
  it("readSettingsCache: ein gültiges, nicht-standardmäßiges Preset und ein gültiger Override bleiben erhalten", () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, designPreset: "riss", themeOverrides: ["primaryColor"] }),
    );
    const settings = readSettingsCache();
    expect(settings?.designPreset).toBe("riss");
    expect(settings?.themeOverrides).toEqual(["primaryColor"]);
  });
});

const tokensVon = (theme: unknown) =>
  (theme as { tokens: Record<string, string> }).tokens;

describe("buildAstryxTheme mit Register", () => {
  it("nimmt die Flächen aus dem gewählten Register", () => {
    const t = buildAstryxTheme({ ...DEFAULT_SETTINGS, designPreset: "riss" });
    // defineTheme wandelt [light, dark]-Tupel in light-dark() um (siehe
    // @astryxdesign/core/src/theme/defineTheme.ts) — kein rohes Tupel mehr.
    expect(tokensVon(t)["--color-background-body"]).toEqual("light-dark(#dfe7eb, #0d3550)");
  });

  it("nutzt bei geerbter Schrift das Paar des Registers", () => {
    const t = buildAstryxTheme({ ...DEFAULT_SETTINGS, designPreset: "kontaktbogen" });
    const tokens = tokensVon(t);
    expect(String(tokens["--font-family-heading"])).toContain("Familjen Grotesk");
    expect(String(tokens["--font-family-body"])).toContain("Public Sans");
    expect(String(tokens["--font-family-code"])).toContain("Martian Mono");
  });

  it("nutzt bei gesetzter Schrift eine Familie für alles", () => {
    const t = buildAstryxTheme({
      ...DEFAULT_SETTINGS,
      designPreset: "kontaktbogen",
      fontFamily: "lora",
      themeOverrides: ["fontFamily"],
    });
    const tokens = tokensVon(t);
    expect(String(tokens["--font-family-heading"])).toContain("Lora");
    expect(String(tokens["--font-family-body"])).toContain("Lora");
  });

  it("fällt bei unbekanntem Register auf kontaktbogen zurück", () => {
    const t = buildAstryxTheme({
      ...DEFAULT_SETTINGS,
      designPreset: "gibtesnicht" as never,
    });
    expect(tokensVon(t)["--color-background-body"]).toEqual("light-dark(#e4e1d6, #191814)");
  });

  // Fängt versehentliche Token-Dreher, die kein gezielter Test abdeckt.
  it.each(["kontaktbogen", "riss", "passepartout"] as const)(
    "hält die Tokens von %s stabil",
    (key) => {
      const t = buildAstryxTheme({ ...DEFAULT_SETTINGS, designPreset: key });
      expect(tokensVon(t)).toMatchSnapshot();
    },
  );
});

const componentsVon = (theme: unknown) =>
  (theme as { components: Record<string, Record<string, Record<string, string>>> }).components;

describe("buildAstryxTheme: Component-Overrides aus dem Register", () => {
  // Regressionswächter: die level:3-6 Overrides leben in components, nicht
  // in tokens — die Snapshot-Tests oben sehen sie nicht. Genau das ließ sie
  // unbemerkt verschwinden. Prüft das gebaute Theme, nicht den Katalog
  // direkt, damit ein Bruch in der Verdrahtung (buildAstryxTheme) auch
  // auffällt.
  // Astryx' neutralTheme definiert level:3-6 selbst (mit der gestauchten
  // Standard-Fontsize) — der Schlüssel existiert also so oder so. Ohne
  // unseren Override würde hier `var(--text-heading-6-size)` &Co. stehen
  // statt unserer Werte, deshalb auf den konkreten fontSize-Wert prüfen,
  // nicht nur auf toBeDefined().
  it.each(["kontaktbogen", "riss", "passepartout"] as const)(
    "behält die Überschriften-Level-Overrides von %s im gebauten Theme",
    (key) => {
      const heading = componentsVon(buildAstryxTheme({ ...DEFAULT_SETTINGS, designPreset: key })).heading;
      expect(heading["level:3"]?.fontSize, key).toBe("var(--font-size-3xl)");
      expect(heading["level:4"]?.fontSize, key).toBe("var(--font-size-2xl)");
      expect(heading["level:5"]?.fontSize, key).toBe("var(--font-size-xl)");
      expect(heading["level:6"]?.fontSize, key).toBe("var(--font-size-lg)");
    },
  );
});
