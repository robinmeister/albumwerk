# Kundenansicht-Vorschau — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins können sehen, was ihre Kundschaft tatsächlich sieht — anonym über den Freigabelink und als angemeldete Kundschaft — ohne deren Identität zu übernehmen.

**Architecture:** Ein kurzlebiges Schattenkonto trägt dieselben `shootingIds` wie die zugeordnete Kundschaft; die Zugriffsregeln hängen genau daran, also ist die Auswertung echt, während jeder Schreibzugriff beim Schattenkonto landet und mit ihm gelöscht wird. Die Vorschau läuft in einem iframe, dessen `pb`-Client einen reinen Speicher-Auth-Store benutzt, damit die Admin-Sitzung im Elternfenster unberührt bleibt.

**Tech Stack:** React 18, TypeScript, StyleX, `@astryxdesign/core`, PocketBase 0.39.4 (`pb_hooks`, `pb_migrations`), vitest, Playwright.

**Spec:** `docs/kundenansicht-vorschau.md`

## Global Constraints

- Die Laufzeit hängt am **Datensatz**, nicht am Token: `newAuthToken()` erbt die Gültigkeitsdauer der Sammlung (für `users` in Wochen). Kurzlebig wird die Sitzung allein durch das Löschen des Schattenkontos.
- Jeder Endpunkt prüft **serverseitig** auf Admin. Idiom im Repo (`pb_hooks/previews.pb.js:109`): `const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin")); if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });`
- **Die `users`-ID hat kein Autogenerate-Muster** (Firebase-Altlast). Sie muss beim Anlegen explizit gesetzt werden: `$security.randomStringWithAlphabet(15, "abcdefghijklmnopqrstuvwxyz0123456789")` — siehe `pb_hooks/signup.pb.js:42`.
- **JSON-Felder kommen im JSVM als rohe Bytes.** Lesen über `record.getString("userIds")` + `JSON.parse`, schreiben über `JSON.stringify` (`signup.pb.js:53-63`). Für `shootingIds` beim Anlegen genügt `user.set("shootingIds", [id])` wie in `signup.pb.js:48`.
- Wer an einer Galerie hängt, steht in `shooting.userIds` — die Beziehung wird beidseitig gepflegt (`link_shooting.pb.js`), und die Admin-Oberfläche liest bereits diese Richtung (`AdminAlbumPage.tsx:173`).
- Adresse des Schattenkontos auf einer `.invalid`-Domain (RFC 2606), damit nie versehentlich Post rausgeht.
- Kommentarsprache: Deutsch, wie in den neueren Dateien des Repos.
- Testlauf: `npm test`. Typprüfung: `npm run test:check`. E2E: `npm run e2e:check`, dann `npx playwright test <datei>`.
- **Kein `npm run lint`.** Skript und `.eslintrc.cjs` existieren, aber es gibt keine eslint-Abhängigkeit und die CI ruft lint nie auf — der Befehl ist tot. Nicht reparieren.

---

### Task 1: Migration und die reinen Helfer

**Files:**
- Create: `pb_migrations/1785700001_preview_accounts.js`
- Create: `pb_hooks/lib/previewsessionlib.js`
- Test: `tests/previewSession.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `previewlib.buildShadowUser(shootingId, nowMs, ttlMinutes)` → `{ id, email, password, shootingIds, isAdmin, isPreview, previewExpiresAt }`; `previewlib.isExpired(expiresAtIso, nowMs)` → boolean; `previewlib.TTL_MINUTES` = 15

- [ ] **Step 1: Failing test schreiben**

`tests/previewSession.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Wie tests/time.test.ts: der Hook-Helfer ist CommonJS und wird direkt
// eingebunden, damit Test und Server denselben Code benutzen.
const require = createRequire(import.meta.url);
const preview = require("../pb_hooks/lib/previewsessionlib.js");

