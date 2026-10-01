# Kundenansicht-Vorschau — Entwurf und Beschlusslage

> **Stand: 2026-08-28.** Ergebnis einer Durcharbeitung vor der Umsetzung.
> Dieses Dokument hält die *Entscheidungen* fest, nicht den Code —
> insbesondere die Begründungen, damit später nachvollziehbar ist, warum eine
> Alternative verworfen wurde. Abweichungen bei der Umsetzung gehören hier
> nachgetragen.

## Ziel

Admins sollen sehen, was ihre Kundschaft tatsächlich sieht — und zwar so, dass
die Antwort belastbar ist: nicht nur „sieht die Gestaltung richtig aus", sondern
„ist diese Galerie richtig freigegeben".

Die bestehende Live-Vorschau auf `/branding` bleibt daneben stehen. Sie zeigt
den *ungespeicherten Entwurf* an einer kleinen Beispielkarte. Die Kundenansicht
zeigt den *gespeicherten Stand* an der echten Seite. Zwei Fragen, zwei
Werkzeuge.

## Ausgangslage: es gibt zwei Kundenansichten

| Route | Layout | Wer sieht sie | Datenbedarf |
|---|---|---|---|
| `/publicAlbum/:shootingId` | `EmptyLayout` | wer den Freigabelink oder QR-Code öffnet, ohne Konto | nur `shootingId` + Einstellungen (`PublicAlbumPage`, 121 Zeilen, kennt keinen Benutzer) |
| `/album` | `Layout` mit Kundennavigation | angemeldete Kundschaft | `currentUser()`, daraus Profil und Shootings (`AlbumPage`, 334 Zeilen) |

`Layout` verzweigt ausschließlich über `isAdmin` (Navigation, Menü, Breite) —
die Kundenhülle ist also billig zu haben. Die Schwierigkeit steckt allein
darin, dass `/album` an eine angemeldete Identität gebunden ist.

## Das Zugriffsmodell, an dem alles hängt

Aus `pb_migrations/1782300000_init_schema.js`:

| Sammlung | Regel |
|---|---|
| `shootings` | `viewRule: ""` (eine einzelne Galerie ist öffentlich lesbar), `listRule: isAdmin \|\| @request.auth.shootingIds ~ id` |
| `images` | `listRule/viewRule: isAdmin \|\| type = "preview" \|\| @request.auth.shootingIds ~ shootingId` |
| `userSelection` | `create/update/deleteRule: isAdmin \|\| userId = @request.auth.id` |
| `orders` | `listRule/viewRule: isAdmin \|\| userId = @request.auth.id`; `createRule: isAdmin` (durch `1784600003_lock_customer_order_create.js` geschlossen) |
| `users` | `view/update/deleteRule: isAdmin \|\| id = @request.auth.id` |

Die Verknüpfung Kundin↔Galerie ist das Feld `users.shootingIds`.

**Daraus folgt das Kernproblem:** Ein Admin hat `isAdmin = true` und damit
Zugriff auf alles. Rendert man die Kundenseite mit dem Admin-Token, zeigt die
Vorschau mehr, als die Kundin je sähe — und beantwortet die Frage, für die sie
gebaut wird, gerade nicht.

## Gestalt der Funktion

Zwei Einstiegspunkte, eine Oberfläche:

- **Galerie-Liste im Admin** — Knopf „Kundenansicht" je Galerie, zeigt diese
  Galerie.
- **`/branding`** — derselbe Knopf, startet mit einer deiner Galerien. Gibt es
  noch keine, ist er deaktiviert und nennt den Grund.

  **Korrigiert am 2026-08-28 nach Task 5.** Ursprünglich stand hier „die
  zuletzt angelegte Galerie". Das ist nicht ermittelbar: die
  `shootings`-Sammlung führt **kein Datumsfeld** — weder `created` noch
  `updated` noch ein fachliches Datum (Felder: id, title, description, type,
  packageId, priceIds, userIds, withUserSelection, shootingPaid, coverImage,
  firebaseId). Ein `sort: "-created"` scheitert mit HTTP 400, und die IDs sind
  teils aus der Firebase-Migration übernommen, also nicht zeitlich sortierbar.
  Gewählt wird deshalb die alphabetisch erste Galerie — deterministisch und
  erklärbar. Wer eine bestimmte sehen will, öffnet sie aus der Galerieliste;
  und die Leiste über der Vorschau nennt ohnehin, welche Galerie gezeigt wird,
  sodass niemand über die falsche im Unklaren bleibt.

