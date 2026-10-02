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
  // Shooting einer anderen Kundin — Vorschauen sind für jeden lesbar
  fremd1: { type: "preview", shootingId: "s2", name: "b.jpg" },
  fremdoriginal1: { type: "original", shootingId: "s2", name: "b.jpg" },
  frei1: { type: "preview", shootingId: "s3", name: "c.jpg", isPublic: true },
  freioriginal1: { type: "original", shootingId: "s3", name: "c.jpg", isPublic: true },
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
      if (collection === "users") return satz(id, { downloadableImages: [], shootingIds: id === "kunde1" ? ["s1"] : [] });
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

describe("tokenToReuse", () => {
  const day = 86400000;
  it("reuses a valid token", () => expect(pl.tokenToReuse("abc", 5 * day, 0)).toBe("abc"));
  it("replaces a missing token", () => expect(pl.tokenToReuse("", 5 * day, 0)).toBe(""));
  it("replaces one expiring within a day", () => expect(pl.tokenToReuse("abc", day, 0)).toBe(""));
});

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
    expect(co.authoritativeTotal(app(), "s1", l, "kunde1")).toBe(14.9);
  });

  it("nimmt für Abzüge ohne Laborprodukt keinen Versand", () => {
    const l = liste([["vorschau1", "preis-handabzug", 2]]);
    expect(co.authoritativeTotal(app(), "s1", l, "kunde1")).toBe(10);
  });

  it("nimmt für rein digitale Bestellungen keinen Versand", () => {
    const l = liste([["vorschau1", "preis-digital", 1]]);
    expect(co.authoritativeTotal(app(), "s1", l, "kunde1")).toBe(15);
  });

  it("zählt den ganzen Warenwert gegen die Grenze", () => {
    const l = liste([["vorschau1", "preis-abzug", 1], ["vorschau2", "preis-digital", 1]]);
    expect(co.authoritativeTotal(app({ ...EINSTELLUNGEN, freeShippingFrom: 20 }), "s1", l, "kunde1")).toBe(20);
  });

  it("rechnet ohne Einstellungen keinen Versand", () => {
    const l = liste([["vorschau1", "preis-abzug", 2]]);
    expect(co.authoritativeTotal(app(null), "s1", l, "kunde1")).toBe(10);
  });
});

describe("Bilder in der Bestellung", () => {
  const fehler = "Unbekanntes Bild in der Bestellung.";

  it("lehnt einen Abzug aus einem fremden Shooting ab", () => {
    const l = liste([["fremd1", "preis-abzug", 1]]);
    expect(() => co.authoritativeTotal(app(), "s1", l, "kunde1")).toThrow(fehler);
  });

  it("lehnt auch ein digitales Bild aus einem fremden Shooting ab", () => {
    const l = liste([["vorschau1", "preis-digital", 1], ["fremd1", "preis-digital", 1]]);
    expect(() => co.authoritativeTotal(app(), "s1", l, "kunde1")).toThrow(fehler);
  });

  it("lehnt ein Shooting ab, das der Kundin nicht zugeordnet ist", () => {
    const l = liste([["fremd1", "preis-abzug", 1]]);
    expect(() => co.authoritativeTotal(app(), "s2", l, "kunde1")).toThrow(fehler);
  });

  it("lehnt Einträge ohne Bild-URL ab", () => {
    const l = [{ image: "irgendwas", price: [{ id: "preis-abzug", quantity: 1 }] }];
    expect(() => co.authoritativeTotal(app(), "s1", l, "kunde1")).toThrow(fehler);
  });

  it("lässt Bilder eines öffentlichen Shootings zu", () => {
    const l = liste([["frei1", "preis-abzug", 1]]);
    expect(co.authoritativeTotal(app(), "s3", l, "kunde1")).toBe(9.9);
  });

  it("legt für ein fremdes Bild kein Original in den Druckauftrag", () => {
    const a = app();
    co.finalizeOrder(a, {
      userId: "kunde1", shootingId: "s1",
      imagePriceObjectList: liste([["fremd1", "preis-abzug", 1]]), userData: KUNDIN,
    });
    expect(druckauftrag(a).data.items[0].originalId).toBe("");
  });
});

const KUNDIN = {
  firstName: "Ada", lastName: "Muster", email: "ada@example.org", phone: "0170",
  street: "Hauptstr. 1", zip: "10115", city: "Berlin", state: "",
};

const druckauftrag = (a: ReturnType<typeof app>) =>
  a.gespeichert.find((r: any) => r.collection === "printJobs");

