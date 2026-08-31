# Verkaufsbereitschaft — Implementierungsplan

> **Für agentische Ausführung:** ERFORDERLICHE UNTER-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, Aufgabe für Aufgabe. Die Schritte tragen Checkboxen (`- [ ]`) zum Mitführen.

**Ziel:** Die Verkaufsbereitschaft einer Instanz wird ein an genau einer Stelle definierter Zustand — durchgesetzt am Server, sichtbar in Seitenleiste und Album, erklärt auf einer immer erreichbaren Checkliste; dazu wird `/branding` in vier Seiten zerlegt und die Seitenleiste gruppiert.

**Architektur:** Die Prüfung lebt als reine Funktion in `pb_hooks/lib/verkaufslib.js` und wird von zwei Seiten benutzt: einem öffentlichen `GET`-Endpunkt für die Oberfläche und einem direkten Guard am Kopf der beiden Zahlungs-Endpunkte. Im Frontend hängt das Ergebnis an `SettingsContext`, dessen `refresh()` nach jedem Speichern ohnehin schon läuft.

**Tech-Stack:** React 19 + TypeScript + StyleX + Astryx (`@astryxdesign/core`) · PocketBase JSVM (Goja) für `pb_hooks` · Vitest (Node-Umgebung, `tests/**/*.test.ts`) · Playwright (`e2e/tests/**`).

**Spec:** `docs/verkaufsbereitschaft.md` (Commit `bfd8c6e2`)

## Globale Randbedingungen

- **Sprache:** Alle Oberflächentexte auf Deutsch, geduzt („dein Album", „du kannst"). Bezeichner und Kommentare folgen dem Umfeld: `pb_hooks/lib` schreibt `var`/`function` ohne Pfeilfunktionen und exportiert `{ name: name }` explizit (siehe `checkoutlib.js:206`), `src/` schreibt modernes TS.
- **JSVM-Grenzen:** `pb_hooks` läuft in Goja, nicht in Node. Kein `import`, nur `require(__hooks + "/lib/…")`. Jede Hook-Datei beginnt mit `/// <reference path="../pb_data/types.d.ts" />`.
- **Testbarkeit der Hook-Logik:** Vitest läuft mit `environment: "node"` und bindet Hook-Helfer per `createRequire` direkt ein (`tests/previewSession.test.ts:7`). Damit die Prüfung unit-testbar bleibt, **darf sie `$app` nicht anfassen** — das Lesen aus PocketBase steckt in einer eigenen Funktion.
- **Die vier harten Punkte** (verbatim aus der Spec): `zahlung` (`paypalEnabled || stripeEnabled`) · `katalog` (`prices` **oder** `packages` nicht leer) · `recht` (`imprintHtml` **und** `privacyHtml` nicht leer) · `bestellmail` (`orderNotificationEmail` gesetzt).
- **Die fünf weichen Punkte:** `name` · `logo` · `kontaktmail` · `domain` · `wasserzeichen`.
- **Kundentext bei Sperre**, wörtlich: „Der Bilderkauf ist gerade nicht möglich. Bitte später erneut versuchen." Nennt nie einen Grund.
- **Hooks werden nicht gemountet.** `docker-compose.dev.yml` bindet nur `pb_data_dev` ein; nach jeder Änderung an `pb_hooks/` ist `make dev` (baut neu) nötig, bevor E2E oder manuelle Prüfung greifen.
- **Vor jedem Commit:** `npm run lint` und `npx tsc --noEmit` müssen sauber sein.

---

## Dateiübersicht

**Neu**

| Datei | Verantwortung |
|---|---|
| `pb_hooks/lib/verkaufslib.js` | Reine Prüfung + Lesen aus PocketBase. Einzige Quelle. |
| `pb_hooks/verkauf.pb.js` | `GET /api/custom/verkaufsbereitschaft` |
| `tests/verkaufsbereitschaft.test.ts` | Unit-Tests für Prüfung und Frontend-Ableitung |
| `src/utils/verkauf.ts` | Typen, Beschriftungen, Zielrouten, `ableiten()`, `fetchVerkauf()` |
| `src/features/Settings/useSettingsDraft.ts` | Gemeinsamer Entwurf + Speichern für die vier Einstellungsseiten |
| `src/features/Settings/components/SettingsSection.tsx` | `SectionCard`, `ImageDrop`, `ColorField`, `Herkunft` + geteilte Styles |
| `src/pages/admin/DomainPage.tsx` | Eigene Domain |
| `src/pages/admin/KontaktPage.tsx` | Kontakt, Bestell-E-Mail, Website, Währung |
| `src/pages/admin/BilderPage.tsx` | Wasserzeichen, Vorschaugröße, Neu-Erzeugen |
| `src/pages/admin/EinrichtungPage.tsx` | Die Checkliste |
| `e2e/tests/einstellungen/einrichtung.spec.ts` | Checkliste + Badge |
| `e2e/tests/einstellungen/verkauf-gesperrt.spec.ts` | Kundenansicht bei Sperre |
| `e2e/tests/admin/navigation.spec.ts` | Sidebar-Gruppen |

**Geändert**

| Datei | Änderung |
|---|---|
| `pb_hooks/paypal.pb.js:81` | Guard nach dem Laden von `settings` |
| `pb_hooks/stripe.pb.js:75` | dito |
| `src/context/SettingsContext.tsx` | `verkauf` im Wert, `refresh()` lädt beides |
| `src/utils/routes.ts` | `NavGroup`, `adminNavGroups`, neue Einträge |
| `src/components/layout/AppShell.tsx` | Gruppen als `<details>`, Badge |
| `src/pages/admin/BrandingPage.tsx` | auf den Branding-Teil eingedampft, Wizard raus |
| `src/components/SetupRedirect.tsx` | zeigt auf `/einrichtung` |
| `src/App.tsx` | vier neue Admin-Routen |
| `src/pages/admin/AdminAlbumPage.tsx` | Warnbanner |
| `src/features/Album/components/Album.tsx:284` | „Kaufen" gesperrt |
| `src/pages/user/PricingPage.tsx` | Hinweis statt Kasse |
| `src/content/help/adminArticles.ts` | `relatedPath` auf die neuen Routen |
| `e2e/tests/einstellungen/branding.spec.ts` | Selektoren folgen dem Split |

---

## Task 1: Prüflogik in `pb_hooks/lib/verkaufslib.js`

**Dateien:**
- Anlegen: `pb_hooks/lib/verkaufslib.js`
- Test: `tests/verkaufsbereitschaft.test.ts`

**Schnittstellen:**
- Konsumiert: nichts.
- Produziert:
  - `pruefeVerkaufsbereitschaft(werte) -> Array<{ key: string, hart: boolean, erfuellt: boolean }>` — reine Funktion, feste Reihenfolge: erst die vier harten in der Reihenfolge `zahlung, katalog, recht, bestellmail`, dann die fünf weichen `name, logo, kontaktmail, domain, wasserzeichen`.
  - `offeneHarte(punkte) -> string[]`
  - `leseWerte(app) -> werte` — braucht `$app`.
  - `istGesperrt(app) -> boolean`

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

