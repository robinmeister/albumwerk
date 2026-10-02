# Kundenseite „Drucke“ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kund:innen sehen unter `/prints` ihre bestellten Drucke mit Status und Sendungsverfolgung; „Abschicken“ für Handdrucke nimmt eine Sendungsnummer auf und benachrichtigt die Kundin.

**Architecture:** Reine Logik in `pb_hooks/lib/druckelib.js` (Kundenstatus, Gruppen, Antwort-Sicht), ein Lese-Endpunkt `GET /api/custom/drucke` und ein `onRecordAfterCreateSuccess`-Hook auf `finishedOrders` in `pb_hooks/drucke.pb.js`. Frontend: neue Seite `PrintsPage.tsx`, zwei Felder vor „Abschicken“ in `OrdersPage.tsx` und `OrderDetailsPage.tsx`.

**Tech Stack:** PocketBase 0.39 JSVM (CommonJS), React 18 + TypeScript, StyleX, `@astryxdesign/core`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-02-kunden-drucke-design.md` (baut auf `2026-10-01-druckauftraege-design.md` auf)

## Global Constraints

- Keine neue Abhängigkeit.
- `printJobs` bleibt nur für Admins lesbar. Die Kundin bekommt Daten nur über `GET /api/custom/drucke`.
- Die Antwort enthält **nur**: `orders[].id`, `orders[].created`, `orders[].groups[].kind|status|trackingUrl|trackingNumber|items[].image|title|quantity`. Keine Laborkosten, keine Fehlermeldung, keine Prodigi-ID, kein Lieferweg, keine Adresse.
- Physisch heißt: Preis ist nicht `isDownloadable`. Das wird aus der `prices`-Sammlung gelesen, nie aus der Client-Liste. Titel ebenso.
- `trackingUrl` wird nur übernommen, wenn sie mit `http://` oder `https://` beginnt.
- Kundenstatus-Werte: `processing`, `printing`, `shipped`, `cancelled`. Texte: „In Bearbeitung“, „Wird gedruckt“, „Versendet“, „Storniert“.
- Ein Mailfehler kippt nichts (loggen, weiter).
- Sichtbare Texte auf Deutsch, „du“, „Kund:in“/„Fotograf:in“.
- `pb_hooks/lib/*.js` laden einander mit `typeof __hooks !== "undefined" ? require(__hooks + "/lib/x.js") : require("./x.js")`.

**Abweichungen von der Spec (gleiche Wirkung):**
- `groupsForOrder(items, job, finished)` ohne den unbenutzten `order`-Parameter.
- `orders` hat bisher **kein** `created`-Feld (die Admin-Seite liest `r.created` und bekommt `undefined`). Die Migration ergänzt ein `autodate`-Feld `created` an `orders`; Altbestände bleiben ohne Datum, die Kundenseite zeigt dann keins.

## Review Focus

1. **Weg „an mich“, Labor hat an die Fotograf:in verschickt:** Die Kundin darf nicht „Versendet“ mit der Sendung Labor → Studio sehen. Test: Task 1 „studio + shipped bleibt in Bearbeitung“.
2. **Fremde Bestellungen:** Eine Kundin darf nie Bestellungen anderer sehen, auch nicht über einen manipulierten Request. Test: Task 1 `ordersView` filtert über die übergebene `userId`; Task 2 übergibt ausschließlich `e.auth.id`.
3. **Altbestand ohne `orderId` in `finishedOrders`:** Erledigte Altbestellungen müssen trotzdem „Versendet“ zeigen. Test: Task 1 „Archiv per id statt orderId“.
4. **Laborpreis, aber kein Druckauftrag** (Bestellung von vor dem Labor-Feature, oder Auftragsanlage fehlgeschlagen): Position erscheint als Handdruck, nicht gar nicht. Test: Task 1 `groupsForOrder`.
5. **„Abschicken“ einer reinen Laborbestellung:** keine Mail „Deine Drucke sind unterwegs“, sonst bekäme die Kundin sie vor dem Laborversand. Test: Task 1 `needsManualShipmentMail`.

---

## File Structure

