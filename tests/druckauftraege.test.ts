import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Wie tests/paketkauf.test.ts: Hook-Helfer direkt einbinden, JSVM-Globals als
// Attrappen.
const require = createRequire(import.meta.url);

(globalThis as any).BadRequestError = class BadRequestError extends Error {};
(globalThis as any).Record = class {
  id: string;
  data: Record<string, unknown> = {};
  constructor(public collection: string) { this.id = collection + "-neu"; }
  set(key: string, value: unknown) { this.data[key] = value; }
  get(key: string) { return this.data[key]; }
  // JSON-Felder liefert die echte JSVM als Text — so liest printlib sie auch
  getString(key: string) {
    const v = this.data[key];
    if (v == null) return "";
    return typeof v === "string" ? v : JSON.stringify(v);
  }
};

const pl = require("../pb_hooks/lib/printlib.js");
const co = require("../pb_hooks/lib/checkoutlib.js");

type Felder = Record<string, any>;

const satz = (id: string, felder: Felder) => ({
  id,
  felder,
  getString: (k: string) => (felder[k] == null ? "" : typeof felder[k] === "string" ? felder[k] : JSON.stringify(felder[k])),
  getInt: (k: string) => parseInt(String(felder[k] ?? 0), 10) || 0,
  getFloat: (k: string) => parseFloat(String(felder[k] ?? 0)) || 0,
  getBool: (k: string) => Boolean(felder[k]),
  getStringSlice: (k: string) => (felder[k] as string[]) ?? [],
  set: (k: string, v: unknown) => { felder[k] = v; },
});

const PREISE: Record<string, Felder> = {
  "preis-digital": { amount: 15, isDownloadable: true, labSku: "" },
  "preis-abzug": { amount: 5, isDownloadable: false, labSku: "GLOBAL-PHO-5X7" },
  "preis-handabzug": { amount: 5, isDownloadable: false, labSku: "" },
};

const BILDER: Record<string, Felder> = {
  vorschau1: { type: "preview", shootingId: "s1", name: "a.jpg" },
  original1: { type: "original", shootingId: "s1", name: "a.jpg" },
  vorschau2: { type: "preview", shootingId: "s1", name: "weg.jpg" },
};

const EINSTELLUNGEN: Felder = {
  shippingFlat: 4.9, freeShippingFrom: 0, printDefaultRoute: "customer",
};

function app(settings: Felder | null = EINSTELLUNGEN) {
  const gespeichert: any[] = [];
  return {
    gespeichert,
    findRecordById(collection: string, id: string) {
      if (collection === "settings" && settings) return satz(id, settings);
      if (collection === "prices" && PREISE[id]) return satz(id, PREISE[id]);
      if (collection === "images" && BILDER[id]) return satz(id, BILDER[id]);
      if (collection === "users") return satz(id, { downloadableImages: [] });
      if (collection === "shootings") return satz(id, { packageId: "" });
      throw new Error("nicht gefunden: " + collection + "/" + id);
    },
    findFirstRecordByFilter(_c: string, _f: string, p: { s: string; n: string }) {
      const hit = Object.entries(BILDER).find(
        ([, f]) => f.type === "original" && f.shootingId === p.s && f.name === p.n,
      );
      if (!hit) throw new Error("kein Original");
      return satz(hit[0], hit[1]);
    },
    findCollectionByNameOrId: (name: string) => name,
    save: (rec: unknown) => { gespeichert.push(rec); },
    logger: () => ({ error: () => {}, warn: () => {} }),
  };
}

const bild = (id: string) => `https://galerie.example/api/files/images/${id}/a_thumb.jpg`;
const liste = (eintraege: Array<[string, string, number]>) =>
  eintraege.map(([image, preisId, quantity]) => ({ image: bild(image), price: [{ id: preisId, quantity }] }));

describe("Versand", () => {
  it("rechnet die Pauschale nur mit Laborprodukt", () => {
    expect(pl.shippingFor(10, true, 4.9, 0)).toBe(4.9);
    expect(pl.shippingFor(10, false, 4.9, 0)).toBe(0);
  });

  it("entfällt genau auf der Grenze", () => {
    expect(pl.shippingFor(49.99, true, 4.9, 50)).toBe(4.9);
    expect(pl.shippingFor(50, true, 4.9, 50)).toBe(0);
  });

  it("ist ohne Pauschale null", () => {
    expect(pl.shippingFor(10, true, 0, 0)).toBe(0);
  });

  it("schlägt den Versand auf den Abzug auf", () => {
    const l = liste([["vorschau1", "preis-abzug", 2]]);
    expect(co.authoritativeTotal(app(), "s1", l)).toBe(14.9);
  });

  it("nimmt für Abzüge ohne Laborprodukt keinen Versand", () => {
    const l = liste([["vorschau1", "preis-handabzug", 2]]);
    expect(co.authoritativeTotal(app(), "s1", l)).toBe(10);
  });

  it("nimmt für rein digitale Bestellungen keinen Versand", () => {
    const l = liste([["vorschau1", "preis-digital", 1]]);
    expect(co.authoritativeTotal(app(), "s1", l)).toBe(15);
  });

  it("zählt den ganzen Warenwert gegen die Grenze", () => {
    const l = liste([["vorschau1", "preis-abzug", 1], ["vorschau2", "preis-digital", 1]]);
    expect(co.authoritativeTotal(app({ ...EINSTELLUNGEN, freeShippingFrom: 20 }), "s1", l)).toBe(20);
  });

  it("rechnet ohne Einstellungen keinen Versand", () => {
    const l = liste([["vorschau1", "preis-abzug", 2]]);
    expect(co.authoritativeTotal(app(null), "s1", l)).toBe(10);
  });
});
