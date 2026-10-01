# Terminbuchung — Entwurf und Beschlusslage

> **Stand: 2026-07-31.** Ergebnis einer Durcharbeitung des Entwurfs vor der
> Umsetzung. Dieses Dokument hält die *Entscheidungen* fest, nicht den Code —
> insbesondere die Begründungen, damit später nachvollziehbar ist, warum eine
> Alternative verworfen wurde. Abweichungen bei der Umsetzung gehören hier
> hinein, nicht in ein zweites Dokument.

## Ziel

Fotograf:innen geben buchbare Zeiten an, Kund:innen buchen darin Termine. Das
Buchungsformular ist per `iframe` in bestehende Websites einbettbar, damit es in
die vorhandene Web-Präsenz integriert werden kann.

Die Buchung ist damit der erste Teil von Albumwerk, der **vor** dem Shooting
greift — bisher beginnt die App erst danach (Alben, Verkauf, Downloads).

---

## 1. Zugang und Identität

**Ein gemeinsamer Slot-Pool für beide Wege.** Anonyme Buchungen aus dem
eingebetteten Formular und Buchungen eingeloggter Kund:innen konkurrieren um
dieselben Zeiten. Eine Buchung blockiert den Termin unabhängig davon, woher sie
kam.

**Ein Konto ist nie Pflicht.** Buchen erfordert Name und E-Mail, sonst nichts.

**Zuordnung zu Konten:**

- Eine Buchung, die im **eingeloggten** Zustand entsteht, trägt die Relation auf
  `users` automatisch — das ist eine authentifizierte Tatsache.
- Eine **anonyme** Buchung wird **nie** automatisch zugeordnet, auch wenn die
  E-Mail-Adresse zu einem Konto passt. Das Admin-UI darf einen Treffer
  *vorschlagen*; verknüpft wird nur durch bewusste Bestätigung.

*Warum:* Die E-Mail im öffentlichen Formular ist eine unverifizierte Behauptung.
Automatisches Matching würde fremde Buchungen an echte Konten hängen — und die
Kundenansicht „Meine Termine" liest genau aus dieser Relation.

*Naht für später:* Wird Double-Opt-in (siehe §6) eingeschaltet, sind die
bestätigten Adressen verifiziert und könnten dann automatisch gematcht werden.

---

## 2. Verfügbarkeitsmodell

Drei Ebenen, die zusammen die buchbaren Zeiten ergeben:

1. **Regeln** — wiederkehrende Wochenfenster („Di 10–16, Sa 9–13").
2. **Ausnahmen** — zeitraumbasiert, in beide Richtungen (`kind: block | open`).
3. **Buchungen** — belegen Zeit.

**Slots werden berechnet, nie materialisiert.** Es gibt keine Slot-Datensätze.
Gebucht wird ein *Zeitpunkt*; die Buchung speichert `start`/`end` als echte
Zeitstempel und ist damit von den Regeln entkoppelt. Ändert oder löscht die
Fotograf:in später eine Regel, bleiben bestehende Buchungen unangetastet gültig.

*Verworfen:* vorab erzeugte Slot-Datensätze. Jede Regeländerung müsste tausende
Zukunftsslots neu schreiben, und Buchungen auf gelöschten Slots würden zum
Sonderfall.

*Verworfen:* nur manuell gesetzte Einzeltermine als Basis. Der Kalender läuft
leer, sobald niemand nachpflegt — und das eingebettete Formular auf der fremden
Website zeigt dann „keine Termine verfügbar", ohne dass es jemand merkt.

### 2.1 Ausnahmen sind Zeiträume, keine Slot-Referenzen

Eine Ausnahme speichert `start`/`end` und ein Vorzeichen. Sie referenziert
**nicht** „Regel X, Vorkommen vom 15.8. um 10:00".

*Warum:* Wird die Regel später verschoben (9:00 → 9:30), zeigt eine
vorkommensbasierte Referenz ins Leere — die Sperre verfällt, der Termin ist
wieder buchbar, obwohl der Grund der Sperre weiter besteht. Zeitraumbasierte
Sperren überleben Regeländerungen.

Fachlich: **Es wird nicht „ein Slot" gesperrt, sondern Lebenszeit.** Dass die
Bedienung über einen Klick auf einen Slot läuft, ist Oberfläche. Dieselbe
Struktur trägt „Urlaub 1.–14.8.", „heute Nachmittag zu" und die einzelne
Slot-Sperre.

*Folge fürs UI:* nach dem Sperren „10:00–11:30 gesperrt" anzeigen, nicht „Slot
gesperrt" — sonst überrascht es, wenn eine spätere Dauer-Änderung aus einer
Sperre anderthalb Slots macht.

**Zusatzfelder von Anfang an:** `source` (`manual` | `imported`) und
`externalId`. Damit kann der Kalender-Import (§7) seine eigenen Sperren
erkennen, ersetzen und aufräumen, ohne handgepflegte anzufassen — ohne spätere
Datenmigration.

### 2.2 Termin-Arten

Mehrere Arten von Anfang an (Name, Dauer, Puffer, Startintervall, Beschreibung,
Ort/Modus, Preis, aktiv, Sortierung). Bei nur einer aktiven Art überspringt die
Oberfläche die Auswahl.

**Regeln können Arten einschränken** (`allowedTypes`, leer = alle).

*Folge:* Die Verfügbarkeit ist ohne gewählte Art nicht definiert — **die
Kund:in wählt zuerst die Art, dann den Termin.** Eine „alle Termine auf einen
Blick"-Ansicht gibt es nicht.

*Nebengewinn:* Die Art ist per URL vorwählbar. Auf der Portrait-Unterseite lässt
sich direkt „Portraitshooting buchen" einbetten, auf der Kontaktseite
„Kennenlerngespräch" — derselbe Embed, anderer Parameter.

**Die Buchung schreibt Dauer und Preis als Kopie mit**, nicht nur die Relation.
Ändert sich die Art später, darf ein bereits gebuchter Termin nicht rückwirkend
anders werden. (Gleiche Denkweise wie bei `orders`/`prices`.)

### 2.3 Raster

**Startintervall pro Art konfigurierbar**, Vorgabe = Dauer + Puffer.

**Das Raster bleibt starr am Fensterbeginn verankert.** Eine Buchung verschiebt
die übrigen Startzeiten nicht.

*Warum, obwohl das Kapazität verschenkt:* Nachrutschende Raster („greedy fill")
maximieren die Auslastung, aber der Tag der Fotograf:in wird dann von der
Buchungsreihenfolge Fremder umsortiert. Vorhersagbarkeit schlägt Auslastung. Wen
die entstehenden Restlücken stören, trennt die Arten über art-abhängige Regeln
(„Di Gespräche, Sa Shootings") — damit verschwindet das Problem an der Wurzel.

### 2.4 Leitplanken

Alle im Admin-UI einstellbar; die Werte unten sind nur Vorgaben.

| Leitplanke | Ebene | Vorgabe |
|---|---|---|
| Mindestvorlauf | pro Art | 24 h |
| Nachlauf-Puffer | pro Art | 0 min |
| Startintervall | pro Art | Dauer + Puffer |
| Buchungshorizont | global | 90 Tage |
| Tageslimit | global | unbegrenzt |

**Puffer nur nachlaufend**, nicht vor *und* nach. Symmetrische Puffer erzeugen
doppelte Lücken zwischen zwei Terminen und sind der häufigste Grund, warum
Leute ihre eigene Konfiguration nicht mehr verstehen.

*Verworfen:* „Tag zumachen, sobald etwas darin liegt". Eine unsichtbare Regel,
die Buchungen wegnimmt, ohne dass nachvollziehbar ist warum. Wer Fahrtzeit
braucht, nimmt den Nachlauf-Puffer; wer den Tag begrenzen will, das Tageslimit.

---

## 3. Zeitzonen

**Die Zeitzone der Instanz ist die Wahrheit.** Ein Feld in `settings`, Vorgabe
`Europe/Berlin`. Nicht pro Art, nicht pro Regel.

- **Regeln sind Wanduhrzeit** in dieser Zone, ganzjährig — deshalb eine echte
  Zeitzonen-ID und kein fester Offset, sonst verschiebt die Sommerzeitumstellung
  alles um eine Stunde.
- **Gespeichert wird UTC.**
- **Angezeigt wird immer in der Zone der Fotograf:in, immer beschriftet:**
  „Sa, 15.8., 10:00 Uhr (Zeit in Berlin)" — auch in Mails und im Embed.
- Weicht die Browser-Zeitzone ab, erscheint ein Hinweis: „Alle Zeiten in
  Berliner Zeit (bei dir: 11:00 Uhr)".

*Verworfen:* Anzeige in der Besucher-Zeitzone (wie Calendly). Bei Präsenzterminen
ist die Ortszeit die relevante Größe; abweichende Anzeige führt dazu, dass in
jedem Telefonat aneinander vorbeigeredet wird. Der Sonderfall reiner
Online-Termine über Zonen hinweg ist bewusst nicht optimal gelöst; der
Hinweistext deckt den Schaden ab.

---

## 4. Buchungsablauf

### 4.1 Bestätigung

**Pro Art konfigurierbar**, Vorgabe „sofort bestätigt".

Ein kostenloses Kennenlerngespräch will niemand manuell freigeben — die
sofortige Zusage ist im Embed der eigentliche Conversion-Vorteil gegenüber einem
Kontaktformular. Ein Hochzeits-Shooting will kaum jemand blind zusagen.

**Eine offene Anfrage blockiert den Slot und verfällt automatisch** (Vorgabe
48 h, einstellbar); vorher geht eine Erinnerung an die Fotograf:in.

*Warum blockierend:* Sonst können zwei Anfragen auf denselben Slot bestätigt
werden — eine selbstverschuldete Doppelbuchung.
*Warum verfallend:* Sonst legen drei Fake-Anfragen einen Samstag dauerhaft lahm.

Die Kund:in liest in der Eingangsbestätigung „Wir melden uns innerhalb von 48
Stunden" statt einer schwebenden Nicht-Zusage.

*Verworfen:* „Freigabe nur bei kurzfristigen Terminen" — wieder eine unsichtbare
Regel.

### 4.2 Schreibweg

`appointments` hat `createRule: null`. Buchungen laufen **ausschließlich über
eigene Endpunkte**:

- `GET  /api/custom/booking/availability` — freie Startzeiten für Art X in
  Zeitraum Y
- `POST /api/custom/booking` — buchen
- `POST /api/custom/booking/cancel` — absagen / umbuchen (Token)

*Warum kein direktes Anlegen auf der Collection:*

1. **Doppelbuchung.** Prüfung und Anlage müssen in *einer* Transaktion liegen.
   Ein Unique-Index hilft nicht — er prüft Gleichheit, nicht *Überschneidung*.
2. **Feldkontrolle.** Sonst schickt der Client `status: "confirmed"`,
   `price: 0` oder `dauer: 5`, um durch die Kollisionsprüfung zu schlüpfen. Jedes
   Feld einzeln im Hook gegenzuprüfen heißt, denselben Endpunkt an schlechterer
   Stelle zu bauen. Der Endpunkt nimmt genau vier Dinge entgegen (Art, Startzeit,
   Kontaktdaten, Einwilligung) und leitet alles andere selbst her.
3. Rate-Limiting, Honeypot, Verfall, Mailversand und Token-Erzeugung gehören an
   *eine* Stelle.

Präzedenz im Code: `1784600003_lock_customer_order_create.js` und
`pb_hooks/paypal.pb.js` — der Client behauptet etwas Wertvolles, der Server
entscheidet.

**Regeln und Ausnahmen sind nicht öffentlich lesbar.** Nach außen geht nur das
Ergebnis: eine Liste freier Startzeiten. Damit erfahren Fremde nie, ob ein Slot
leer oder gebucht ist, wann Urlaub ist oder wie voll der Kalender steht.

### 4.3 Storno und Umbuchung

Beides über einen Token-Link (`…/termin/<token>`) aus der Bestätigungsmail. Kein
Login: **wer die Mail hat, darf handeln** — der Termin gehört der Adresse, an
die die Mail ging. Wurde eine fremde Adresse eingetippt, kann die fremde Person
absagen, und das ist das gewünschte Verhalten.

- **Frist einstellbar**, Vorgabe 24 h vor dem Termin. Danach zeigt die Seite den
  Termin weiter an und *erklärt*, warum keine Buttons da sind, samt
  Kontaktmöglichkeit — sonst kommt „Ihr Link funktioniert nicht".
- **Umbuchung nur innerhalb derselben Art.** Artwechsel ist eine neue Buchung,
  sonst müssten Preisdifferenzen und Freigabe-Regeln nachgezogen werden.
- Die Fotograf:in kann **immer** stornieren, auch nach Fristablauf, mit
  optionaler Nachricht.
- **Storniertes wird nicht gelöscht**, sondern auf `status: cancelled` gesetzt.
  Der Slot ist frei, die Historie bleibt.

*Warum überhaupt Umbuchen:* Ohne sie sagt die Kund:in ab und bucht neu — in der
Zwischenzeit ist der Slot weg oder sie bucht nie wieder. Aus einer Verschiebung
wird eine verlorene Buchung.

*Verworfen:* „Storno nur per Mail an die Fotograf:in" — führt zu vergessenen
Absagen und dauerhaft blockierten Slots.

---

## 5. Manuelle Termine

Die Fotograf:in kann aus dem Tagesdetail heraus selbst Termine eintragen
(Telefon-Buchungen). Dabei darf sie **Leitplanken übergehen** — Mindestvorlauf,
Tageslimit, auch außerhalb der eigenen Regeln. Nur die Doppelbuchungsprüfung
greift, und zwar als **Warnung statt Verbot** („überschneidet sich mit X,
trotzdem anlegen?").

*Warum zwingend in der ersten Fassung:* Ohne sie ist der Kalender in der App
dauerhaft falsch, und telefonisch vergebene Slots werden online weggebucht.

---

## 6. Missbrauchsabwehr

**Kein Double-Opt-in als Standard, kein Captcha.**

*Warum kein Double-Opt-in:* Es zerstört genau den Vorteil, für den das Tool
gebaut wird. Statt „Termin steht" bekommt die Kund:in „schau in dein Postfach" —
ein spürbarer Teil tut das nie. Angreifer bremst es kaum (Wegwerf-Adressen sind
kostenlos, der Bestätigungsklick automatisierbar). Es bestraft die Ehrlichen
härter als die Böswilligen.

*Warum kein Captcha:* reCAPTCHA/hCaptcha bedeuten einen Drittanbieter-Request
auf der Website der Kund:in — in einem Produkt mit der Positionierung „DSGVO,
Server in Deutschland, kein Lock-in" ein Widerspruch.

Stattdessen, alles serverseitig im Buchungs-Endpunkt:

1. Honeypot-Feld
2. Mindest-Ausfüllzeit (unter ~2 s = kein Mensch)
3. Rate-Limit pro IP (z. B. 3/Stunde, 5/Tag)
4. Limit offener zukünftiger Termine pro E-Mail (z. B. 3)
5. **Ein-Klick-Aufräumen im Admin**: stornieren + Adresse/IP sperren

**Ehrlich dazu:** Ein entschlossener Angreifer mit wechselnden IPs und Adressen
kommt durch — das gilt für jedes offene Buchungssystem. Die Antwort ist nicht
mehr Vorab-Prüfung, sondern schnelle Erkennung und Aufräumbarkeit (Punkt 5).

**Ventil:** Double-Opt-in als Einstellung, standardmäßig **aus**. Wer angegriffen
wird, schaltet es ein und nimmt den Conversion-Verlust bewusst in Kauf. Die
Token-Mechanik dafür existiert durch §4.3 ohnehin.

---

## 7. Kalender

### 7.1 Export

Ein abonnierbarer iCal-Feed unter geheimer Token-URL. Derselbe iCal-Generator
liefert den `.ics`-Anhang der Bestätigungsmails.

*Bekannte Einschränkung, gehört in den Hilfe-Artikel:* Google aktualisiert
abonnierte Feeds nur alle paar Stunden, teils bis zu 24. Der Feed ersetzt die
sofortige Benachrichtigungsmail nicht, er ergänzt sie.

### 7.2 Import

Mehrere ICS-Feed-URLs (Privat-, Familien-, Hauptjob-Kalender). Fremde Termine
werden zu Sperrzeiten mit `source: imported`.

**Unterstützter Umfang:**

- Einzeltermine mit `DTSTART`/`DTEND`, ganztägige Termine, Zeiten in UTC und mit
  `TZID`
- `RRULE` in gängiger Form: täglich/wöchentlich/monatlich mit `INTERVAL`,
  `COUNT`, `UNTIL`, `BYDAY`; dazu `EXDATE` und `RECURRENCE-ID`
- **Übersprungen:** `STATUS:CANCELLED` und `TRANSP:TRANSPARENT`. Ohne diese
  beiden Regeln landet der Feiertagskalender als Sperrzeit im System.
- **Entfaltung nur im Buchungshorizont** (§2.4) — begrenzt den Aufwand hart und
  verhindert, dass „täglich, unendlich" den Job sprengt.
- Exotisches (`BYSETPOS`, kombiniertes `BYMONTHDAY`, eigene `VTIMEZONE`-Regeln)
  wird **nicht geraten, sondern konservativ als belegt** behandelt. Im Zweifel
  eine Sperre zu viel statt einer Doppelbuchung.

**Fehlerverhalten — niemals still öffnen.** Erst laden und parsen, dann in einer
Transaktion ersetzen. Scheitert etwas davor, passiert gar nichts: die zuletzt
erfolgreich importierten Sperren bleiben stehen. Das Admin zeigt „zuletzt
synchronisiert vor …", nach mehreren Fehlschlägen in Folge geht eine Mail raus.

*Warum:* Der naive Weg „alte löschen, neue schreiben" macht den Kalender bei
einem fehlgeschlagenen Abruf schlagartig komplett frei — genau dann, wenn
niemand hinschaut.

**Abrufintervall 15 Minuten**, plus „Jetzt synchronisieren" im Admin. Zwischen
zwei Abrufen bleibt ein Fenster, in dem ein privat eingetragener Termin noch
nicht bekannt ist; das lässt sich nur verkleinern, nicht schließen — gehört in
den Hilfe-Artikel.

**Gespeichert wird nur Anfang und Ende — kein Titel, keine Beschreibung, keine
Teilnehmer.** Hinter der Feed-URL steckt die komplette private Terminlage
(Arzt-, Anwaltstermine). Wird davon nur „belegt von–bis" gespeichert, kann auch
bei einem Leak nichts Persönliches abfließen, und die Auftragsverarbeitung
bleibt sauber. Optionaler Schalter „Titel im Admin anzeigen", standardmäßig aus.
**Die Feed-URLs sind Geheimnisse** und werden als `hidden`-Felder gespeichert
(wie die PayPal-Secrets).

### 7.3 Verworfen: OAuth-Synchronisation

Google-/Apple-OAuth mit Zwei-Wege-Abgleich ist ein eigenes Produkt, kein
Feature: Cloud-Console-Projekt, Verifizierung sensibler Scopes,
Refresh-Token-Verwaltung, alle sieben Tage ablaufende Webhook-Kanäle,
Konfliktauflösung in beide Richtungen. Zudem widerspricht eine harte
Google-Abhängigkeit im Kern des Terminsystems der Positionierung, und für
Self-Hoster wäre sie unbenutzbar (jede Installation bräuchte ein eigenes
Google-Projekt).

---

## 8. Benachrichtigungen

Aufsetzend auf `pb_hooks/lib/emaillib.js` (gebrandeter Rahmen).

**An die Kund:in:** Bestätigung bzw. Eingangsbestätigung bei Freigabepflicht ·
Zu-/Absage · Erinnerung (Vorgabe 24 h vorher, einstellbar und abschaltbar) ·
Storno-Bestätigung.

**An die Fotograf:in:** sofort bei jeder Buchung/Anfrage · Erinnerung an offene
Anfragen vor deren Verfall · bei Kunden-Storno (sonst fährt sie ins Studio).

**Der `.ics`-Anhang ist kein Nice-to-have.** Er ist die wirksamste Maßnahme
gegen Nichterscheinen — ein Termin im Handy-Kalender wird eingehalten, einer in
einer Mail vergessen. Reine String-Erzeugung, kein Fremdpaket nötig.

**Eigene `bookingNotificationEmail`** statt Wiederverwendung von
`orderNotificationEmail`: Bestellungen sind Geld und dürfen ins
Buchhaltungspostfach, Terminanfragen sind Zeit und müssen dorthin, wo sofort
hingeschaut wird. Leer = Rückfall auf `contactEmail`.

**Ein Cron-Job** (`cronAdd`, stündlich) erledigt Verfall offener Anfragen,
fällige Erinnerungen und die Aufbewahrungsfrist. **Versand auf der Buchung
vermerken**, sonst schickt ein Neustart oder ein zweiter Durchlauf dieselbe Mail
erneut.

*Verworfen:* SMS-Erinnerungen (kostenpflichtiger Drittanbieter, Telefonnummern,
DSGVO) und Erinnerungen an die Fotograf:in für bestätigte Termine (die stehen in
ihrem eigenen Kalender, §7.1).

> **Abhängigkeit:** Mailzustellbarkeit ist hier kritischer als anderswo in der
> App. Eine verlorene Bestellbestätigung ist ärgerlich; ein verlorener
> Storno-Link bedeutet blockierter Slot plus Nichterscheinen. Der offene
> Punkt „SendGrid-Key rotieren" aus Phase 0 der ROADMAP ist damit eine
> Voraussetzung dieses Features, kein Formalkram.

---

## 9. Einbettung

### 9.1 Auslieferung

**Eigener schlanker Vite-Entry** — kein PWA/Service Worker, kein Router, kein
Toastify, ein Schriftschnitt statt vier Familien. Zielgröße ~150–250 KB.

*Warum nicht die bestehende SPA* — gemessen am Build vom 2026-07-31 (die App
ist teilweise code-gesplittet, TipTap und jsQR liegen bereits in eigenen
Chunks; das ändert an der Rechnung wenig):

| | App-Einstieg | Embed-Einstieg |
|---|---|---|
| JS | 876 KB (`main`) + 194 KB (React) | 1,1 KB + 194 KB (React, geteilt) |
| CSS | 188 KB + 23 KB | 23 KB |
| **Summe** | **~1,28 MB** | **~218 KB** (~66 KB gzip) |

1. 1,28 MB für einen Terminkalender auf der Website der Kund:in, bei jedem
   Besucher, oft mobil — messbar schlechtere Core Web Vitals **auf ihrer Seite**.
2. `VitePWA` mit `registerType: 'autoUpdate'` würde im iframe einen Service
   Worker registrieren und den kompletten Precache auf das Gerät jedes
   Website-Besuchers ziehen, der nie Kunde wird.
3. Die 188 KB App-CSS sind Schriften und Astryx-Komponentenstile, die eine
   Terminauswahl nicht braucht.

*Warum nicht bloß weiteres Route-Splitting nachrüsten:* löst das
Service-Worker-Problem nicht, und die geteilte Basis (React + App-CSS) bliebe.
Wäre zudem eine große Änderung an der bestehenden App als *Nebenwirkung* eines
neuen Features. Für sich genommen sinnvoll, hier nicht.

**Gemeinsamer Quellcode statt kopiertem:** Die gesamte Buchungs-UI liegt in
`src/features/Booking/` und wird von **beiden** Einstiegspunkten importiert — der
bestehenden SPA und dem Embed-Entry (`rollupOptions.input`). Vite baut zwei
Bundles, jedes enthält nur, was es braucht. Ein Quellcode, zwei Auslieferungen.

> **Disziplin, die das voraussetzt:** keine Imports aus dem App-Kontext (Auth,
> Router, Settings-Provider) in `src/features/Booking/` — sonst zieht der Embed
> doch wieder alles mit. Gehört als Kommentar an den Entry.

Branding kommt aus demselben öffentlich lesbaren `settings`-Record. Dieselbe
schlanke Seite dient zugleich als **eigenständige Buchungsseite** unter der
Instanz-Domain (Link in der Instagram-Bio, für Fotograf:innen ohne Website).

### 9.2 Header

- **Alles außer `/embed*`: `frame-ancestors 'self'`** — fremde Seiten bleiben
  draußen, die eigene Instanz darf sich selbst einbetten (die
  Kundenansicht-Vorschau im Admin tut genau das).
- **Nur `/embed*`: `frame-ancestors` mit der Allowlist der Fotograf:in.**

> **Bestehender Befund, unabhängig von diesem Feature:** Aktuell setzt weder der
> Caddyfile noch `index.html` `X-Frame-Options` oder eine CSP — die komplette
> App ist heute von beliebigen Seiten einbettbar. Damit ist Clickjacking auf das
> Admin-UI möglich (unsichtbarer iframe, ahnungsloser Klick auf „Kunde
> löschen"). Wird mit diesem Feature geschlossen.

*Warum Allowlist statt offen:* Ohne sie kann jede beliebige Seite das
Buchungsformular einbetten — auch eine, die vorgibt, das Studio zu sein.
Buchungen kommen an, ohne dass nachvollziehbar oder abstellbar ist, woher.

*Die Allowlist ist zugleich die klassische Falle* (Code eingebaut → weißes
Rechteck → Fehler nur in der Browser-Konsole). Drei Entschärfungen gehören zum
Feature:

1. **Vorbelegung aus `websiteUrl`** (existiert im Setup-Assistenten) — deckt die
   meisten Fälle ohne Zutun ab.
2. **Der Snippet-Generator gibt keinen Code heraus**, solange keine Domain
   eingetragen ist; er fragt sie im selben Schritt ab.
3. **Automatisch mit und ohne `www`** eintragen — *der* Standardfehler.

### 9.3 Snippet

- **Höhenanpassung per `postMessage`**: Die Embed-Seite meldet ihre Höhe, ein
  Loader-Script (< 1 KB) setzt sie. Ohne das entsteht beim Wechsel von der
  Monatsansicht zum Formular ein Scrollbalken *im* iframe — mobil unbenutzbar.
- **Purer `<iframe>` als Rückfallebene** für Baukästen ohne eigenes JS (Jimdo,
  Wix).
- **Live-Vorschau und Kopieren-Button.** Zielgruppe sind Fotograf:innen, keine
  Entwickler:innen.

---

## 10. Datenschutz

**Pflichtfelder minimal:** Name und E-Mail. **Telefon pro Art konfigurierbar**
(aus / optional / Pflicht). **Freitextfeld „Anliegen"** optional,
längenbegrenzt — das Feld, das aus einer Buchung einen brauchbaren Lead macht.

**Einwilligung** als Pflicht-Checkbox mit Verweis auf die Datenschutzerklärung
der Instanz (`LegalPage kind="privacy"`).

- Der Link öffnet **in einem neuen Tab** — sonst lädt die Erklärung *im* iframe,
  die Besucher:in sitzt in einem 400-Pixel-Rahmen fest und die Eingaben sind weg.
- **Zeitpunkt und Textversion werden auf der Buchung gespeichert**, sonst ist die
  Einwilligung im Streitfall nicht nachweisbar.

**Aufbewahrung:** einstellbar, Vorgabe **12 Monate nach dem Termin**, dann
**anonymisieren statt löschen** — Name, E-Mail, Telefon und Anliegen entfallen,
Datum, Art und Status bleiben. Löschen zerschießt jede Auswertung („wie viele
Shootings hatte ich letztes Jahr?"); Anonymisieren erfüllt die Löschpflicht und
erhält die Zahlen. Erledigt der Cron-Job aus §8. Zwölf Monate deshalb, weil eine
Terminbuchung keine Rechnung ist — steuerliche Fristen gelten für die Bestellung.

**Keine IP-Spalte auf der Buchung.** Für das Rate-Limit (§6) genügt ein Hash mit
wenigen Stunden Lebensdauer.

**Keine Cookies, kein `localStorage`, keine Drittanbieter im Embed.** Damit
lautet die Antwort auf „brauche ich dafür einen Cookie-Banner-Eintrag?"
**nein** — ein echtes Verkaufsargument gegenüber Calendly. Aber nur, solange es
stimmt: keine Zwischenstände im Storage, keine PocketBase-Auth-Cookies, keine
Schriftarten von Google. Beim Bauen leicht zu verletzen, deshalb als Kommentar
am Embed-Entry festgehalten.

> **Abhängigkeit:** Die noch offene AVV aus der ROADMAP bekommt zwei neue
> Datenkategorien — Kontaktdaten von Nicht-Kund:innen und, über den Import, die
> Zeitlage des privaten Kalenders der Fotograf:in.

---

## 11. Oberflächen

### 11.1 Admin

**Monatsübersicht + Tagesdetail**, kein Zeitraster.

*Warum kein Google-Calendar-artiges Zeitraster:* wochenlange Arbeit oder eine
schwere Fremdbibliothek — Letzteres widerspricht der Bundle-Disziplin aus §9.1.
Vor allem aber: **Die Fotograf:in hat bereits einen guten Kalender — ihren
eigenen, am Handy.** Genau dafür existiert der Export (§7.1). Albumwerk muss ihn
füttern, nicht nachbauen.

*Warum nicht nur Listen:* Manuelle Sperrzeiten sind ohne Import die Notlösung,
die funktionieren **muss**. Über ein Formular mit Datums- und Uhrzeitfeldern ist
das zäh genug, dass es unterbleibt. Sperren muss in zwei Klicks gehen.

- **Monatsraster** (reines CSS-Grid): pro Tag Anzahl Termine, Marker für offene
  Anfragen, Sperrzeiten und importierte Fremdtermine.
- **Klick auf einen Tag** → Detailliste mit Aktionen: bestätigen, ablehnen,
  stornieren, ganztägig sperren, Zeitfenster sperren, mit Konto verknüpfen.
- **Was Kund:innen buchen können** (seit 2026-10-01): pro Tag „x frei“ im
  Raster, im Tagesdetail je Art die freien Startzeiten. Die Zeiten kommen vom
  öffentlichen `GET /api/custom/booking/availability`, je aktive Art ein
  Aufruf — also exakt das, was die Buchungsseite zeigt, mit Buchungen,
  Sperren, Vorlauf, Tageslimit und Horizont. Ist die Buchung aus, fehlt beides.
- **Offene Anfragen zusätzlich oben angepinnt**, unabhängig vom angezeigten
  Monat — sonst verfallen sie, weil gerade der falsche Monat offen war.
- **Termin-Arten, Regeln und Einbettung als eigene Unterseiten** — Einrichtung,
  nicht Tagesgeschäft.

**Geführt einrichten** (`/appointments/setup`, seit 2026-09-30): ein Interview
mit einer Frage pro Bildschirm, das Arten, aktive Wochenfenster und die
Grenzen „pro Tag“ und „im Voraus“ **ersetzt**. Arten werden über den
Kurz-Link zugeordnet und nie gelöscht, nur deaktiviert; inaktive Fenster und
Ausnahmen bleiben unberührt. Gespeichert wird in einer Transaktion über
`POST /api/custom/booking/apply-plan`. Details:
`docs/superpowers/specs/2026-09-30-termin-interview-design.md`.

**Navigation:** In `App.tsx` liegen alle Admin-Seiten flach nebeneinander; vier
weitere Einträge sprengen das Menü. Eine **Gruppe „Termine"** (Kalender ·
Termin-Arten · Verfügbarkeit · Einbetten) — setzt voraus, dass `Layout.tsx`
gruppierte Navigation kann, sonst kleine Erweiterung.

### 11.2 Kundenansicht

Kleiner Abschnitt „Meine Termine" mit den über die Kontorelation verknüpften
Terminen, mit denselben Aktionen — ohne Token, weil das Login stärker ist als
der Link. Kein eigener Kalender. Wichtiger als die Liste ist der **sichtbare
Einstieg zum Buchen**, sonst ist der gemeinsame Pool aus §1 nur auf dem Papier
erfüllt.

---

## 12. Keine Zahlung

Die Termin-Art trägt ein Preisfeld, das im Formular nur **angezeigt** wird
(„Portraitshooting · 90 Min · 149 €" oder „kostenlos"). Bezahlt wird wie bisher
über den Pricing-/Orders-Weg nach dem Shooting.

*Warum, obwohl PayPal und Stripe bereits serverseitig verifiziert im Haus sind:*

1. **Zahlung macht Stornierung zum Rechtsproblem.** Wird erstattet? Vollständig,
   anteilig, bis wann? Was, wenn die Fotograf:in absagt? Nötig wären
   Stornobedingungen vor dem Bezahlen, Erstattungsmechanik gegen zwei Anbieter
   mit je eigenen Fristen und Teilerstattungsregeln, plus ein Weg für
   fehlgeschlagene Erstattungen — mehr Arbeit als der gesamte Rest des Features.
2. **Kollision mit offenen Roadmap-Punkten.** Anzahlungen sind Umsatz mit
   Rechnungspflicht; Kleinunternehmerregelung, EU-USt-Beratung und AVV sind noch
   offen.
3. **Kritischster Pfad.** Jeder Schritt zwischen „Samstag 10 Uhr" und „gebucht"
   kostet Buchungen; eine Zahlung kostet sehr viele. Wer Anzahlungen will, kann
   nach der Bestätigung eine Rechnung schicken.

*Naht für später:* `price`/`currency` auf der Art, dazu ein späteres
`requiresDeposit`. Umsetzung dann über die bestehende
`paymentIntents`-Mechanik — Termin als Anfrage anlegen, durch die verifizierte
Zahlung bestätigen. Kein neues Konzept, nur später.

---

## 13. Etappen

1. **Datenmodell + Verfügbarkeitsrechner.** Migrationen (Arten, Regeln,
   Ausnahmen, Buchungen, Settings-Felder), Rechenlogik als reine Funktionen,
   Vitest-Setup, Unit-Tests (Raster, Puffer, Ausnahmen, Leitplanken,
   Sommerzeit). **Plus Embed-Vorab-Test:** leerer zweiter Vite-Entry, der nur
   „Hallo" sagt, aber Build, Auslieferung, CSP-Header und Höhenmeldung beweist —
   die riskanteste Annahme zuerst.
2. **Endpunkte + Benachrichtigungen.** Verfügbarkeit, Buchen (in Transaktion),
   Stornieren, Umbuchen; Rate-Limits, Honeypot, Token; alle Mails inkl.
   `.ics`-Anhang; Cron für Verfall, Erinnerungen, Aufbewahrung.
3. **Admin-UI.** Monatsübersicht, Tagesdetail, Arten, Regeln, Sperrzeiten,
   Anfragen bestätigen, manuelle Termine.
4. **Buchungs-UI + Embed.** `src/features/Booking/`, schlanker Entry,
   Snippet-Generator mit Vorschau, Allowlist, `frame-ancestors 'none'` für den
   Rest.
5. **Kalender-Export + -Import.** iCal-Generator, Token-Feed, Parser mit
   Wiederholungsregeln, Abruf-Job, Fehlerverhalten, Unit-Tests mit echten
   Beispieldateien aus Google, Apple und Outlook.
6. **Abschluss.** „Meine Termine", Hilfe-Artikel mit Screenshots, E2E-Strecken,
   Header-Test.

*Warum Admin-UI (3) vor Embed (4),* obwohl der Embed der eigentliche Wunsch ist:
Ohne Admin-UI müssten Regeln und Arten im PocketBase-Dashboard von Hand angelegt
werden — mühsam und mit unrealistischen Testdaten. Formulare zu bauen deckt
zudem Fehler im Datenmodell auf, bevor die öffentliche Oberfläche daran hängt.
Das Risiko „Embed kommt zu spät" fängt der Vorab-Test in Etappe 1 ab.

## 13a. Ergebnisse des Embed-Vorab-Tests (Etappe 1, 2026-07-31)

Der Vorab-Test hat drei Dinge zutage gefördert, die sonst erst in Etappe 4
aufgefallen wären:

**JSVM-Handler laufen in isolierten Runtimes.** Vom Modul-Scope einer `*.pb.js`
ist beim späteren Aufruf des Handlers **nichts** sichtbar — weder Funktionen
noch Konstanten. Die Anfrage endet mit `ReferenceError: … is not defined` und
HTTP 400. Wiederverwendbares muss in `pb_hooks/lib/` liegen und **im** Handler
per `require(__hooks + "/lib/…")` geholt werden. Das ist das Muster, das
`emaillib.js` und `supportlib.js` schon verwenden.

> Der Fallstrick ist in Etappe 2 prompt ein zweites Mal zugeschnappt, diesmal
> mit `const MS_PER_MINUTE = 60000` am Dateikopf. Deshalb liegen inzwischen auch
> die Zeitkonstanten in `bookinglib.js`. Faustregel: **In einer `*.pb.js` steht
> außerhalb der Handler nichts außer Kommentaren.**

**Das Dockerfile kopiert einzeln aufgezählte Dateien.** Ein neuer Vite-Einstieg
braucht dort eine eigene `COPY`-Zeile, sonst bricht der Image-Build mit
`Could not resolve entry module "embed/index.html"` ab — lokal lief er längst.

**`globIgnores` braucht drei Muster.** `embed/**` schließt nur die HTML-Datei
vom Service-Worker-Precache aus; der Chunk unter `assets/` und das Loader-Script
aus `public/` brauchen eigene Muster.

Nachgewiesen ist damit: Der zweite Einstiegspunkt baut (~218 KB gegenüber
~1,28 MB), lädt weder App-CSS noch Service Worker, wird unter `/embed/`
ausgeliefert, trägt die CSP-Allowlist aus den Einstellungen (mit `www`-Varianten
und fail-closed bei leerer Liste), während der Rest der App
`frame-ancestors 'none'` bekommt — und die Höhenmeldung kommt im echten iframe
auf einer fremden Domain an (gemessen 147 px → 203 px beim Aufklappen).

## 13b. Ergebnisse der Etappe 2 (2026-07-31)

Endpunkte, Mails und der Wartungsjob stehen und sind gegen die Dev-Instanz
abgenommen (56 Prüfungen). Das damalige Abnahmeskript `scripts/verify-booking.mjs`
ist entfallen; die Strecken gehören in die Playwright-Suite (§14).

**Abweichung von §6: die Rate-Limits sind großzügiger und einstellbar.** Der
Entwurf nannte beispielhaft 3 Buchungen pro Stunde und IP. Bei der Umsetzung
fiel auf, dass das ein echter Produktfehler gewesen wäre: **Eine IP ist heute
kein Mensch.** Mobilfunkanbieter setzen tausende Kund:innen hinter dieselbe
Adresse (CGNAT), Firmen- und Hotelnetze ebenso. Drei Buchungen pro Stunde hätten
echte Kund:innen abgewiesen — unsichtbar, denn die Fotograf:in erfährt von einer
abgelehnten Buchung nie. Neue Vorgaben: **10 pro Stunde, 30 pro Tag**, beide in
den Einstellungen änderbar (`1785500002_booking_rate_limits.js`). Die zielgenaue
Bremse bleibt das Limit offener Termine pro E-Mail-Adresse.

**Unerwartete Fehler antworten jetzt ehrlich mit 500.** PocketBase macht aus
einer Ausnahme im Handler ein nacktes `400 Something went wrong` ohne
Logeintrag — irreführend und im Betrieb nicht nachvollziehbar. Alle
Buchungs-Endpunkte laufen deshalb durch `bookinglib.guard()`, das die Ursache
samt Stack protokolliert.

**Der `.ics`-Anhang braucht einen Umweg.** PocketBase erwartet als Anhang einen
`io.Reader`. `$filesystem.fileFromBytes()` liefert eine File-Struktur, die
selbst keiner ist — erst `.reader.open()` gibt den `ReadSeekCloser`, den der
Mailer verarbeitet. Ohne das fehlt der Anhang **still**; der Fehlschlag wird
jetzt protokolliert.

**Zusätzlich zum Entwurf umgesetzt**, weil die zugehörigen Mails ohnehin in
dieser Etappe entstanden: `POST /api/custom/booking/decide` (zusagen/ablehnen),
`/manual` (Termin selbst eintragen, §5) und `/owner-cancel`. Damit ist Etappe 3
reine Oberfläche.

**Eine Mail mehr als im Entwurf:** Verfällt eine Anfrage unbeantwortet, bekommt
die Kund:in eine Absage. Sie hat „wir melden uns innerhalb von X Stunden"
gelesen — sie ohne Nachricht hängen zu lassen wäre der schlechteste Ausgang.

## 13c. Ergebnisse der Etappe 3 (2026-07-31)

Das Admin-UI steht: Monatsübersicht mit Tagesdetail, Termin-Arten,
Verfügbarkeit. Im Browser gegen die Dev-Instanz durchgeklickt (14 Prüfungen,
keine JS-Fehler).

**Abweichung von §11.1: Reiter statt Gruppe in der Seitenleiste.** Der Entwurf
sah eine Navigationsgruppe „Termine“ vor. `AppShell.tsx` kennt aber nur flache
Einträge, und eine Gruppierung nachzurüsten wäre eine Änderung an der
Navigation aller Seiten gewesen — als Nebenwirkung eines neuen Features das
Falsche. Jetzt: **ein** Eintrag „Termine“ in der Seitenleiste, darunter Reiter
für Kalender · Termin-Arten · Verfügbarkeit. Trennt zugleich sauber, was
täglich gebraucht wird vom Einrichtungskram.

**Astryx' `Calendar` war keine Option.** Es ist ein reiner Datumswähler ohne
Möglichkeit, pro Tag etwas darzustellen — und genau das ist der Zweck der
Monatsübersicht. Bestätigt die Entwurfsentscheidung „eigenes CSS-Grid“; der
Aufwand dafür war gering.

**Bekannte Einschränkung:** Astryx' `Tab` rendert ein `<button>` **ohne**
`role="tab"`. Der Reiterstreifen wird Screenreadern damit nicht als solcher
angekündigt. Das ist eine Lücke der Komponentenbibliothek, nicht des
Aufrufcodes — hier nur notiert, damit es beim nächsten Astryx-Update geprüft
werden kann.

**Die Leitplanken speichern per Knopf, nicht bei jedem Tastendruck.** Ein
`onChange`-Speichern hätte beim Tippen von „90“ zwischenzeitlich die 9 als
Buchungshorizont in die Datenbank geschrieben — mit sofortiger Wirkung auf das,
was Kund:innen buchen können.

**`slugify` ist nach `src/utils/slug.ts` gezogen** (vorher in `utils/help.ts`).
Termin-Arten brauchen Slugs für die Vorwahl im Embed; die Terminverwaltung an
das Hilfe-Modul zu hängen wäre falsch herum. `utils/help.ts` re-exportiert, alle
bestehenden Importe bleiben unverändert.

**Zusätzliche Unit-Tests:** `tests/time.test.ts` prüft die Browser-Zeitrechnung
gegen die serverseitige (`tzlib.js`) an acht Stichproben rund um beide
Umstellungen. Weichen die beiden ab, zeigt das Admin-UI andere Zeiten an, als
der Server buchbar macht — ein Fehler, der sonst erst im Kundengespräch
auffällt.

## 14. Fertig-Definition

Gleicher Standard wie im übrigen Projekt, kein Rabatt:

- Migrationen im bestehenden Stil (`pb_migrations/`), idempotent
- **Hilfe-Artikel Admin:** buchbare Zeiten einrichten · Termin-Arten anlegen ·
  Buchung in die eigene Website einbetten · eigenen Kalender verbinden. Der
  Einbettungs-Artikel ist der wichtigste des Features — dort scheitern
  Fotograf:innen.
- **Hilfe-Artikel Kunde:** „Termin absagen oder verschieben", als **öffentlich**
  markiert — sonst landen Empfänger:innen des Storno-Links auf einer Loginwand.
- **E2E:** buchen im Embed · Doppelbuchung wird abgelehnt · Anfrage bestätigen ·
  stornieren per Token · Sperrzeit wirkt · **Header-Test** (`/embed` einbettbar,
  Rest der App nicht)
- **Unit-Tests mit Vitest** für Verfügbarkeitsrechner und ICS-Parser. E2E trifft
  davon nur den Hauptpfad; die Randfälle (Sommerzeit, Termin über Mitternacht,
  überlappende Ausnahmen, Wiederholungsregeln) brauchen echte Unit-Tests. Ein
  Fehler in der Slot-Berechnung erzeugt Doppelbuchungen, und die fallen erst
  auf, wenn zwei Kund:innen gleichzeitig vor der Tür stehen. Vitest ist damit
  eine bewusst neue Abhängigkeit — bisher gibt es nur Playwright.

## 15. Ausdrücklich nicht im Umfang

Zahlungen und Anzahlungen · OAuth-Kalendersynchronisation (nur ICS) · mehrere
Mitarbeiter:innen oder Studios · **Gruppentermine / Mini-Sessions** mit mehreren
Buchungen pro Slot · Warteliste bei ausgebuchten Terminen · SMS-Erinnerungen ·
Anzeige in der Besucher-Zeitzone · Mehrsprachigkeit des Embeds (deutsch, wie die
übrige App).

*Zu Gruppenterminen:* Weihnachts-Minishootings mit mehreren Kurzterminen pro
Slot sind unter Fotograf:innen verbreitet. Technisch wäre es ein
Kapazitätsfeld auf der Art plus geänderte Kollisionsprüfung — nicht riesig, zieht
sich aber durch Rechner, UI und Mails. Bewusst zurückgestellt.
