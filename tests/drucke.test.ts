import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Hook-Helfer direkt einbinden, JSVM-Records als Attrappen (Muster
// tests/druckauftraege.test.ts).
const require = createRequire(import.meta.url);
const dl = require("../pb_hooks/lib/druckelib.js");

type Felder = Record<string, any>;

const satz = (id: string, felder: Felder) => ({
  id,
  felder,
  getString: (k: string) => (felder[k] == null ? "" : typeof felder[k] === "string" ? felder[k] : JSON.stringify(felder[k])),
  getBool: (k: string) => Boolean(felder[k]),
  getInt: (k: string) => parseInt(String(felder[k] ?? 0), 10) || 0,
});

const PREISE: Record<string, Felder> = {
  "p-digital": { title: "Digitales Bild", isDownloadable: true, labSku: "" },
  "p-labor": { title: "Abzug 10×15 cm", isDownloadable: false, labSku: "GLOBAL-PHO-4X6" },
  "p-hand": { title: "Leinwand 40×60", isDownloadable: false, labSku: "" },
};

type Welt = {
  orders?: Felder[];
  printJobs?: Felder[];
  finishedOrders?: Felder[];
};

function app(w: Welt = {}) {
  const tabellen: Record<string, Felder[]> = {
    orders: w.orders ?? [],
    printJobs: w.printJobs ?? [],
    finishedOrders: w.finishedOrders ?? [],
  };
  return {
    findRecordById(c: string, id: string) {
      if (c === "prices" && PREISE[id]) return satz(id, PREISE[id]);
      const hit = (tabellen[c] ?? []).find((r) => r.id === id);
      if (hit) return satz(hit.id, hit);
      throw new Error("nicht gefunden: " + c + "/" + id);
    },
    findFirstRecordByFilter(c: string, _f: string, p: { o: string }) {
      const hit = (tabellen[c] ?? []).find((r) => r.orderId === p.o);
      if (!hit) throw new Error("nicht gefunden");
      return satz(hit.id, hit);
    },
    findRecordsByFilter(c: string, _f: string, _s: string, _l: number, _o: number, p: { u?: string; o?: string; id?: string }) {
      if (p.o !== undefined) return (tabellen[c] ?? []).filter((r) => r.orderId === p.o && r.id !== p.id).map((r) => satz(r.id, r));
      return (tabellen[c] ?? []).filter((r) => r.userId === p.u).map((r) => satz(r.id, r));
    },
  };
}

const bild = (id: string) => `https://galerie.example/api/files/images/${id}/a_thumb.jpg`;
const pos = (image: string, priceId: string, quantity = 1) => ({ image: bild(image), price: [{ id: priceId, quantity, title: "vom Client" }] });

describe("Kundenstatus Labor", () => {
  const job = (o: Felder) => ({ status: "submitted", route: "customer", trackingUrl: "", trackingNumber: "", ...o });

  it.each(["awaiting_approval", "submitted", "failed"])("%s ist in Bearbeitung", (status) => {
    expect(dl.customerStatus(job({ status }))).toEqual({ status: "processing", trackingUrl: "", trackingNumber: "" });
  });

  it("in_production wird gedruckt", () => {
    expect(dl.customerStatus(job({ status: "in_production" })).status).toBe("printing");
  });

  it("shipped an Kund:in ist versendet mit Sendung", () => {
    expect(dl.customerStatus(job({ status: "shipped", trackingUrl: "https://t.example/1", trackingNumber: "TR1" })))
      .toEqual({ status: "shipped", trackingUrl: "https://t.example/1", trackingNumber: "TR1" });
  });

  it("studio + shipped bleibt in Bearbeitung, ohne Sendung", () => {
    expect(dl.customerStatus(job({ route: "studio", status: "shipped", trackingUrl: "https://t.example/1", trackingNumber: "TR1" })))
      .toEqual({ status: "processing", trackingUrl: "", trackingNumber: "" });
  });

  it("delivered_to_customer ist versendet mit eigener Sendung", () => {
    expect(dl.customerStatus(job({ route: "studio", status: "delivered_to_customer", trackingNumber: "DHL1" })))
      .toEqual({ status: "shipped", trackingUrl: "", trackingNumber: "DHL1" });
  });

  it("cancelled ist storniert", () => {
    expect(dl.customerStatus(job({ status: "cancelled" })).status).toBe("cancelled");
  });

  it("übernimmt nur http(s)-Links", () => {
    expect(dl.customerStatus(job({ status: "shipped", trackingUrl: "javascript:alert(1)" })).trackingUrl).toBe("");
  });
});

describe("Kundenstatus Handdruck", () => {
  it("ohne Archiv in Bearbeitung", () => {
    expect(dl.manualStatus(null)).toEqual({ status: "processing", trackingUrl: "", trackingNumber: "" });
  });

  it("mit Archiv versendet, Sendung falls angegeben", () => {
    expect(dl.manualStatus({ trackingNumber: "DHL1", trackingUrl: "https://dhl.example/1" }))
      .toEqual({ status: "shipped", trackingUrl: "https://dhl.example/1", trackingNumber: "DHL1" });
    expect(dl.manualStatus({ trackingNumber: "", trackingUrl: "" }))
      .toEqual({ status: "shipped", trackingUrl: "", trackingNumber: "" });
  });
});

describe("Positionen", () => {
  it("nimmt nur physische Preise, Titel aus der Sammlung", () => {
    const items = dl.physicalItems(app(), [pos("a", "p-digital"), pos("a", "p-labor", 2), pos("b", "p-hand")]);
    expect(items).toEqual([
      { image: bild("a"), title: "Abzug 10×15 cm", quantity: 2, lab: true },
      { image: bild("b"), title: "Leinwand 40×60", quantity: 1, lab: false },
    ]);
  });

  it("überspringt unbekannte Preise", () => {
    expect(dl.physicalItems(app(), [pos("a", "gibts-nicht")])).toEqual([]);
  });
});

describe("Gruppen", () => {
  const LAB = { image: "x", title: "Abzug", quantity: 1, lab: true };
  const HAND = { image: "y", title: "Leinwand", quantity: 1, lab: false };
  const JOB = { status: "in_production", route: "customer", trackingUrl: "", trackingNumber: "" };

  it("gemischt ergibt zwei Gruppen mit eigenem Status", () => {
    const g = dl.groupsForOrder([LAB, HAND], JOB, null);
    expect(g).toEqual([
      { kind: "lab", status: "printing", trackingUrl: "", trackingNumber: "", items: [{ image: "x", title: "Abzug", quantity: 1 }] },
      { kind: "manual", status: "processing", trackingUrl: "", trackingNumber: "", items: [{ image: "y", title: "Leinwand", quantity: 1 }] },
    ]);
  });

  it("Laborpreis ohne Druckauftrag landet bei Hand", () => {
    const g = dl.groupsForOrder([LAB], null, null);
    expect(g).toHaveLength(1);
    expect(g[0].kind).toBe("manual");
  });

  it("lässt leere Gruppen weg", () => {
    expect(dl.groupsForOrder([HAND], JOB, null).map((x: { kind: string }) => x.kind)).toEqual(["manual"]);
    expect(dl.groupsForOrder([], JOB, null)).toEqual([]);
  });
});

describe("Antwort für die Kundin", () => {
  const ORDER = (o: Felder) => ({
    id: "o1", userId: "kundin", created: "2026-10-01 10:00:00.000Z",
    imagePriceObjectList: [pos("a", "p-labor"), pos("b", "p-hand")], ...o,
  });
  const JOB = {
    id: "j1", orderId: "o1", status: "shipped", route: "customer",
    trackingUrl: "https://t.example/1", trackingNumber: "TR1",
    labCost: "3.10 EUR", error: "geheim", labOrderId: "ord_1", recipient: { line1: "Hauptstr. 1" },
  };

  it("zeigt nur eigene Bestellungen", () => {
    const a = app({ orders: [ORDER({}), ORDER({ id: "o2", userId: "andere" })] });
    expect(dl.ordersView(a, "kundin").orders.map((o: { id: string }) => o.id)).toEqual(["o1"]);
  });

  it("lässt rein digitale Bestellungen weg", () => {
    const a = app({ orders: [ORDER({ imagePriceObjectList: [pos("a", "p-digital")] })] });
    expect(dl.ordersView(a, "kundin").orders).toEqual([]);
  });

  it("enthält keine internen Felder", () => {
    const a = app({ orders: [ORDER({})], printJobs: [JOB] });
    const text = JSON.stringify(dl.ordersView(a, "kundin"));
    for (const verboten of ["labCost", "3.10", "geheim", "ord_1", "route", "Hauptstr", "recipient", "error"]) {
      expect(text).not.toContain(verboten);
    }
    const o = dl.ordersView(a, "kundin").orders[0];
    expect(Object.keys(o).sort()).toEqual(["created", "groups", "id"]);
    expect(Object.keys(o.groups[0]).sort()).toEqual(["items", "kind", "status", "trackingNumber", "trackingUrl"]);
  });

  it("findet das Archiv per orderId", () => {
    const a = app({ orders: [ORDER({})], finishedOrders: [{ id: "f1", orderId: "o1", trackingNumber: "DHL1", trackingUrl: "" }] });
    const hand = dl.ordersView(a, "kundin").orders[0].groups.find((g: { kind: string }) => g.kind === "manual");
    expect(hand.status).toBe("shipped");
    expect(hand.trackingNumber).toBe("DHL1");
  });

  it("findet Archiv per id statt orderId (Altbestand)", () => {
    const a = app({ orders: [ORDER({})], finishedOrders: [{ id: "o1", orderId: "", trackingNumber: "", trackingUrl: "" }] });
    const hand = dl.ordersView(a, "kundin").orders[0].groups.find((g: { kind: string }) => g.kind === "manual");
    expect(hand.status).toBe("shipped");
  });
});

describe("Versand-Mail beim Abschicken", () => {
  const order = (list: unknown[]) => satz("o1", { imagePriceObjectList: list });

  it("geht bei Handdrucken raus", () => {
    expect(dl.needsManualShipmentMail(app(), order([pos("a", "p-hand")]))).toBe(true);
  });

  it("nicht bei reiner Laborbestellung mit Druckauftrag", () => {
    const a = app({ printJobs: [{ id: "j1", orderId: "o1", status: "submitted", route: "customer" }] });
    expect(dl.needsManualShipmentMail(a, order([pos("a", "p-labor")]))).toBe(false);
  });

  it("nicht bei rein digitalen Bestellungen", () => {
    expect(dl.needsManualShipmentMail(app(), order([pos("a", "p-digital")]))).toBe(false);
  });

  describe("Entscheidung im Hook", () => {
    const fin = (id: string, orderId: string) => satz(id, { orderId });
    const alt = [{ id: "f1", orderId: "o1" }, { id: "f2", orderId: "o1" }];

    it("erste Fertigstellung: Mail, nicht partiell", () => {
      const a = app({ finishedOrders: [alt[0]] });
      expect(dl.shipmentMailDecision(a, order([pos("a", "p-hand")]), fin("f1", "o1"))).toEqual({ partial: false });
    });

    it("zweite Fertigstellung derselben Bestellung: keine Mail", () => {
      const a = app({ finishedOrders: alt });
      expect(dl.shipmentMailDecision(a, order([pos("a", "p-hand")]), fin("f2", "o1"))).toBeNull();
    });

    it("leere orderId (Altbestand) wird nicht als Duplikat gewertet", () => {
      const a = app({ finishedOrders: [{ id: "f1", orderId: "" }, { id: "f2", orderId: "" }] });
      expect(dl.shipmentMailDecision(a, order([pos("a", "p-hand")]), fin("f2", ""))).toEqual({ partial: false });
    });

    it("gemischte Bestellung: Mail mit partial", () => {
      const a = app({ printJobs: [{ id: "j1", orderId: "o1", status: "submitted", route: "customer" }], finishedOrders: [alt[0]] });
      expect(dl.shipmentMailDecision(a, order([pos("a", "p-hand"), pos("b", "p-labor")]), fin("f1", "o1"))).toEqual({ partial: true });
    });

    it("keine Handdrucke: keine Mail", () => {
      expect(dl.shipmentMailDecision(app(), order([pos("a", "p-digital")]), fin("f1", "o1"))).toBeNull();
    });
  });
});