| Datei | Aufgabe |
|---|---|
| Create `pb_hooks/lib/druckelib.js` | `customerStatus`, `manualStatus`, `physicalItems`, `groupsForOrder`, `findFinished`, `ordersView`, `needsManualShipmentMail` |
| Create `tests/drucke.test.ts` | Vitest für druckelib |
| Create `pb_migrations/1785900003_kunden_drucke.js` | `finishedOrders.trackingNumber/trackingUrl`, `orders.created` |
| Modify `pb_hooks/lib/printmaillib.js` | `notifyShipped(app, to, trackingNumber, trackingUrl)` herauslösen |
| Create `pb_hooks/drucke.pb.js` | Endpunkt + Mail-Hook |
| Create `src/pages/user/PrintsPage.tsx` | Kundenseite |
| Modify `src/App.tsx`, `src/utils/routes.ts` | Route `/prints`, Nav „Drucke“ |
| Modify `src/utils/types.ts` | `FinishedOrder.trackingNumber/trackingUrl` |
| Create `src/features/Orders/ShipmentFields.tsx` | Zwei Eingabefelder + `hasManualPrints` |
| Modify `src/pages/user/OrdersPage.tsx`, `src/pages/user/OrderDetailsPage.tsx` | Felder vor „Abschicken“, Werte mitschicken |

---

### Task 1: Logik (`druckelib.js`)

**Files:**
- Create: `pb_hooks/lib/druckelib.js`
- Test: `tests/drucke.test.ts`

**Interfaces:**
- Produces:
  - `customerStatus(job: { status, route, trackingUrl, trackingNumber }) → { status, trackingUrl, trackingNumber }`
  - `manualStatus(finished: { trackingUrl, trackingNumber } | null) → { status, trackingUrl, trackingNumber }`
  - `physicalItems(app, list) → Array<{ image, title, quantity, lab: boolean }>`
  - `groupsForOrder(items, job | null, finished | null) → Array<{ kind: "lab"|"manual", status, trackingUrl, trackingNumber, items: [{ image, title, quantity }] }>`
  - `findFinished(app, orderId) → Record | null`
  - `ordersView(app, userId) → { orders: [{ id, created, groups }] }`
  - `needsManualShipmentMail(app, order: Record) → boolean`

- [ ] **Step 1: Failing Tests schreiben**

`tests/drucke.test.ts`:

```ts
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
    findRecordsByFilter(c: string, _f: string, _s: string, _l: number, _o: number, p: { u: string }) {
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
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run tests/drucke.test.ts`
Expected: FAIL mit „Cannot find module '../pb_hooks/lib/druckelib.js'“

- [ ] **Step 3: `druckelib.js` anlegen**