Datei `tests/verkaufsbereitschaft.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Wie tests/previewSession.test.ts: der Hook-Helfer ist CommonJS und wird
// direkt eingebunden, damit Test und Server denselben Code benutzen.
const require = createRequire(import.meta.url);
const verkauf = require("../pb_hooks/lib/verkaufslib.js");

// Eine Instanz, bei der alles eingerichtet ist. Jeder Test nimmt genau eine
// Bedingung weg — so steht in der Fehlermeldung immer, welche gemeint war.
const VOLLSTAENDIG = {
  paypalEnabled: true,
  stripeEnabled: false,
  katalogGefuellt: true,
  imprintHtml: "<p>Impressum</p>",
  privacyHtml: "<p>Datenschutz</p>",
  orderNotificationEmail: "bestellungen@example.test",
  businessName: "Atelier Lichtblick",
  logo: "logo.png",
  contactEmail: "hallo@example.test",
  customDomain: "fotos.example.test",
  watermarkText: "© Atelier",
  watermarkLogo: "",
};

const punktMit = (werte: Record<string, unknown>, key: string) =>
  verkauf.pruefeVerkaufsbereitschaft(werte).find((p: any) => p.key === key);

describe("Verkaufsbereitschaft — harte Punkte", () => {
  it("ist bei vollstaendiger Einrichtung nicht gesperrt", () => {
    const punkte = verkauf.pruefeVerkaufsbereitschaft(VOLLSTAENDIG);
    expect(verkauf.offeneHarte(punkte)).toEqual([]);
  });

  it("zaehlt zahlung als erfuellt, wenn nur Stripe aktiv ist", () => {
    const werte = { ...VOLLSTAENDIG, paypalEnabled: false, stripeEnabled: true };
    expect(punktMit(werte, "zahlung").erfuellt).toBe(true);
  });

  it("sperrt, wenn kein Zahlungsanbieter aktiv ist", () => {
    const werte = { ...VOLLSTAENDIG, paypalEnabled: false, stripeEnabled: false };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte))).toEqual(["zahlung"]);
  });

  it("sperrt bei leerem Katalog", () => {
    const werte = { ...VOLLSTAENDIG, katalogGefuellt: false };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte))).toEqual(["katalog"]);
  });

  it("verlangt beide Rechtstexte, nicht nur einen", () => {
    expect(punktMit({ ...VOLLSTAENDIG, privacyHtml: "" }, "recht").erfuellt).toBe(false);
    expect(punktMit({ ...VOLLSTAENDIG, imprintHtml: "" }, "recht").erfuellt).toBe(false);
  });

  it("wertet reinen Leerraum nicht als Rechtstext", () => {
    expect(punktMit({ ...VOLLSTAENDIG, imprintHtml: "   \n  " }, "recht").erfuellt).toBe(false);
  });

  it("sperrt ohne Bestell-Benachrichtigungsadresse", () => {
    const werte = { ...VOLLSTAENDIG, orderNotificationEmail: "" };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte))).toEqual(["bestellmail"]);
  });

  it("meldet mehrere offene Punkte in fester Reihenfolge", () => {
    const werte = { ...VOLLSTAENDIG, paypalEnabled: false, imprintHtml: "", orderNotificationEmail: "" };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte)))
      .toEqual(["zahlung", "recht", "bestellmail"]);
  });

  it("sperrt eine voellig leere Instanz mit allen vier harten Punkten", () => {
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft({})))
      .toEqual(["zahlung", "katalog", "recht", "bestellmail"]);
  });
});

describe("Verkaufsbereitschaft — weiche Punkte", () => {
  it("liefert neun Punkte, vier davon hart", () => {
    const punkte = verkauf.pruefeVerkaufsbereitschaft(VOLLSTAENDIG);
    expect(punkte).toHaveLength(9);
    expect(punkte.filter((p: any) => p.hart)).toHaveLength(4);
  });

  it("sperrt nie wegen eines weichen Punktes", () => {
    const werte = {
      ...VOLLSTAENDIG,
      businessName: "", logo: "", contactEmail: "",
      customDomain: "", watermarkText: "", watermarkLogo: "",
    };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte))).toEqual([]);
  });

  it("zaehlt den unveraenderten Vorgabenamen nicht als gesetzt", () => {
    expect(punktMit({ ...VOLLSTAENDIG, businessName: "Fotogalerie" }, "name").erfuellt).toBe(false);
  });

  it("akzeptiert ein Wasserzeichen-Logo statt eines Textes", () => {
    const werte = { ...VOLLSTAENDIG, watermarkText: "", watermarkLogo: "wm.png" };
    expect(punktMit(werte, "wasserzeichen").erfuellt).toBe(true);
  });
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Ausführen: `npx vitest run tests/verkaufsbereitschaft.test.ts`
Erwartet: FAIL — `Cannot find module '../pb_hooks/lib/verkaufslib.js'`

- [ ] **Schritt 3: Die minimale Implementierung schreiben**

Datei `pb_hooks/lib/verkaufslib.js`:

```js
/// <reference path="../../pb_data/types.d.ts" />
//
// Einzige Quelle für die Frage "kann diese Instanz Fotos verkaufen?".
// Benutzt von pb_hooks/verkauf.pb.js (öffentlicher Endpunkt für die
// Oberfläche) und direkt von paypal.pb.js / stripe.pb.js (Guard). Drei
// Kopien derselben Bedingungen würden auseinanderdriften, und die Kopie,
// die am Ende falsch ist, wäre die im Server — also die, an der Geld hängt.
//
// pruefeVerkaufsbereitschaft() fasst bewusst kein $app an: nur so lässt sie
// sich in tests/verkaufsbereitschaft.test.ts unter Node einbinden. Das Lesen
// aus PocketBase steckt getrennt in leseWerte().

// Reihenfolge ist Teil der Zusage: die Oberfläche zeigt die Punkte so an.
var HARTE = ["zahlung", "katalog", "recht", "bestellmail"];
var WEICHE = ["name", "logo", "kontaktmail", "domain", "wasserzeichen"];

// Vorgabe aus src/config/settings.ts (DEFAULT_SETTINGS.businessName). Wer sie
// nie geändert hat, hat den Namen nicht gesetzt.
var NAME_VORGABE = "Fotogalerie";

function nichtLeer(wert) {
  return String(wert || "").trim() !== "";
}

function pruefeVerkaufsbereitschaft(werte) {
  var w = werte || {};
  var erfuellt = {
    zahlung: Boolean(w.paypalEnabled) || Boolean(w.stripeEnabled),
    katalog: Boolean(w.katalogGefuellt),
    recht: nichtLeer(w.imprintHtml) && nichtLeer(w.privacyHtml),
    bestellmail: nichtLeer(w.orderNotificationEmail),
    name: nichtLeer(w.businessName) && String(w.businessName).trim() !== NAME_VORGABE,
    logo: nichtLeer(w.logo),
    kontaktmail: nichtLeer(w.contactEmail),
    domain: nichtLeer(w.customDomain),
    wasserzeichen: nichtLeer(w.watermarkText) || nichtLeer(w.watermarkLogo),
  };

  var punkte = [];
  var sammle = function (keys, hart) {
    for (var i = 0; i < keys.length; i++) {
      punkte.push({ key: keys[i], hart: hart, erfuellt: erfuellt[keys[i]] });
    }
  };
  sammle(HARTE, true);
  sammle(WEICHE, false);
  return punkte;
}

function offeneHarte(punkte) {
  var offen = [];
  var liste = punkte || [];
  for (var i = 0; i < liste.length; i++) {
    if (liste[i].hart && !liste[i].erfuellt) offen.push(liste[i].key);
  }
  return offen;
}

// Zählt nicht, sondern fragt nur "gibt es überhaupt eins" — mehr braucht die
// Prüfung nicht. Muster aus pb_hooks/lib/seeddemolib.js:23.
function hatRecords(app, name) {
  try {
    return app.findRecordsByFilter(name, "id != ''", "", 1, 0).length > 0;
  } catch (_) {
    return false;
  }
}

function leseWerte(app) {
  var s = null;
  try {
    s = app.findRecordById("settings", "appsettings0001");
  } catch (_) {
    // noch nicht geseedet — dann ist nichts eingerichtet, und genau das
    // meldet die Prüfung mit den Vorgaben unten
  }
  var text = function (feld) {
    return s ? s.getString(feld) : "";
  };
  return {
    paypalEnabled: s ? s.getBool("paypalEnabled") : false,
    stripeEnabled: s ? s.getBool("stripeEnabled") : false,
    katalogGefuellt: hatRecords(app, "prices") || hatRecords(app, "packages"),
    imprintHtml: text("imprintHtml"),
    privacyHtml: text("privacyHtml"),
    orderNotificationEmail: text("orderNotificationEmail"),
    businessName: text("businessName"),
    logo: text("logo"),
    contactEmail: text("contactEmail"),
    customDomain: text("customDomain"),
    watermarkText: text("watermarkText"),
    watermarkLogo: text("watermarkLogo"),
  };
}

function istGesperrt(app) {
  return offeneHarte(pruefeVerkaufsbereitschaft(leseWerte(app))).length > 0;
}

module.exports = {
  pruefeVerkaufsbereitschaft: pruefeVerkaufsbereitschaft,
  offeneHarte: offeneHarte,
  leseWerte: leseWerte,
  istGesperrt: istGesperrt,
};
```

- [ ] **Schritt 4: Tests laufen lassen, Erfolg bestätigen**

Ausführen: `npx vitest run tests/verkaufsbereitschaft.test.ts`
Erwartet: PASS, 13 Tests

- [ ] **Schritt 5: Committen**

```bash
git add pb_hooks/lib/verkaufslib.js tests/verkaufsbereitschaft.test.ts
git commit -m "feat(verkauf): Pruefung der Verkaufsbereitschaft als reine Funktion"
```

---

## Task 2: Öffentlicher Endpunkt

**Dateien:**
- Anlegen: `pb_hooks/verkauf.pb.js`

**Schnittstellen:**
- Konsumiert: `verkaufslib.pruefeVerkaufsbereitschaft`, `verkaufslib.leseWerte` (Task 1).
- Produziert: `GET /api/custom/verkaufsbereitschaft` → `200 { "punkte": [{ "key": "zahlung", "hart": true, "erfuellt": false }, …] }`

- [ ] **Schritt 1: Den Endpunkt schreiben**

Datei `pb_hooks/verkauf.pb.js`:

```js
/// <reference path="../pb_data/types.d.ts" />
//
// Liefert der Oberfläche den Stand der Verkaufsbereitschaft.
//
// Öffentlich ohne Auth-Middleware, weil die Kundenansicht ihn ebenfalls
// braucht, um bei gesperrtem Verkauf den Kaufbereich zu ersetzen. Die Antwort
// enthält ausschließlich Keys und Booleans — keine Adressen, keine Schlüssel,
// keine E-Mail-Adressen. Dass eine Instanz keine Zahlungsart hat, ist an der
// Kasse ohnehin sichtbar.
routerAdd("GET", "/api/custom/verkaufsbereitschaft", (e) => {
  const vk = require(__hooks + "/lib/verkaufslib.js");
  const punkte = vk.pruefeVerkaufsbereitschaft(vk.leseWerte(e.app));
  return e.json(200, { punkte: punkte });
});
```

- [ ] **Schritt 2: Dev-Instanz neu bauen**

`pb_hooks/` ist in `docker-compose.dev.yml` nicht gemountet, sondern ins Image gebacken.

Ausführen: `make dev`
Erwartet: Container startet neu, App unter `http://localhost:8091`

