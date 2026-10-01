import { describe, expect, it } from "vitest";
import { bookableByDay } from "../src/features/Appointments/bookable";

const TZ = "Europe/Berlin";
// 2026-10-02 ist ein Freitag, Sommerzeit (UTC+2)
const at = (iso: string) => new Date(iso).getTime();

describe("bookableByDay", () => {
  it("ordnet Startzeiten nach Ortszeit dem Tag zu und sortiert sie", () => {
    const days = bookableByDay(
      [
        { name: "Portrait", slots: [{ startMs: at("2026-10-02T12:30:00Z") }, { startMs: at("2026-10-02T11:00:00Z") }] },
        { name: "Paare", slots: [{ startMs: at("2026-10-03T11:00:00Z") }] },
      ],
      TZ,
    );
    expect(days.get("2026-10-02")).toEqual([{ name: "Portrait", times: ["13:00", "14:30"] }]);
    expect(days.get("2026-10-03")).toEqual([{ name: "Paare", times: ["13:00"] }]);
  });

  it("nimmt den Tag aus der Ortszeit, nicht aus UTC", () => {
    // 23:30 UTC am 2. ist 01:30 am 3. in Berlin
    const days = bookableByDay([{ name: "Portrait", slots: [{ startMs: at("2026-10-02T23:30:00Z") }] }], TZ);
    expect([...days.keys()]).toEqual(["2026-10-03"]);
  });

  it("lässt Arten ohne Zeiten weg", () => {
    expect(bookableByDay([{ name: "Portrait", slots: [] }], TZ).size).toBe(0);
  });
});
