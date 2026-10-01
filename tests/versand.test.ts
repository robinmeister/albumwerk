import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { shippingFor } from "../src/features/Pricing/utils/shipping";

// Server und Oberfläche rechnen den Versand getrennt. Zeigt der Checkout eine
// andere Summe, als Stripe/PayPal abbuchen, merkt das zuerst die Kund:in.
const require = createRequire(import.meta.url);
const pl = require("../pb_hooks/lib/printlib.js");

const FAELLE: Array<[number, boolean, number, number, number]> = [
  [10, true, 4.9, 0, 4.9],
  [10, false, 4.9, 0, 0],
  [49.99, true, 4.9, 50, 4.9],
  [50, true, 4.9, 50, 0],
  [80, true, 4.9, 50, 0],
  [10, true, 0, 0, 0],
  [10, true, 3.333, 0, 3.33],
];

describe("Versand gleich in Server und Oberfläche", () => {
  it.each(FAELLE)("Warenwert %s, Labor %s, Pauschale %s, frei ab %s → %s", (waren, labor, pauschale, frei, erwartet) => {
    expect(pl.shippingFor(waren, labor, pauschale, frei)).toBe(erwartet);
    expect(shippingFor(waren, labor, pauschale, frei)).toBe(erwartet);
  });
});