- [ ] **Schritt 3: Den Endpunkt prüfen**

Ausführen:

```bash
curl -s http://localhost:8091/api/custom/verkaufsbereitschaft | python3 -m json.tool
```

Erwartet: `punkte` mit neun Einträgen; die ersten vier tragen `"hart": true`.

Der Stand einer frischen Demo-Instanz ist bekannt und gilt für alle folgenden
Prüfungen: `seeddemolib.js:35` setzt `orderNotificationEmail`, die Preise
kommen aus den Migrations-Seeds — **`katalog` und `bestellmail` sind erfüllt,
`zahlung` und `recht` sind offen.** Ein frisches `make dev-reset` zeigt also
zwei offene harte Punkte, nicht vier.

- [ ] **Schritt 4: Committen**

```bash
git add pb_hooks/verkauf.pb.js
git commit -m "feat(verkauf): oeffentlicher Endpunkt fuer die Verkaufsbereitschaft"
```

---

## Task 3: Guard in beiden Zahlungswegen

**Dateien:**
- Ändern: `pb_hooks/paypal.pb.js` (nach `const settings = …`, Zeile 81)
- Ändern: `pb_hooks/stripe.pb.js` (nach `const settings = …`, Zeile 75)

**Schnittstellen:**
- Konsumiert: `verkaufslib.pruefeVerkaufsbereitschaft`, `verkaufslib.leseWerte`, `verkaufslib.offeneHarte` (Task 1).
- Produziert: beide Endpunkte antworten `409 { status: "error", message: "sale locked", offen: ["zahlung", …] }`, wenn ein harter Punkt fehlt.

Warum 409 und nicht 400: 400 heißt „deine Anfrage war falsch", hier ist aber die Anfrage in Ordnung und der Zustand der Instanz das Problem. Das Frontend unterscheidet daran den Sperrfall von einem Rechenfehler.

- [ ] **Schritt 1: In `pb_hooks/paypal.pb.js` einsetzen**

Unmittelbar **vor** `const clientId = settings.getString("paypalClientId");` (Zeile 82) einfügen:

```js
  // Verkauf gesperrt? Dann gar nicht erst eine Zahlung eröffnen. Dies und der
  // Zwilling in stripe.pb.js sind die einzigen zwei Eintritte in eine Zahlung
  // — ein Guard in der Oberfläche allein wäre keine Sperre.
  const vk = require(__hooks + "/lib/verkaufslib.js");
  const offen = vk.offeneHarte(vk.pruefeVerkaufsbereitschaft(vk.leseWerte(e.app)));
  if (offen.length) {
    return e.json(409, { status: "error", message: "sale locked", offen: offen });
  }
```

- [ ] **Schritt 2: In `pb_hooks/stripe.pb.js` einsetzen**

Unmittelbar **vor** `const secretKey = settings.getString("stripeSecretKey");` (Zeile 76) denselben Block einfügen — wörtlich gleich, nur der Kommentar nennt `paypal.pb.js` als Zwilling.

- [ ] **Schritt 3: Dev-Instanz neu bauen**

Ausführen: `make dev`
Erwartet: Container startet neu

- [ ] **Schritt 4: Die Sperre auslösen und prüfen**

Die Demo-Instanz hat keine Rechtstexte, `recht` ist also offen. Ein Aufruf ohne Anmeldung wird schon von PocketBase abgewiesen, deshalb über die Oberfläche prüfen:

```bash
# Zeigt, dass der Endpunkt den offenen Punkt kennt
curl -s http://localhost:8091/api/custom/verkaufsbereitschaft | grep -o '"key":"recht","hart":true,"erfuellt":false'
```

Erwartet: Treffer. Der 409-Pfad selbst wird in Task 10 durch einen E2E-Test abgedeckt, der die ganze Kette fährt.

- [ ] **Schritt 5: Committen**

```bash
git add pb_hooks/paypal.pb.js pb_hooks/stripe.pb.js
git commit -m "feat(verkauf): Zahlungswege sperren bei unvollstaendiger Einrichtung"
```

---

## Task 4: Frontend-Quelle — `verkauf.ts` und `SettingsContext`

**Dateien:**
- Anlegen: `src/utils/verkauf.ts`
- Ändern: `src/context/SettingsContext.tsx`
- Test: `tests/verkaufsbereitschaft.test.ts` (ergänzen)

**Schnittstellen:**
- Konsumiert: `GET /api/custom/verkaufsbereitschaft` (Task 2).
- Produziert:
  - `type PunktKey = "zahlung" | "katalog" | "recht" | "bestellmail" | "name" | "logo" | "kontaktmail" | "domain" | "wasserzeichen"`
  - `interface Punkt { key: PunktKey; hart: boolean; erfuellt: boolean }`
  - `interface Verkaufsbereitschaft { punkte: Punkt[]; offeneHarte: PunktKey[]; gesperrt: boolean; erledigt: number; gesamt: number }`
  - `const PUNKT_TEXTE: Record<PunktKey, { label: string; ziel: string }>`
  - `const VERKAUF_UNBEKANNT: Verkaufsbereitschaft`
  - `function ableiten(punkte: Punkt[]): Verkaufsbereitschaft`
  - `async function fetchVerkauf(): Promise<Verkaufsbereitschaft>`
  - `useSettings()` liefert zusätzlich `verkauf: Verkaufsbereitschaft`

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

An `tests/verkaufsbereitschaft.test.ts` anhängen:

```ts
import { ableiten, type Punkt } from "../src/utils/verkauf";

describe("Verkaufsbereitschaft — Ableitung fuer die Oberflaeche", () => {
  const punkte = (overrides: Partial<Record<string, boolean>> = {}): Punkt[] =>
    verkauf.pruefeVerkaufsbereitschaft({ ...VOLLSTAENDIG, ...overrides });

  it("zaehlt nur harte Punkte in offeneHarte", () => {
    const abgeleitet = ableiten(punkte({ logo: "", customDomain: "" }));
    expect(abgeleitet.offeneHarte).toEqual([]);
    expect(abgeleitet.gesperrt).toBe(false);
  });

  it("ist gesperrt, sobald ein harter Punkt offen ist", () => {
    const abgeleitet = ableiten(punkte({ paypalEnabled: false, stripeEnabled: false }));
    expect(abgeleitet.gesperrt).toBe(true);
    expect(abgeleitet.offeneHarte).toEqual(["zahlung"]);
  });

  it("zaehlt fuer den Balken alle Punkte, auch die weichen", () => {
    const abgeleitet = ableiten(punkte({ logo: "", customDomain: "" }));
    expect(abgeleitet.gesamt).toBe(9);
    expect(abgeleitet.erledigt).toBe(7);
  });

  it("meldet eine leere Antwort als nicht gesperrt", () => {
    // Der Endpunkt war nicht erreichbar. Eine Sperre zu behaupten, die
    // niemand geprueft hat, waere schlimmer als sie zu verpassen.
    const abgeleitet = ableiten([]);
    expect(abgeleitet.gesperrt).toBe(false);
    expect(abgeleitet.gesamt).toBe(0);
  });
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Ausführen: `npx vitest run tests/verkaufsbereitschaft.test.ts`
Erwartet: FAIL — `Failed to resolve import "../src/utils/verkauf"`

- [ ] **Schritt 3: `src/utils/verkauf.ts` schreiben**

```ts
import { pb } from "../config/pocketbase";

// Frontend-Hälfte der Verkaufsbereitschaft. Die Bedingungen selbst stehen in
// pb_hooks/lib/verkaufslib.js — hier liegen nur Beschriftungen, Zielrouten und
// die Zahlen, die die Oberfläche anzeigt.