describe("Schattenkonto-Bauplan", () => {
  const NOW = Date.parse("2026-08-28T10:00:00.000Z");

  it("traegt genau die shootingIds der gezeigten Galerie", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(u.shootingIds).toEqual(["shoot123"]);
  });

  it("ist kein Admin und als Vorschau markiert", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(u.isAdmin).toBe(false);
    expect(u.isPreview).toBe(true);
  });

  it("bekommt eine nicht zustellbare Adresse", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    // .invalid ist per RFC 2606 reserviert und aufloest nie
    expect(u.email.endsWith(".invalid")).toBe(true);
  });

  it("vergibt bei jedem Aufruf eine andere Kennung und Adresse", () => {
    const a = preview.buildShadowUser("shoot123", NOW, 15);
    const b = preview.buildShadowUser("shoot123", NOW, 15);
    expect(a.id).not.toBe(b.id);
    expect(a.email).not.toBe(b.email);
    expect(a.password).not.toBe(b.password);
  });

  it("erzeugt eine ID im Format der users-Sammlung", () => {
    // die users-ID hat kein Autogenerate-Muster, deshalb 15 Zeichen a-z0-9
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(u.id).toMatch(/^[a-z0-9]{15}$/);
  });

  it("setzt den Ablauf ttlMinutes in die Zukunft", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(Date.parse(u.previewExpiresAt) - NOW).toBe(15 * 60 * 1000);
  });

  it("erkennt abgelaufen und noch gueltig", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(preview.isExpired(u.previewExpiresAt, NOW)).toBe(false);
    expect(preview.isExpired(u.previewExpiresAt, NOW + 14 * 60 * 1000)).toBe(false);
    expect(preview.isExpired(u.previewExpiresAt, NOW + 16 * 60 * 1000)).toBe(true);
  });

  it("behandelt einen leeren Ablauf als abgelaufen", () => {
    // ein Datensatz ohne previewExpiresAt darf nicht ewig leben
    expect(preview.isExpired("", NOW)).toBe(true);
    expect(preview.isExpired("kaputt", NOW)).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run tests/previewSession.test.ts`
Expected: FAIL — `Cannot find module '../pb_hooks/lib/previewsessionlib.js'`

- [ ] **Step 3: Den Helfer schreiben**

`pb_hooks/lib/previewsessionlib.js`:

```js
// Reine Helfer für die Kundenansicht-Vorschau (docs/kundenansicht-vorschau.md).
// Bewusst ohne PocketBase-Abhängigkeiten, damit tests/previewSession.test.ts sie
// per createRequire direkt einbinden kann — derselbe Code läuft im Hook.

const TTL_MINUTES = 15;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// Der Zufall wird hereingereicht, nicht erzeugt: der Hook uebergibt
// $security.randomStringWithAlphabet (CSPRNG), der Test einen abzaehlbaren
// Ersatz. So bleibt die Datei frei von PocketBase-Globals UND das Passwort,
// das echten Lesezugriff bewacht, stammt nicht aus Math.random().
function requireZufall(zufall) {
  if (typeof zufall !== "function") {
    throw new Error("buildShadowUser braucht eine Zufallsfunktion (len, alphabet) => string");
  }
  return zufall;
}

// Der Bauplan eines Schattenkontos. Es traegt nur die shootingIds — daran
// haengen die Zugriffsregeln fuer Galerie und Bilder, und mehr braucht die
// Vorschau nicht. Name und sonstige Daten der echten Kundschaft werden
// bewusst NICHT kopiert.
function buildShadowUser(shootingId, nowMs, ttlMinutes, zufall) {
  const rnd = requireZufall(zufall);
  const ttl = typeof ttlMinutes === "number" ? ttlMinutes : TTL_MINUTES;
  const handle = rnd(12, ALPHABET);
  return {
    // die users-ID hat kein Autogenerate-Muster (Firebase-Altlast)
    id: rnd(15, ALPHABET),
    email: "vorschau-" + handle + "@albumwerk.invalid",
    password: rnd(42, ALPHABET),
    shootingIds: [shootingId],
    isAdmin: false,
    isPreview: true,
    previewExpiresAt: new Date(nowMs + ttl * 60 * 1000).toISOString(),
  };
}

// Ein Datensatz ohne oder mit unlesbarem Ablauf gilt als abgelaufen — sonst
// haette ein halb angelegtes Konto unbegrenzt Bestand.
function isExpired(expiresAtIso, nowMs) {
  const ts = Date.parse(String(expiresAtIso || ""));
  if (!Number.isFinite(ts)) return true;
  return ts <= nowMs;
}

module.exports = {
  TTL_MINUTES: TTL_MINUTES,
  buildShadowUser: buildShadowUser,
  isExpired: isExpired,
};
```

- [ ] **Step 4: Test laufen lassen**

Run: `npx vitest run tests/previewSession.test.ts`
Expected: PASS (8 Tests)

- [ ] **Step 5: Migration schreiben**

`pb_migrations/1785700001_preview_accounts.js`:

```js
/// <reference path="../pb_data/types.d.ts" />
// Schattenkonten für die Kundenansicht-Vorschau (docs/kundenansicht-vorschau.md).
//
// Ein Schattenkonto traegt dieselben shootingIds wie die zugeordnete
// Kundschaft, aber keinerlei personenbezogene Daten. Es lebt Minuten, nicht
// Wochen — und weil ein PocketBase-Auth-Token nur so lange gilt, wie sein
// Datensatz existiert, ist das Loeschen des Kontos der eigentliche Ablauf.
//
// isPreview markiert es, previewExpiresAt sagt, ab wann der Sweep es abraeumen
// darf. Beide Felder sind nur fuer den Server interessant; die Oberflaeche
// filtert Schattenkonten ueberall aus.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.add(new Field({
    name: "isPreview",
    id: "bool_usr_prev",
    type: "bool",
    required: false, hidden: false, presentable: false, system: false,
  }));
  collection.fields.add(new Field({
    name: "previewExpiresAt",
    id: "date_usr_prevexp",
    type: "date", min: "", max: "",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  // Schattenkonten zuerst weg, sonst bleiben sie ohne Markierung liegen und
  // waeren von echten Konten nicht mehr zu unterscheiden.
  try {
    const leftovers = app.findRecordsByFilter("users", "isPreview = true", "", 0, 0);
    for (const rec of leftovers) app.delete(rec);
  } catch (_) {
    // keine vorhanden
  }
  collection.fields.removeByName("isPreview");
  collection.fields.removeByName("previewExpiresAt");
  app.save(collection);
});
```

- [ ] **Step 6: Migration gegen die Dev-Instanz laufen lassen**

Run: `make dev` (baut neu und startet), danach `make dev-logs`
Expected: Migration laeuft ohne Fehler durch; im PocketBase-Dashboard unter `users` stehen die Felder `isPreview` und `previewExpiresAt`.

- [ ] **Step 7: Prüfen und committen**

Run: `npm test && npm run test:check`
Expected: alle Tests grün, Typprüfung sauber.

```bash
git add pb_migrations/1785700001_preview_accounts.js pb_hooks/lib/previewsessionlib.js tests/previewSession.test.ts
git commit -m "feat(vorschau): Schattenkonto-Felder und Bauplan"
```

---

### Task 2: Endpunkte und Sweep

**Files:**
- Create: `pb_hooks/previewsession.pb.js`

**Interfaces:**
- Consumes: `previewlib.buildShadowUser`, `previewlib.isExpired`, `previewlib.TTL_MINUTES` (Task 1)
- Produces:
  - `POST /api/custom/preview/session` mit `{ shootingId }` → `200 { token, userId, expiresAt, spiegelt: { anzahl, name } }`
  - `DELETE /api/custom/preview/session` mit `{ userId }` → `200 { status: "ok" }`
  - Cron `previewSessionSweep`, alle 5 Minuten

- [ ] **Step 1: Die Hooks schreiben**

`pb_hooks/previewsession.pb.js`:

```js
/// <reference path="../pb_data/types.d.ts" />
// Kundenansicht-Vorschau (docs/kundenansicht-vorschau.md).
//
// Ein Admin bekommt hier ein Token fuer ein kurzlebiges Schattenkonto, das
// dieselben shootingIds traegt wie die der Galerie zugeordnete Kundschaft.
// Die Zugriffsregeln fuer shootings und images haengen genau an diesem Feld,
// also ist die Auswertung echt — aber ein Schreibzugriff aus der Vorschau
// landet beim Schattenkonto und verschwindet mit ihm.
//
// Warum kein Impersonate der echten Kundin: ein Token auf ihren Datensatz
// koennte ihre Bildauswahl aendern (userSelection.updateRule erlaubt
// userId = @request.auth.id). Ein Fehlklick in einer Vorschau darf keine
// Kundendaten anfassen.

routerAdd("POST", "/api/custom/preview/session", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const shootingId = String(data.shootingId || "").trim();
  if (!shootingId) {
    return e.json(400, { status: "error", code: "missing-shooting" });
  }

  let shooting = null;
  try {
    shooting = e.app.findRecordById("shootings", shootingId);
  } catch (_) {
    return e.json(404, { status: "error", code: "unknown-shooting" });
  }

  // Wer an der Galerie haengt, steht am Shooting — die Beziehung wird
  // beidseitig gepflegt (link_shooting.pb.js). json-Felder kommen als rohe
  // Bytes, deshalb ueber getString + JSON.parse.
  let userIds = [];
  try {
    userIds = JSON.parse(shooting.getString("userIds") || "[]") || [];
  } catch (_) {
    userIds = [];
  }

  let name = "";
  if (userIds.length === 1) {
    try {
      const kunde = e.app.findRecordById("users", userIds[0]);
      name = (kunde.getString("firstName") + " " + kunde.getString("lastName")).trim();
    } catch (_) {
      name = "";
    }
  }

  const preview = require(__hooks + "/lib/previewsessionlib.js");
  const plan = preview.buildShadowUser(shootingId, Date.now(), preview.TTL_MINUTES,
    (len, alphabet) => $security.randomStringWithAlphabet(len, alphabet));

  let token = "";
  try {
    e.app.runInTransaction((txApp) => {
      const user = new Record(txApp.findCollectionByNameOrId("users"));
      // die users-ID hat kein Autogenerate-Muster (siehe signup.pb.js)
      user.set("id", plan.id);
      user.set("email", plan.email);
      user.set("emailVisibility", false);
      user.set("firstName", "Vorschau");
      user.set("lastName", "");
      user.set("isAdmin", false);
      user.set("verified", true);
      user.set("shootingIds", plan.shootingIds);
      user.set("isPreview", true);
      user.set("previewExpiresAt", plan.previewExpiresAt);
      user.setPassword(plan.password);
      txApp.save(user);
      token = user.newAuthToken();
    });
  } catch (err) {
    return e.json(500, { status: "error", code: "create-failed", message: String(err) });
  }

  $app.logger().info(
    "Vorschau-Sitzung ausgestellt",
    "shootingId", shootingId,
    "shadowId", plan.id,
    "admin", e.auth ? e.auth.id : "superuser",
  );

  return e.json(200, {
    token: token,
    userId: plan.id,
    expiresAt: plan.previewExpiresAt,
    spiegelt: { anzahl: userIds.length, name: name },
  });
});

