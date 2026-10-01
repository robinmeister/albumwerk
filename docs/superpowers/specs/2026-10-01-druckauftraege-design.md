# Druckaufträge — bestellte Abzüge über Prodigi drucken und versenden

Zweck: Bestellt eine Kund:in Drucke (z. B. „13×18 cm“), wird daraus nach der
Zahlung ein Auftrag beim Fotolabor Prodigi. Das Labor schickt entweder direkt
an die Kund:in oder an die Fotograf:in, die weiterversendet. Erfolg heißt: Die
Fotograf:in tippt nach der Zahlung nichts mehr ab, gibt nur noch frei und sieht
Status und Sendungsnummer im Admin.

## Beschlüsse

- **Konto der Fotograf:in.** Sie hinterlegt ihren eigenen Prodigi-API-Schlüssel
  (wie Stripe/PayPal). Prodigi rechnet direkt mit ihr ab; Albumwerk leitet nur
  weiter, streckt nichts vor und ist nicht Händlerin.
- **Ein Labor: Prodigi.** Einziger geprüfter Anbieter mit offener Bestell-API,
  echten Fotoabzügen und neutralem Direktversand; kostenlose Sandbox. Keine
  Anbieter-Abstraktion — ein zweites Labor bekommt sie, wenn es kommt.
  (WhiteWall, Saal Digital, CEWE: keine öffentliche Bestell-API; Gelato: kaum
  klassische Abzüge.)
- **Kuratierte Liste plus eigene Preise.** Albumwerk liefert eine feste Auswahl
  Prodigi-Produkte; die Fotograf:in aktiviert sie und setzt ihren Verkaufspreis.
  Eigene Preise kann sie weiter anlegen und optional mit einer Artikelnummer
  verknüpfen — aus der Liste oder frei eingetippt. Technisch ein Weg: ein Preis
  hat `labSku` oder nicht.
- **Lieferweg: Grundeinstellung, pro Auftrag änderbar.** `customer` (direkt an
  Kund:in) oder `studio` (an die Fotograf:in).
- **Nichts geht ohne Freigabe ans Labor.** Ein Klick im Admin; bis dahin kann
  sie retuschieren, den Lieferweg ändern oder stornieren.
- **Versandpauschale mit Grenze für kostenlosen Versand.** Gilt pro Bestellung,
  sobald mindestens eine Position `labSku` hat, für alle Zielländer gleich.

## Nicht im Umfang

Pakete mit Drucken (Pakete verkaufen weiter Bilder), mehrere Labore,
Teilstornos, länderabhängige Versandkosten, automatische Rückerstattung,
Prüfung der Artikelnummer beim Speichern eines Preises.

## Datenmodell

**`prices`** — neues Feld `labSku` (Text, optional). Leer = kein Laborauftrag,
Verhalten wie heute.

**Kuratierte Liste** — Konstante in `pb_hooks/lib/printlablib.js`: je Eintrag
Name, Format (z. B. „13×18 cm“), `category` und Prodigi-SKU. Konkrete SKUs
werden bei der Umsetzung gegen den Sandbox-Katalog geprüft. „Aktivieren“ legt
einen normalen `prices`-Datensatz an (`category: "print"`, `size`, `labSku`,
`isDownloadable: false`) mit dem Verkaufspreis der Fotograf:in.

**`settings`** — neue Felder:

| Feld | Typ | Zweck |
|---|---|---|
| `prodigiApiKey` | Text, nur Admin lesbar wie `stripeSecretKey` | Zugang |
| `prodigiLive` | Bool | Sandbox oder Live |
| `printDefaultRoute` | `customer` \| `studio` | Grundeinstellung Lieferweg |
| `studioAddress` | JSON (`name`, `line1`, `line2`, `zip`, `city`, `country`) | Ziel bei `studio` |
| `shippingFlat` | Zahl | Versandpauschale |
| `freeShippingFrom` | Zahl, 0 = nie | Warenwert, ab dem der Versand entfällt |

**`users`** — neues Feld `country` (ISO-2, Vorgabe `DE`). Im Checkout Pflicht,
sobald eine Position `labSku` hat (Prodigi verlangt das Land).

**`printJobs`** — neue Sammlung, Lesen und Schreiben nur für Admins:

| Feld | Inhalt |
|---|---|
| `orderId` | Bezug auf `orders` |
| `route` | `customer` \| `studio` |
| `recipient` | JSON-Snapshot der Adresse zum Zeitpunkt der Zahlung |
| `items` | JSON: je Position Bild-ID, `labSku`, Anzahl |
| `status` | `awaiting_approval`, `submitted`, `in_production`, `shipped`, `delivered_to_customer`, `cancelled`, `failed` |
| `labOrderId` | Prodigi-Auftrags-ID |
| `trackingUrl`, `trackingNumber` | Sendung vom Labor bzw. eigene beim Weiterversand |
| `labCost` | Kosten laut Prodigi |
| `error` | lesbare Fehlermeldung |

Die Laborkosten liegen bewusst nicht an `orders`: Kund:innen dürfen ihre
`orders` lesen, und PocketBase kann Felder nicht einzeln sperren.

`delivered_to_customer` gibt es nur beim Weg `studio`: Die Fotograf:in hat
selbst weiterversendet.

## Ablauf