Die Vorschau ist ein Rahmen über der Seite mit der echten Kundenseite darin,
oben ein Umschalter **„Mit Link geöffnet" ↔ „Als angemeldete Kundin"** — genau
die zwei Ansichten, die es gibt. Die Leiste nennt Galerie, gespiegelten Zugriff
und Restlaufzeit.

Nur die angemeldete Ansicht braucht das Schattenkonto. „Mit Link geöffnet"
lädt `/publicAlbum/:shootingId` ganz ohne Token — `shootings.viewRule` ist
leer, die Seite kennt keinen Benutzer. Das Schattenkonto wird deshalb erst
ausgestellt, wenn jemand auf die angemeldete Ansicht umschaltet, und die
Laufzeit beginnt auch erst dann.

**Beschluss: die Kundenvorschau zeigt den gespeicherten Stand**, nicht den
ungespeicherten Entwurf. Sie läuft als eigene App-Instanz und lädt die
Einstellungen frisch. Auf `/branding` heißt das: erst speichern, dann
Kundenansicht. Den Entwurfsfall deckt die bestehende Live-Vorschau ab.

## Das Schattenkonto

**Beschluss:** Die Vorschau übernimmt *nicht* die Identität der Kundin, sondern
authentifiziert sich als kurzlebiges Konto mit denselben `shootingIds`.

Begründung: Die Zugriffsregeln für Galerie und Bilder hängen ausschließlich an
`shootingIds`. Ein Konto mit demselben Anspruch bekommt daher dieselbe
Auswertung — die Regeln selbst tun die Arbeit, nichts wird nachgebaut.
Gleichzeitig kann kein Schreibzugriff die echte Kundin treffen: er landet beim
Schattenkonto und wird mit ihm gelöscht.

### Ausstellung

`POST /api/custom/preview/session` mit `{ shootingId }`:

1. prüft **serverseitig**, dass der Aufrufer `isAdmin` ist — das Verstecken des
   Knopfes ist keine Sicherheit
2. prüft, dass die Galerie existiert
3. legt ein Konto an: `shootingIds: [shootingId]`, `isAdmin: false`,
   `verified: true`, zufälliges Passwort, Adresse auf einer `.invalid`-Domain
   (per RFC 2606 reserviert, kann nie versehentlich Post bekommen),
   `isPreview: true`, `previewExpiresAt` = jetzt + 15 Minuten
4. antwortet mit `record.newAuthToken()` (`pb_data/types.d.ts:13608`), dem
   Ablaufzeitpunkt und der Angabe, wessen Zugriff gespiegelt wird

`DELETE /api/custom/preview/session` räumt beim Schließen auf.

### Die Laufzeit hängt am Datensatz, nicht am Token

Hier täuscht man sich leicht: `newAuthToken()` erbt die Gültigkeitsdauer der
Sammlung, die für `users` in Wochen gemessen wird. Kurzlebig wird die Sitzung
allein dadurch, dass **das Schattenkonto gelöscht wird** — danach ist das Token
wertlos, weil PocketBase den Datensatz mitprüft. Der Ablauf ist eine
Löschzusage, kein Token-Attribut.

Abgesichert wird sie zweifach: das Frontend löscht beim Schließen, und ein
`cronAdd`-Sweep räumt Übriggebliebenes ab (Muster: `previews.pb.js:96`,
`previewOrphans`, alle 15 Minuten).

### Migration und Sichtbarkeit

Zwei Felder auf `users`: `isPreview` (bool) und `previewExpiresAt` (date).

Schattenkonten dürfen nirgends auftauchen. `AdminUsersPage.tsx:98` listet
Nutzer per `getFullList` und filtert sie künftig aus. Bei der Umsetzung ist
zusätzlich jede Stelle zu prüfen, die Nutzer zählt oder anschreibt.

