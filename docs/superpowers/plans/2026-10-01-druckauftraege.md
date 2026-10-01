# Druckaufträge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bestellte Drucke mit Laborprodukt werden nach der Zahlung zu einem Druckauftrag, den die Fotograf:in mit einem Klick an Prodigi schickt; Status und Sendung laufen per Webhook zurück.

**Architecture:** Die Logik steckt in `pb_hooks/lib/printlib.js` (rein, unter Vitest testbar) plus `printmaillib.js` (E-Mails). `checkoutlib.js` ruft sie für Versand und Auftragsanlage auf, `pb_hooks/print.pb.js` stellt die Endpunkte bereit. Neue Sammlung `printJobs`, nur für Admins. Im Frontend kommen eine Seite `/print` (Einstellungen + Auftragsliste), ein Feld am Preisformular sowie die Versandzeile und die Länderauswahl im Checkout dazu.

**Tech Stack:** PocketBase 0.39 JSVM (CommonJS, `$http`, `$security`), React 18 + TypeScript, StyleX, `@astryxdesign/core`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-druckauftraege-design.md`

## Global Constraints

- Keine neue Abhängigkeit.
- Ein Labor: Prodigi, API v4.0. Live `https://api.prodigi.com/v4.0`, Sandbox `https://api.sandbox.prodigi.com/v4.0`, Header `X-API-Key`.
- Der Preis kommt immer vom Server. `labSku` wird nur aus der `prices`-Sammlung gelesen, nie aus der Client-Liste.
- Ein Fehler beim Anlegen eines Druckauftrags oder beim Versand einer E-Mail darf eine bezahlte Bestellung nie kippen.
- Laborkosten, Prodigi-ID, Dateitoken und Fehlermeldungen liegen nur in `printJobs` (nur Admins). Nichts davon kommt nach `orders`.
- Der Webhook vertraut nur der Auftrags-ID (`subject`). Den Status holt der Server selbst bei Prodigi ab.
- Sichtbare Texte auf Deutsch, Anrede „du“, Gender-Doppelpunkt („Kund:in“, „Fotograf:in“).
- `pb_hooks/lib/*.js` laden einander mit `typeof __hooks !== "undefined" ? require(__hooks + "/lib/x.js") : require("./x.js")` (Muster `availabilitylib.js:37`).

**Bewusste Abweichungen von der Spec (Kleinigkeiten, gleiche Eigenschaften):**
- Die kuratierte Liste lebt in `STANDARD_CATALOG` (`src/features/Pricing/utils/catalog.ts`) statt in `printlablib.js`. Nur die Oberfläche braucht sie; der Server liest bloß `labSku` am Preis, und `STANDARD_CATALOG` ist schon die „Katalog einfügen“-Liste.
- Der Druckdatei-Link trägt statt eines HMAC ein zufälliges 40-Zeichen-Token pro Auftrag (`fileToken`, versteckt) und dessen Ablauf (`fileTokenExpires`, ms). Die Eigenschaften sind dieselben (unratbar, läuft nach 14 Tagen ab, gilt nur für die Bilder dieses Auftrags), aber es wird kein Server-Geheimnis gebraucht.
- `settings.prodigiEnabled` (öffentlich) kommt dazu, so wie `stripeEnabled`: Der Schlüssel selbst ist versteckt, und die Oberfläche muss trotzdem wissen, ob einer hinterlegt ist.

## Review Focus

1. **Bestellung mit Abzug *und* digitaler Datei, Warenwert genau auf der Grenze:** Ab `freeShippingFrom` (≥, nicht >) entfällt der Versand. Server und Oberfläche müssen dieselbe Zahl zeigen. Tests: Task 2 „genau auf der Grenze“ und Task 8 (Gleichlauf-Tabelle gegen beide Implementierungen).
2. **Bild ohne auffindbares Original (gelöscht, umbenannt):** Der Auftrag entsteht trotzdem, die Bestellung bleibt bezahlt, „An Labor senden“ wird mit klarer Meldung abgelehnt. Tests: Task 3 „fehlendes Original“ und Task 5 (Vorbedingung in `submitJob`).
3. **Weg „an mich“, die Fotograf:in versendet ohne eigene Sendungsnummer:** Die Kund:in darf nicht die Sendungsnummer Labor → Studio bekommen. Test: Task 4 `deliveredFields` ohne Nummer leert beide Felder.
4. **Webhook nach „An Kund:in versendet“:** Eine späte Prodigi-Meldung darf `delivered_to_customer` nicht auf `shipped` zurücksetzen und keine zweite Mail auslösen. Test: Task 4 `applyLabOrder` behält `delivered_to_customer`.
5. **Prodigi meldet `issues`, z. B. weil keine Zahlungsart hinterlegt ist:** Der Auftrag wird `failed`, und die Meldung enthält den Freigabe-Link von Prodigi. Test: Task 4 „issues mit authorisationUrl“.

---

## File Structure

| Datei | Aufgabe |
|---|---|
| Create `pb_migrations/1785900001_druckauftraege.js` | `prices.labSku`, `users.country`, Druck-Felder an `settings`, Sammlung `printJobs` |
| Create `pb_hooks/lib/printlib.js` | Laborpositionen, Versand, Auftragsanlage, Prodigi-Abbildung, Status, Dateizugang, Senden/Sync/Storno |
| Create `pb_hooks/lib/printmaillib.js` | Vier E-Mails rund um den Druckauftrag |
| Modify `pb_hooks/lib/checkoutlib.js` | Versand in `authoritativeTotal`, Auftragsanlage in `finalizeOrder` |
| Create `pb_hooks/print.pb.js` | Endpunkte: Konfiguration, Senden, Stornieren, Weiterversand, Webhook, Druckdatei |
| Modify `pb_hooks/lib/verkaufslib.js` | Weicher Punkt `druck` |
| Create `tests/druckauftraege.test.ts` | Vitest für printlib + checkoutlib-Anbindung |
| Modify `tests/verkaufsbereitschaft.test.ts` | Punkt `druck` |
| Create `src/features/Pricing/utils/shipping.ts` | `shippingFor` als Spiegel des Servers |
| Create `tests/versand.test.ts` | Gleichlauf Server/Oberfläche |
| Modify `src/utils/types.ts`, `src/config/settings.ts`, `src/utils/verkauf.ts` | Typen, Vorgaben, Beschriftung |
| Modify `src/features/Pricing/utils/catalog.ts`, `src/pages/admin/AdminPricingPage.tsx` | Laborprodukt am Preis |
| Modify `src/pages/user/PricingPage.tsx`, `src/features/Pricing/components/customer/PaymentForm.tsx` | `labSku` durchreichen, Versandzeile, Land |
| Create `src/features/Print/api.ts`, `src/features/Print/PrintSettings.tsx`, `src/pages/admin/PrintJobsPage.tsx` | Admin-Seite |
| Modify `src/App.tsx`, `src/utils/routes.ts` | Route `/print`, Nav-Eintrag |

---

### Task 1: Schema

**Files:**
- Create: `pb_migrations/1785900001_druckauftraege.js`

**Interfaces:**
- Produces: `prices.labSku` (text), `users.country` (text), `settings.{prodigiApiKey (hidden), prodigiEnabled, prodigiLive, printDefaultRoute, studioAddress, shippingFlat, freeShippingFrom}`, Sammlung `printJobs` mit `orderId, route, recipient (json), items (json), status, labOrderId, trackingUrl, trackingNumber, labCost, error, fileToken (hidden), fileTokenExpires (hidden, number ms), created, updated`.

- [ ] **Step 1: Migration schreiben**

```js
/// <reference path="../pb_data/types.d.ts" />
// Druckaufträge über Prodigi (docs/superpowers/specs/2026-10-01-druckauftraege-design.md).
//
// printJobs schreiben nur Hooks (app.save()) — die Admin-Oberfläche ändert per
// API einzig den Lieferweg. Kund:innen sehen die Sammlung gar nicht: Laborkosten
// und Prodigi-Fehler gehen sie nichts an, und an `orders` lassen sich einzelne
// Felder nicht sperren.
migrate((app) => {
  const prices = app.findCollectionByNameOrId("prices");
  prices.fields.add(new Field({
    name: "labSku", id: "txt_price_labsku", type: "text",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(prices);

  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new Field({
    name: "country", id: "txt_user_country", type: "text", max: 2,
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(users);

  const settings = app.findCollectionByNameOrId("settings");
  // wie stripeSecretKey: versteckt, nur Hooks lesen und schreiben ihn
  settings.fields.add(new Field({
    name: "prodigiApiKey", id: "txt_set_prodigikey", type: "text",
    required: false, hidden: true, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "prodigiEnabled", id: "bool_set_prodigion", type: "bool",
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "prodigiLive", id: "bool_set_prodigilive", type: "bool",
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "printDefaultRoute", id: "sel_set_printroute", type: "select", maxSelect: 1,
    values: ["customer", "studio"],
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "studioAddress", id: "json_set_studioaddr", type: "json", maxSize: 0,
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "shippingFlat", id: "num_set_shipflat", type: "number",
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "freeShippingFrom", id: "num_set_shipfree", type: "number",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(settings);

  const jobs = new Collection({
    name: "printJobs",
    type: "base",
    system: false,
    listRule: "@request.auth.isAdmin = true",
    viewRule: "@request.auth.isAdmin = true",
    createRule: null,
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: null,
    indexes: [
      "CREATE INDEX idx_pj_order ON printJobs (orderId)",
      "CREATE INDEX idx_pj_lab ON printJobs (labOrderId)",
    ],
    fields: [
      { name: "orderId", id: "txt_pj_order", type: "text", max: 0, min: 0, pattern: "", required: true, hidden: false, presentable: true, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "route", id: "sel_pj_route", type: "select", maxSelect: 1, values: ["customer", "studio"], required: true, hidden: false, presentable: false, system: false },
      { name: "recipient", id: "json_pj_recip", type: "json", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      { name: "items", id: "json_pj_items", type: "json", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      { name: "status", id: "sel_pj_status", type: "select", maxSelect: 1, values: ["awaiting_approval", "submitted", "in_production", "shipped", "delivered_to_customer", "cancelled", "failed"], required: true, hidden: false, presentable: false, system: false },
      { name: "labOrderId", id: "txt_pj_labid", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "trackingUrl", id: "txt_pj_trackurl", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "trackingNumber", id: "txt_pj_tracknr", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "labCost", id: "txt_pj_cost", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "error", id: "txt_pj_error", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // Zugang für Prodigi zu den Originalen, siehe /api/custom/printfile
      { name: "fileToken", id: "txt_pj_ftoken", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: true, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "fileTokenExpires", id: "num_pj_fexp", type: "number", required: false, hidden: true, presentable: false, system: false },
      { name: "created", id: "autodate_pj_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_pj_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(jobs);

  // Vorgaben für bestehende Instanzen: direkt an Kund:in, Versand noch nicht gesetzt
  try {
    const s = app.findRecordById("settings", "appsettings0001");
    s.set("printDefaultRoute", "customer");
    app.save(s);
  } catch (_) {
    // noch nicht geseedet
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("printJobs")); } catch (_) { /* schon weg */ }
  const settings = app.findCollectionByNameOrId("settings");
  ["prodigiApiKey", "prodigiEnabled", "prodigiLive", "printDefaultRoute", "studioAddress", "shippingFlat", "freeShippingFrom"]
    .forEach((n) => settings.fields.removeByName(n));
  app.save(settings);
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("country");
  app.save(users);
  const prices = app.findCollectionByNameOrId("prices");
  prices.fields.removeByName("labSku");
  app.save(prices);
});
```