```js
/// <reference path="../../pb_data/types.d.ts" />
//
// Kundenseite „Drucke“ (docs/superpowers/specs/2026-10-02-kunden-drucke-design.md).
//
// Übersetzt Druckaufträge und erledigte Bestellungen in das, was die Kundin
// sehen darf. Fasst weder $http noch $security an, damit
// tests/drucke.test.ts es unter Node einbinden kann.

function safeUrl(u) {
  var url = String(u || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function view(status, trackingUrl, trackingNumber) {
  return { status: status, trackingUrl: safeUrl(trackingUrl), trackingNumber: String(trackingNumber || "") };
}

// Beim Weg „an mich“ ist `shipped` die Sendung Labor → Studio — für die
// Kundin ist das noch nicht unterwegs, und die Nummer geht sie nichts an.
function customerStatus(job) {
  var st = job.status;
  if (st === "cancelled") return view("cancelled", "", "");
  if (st === "in_production") return view("printing", "", "");
  if (st === "delivered_to_customer" || (st === "shipped" && job.route !== "studio")) {
    return view("shipped", job.trackingUrl, job.trackingNumber);
  }
  return view("processing", "", "");
}

// „Abschicken“ heißt „versendet“: Ein Archiveintrag ist der Versand.
function manualStatus(finished) {
  if (!finished) return view("processing", "", "");
  return view("shipped", finished.trackingUrl, finished.trackingNumber);
}

// wie copiesOf in printlib.js
function quantityOf(q) {
  var n = parseInt(q, 10);
  if (!n || n < 1) return 1;
  if (n > 999) return 999;
  return n;
}

// Titel, „physisch“ und Labor kommen aus der prices-Sammlung, nie aus der
// Liste des Browsers.
function physicalItems(app, list) {
  var out = [];
  var l = list || [];
  for (var i = 0; i < l.length; i++) {
    var obj = l[i];
    if (!obj || !obj.image || !obj.price) continue;
    for (var j = 0; j < obj.price.length; j++) {
      var rec;
      try {
        rec = app.findRecordById("prices", String(obj.price[j].id));
      } catch (_) {
        continue;
      }
      if (rec.getBool("isDownloadable")) continue;
      out.push({
        image: String(obj.image),
        title: rec.getString("title"),
        quantity: quantityOf(obj.price[j].quantity),
        lab: rec.getString("labSku").trim() !== "",
      });
    }
  }
  return out;
}

// Ohne Druckauftrag (Bestellung von vor dem Labor, oder die Anlage schlug
// fehl) gilt auch eine Laborposition als Handdruck — sonst hinge sie ohne
// Status in der Luft.
function groupsForOrder(items, job, finished) {
  var lab = [];
  var manual = [];
  items.forEach(function (it) {
    var entry = { image: it.image, title: it.title, quantity: it.quantity };
    if (it.lab && job) lab.push(entry);
    else manual.push(entry);
  });
  var out = [];
  if (lab.length) {
    var s = customerStatus(job);
    out.push({ kind: "lab", status: s.status, trackingUrl: s.trackingUrl, trackingNumber: s.trackingNumber, items: lab });
  }
  if (manual.length) {
    var m = manualStatus(finished);
    out.push({ kind: "manual", status: m.status, trackingUrl: m.trackingUrl, trackingNumber: m.trackingNumber, items: manual });
  }
  return out;
}

function findByOrder(app, collection, orderId) {
  try {
    return app.findFirstRecordByFilter(collection, "orderId = {:o}", { o: orderId });
  } catch (_) {
    return null;
  }
}

// Altbestände wurden ohne orderId archiviert und tragen die id der Bestellung
// (siehe OrdersPage.loadAll).
function findFinished(app, orderId) {
  var rec = findByOrder(app, "finishedOrders", orderId);
  if (rec) return rec;
  try {
    return app.findRecordById("finishedOrders", orderId);
  } catch (_) {
    return null;
  }
}

function parseList(text) {
  try {
    var v = JSON.parse(text || "[]");
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

function jobFields(rec) {
  if (!rec) return null;
  return {
    status: rec.getString("status"),
    route: rec.getString("route"),
    trackingUrl: rec.getString("trackingUrl"),
    trackingNumber: rec.getString("trackingNumber"),
  };
}

function finishedFields(rec) {
  if (!rec) return null;
  return { trackingUrl: rec.getString("trackingUrl"), trackingNumber: rec.getString("trackingNumber") };
}

// userId kommt im Endpunkt ausschließlich aus e.auth.id.
function ordersView(app, userId) {
  var records = [];
  try {
    records = app.findRecordsByFilter("orders", "userId = {:u}", "-created", 0, 0, { u: userId });
  } catch (_) {
    records = [];
  }
  var orders = [];
  records.forEach(function (order) {
    var items = physicalItems(app, parseList(order.getString("imagePriceObjectList")));
    if (!items.length) return;
    var groups = groupsForOrder(
      items,
      jobFields(findByOrder(app, "printJobs", order.id)),
      finishedFields(findFinished(app, order.id))
    );
    orders.push({ id: order.id, created: order.getString("created"), groups: groups });
  });
  return { orders: orders };
}

// Beim Abschicken: Mail nur, wenn es Handdrucke gibt. Laborpositionen meldet
// der Labor-Webhook, sonst käme die Mail vor dem eigentlichen Versand.
function needsManualShipmentMail(app, order) {
  var items = physicalItems(app, parseList(order.getString("imagePriceObjectList")));
  var job = jobFields(findByOrder(app, "printJobs", order.id));
  return groupsForOrder(items, job, null).some(function (g) { return g.kind === "manual"; });
}

module.exports = {
  customerStatus: customerStatus,
  manualStatus: manualStatus,
  physicalItems: physicalItems,
  groupsForOrder: groupsForOrder,
  findFinished: findFinished,
  ordersView: ordersView,
  needsManualShipmentMail: needsManualShipmentMail,
};
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/drucke.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pb_hooks/lib/druckelib.js tests/drucke.test.ts
git commit -m "Kunden-Drucke: Status und Sicht für die Kundin"
```