describe("Druckauftrag nach der Zahlung", () => {
  it("entsteht für Positionen mit Laborprodukt", () => {
    const a = app();
    co.finalizeOrder(a, {
      userId: "kunde1", shootingId: "s1",
      imagePriceObjectList: liste([["vorschau1", "preis-abzug", 2], ["vorschau1", "preis-digital", 1]]),
      userData: KUNDIN,
    });
    const job = druckauftrag(a);
    expect(job.data.orderId).toBe("orders-neu");
    expect(job.data.status).toBe("awaiting_approval");
    expect(job.data.route).toBe("customer");
    expect(job.data.items).toEqual([
      { image: bild("vorschau1"), sku: "GLOBAL-PHO-5X7", copies: 2, originalId: "original1", shootingId: "s1", name: "a.jpg" },
    ]);
    expect(job.data.recipient).toEqual({
      name: "Ada Muster", email: "ada@example.org", phone: "0170",
      line1: "Hauptstr. 1", postalCode: "10115", city: "Berlin", state: "", countryCode: "DE",
    });
    expect(job.data.error).toBe("");
  });

  it("übernimmt den Lieferweg aus den Einstellungen", () => {
    const a = app({ ...EINSTELLUNGEN, printDefaultRoute: "studio" });
    co.finalizeOrder(a, {
      userId: "kunde1", shootingId: "s1",
      imagePriceObjectList: liste([["vorschau1", "preis-abzug", 1]]), userData: KUNDIN,
    });
    expect(druckauftrag(a).data.route).toBe("studio");
  });

  it("entsteht nicht für Bestellungen ohne Laborprodukt", () => {
    const a = app();
    co.finalizeOrder(a, {
      userId: "kunde1", shootingId: "s1",
      imagePriceObjectList: liste([["vorschau1", "preis-handabzug", 1]]), userData: KUNDIN,
    });
    expect(druckauftrag(a)).toBeUndefined();
  });

  it("vermerkt ein fehlendes Original, statt die Bestellung zu kippen", () => {
    const a = app();
    const orderId = co.finalizeOrder(a, {
      userId: "kunde1", shootingId: "s1",
      imagePriceObjectList: liste([["vorschau2", "preis-abzug", 1]]), userData: KUNDIN,
    });
    expect(orderId).toBe("orders-neu");
    const job = druckauftrag(a);
    expect(job.data.items[0].originalId).toBe("");
    expect(job.data.error).toContain("Original");
  });

  it("speichert den Versand an der Bestellung", () => {
    const a = app();
    co.finalizeOrder(a, {
      userId: "kunde1", shootingId: "s1",
      imagePriceObjectList: liste([["vorschau1", "preis-abzug", 2]]), userData: KUNDIN,
    });
    expect(a.gespeichert.find((r: any) => r.collection === "orders").data.shipping).toBe(4.9);
  });

  it("speichert ohne Laborprodukt keinen Versand", () => {
    const a = app();
    co.finalizeOrder(a, {
      userId: "kunde1", shootingId: "s1",
      imagePriceObjectList: liste([["vorschau1", "preis-digital", 1]]), userData: KUNDIN,
    });
    expect(a.gespeichert.find((r: any) => r.collection === "orders").data.shipping).toBe(0);
  });

  it("findet das Original nach dem Ersetzen über Shooting und Namen wieder", () => {
    const a = app();
    BILDER.ersetzt1 = { type: "original", shootingId: "s9", name: "neu.jpg" };
    try {
      expect(pl.currentOriginalId(a, { originalId: "alt", shootingId: "s9", name: "neu.jpg" })).toBe("ersetzt1");
      expect(pl.currentOriginalId(a, { originalId: "alt", shootingId: "s9", name: "fehlt.jpg" })).toBe("");
      // Aufträge von vor dieser Änderung tragen nur die ID
      expect(pl.currentOriginalId(a, { originalId: "alt" })).toBe("alt");
    } finally {
      delete BILDER.ersetzt1;
    }
  });

  it("übernimmt ein gewähltes Land in Großbuchstaben", () => {
    expect(pl.recipientFromUserData({ ...KUNDIN, country: "at" }).countryCode).toBe("AT");
  });
});

const VIEW = {
  id: "job1", orderId: "order1", route: "customer", status: "awaiting_approval",
  recipient: {
    name: "Ada Muster", email: "ada@example.org", phone: "", line1: "Hauptstr. 1",
    postalCode: "10115", city: "Berlin", state: "", countryCode: "DE",
  },
  items: [{ image: "x", sku: "GLOBAL-PHO-5X7", copies: 2, originalId: "original1" }],
};

describe("Prodigi-Auftrag", () => {
  it("bildet Empfänger, Positionen und Rückruf ab", () => {
    const body = pl.prodigiOrderBody(VIEW, VIEW.recipient, "https://galerie.example", "tok");
    expect(body).toEqual({
      merchantReference: "order1",
      idempotencyKey: "job1",
      callbackUrl: "https://galerie.example/api/custom/prodigi/callback",
      shippingMethod: "Standard",
      recipient: {
        name: "Ada Muster",
        email: "ada@example.org",
        address: { line1: "Hauptstr. 1", postalOrZipCode: "10115", townOrCity: "Berlin", countryCode: "DE" },
      },
      items: [{
        merchantReference: "original1",
        sku: "GLOBAL-PHO-5X7",
        copies: 2,
        sizing: "fillPrintArea",
        attributes: { finish: "lustre" },
        assets: [{ printArea: "default", url: "https://galerie.example/api/custom/printfile/job1/0?t=tok" }],
      }],
    });
  });

  it("setzt die Attribute, ohne die Prodigi ablehnt", () => {
    expect(pl.labAttributes("GLOBAL-PHO-4X6")).toEqual({ finish: "lustre" });
    expect(pl.labAttributes("GLOBAL-CAN-16X24")).toEqual({ wrap: "MirrorWrap" });
    expect(pl.labAttributes("GLOBAL-FAP-20X30")).toEqual({});
  });

  it("schickt beim Weg 'an mich' an die Studioadresse", () => {
    const studio = { name: "Studio Licht", line1: "Atelierweg 2", zip: "20095", city: "Hamburg", country: "de" };
    const r = pl.recipientFor({ ...VIEW, route: "studio" }, studio);
    expect(r).toEqual({
      name: "Studio Licht", email: "", phone: "", line1: "Atelierweg 2",
      postalCode: "20095", city: "Hamburg", state: "", countryCode: "DE",
    });
  });

  it("erkennt eine unvollständige Adresse", () => {
    expect(pl.addressComplete(VIEW.recipient)).toBe(true);
    expect(pl.addressComplete({ ...VIEW.recipient, city: "" })).toBe(false);
  });
});