### Eine Galerie kann keine, eine oder mehrere Kundinnen haben

`users.shootingIds` ist ein Array, und `link_shooting.pb.js` hängt Konten
selbständig an Galerien an — „die Kundin einer Galerie" gibt es also nicht
zwangsläufig. Der Endpunkt löst deshalb auf, welche Konten die Galerie in
ihren `shootingIds` führen, und die Leiste sagt:

- **genau eine** → ihr Name
- **mehrere** → die Anzahl, denn alle sehen dasselbe: der Zugriff hängt an der
  Galerie, nicht an der Person
- **keine** → „noch niemandem zugeordnet". Das ist kein Fehlerfall, sondern
  die nützlichste Antwort überhaupt: die Vorschau zeigt dann, was jemand sähe,
  *sobald* die Galerie zugeordnet wird — und deckt auf, dass sie es noch nicht
  ist.

Das Schattenkonto selbst ist von alldem unberührt; es trägt nur die
`shootingIds`, und daran hängen die Regeln.

### Der Kundenname wird nicht kopiert

**Beschluss:** Das Schattenkonto trägt nicht den Namen der Kundin. Die
Kundenseite grüßt in der Vorschau also mit „Vorschau" statt mit ihrem
Vornamen. Den Namen zu kopieren wäre eine Zeile, legte aber
personenbezogene Daten in einen zweiten Datensatz — für einen kosmetischen
Gewinn. Stattdessen nennt die Leiste über der Vorschau, wessen Zugriff
gespiegelt wird.

## Sitzungstrennung

`pb` ist ein modulweiter Singleton (`src/config/pocketbase.ts`), den 42 Dateien
importieren, mit dem Standard-`LocalAuthStore`. Ein iframe läuft auf derselben
Herkunft — eine Anmeldung darin überschriebe also die Admin-Sitzung im
Elternfenster. Den Client durch React-Kontext zu reichen hieße, 42 Dateien
anzufassen.

**Beschluss:** Der Store wird beim Laden gewählt. Erkennt das Modul einen
Vorschau-Parameter in der URL, baut es den Client mit `BaseAuthStore` — reiner
Speicher, fasst `localStorage` nie an. Sonst bleibt alles wie bisher. Eine
Änderung in einer Datei.

Die Erkennung ist bewusst nur *privilegienmindernd*: wer sie fälscht, bekommt
eine Sitzung ohne Persistenz, sonst nichts.

**Das Token kommt nicht über die URL** — dort landete es in Verlauf und
Serverlogs. Das iframe meldet sich per `postMessage` bereit, das Elternfenster
antwortet mit dem Token und prüft dabei die Herkunft; erst danach rendert die
Vorschau.

## Aussagekraft und ihre Grenzen

Die Vorschau zeigt die Regelauswertung für jemanden, dessen einziger Anspruch
`shootingIds: [diese Galerie]` ist. Das beantwortet „ist diese Galerie richtig
freigegeben".

Sie zeigt **nicht**, was an der Benutzer-ID hängt: Bestellhistorie und
Downloads filtern auf `userId = @request.auth.id` und sind in der Vorschau
deshalb leer. Das ist der Preis des Schattenkontos. Die Leiste über der
Vorschau muss es benennen — sonst liest sich eine leere Bestellliste wie ein
Fehler.

## Tests

- **vitest** auf `pb_hooks/lib/previewlib.js`, eingebunden per `createRequire`
  wie `tests/time.test.ts` es mit `tzlib.js` tut: setzt der Bauplan
  `shootingIds` richtig, ist `isPreview` gesetzt, stimmt der Ablaufzeitpunkt,
  ist die Adresse nicht zustellbar
- **Playwright, der Weg:** Vorschau aus einer Galerie öffnen, Kundenansicht
  sehen, umschalten, schließen — danach ist das Schattenkonto weg
- **Playwright, die Sicherheitsgrenze:** ein Nicht-Admin ruft
  `POST /api/custom/preview/session` direkt auf und wird abgewiesen