---

### Task 2: Schema, Endpunkt, Versand-Mail

**Files:**
- Create: `pb_migrations/1785900003_kunden_drucke.js`
- Modify: `pb_hooks/lib/printmaillib.js` (`notifyCustomerShipped`, `module.exports`)
- Create: `pb_hooks/drucke.pb.js`

**Interfaces:**
- Consumes: `ordersView`, `needsManualShipmentMail` (Task 1)
- Produces: `GET /api/custom/drucke` → `{ orders: [{ id, created, groups }] }` (401 ohne Anmeldung); Felder `finishedOrders.trackingNumber`, `finishedOrders.trackingUrl`; `orders.created`; `printmaillib.notifyShipped(app, to, trackingNumber, trackingUrl)`.

- [ ] **Step 1: Migration**

```js
/// <reference path="../pb_data/types.d.ts" />
// Kundenseite „Drucke“ (docs/superpowers/specs/2026-10-02-kunden-drucke-design.md).
//
// finishedOrders nimmt beim „Abschicken“ die Sendung der Fotograf:in auf.
// orders hatte bisher keinen Zeitstempel — die Kundenseite zeigt das Datum,
// und die Admin-Seite las `created` schon immer (bisher ins Leere).
// Altbestände bleiben ohne Datum.
migrate((app) => {
  const finished = app.findCollectionByNameOrId("finishedOrders");
  finished.fields.add(new Field({
    name: "trackingNumber", id: "txt_fo_tracknr", type: "text",
    required: false, hidden: false, presentable: false, system: false,
  }));
  finished.fields.add(new Field({
    name: "trackingUrl", id: "txt_fo_trackurl", type: "text",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(finished);

  const orders = app.findCollectionByNameOrId("orders");
  if (!orders.fields.getByName("created")) {
    orders.fields.add(new Field({
      name: "created", id: "autodate_ord_c", type: "autodate",
      onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false,
    }));
    app.save(orders);
  }
}, (app) => {
  const finished = app.findCollectionByNameOrId("finishedOrders");
  finished.fields.removeByName("trackingNumber");
  finished.fields.removeByName("trackingUrl");
  app.save(finished);
  const orders = app.findCollectionByNameOrId("orders");
  if (orders.fields.getById("autodate_ord_c")) {
    orders.fields.removeById("autodate_ord_c");
    app.save(orders);
  }
});
```

(`fields.getByName`, `getById`, `removeById` gibt es in PocketBase 0.39, siehe `pb_data/types.d.ts`.)

- [ ] **Step 2: `notifyShipped` herauslösen**

In `pb_hooks/lib/printmaillib.js` `notifyCustomerShipped` ersetzen durch:

```js
// Gemeinsam für Labor (Webhook) und Handdrucke („Abschicken“).
function notifyShipped(app, to, trackingNumber, trackingUrl) {
  var nr = String(trackingNumber || "");
  var url = String(trackingUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) url = "";
  send(app, to,
    "Deine Drucke sind unterwegs",
    "Deine Drucke sind unterwegs",
    ["Deine bestellten Drucke wurden verschickt."].concat(nr ? ["Sendungsnummer: " + nr] : []),
    "Sendung verfolgen", url);
}

function notifyCustomerShipped(app, job) {
  notifyShipped(app, customerEmail(job), job.getString("trackingNumber"), job.getString("trackingUrl"));
}
```

`trackingLines` bleibt, `notifyStudioShipped` benutzt es weiter. `notifyShipped` in `module.exports` aufnehmen.

- [ ] **Step 3: `drucke.pb.js`**