- [ ] **Step 2: Migration gegen die Dev-Instanz laufen lassen**

Run: `make dev-reset && make dev-logs` (abbrechen, sobald „Server started“ erscheint)
Expected: kein `migration`-Fehler im Log. Danach unter `http://localhost:8091/_/` prüfen: Die Sammlung `printJobs` existiert, `prices` hat `labSku`, `settings` hat die sieben neuen Felder.

- [ ] **Step 3: Commit**

```bash
git add pb_migrations/1785900001_druckauftraege.js
git commit -m "Druckaufträge: Schema"
```

---

### Task 2: Versandpauschale

**Files:**
- Create: `pb_hooks/lib/printlib.js`
- Modify: `pb_hooks/lib/checkoutlib.js` (Kopf und `authoritativeTotal`, aktuell Zeile ~147–153)
- Test: `tests/druckauftraege.test.ts`

**Interfaces:**
- Produces: `labItems(app, list) → Array<{ image: string, sku: string, copies: number }>`, `shippingFor(goodsTotal: number, hasLab: boolean, flat: number, freeFrom: number) → number`, `shippingCost(app, list, goodsTotal) → number`, `readSettings(app) → Record|null`. `authoritativeTotal` enthält jetzt den Versand.

- [ ] **Step 1: Failing Test schreiben**

`tests/druckauftraege.test.ts`:

```ts
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
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run tests/druckauftraege.test.ts`
Expected: FAIL mit „Cannot find module '../pb_hooks/lib/printlib.js'“

- [ ] **Step 3: `printlib.js` anlegen**

```js
/// <reference path="../../pb_data/types.d.ts" />
//
// Druckaufträge über Prodigi
// (docs/superpowers/specs/2026-10-01-druckauftraege-design.md).
//
// Benutzt von checkoutlib.js (Versand, Auftrag anlegen) und print.pb.js
// (Freigabe, Webhook, Druckdatei). Alles oberhalb von "Prodigi-Aufrufe" fasst
// weder $http noch $security an, damit tests/druckauftraege.test.ts es unter
// Node einbinden kann.

function round2(n) {
  return Math.round(n * 100) / 100;
}

// wie clampQty in checkoutlib.js — dort wird mit derselben Menge abgerechnet
function copiesOf(q) {
  var n = parseInt(q, 10);
  if (!n || n < 1) return 1;
  if (n > 999) return 999;
  return n;
}

function readSettings(app) {
  try {
    return app.findRecordById("settings", "appsettings0001");
  } catch (_) {
    return null;
  }
}

// Positionen, deren Preis mit einem Laborprodukt verknüpft ist. labSku kommt
// aus der prices-Sammlung, nie aus der Liste des Browsers.
function labItems(app, list) {
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
      var sku = rec.getString("labSku").trim();
      if (!sku) continue;
      out.push({ image: String(obj.image), sku: sku, copies: copiesOf(obj.price[j].quantity) });
    }
  }
  return out;
}

// Gespiegelt in src/features/Pricing/utils/shipping.ts — tests/versand.test.ts
// hält beide auf derselben Tabelle. freeFrom 0 heißt: nie versandkostenfrei.
function shippingFor(goodsTotal, hasLab, flat, freeFrom) {
  if (!hasLab || !(flat > 0)) return 0;
  if (freeFrom > 0 && goodsTotal >= freeFrom) return 0;
  return round2(flat);
}

function shippingCost(app, list, goodsTotal) {
  if (!labItems(app, list).length) return 0;
  var s = readSettings(app);
  if (!s) return 0;
  return shippingFor(goodsTotal, true, s.getFloat("shippingFlat"), s.getFloat("freeShippingFrom"));
}

module.exports = {
  readSettings: readSettings,
  labItems: labItems,
  shippingFor: shippingFor,
  shippingCost: shippingCost,
};
```

- [ ] **Step 4: Versand in `checkoutlib.js` einhängen**

Direkt unter dem Kopfkommentar (vor `// --- base64`) einfügen:

```js
// `__hooks` gibt es nur in der PocketBase-JSVM; unter Vitest wird relativ
// geladen (Muster availabilitylib.js).
var pl = typeof __hooks !== "undefined"
  ? require(__hooks + "/lib/printlib.js")
  : require("./printlib.js");
```

`authoritativeTotal` ersetzen durch:

```js
// Authoritative total in major currency units. Per-image prices take
// precedence; if there are none, fall back to package pricing. Shipping is
// added for per-image orders that contain a lab product — packages sell
// images, not prints.
function authoritativeTotal(app, shootingId, list) {
  var total = itemsTotal(app, list);
  if (total === 0 && shootingId) {
    return packageTotal(app, shootingId, list);
  }
  return round2(total + pl.shippingCost(app, list, total));
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run tests/druckauftraege.test.ts tests/paketkauf.test.ts`
Expected: PASS (auch alle bestehenden Paketkauf-Tests)

- [ ] **Step 6: Commit**

```bash
git add pb_hooks/lib/printlib.js pb_hooks/lib/checkoutlib.js tests/druckauftraege.test.ts
git commit -m "Druckaufträge: Versandpauschale im Serverpreis"
```

---

### Task 3: Druckauftrag nach der Zahlung anlegen

**Files:**
- Modify: `pb_hooks/lib/printlib.js`
- Create: `pb_hooks/lib/printmaillib.js`
- Modify: `pb_hooks/lib/checkoutlib.js` (`finalizeOrder`, nach `app.save(order)`)
- Test: `tests/druckauftraege.test.ts`

**Interfaces:**
- Consumes: `labItems`, `readSettings` (Task 2)
- Produces: `recipientFromUserData(userData) → Recipient` mit `{ name, email, phone, line1, postalCode, city, state, countryCode }`; `createPrintJob(app, order, list) → Record|null` (Status `awaiting_approval`, `items[]` = `{ image, sku, copies, originalId }`); `printmaillib.notifyAwaitingApproval(app, job)`, `notifyFailed(app, job)`, `notifyStudioShipped(app, job)`, `notifyCustomerShipped(app, job)`, alle ohne Rückgabe und ohne zu werfen.

- [ ] **Step 1: Failing Tests anhängen**

An `tests/druckauftraege.test.ts` anhängen:

```ts
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
      { image: bild("vorschau1"), sku: "GLOBAL-PHO-5X7", copies: 2, originalId: "original1" },
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

  it("übernimmt ein gewähltes Land in Großbuchstaben", () => {
    expect(pl.recipientFromUserData({ ...KUNDIN, country: "at" }).countryCode).toBe("AT");
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run tests/druckauftraege.test.ts`
Expected: FAIL, `druckauftrag(a)` ist `undefined` bzw. `pl.recipientFromUserData is not a function`

- [ ] **Step 3: `printmaillib.js` anlegen**

```js
/// <reference path="../../pb_data/types.d.ts" />
//
// E-Mails rund um den Druckauftrag. Jede Funktion schluckt ihre Fehler: Eine
// Mail, die nicht rausgeht, darf weder die Bestellung noch den Auftrag kippen.

var mail = typeof __hooks !== "undefined"
  ? require(__hooks + "/lib/emaillib.js")
  : require("./emaillib.js");

function appUrl(app) {
  try {
    return String(app.settings().meta.appURL || "").replace(/\/+$/, "");
  } catch (_) {
    return "";
  }
}

function photographerEmail(app) {
  try {
    var s = app.findRecordById("settings", "appsettings0001");
    return s.getString("orderNotificationEmail") || s.getString("contactEmail");
  } catch (_) {
    return "";
  }
}

function customerEmail(job) {
  try {
    return String(JSON.parse(job.getString("recipient") || "{}").email || "");
  } catch (_) {
    return "";
  }
}

function send(app, to, subject, title, paragraphs, buttonLabel, buttonUrl) {
  if (!to) return;
  try {
    var brand = mail.readBrand(app);
    var inner = "<h2 style='font-weight:600;margin:0 0 12px'>" + mail.escapeHtml(title) + "</h2>" +
      paragraphs.map(function (p) { return "<p>" + mail.escapeHtml(p) + "</p>"; }).join("") +
      (buttonUrl ? mail.button(buttonLabel, buttonUrl) : "");
    app.newMailClient().send(new MailerMessage({
      from: { address: app.settings().meta.senderAddress, name: brand.businessName || "Fotogalerie" },
      to: [{ address: to }],
      subject: subject,
      html: mail.brandShell(app, inner),
      text: mail.plainText([title, ""].concat(paragraphs).concat(buttonUrl ? ["", buttonUrl] : [])),
    }));
  } catch (err) {
    app.logger().warn("print mail failed", "subject", subject, "error", String(err));
  }
}

function jobsLink(app) {
  var base = appUrl(app);
  return base ? base + "/print" : "";
}

function trackingLines(job) {
  var nr = job.getString("trackingNumber");
  return nr ? ["Sendungsnummer: " + nr] : [];
}

function notifyAwaitingApproval(app, job) {
  send(app, photographerEmail(app),
    "Neue Druckbestellung wartet auf Freigabe",
    "Neue Druckbestellung",
    ["Eine bezahlte Bestellung enthält Drucke. Prüfe sie und gib sie frei, dann geht der Auftrag an Prodigi."],
    "Druckaufträge öffnen", jobsLink(app));
}

function notifyFailed(app, job) {
  send(app, photographerEmail(app),
    "Druckauftrag braucht deine Aufmerksamkeit",
    "Druckauftrag fehlgeschlagen",
    ["Prodigi meldet ein Problem mit einem Druckauftrag:", job.getString("error")],
    "Druckaufträge öffnen", jobsLink(app));
}

function notifyStudioShipped(app, job) {
  send(app, photographerEmail(app),
    "Deine Drucke sind unterwegs zu dir",
    "Drucke unterwegs",
    ["Prodigi hat die Drucke an dich verschickt. Wenn du sie an die Kund:in weitergeschickt hast, markiere den Auftrag als versendet."]
      .concat(trackingLines(job)),
    "Druckaufträge öffnen", jobsLink(app));
}

function notifyCustomerShipped(app, job) {
  var url = job.getString("trackingUrl");
  send(app, customerEmail(job),
    "Deine Drucke sind unterwegs",
    "Deine Drucke sind unterwegs",
    ["Deine bestellten Drucke wurden verschickt."].concat(trackingLines(job)),
    "Sendung verfolgen", url);
}

module.exports = {
  notifyAwaitingApproval: notifyAwaitingApproval,
  notifyFailed: notifyFailed,
  notifyStudioShipped: notifyStudioShipped,
  notifyCustomerShipped: notifyCustomerShipped,
};
```

