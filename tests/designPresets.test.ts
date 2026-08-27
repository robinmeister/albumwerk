import { describe, expect, it } from "vitest";

import { FONT_STACKS } from "../src/utils/theme";

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