export type PunktKey =
  | "zahlung" | "katalog" | "recht" | "bestellmail"
  | "name" | "logo" | "kontaktmail" | "domain" | "wasserzeichen";

export interface Punkt {
  key: PunktKey;
  hart: boolean;
  erfuellt: boolean;
}

export interface Verkaufsbereitschaft {
  punkte: Punkt[];
  offeneHarte: PunktKey[];
  gesperrt: boolean;
  erledigt: number;
  gesamt: number;
}

export const PUNKT_TEXTE: Record<PunktKey, { label: string; ziel: string }> = {
  zahlung: { label: "Zahlungsanbieter aktiv", ziel: "/payments" },
  katalog: { label: "Preise oder Pakete angelegt", ziel: "/pricing" },
  recht: { label: "Impressum & Datenschutz hinterlegt", ziel: "/legal" },
  bestellmail: { label: "Bestell-E-Mail hinterlegt", ziel: "/kontakt" },
  name: { label: "Name des Geschäfts gesetzt", ziel: "/branding" },
  logo: { label: "Logo hochgeladen", ziel: "/branding" },
  kontaktmail: { label: "Kontakt-E-Mail hinterlegt", ziel: "/kontakt" },
  domain: { label: "Eigene Domain eingerichtet", ziel: "/domain" },
  wasserzeichen: { label: "Wasserzeichen eingerichtet", ziel: "/bilder" },
};

// Vor dem ersten Laden und nach einem Fehlschlag: NICHT gesperrt. Ein kurzes
// "Verkauf gesperrt" auf jeder Seite, das eine Sekunde später verschwindet,
// wäre schlimmer als ein Hinweis, der eine Sekunde zu spät kommt — und die
// echte Sperre sitzt ohnehin im Server.
export const VERKAUF_UNBEKANNT: Verkaufsbereitschaft = {
  punkte: [],
  offeneHarte: [],
  gesperrt: false,
  erledigt: 0,
  gesamt: 0,
};

export function ableiten(punkte: Punkt[]): Verkaufsbereitschaft {
  const offeneHarte = punkte.filter((p) => p.hart && !p.erfuellt).map((p) => p.key);
  return {
    punkte,
    offeneHarte,
    gesperrt: offeneHarte.length > 0,
    erledigt: punkte.filter((p) => p.erfuellt).length,
    gesamt: punkte.length,
  };
}

export async function fetchVerkauf(): Promise<Verkaufsbereitschaft> {
  // requestKey: null — StrictMode mountet zweimal, und das SDK würde die
  // erste, identische Anfrage abbrechen. Muster wie in utils/support.ts:165.
  const antwort = await pb.send("/api/custom/verkaufsbereitschaft", {
    method: "GET",
    requestKey: null,
  });
  return ableiten((antwort as { punkte?: Punkt[] }).punkte ?? []);
}
```

- [ ] **Schritt 4: Tests laufen lassen, Erfolg bestätigen**

Ausführen: `npx vitest run tests/verkaufsbereitschaft.test.ts`
Erwartet: PASS, 17 Tests

- [ ] **Schritt 5: `SettingsContext` erweitern**

In `src/context/SettingsContext.tsx`:

Import ergänzen:

```ts
import {
  fetchVerkauf,
  VERKAUF_UNBEKANNT,
  type Verkaufsbereitschaft,
} from "../utils/verkauf";
```

`SettingsContextValue` und der Default-Wert:

```ts
interface SettingsContextValue {
  settings: AppSettings;
  // Abgeleitet aus settings + Katalog, siehe pb_hooks/lib/verkaufslib.js.
  // Hängt hier und nicht an einem eigenen Provider, weil refresh() nach jedem
  // Speichern ohnehin schon überall aufgerufen wird — die Checkliste
  // aktualisiert sich damit ohne zusätzliche Verdrahtung.
  verkauf: Verkaufsbereitschaft;
  loaded: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  verkauf: VERKAUF_UNBEKANNT,
  loaded: false,
  refresh: async () => undefined,
});
```

Im Provider den Zustand und das Laden ergänzen:

```ts
  const [verkauf, setVerkauf] = useState<Verkaufsbereitschaft>(VERKAUF_UNBEKANNT);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchSettings();
      setSettings(fresh);
      writeSettingsCache(fresh);
      setLoaded(true);
    } catch (error) {
      // offline or server down — keep cache/defaults
      console.warn("settings refresh failed", error);
    }
    // Getrennter Versuch: ein Fehlschlag hier darf die Einstellungen nicht
    // mitreißen, sie sind für jede Seite wichtiger als die Checkliste.
    try {
      setVerkauf(await fetchVerkauf());
    } catch (error) {
      console.warn("verkaufsbereitschaft refresh failed", error);
    }
  }, []);
```

Und den Wert durchreichen:

```tsx
    <SettingsContext.Provider value={{ settings, verkauf, loaded, refresh }}>
```

- [ ] **Schritt 6: Typen und Lint prüfen**

Ausführen: `npx tsc --noEmit && npm run lint`
Erwartet: beides ohne Ausgabe

- [ ] **Schritt 7: Committen**

```bash
git add src/utils/verkauf.ts src/context/SettingsContext.tsx tests/verkaufsbereitschaft.test.ts
git commit -m "feat(verkauf): Verkaufsbereitschaft im SettingsContext"
```

---

## Task 5: Gemeinsame Bausteine der Einstellungsseiten

Reine Umschichtung ohne Verhaltensänderung — damit die vier Seiten in Task 6 nichts duplizieren. `BrandingPage` benutzt danach dieselben Bausteine und sieht unverändert aus.

**Dateien:**
- Anlegen: `src/features/Settings/components/SettingsSection.tsx`
- Anlegen: `src/features/Settings/useSettingsDraft.ts`
- Ändern: `src/pages/admin/BrandingPage.tsx`

**Schnittstellen:**
- Produziert aus `SettingsSection.tsx`:
  - `<SectionCard title subtitle helpSlug?>` — trägt weiterhin `data-testid={"abschnitt:" + title}`, an dem die E2E-Suite hängt
  - `<ColorField label value onChange>`
  - `<Herkunft feld istGesetzt onReset>`
  - `<ImageDrop label file currentUrl onFile>`
  - `export const sf` — die geteilten StyleX-Regeln `grid1`, `grid2`, `full`, `sliderWrap`, `regenRow`, `saveRow`, `sections`, `ol`
- Produziert aus `useSettingsDraft.ts`:
  - `useSettingsDraft() -> { draft, setDraft, set, files, setFile, save, saving, settings, loaded }`
  - `save(): Promise<void>` — schickt **alle** Textfelder plus die gesetzten Dateien an `settings/appsettings0001` und ruft `refresh()`

- [ ] **Schritt 1: `SettingsSection.tsx` anlegen**

`SectionCard` (`BrandingPage.tsx:102`), `ColorField` (`:121`), `Herkunft` (`:140`) und `ImageDrop` (`:148`) **unverändert** herüberkopieren und exportieren. Aus dem `f`-Objekt (`:58`) die Regeln herausziehen, die mehr als eine Seite braucht, und als `sf` exportieren; `layout`, `preview`, `presetWrap` bleiben in `BrandingPage`, die Wizard-Regeln (`stepper`, `step`, `dot`, `dotActive`, `wizardNav`) fallen in Task 6 weg.

- [ ] **Schritt 2: `useSettingsDraft.ts` anlegen**

```ts
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { pb } from "../../config/pocketbase";
import { AppSettings, SETTINGS_RECORD_ID } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";

export type FileField = "logo" | "favicon" | "watermarkLogo";
type FileFields = Record<FileField, File | null>;

const LEERE_DATEIEN: FileFields = { logo: null, favicon: null, watermarkLogo: null };

// Alle Textfelder gehen bei jedem Speichern mit, unabhängig davon, welcher
// Abschnitt gerade sichtbar ist — das war schon im alten BrandingPage.save()
// so und ist der Grund, warum die vier Seiten sich einen Hook teilen können.
const TEXT_FIELDS: (keyof AppSettings)[] = [
  "businessName", "shortName", "tagline", "primaryColor", "secondaryColor",
  "fontFamily", "themeMode", "contactEmail", "orderNotificationEmail",
  "websiteUrl", "customDomain", "currency", "watermarkText", "designPreset",
];