- [ ] **Step 4: Auftragsanlage in `printlib.js`**

Vor `module.exports` einfügen und die neuen Namen exportieren (`recipientFromUserData`, `createPrintJob`):

```js
// Gleiches Muster wie fileUrlRecordId in src/utils/functions.ts: Die Bestellung
// trägt die URL der Vorschau, das Original hat denselben Namen im selben Shooting.
var FILE_URL_RE = /\/api\/files\/[^/]+\/([^/]+)\//;

function originalIdFor(app, imageUrl) {
  var m = String(imageUrl || "").match(FILE_URL_RE);
  if (!m) return "";
  try {
    var image = app.findRecordById("images", m[1]);
    if (image.getString("type") === "original") return image.id;
    var original = app.findFirstRecordByFilter(
      "images",
      "shootingId = {:s} && type = 'original' && name = {:n}",
      { s: image.getString("shootingId"), n: image.getString("name") }
    );
    return original.id;
  } catch (_) {
    return "";
  }
}

// Schnappschuss der Lieferadresse zum Zeitpunkt der Zahlung. Ändert die
// Kund:in später ihr Profil, bleibt der Auftrag, wie er bezahlt wurde.
function recipientFromUserData(userData) {
  var d = userData || {};
  return {
    name: [d.firstName, d.lastName].filter(Boolean).join(" ").trim(),
    email: String(d.email || ""),
    phone: String(d.phone || ""),
    line1: String(d.street || ""),
    postalCode: String(d.zip || ""),
    city: String(d.city || ""),
    state: String(d.state || ""),
    countryCode: String(d.country || "DE").toUpperCase(),
  };
}

function createPrintJob(app, order, list) {
  var items = labItems(app, list);
  if (!items.length) return null;

  var missing = false;
  for (var i = 0; i < items.length; i++) {
    items[i].originalId = originalIdFor(app, items[i].image);
    if (!items[i].originalId) missing = true;
  }

  var s = readSettings(app);
  var userData = {};
  try {
    userData = JSON.parse(order.getString("userData") || "{}");
  } catch (_) {
    userData = {};
  }

  var job = new Record(app.findCollectionByNameOrId("printJobs"));
  job.set("orderId", order.id);
  job.set("route", (s && s.getString("printDefaultRoute")) || "customer");
  job.set("recipient", recipientFromUserData(userData));
  job.set("items", items);
  job.set("status", "awaiting_approval");
  job.set("error", missing ? "Zu mindestens einem Bild fehlt das Original." : "");
  app.save(job);
  return job;
}
```

- [ ] **Step 5: In `finalizeOrder` aufrufen**

In `pb_hooks/lib/checkoutlib.js` direkt nach `app.save(order);` in `finalizeOrder` einfügen:

```js
  // Drucke mit Laborprodukt werden ein Druckauftrag, der auf Freigabe wartet.
  // Die Bestellung ist bezahlt — ein Fehler hier darf sie nicht kippen.
  try {
    var job = pl.createPrintJob(app, order, list);
    if (job) {
      var pm = typeof __hooks !== "undefined"
        ? require(__hooks + "/lib/printmaillib.js")
        : require("./printmaillib.js");
      pm.notifyAwaitingApproval(app, job);
    }
  } catch (err) {
    app.logger().error("print job create failed", "error", String(err));
  }
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run tests/druckauftraege.test.ts tests/paketkauf.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add pb_hooks/lib/printlib.js pb_hooks/lib/printmaillib.js pb_hooks/lib/checkoutlib.js tests/druckauftraege.test.ts
git commit -m "Druckaufträge: Auftrag nach der Zahlung anlegen"
```

---

### Task 4: Prodigi-Abbildung, Status und Dateizugang (rein)

**Files:**
- Modify: `pb_hooks/lib/printlib.js`
- Test: `tests/druckauftraege.test.ts`

**Interfaces:**
- Consumes: `Recipient` aus Task 3
- Produces:
  - `prodigiBase(live: boolean) → string`
  - `jobView(record) → { id, orderId, route, status, recipient, items }`
  - `studioRecipient(studioAddress) → Recipient` (Studioadresse: `{ name, line1, zip, city, country }`)
  - `recipientFor(view, studioAddress) → Recipient`
  - `addressComplete(r) → boolean`
  - `prodigiOrderBody(view, recipient, baseUrl, token) → object`
  - `applyLabOrder(currentStatus, labOrder) → { labOrderId, status, trackingUrl, trackingNumber, labCost, error }`
  - `deliveredFields(trackingNumber, trackingUrl) → { status, trackingNumber, trackingUrl }`
  - `fileAccessOk(token, expected, expiresMs, nowMs, equal) → boolean`
  - `FILE_TOKEN_DAYS = 14`

- [ ] **Step 1: Failing Tests anhängen**

```ts
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
        assets: [{ printArea: "default", url: "https://galerie.example/api/custom/printfile/job1/0?t=tok" }],
      }],
    });
  });

  it("schickt beim Weg „an mich“ an die Studioadresse", () => {
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

  it("bleibt „beim Labor“, solange nichts produziert wird", () => {
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
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run tests/druckauftraege.test.ts`
Expected: FAIL, `pl.prodigiOrderBody is not a function` usw.

- [ ] **Step 3: Funktionen in `printlib.js` ergänzen**

Vor `module.exports` einfügen und alle neuen Namen exportieren:

```js
var FILE_TOKEN_DAYS = 14;

function prodigiBase(live) {
  return live ? "https://api.prodigi.com/v4.0" : "https://api.sandbox.prodigi.com/v4.0";
}

function parseJson(text, fallback) {
  try {
    return JSON.parse(text || "");
  } catch (_) {
    return fallback;
  }
}

function jobView(rec) {
  return {
    id: rec.id,
    orderId: rec.getString("orderId"),
    route: rec.getString("route"),
    status: rec.getString("status"),
    recipient: parseJson(rec.getString("recipient"), {}),
    items: parseJson(rec.getString("items"), []),
  };
}

function studioRecipient(a) {
  var s = a || {};
  return {
    name: String(s.name || ""),
    email: "",
    phone: "",
    line1: String(s.line1 || ""),
    postalCode: String(s.zip || ""),
    city: String(s.city || ""),
    state: "",
    countryCode: String(s.country || "DE").toUpperCase(),
  };
}

function recipientFor(view, studioAddress) {
  return view.route === "studio" ? studioRecipient(studioAddress) : view.recipient;
}

function addressComplete(r) {
  return Boolean(r && r.name && r.line1 && r.postalCode && r.city && r.countryCode);
}

function prodigiOrderBody(view, recipient, baseUrl, token) {
  var address = {
    line1: recipient.line1,
    postalOrZipCode: recipient.postalCode,
    townOrCity: recipient.city,
    countryCode: recipient.countryCode,
  };
  if (recipient.state) address.stateOrCounty = recipient.state;
  var to = { name: recipient.name };
  if (recipient.email) to.email = recipient.email;
  if (recipient.phone) to.phoneNumber = recipient.phone;
  to.address = address;

  return {
    merchantReference: view.orderId,
    // Doppelklick oder "Erneut senden" erzeugt bei Prodigi keinen zweiten Auftrag
    idempotencyKey: view.id,
    callbackUrl: baseUrl + "/api/custom/prodigi/callback",
    shippingMethod: "Standard",
    recipient: to,
    items: view.items.map(function (it, i) {
      return {
        merchantReference: it.originalId,
        sku: it.sku,
        copies: it.copies,
        sizing: "fillPrintArea",
        assets: [{
          printArea: "default",
          url: baseUrl + "/api/custom/printfile/" + view.id + "/" + i + "?t=" + encodeURIComponent(token),
        }],
      };
    }),
  };
}

function labCostOf(charges) {
  var sum = 0;
  var currency = "";
  (charges || []).forEach(function (c) {
    if (!c || !c.totalCost) return;
    sum += parseFloat(c.totalCost.amount) || 0;
    currency = c.totalCost.currency || currency;
  });
  return currency ? sum.toFixed(2) + " " + currency : "";
}

function issueText(issue) {
  var text = issue.description || issue.errorCode || "Unbekanntes Problem";
  var auth = issue.authorisationDetails && issue.authorisationDetails.authorisationUrl;
  return auth ? text + " — freigeben unter " + auth : text;
}

// Übersetzt einen Prodigi-Auftrag in die Felder des Druckauftrags. Was das
// Studio schon selbst weiterversandt hat, setzt eine späte Meldung nicht zurück.
function applyLabOrder(currentStatus, o) {
  var status = (o && o.status) || {};
  var details = status.details || {};
  var issues = status.issues || [];
  var shipped = ((o && o.shipments) || []).filter(function (s) {
    return String(s.status || "").toLowerCase() === "shipped";
  });
  var tracking = (shipped[0] && shipped[0].tracking) || {};

  var out = {
    labOrderId: String((o && o.id) || ""),
    status: "submitted",
    trackingUrl: String(tracking.url || ""),
    trackingNumber: String(tracking.number || ""),
    labCost: labCostOf(o && o.charges),
    error: "",
  };

  if (status.stage === "Cancelled") {
    out.status = "cancelled";
  } else if (issues.length) {
    out.status = "failed";
    out.error = issues.map(issueText).join(" · ");
  } else if (shipped.length || status.stage === "Complete") {
    out.status = "shipped";
  } else if (details.inProduction === "InProgress" || details.inProduction === "Complete") {
    out.status = "in_production";
  }

  if (currentStatus === "delivered_to_customer") out.status = currentStatus;
  return out;
}

// Ohne eigene Sendungsnummer bleibt das Feld leer — sonst bekäme die Kund:in
// die Sendung Labor → Studio als ihre eigene.
function deliveredFields(trackingNumber, trackingUrl) {
  var url = String(trackingUrl || "").trim();
  return {
    status: "delivered_to_customer",
    trackingNumber: String(trackingNumber || "").trim(),
    trackingUrl: /^https?:\/\//i.test(url) ? url : "",
  };
}

// `equal` ist in der JSVM $security.equal (zeitkonstant), im Test ein ===.
function fileAccessOk(token, expected, expiresMs, nowMs, equal) {
  if (!expected || !token) return false;
  if (!(nowMs < expiresMs)) return false;
  return Boolean(equal(String(token), String(expected)));
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/druckauftraege.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pb_hooks/lib/printlib.js tests/druckauftraege.test.ts
git commit -m "Druckaufträge: Prodigi-Auftrag, Status und Dateizugang"
```

