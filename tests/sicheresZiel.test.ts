import { describe, expect, it } from "vitest";

import { sicheresZiel } from "../src/utils/routes";

describe("sicheresZiel", () => {
  it("laesst eigene Pfade samt Query durch", () => {
    expect(sicheresZiel("/support?ticket=9evi9j6la5pcbck")).toBe(
      "/support?ticket=9evi9j6la5pcbck",
    );
  });

  it("weist Ziele ausserhalb der App ab", () => {
    // Protokoll-relativ, absolut und der Backslash-Trick landen sonst auf
    // einer fremden Seite, die aussieht wie das Login.
    expect(sicheresZiel("//fremde.example/login")).toBeNull();
    expect(sicheresZiel("https://fremde.example")).toBeNull();
    expect(sicheresZiel("/\\fremde.example")).toBeNull();
  });

  it("faellt bei fehlendem oder leerem Wert auf null zurueck", () => {
    expect(sicheresZiel(null)).toBeNull();
    expect(sicheresZiel("")).toBeNull();
    expect(sicheresZiel("support")).toBeNull();
  });
});