describe("Status von Prodigi", () => {
  const auftrag = (o: Felder) => ({ id: "ord_1", status: { stage: "InProgress", issues: [], details: {} }, charges: [], shipments: [], ...o });

  it("bleibt 'beim Labor', solange nichts produziert wird", () => {
    expect(pl.applyLabOrder("awaiting_approval", auftrag({})).status).toBe("submitted");
  });

  it("meldet die Produktion", () => {
    const o = auftrag({ status: { stage: "InProgress", issues: [], details: { inProduction: "InProgress" } } });
    expect(pl.applyLabOrder("submitted", o).status).toBe("in_production");
  });

  it("übernimmt Sendung und Kosten", () => {
    const o = auftrag({
      shipments: [{ status: "Shipped", tracking: { url: "https://track.example/1", number: "TR1" } }],
      charges: [
        { totalCost: { amount: "3.10", currency: "EUR" } },
        { totalCost: { amount: "4.20", currency: "EUR" } },
      ],
    });
    expect(pl.applyLabOrder("in_production", o)).toEqual({
      labOrderId: "ord_1", status: "shipped", trackingUrl: "https://track.example/1",
      trackingNumber: "TR1", labCost: "7.30 EUR", error: "",
    });
  });

  it("meldet eine Stornierung", () => {
    const o = auftrag({ status: { stage: "Cancelled", issues: [], details: {} } });
    expect(pl.applyLabOrder("submitted", o).status).toBe("cancelled");
  });

  it("macht aus issues mit authorisationUrl einen Fehler mit Link", () => {
    const o = auftrag({ status: { stage: "InProgress", details: {}, issues: [{
      errorCode: "order.ChargesNotAuthorized", description: "Zahlung nicht freigegeben",
      authorisationDetails: { authorisationUrl: "https://dashboard.prodigi.com/pay/1" },
    }] } });
    const f = pl.applyLabOrder("submitted", o);
    expect(f.status).toBe("failed");
    expect(f.error).toContain("Zahlung nicht freigegeben");
    expect(f.error).toContain("https://dashboard.prodigi.com/pay/1");
  });

  it("setzt einen weiterversandten Auftrag nicht zurück", () => {
    const o = auftrag({ shipments: [{ status: "Shipped", tracking: { url: "u", number: "n" } }] });
    expect(pl.applyLabOrder("delivered_to_customer", o).status).toBe("delivered_to_customer");
  });

  it("behält beim weiterversandten Auftrag die Sendung des Studios", () => {
    const o = auftrag({ shipments: [{ status: "Shipped", tracking: { url: "u", number: "n" } }] });
    const f = pl.applyLabOrder("delivered_to_customer", o);
    expect(f).not.toHaveProperty("trackingNumber");
    expect(f).not.toHaveProperty("trackingUrl");
  });
});

describe("Weiterversand durch das Studio", () => {
  it("leert die Laborsendung, wenn keine eigene angegeben ist", () => {
    expect(pl.deliveredFields("", "")).toEqual({ status: "delivered_to_customer", trackingNumber: "", trackingUrl: "" });
  });

  it("nimmt nur http(s)-Links an", () => {
    expect(pl.deliveredFields("DHL1", "javascript:alert(1)").trackingUrl).toBe("");
    expect(pl.deliveredFields("DHL1", "https://dhl.example/DHL1").trackingUrl).toBe("https://dhl.example/DHL1");
  });
});

describe("Zugang zur Druckdatei", () => {
  const gleich = (a: string, b: string) => a === b;
  it("lässt das richtige, gültige Token durch", () => {
    expect(pl.fileAccessOk("abc", "abc", 2000, 1000, gleich)).toBe(true);
  });
  it("lehnt falsches, abgelaufenes oder fehlendes Token ab", () => {
    expect(pl.fileAccessOk("xyz", "abc", 2000, 1000, gleich)).toBe(false);
    expect(pl.fileAccessOk("abc", "abc", 1000, 2000, gleich)).toBe(false);
    expect(pl.fileAccessOk("", "", 2000, 1000, gleich)).toBe(false);
  });
});
