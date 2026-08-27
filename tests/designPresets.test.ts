import { describe, expect, it } from "vitest";

import { FONT_STACKS } from "../src/utils/theme";
import { DESIGN_PRESETS, getPreset } from "../src/config/designPresets";

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
