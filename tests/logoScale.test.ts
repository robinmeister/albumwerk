import { describe, expect, it } from "vitest";
import { LOGO_SCALE_MAX, LOGO_SCALE_MIN, logoScale } from "../src/config/settings";

describe("Logogröße je Ort", () => {
  it("liest fehlende oder kaputte Werte als 100 % und begrenzt Ausreißer", () => {
    expect(logoScale({}, "navigation")).toBe(100);
    expect(logoScale(null, "navigation")).toBe(100);
    expect(logoScale({ navigation: 0 }, "navigation")).toBe(100);
    expect(logoScale({ navigation: "200" as unknown as number }, "navigation")).toBe(100);
    expect(logoScale({ navigation: 10 }, "navigation")).toBe(LOGO_SCALE_MIN);
    expect(logoScale({ navigation: 999 }, "navigation")).toBe(LOGO_SCALE_MAX);
  });

  it("jeder Ort hat seinen eigenen Wert", () => {
    expect(logoScale({ navigation: 150, seitenkopf: 80 }, "navigation")).toBe(150);
    expect(logoScale({ navigation: 150, seitenkopf: 80 }, "seitenkopf")).toBe(80);
    expect(logoScale({ navigation: 150 }, "seitenkopf")).toBe(100);
  });
});