---

### Task 5: Endpunkte

**Files:**
- Modify: `pb_hooks/lib/printlib.js` (Abschnitt „Prodigi-Aufrufe“)
- Create: `pb_hooks/print.pb.js`

**Interfaces:**
- Consumes: alles aus Task 2–4, `printmaillib` aus Task 3
- Produces (HTTP, alle Admin-Endpunkte liefern `200 { status: "success" }` oder `400/403/502 { status: "error", message }`):
  - `POST /api/custom/prodigi/config` `{ apiKey, live }` → `{ status, enabled, live }`
  - `POST /api/custom/print/{id}/submit`
  - `POST /api/custom/print/{id}/cancel`
  - `POST /api/custom/print/{id}/delivered` `{ trackingNumber, trackingUrl }`
  - `POST /api/custom/prodigi/callback` (öffentlich, antwortet immer 200)
  - `GET /api/custom/printfile/{id}/{index}?t=…` (öffentlich, 404 bei jedem Fehler)
- Produces (printlib): `isAdmin(e)`, `submitJob(app, job) → { ok, message }`, `syncJob(app, job)`, `cancelJob(app, job) → { ok, message }`, `markDelivered(app, job, trackingNumber, trackingUrl) → { ok, message }`.

- [ ] **Step 1: Prodigi-Aufrufe in `printlib.js`**

Vor `module.exports` einfügen und alle neuen Namen exportieren:

```js
// --- Prodigi-Aufrufe ---------------------------------------------------------
// Ab hier $http / $security / Mails: nur in der JSVM, nicht im Unit-Test.

function isAdmin(e) {
  return e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
}

function mails() {
  return typeof __hooks !== "undefined"
    ? require(__hooks + "/lib/printmaillib.js")
    : require("./printmaillib.js");
}

function setFields(rec, fields) {
  Object.keys(fields).forEach(function (k) { rec.set(k, fields[k]); });
}

function prodigiKey(s) {
  return s ? s.getString("prodigiApiKey") : "";
}

function fail(app, job, message) {
  job.set("status", "failed");
  job.set("error", message);
  app.save(job);
  return { ok: false, message: message };
}

function submitJob(app, job) {
  var st = job.getString("status");
  if (st !== "awaiting_approval" && st !== "failed") {
    return { ok: false, message: "Der Auftrag ist schon beim Labor." };
  }
  var s = readSettings(app);
  var key = prodigiKey(s);
  if (!key) return { ok: false, message: "Prodigi-Schlüssel fehlt. Verbinde Prodigi oben auf dieser Seite." };

  var view = jobView(job);
  for (var i = 0; i < view.items.length; i++) {
    if (!view.items[i].originalId) {
      return { ok: false, message: "Zu mindestens einem Bild fehlt das Original." };
    }
  }
  var recipient = recipientFor(view, parseJson(s.getString("studioAddress"), {}));
  if (!addressComplete(recipient)) {
    return {
      ok: false,
      message: view.route === "studio" ? "Deine Studioadresse ist unvollständig." : "Die Lieferadresse ist unvollständig.",
    };
  }
  var baseUrl = String(app.settings().meta.appURL || "").replace(/\/+$/, "");
  if (baseUrl.indexOf("http") !== 0) {
    return { ok: false, message: "Die App-URL fehlt in den Server-Einstellungen — ohne sie findet Prodigi die Bilder nicht." };
  }

  var token = $security.randomString(40);
  job.set("fileToken", token);
  job.set("fileTokenExpires", Date.now() + FILE_TOKEN_DAYS * 86400000);

  var res;
  try {
    res = $http.send({
      url: prodigiBase(s.getBool("prodigiLive")) + "/orders",
      method: "POST",
      body: JSON.stringify(prodigiOrderBody(view, recipient, baseUrl, token)),
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      timeout: 30,
    });
  } catch (err) {
    app.logger().warn("prodigi unreachable", "error", String(err));
    return fail(app, job, "Prodigi war nicht erreichbar. Versuch es gleich noch einmal.");
  }
  if (res.statusCode !== 200 || !res.json || !res.json.order) {
    app.logger().warn("prodigi order rejected", "status", res.statusCode, "body", res.raw);
    return fail(app, job, "Prodigi hat den Auftrag abgelehnt (" + res.statusCode + "): " + String(res.raw || "").slice(0, 300));
  }

  setFields(job, applyLabOrder(st, res.json.order));
  app.save(job);
  if (job.getString("status") === "failed") return { ok: false, message: job.getString("error") };
  return { ok: true, message: "" };
}

// Fragt den Auftrag bei Prodigi ab und übernimmt den Stand. Mails gehen nur
// bei einem echten Wechsel raus, damit doppelte Webhooks keine doppelten Mails
// auslösen.
function syncJob(app, job) {
  var s = readSettings(app);
  var key = prodigiKey(s);
  var labOrderId = job.getString("labOrderId");
  if (!key || !labOrderId) return;

  var res = $http.send({
    url: prodigiBase(s.getBool("prodigiLive")) + "/orders/" + encodeURIComponent(labOrderId),
    method: "GET",
    headers: { "X-API-Key": key },
    timeout: 20,
  });
  if (res.statusCode !== 200 || !res.json || !res.json.order) return;

  var before = job.getString("status");
  setFields(job, applyLabOrder(before, res.json.order));
  app.save(job);

  var after = job.getString("status");
  if (after === before) return;
  if (after === "failed") mails().notifyFailed(app, job);
  if (after === "shipped") {
    if (job.getString("route") === "studio") mails().notifyStudioShipped(app, job);
    else mails().notifyCustomerShipped(app, job);
  }
}

function cancelJob(app, job) {
  var st = job.getString("status");
  if (st === "cancelled" || st === "shipped" || st === "delivered_to_customer") {
    return { ok: false, message: "Der Auftrag lässt sich nicht mehr stornieren." };
  }
  var labOrderId = job.getString("labOrderId");
  if (!labOrderId) {
    job.set("status", "cancelled");
    app.save(job);
    return { ok: true, message: "" };
  }

  var s = readSettings(app);
  var key = prodigiKey(s);
  if (!key) return { ok: false, message: "Prodigi-Schlüssel fehlt." };
  var res;
  try {
    res = $http.send({
      url: prodigiBase(s.getBool("prodigiLive")) + "/orders/" + encodeURIComponent(labOrderId) + "/actions/cancel",
      method: "POST",
      body: "",
      headers: { "X-API-Key": key },
      timeout: 20,
    });
  } catch (err) {
    return { ok: false, message: "Prodigi war nicht erreichbar." };
  }
  var outcome = res.json ? String(res.json.outcome || "").toLowerCase() : "";
  if (res.statusCode === 200 && outcome === "cancelled") {
    job.set("status", "cancelled");
    app.save(job);
    return { ok: true, message: "" };
  }
  return { ok: false, message: "Prodigi konnte den Auftrag nicht mehr stornieren — er ist vermutlich schon in Produktion." };
}

function markDelivered(app, job, trackingNumber, trackingUrl) {
  if (job.getString("route") !== "studio" || job.getString("status") !== "shipped") {
    return { ok: false, message: "Nur Aufträge, die bei dir angekommen sind, lassen sich als weiterversendet markieren." };
  }
  setFields(job, deliveredFields(trackingNumber, trackingUrl));
  app.save(job);
  mails().notifyCustomerShipped(app, job);
  return { ok: true, message: "" };
}
```

- [ ] **Step 2: `print.pb.js` anlegen**