// Ein Entwurf pro Seite, kein seitenübergreifender: wer ohne Speichern
// wechselt, verliert seine Änderungen — wie bisher beim Wechsel auf eine
// andere Adminseite auch.
export function useSettingsDraft() {
  const { settings, loaded, refresh } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [files, setFiles] = useState<FileFields>(LEERE_DATEIEN);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded) setDraft(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const set = (patch: Partial<AppSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const setFile = (feld: FileField, file: File | null) =>
    setFiles((s) => ({ ...s, [feld]: file }));

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const fd = new FormData();
      TEXT_FIELDS.forEach((k) => fd.append(k, String(draft[k] ?? "")));
      fd.append("borderRadius", String(draft.borderRadius ?? 0));
      fd.append("themeOverrides", JSON.stringify(draft.themeOverrides ?? []));
      fd.append("watermarkOpacity", String(draft.watermarkOpacity ?? 40));
      fd.append("previewMaxSize", String(draft.previewMaxSize ?? 1200));
      if (draft.setupCompleted) fd.append("setupCompleted", "true");
      (Object.keys(files) as FileField[]).forEach((feld) => {
        const file = files[feld];
        if (file) fd.append(feld, file);
      });

      await pb.collection("settings").update(SETTINGS_RECORD_ID, fd);
      await refresh();
      setFiles(LEERE_DATEIEN);
      toast.success("Einstellungen gespeichert");
    } catch (error) {
      console.error("settings save failed", error);
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return { draft, setDraft, set, files, setFile, save, saving, settings, loaded };
}
```

- [ ] **Schritt 3: `BrandingPage` auf die Bausteine umstellen**

Die vier Komponentendefinitionen und die verschobenen Styles aus `BrandingPage.tsx` löschen, stattdessen importieren; `draft`/`set`/`files`/`save`/`saving` aus `useSettingsDraft()` beziehen. Die Aufrufe `setFiles((s) => ({ ...s, logo: file }))` werden zu `setFile("logo", file)`. Der Wizard bleibt in diesem Schritt noch stehen; sein `save(true)` wird zu `save()` gefolgt von `navigate("/album")` — den `markCompleted`-Zweig übernimmt in Task 8 die Checkliste.

- [ ] **Schritt 4: Typen und Lint prüfen**

Ausführen: `npx tsc --noEmit && npm run lint`
Erwartet: beides ohne Ausgabe

- [ ] **Schritt 5: Bestehende E2E-Abdeckung bestätigen**

Ausführen: `make dev && make e2e ARGS="e2e/tests/einstellungen/branding.spec.ts"`
Erwartet: PASS — die Seite verhält sich unverändert, `data-testid="abschnitt:Branding"` steht noch

- [ ] **Schritt 6: Committen**

```bash
git add src/features/Settings src/pages/admin/BrandingPage.tsx
git commit -m "refactor(einstellungen): gemeinsame Bausteine und Speicherlogik herausgezogen"
```

---

## Task 6: `/branding` aufteilen

**Dateien:**
- Anlegen: `src/pages/admin/DomainPage.tsx`, `src/pages/admin/KontaktPage.tsx`, `src/pages/admin/BilderPage.tsx`
- Ändern: `src/pages/admin/BrandingPage.tsx`, `src/App.tsx`, `src/content/help/adminArticles.ts`, `e2e/tests/einstellungen/branding.spec.ts`

**Schnittstellen:**
- Konsumiert: `useSettingsDraft`, `SectionCard`, `ImageDrop`, `sf` (Task 5).
- Produziert: die Routen `/domain`, `/kontakt`, `/bilder`; `/branding` ohne Wizard, ohne Zahlungs-, Kontakt-, Domain- und Wasserzeichen-Abschnitt.

**Zuordnung der Abschnitte** (die JSX-Blöcke wandern wörtlich, nur `f.` wird zu `sf.`):

| Bisher in `BrandingPage.tsx` | Neu |
|---|---|
| `brandingSection` (`:347`) **inkl.** des „Kundenansicht"-Knopfes | bleibt auf `/branding` |
| `domainSection` (`:429`) + `checkDomain` + `checkingDomain`/`domainStatus` | `/domain` |
| `contactSection` (`:413`) | `/kontakt` |
| `watermarkSection` (`:463`) + `regeneratePreviews` + `regenerating` | `/bilder` |
| `paymentSection` (`:457`) | **gelöscht** — `/payments` rendert dieselbe `PaymentSettings` bereits |
| `steps`, `activeStep`, `goNext`, `setupMode`, Stepper-Styles | **gelöscht** |

Abweichung von der Spec, bewusst: der „Kundenansicht"-Knopf samt `beispielGalerie`/`vorschauFuer` bleibt auf `/branding`, nicht auf `/bilder`. Die Spec ordnete ihn unter „Bilder & Wasserzeichen" ein; im Code (`BrandingPage.tsx:395`) steht er im Branding-Abschnitt und beantwortet die Branding-Frage „sieht meine Gestaltung für Kundschaft richtig aus". Die Live-Vorschau daneben gehört ohnehin zu Branding.

- [ ] **Schritt 1: Die drei neuen Seiten anlegen**

Jede folgt demselben Gerüst — hier `KontaktPage.tsx` vollständig, die beiden anderen analog mit ihrem Abschnitt und ihrem lokalen Zustand:

```tsx
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ReactElement } from "react";

import Page from "../../components/layout/Page";
import { SectionCard, sf } from "../../features/Settings/components/SettingsSection";
import { useSettingsDraft } from "../../features/Settings/useSettingsDraft";

export default function KontaktPage(): ReactElement {
  const { draft, set, save, saving } = useSettingsDraft();

  return (
    <Page title="Kontakt & E-Mails" showTitleOnMobile>
      <div {...stylex.props(sf.sections)}>
        <SectionCard
          title="Kontakt & Geschäft"
          subtitle="E-Mail-Adressen und Website"
          helpSlug="kontakt-benachrichtigungen"
        >
          <div {...stylex.props(sf.grid2)}>
            <TextInput width="100%" type="email" label="Kontakt-E-Mail (Support)"
              value={draft.contactEmail} onChange={(v) => set({ contactEmail: v })} />
            <TextInput width="100%" type="email" label="Bestell-Benachrichtigungen an"
              description="Hier gehen neue Bestellungen ein"
              value={draft.orderNotificationEmail} onChange={(v) => set({ orderNotificationEmail: v })} />
            <TextInput width="100%" label="Website (optional)"
              value={draft.websiteUrl} onChange={(v) => set({ websiteUrl: v })} />
            <TextInput width="100%" label="Währung" description="ISO-Code, z. B. EUR"
              value={draft.currency} onChange={(v) => set({ currency: v.toUpperCase().slice(0, 3) })} />
          </div>
        </SectionCard>
        <div {...stylex.props(sf.saveRow)}>
          <Button variant="primary" size="lg" label="Speichern"
            isDisabled={saving} isLoading={saving} onClick={() => void save()} />
        </div>
      </div>
    </Page>
  );
}
```

`DomainPage` nimmt zusätzlich `const [checkingDomain, setCheckingDomain] = useState(false)`, `const [domainStatus, setDomainStatus] = useState<"idle" | "ok" | "fail">("idle")` und die Funktion `checkDomain` aus `BrandingPage.tsx:430` mit (ihr `await save(false)` wird zu `await save()`), Titel „Eigene Domain".

`BilderPage` nimmt `const [regenerating, setRegenerating] = useState(false)` und `regeneratePreviews` aus `BrandingPage.tsx:310` mit, Titel „Bilder & Wasserzeichen".

- [ ] **Schritt 2: `BrandingPage` eindampfen**

Die vier abgegebenen Abschnitte, den Wizard und die zugehörigen Zustände löschen. Übrig bleiben `brandingSection`, die Live-Vorschau (`ThemePreview`), `beispielGalerie`/`vorschauFuer` und ein einzelner „Speichern"-Knopf. Der Seitentitel wird fest `"Branding"` statt `setupMode ? "Einrichtung" : "Branding & Einstellungen"`.

- [ ] **Schritt 3: Routen eintragen**

In `src/App.tsx` neben `<Route path="branding" element={<BrandingPage />} />` (Zeile 172):

```tsx
                  <Route path="domain" element={<DomainPage />} />
                  <Route path="kontakt" element={<KontaktPage />} />
                  <Route path="bilder" element={<BilderPage />} />
