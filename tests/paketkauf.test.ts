import { beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Wie tests/verkaufsbereitschaft.test.ts: der Hook-Helfer ist CommonJS und
// wird direkt eingebunden, damit Test und Server denselben Code benutzen.
const require = createRequire(import.meta.url);

// Die JSVM stellt diese Globals bereit; im Test genuegen Attrappen.
(globalThis as any).BadRequestError = class BadRequestError extends Error {};
(globalThis as any).Record = class {
  id = "neue-bestellung";
  data: Record<string, unknown> = {};
  constructor(public collection: unknown) {}
  set(key: string, value: unknown) { this.data[key] = value; }
  get(key: string) { return this.data[key]; }
};

const co = require("../pb_hooks/lib/checkoutlib.js");

type Felder = Record<string, any>;

const satz = (id: string, felder: Felder) => ({
  id,
  felder,
  getString: (k: string) => String(felder[k] ?? ""),
  getInt: (k: string) => parseInt(String(felder[k] ?? 0), 10) || 0,
  getFloat: (k: string) => parseFloat(String(felder[k] ?? 0)) || 0,
  getBool: (k: string) => Boolean(felder[k]),
  getStringSlice: (k: string) => (felder[k] as string[]) ?? [],
  set: (k: string, v: unknown) => { felder[k] = v; },
});

const DIGITAL = { amount: 15, isDownloadable: true, title: "Digitales Bild" };
const ABZUG = { amount: 5, isDownloadable: false, title: "Abzug 13x18" };

// 25 Bilder fuer 199 EUR, jedes weitere fuer 6 EUR.
const PAKET = { numberOfImages: 25, totalPrice: "199", singlePrice: "6" };

let kunde: ReturnType<typeof satz>;
let gespeichert: unknown[];

function app(shootingFelder: Felder) {
  kunde = satz("kunde1", { downloadableImages: [], shootingIds: ["shooting1"] });
  gespeichert = [];
  return {
    findRecordById(collection: string, id: string) {
      if (collection === "shootings") return satz(id, shootingFelder);
      if (collection === "packages") return satz(id, PAKET);
      if (collection === "prices" && id === "preis-digital") return satz(id, DIGITAL);
      if (collection === "prices" && id === "preis-abzug") return satz(id, ABZUG);
      if (collection === "users") return kunde;
      if (collection === "images") return satz(id, { type: "preview", shootingId: "shooting1" });
      throw new Error("nicht gefunden: " + collection + "/" + id);
    },
    findCollectionByNameOrId: (name: string) => name,
    save: (rec: unknown) => { gespeichert.push(rec); },
    logger: () => ({ error: () => {} }),
  };
}

// Die Bestellung trägt die Datei-URL der Vorschau (vgl. printlib.imageIdOf).
const url = (id: string) => `https://galerie.example/api/files/images/${id}/x.jpg`;

// Die Paketauswahl kommt ohne Einzelpreise an — genau so baut sie
// src/pages/user/PricingPage.tsx zusammen.
const paketListe = (anzahl: number) =>
  Array.from({ length: anzahl }, (_, i) => ({ image: url("bild-" + i), price: [] }));

const einzelListe = (bilder: Array<[string, string]>) =>
  bilder.map(([image, preisId]) => ({
    image: url(image),
    price: [{ id: preisId, quantity: 1 }],
  }));

describe("Paketkauf", () => {
  const MIT_PAKET = { packageId: "paket1" };

  beforeEach(() => { gespeichert = []; });

  it("schaltet alle gekauften Bilder frei", () => {
    const a = app(MIT_PAKET);
    co.finalizeOrder(a, {
      userId: "kunde1",
      shootingId: "shooting1",
      imagePriceObjectList: paketListe(35),
    });
    expect(kunde.felder.downloadableImages).toHaveLength(35);
  });

  it("berechnet den Aufschlag fuer Bilder ueber dem Paketumfang", () => {
    const a = app(MIT_PAKET);
    // 199 EUR Paketpreis + 10 zusaetzliche Bilder à 6 EUR
    expect(co.authoritativeTotal(a, "shooting1", paketListe(35), "kunde1")).toBe(259);
  });

  it("bleibt beim Paketpreis, solange der Umfang reicht", () => {
    const a = app(MIT_PAKET);
    expect(co.authoritativeTotal(a, "shooting1", paketListe(10), "kunde1")).toBe(199);
  });

  it("nimmt ohne Paket am Shooting keinen Paketpreis an", () => {
    const a = app({ packageId: "" });
    expect(co.authoritativeTotal(a, "shooting1", paketListe(35), "kunde1")).toBe(0);
  });
});

describe("Einzelbildkauf", () => {
  const OHNE_PAKET = { packageId: "" };

  it("rechnet die Einzelpreise zusammen", () => {
    const a = app(OHNE_PAKET);
    const liste = einzelListe([["bild-1", "preis-digital"], ["bild-2", "preis-abzug"]]);
    expect(co.authoritativeTotal(a, "shooting1", liste, "kunde1")).toBe(20);
  });

  it("schaltet nur herunterladbare Positionen frei", () => {
    const a = app(OHNE_PAKET);
    const liste = einzelListe([["bild-1", "preis-digital"], ["bild-2", "preis-abzug"]]);
    co.finalizeOrder(a, {
      userId: "kunde1",
      shootingId: "shooting1",
      imagePriceObjectList: liste,
    });
    expect(kunde.felder.downloadableImages).toEqual([url("bild-1")]);
  });

  it("schaltet bei Einzelpreisen ohne Download nichts frei, auch mit Paket am Shooting", () => {
    const a = app({ packageId: "paket1" });
    const liste = einzelListe([["bild-1", "preis-abzug"]]);
    co.finalizeOrder(a, {
      userId: "kunde1",
      shootingId: "shooting1",
      imagePriceObjectList: liste,
    });
    expect(kunde.felder.downloadableImages).toEqual([]);
  });
});