```js
/// <reference path="../pb_data/types.d.ts" />
//
// Druckaufträge über Prodigi
// (docs/superpowers/specs/2026-10-01-druckauftraege-design.md).
//
//   POST /api/custom/prodigi/config          { apiKey, live }                 (admin)
//   POST /api/custom/print/{id}/submit                                        (admin)
//   POST /api/custom/print/{id}/cancel                                        (admin)
//   POST /api/custom/print/{id}/delivered    { trackingNumber, trackingUrl }  (admin)
//   POST /api/custom/prodigi/callback        Webhook von Prodigi              (öffentlich)
//   GET  /api/custom/printfile/{id}/{index}?t=  Original für Prodigi          (öffentlich, Token)

routerAdd("POST", "/api/custom/prodigi/config", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  if (!pl.isAdmin(e)) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const apiKey = String(data.apiKey || "").trim();
  const live = !!data.live;
  const settings = e.app.findRecordById("settings", "appsettings0001");

  if (apiKey === "") {
    settings.set("prodigiApiKey", "");
    settings.set("prodigiEnabled", false);
    e.app.save(settings);
    return e.json(200, { status: "success", enabled: false, live: false });
  }

  // billigster Aufruf, der einen gültigen Schlüssel braucht
  let res;
  try {
    res = $http.send({
      url: pl.prodigiBase(live) + "/orders?top=1",
      method: "GET",
      headers: { "X-API-Key": apiKey },
      timeout: 20,
    });
  } catch (err) {
    e.app.logger().warn("prodigi config unreachable", "error", String(err));
    return e.json(502, {
      status: "error",
      message: "Prodigi war nicht erreichbar. Prüfe, ob der Server ins Internet darf.",
    });
  }
  if (res.statusCode !== 200) {
    return e.json(400, {
      status: "error",
      message: "Prodigi hat den Schlüssel nicht akzeptiert. Prüfe, ob Test oder Live richtig gewählt ist.",
    });
  }

  settings.set("prodigiApiKey", apiKey);
  settings.set("prodigiLive", live);
  settings.set("prodigiEnabled", true);
  e.app.save(settings);
  return e.json(200, { status: "success", enabled: true, live: live });
}, $apis.requireAuth());

routerAdd("POST", "/api/custom/print/{id}/submit", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  if (!pl.isAdmin(e)) return e.json(403, { status: "error", message: "forbidden" });
  let job;
  try { job = e.app.findRecordById("printJobs", e.request.pathValue("id")); }
  catch (_) { return e.json(404, { status: "error", message: "Auftrag nicht gefunden." }); }
  const r = pl.submitJob(e.app, job);
  return r.ok ? e.json(200, { status: "success" }) : e.json(400, { status: "error", message: r.message });
}, $apis.requireAuth());

routerAdd("POST", "/api/custom/print/{id}/cancel", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  if (!pl.isAdmin(e)) return e.json(403, { status: "error", message: "forbidden" });
  let job;
  try { job = e.app.findRecordById("printJobs", e.request.pathValue("id")); }
  catch (_) { return e.json(404, { status: "error", message: "Auftrag nicht gefunden." }); }
  const r = pl.cancelJob(e.app, job);
  return r.ok ? e.json(200, { status: "success" }) : e.json(400, { status: "error", message: r.message });
}, $apis.requireAuth());

routerAdd("POST", "/api/custom/print/{id}/delivered", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  if (!pl.isAdmin(e)) return e.json(403, { status: "error", message: "forbidden" });
  let job;
  try { job = e.app.findRecordById("printJobs", e.request.pathValue("id")); }
  catch (_) { return e.json(404, { status: "error", message: "Auftrag nicht gefunden." }); }
  const data = e.requestInfo().body || {};
  const r = pl.markDelivered(e.app, job, data.trackingNumber, data.trackingUrl);
  return r.ok ? e.json(200, { status: "success" }) : e.json(400, { status: "error", message: r.message });
}, $apis.requireAuth());

// Vom Rumpf zählt nur die Auftrags-ID. Den Stand holt syncJob selbst bei
// Prodigi — ein gefälschter Aufruf bewirkt so höchstens eine überflüssige
// Abfrage. Immer 200, sonst wiederholt Prodigi die Zustellung endlos.
routerAdd("POST", "/api/custom/prodigi/callback", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  const body = e.requestInfo().body || {};
  const labOrderId = String(body.subject || "");
  if (labOrderId.indexOf("ord_") !== 0) return e.json(200, { ok: true });

  let job;
  try {
    job = e.app.findFirstRecordByFilter("printJobs", "labOrderId = {:id}", { id: labOrderId });
  } catch (_) {
    return e.json(200, { ok: true });
  }
  try {
    pl.syncJob(e.app, job);
  } catch (err) {
    e.app.logger().warn("prodigi sync failed", "labOrderId", labOrderId, "error", String(err));
  }
  return e.json(200, { ok: true });
});

// Liefert Prodigi das Original. Jeder Fehler ist ein 404, damit niemand an der
// Antwort ablesen kann, welcher Teil (Auftrag, Token, Bild) falsch war.
routerAdd("GET", "/api/custom/printfile/{id}/{index}", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  const notFound = () => e.json(404, { status: "error", message: "not found" });

  let job;
  try { job = e.app.findRecordById("printJobs", e.request.pathValue("id")); }
  catch (_) { return notFound(); }

  const token = String(e.request.url.query().get("t") || "");
  const ok = pl.fileAccessOk(
    token, job.getString("fileToken"), job.getFloat("fileTokenExpires"), Date.now(),
    (a, b) => $security.equal(a, b)
  );
  if (!ok) return notFound();

  const items = JSON.parse(job.getString("items") || "[]");
  const item = items[parseInt(e.request.pathValue("index"), 10)];
  if (!item || !item.originalId) return notFound();

  let image;
  try { image = e.app.findRecordById("images", item.originalId); }
  catch (_) { return notFound(); }
  const filename = image.getString("originalFile");
  if (!filename) return notFound();

  const fsys = e.app.newFilesystem();
  try {
    fsys.serve(e.response, e.request, image.baseFilesPath() + "/" + filename, filename);
  } finally {
    fsys.close();
  }
});
```

- [ ] **Step 3: Unit-Tests laufen lassen (die Lib muss unter Node weiter ladbar sein)**

Run: `npx vitest run`
Expected: PASS, alle Dateien

- [ ] **Step 4: Endpunkte gegen die Dev-Instanz anstoßen**

Run: `make dev-reset`, dann:

```bash
curl -s -X POST localhost:8091/api/custom/prodigi/callback -H 'Content-Type: application/json' -d '{"subject":"ord_gibtsnicht"}'
curl -s -o /dev/null -w '%{http_code}\n' 'localhost:8091/api/custom/printfile/gibtsnicht/0?t=x'
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8091/api/custom/print/gibtsnicht/submit
```

Expected: `{"ok":true}`, `404`, `401` (ohne Anmeldung). `make dev-logs` zeigt keinen JSVM-Fehler.

- [ ] **Step 5: Commit**

```bash
git add pb_hooks/lib/printlib.js pb_hooks/print.pb.js
git commit -m "Druckaufträge: Endpunkte für Freigabe, Webhook und Druckdatei"
```

---

### Task 6: Verkaufsbereitschaft

**Files:**
- Modify: `pb_hooks/lib/verkaufslib.js`
- Modify: `src/utils/verkauf.ts`
- Test: `tests/verkaufsbereitschaft.test.ts`

**Interfaces:**
- Produces: Punkt `{ key: "druck", hart: false, erfuellt }`, steht nur in der Liste, wenn `werte.laborPreise` wahr ist. `leseWerte` liefert zusätzlich `laborPreise`, `prodigiEnabled`.

- [ ] **Step 1: Failing Tests anhängen**

An `tests/verkaufsbereitschaft.test.ts` anhängen (die Datei bindet `verkaufslib` bereits als `verkauf` ein, Zeile 8):

```ts
describe("Druck-Labor", () => {
  it("taucht ohne Laborpreise nicht auf", () => {
    const punkte = verkauf.pruefeVerkaufsbereitschaft({});
    expect(punkte.some((p: { key: string }) => p.key === "druck")).toBe(false);
  });

  it("ist mit Laborpreisen ein weicher Punkt", () => {
    const offen = verkauf.pruefeVerkaufsbereitschaft({ laborPreise: true })
      .find((p: { key: string }) => p.key === "druck");
    expect(offen).toEqual({ key: "druck", hart: false, erfuellt: false });
    const erledigt = verkauf.pruefeVerkaufsbereitschaft({ laborPreise: true, prodigiEnabled: true })
      .find((p: { key: string }) => p.key === "druck");
    expect(erledigt.erfuellt).toBe(true);
  });

  it("sperrt den Verkauf nicht", () => {
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft({ laborPreise: true }))).not.toContain("druck");
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run tests/verkaufsbereitschaft.test.ts`
Expected: FAIL, Punkt `druck` fehlt

- [ ] **Step 3: `verkaufslib.js` ergänzen**

In `pruefeVerkaufsbereitschaft` direkt vor `return punkte;`:

```js
  // Nur wer Laborpreise hat, braucht ein verbundenes Labor — allen anderen
  // zeigte der Punkt einen Haken an etwas, das sie nie eingerichtet haben.
  if (w.laborPreise) {
    punkte.push({ key: "druck", hart: false, erfuellt: Boolean(w.prodigiEnabled) });
  }
```

In `leseWerte` im zurückgegebenen Objekt ergänzen:

```js
    laborPreise: hatLaborPreise(app),
    prodigiEnabled: s ? s.getBool("prodigiEnabled") : false,
```

und neben `hatRecords`:

```js
function hatLaborPreise(app) {
  try {
    return app.findRecordsByFilter("prices", "labSku != ''", "", 1, 0).length > 0;
  } catch (_) {
    return false;
  }
}
```

- [ ] **Step 4: Frontend-Beschriftung**

In `src/utils/verkauf.ts` `PunktKey` um `| "druck"` erweitern und in `PUNKT_TEXTE` ergänzen:

```ts
  druck: { label: "Druck-Labor verbunden", ziel: "/print" },
```

- [ ] **Step 5: Tests und Typprüfung**

Run: `npx vitest run tests/verkaufsbereitschaft.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS, keine Typfehler

- [ ] **Step 6: Commit**

```bash
git add pb_hooks/lib/verkaufslib.js src/utils/verkauf.ts tests/verkaufsbereitschaft.test.ts
git commit -m "Druckaufträge: Labor in der Verkaufsbereitschaft"
```

---

### Task 7: Laborprodukt am Preis

**Files:**
- Modify: `src/utils/types.ts` (`Price`, `PriceWithQuantity`, `User`)
- Modify: `src/config/settings.ts` (`AppSettings`, `DEFAULT_SETTINGS`)
- Modify: `src/features/Pricing/utils/catalog.ts` (`STANDARD_CATALOG`)
- Modify: `src/pages/admin/AdminPricingPage.tsx`

**Interfaces:**
- Produces: `Price.labSku?: string`, `PriceWithQuantity.labSku?: string`, `User.country?: string`; `AppSettings` mit `prodigiEnabled: boolean`, `prodigiLive: boolean`, `printDefaultRoute: "customer" | "studio"`, `studioAddress: StudioAddress`, `shippingFlat: number`, `freeShippingFrom: number`; `export type StudioAddress = { name: string; line1: string; zip: string; city: string; country: string }`; `LAB_PRODUCTS: { sku: string; label: string }[]` aus `catalog.ts`.

- [ ] **Step 1: Prodigi-Artikelnummern in der Sandbox prüfen**

Dafür ist ein Prodigi-Sandbox-Schlüssel nötig. Liegt keiner vor: anhalten und den Menschen um einen bitten (kostenlos unter dashboard.prodigi.com → Sandbox → Settings → API-Key).

```bash
for sku in GLOBAL-PHO-4X6 GLOBAL-PHO-5X7 GLOBAL-PHO-6X8 GLOBAL-PHO-8X12 GLOBAL-PHO-12X18; do
  printf '%s ' "$sku"
  curl -s -H "X-API-Key: $PRODIGI_SANDBOX_KEY" "https://api.sandbox.prodigi.com/v4.0/products/$sku" \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(j.outcome, j.product&&JSON.stringify(j.product.productDimensions))})'