```js
/// <reference path="../pb_data/types.d.ts" />
//
// Kundenseite „Drucke“ (docs/superpowers/specs/2026-10-02-kunden-drucke-design.md).
//
//   GET /api/custom/drucke   bestellte Drucke der angemeldeten Kundin
//   finishedOrders create    „Abschicken“ → Mail an die Kundin bei Handdrucken

// printJobs ist nur für Admins lesbar (Laborkosten, Prodigi-Fehler). Die
// Kundin bekommt hier eine bereinigte Sicht — und immer nur die eigene:
// userId kommt aus der Anmeldung, nie aus dem Request.
routerAdd("GET", "/api/custom/drucke", (e) => {
  const dl = require(__hooks + "/lib/druckelib.js");
  return e.json(200, dl.ordersView(e.app, e.auth.id));
}, $apis.requireAuth());

onRecordAfterCreateSuccess((e) => {
  try {
    const dl = require(__hooks + "/lib/druckelib.js");
    const pm = require(__hooks + "/lib/printmaillib.js");
    const finished = e.record;
    const orderId = finished.getString("orderId");
    let order = null;
    try { order = e.app.findRecordById("orders", orderId); } catch (_) { order = null; }
    if (order && dl.needsManualShipmentMail(e.app, order)) {
      let to = "";
      try { to = String(JSON.parse(order.getString("userData") || "{}").email || ""); } catch (_) { to = ""; }
      if (!to) {
        try { to = e.app.findRecordById("users", order.getString("userId")).email(); } catch (_) { to = ""; }
      }
      pm.notifyShipped(e.app, to, finished.getString("trackingNumber"), finished.getString("trackingUrl"));
    }
  } catch (err) {
    // „Abschicken“ ist gespeichert — eine fehlende Mail darf das nicht kippen
    e.app.logger().warn("manual shipment mail failed", "error", String(err));
  }
  e.next();
}, "finishedOrders");
```

- [ ] **Step 4: Tests und Dev-Instanz**

Run: `npx vitest run`
Expected: PASS (alle, inkl. `tests/druckauftraege.test.ts`)

Run: `make dev` (nie `make dev-reset`), dann `docker logs albumwerk-dev-app-1 2>&1 | tail -40`
Expected: „Applied 1785900003_kunden_drucke.js“, keine JSVM-Fehler.