routerAdd("DELETE", "/api/custom/preview/session", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const userId = String(data.userId || "").trim();
  if (!userId) return e.json(400, { status: "error", code: "missing-user" });

  try {
    const rec = e.app.findRecordById("users", userId);
    // Nur Schattenkonten — dieser Endpunkt darf niemals ein echtes Konto
    // loeschen, auch nicht mit einer falschen ID von einem Admin.
    if (!rec.getBool("isPreview")) {
      return e.json(400, { status: "error", code: "not-a-preview" });
    }
    e.app.delete(rec);
  } catch (_) {
    // schon weg — fuer den Aufrufer dasselbe Ergebnis
  }

  return e.json(200, { status: "ok" });
});

// Zweite Linie: das Frontend loescht beim Schliessen, aber ein abgestuerzter
// Tab oder ein geschlossener Laptop tut das nicht.
cronAdd("previewSessionSweep", "*/5 * * * *", () => {
  try {
    const preview = require(__hooks + "/lib/previewsessionlib.js");
    const now = Date.now();
    const stale = $app.findRecordsByFilter("users", "isPreview = true", "", 0, 0);
    let removed = 0;
    for (const rec of stale) {
      if (preview.isExpired(rec.getString("previewExpiresAt"), now)) {
        $app.delete(rec);
        removed++;
      }
    }
    if (removed > 0) {
      $app.logger().info("abgelaufene Vorschau-Konten entfernt", "count", removed);
    }
  } catch (err) {
    $app.logger().warn("Vorschau-Sweep fehlgeschlagen", "error", String(err));
  }
});
```

- [ ] **Step 2: Endpunkt von Hand prüfen — der Erfolgsfall**

Run (Dev-Instanz laeuft):

```bash
TOK=$(curl -s -X POST "http://localhost:8091/api/collections/users/auth-with-password" \
  -H "Content-Type: application/json" \
  -d '{"identity":"admin@demo.test","password":"demo123456"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['token'])")
SID=$(curl -s "http://localhost:8091/api/collections/shootings/records?perPage=1" -H "Authorization: $TOK" | python3 -c "import json,sys;print(json.load(sys.stdin)['items'][0]['id'])")
curl -s -X POST "http://localhost:8091/api/custom/preview/session" \
  -H "Authorization: $TOK" -H "Content-Type: application/json" \
  -d "{\"shootingId\":\"$SID\"}"
```

Expected: `200` mit `token`, `userId`, `expiresAt` rund 15 Minuten in der Zukunft, und `spiegelt`.

- [ ] **Step 3: Die Sicherheitsgrenze von Hand prüfen**

Run:

```bash
KTOK=$(curl -s -X POST "http://localhost:8091/api/collections/users/auth-with-password" \
  -H "Content-Type: application/json" \
  -d '{"identity":"kunde@demo.test","password":"demo123456"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['token'])")
curl -s -o /dev/null -w "mit Kundentoken: %{http_code}\n" -X POST "http://localhost:8091/api/custom/preview/session" \
  -H "Authorization: $KTOK" -H "Content-Type: application/json" -d "{\"shootingId\":\"$SID\"}"
curl -s -o /dev/null -w "ohne Token:      %{http_code}\n" -X POST "http://localhost:8091/api/custom/preview/session" \
  -H "Content-Type: application/json" -d "{\"shootingId\":\"$SID\"}"
```

Expected: beide `403`. **Kommt hier etwas anderes als 403, nicht weitermachen** — das ist die Grenze, die die ganze Funktion traegt.

- [ ] **Step 4: Prüfen, dass das Token wirklich die Kundensicht bekommt**

Run (mit dem Token aus Step 2 als `$PTOK`):

```bash
curl -s "http://localhost:8091/api/collections/images/records?perPage=200" \
  -H "Authorization: $PTOK" | python3 -c "import json,sys; d=json.load(sys.stdin); print('Bilder:', d['totalItems'], '| Typen:', sorted({i['type'] for i in d['items']}))"
```

Expected: nur `preview`-Bilder und Originale der freigegebenen Galerie — **keine** Originale fremder Galerien. Das belegt, dass die Regelauswertung greift und nicht die Admin-Rechte.

- [ ] **Step 5: Aufräumen und den Sweep prüfen**

Run: der `DELETE`-Endpunkt mit der `userId` aus Step 2, danach

```bash
curl -s -o /dev/null -w "Token nach Loeschen: %{http_code}\n" \
  "http://localhost:8091/api/collections/images/records?perPage=1" -H "Authorization: $PTOK"
```

Expected: der Aufruf schlaegt fehl (401/403) — das ist der Beleg dafuer, dass die Laufzeit am Datensatz haengt und nicht am Token.

- [ ] **Step 6: Commit**

```bash
git add pb_hooks/previewsession.pb.js
git commit -m "feat(vorschau): Sitzungsendpunkte und Sweep fuer Schattenkonten"
```

---

### Task 3: Sitzungstrennung im Client

**Files:**
- Modify: `src/config/pocketbase.ts:1-10`
- Test: `tests/previewSession.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `export const IST_VORSCHAU: boolean`; `pb` benutzt im Vorschaumodus einen reinen Speicher-Store

- [ ] **Step 1: Failing test schreiben**

An `tests/previewSession.test.ts` anhängen:

```ts
import { istVorschauUrl } from "../src/config/pocketbase";

describe("Erkennung des Vorschaumodus", () => {
  it("erkennt den Parameter", () => {
    expect(istVorschauUrl("?vorschau=1")).toBe(true);
    expect(istVorschauUrl("?a=b&vorschau=1")).toBe(true);
  });

  it("bleibt sonst aus", () => {
    expect(istVorschauUrl("")).toBe(false);
    expect(istVorschauUrl("?a=b")).toBe(false);
    expect(istVorschauUrl("?vorschauen=1")).toBe(false);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run tests/previewSession.test.ts`
Expected: FAIL — `istVorschauUrl` wird nicht exportiert.

- [ ] **Step 3: Die Store-Weiche einbauen**

In `src/config/pocketbase.ts` den Kopf ersetzen durch:

```ts
import PocketBase, { BaseAuthStore } from 'pocketbase';

// In production PocketBase serves the built SPA itself (pb_public), so the API
// lives on the same origin. For local dev point VITE_PB_URL at your instance.
const baseUrl: string =
  import.meta.env.VITE_PB_URL || (typeof window !== 'undefined' ? window.location.origin : '');

/*
  Sitzungstrennung fuer die Kundenansicht-Vorschau
  (docs/kundenansicht-vorschau.md).

  Die Vorschau laeuft in einem iframe auf derselben Herkunft. Mit dem
  Standard-LocalAuthStore wuerde ihre Anmeldung die Admin-Sitzung im
  Elternfenster ueberschreiben — derselbe localStorage. Deshalb bekommt der
  Client im Vorschaumodus einen reinen Speicher-Store: er faellt mit dem
  iframe weg und fasst localStorage nie an.

  Die Erkennung ist bewusst nur privilegienmindernd. Wer den Parameter
  faelscht, bekommt eine Sitzung ohne Persistenz und sonst nichts.
*/
export function istVorschauUrl(search: string): boolean {
  return new URLSearchParams(search).has('vorschau');
}

export const IST_VORSCHAU: boolean =
  typeof window !== 'undefined' && istVorschauUrl(window.location.search);

export const pb = IST_VORSCHAU
  ? new PocketBase(baseUrl, new BaseAuthStore())
  : new PocketBase(baseUrl);
```

Der Rest der Datei bleibt unveraendert.

- [ ] **Step 4: Test laufen lassen**

Run: `npm test && npm run test:check`
Expected: alle Tests grün, Typprüfung sauber.

- [ ] **Step 5: Von Hand prüfen, dass die Admin-Sitzung überlebt**

Run: `npm run dev`, als Admin anmelden, dann in der Konsole des Browsers:

```js
Object.keys(localStorage).filter(k => k.includes('auth'))
```

Merke dir den Wert. Danach in einem zweiten Tab `http://localhost:5173/publicAlbum/<id>?vorschau=1` oeffnen und denselben Ausdruck erneut ausfuehren.
Expected: der gespeicherte Auth-Eintrag ist unveraendert — die Vorschau hat ihn nicht angefasst.

- [ ] **Step 6: Commit**

```bash
git add src/config/pocketbase.ts tests/previewSession.test.ts
git commit -m "feat(vorschau): eigener Auth-Store fuer den Vorschaumodus"
```

---

### Task 4: Die Vorschau-Oberfläche

**Files:**
- Create: `src/features/Preview/usePreviewSession.ts`
- Create: `src/features/Preview/CustomerPreview.tsx`

**Interfaces:**
- Consumes: die Endpunkte aus Task 2; `IST_VORSCHAU` aus Task 3
- Produces: `<CustomerPreview shootingId={string} onClose={() => void} />`; `usePreviewSession()` → `{ sitzung, starten, beenden, fehler }`

- [ ] **Step 1: Den Sitzungs-Hook schreiben**

`src/features/Preview/usePreviewSession.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";

import { pb } from "../../config/pocketbase";

export interface PreviewSitzung {
  token: string;
  userId: string;
  expiresAt: string;
  spiegelt: { anzahl: number; name: string };
}

/*
  Stellt eine Vorschau-Sitzung aus und raeumt sie wieder ab.

  Die Laufzeit haengt am Datensatz, nicht am Token: erst das Loeschen des
  Schattenkontos macht das Token wertlos. Deshalb wird hier in jedem Ausgang
  geloescht — beim Schliessen, beim Verlassen der Seite und beim Ablauf.
*/
export function usePreviewSession() {
  const [sitzung, setSitzung] = useState<PreviewSitzung | null>(null);
  const [fehler, setFehler] = useState<string>("");
  const laufendeId = useRef<string>("");

  const beenden = useCallback(async () => {
    const userId = laufendeId.current;
    laufendeId.current = "";
    setSitzung(null);
    if (!userId) return;
    try {
      await pb.send("/api/custom/preview/session", {
        method: "DELETE",
        body: { userId },
      });
    } catch (error) {
      // Der Sweep raeumt es spaetestens nach Ablauf ab.
      console.error("preview session cleanup failed", error);
    }
  }, []);

  const starten = useCallback(async (shootingId: string) => {
    setFehler("");
    try {
      const antwort = (await pb.send("/api/custom/preview/session", {
        method: "POST",
        body: { shootingId },
      })) as PreviewSitzung;
      laufendeId.current = antwort.userId;
      setSitzung(antwort);
    } catch (error) {
      console.error("preview session failed", error);
      setFehler("Vorschau konnte nicht gestartet werden.");
    }
  }, []);

  // Ein geschlossener Tab darf kein Konto zuruecklassen. sendBeacon waere
  // zuverlaessiger, kann aber keine Authorization-Kopfzeile setzen — deshalb
  // der beste Versuch hier, mit dem Sweep als Netz.
  useEffect(() => {
    const abbauen = () => {
      if (laufendeId.current) void beenden();
    };
    window.addEventListener("pagehide", abbauen);
    return () => {
      window.removeEventListener("pagehide", abbauen);
      abbauen();
    };
  }, [beenden]);

  return { sitzung, starten, beenden, fehler };
}
```

- [ ] **Step 2: Die Vorschau-Komponente schreiben**

`src/features/Preview/CustomerPreview.tsx`:

```tsx
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useEffect, useRef, useState } from "react";

import { usePreviewSession } from "./usePreviewSession";

type Ansicht = "link" | "angemeldet";

const s = stylex.create({
  huelle: {
    position: "fixed", inset: 0, zIndex: 200,
    display: "flex", flexDirection: "column",
    backgroundColor: "var(--color-background-body)",
  },
  leiste: {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    padding: "8px 12px", borderBottom: "1px solid var(--color-border)",
  },
  wachsen: { flex: 1 },
  rahmen: { flex: 1, width: "100%", border: 0 },
});

function spiegeltText(anzahl: number, name: string): string {
  if (anzahl === 0) return "Diese Galerie ist noch niemandem zugeordnet";
  if (anzahl === 1) return `Zugriff von ${name || "einer Kundin"}`;
  return `Zugriff von ${anzahl} Personen — alle sehen dasselbe`;
}

export default function CustomerPreview({
  shootingId,
  onClose,
}: {
  shootingId: string;
  onClose: () => void;
}): ReactElement {
  const [ansicht, setAnsicht] = useState<Ansicht>("link");
  const { sitzung, starten, beenden, fehler } = usePreviewSession();
  const rahmen = useRef<HTMLIFrameElement>(null);

  // Das Schattenkonto entsteht erst beim Umschalten: die Link-Ansicht ist
  // anonym erreichbar (shootings.viewRule ist leer) und braucht kein Token.
  useEffect(() => {
    if (ansicht === "angemeldet" && !sitzung) void starten(shootingId);
  }, [ansicht, sitzung, shootingId, starten]);

  // Das Token geht per postMessage, nicht ueber die URL — dort landete es in
  // Verlauf und Serverlogs. Das iframe meldet sich bereit, wir antworten.
  useEffect(() => {
    const hoeren = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.typ !== "vorschau-bereit" || !sitzung) return;
      rahmen.current?.contentWindow?.postMessage(
        { typ: "vorschau-token", token: sitzung.token },
        window.location.origin,
      );
    };
    window.addEventListener("message", hoeren);
    return () => window.removeEventListener("message", hoeren);
  }, [sitzung]);

  const schliessen = () => {
    void beenden();
    onClose();
  };

  const quelle =
    ansicht === "link"
      ? `/publicAlbum/${shootingId}?vorschau=1`
      : `/album?vorschau=1`;

  return (
    <div {...stylex.props(s.huelle)} data-testid="kundenansicht">
      <div {...stylex.props(s.leiste)}>
        <Button
          variant={ansicht === "link" ? "primary" : "secondary"}
          label="Mit Link geöffnet"
          onClick={() => setAnsicht("link")}
          data-testid="ansicht:link"
        />
        <Button
          variant={ansicht === "angemeldet" ? "primary" : "secondary"}
          label="Als angemeldete Kundin"
          onClick={() => setAnsicht("angemeldet")}
          data-testid="ansicht:angemeldet"
        />
        <div {...stylex.props(s.wachsen)}>
          <Text type="supporting" color="secondary">
            {fehler
              ? fehler
              : ansicht === "angemeldet" && sitzung
                ? `${spiegeltText(sitzung.spiegelt.anzahl, sitzung.spiegelt.name)} · Bestellungen und Downloads bleiben hier leer`
                : "Wie jemand die Galerie über den Freigabelink sieht"}
          </Text>
        </div>
        <Button variant="ghost" label="Schließen" onClick={schliessen} data-testid="vorschau:schliessen" />
      </div>
      {(ansicht === "link" || sitzung) && (
        <iframe
          ref={rahmen}
          key={ansicht}
          src={quelle}
          title="Kundenansicht"
          {...stylex.props(s.rahmen)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Den Empfang im Vorschaumodus einbauen**

In `src/main.tsx`, vor dem Rendern der App: im Vorschaumodus auf das Token warten, statt sofort zu rendern. Direkt nach den Imports einfuegen:

```tsx
import { IST_VORSCHAU, pb } from "./config/pocketbase";

// Im Vorschaumodus kommt das Token per postMessage vom Elternfenster. Vorher
// zu rendern hiesse, unangemeldete Abfragen loszuschicken und ein falsches
// Bild zu zeigen — deshalb wird das Rendern bis dahin zurueckgehalten.
async function mitVorschauToken(rendern: () => void): Promise<void> {
  if (!IST_VORSCHAU) {
    rendern();
    return;
  }
  const hoeren = (ev: MessageEvent) => {
    if (ev.origin !== window.location.origin) return;
    if (ev.data?.typ !== "vorschau-token") return;
    window.removeEventListener("message", hoeren);
    // Genau das Muster, das adoptHandoffToken() weiter oben in dieser Datei
    // schon benutzt: save() legt nur das Token ab, erst authRefresh() laedt
    // den Datensatz nach. Ohne den zweiten Schritt bliebe authStore.model
    // leer und currentUser() (src/config/currentUser.ts) gaebe null zurueck —
    // AlbumPage zeigte dann eine leere Seite statt der Kundenansicht.
    pb.authStore.save(ev.data.token, null);
    pb.collection("users").authRefresh()
      .catch(() => pb.authStore.clear())
      .finally(rendern);
    return;
  };
  window.addEventListener("message", hoeren);
  window.parent?.postMessage({ typ: "vorschau-bereit" }, window.location.origin);
  // Die Link-Ansicht braucht kein Token — kommt keins, wird trotzdem
  // gerendert, dann eben anonym.
  window.setTimeout(() => {
    window.removeEventListener("message", hoeren);
    rendern();
  }, 1500);
}
```

Der bestehende `createRoot(...).render(...)`-Aufruf wandert in die Rückruffunktion: `mitVorschauToken(() => { /* bisheriger render-Aufruf */ });`

- [ ] **Step 4: Prüfen**

Run: `npm test && npm run test:check`
Expected: alle Tests grün, Typprüfung sauber.

- [ ] **Step 5: Commit**

```bash
git add src/features/Preview/ src/main.tsx
git commit -m "feat(vorschau): Rahmen, Umschalter und Token-Uebergabe"
```

---

### Task 5: Einstiegspunkte und Sichtbarkeit

**Files:**
- Modify: `src/pages/admin/AdminAlbumPage.tsx` (Detailkopf, um Zeile 181-215)
- Modify: `src/pages/admin/BrandingPage.tsx`
- Modify: `src/pages/admin/AdminUsersPage.tsx:98`

**Interfaces:**
- Consumes: `<CustomerPreview shootingId onClose />` (Task 4)
- Produces: Knopf `data-testid="kundenansicht-oeffnen"` an beiden Stellen

- [ ] **Step 1: Schattenkonten aus der Nutzerliste filtern**

In `src/pages/admin/AdminUsersPage.tsx` den `getFullList`-Aufruf ergaenzen:

```ts
      const records = await pb.collection("users").getFullList({
        sort: "email",
        // Schattenkonten der Kundenansicht-Vorschau gehoeren nicht in die
        // Nutzerverwaltung — sie leben Minuten und sind keine Kundschaft.
        filter: "isPreview != true",
        requestKey: null,
      });
```

- [ ] **Step 2: Die zweite Nutzerliste filtern**

`src/utils/functions.ts:102` listet ebenfalls alle Nutzer, und zwar fuer zwei Aufrufer: die Kundenzuordnung in `AdminAlbumPage.tsx:305` und `OrdersPage.tsx:324`. Ein Schattenkonto stuende dort zur Auswahl. Der Filter gehoert deshalb in die Funktion, nicht in die Aufrufer:

```ts
export const getUsersSnapshot = async (): Promise<User[]> => {
  const records = await pb.collection("users").getFullList({
    // Schattenkonten der Kundenansicht-Vorschau sind keine Kundschaft und
    // duerfen weder in der Zuordnung noch in Bestelluebersichten auftauchen.
    filter: "isPreview != true",
    requestKey: null,
  });
```

Der Rest der Funktion bleibt unveraendert.

Danach zur Kontrolle:

```bash
grep -rn 'collection("users")' src/ | grep -iE "getFullList|getList"
```

Expected: nur noch die beiden gefilterten Stellen (`AdminUsersPage.tsx`, `functions.ts`). Findet sich eine dritte, gehoert sie in den Report.

- [ ] **Step 3: Knopf in der Galerie-Detailansicht**

In `src/pages/admin/AdminAlbumPage.tsx` den Zustand und den Knopf ergaenzen. Import:

```tsx
import CustomerPreview from "../../features/Preview/CustomerPreview";
```

Zustand in der Seitenkomponente:

```tsx
const [vorschauFuer, setVorschauFuer] = useState<string | null>(null);
```

Im Detailkopf (`data-testid="shooting-detail"`, um Zeile 181) einen Knopf:

```tsx
<Button
  variant="secondary"
  label="Kundenansicht"
  onClick={() => setVorschauFuer(shooting.id)}
  data-testid="kundenansicht-oeffnen"
/>
```

Und am Ende der Seitenkomponente, vor dem schliessenden Element:

```tsx
{vorschauFuer && (
  <CustomerPreview shootingId={vorschauFuer} onClose={() => setVorschauFuer(null)} />
)}
```

- [ ] **Step 4: Knopf auf der Branding-Seite**

In `src/pages/admin/BrandingPage.tsx` im Abschnitt `title="Branding"` denselben Knopf ergaenzen, der mit der zuletzt angelegten Galerie startet:

```tsx
const [letzteGalerie, setLetzteGalerie] = useState<string>("");

useEffect(() => {
  pb.collection("shootings")
    .getList(1, 1, { sort: "-created", requestKey: null })
    .then((res) => setLetzteGalerie(res.items[0]?.id ?? ""))
    .catch(() => setLetzteGalerie(""));
}, []);
```

```tsx
<Button
  variant="secondary"
  label="Kundenansicht"
  disabled={!letzteGalerie}
  onClick={() => setVorschauFuer(letzteGalerie)}
  data-testid="kundenansicht-oeffnen"
/>
{!letzteGalerie && (
  <Text type="supporting" color="secondary">
    Sobald du eine Galerie angelegt hast, kannst du sie hier aus Kundensicht ansehen.
  </Text>
)}
```

Dazu derselbe Zustand und dieselbe Einbindung wie auf der Album-Seite:

```tsx
import CustomerPreview from "../../features/Preview/CustomerPreview";

const [vorschauFuer, setVorschauFuer] = useState<string | null>(null);
```

und am Ende der Seitenkomponente:

```tsx
{vorschauFuer && (
  <CustomerPreview shootingId={vorschauFuer} onClose={() => setVorschauFuer(null)} />
)}
```

- [ ] **Step 5: Im Browser prüfen**

Run: `npm run dev`, als Admin auf `/album` eine Galerie waehlen, „Kundenansicht" oeffnen.
Expected: Die Link-Ansicht erscheint sofort ohne Sitzung. Umschalten auf „Als angemeldete Kundin" stellt eine Sitzung aus, die Leiste nennt den gespiegelten Zugriff und den Hinweis auf leere Bestellungen. Schliessen raeumt auf. Danach bist du **noch als Admin angemeldet**.

- [ ] **Step 6: Prüfen und committen**

Run: `npm test && npm run test:check`

```bash
git add src/pages/admin/AdminAlbumPage.tsx src/pages/admin/BrandingPage.tsx src/pages/admin/AdminUsersPage.tsx
git commit -m "feat(vorschau): Einstiegspunkte und Filter gegen Schattenkonten"
```

---

### Task 6: End-to-End-Absicherung

**Files:**
- Create: `e2e/tests/admin/kundenansicht.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `DEMO_ADMIN` aus `../../support/fixtures`; `PbAdmin` aus `../../support/pb`

- [ ] **Step 1: Bestehende Muster lesen**

Lies `e2e/tests/einstellungen/branding.spec.ts` und `e2e/support/pb.ts`, bevor du schreibst — Anmeldung, Fixtures und Aufraeumen folgen dort einem festen Muster.

- [ ] **Step 2: Die Tests schreiben**

`e2e/tests/admin/kundenansicht.spec.ts`:

```ts
// Workflow: Fotograf schaut sich eine Galerie aus Kundensicht an.
//
// Legt Schattenkonten an und loescht sie wieder. Laeuft deshalb seriell,
// damit ein paralleler Test keine halb abgeraeumte Nutzerliste sieht.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { PbAdmin } from "../../support/pb";

test.describe.configure({ mode: "serial" });

test("Fotograf sieht die Galerie so, wie sie über den Link erscheint", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");

  await page.getByTestId("shooting-detail").waitFor();
  await page.getByTestId("kundenansicht-oeffnen").click();

  const vorschau = page.getByTestId("kundenansicht");
  await expect(vorschau).toBeVisible();

  // Die Link-Ansicht ist anonym — sie darf ohne Sitzung sofort da sein.
  const rahmen = page.frameLocator('iframe[title="Kundenansicht"]');
  await expect(rahmen.locator("body")).toBeVisible();
});

test("die angemeldete Ansicht stellt eine Sitzung aus und raeumt sie wieder ab", async ({ page, anmelden }) => {
  const pb = new PbAdmin();
  await pb.login();

  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByTestId("shooting-detail").waitFor();
  await page.getByTestId("kundenansicht-oeffnen").click();
  await page.getByTestId("ansicht:angemeldet").click();

  // Waehrend die Vorschau offen ist, existiert genau ein Schattenkonto.
  await expect(async () => {
    const offen = await pb.list("users", "isPreview = true");
    expect(offen.length).toBe(1);
  }).toPass({ timeout: 10000 });

  await page.getByTestId("vorschau:schliessen").click();

  await expect(async () => {
    const uebrig = await pb.list("users", "isPreview = true");
    expect(uebrig.length).toBe(0);
  }).toPass({ timeout: 10000 });
});

test("nach dem Schliessen ist der Admin noch angemeldet", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByTestId("shooting-detail").waitFor();
  await page.getByTestId("kundenansicht-oeffnen").click();
  await page.getByTestId("ansicht:angemeldet").click();
  await page.getByTestId("vorschau:schliessen").click();

  // Die teuerste denkbare Regression: die Vorschau ueberschreibt die
  // Admin-Sitzung im selben localStorage.
  await page.goto("/branding");
  await expect(page.getByTestId("abschnitt:Branding")).toBeVisible();
});

test("eine Kundin darf keine Vorschau-Sitzung ausstellen", async ({ page }) => {
  // Das Verstecken des Knopfes ist keine Sicherheit — der Endpunkt muss selbst
  // ablehnen. Wichtigster Test der Datei.
  const antwort = await page.request.post("/api/custom/preview/session", {
    data: { shootingId: "egal" },
  });
  expect(antwort.status()).toBe(403);
});
```

- [ ] **Step 3: Laufen lassen**

Run: `npm run e2e:check && npx playwright test e2e/tests/admin/kundenansicht.spec.ts`
Expected: 4/4 grün.

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/admin/kundenansicht.spec.ts
git commit -m "test(vorschau): Kundenansicht und Sicherheitsgrenze end-to-end"
```

---

## Was dieser Plan bewusst nicht tut

- **Kein ungespeicherter Entwurf in der Kundenvorschau.** Die bestehende Live-Vorschau deckt das ab; ein zweiter Kanal ins iframe waere eine zweite Quelle fuer den Einstellungszustand.
- **Kein Kopieren des Kundennamens** in das Schattenkonto. Die Leiste nennt den gespiegelten Zugriff.
- **Keine Bestellhistorie in der Vorschau.** Sie haengt an `userId = @request.auth.id` und ist mit einem Schattenkonto strukturell leer — die Leiste sagt das.
- **Kein `sendBeacon` beim Tabschliessen.** Es kann keine Authorization-Kopfzeile setzen; der Sweep ist das Netz.