1. **Checkout.** `authoritativeTotal` (`pb_hooks/lib/checkoutlib.js`) schlägt
   `shippingFlat` auf, wenn eine Position einen Preis mit `labSku` trägt und der
   Warenwert unter `freeShippingFrom` liegt (oder `freeShippingFrom` 0 ist). Der
   Server bleibt die einzige Preisquelle. Die Oberfläche zeigt den Versand als
   eigene Zeile; `PaymentForm` verlangt bei Laborpositionen zusätzlich `country`.
2. **Nach der Zahlung.** `finalizeOrder` legt pro Bestellung mit
   Laborpositionen einen `printJob` an: Status `awaiting_approval`,
   Lieferweg aus `printDefaultRoute`, Adresse aus `userData`. Die Fotograf:in
   bekommt die E-Mail „Neue Druckbestellung wartet auf Freigabe“.
3. **Freigabe.** Neue Admin-Seite „Druckaufträge“: Liste mit Status, Lieferweg
   umschaltbar solange `awaiting_approval`, Knopf „An Labor senden“. Der Server
   baut den Prodigi-Auftrag (`POST /v4.0/orders`):
   - `recipient` aus `recipient` bzw. `studioAddress`, je nach Lieferweg;
   - je Position ein Asset mit signiertem Link
     `/api/custom/printfile/{jobId}/{imageId}?exp=…&sig=…` (HMAC-SHA256,
     14 Tage gültig) — liefert das Original nur, wenn das Bild zu diesem
     Auftrag gehört. PocketBase-Dateitokens laufen nach Minuten ab, Prodigi
     lädt aber später und wiederholt Fehlversuche;
   - `idempotencyKey` = `printJob.id`, `merchantReference` = `orderId`,
     `callbackUrl` = `/api/custom/prodigi/callback`;
   - danach `submitted` und `labOrderId` gesetzt.
4. **Webhook.** `/api/custom/prodigi/callback` nimmt aus dem Rumpf nur die
   Auftrags-ID, sucht den passenden `printJob` und holt den Auftrag selbst bei
   Prodigi ab (`GET /v4.0/orders/{id}`). Status, Sendung und `labCost` kommen
   aus dieser Antwort, nie aus dem Rumpf — wie bei `stripe/verify`.
5. **Versendet.**
   - `customer`: Kund:in bekommt eine E-Mail mit Sendungslink im Branding der
     Fotograf:in (`emaillib`).
   - `studio`: Fotograf:in bekommt die Sendungsnummer. Hat sie weiterversendet,
     klickt sie „An Kund:in versendet“, trägt optional eine eigene
     Sendungsnummer ein; Status `delivered_to_customer`, Kund:in bekommt
     dieselbe E-Mail.

## Fehlerbehandlung

- **Prodigi lehnt ab oder ist nicht erreichbar:** `failed`, Meldung in `error`,
  Knopf wird „Erneut senden“. Gleicher `idempotencyKey` verhindert doppelte
  Aufträge. Zahlung und Bestellung bleiben unberührt.
- **Bild nicht ladbar / Fehler im Labor:** kommt per Webhook, `failed`,
  Fotograf:in bekommt eine E-Mail.
- **Ungültige eigene Artikelnummer:** fällt beim Absenden auf, Behandlung wie
  „Prodigi lehnt ab“.
- **Stornieren:** bei `awaiting_approval` lokal (`cancelled`). Danach wird
  Prodigis Storno versucht (`POST /v4.0/orders/{id}/actions/cancel`) und das
  Ergebnis angezeigt. Erstattung macht die Fotograf:in wie bisher selbst.
- **Kein API-Schlüssel:** Laborpreise sind trotzdem verkaufbar; Aufträge
  bleiben in `awaiting_approval`, die Seite sagt „Prodigi-Schlüssel fehlt“.
  `verkaufslib` meldet das als weiche Warnung, sobald ein Preis `labSku` hat.
- **Gefälschter Webhook:** wirkungslos, weil der Status immer bei Prodigi
  nachgefragt wird. Unbekannte Auftrags-IDs werden mit 200 quittiert und
  ignoriert.

## Tests

Nach dem Muster von `tests/paketkauf.test.ts` (Hook-Bibliothek direkt
eingebunden, JSVM-Globals als Attrappen):

- Versandpauschale: aufgeschlagen bei Laborposition, entfällt ab
  `freeShippingFrom`, entfällt bei rein digitaler Bestellung.
- `finalizeOrder`: legt `printJob` nur bei Laborpositionen an, mit richtigem
  Lieferweg und Adress-Snapshot.
- Abbildung `printJob` → Prodigi-Anfrage, inklusive `idempotencyKey` und
  Empfänger je Lieferweg.
- Signierter Link: gültig, abgelaufen, falsche Signatur, Bild nicht im Auftrag.
- Webhook: Status kommt aus der Abfrage bei Prodigi, nicht aus dem Rumpf.

Ein E2E-Durchlauf gegen die Prodigi-Sandbox wird von Hand gestartet, nicht in
der CI, weil er einen echten Sandbox-Schlüssel braucht.

## Datenschutz

Name und Adresse gehen an Prodigi. `src/utils/legalTemplates.ts` nennt das
beauftragte Fotolabor bereits als Empfänger; die Fotograf:in braucht einen
AV-Vertrag mit Prodigi. Die Einrichtungsseite weist darauf hin.