done
```

Expected: je Zeile `Ok` mit Maßen. Jede Artikelnummer, die nicht `Ok` liefert oder deren Maße nicht zum Format passen (10×15 ≈ 102×152 mm usw.), bekommt in Step 2 **kein** `labSku`. Nicht raten.

- [ ] **Step 2: Typen, Vorgaben und Katalog**

`src/utils/types.ts`: In `Price` und `PriceWithQuantity` jeweils `labSku?: string;` ergänzen, in `User` `country?: string;`.

`src/config/settings.ts`: Vor `AppSettings` einfügen:

```ts
// Ziel beim Lieferweg „an mich“ (docs/superpowers/specs/2026-10-01-druckauftraege-design.md)
export type StudioAddress = { name: string; line1: string; zip: string; city: string; country: string };
```

In `AppSettings` nach `currency: string;`:

```ts
  // Druckaufträge über Prodigi. Der Schlüssel selbst ist versteckt;
  // prodigiEnabled sagt nur, ob einer hinterlegt ist (wie stripeEnabled).
  prodigiEnabled: boolean;
  prodigiLive: boolean;
  printDefaultRoute: "customer" | "studio";
  studioAddress: StudioAddress;
  shippingFlat: number;
  freeShippingFrom: number;
```

In `DEFAULT_SETTINGS` nach `currency: "EUR",`:

```ts
  prodigiEnabled: false,
  prodigiLive: false,
  printDefaultRoute: "customer",
  studioAddress: { name: "", line1: "", zip: "", city: "", country: "DE" },
  shippingFlat: 0,
  freeShippingFrom: 0,
```

`src/features/Pricing/utils/catalog.ts`: Im Typ von `STANDARD_CATALOG` `labSku?: string;` ergänzen. Bei den Abzügen die in Step 1 bestätigten Nummern eintragen, z. B.:

```ts
  { category: "print", size: "10×15 cm", amount: 3.5, isDownloadable: false, labSku: "GLOBAL-PHO-4X6",
    description: "Klassischer Fotoabzug, glänzend oder matt" },
```

(entsprechend 13×18 → `GLOBAL-PHO-5X7`, 15×20 → `GLOBAL-PHO-6X8`, 20×30 → `GLOBAL-PHO-8X12`, 30×45 → `GLOBAL-PHO-12X18`, jeweils nur wenn bestätigt). Unter `STANDARD_CATALOG` einfügen:

```ts
// Die kuratierte Prodigi-Auswahl ist der Teil des Startkatalogs, der eine
// Artikelnummer trägt — eine zweite Liste liefe nur auseinander.
export const LAB_PRODUCTS: { sku: string; label: string }[] = STANDARD_CATALOG
  .filter((e) => e.labSku)
  .map((e) => ({ sku: e.labSku!, label: priceTitle(e.category, e.size) }));
```

- [ ] **Step 3: Preisformular**

In `src/pages/admin/AdminPricingPage.tsx`:

1. `LAB_PRODUCTS` zum Import aus `catalog` hinzufügen, außerdem `import { useSettings } from "../../context/SettingsContext";`.
2. `PriceForm` um `labSku: string;` erweitern, `EMPTY_PRICE_FORM` um `labSku: ""`.
3. In der Komponente: `const { settings } = useSettings();` und `const [customSku, setCustomSku] = useState(false);`.
4. `selectPrice`: `labSku: price.labSku ?? "",` ergänzen und danach `setCustomSku(Boolean(price.labSku) && !LAB_PRODUCTS.some(p => p.sku === price.labSku));`. `startNewPrice`: `setCustomSku(false);`.
5. `setPriceCategory`: bei `"digital"` zusätzlich `labSku: ""`.
6. `insertStandardCatalog`: im `create`-Aufruf `labSku: entry.labSku ?? "",`.
7. `savePrice`: im `data`-Objekt `labSku: priceForm.category === "digital" ? "" : priceForm.labSku.trim(),`.
8. Im Formular direkt nach dem Größen-`TextInput` (innerhalb derselben `priceForm.category !== "digital"`-Bedingung, also als zweites Kind in einem Fragment):

```tsx
<Selector
  width="100%"
  label="Druck über Prodigi"
  description={
    priceForm.labSku && !settings.prodigiEnabled
      ? "Verbinde Prodigi unter „Druckaufträge“, damit diese Bestellungen ans Labor gehen."
      : "Mit Laborprodukt wird jede Bestellung ein Druckauftrag, den du freigibst."
  }
  options={[
    { value: "", label: "Nicht über das Labor" },
    ...LAB_PRODUCTS.map(p => ({ value: p.sku, label: `${p.label} (${p.sku})` })),
    { value: "custom", label: "Eigene Artikelnummer" },
  ]}
  value={customSku ? "custom" : priceForm.labSku}
  onChange={(v) => {
    if (v === "custom") { setCustomSku(true); return; }
    setCustomSku(false);
    setPriceForm(f => ({ ...f, labSku: v ?? "" }));
  }}
/>
{customSku && (
  <TextInput
    width="100%"
    label="Prodigi-Artikelnummer"
    placeholder="z. B. GLOBAL-PHO-5X7"
    description="Steht im Produktkatalog von Prodigi. Ob sie stimmt, zeigt sich beim ersten Senden."
    value={priceForm.labSku}
    onChange={(v) => setPriceForm(f => ({ ...f, labSku: v }))}
  />
)}
```

- [ ] **Step 4: Typprüfung und Lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/pages/admin/AdminPricingPage.tsx src/features/Pricing/utils/catalog.ts`
Expected: keine Fehler

- [ ] **Step 5: Im Browser prüfen**

`make dev`, als Admin auf `/pricing`: Abzug 13×18 öffnen, „Druck über Prodigi“ auf den Katalogeintrag stellen, speichern, neu laden. Die Auswahl muss erhalten bleiben. „Eigene Artikelnummer“ wählen, `TEST-SKU` eintippen, speichern, neu laden: Das Freitextfeld erscheint wieder mit `TEST-SKU`.

- [ ] **Step 6: Commit**

```bash
git add src/utils/types.ts src/config/settings.ts src/features/Pricing/utils/catalog.ts src/pages/admin/AdminPricingPage.tsx
git commit -m "Druckaufträge: Laborprodukt am Preis"
```

---

### Task 8: Versand und Land im Checkout

**Files:**
- Create: `src/features/Pricing/utils/shipping.ts`
- Create: `tests/versand.test.ts`
- Modify: `src/pages/user/PricingPage.tsx` (`fetchPrices`)
- Modify: `src/features/Pricing/components/customer/PaymentForm.tsx`

**Interfaces:**
- Consumes: `AppSettings.shippingFlat`, `freeShippingFrom` (Task 7), `PriceWithQuantity.labSku` (Task 7), `printlib.shippingFor` (Task 2)
- Produces: `shippingFor(goodsTotal: number, hasLab: boolean, flat: number, freeFrom: number): number`, `hasLabItem(list: ImagePriceObject[]): boolean`

- [ ] **Step 1: Gleichlauf-Test schreiben**

`tests/versand.test.ts`:

```ts
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
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run tests/versand.test.ts`
Expected: FAIL, Modul `shipping` fehlt

- [ ] **Step 3: `shipping.ts` anlegen**

```ts
import type { ImagePriceObject } from "../../../utils/types";

// Spiegel von shippingFor in pb_hooks/lib/printlib.js — der Server bucht ab,
// diese Kopie zeigt nur an. tests/versand.test.ts hält beide gleich.
export function shippingFor(goodsTotal: number, hasLab: boolean, flat: number, freeFrom: number): number {
  if (!hasLab || !(flat > 0)) return 0;
  if (freeFrom > 0 && goodsTotal >= freeFrom) return 0;
  return Math.round(flat * 100) / 100;
}

export function hasLabItem(list: ImagePriceObject[]): boolean {
  return list.some((obj) => obj.price.some((p) => Boolean(p.labSku) && p.quantity > 0));
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `npx vitest run tests/versand.test.ts`
Expected: PASS

- [ ] **Step 5: `labSku` bis in den Warenkorb durchreichen**

In `src/pages/user/PricingPage.tsx`, `fetchPrices`, im zurückgegebenen Objekt `labSku: record.labSku,` ergänzen. `PricingForm.setQuantity` kopiert den Preis per Spread (`{ ...price, quantity }`), das Feld kommt also mit.

- [ ] **Step 6: `PaymentForm.tsx` anpassen**

1. Imports: `import { Selector } from "@astryxdesign/core/Selector";` und `import { hasLabItem, shippingFor } from "../../utils/shipping";`.
2. Über der Komponente:

```tsx
// Länder, in die Prodigi aus der EU liefert und die hier realistisch bestellt
// werden. Erweitern ist eine Zeile; die Prüfung macht Prodigi beim Senden.
const LAENDER: { value: string; label: string }[] = [
  { value: "DE", label: "Deutschland" }, { value: "AT", label: "Österreich" },
  { value: "CH", label: "Schweiz" }, { value: "NL", label: "Niederlande" },
  { value: "BE", label: "Belgien" }, { value: "LU", label: "Luxemburg" },
  { value: "FR", label: "Frankreich" }, { value: "IT", label: "Italien" },
  { value: "DK", label: "Dänemark" }, { value: "PL", label: "Polen" },
];
```

3. `settings` ist in der Komponente schon da (`const { settings } = useSettings();`, Zeile ~120). Dann die Berechnung von `totalPrice`/`totalLabel` ersetzen durch:

```tsx
  const goodsTotal = shootingPackage && calculateTotalPrice(imagePriceObjectList) === 0
    ? parseFloat(calculateTotalPackagePrice(shootingPackage, selectedImages.length))
    : calculateTotalPrice(imagePriceObjectList);
  // Pakete verkaufen Bilder, keine Abzüge — Versand nur bei Einzelpreisen
  const hasLab = !shootingPackage && hasLabItem(imagePriceObjectList);
  const shipping = shippingFor(goodsTotal, hasLab, settings.shippingFlat ?? 0, settings.freeShippingFrom ?? 0);
  const totalPrice = goodsTotal + shipping;
  const totalLabel = `${totalPrice.toFixed(2)} €`;