Prüfen:

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:8091/api/custom/drucke
TOKEN=$(curl -s -X POST localhost:8091/api/collections/users/auth-with-password -H 'Content-Type: application/json' -d '{"identity":"kunde@demo.test","password":"demo123456"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s -H "Authorization: $TOKEN" localhost:8091/api/custom/drucke
```

Expected: `401`, dann `{"orders":[...]}` (leer oder mit Bestellungen der Demo-Kundin).

- [ ] **Step 5: Commit**

```bash
git add pb_migrations/1785900003_kunden_drucke.js pb_hooks/lib/printmaillib.js pb_hooks/drucke.pb.js
git commit -m "Kunden-Drucke: Endpunkt und Versand-Mail"
```

---

### Task 3: Kundenseite `/prints`

**Files:**
- Create: `src/pages/user/PrintsPage.tsx`
- Modify: `src/App.tsx` (Kunden-Routen, nach `downloads`, ca. Zeile 156)
- Modify: `src/utils/routes.ts` (`userNavItems`)

**Interfaces:**
- Consumes: `GET /api/custom/drucke` (Task 2)
- Produces: Route `/prints`

- [ ] **Step 1: `PrintsPage.tsx`**

```tsx
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Printer } from "lucide-react";
import { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import EmptyState from "../../components/feedback/EmptyState";
import PageLoader from "../../components/feedback/PageLoader";
import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { thumbUrl } from "../../features/Album/components/AlbumImage";

// Antwort von GET /api/custom/drucke (pb_hooks/lib/druckelib.js ordersView)
type DruckStatus = "processing" | "printing" | "shipped" | "cancelled";
type DruckGruppe = {
  kind: "lab" | "manual";
  status: DruckStatus;
  trackingUrl: string;
  trackingNumber: string;
  items: { image: string; title: string; quantity: number }[];
};
type DruckBestellung = { id: string; created: string; groups: DruckGruppe[] };

const STATUS: Record<DruckStatus, { label: string; variant: "info" | "neutral" | "success" | "warning" }> = {
  processing: { label: "In Bearbeitung", variant: "warning" },
  printing: { label: "Wird gedruckt", variant: "info" },
  shipped: { label: "Versendet", variant: "success" },
  cancelled: { label: "Storniert", variant: "neutral" },
};

const s = stylex.create({
  stack: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  group: { display: "flex", flexDirection: "column", gap: 12 },
  groupHead: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  items: { display: "flex", gap: 12, flexWrap: "wrap" },
  item: { display: "flex", flexDirection: "column", gap: 4, width: 120 },
  thumb: { width: 120, borderRadius: "var(--radius-element)" },
});

function datum(created: string): string {
  if (!created) return "";
  const d = new Date(created.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("de-DE");
}

function Gruppe({ g }: { g: DruckGruppe }): ReactElement {
  const st = STATUS[g.status];
  return (
    <div {...stylex.props(s.group)}>
      <div {...stylex.props(s.groupHead)}>
        <Badge variant={st.variant} label={st.label} />
        {g.trackingUrl ? (
          <a href={g.trackingUrl} target="_blank" rel="noopener noreferrer">
            Sendung verfolgen{g.trackingNumber ? ` (${g.trackingNumber})` : ""}
          </a>
        ) : g.trackingNumber ? (
          <Text type="body">Sendungsnummer: {g.trackingNumber}</Text>
        ) : null}
      </div>
      <div {...stylex.props(s.items)}>
        {g.items.map((it, i) => (
          <div key={i} {...stylex.props(s.item)}>
            <img alt={it.title} src={thumbUrl(it.image)} {...stylex.props(s.thumb)} />
            <Text type="supporting">{it.quantity}× {it.title}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintsPage(): ReactElement {
  const [orders, setOrders] = useState<DruckBestellung[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // requestKey: null — StrictMode mountet zweimal (Muster utils/verkauf.ts)
    pb.send("/api/custom/drucke", { method: "GET", requestKey: null })
      .then((res: { orders?: DruckBestellung[] }) => setOrders(res.orders ?? []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  if (failed) {
    return (
      <Page title="Drucke">
        <Banner status="error" title="Deine Drucke konnten nicht geladen werden." />
      </Page>
    );
  }

  if (orders.length === 0) {
    return (
      <Page title="Drucke">
        <EmptyState
          icon={<Printer />}
          title="Du hast noch keine Drucke bestellt."
          description="Sobald du Abzüge oder andere Drucke bestellst, siehst du hier, wann sie unterwegs sind."
          action={{ label: "Zum Album", onClick: () => navigate("/album") }}
        />
      </Page>
    );
  }

  return (
    <Page title="Drucke">
      <div {...stylex.props(s.stack)}>
        {orders.map((o) => (
          <div key={o.id} {...stylex.props(s.card)}>
            <Heading level={6}>{datum(o.created) ? `Bestellung vom ${datum(o.created)}` : "Bestellung"}</Heading>
            {o.groups.map((g) => <Gruppe key={g.kind} g={g} />)}
          </div>
        ))}
      </div>
    </Page>
  );
}
```

Prüfen, dass die Props von `Banner`, `Badge`, `EmptyState` (`icon`, `title`, `description`, `action`) und `Page` so existieren (vorhandene Verwendungen, z. B. `DownloadsPage.tsx`, `PrintJobsPage.tsx`). Abweichungen minimal anpassen.

- [ ] **Step 2: Route und Navigation**

`src/App.tsx`: `import PrintsPage from "./pages/user/PrintsPage";` und in den **Kunden**-Routen direkt nach `<Route path="downloads" element={<DownloadsPage />} />` (ca. Zeile 156):

```tsx
                  <Route path="prints" element={<PrintsPage />} />
```

`src/utils/routes.ts`: `Printer` zum `lucide-react`-Import hinzufügen (falls noch nicht da) und in `userNavItems` nach `downloads`:

```ts
  { key: "prints", label: "Drucke", path: "/prints", Icon: Printer },
```

- [ ] **Step 3: Typprüfung und Tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run`
Expected: keine Fehler, alle PASS

- [ ] **Step 4: Im Browser prüfen**

`make dev`. Als `kunde@demo.test` anmelden: „Drucke“ steht in der Navigation nach „Downloads“; `/prints` zeigt den Leerzustand oder die Bestellungen. Mit dem Browser-Netzwerk-Tab prüfen, dass die Antwort keine Felder außer den in den Global Constraints genannten enthält.

- [ ] **Step 5: Commit**

```bash
git add src/pages/user/PrintsPage.tsx src/App.tsx src/utils/routes.ts
git commit -m "Kunden-Drucke: Seite für Kund:innen"
```

---

### Task 4: Sendungsnummer beim „Abschicken“

**Files:**
- Create: `src/features/Orders/ShipmentFields.tsx`
- Modify: `src/utils/types.ts` (`FinishedOrder`)
- Modify: `src/pages/user/OrdersPage.tsx` (`OrderDetailPanel`, `handleFinishOrder`)
- Modify: `src/pages/user/OrderDetailsPage.tsx` (`handleFinishOrder`, Aktionsleiste)

**Interfaces:**
- Consumes: Felder `finishedOrders.trackingNumber/trackingUrl` (Task 2)
- Produces: `ShipmentFields({ value, onChange })`, `type Shipment = { trackingNumber: string; trackingUrl: string }`, `EMPTY_SHIPMENT`, `hasManualPrints(items: ImagePriceObject[]): boolean`

- [ ] **Step 1: `ShipmentFields.tsx`**

```tsx
import { TextInput } from "@astryxdesign/core/TextInput";
import { ReactElement } from "react";

import { ImagePriceObject } from "../../utils/types";

export type Shipment = { trackingNumber: string; trackingUrl: string };
export const EMPTY_SHIPMENT: Shipment = { trackingNumber: "", trackingUrl: "" };

// Handdrucke: physisch und nicht über das Labor. Laborpositionen meldet der
// Labor-Webhook selbst. Grobe Anzeige-Entscheidung — ob die Mail rausgeht,
// entscheidet der Server (druckelib.needsManualShipmentMail).
export function hasManualPrints(items: ImagePriceObject[]): boolean {
  return items.some((it) => it.price.some((p) => !p.isDownloadable && !p.labSku));
}

export default function ShipmentFields({ value, onChange }: { value: Shipment; onChange: (v: Shipment) => void }): ReactElement {
  return (
    <>
      <TextInput width="100%" label="Sendungsnummer (optional)"
        value={value.trackingNumber} onChange={(v) => onChange({ ...value, trackingNumber: v })} />
      <TextInput width="100%" label="Link zur Sendungsverfolgung (optional)"
        placeholder="https://…"
        value={value.trackingUrl} onChange={(v) => onChange({ ...value, trackingUrl: v })} />
    </>
  );
}
```

Hinweis: In `imagePriceObjectList` gespeicherter Bestellungen steht `labSku` nur, wenn die Bestellung nach Task 8 der Druckaufträge entstand. Bei älteren fehlt es → sie gelten als Handdruck, passend zu `groupsForOrder`.

- [ ] **Step 2: Typ**

`src/utils/types.ts`, in `FinishedOrder`: `trackingNumber?: string;` und `trackingUrl?: string;` ergänzen.

- [ ] **Step 3: `OrdersPage.tsx`**

1. Import: `import ShipmentFields, { EMPTY_SHIPMENT, Shipment, hasManualPrints } from "../../features/Orders/ShipmentFields";`
2. `OrderDetailPanel` bekommt zwei Props `shipment: Shipment; onShipmentChange: (v: Shipment) => void`. Direkt **vor** dem Button „Bestellung abschicken“ (innerhalb `{!order.finished && (…)}`, also ein Fragment um beides):

```tsx
        {!order.finished && (
          <>
            {hasManualPrints(items) && (
              <ShipmentFields value={shipment} onChange={onShipmentChange} />
            )}
            <Button
              variant="primary"
              width="100%"
              icon={<Send />}
              isLoading={finishing}
              isDisabled={finishing}
              label="Bestellung abschicken"
              onClick={onFinish}
            />
          </>
        )}
```

3. In `OrdersPage`: `const [shipment, setShipment] = useState<Shipment>(EMPTY_SHIPMENT);`. Beim Wechsel der ausgewählten Bestellung zurücksetzen: überall, wo `setSelectedOrder(...)` mit einer **anderen** Bestellung aufgerufen wird, danach `setShipment(EMPTY_SHIPMENT)` (oder per `useEffect(() => setShipment(EMPTY_SHIPMENT), [selectedOrder?.id])`).
4. `handleFinishOrder`: im `create`-Objekt ergänzen:

```ts
        trackingNumber:       shipment.trackingNumber.trim(),
        trackingUrl:          shipment.trackingUrl.trim(),
```

5. Am Aufruf von `<OrderDetailPanel …>` (ca. Zeile 658) `shipment={shipment}` und `onShipmentChange={setShipment}` ergänzen.

- [ ] **Step 4: `OrderDetailsPage.tsx`**

1. Gleicher Import wie in Step 3, dazu `const [shipment, setShipment] = useState<Shipment>(EMPTY_SHIPMENT);`.
2. `handleFinishOrder`: dieselben zwei Felder im `create`-Objekt.
3. Direkt unter der Aktionsleiste (`<div {...stylex.props(s.bar)}>…</div>`), nur wenn `!order.finished && hasManualPrints(items)`:

```tsx
      {!order.finished && hasManualPrints(items) && (
        <div {...stylex.props(s.shipment)}>
          <ShipmentFields value={shipment} onChange={setShipment} />
        </div>
      )}
```

und in `stylex.create` von `OrderDetailsPage`: `shipment: { display: "grid", gap: 12, marginBottom: 16, maxWidth: 480 },`.

- [ ] **Step 5: Typprüfung und Tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run && npm run test:check`
Expected: keine Fehler, alle PASS

- [ ] **Step 6: Im Browser prüfen**

`make dev`. Vorher als Admin über `/_/` eine Bestellung für `democustomer001` mit einer Leinwand-Position (`defaultprice004`) anlegen, falls keine offene Druckbestellung existiert:

```bash
T=$(curl -s -X POST localhost:8091/api/collections/_superusers/auth-with-password -H 'Content-Type: application/json' -d '{"identity":"admin@demo.test","password":"demo123456"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
IMG=$(curl -s -H "Authorization: $T" "localhost:8091/api/collections/images/records?filter=type%3D%27preview%27&perPage=1" | node -pe 'const r=JSON.parse(require("fs").readFileSync(0)).items[0]; `http://localhost:8091/api/files/${r.collectionId}/${r.id}/${r.file}`')
curl -s -H "Authorization: $T" -H 'Content-Type: application/json' -X POST localhost:8091/api/collections/orders/records \
  -d "{\"userId\":\"democustomer001\",\"shootingId\":\"demoshooting001\",\"imagePriceObjectList\":[{\"image\":\"$IMG\",\"price\":[{\"id\":\"defaultprice004\",\"quantity\":1,\"isDownloadable\":false}]}],\"userData\":{\"email\":\"kunde@demo.test\"}}"
```

Dann:
- Als Admin auf `/orders` die Bestellung öffnen: Die zwei Felder erscheinen vor „Bestellung abschicken“. `DHL123` und `https://dhl.example/DHL123` eintragen, abschicken.
- Mailpit (`localhost:8025`): genau eine Mail „Deine Drucke sind unterwegs“ an `kunde@demo.test` mit Sendungsnummer und Button.
- Als Kundin `/prints`: die Bestellung mit „Versendet“ und „Sendung verfolgen (DHL123)“.
- Eine rein digitale Bestellung abschicken: keine Felder, keine Mail.

- [ ] **Step 7: Commit**

```bash
git add src/features/Orders/ShipmentFields.tsx src/utils/types.ts src/pages/user/OrdersPage.tsx src/pages/user/OrderDetailsPage.tsx
git commit -m "Kunden-Drucke: Sendungsnummer beim Abschicken"
```