```

- [ ] **Schritt 4: Hilfe-Artikel auf die neuen Ziele zeigen lassen**

In `src/content/help/adminArticles.ts`:

| Artikel | `relatedPath` bisher | neu |
|---|---|---|
| `kontakt-benachrichtigungen` (Zeile 75) | `/branding` | `/kontakt` |
| `custom-domain` (Zeile 95) | `/branding` | `/domain` |
| `wasserzeichen-vorschau` (Zeile 255) | `/branding` | `/bilder` |
| `branding-einrichten` (Zeile 44) | `/branding` | unverändert |
| `erste-schritte-admin` (Zeile 24) | `/branding` | `/einrichtung` *(Task 8 legt die Route an; der Pfad darf hier schon stehen)* |

- [ ] **Schritt 5: Den E2E-Test der Branding-Seite anpassen**

In `e2e/tests/einstellungen/branding.spec.ts` verliert der Kommentar über `page.getByRole("button", { name: "Speichern", exact: true })` (Zeile 40) seinen Grund: die Zahlungs-Abschnitte mit ihren „Speichern & prüfen"-Knöpfen stehen nicht mehr auf dieser Seite. Kommentar entfernen, `exact: true` behalten. Tests, die Kontakt-, Domain- oder Wasserzeichenfelder auf `/branding` suchen, auf die neue Route umziehen.

- [ ] **Schritt 6: Typen, Lint und E2E prüfen**

Ausführen:

```bash
npx tsc --noEmit && npm run lint
make dev && make e2e ARGS="e2e/tests/einstellungen"
```

Erwartet: alles PASS

- [ ] **Schritt 7: Committen**

```bash
git add src/pages/admin src/App.tsx src/content/help/adminArticles.ts e2e/tests/einstellungen
git commit -m "refactor(einstellungen): Branding-Seite in vier Seiten aufgeteilt, Wizard entfernt"
```

---

## Task 7: Seitenleiste gruppieren und Badge zeigen

**Dateien:**
- Ändern: `src/utils/routes.ts`, `src/components/layout/AppShell.tsx`
- Anlegen: `e2e/tests/admin/navigation.spec.ts`

**Schnittstellen:**
- Konsumiert: `useSettings().verkauf` (Task 4), die Routen aus Task 6.
- Produziert: `interface NavGroup { key: string; label: string; items: NavItem[] }` und `export const adminNavGroups: NavGroup[]` aus `routes.ts`.

- [ ] **Schritt 1: `routes.ts` umbauen**

`adminNavItems` behält nur noch die ungruppierten Einträge, daneben kommen die Gruppen:

```ts
export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

// Ungruppiert und immer sichtbar: der Einstieg und der Alltag.
export const adminNavItems: NavItem[] = [
  { key: "einrichtung", label: "Einrichtung", path: "/einrichtung", Icon: ListChecks },
  { key: "album", label: "Album", path: "/album", exact: true, Icon: Image },
];

export const adminNavGroups: NavGroup[] = [
  {
    key: "verkauf",
    label: "Verkauf",
    items: [
      { key: "pricing", label: "Preise", path: "/pricing", Icon: PriceChange },
      { key: "orders", label: "Bestellungen", path: "/orders", Icon: ReceiptLong },
      { key: "payments", label: "Zahlungen", path: "/payments", Icon: Payments },
    ],
  },
  {
    key: "kunden",
    label: "Kunden",
    items: [
      { key: "users", label: "Nutzer", path: "/users", Icon: People },
      // Ein einziger Eintrag für den ganzen Termin-Bereich; die Unterseiten
      // (Arten, Verfügbarkeit) hängen als Reiter darunter — siehe
      // AppointmentsTabs.tsx.
      { key: "appointments", label: "Termine", path: "/appointments", Icon: CalendarClock },
      { key: "support", label: "Support", path: "/support", Icon: SupportAgent },
    ],
  },
  {
    key: "einstellungen",
    label: "Einstellungen",
    items: [
      { key: "branding", label: "Branding", path: "/branding", Icon: Palette },
      { key: "domain", label: "Domain", path: "/domain", Icon: Globe },
      { key: "kontakt", label: "Kontakt & E-Mails", path: "/kontakt", Icon: Mail },
      { key: "bilder", label: "Bilder & Wasserzeichen", path: "/bilder", Icon: ImageIcon },
      { key: "legal", label: "Rechtliches", path: "/legal", Icon: Scale },
    ],
  },
];
```

Der Import oben wird um `ListChecks`, `Globe`, `Mail` und `Image as ImageIcon` aus `lucide-react` ergänzt.

- [ ] **Schritt 2: `AppShell` die Gruppen rendern lassen**

`AppShell` bekommt eine optionale Prop `navGroups?: NavGroup[]`. In `src/components/layout/Layout.tsx:26` kommt eine Zeile dazu:

```tsx
      <AppShell
        navItems={isAdmin ? adminNavItems : userNavItems}
        navGroups={isAdmin ? adminNavGroups : undefined}
        menuItems={isAdmin ? adminMenuItems : userMenuItems}
```

Zustand und Regel:

```tsx
const GRUPPEN_KEY = "sidebar_groups_v1";

// Zugeklappte Gruppen, nicht offene: eine unbekannte Gruppe ist damit offen.
function leseZugeklappt(): string[] {
  try {
    const raw = window.localStorage.getItem(GRUPPEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    // private mode / kaputter Wert — eine offene Gruppe ist harmlos
    return [];
  }
}
```

Rendern:

```tsx
{navGroups?.map((gruppe) => {
  // Eine zugeklappte Gruppe, in der man gerade steht, wäre
  // Orientierungsverlust — die aktive Gruppe ist deshalb immer offen.
  const enthaeltAktive = gruppe.items.some((item) => isActive(item, location.pathname));
  return (
    <details
      key={gruppe.key}
      open={enthaeltAktive || !zugeklappt.includes(gruppe.key)}
      onToggle={(e) => merkeGruppe(gruppe.key, !(e.currentTarget as HTMLDetailsElement).open)}
      {...stylex.props(s.gruppe)}
    >
      <summary {...stylex.props(s.gruppeKopf)}>
        <Text type="supporting" weight="semibold" color="secondary">{gruppe.label}</Text>
      </summary>
      <nav {...stylex.props(s.navList)}>{gruppe.items.map(navButton)}</nav>
    </details>
  );
})}
```

Warum `<details>`: Aufklappen, Tastaturbedienung und die ARIA-Semantik gibt es damit ohne eine Zeile JavaScript.

- [ ] **Schritt 3: Das Badge einbauen**

In `navButton`, nach dem `<Text>` mit dem Label:

```tsx
{/* Einziger Eintrag mit Zähler — ein `badge`-Feld an NavItem wäre eine
    Schnittstelle für genau einen Fall. */}
{item.key === "einrichtung" && verkauf.offeneHarte.length > 0 && (
  <span {...stylex.props(s.badge)} data-testid="einrichtung-badge">
    <Text type="supporting" weight="semibold">{verkauf.offeneHarte.length}</Text>
  </span>
)}
```

`verkauf` kommt aus dem schon vorhandenen `const { settings } = useSettings()`, das zu `const { settings, verkauf } = useSettings()` wird. Die Badge-Regel: runder Hintergrund in `var(--color-background-muted)`, `marginInlineStart: "auto"`.

- [ ] **Schritt 4: Den E2E-Test schreiben**

Datei `e2e/tests/admin/navigation.spec.ts`:

```ts
// Workflow: Fotograf findet sich in der gruppierten Seitenleiste zurecht.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";

test("Gruppe der aktiven Route ist offen, andere bleiben zugeklappt", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/branding");

  const einstellungen = page.locator("details", { has: page.getByText("Einstellungen", { exact: true }) });
  await expect(einstellungen).toHaveAttribute("open", "");
  await expect(page.getByRole("button", { name: "Domain" })).toBeVisible();
});

test("zugeklappte Gruppe bleibt ueber einen Seitenwechsel zugeklappt", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");

  const verkauf = page.locator("details", { has: page.getByText("Verkauf", { exact: true }) });
  await verkauf.getByText("Verkauf", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Preise" })).toBeHidden();

  await page.goto("/users");
  await expect(page.getByRole("button", { name: "Preise" })).toBeHidden();
});
```

- [ ] **Schritt 5: Prüfen**

Ausführen:

```bash
npx tsc --noEmit && npm run lint
make dev && make e2e ARGS="e2e/tests/admin/navigation.spec.ts"
```

Erwartet: PASS

- [ ] **Schritt 6: Committen**

```bash
git add src/utils/routes.ts src/components/layout e2e/tests/admin/navigation.spec.ts
git commit -m "feat(navigation): Seitenleiste in aufklappbare Gruppen, Badge fuer offene Punkte"
```

---

## Task 8: Die Einrichtungs-Seite

**Dateien:**
- Anlegen: `src/pages/admin/EinrichtungPage.tsx`
- Ändern: `src/App.tsx`, `src/components/SetupRedirect.tsx`
- Anlegen: `e2e/tests/einstellungen/einrichtung.spec.ts`

**Schnittstellen:**
- Konsumiert: `useSettings().verkauf`, `PUNKT_TEXTE` (Task 4); die Routen aus Task 6.
- Produziert: Route `/einrichtung`; `setupCompleted` bedeutet ab jetzt „hat die Checkliste einmal gesehen".

- [ ] **Schritt 1: Die Seite schreiben**

```tsx
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Check, Circle, X } from "lucide-react";
import { ReactElement, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { SETTINGS_RECORD_ID } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import { PUNKT_TEXTE, type Punkt } from "../../utils/verkauf";

const s = stylex.create({
  kopf: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  balken: {
    height: 8,
    borderRadius: "var(--radius-full)",
    backgroundColor: "var(--color-background-muted)",
    overflow: "hidden",
  },
  fuellung: { height: "100%", backgroundColor: "var(--color-accent)" },
  gruppe: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 },
  zeile: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  label: { flex: 1, minWidth: 0 },
  offen: { color: "var(--color-text-danger, var(--color-text-primary))" },
  erledigt: { color: "var(--color-text-accent)" },
  neutral: { color: "var(--color-text-secondary)" },
});