```

4. Direkt vor der Zeile „Gesamtpreis“ (`<div {...stylex.props(s.totalRow)}>`) einfügen:

```tsx
        {hasLab && (
          <div {...stylex.props(s.totalRow)}>
            <Text type="body" color="secondary">Versand</Text>
            <Text type="body">{shipping > 0 ? `${shipping.toFixed(2)} €` : "kostenlos"}</Text>
          </div>
        )}
```

5. In der Lieferadresse statt des „Bundesland“-Felds (die `s.full`-Zelle) zwei Zellen:

```tsx
            <TextInput
              width="100%"
              label="Bundesland"
              value={userData.state ?? ""}
              onChange={(v) => setUserData((prev: any) => ({ ...prev, state: v }))}
            />
            <Selector
              width="100%"
              label="Land"
              options={LAENDER}
              value={userData.country || "DE"}
              onChange={(v) => setUserData((prev: any) => ({ ...prev, country: v ?? "DE" }))}
            />
```

`calculateTotalPackagePrice` liefert einen String (deshalb `parseFloat`), `calculateTotalPrice` eine Zahl. `goodsTotal` ist also immer eine Zahl, und der alte `typeof`-Zweig in `totalLabel` fällt weg.

- [ ] **Step 7: Typprüfung, Lint, alle Unit-Tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/features/Pricing && npx vitest run`
Expected: keine Fehler, alle Tests PASS

- [ ] **Step 8: Im Browser prüfen**

`make dev`. Unter `/print` gibt es noch keine Einstellungsseite, deshalb die Pauschale über `http://localhost:8091/_/` → `settings` → `shippingFlat = 4.9` setzen. Als Kund:in ein Album mit dem Laborpreis aus Task 7 öffnen, einen Abzug wählen, weiter zur Zahlung: Die Zeile „Versand 4,90 €“ erscheint, der Gesamtpreis enthält sie, und das Land steht auf Deutschland. Mit einem rein digitalen Bild erscheint keine Versandzeile.

- [ ] **Step 9: Commit**

```bash
git add src/features/Pricing/utils/shipping.ts tests/versand.test.ts src/pages/user/PricingPage.tsx src/features/Pricing/components/customer/PaymentForm.tsx
git commit -m "Druckaufträge: Versand und Land im Checkout"
```

---

### Task 9: Admin-Seite „Druckaufträge“

**Files:**
- Create: `src/features/Print/api.ts`
- Create: `src/features/Print/PrintSettings.tsx`
- Create: `src/pages/admin/PrintJobsPage.tsx`
- Modify: `src/App.tsx` (Admin-Routen, neben `payments`)
- Modify: `src/utils/routes.ts` (Gruppe `verkauf`)

**Interfaces:**
- Consumes: Endpunkte aus Task 5, `AppSettings`-Felder aus Task 7
- Produces: Route `/print`

- [ ] **Step 1: `api.ts`**

```ts
import { pb } from "../../config/pocketbase";

// Spiegel der Sammlung printJobs (pb_migrations/1785900001_druckauftraege.js)
export type PrintStatus =
  | "awaiting_approval" | "submitted" | "in_production" | "shipped"
  | "delivered_to_customer" | "cancelled" | "failed";
export type PrintRoute = "customer" | "studio";

export interface PrintRecipient {
  name: string; email: string; phone: string; line1: string;
  postalCode: string; city: string; state: string; countryCode: string;
}

export interface PrintItem { image: string; sku: string; copies: number; originalId: string }

export interface PrintJob {
  id: string;
  created: string;
  orderId: string;
  route: PrintRoute;
  recipient: PrintRecipient;
  items: PrintItem[];
  status: PrintStatus;
  labOrderId: string;
  trackingUrl: string;
  trackingNumber: string;
  labCost: string;
  error: string;
}

export const STATUS_TEXTE: Record<PrintStatus, { label: string; variant: "info" | "neutral" | "success" | "warning" | "error" }> = {
  awaiting_approval: { label: "Wartet auf Freigabe", variant: "warning" },
  submitted: { label: "Beim Labor", variant: "info" },
  in_production: { label: "In Produktion", variant: "info" },
  shipped: { label: "Versendet", variant: "success" },
  delivered_to_customer: { label: "An Kund:in versendet", variant: "success" },
  cancelled: { label: "Storniert", variant: "neutral" },
  failed: { label: "Fehlgeschlagen", variant: "error" },
};

export async function listJobs(): Promise<PrintJob[]> {
  return pb.collection("printJobs").getFullList<PrintJob>({ sort: "-created", requestKey: null });
}

export async function setRoute(id: string, route: PrintRoute): Promise<void> {
  await pb.collection("printJobs").update(id, { route });
}

async function action(id: string, name: "submit" | "cancel" | "delivered", body: object = {}): Promise<void> {
  await pb.send(`/api/custom/print/${id}/${name}`, { method: "POST", body });
}

export const submitJob = (id: string) => action(id, "submit");
export const cancelJob = (id: string) => action(id, "cancel");
export const markDelivered = (id: string, trackingNumber: string, trackingUrl: string) =>
  action(id, "delivered", { trackingNumber, trackingUrl });

export async function saveProdigiKey(apiKey: string, live: boolean): Promise<{ enabled: boolean; live: boolean }> {
  return pb.send("/api/custom/prodigi/config", { method: "POST", body: { apiKey, live } });
}
```

- [ ] **Step 2: `PrintSettings.tsx`**

```tsx
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { pb } from "../../config/pocketbase";
import { SETTINGS_RECORD_ID, StudioAddress } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import { SectionCard, sf } from "../Settings/components/SettingsSection";
import { saveProdigiKey } from "./api";

export default function PrintSettings(): ReactElement {
  const { settings, loaded, refresh } = useSettings();
  const [apiKey, setApiKey] = useState("");
  const [live, setLive] = useState(settings.prodigiLive);
  const [route, setRoute] = useState(settings.printDefaultRoute);
  const [studio, setStudio] = useState<StudioAddress>(settings.studioAddress);
  const [flat, setFlat] = useState(String(settings.shippingFlat || ""));
  const [freeFrom, setFreeFrom] = useState(String(settings.freeShippingFrom || ""));
  const [savingKey, setSavingKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive(settings.prodigiLive);
    setRoute(settings.printDefaultRoute || "customer");
    setStudio({ name: "", line1: "", zip: "", city: "", country: "DE", ...(settings.studioAddress ?? {}) });
    setFlat(String(settings.shippingFlat || ""));
    setFreeFrom(String(settings.freeShippingFrom || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  async function saveKey(key: string) {
    setSavingKey(true);
    try {
      const res = await saveProdigiKey(key, live);
      await refresh();
      setApiKey("");
      toast.success(res.enabled
        ? (res.live ? "Prodigi ist verbunden (Live)" : "Prodigi ist verbunden (Testmodus — es wird nichts gedruckt)")
        : "Prodigi wurde getrennt");
    } catch (e: any) {
      toast.error(e?.response?.message ?? "Der Schlüssel konnte nicht gespeichert werden");
    } finally {
      setSavingKey(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await pb.collection("settings").update(SETTINGS_RECORD_ID, {
        printDefaultRoute: route,
        studioAddress: studio,
        shippingFlat: parseFloat(flat.replace(",", ".")) || 0,
        freeShippingFrom: parseFloat(freeFrom.replace(",", ".")) || 0,
      });
      await refresh();
      toast.success("Gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const setAddr = (patch: Partial<StudioAddress>) => setStudio((a) => ({ ...a, ...patch }));

  return (
    <div {...stylex.props(sf.sections)}>
      <SectionCard
        title="Prodigi verbinden"
        subtitle={settings.prodigiEnabled
          ? (settings.prodigiLive ? "Verbunden (Live)" : "Verbunden (Testmodus)")
          : "Noch nicht verbunden"}
      >
        <div {...stylex.props(sf.grid1)}>
          <Text type="body" color="secondary">
            Prodigi druckt und versendet in deinem Namen und rechnet direkt mit dir ab.
            Den API-Schlüssel findest du im Prodigi-Dashboard unter „Settings“.
            Name und Adresse deiner Kund:innen gehen dabei an Prodigi — schließe
            dort den Auftragsverarbeitungsvertrag (AV-Vertrag) ab.
          </Text>
          <TextInput width="100%" type="password" label="Prodigi-API-Schlüssel"
            value={apiKey} onChange={setApiKey}
            description={settings.prodigiEnabled ? "Ein Schlüssel ist hinterlegt. Zum Ersetzen den neuen einfügen." : undefined} />
          <Switch label={live ? "Live (echte Drucke)" : "Testmodus (Sandbox — es wird nichts gedruckt)"}
            value={live} onChange={setLive} />
          <div {...stylex.props(sf.saveRow)}>
            {settings.prodigiEnabled && (
              <Button variant="destructive" label="Trennen" isDisabled={savingKey} onClick={() => void saveKey("")} />
            )}
            <Button variant="primary" label="Speichern & prüfen" isLoading={savingKey}
              isDisabled={savingKey || apiKey.trim() === ""} onClick={() => void saveKey(apiKey.trim())} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Lieferung & Versand" subtitle="Gilt für jede neue Druckbestellung">
        <div {...stylex.props(sf.grid2)}>
          <div {...stylex.props(sf.full)}>
            <Selector width="100%" label="Wohin schickt das Labor?"
              options={[
                { value: "customer", label: "Direkt an die Kund:in" },
                { value: "studio", label: "An mich — ich versende selbst weiter" },
              ]}
              value={route} onChange={(v) => v && setRoute(v as "customer" | "studio")}
              description="Lässt sich bei jedem Auftrag vor der Freigabe ändern." />
          </div>
          <TextInput width="100%" label="Versandpauschale (€)" value={flat} onChange={setFlat}
            description="Wird einmal pro Bestellung mit Drucken berechnet." />
          <TextInput width="100%" label="Versandkostenfrei ab (€)" value={freeFrom} onChange={setFreeFrom}
            description="Leer lassen, wenn es keine Grenze gibt." />
          <div {...stylex.props(sf.full)}>
            <Text type="body" weight="semibold">Deine Adresse für „An mich“</Text>
          </div>
          <TextInput width="100%" label="Name / Studio" value={studio.name} onChange={(v) => setAddr({ name: v })} />
          <TextInput width="100%" label="Straße & Hausnummer" value={studio.line1} onChange={(v) => setAddr({ line1: v })} />
          <TextInput width="100%" label="PLZ" value={studio.zip} onChange={(v) => setAddr({ zip: v })} />
          <TextInput width="100%" label="Stadt" value={studio.city} onChange={(v) => setAddr({ city: v })} />
          <TextInput width="100%" label="Land (Kürzel)" value={studio.country}
            onChange={(v) => setAddr({ country: v.toUpperCase().slice(0, 2) })} description="z. B. DE" />
        </div>
        <div {...stylex.props(sf.saveRow)}>
          <Button variant="primary" label="Speichern" isLoading={saving} isDisabled={saving} onClick={() => void save()} />
        </div>
      </SectionCard>
    </div>
  );
}
```

