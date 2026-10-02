# Kundenseite „Drucke“ — bestellte Drucke und ihr Versandstatus

Zweck: Kund:innen sehen neben „Downloads“ eine Seite „Drucke“. Dort steht,
welche Drucke sie bestellt haben und ob sie in Bearbeitung, im Druck oder
schon versendet sind, bei versendeten Drucken mit Sendungsverfolgung. Das
gilt für Drucke über das Labor (Prodigi) und für Drucke, die die Fotograf:in
selbst verschickt.

Baut auf `2026-10-01-druckauftraege-design.md` auf.

## Beschlüsse

- **Alle physischen Produkte erscheinen**, nicht nur Laborprodukte.
  Physisch heißt: Der Preis ist nicht `isDownloadable`.
- **„Abschicken“ heißt „versendet“.** Der bestehende Button auf der
  Bestellseite (legt einen Eintrag in `finishedOrders` an) ist der
  Versandstatus für Drucke ohne Labor. Es gibt keinen zweiten Status an der
  Bestellung.
- **Ein Lese-Endpunkt statt offener Leserechte.** `printJobs` bleibt nur für
  Admins lesbar, weil PocketBase einzelne Felder (Laborkosten, Fehler,
  Prodigi-ID) nicht sperren kann. Ein Server-Endpunkt liefert der Kundin
  eine bereinigte Sicht.
- **Fehler beim Labor sieht die Kundin nicht.** Sie sieht „In Bearbeitung“;
  den Fehler löst die Fotograf:in.

## Nicht im Umfang

Teillieferungen innerhalb einer Gruppe, Rücksendungen, Push-Nachrichten,
Pakete (Pakete verkaufen Bilder, keine Abzüge).

## Kundenstatus

Drei Werte, plus Storno: `processing` („In Bearbeitung“), `printing` („Wird
gedruckt“), `shipped` („Versendet“), `cancelled` („Storniert“).

| Quelle | interner Stand | Kundenstatus | Sendung |
|---|---|---|---|
| Labor | `awaiting_approval`, `submitted`, `failed` | `processing` | — |
| Labor | `in_production` | `printing` | — |
| Labor, Weg `customer` | `shipped` | `shipped` | aus dem Auftrag |
| Labor, Weg `studio` | `shipped` | `processing` | — (Sendung Labor → Studio bleibt verborgen) |
| Labor, Weg `studio` | `delivered_to_customer` | `shipped` | eigene der Fotograf:in, falls angegeben |
| Labor | `cancelled` | `cancelled` | — |
| ohne Labor | kein Eintrag in `finishedOrders` für die Bestellung | `processing` | — |
| ohne Labor | Eintrag in `finishedOrders` | `shipped` | aus `finishedOrders`, falls angegeben |

Eine Bestellung kann beide Gruppen enthalten (Labor- und Handdrucke). Jede
Gruppe hat dann ihren eigenen Status, weil sie getrennt verschickt werden.

## Server

**`pb_hooks/lib/druckelib.js`** (rein, unter Vitest testbar):

- `customerStatus(job)` → `{ status, trackingUrl, trackingNumber }` aus
  `{ status, route, trackingUrl, trackingNumber }` eines Druckauftrags, nach
  der Tabelle oben.
- `manualStatus(finished)` → dasselbe für Handdrucke; `finished` ist der
  Archiveintrag oder `null`.
- `groupsForOrder(order, physicalItems, job, finished)` → Liste von Gruppen
  `{ kind: "lab" | "manual", status, trackingUrl, trackingNumber, items:
  [{ image, title, quantity }] }`. Eine Position gehört zur Gruppe `lab`, wenn
  ihr Preis ein `labSku` hat **und** es zu der Bestellung einen Druckauftrag
  gibt; sonst zu `manual`. Leere Gruppen fallen weg.

**`GET /api/custom/drucke`** (`pb_hooks/drucke.pb.js`, `requireAuth`):

- Liest alle `orders` mit `userId = e.auth.id`, neueste zuerst.
- Pro Bestellung: physische Positionen über die `prices`-Sammlung bestimmen
  (nie aus der Client-Liste), den Druckauftrag über `orderId` und den
  Archiveintrag über `orderId` suchen, `groupsForOrder` aufrufen.
- Bestellungen ohne physische Positionen fallen weg.
- Antwort: `{ orders: [{ id, created, groups }] }`. Die Antwort enthält keine
  Laborkosten, keine Fehlermeldung, keine Prodigi-ID und keinen Lieferweg.

**Versand-Mail für Handdrucke:** `onRecordAfterCreateSuccess` auf
`finishedOrders`. Hat die zugehörige Bestellung Positionen ohne Labor, die
physisch sind, geht an die Kundin „Deine Drucke sind unterwegs“, mit
Sendungsnummer und Link, falls angegeben. Gleicher Aufbau wie
`notifyCustomerShipped` in `printmaillib.js`; Empfänger ist die E-Mail aus
`userData` der Bestellung. Fehler beim Mailversand werden geloggt und kippen
nichts.

**Schema** (neue Migration): `finishedOrders` bekommt `trackingNumber` und
`trackingUrl` (Text). `trackingUrl` wird beim Mailversand und in der Antwort
nur übernommen, wenn sie mit `http://` oder `https://` beginnt.

## Oberfläche

**Kundin:** neue Seite `src/pages/user/PrintsPage.tsx` unter `/prints`,
Navigationseintrag „Drucke“ in `userNavItems` nach „Downloads“.

- Pro Bestellung eine Karte: Datum, darunter je Gruppe die Positionen
  (Vorschaubild über `thumbUrl`, Produkt, Anzahl), ein Status-Badge und bei
  Sendung „Sendung verfolgen“ (Link, `rel="noopener noreferrer"`) oder die
  Sendungsnummer als Text.
- Leerzustand wie auf „Downloads“: „Du hast noch keine Drucke bestellt.“
- Fehler beim Laden: Hinweis „Deine Drucke konnten nicht geladen werden.“
  statt Leerzustand.

**Fotograf:in:** „Abschicken“ in `OrdersPage.tsx` und `OrderDetailsPage.tsx`.
Enthält die Bestellung physische Positionen ohne Labor, erscheinen vorher zwei
optionale Felder „Sendungsnummer“ und „Link zur Sendungsverfolgung“; ihre
Werte gehen mit in den `finishedOrders`-Eintrag. Rein digitale Bestellungen
und reine Laborbestellungen: unverändert, keine Felder.

## Tests

- `customerStatus` und `manualStatus`: jede Zeile der Statustabelle.
- `groupsForOrder`: nur Labor, nur Hand, gemischt, Laborpreis ohne
  Druckauftrag landet bei Hand, leere Gruppen fallen weg.
- Endpunkt-Antwort: keine Felder außer den genannten (Test über die reine
  Funktion, die die Antwort baut).
- Mail-Bedingung: nur bei physischen Positionen ohne Labor.