function Zeile({ punkt, onGehe }: { punkt: Punkt; onGehe: (ziel: string) => void }): ReactElement {
  const { label, ziel } = PUNKT_TEXTE[punkt.key];
  // Weiche Punkte sind kein Versäumnis: eine eigene Domain zu haben ist eine
  // Entscheidung, kein Fehler. Deshalb ein neutraler Kreis statt eines Kreuzes.
  const Icon = punkt.erfuellt ? Check : punkt.hart ? X : Circle;
  const ton = punkt.erfuellt ? s.erledigt : punkt.hart ? s.offen : s.neutral;

  return (
    <div {...stylex.props(s.zeile)} data-testid={`punkt:${punkt.key}`}>
      <span {...stylex.props(ton)}><Icon /></span>
      <span {...stylex.props(s.label)}>
        <Text type="body" weight="medium">{label}</Text>
      </span>
      {!punkt.erfuellt && (
        <Button variant="secondary" label="Einrichten" onClick={() => onGehe(ziel)} />
      )}
    </div>
  );
}

export default function EinrichtungPage(): ReactElement {
  const { settings, verkauf, loaded, refresh } = useSettings();
  const navigate = useNavigate();

  // "Gesehen" heißt gesehen, nicht "fertig": ein Fotograf ohne eigene Domain
  // hat einen offenen weichen Punkt und darf trotzdem nicht bei jedem Login
  // hierher umgeleitet werden.
  useEffect(() => {
    if (!loaded || settings.setupCompleted) return;
    pb.collection("settings")
      .update(SETTINGS_RECORD_ID, { setupCompleted: true })
      .then(() => refresh())
      .catch((error) => console.warn("setupCompleted konnte nicht gesetzt werden", error));
  }, [loaded, settings.setupCompleted, refresh]);

  const offen = verkauf.offeneHarte.length;
  const anteil = verkauf.gesamt ? Math.round((verkauf.erledigt / verkauf.gesamt) * 100) : 0;
  const harte = verkauf.punkte.filter((p) => p.hart);
  const weiche = verkauf.punkte.filter((p) => !p.hart);

  return (
    <Page title="Einrichtung" showTitleOnMobile>
      <div {...stylex.props(s.kopf)}>
        <Heading level={5}>
          {offen === 0
            ? "Du kannst deine Fotos verkaufen."
            : offen === 1
              ? "Noch 1 Ding bis zum Verkauf der Fotos"
              : `Noch ${offen} Dinge bis zum Verkauf der Fotos`}
        </Heading>
        <div {...stylex.props(s.balken)}>
          <div {...stylex.props(s.fuellung)} style={{ width: `${anteil}%` }} />
        </div>
        <Text type="supporting" color="secondary">
          {verkauf.erledigt} von {verkauf.gesamt} erledigt
        </Text>
      </div>

      <div {...stylex.props(s.gruppe)}>
        <Text type="label" weight="semibold" color="secondary">PFLICHT FÜR DEN VERKAUF</Text>
        {harte.map((punkt) => <Zeile key={punkt.key} punkt={punkt} onGehe={navigate} />)}
      </div>

      <div {...stylex.props(s.gruppe)}>
        <Text type="label" weight="semibold" color="secondary">EMPFOHLEN</Text>
        {weiche.map((punkt) => <Zeile key={punkt.key} punkt={punkt} onGehe={navigate} />)}
      </div>
    </Page>
  );
}
```

- [ ] **Schritt 2: Route eintragen**

In `src/App.tsx` im Admin-Block:

```tsx
                  <Route path="einrichtung" element={<EinrichtungPage />} />
```

- [ ] **Schritt 3: `SetupRedirect` umhängen**

```tsx
// Sends a freshly installed instance's admin to the setup checklist until it
// has been opened once.
    if (
      loaded &&
      !settings.setupCompleted &&
      !location.pathname.startsWith("/einrichtung")
    ) {
      navigate("/einrichtung", { replace: true });
    }
```

- [ ] **Schritt 4: Den alten Wizard-Link auffangen**

In `src/App.tsx` neben der Branding-Route, damit gespeicherte Links und Hilfeartikel nicht ins Leere zeigen:

```tsx
                  <Route path="branding/setup" element={<Navigate to="/einrichtung" replace />} />
```

Und in `BrandingPage` zu Beginn der Komponente:

```tsx
  // Der Wizard lief unter /branding?setup=1; die Checkliste hat ihn abgelöst.
  const [searchParams] = useSearchParams();
  if (searchParams.get("setup") === "1") return <Navigate to="/einrichtung" replace />;
```

- [ ] **Schritt 5: Den E2E-Test schreiben**

Datei `e2e/tests/einstellungen/einrichtung.spec.ts`:

```ts
// Workflow: Fotograf sieht, was bis zum Verkauf noch fehlt.
// Hilfe-Artikel: erste-schritte-admin
//
// Schreibt auf den globalen Settings-Record — deshalb im Projekt
// "einstellungen": zuletzt und seriell.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";
import { PbAdmin } from "../../support/pb";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenSichern(pb);
});

test.afterAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenWiederherstellen(pb);
});

test("offene Pflichtpunkte stehen auf der Checkliste und im Badge", async ({ page, pb, anmelden }) => {
  // Die Demo-Instanz hat zwei offene harte Punkte (zahlung, recht). Für eine
  // eindeutige Zahl im Badge wird zahlung geschlossen, recht bleibt offen.
  await pb.update("settings", "appsettings0001", {
    paypalEnabled: true,
    imprintHtml: "",
    privacyHtml: "",
  });

  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/einrichtung");

  await expect(page.getByText("Noch 1 Ding bis zum Verkauf der Fotos")).toBeVisible();
  await expect(page.getByTestId("einrichtung-badge")).toHaveText("1");

  const recht = page.getByTestId("punkt:recht");
  await expect(recht.getByRole("button", { name: "Einrichten" })).toBeVisible();
  await recht.getByRole("button", { name: "Einrichten" }).click();
  await expect(page).toHaveURL(/\/legal$/);
});

test("mit vollstaendiger Einrichtung verschwinden Badge und Warnung", async ({ page, pb, anmelden }) => {
  await pb.update("settings", "appsettings0001", {
    imprintHtml: "<p>Impressum</p>",
    privacyHtml: "<p>Datenschutz</p>",
    orderNotificationEmail: "bestellungen@demo.test",
    paypalEnabled: true,
  });

  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/einrichtung");

  await expect(page.getByText("Du kannst deine Fotos verkaufen.")).toBeVisible();
  await expect(page.getByTestId("einrichtung-badge")).toHaveCount(0);
});
```

- [ ] **Schritt 6: Prüfen**

Ausführen:

```bash
npx tsc --noEmit && npm run lint
make dev && make e2e ARGS="e2e/tests/einstellungen/einrichtung.spec.ts"
```

Erwartet: PASS

- [ ] **Schritt 7: Committen**

```bash
git add src/pages/admin/EinrichtungPage.tsx src/App.tsx src/components/SetupRedirect.tsx src/pages/admin/BrandingPage.tsx e2e/tests/einstellungen/einrichtung.spec.ts
git commit -m "feat(einrichtung): Checkliste ersetzt den Setup-Wizard"
```

---

## Task 9: Warnbanner auf der Album-Seite

**Dateien:**
- Ändern: `src/pages/admin/AdminAlbumPage.tsx`

**Schnittstellen:**
- Konsumiert: `useSettings().verkauf` (Task 4), Route `/einrichtung` (Task 8).
- Produziert: nichts, was spätere Aufgaben brauchen.

Der Banner hängt hier und nicht im `AppShell`: `/album` ist die Startseite nach dem Login, erreicht also ohnehin jeden. Über *jeder* Adminseite stünde er auch beim Hochladen, wo er nichts beiträgt.

- [ ] **Schritt 1: Den Banner einsetzen**

Importe ergänzen und `verkauf`/`navigate` beschaffen:

```tsx
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { useNavigate } from "react-router-dom";

import { useSettings } from "../../context/SettingsContext";