- [ ] **Step 3: `PrintJobsPage.tsx`**

```tsx
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import PageLoader from "../../components/feedback/PageLoader";
import Page from "../../components/layout/Page";
import PrintSettings from "../../features/Print/PrintSettings";
import {
  PrintJob, PrintRoute, STATUS_TEXTE, cancelJob, listJobs, markDelivered, setRoute, submitJob,
} from "../../features/Print/api";
import { SectionCard, sf } from "../../features/Settings/components/SettingsSection";

const s = stylex.create({
  row: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
});

function fehlertext(e: any): string {
  return e?.response?.message ?? "Das hat nicht geklappt";
}

function JobCard({ job, onChange }: { job: PrintJob; onChange: () => Promise<void> }): ReactElement {
  const [busy, setBusy] = useState(false);
  const [nr, setNr] = useState("");
  const [url, setUrl] = useState("");
  const st = STATUS_TEXTE[job.status];
  const editable = job.status === "awaiting_approval" || (job.status === "failed" && !job.labOrderId);
  const canSubmit = job.status === "awaiting_approval" || job.status === "failed";
  const canCancel = !["cancelled", "shipped", "delivered_to_customer"].includes(job.status);
  const r = job.recipient;
  const copies = job.items.reduce((n, it) => n + it.copies, 0);

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(fehlertext(e));
    } finally {
      await onChange();
      setBusy(false);
    }
  }

  return (
    <SectionCard
      title={`Bestellung ${job.orderId}`}
      subtitle={`${new Date(job.created).toLocaleString("de-DE")} · ${copies} ${copies === 1 ? "Druck" : "Drucke"}`}
    >
      <div {...stylex.props(sf.grid1)}>
        <div {...stylex.props(s.row)}>
          <Badge variant={st.variant} label={st.label} />
          {job.labCost && <Text type="supporting" color="secondary">Laborkosten: {job.labCost}</Text>}
        </div>
        <Text type="body">
          {r.name}, {r.line1}, {r.postalCode} {r.city}, {r.countryCode}
        </Text>
        <Selector
          width="100%"
          label="Lieferweg"
          isDisabled={!editable || busy}
          options={[
            { value: "customer", label: "Direkt an die Kund:in" },
            { value: "studio", label: "An mich" },
          ]}
          value={job.route}
          onChange={(v) => v && void run(() => setRoute(job.id, v as PrintRoute), "Lieferweg geändert")}
        />
        {job.error && <Banner status="error" title={job.error} />}
        {job.trackingNumber && (
          <Text type="body">
            Sendung: {job.trackingUrl
              ? <a href={job.trackingUrl} target="_blank" rel="noopener noreferrer">{job.trackingNumber}</a>
              : job.trackingNumber}
          </Text>
        )}
        {job.route === "studio" && job.status === "shipped" && (
          <div {...stylex.props(sf.grid2)}>
            <TextInput width="100%" label="Deine Sendungsnummer (optional)" value={nr} onChange={setNr} />
            <TextInput width="100%" label="Link zur Sendungsverfolgung (optional)" value={url} onChange={setUrl} />
          </div>
        )}
        <div {...stylex.props(s.row)}>
          {canSubmit && (
            <Button variant="primary" isLoading={busy} isDisabled={busy}
              label={job.status === "failed" ? "Erneut senden" : "An Labor senden"}
              onClick={() => void run(() => submitJob(job.id), "An Prodigi gesendet")} />
          )}
          {job.route === "studio" && job.status === "shipped" && (
            <Button variant="primary" isDisabled={busy} label="An Kund:in versendet"
              onClick={() => void run(() => markDelivered(job.id, nr, url), "Kund:in wurde benachrichtigt")} />
          )}
          {canCancel && (
            <Button variant="destructive" isDisabled={busy} label="Stornieren"
              onClick={() => void run(() => cancelJob(job.id), "Auftrag storniert")} />
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export default function PrintJobsPage(): ReactElement {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setJobs(await listJobs());
    } catch {
      toast.error("Druckaufträge konnten nicht geladen werden");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Page
      title="Druckaufträge"
      subtitle="Bestellte Drucke prüfen, freigeben und verfolgen. Erst nach deiner Freigabe geht ein Auftrag an Prodigi."
      showTitleOnMobile
    >
      <div {...stylex.props(sf.sections)}>
        <PrintSettings />
        {loading ? <PageLoader /> : jobs.length === 0 ? (
          <Text type="body" color="secondary">Noch keine Druckaufträge.</Text>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} onChange={load} />)
        )}
      </div>
    </Page>
  );
}
```

- [ ] **Step 4: Route und Navigation**

`src/App.tsx`: `import PrintJobsPage from "./pages/admin/PrintJobsPage";` zu den Admin-Seiten-Imports, und neben `<Route path="payments" …/>`:

```tsx
                  <Route path="print" element={<PrintJobsPage />} />
```

`src/utils/routes.ts`: `Printer` zum `lucide-react`-Import hinzufügen und in der Gruppe `verkauf` nach `orders`:

```ts
      { key: "print", label: "Druckaufträge", path: "/print", Icon: Printer },
```

- [ ] **Step 5: Typprüfung, Lint, Unit-Tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/features/Print src/pages/admin/PrintJobsPage.tsx src/utils/routes.ts && npx vitest run`
Expected: keine Fehler, alle Tests PASS

- [ ] **Step 6: Im Browser prüfen**

`make dev`, als Admin `/print` öffnen. „Druckaufträge“ steht in der Navigation unter „Verkauf“. Die Versandpauschale lässt sich speichern und bleibt nach dem Neuladen erhalten. Einen Prodigi-Schlüssel mit falschem Inhalt eingeben: Die Fehlermeldung aus dem Server erscheint als Toast.

- [ ] **Step 7: Commit**

```bash
git add src/features/Print src/pages/admin/PrintJobsPage.tsx src/App.tsx src/utils/routes.ts
git commit -m "Druckaufträge: Admin-Seite"
```

---

### Task 10: Durchlauf gegen die Prodigi-Sandbox (manuell)

Nicht in der CI, weil dafür ein echter Sandbox-Schlüssel und eine öffentlich erreichbare Instanz nötig sind (Prodigi muss die Druckdatei und den Webhook erreichen).

**Files:** keine Änderungen, außer bei einem Befund

- [ ] **Step 1: Instanz öffentlich machen**

Entweder eine Test-Instanz mit eigener Domain nehmen oder die Dev-Instanz tunneln (z. B. `cloudflared tunnel --url http://localhost:8091`). Unter `/_/` → Settings → Application die App-URL auf die öffentliche Adresse setzen.

- [ ] **Step 2: Einrichten**

Auf `/print` den Sandbox-Schlüssel eintragen, Testmodus, „Speichern & prüfen“. Erwartet: „Prodigi ist verbunden (Testmodus …)“. Versandpauschale 4,90, frei ab 50, Studioadresse ausfüllen.

- [ ] **Step 3: Bestellen und freigeben (Weg „Direkt an Kund:in“)**

Als Kund:in einen Abzug mit Laborprodukt kaufen (Stripe-Testkarte 4242 4242 4242 4242). Erwartet:
- Der Checkout zeigt „Versand 4,90 €“, und Stripe bucht dieselbe Summe ab.
- In Mailpit (`localhost:8025`) liegt „Neue Druckbestellung wartet auf Freigabe“.
- Auf `/print` steht der Auftrag mit „Wartet auf Freigabe“.

„An Labor senden“ klicken. Erwartet: Status „Beim Labor“ oder „In Produktion“, und im Prodigi-Sandbox-Dashboard liegt der Auftrag mit dem richtigen Bild (Vorschau dort öffnen).

- [ ] **Step 4: Webhook prüfen**

Im Prodigi-Sandbox-Dashboard den Auftrag auf „Shipped“ setzen, falls die Sandbox das anbietet. Sonst den Rückruf von Hand auslösen:

```bash
curl -s -X POST "$APP_URL/api/custom/prodigi/callback" -H 'Content-Type: application/json' -d "{\"subject\":\"$LAB_ORDER_ID\"}"
```

Erwartet: Der Status auf `/print` entspricht dem Stand bei Prodigi. Beim Wechsel auf „Versendet“ liegt in Mailpit genau eine Mail an die Kund:in.

- [ ] **Step 5: Weg „An mich“ und Storno**

Eine zweite Bestellung aufgeben, den Lieferweg vor der Freigabe auf „An mich“ stellen und senden. Prodigi muss die Studioadresse als Empfänger zeigen. Eine dritte Bestellung vor der Freigabe stornieren: Der Status wird „Storniert“, und bei Prodigi entsteht nichts.

- [ ] **Step 6: Befunde festhalten**

Weicht etwas ab, einen Fix mit Test im passenden Task-Muster nachziehen. Läuft alles durch, in `ROADMAP.md` unter dem passenden Abschnitt eine Zeile „Druckaufträge über Prodigi“ als erledigt eintragen und committen:

```bash
git add ROADMAP.md
git commit -m "Druckaufträge: Sandbox-Durchlauf bestanden"
```