- **Playwright, die teuerste Regression:** nach dem Schließen der Vorschau ist
  der Admin noch angemeldet

## Dateien

| Datei | Zweck |
|---|---|
| `pb_hooks/preview.pb.js` | die zwei Endpunkte und der Sweep |
| `pb_hooks/lib/previewlib.js` | reine Helfer, per `createRequire` testbar |
| `pb_migrations/1785700001_preview_accounts.js` | `isPreview`, `previewExpiresAt` |
| `src/config/pocketbase.ts` | die Store-Weiche |
| eine Vorschau-Komponente | Rahmen, Umschalter, Leiste |
| `src/pages/admin/AdminUsersPage.tsx` | Filter gegen Schattenkonten |

## Verworfene Alternativen

**Präsentationsvorschau (Admin-Token, Kundenfilter).** Am billigsten: die
Kundenkomponenten mit denselben Filtern rendern, die die Kundenseite benutzt.
Zeigt Gestaltung und echte Bilder — beweist aber nichts über Berechtigungen,
weil die Abfrage als Admin ohnehin durchgeht. Verworfen, weil genau diese
Frage beantwortet werden soll.

**Serverseitige Nutzlast.** Ein Admin-Endpunkt liefert, was die Kundin bekäme;
es entsteht nie ein Kunden-Token. Klingt sauber, hat aber den schlechtesten
Alterungsverlauf: die Zugriffsregel wird ein zweites Mal formuliert und driftet
von der echten ab.

**Echte Identität, kurze Laufzeit, Protokoll.** Höchste Wiedergabetreue
inklusive Bestellhistorie, bleibt aber technisch schreibfähig: ein Fehlklick in
der Vorschau änderte die echte Bildauswahl der Kundin, und das Protokoll sagte
es erst hinterher.

**Echte Identität, gehärtete Schreibregeln.** Dicht und vollständig treu, fasst
aber die Schreibregeln von vier Sammlungen an und braucht ein Token, das sich
als Vorschau zu erkennen gibt — deutlich mehr Angriffsfläche für denselben
Zweck.

**Entwurf per Nachrichtenkanal ins iframe.** Würde die Kundenvorschau auch
ungespeicherte Branding-Änderungen zeigen. Kostet einen zusätzlichen Kanal und
eine zweite Quelle für den Einstellungszustand — für einen Fall, den die
bestehende Live-Vorschau bereits abdeckt.

## Offene Risiken

**Ein Schattenkonto überlebt seinen Sweep.** Wenn Löschen beim Schließen und
Cron beide ausfallen, bleibt ein Konto mit Lesezugriff auf genau eine Galerie
stehen. Begrenzt durch `previewExpiresAt`, das der Endpunkt bei jeder
Ausstellung mitprüft; der Sweep ist die zweite Linie, nicht die erste.

**Die Erkennung des Vorschaumodus.** Sie entscheidet nur über den Auth-Store,
nicht über Rechte. Falls später etwas anderes an diesem Parameter hängt, ist
das hier nachzutragen — dann wäre er nicht mehr bloß privilegienmindernd.

## Nachtrag 2026-09-30: Die Vorschau ist schreibgeschützt

Die Kundenansicht dient nur dem Ansehen. Erlaubt sind GET/HEAD sowie die zwei
nicht verändernden POSTs `auth-refresh` und `/api/realtime`
(`istLesend()` in `pb_hooks/lib/previewsessionlib.js`).

- **Server:** eine `routerUse`-Middleware in `previewsession.pb.js` weist
  jede andere Anfrage eines Schattenkontos mit 403 `preview-readonly` ab.
- **Browser:** im Vorschaumodus blockt `pb.beforeSend` dieselben Anfragen
  (`src/config/pocketbase.ts`). Das deckt auch die anonyme Link-Ansicht ab,
  die der Server nicht von echter Kundschaft unterscheiden kann.

Der `vorschau`-Parameter hängt damit an einer zweiten Stelle — bleibt aber
privilegienmindernd: wer ihn fälscht, kann weniger, nicht mehr.