// … in der Komponente:
const { verkauf } = useSettings();
const navigate = useNavigate();
```

Ganz oben im gerenderten Inhalt von `AdminAlbumPage`. Der `data-testid` sitzt
auf einem umgebenden `<div>`, nicht auf `Banner` — die Astryx-Komponenten
reichen unbekannte Props nicht durch:

```tsx
{verkauf.gesperrt && (
  // Nicht wegklickbar, anders als HelpBanner: der merkt sich Ablehnungen pro
  // Browser, und ein weggeklickter Hinweis auf einen gesperrten Verkauf wäre
  // ein stiller Ausfall.
  <div data-testid="verkauf-gesperrt-banner" style={{ marginBottom: 16 }}>
    <Banner
      status="warning"
      title={
        verkauf.offeneHarte.length === 1
          ? "Noch 1 Ding bis zum Verkauf der Fotos — solange kann niemand kaufen."
          : `Noch ${verkauf.offeneHarte.length} Dinge bis zum Verkauf der Fotos — solange kann niemand kaufen.`
      }
    >
      <Button variant="secondary" label="Jetzt erledigen" onClick={() => navigate("/einrichtung")} />
    </Banner>
  </div>
)}
```

Für die weichen Punkte bleibt es beim vorhandenen, wegklickbaren `HelpBanner`-Muster — hier wird keiner ergänzt, weil die betroffenen Seiten (`/payments`, `/pricing`, `/legal`) ihren schon tragen.

- [ ] **Schritt 2: Prüfen**

Ausführen: `npx tsc --noEmit && npm run lint`
Erwartet: ohne Ausgabe

Dann `make dev`, als Demo-Admin anmelden, `/album` öffnen. Erwartet: der Banner steht dort, solange die Rechtstexte leer sind, und nennt dieselbe Zahl wie das Badge.

- [ ] **Schritt 3: Committen**

```bash
git add src/pages/admin/AdminAlbumPage.tsx
git commit -m "feat(verkauf): Warnbanner auf der Album-Seite bei gesperrtem Verkauf"
```

---

## Task 10: Kundenansicht sperren

**Dateien:**
- Ändern: `src/features/Album/components/Album.tsx`, `src/pages/user/PricingPage.tsx`
- Anlegen: `e2e/tests/einstellungen/verkauf-gesperrt.spec.ts`

**Schnittstellen:**
- Konsumiert: `useSettings().verkauf` (Task 4), der 409-Guard (Task 3).
- Produziert: nichts.

**Abweichung von der Spec, bewusst:** Die Spec kündigt in §6 an, dass ein angemeldeter Admin auf den Kundenseiten statt des neutralen Hinweises die Warnung mit Link sieht. Das wird **nicht** gebaut. Grund: der einzige Weg, auf dem ein Fotograf die Kundenansicht erreicht, ist die Vorschau über ein Schattenkonto (`CustomerPreview`) — dabei ist er gerade *nicht* als Admin angemeldet, `pb.authStore.model.isAdmin` ist dort falsch. Der Zweig wäre unerreichbarer Code, und die Vorschau soll ohnehin zeigen, was die Kundschaft sieht. Der Fotograf erfährt von der Sperre über Badge und Album-Banner.

- [ ] **Schritt 1: Den „Kaufen"-Knopf sperren**

In `src/features/Album/components/Album.tsx` — `isFreeDownload` steht heute in Zeile 298, also **nach** `primaryDisabled`; für die neue Bedingung muss es vor `primaryAction` (Zeile 284) hochgezogen werden.

```tsx
  const { verkauf } = useSettings();

  // Nur der Kauf-Weg ist betroffen: Shootings vom Typ "paid" oder "public"
  // gehen ohne Zahlung direkt auf die Download-Seite und laufen weiter.
  const kaufGesperrt = !isAdminAlbum && !isFreeDownload && verkauf.gesperrt;
```

`primaryDisabled` bekommt den Fall dazu:

```tsx
  const primaryDisabled = kaufGesperrt
    ? true
    : shootingPackage && !isAdminAlbum && !isFreeDownload
      ? !(selected.length >= shootingPackage.numberOfImages)
      : selected.length === 0;
```

Und in der Aktionsleiste, neben dem Knopf:

```tsx
{kaufGesperrt && (
  <Text type="supporting" color="secondary">
    Der Bilderkauf ist gerade nicht möglich. Bitte später erneut versuchen.
  </Text>
)}
```

Ein Knopf, der auf eine Absage führt, ist schlechter als einer, der nicht geht.

- [ ] **Schritt 2: Die Kasse sperren**

In `src/pages/user/PricingPage.tsx`, vor dem Rendern des dreistufigen Ablaufs. Das ist der maßgebliche Ort, weil er auch bei direktem Aufruf und beim Neuladen greift:

```tsx
  const { verkauf } = useSettings();

  if (verkauf.gesperrt) {
    // Nennt bewusst keinen Grund: eine Kundin kann mit "es fehlt ein
    // Impressum" nichts anfangen, und die Instanz muss ihre
    // Konfigurationslücken nicht öffentlich aufzählen.
    return (
      <Page title="Bilder kaufen">
        <div data-testid="kauf-gesperrt">
          <Banner
            status="info"
            title="Der Bilderkauf ist gerade nicht möglich. Bitte später erneut versuchen."
          />
        </div>
      </Page>
    );
  }
```

- [ ] **Schritt 3: Den E2E-Test schreiben**

Datei `e2e/tests/einstellungen/verkauf-gesperrt.spec.ts`.

Der Test liegt in `einstellungen/`, nicht in `kunde/`, obwohl er eine
Kundenansicht prüft: er schreibt auf den globalen Settings-Record, und das
Projekt `einstellungen` läuft als einziges seriell und zuletzt
(`playwright.config.ts:78`). In `kunde/` liefe er parallel zu Tests, die eine
funktionierende Kasse erwarten.

Es gibt kein `DEMO_KUNDE`: Kundschaft entsteht über das `album`-Fixture, das
eine eigene Kundin samt Galerie anlegt und hinterher aufräumt — Muster aus
`e2e/tests/kunde/bestellen.spec.ts:15`.

```ts
// Workflow: Kundin öffnet eine Galerie, während der Verkauf gesperrt ist.
//
// Liegt im Projekt "einstellungen" (seriell, zuletzt), weil er den globalen
// Settings-Record verändert — parallel dazu würde jeder andere Kundentest
// eine gesperrte Kasse sehen.

import { test, expect } from "../../support/fixtures";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";
import { PbAdmin } from "../../support/pb";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenSichern(pb);
  // Genau einen harten Punkt öffnen.
  await pb.update("settings", "appsettings0001", { imprintHtml: "", privacyHtml: "" });
});

test.afterAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenWiederherstellen(pb);
});

test("Kundin sieht den Hinweis statt der Kasse, kann die Galerie aber ansehen", async ({ page, album, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).click();

  // Die Galerie selbst bleibt offen — nur der Kauf ist gesperrt.
  await expect(page.getByRole("button", { name: "Bilder auswählen" })).toBeVisible();

  // Direktaufruf der Kasse: der maßgebliche Ort der Sperre.
  await page.goto("/pricing");
  await expect(page.getByTestId("kauf-gesperrt")).toBeVisible();
  await expect(
    page.getByText("Der Bilderkauf ist gerade nicht möglich. Bitte später erneut versuchen."),
  ).toBeVisible();
  // Der dreistufige Ablauf ist weg (data-testid aus PricingPage).
  await expect(page.getByTestId("bestellschritte")).toHaveCount(0);
});
```

- [ ] **Schritt 4: Prüfen**

Ausführen:

```bash
npx tsc --noEmit && npm run lint && npx vitest run
make dev && make e2e ARGS="e2e/tests/einstellungen/verkauf-gesperrt.spec.ts"
```

Erwartet: alles PASS

- [ ] **Schritt 5: Committen**

```bash
git add src/features/Album/components/Album.tsx src/pages/user/PricingPage.tsx e2e/tests/einstellungen/verkauf-gesperrt.spec.ts
git commit -m "feat(verkauf): Kaufweg in der Kundenansicht sperren"
```

---

## Abschluss

- [ ] **Ganze Suite fahren**

```bash
npx tsc --noEmit && npm run lint && npx vitest run
make dev && make e2e
```

- [ ] **Spec nachziehen**

`docs/verkaufsbereitschaft.md` um die beiden Abweichungen ergänzen, die sich beim Planen gezeigt haben:

1. §4 — der „Kundenansicht"-Knopf bleibt auf `/branding` statt auf `/bilder` (siehe Task 6).
2. §6 — der Admin-Zweig auf den Kundenseiten entfällt, weil die Kundenansicht-Vorschau unter einem Schattenkonto läuft (siehe Task 10).

Außerdem: `pruefeVerkaufsbereitschaft` nimmt ein reines Werte-Objekt statt `$app`, das Lesen steckt in `leseWerte(app)` — die Spec beschrieb `pruefeVerkaufsbereitschaft($app)`. Grund: nur so ist die Prüfung unter Vitest testbar.
