# Termin-Interview — geführte Einrichtung von Termin-Arten und Verfügbarkeit

Zweck: Fotograf:innen richten ihren Buchungskalender über ein Interview ein,
statt über die zwei großen Formulare auf „Termin-Arten“ und „Verfügbarkeit“.
Der Assistent fragt nach dem Arbeitsalltag, bietet Standardantworten zur
Auswahl an und baut daraus Termin-Arten, Wochenfenster und Grenzen.

## Beschlüsse

- **Jederzeit startbar, ersetzt den Plan.** Der Assistent ist kein reiner
  Erstaufbau. Er lässt sich jederzeit öffnen, und „Plan übernehmen“ ersetzt
  die bestehende Konfiguration.
- **Vorausgefüllt aus dem Ist-Zustand.** Jede Frage zeigt die Antwort, die zum
  aktuellen Plan passt. Werte ohne passende Kachel erscheinen als zusätzliche
  Auswahl „Eigene Einstellung (beibehalten)“ und sind vorgewählt.
- **Änderungen sofort sichtbar.** Wählt die Fotograf:in eine andere Antwort,
  steht direkt darunter, was sich am bisherigen Plan ändert, z. B.
  „Portraitshooting: 90 → 60 Minuten“ oder „Fenster Sa 9–13 Uhr entfällt“.
- **Gemeinsame Arbeitszeiten, Einschränkung pro Leistung optional.** Standard
  ist ein Wochenplan für alle Arten. Nur wer Frage 9 mit „Ja“ beantwortet,
  bekommt Fragen pro Leistung (→ `allowedTypes`).
- **Die Formularseiten bleiben** für die Feinarbeit. Das Schema ändert sich
  nicht.

## Fragenkatalog

Ein Bildschirm pro Frage, Auswahlkacheln, Zurück/Weiter, Fortschrittsbalken.
Fragen, die „je Leistung“ gelten, zeigen die Leistungen untereinander auf
demselben Bildschirm.

| # | Frage | Standard-Antworten | Feld |
|---|---|---|---|
| 1 | Was können Kund:innen bei dir buchen? (mehrfach) | Kennenlerngespräch · Portrait · Paare · Familie · Hochzeit (Vorgespräch) · Business/Bewerbung · Eigene Leistung + Name | Arten: `name`, `slug` |
| 2 | Wie lange dauert ein …? (je Leistung) | 15 · 30 · 60 · 90 · 120 Min · Andere | `durationMin` |
| 3 | Wie viel Luft brauchst du danach? (je Leistung) | Keine · 15 · 30 · 60 Min | `bufferMin` |
| 4 | Wie kurzfristig darf man buchen? (je Leistung) | 2 Std · 1 Tag · 3 Tage · 1 Woche | `leadTimeMin` |
| 5 | Sagst du jeden Termin selbst zu? (je Leistung) | Sofort verbindlich · Erst nach meiner Zusage | `requiresApproval` |
| 6 | Ort und Preis (je Leistung, überspringbar) | Freitext Ort · Preis mit Kachel „kostenlos“ | `location`, `price` |
| 7 | An welchen Tagen arbeitest du? | Chips Mo–So · Schnellwahl „Mo–Fr“, „Wochenende“ | Fenster: `weekday` |
| 8 | Zu welchen Zeiten? | 9–13 · 13–18 · 9–18 · 17–21 · Eigene Zeit · optional abweichende Zeit je Tag | Fenster: `startMinute`, `endMinute` |
| 9 | Sollen manche Leistungen nur zu bestimmten Zeiten buchbar sein? | Nein · Ja → je Leistung: Wie meine Arbeitszeit · Nur werktags · Nur am Wochenende · Nur abends | Fenster: `allowedTypes` |
| 10 | Wie viele Termine schaffst du an einem Tag höchstens? | 1 · 2 · 3 · Egal | `bookingMaxPerDay` |
| 11 | Wie weit im Voraus darf gebucht werden? | 4 Wochen · 3 Monate · 6 Monate · 1 Jahr | `bookingHorizonDays` |
| 12 | Zusammenfassung | Alle Änderungen, gruppiert: neu / geändert / deaktiviert / entfällt · „Plan übernehmen“ | — |

Vorbelegung neuer Leistungen aus Frage 1 (Dauer, Puffer, Vorlauf, Zusage):

| Leistung | Dauer | Puffer | Vorlauf | Zusage |
|---|---|---|---|---|
| Kennenlerngespräch | 30 | 0 | 2 Std | sofort, kostenlos |
| Portrait | 60 | 30 | 1 Tag | sofort |
| Paare | 90 | 30 | 1 Tag | sofort |
| Familie | 90 | 30 | 3 Tage | sofort |
| Hochzeit (Vorgespräch) | 60 | 0 | 1 Tag | sofort, kostenlos |
| Business/Bewerbung | 60 | 15 | 1 Tag | sofort |
| Eigene Leistung | 60 | 0 | 1 Tag | sofort |

Die Kurz-Links der Katalogleistungen sind fest (`kennenlernen`, `portrait`,
`paare`, `familie`, `hochzeit`, `business`). Eigene Leistungen bekommen
`slugify(name)`.

Frage 9, „Nur abends“, bezeichnet den Anteil ab 17 Uhr der gewählten
Arbeitszeit. Liegt keine Arbeitszeit nach 17 Uhr, wird die Kachel
ausgegraut. „Wie meine Arbeitszeit“ heißt: keine Einschränkung.

**Nicht im Interview, bleibt unverändert:** `phoneMode`, `startIntervalMin`,
`description`, `sort` (neue Arten: Reihenfolge aus Frage 1),
`bookingPendingExpiryHours`, `bookingCancelDeadlineHours`,
`bookingReminderHours`, `bookingNotificationEmail`.

Beim Übernehmen wird `bookingEnabled` eingeschaltet. Das steht in der
Zusammenfassung, falls es vorher aus war.

## Zuordnung alter und neuer Plan

- **Termin-Arten** werden über `slug` zugeordnet. Eine Art mit gleichem Slug
  wird aktualisiert und nicht neu angelegt. So bleiben eingebettete Links
  (`?type=<slug>`) und bestehende Buchungen gültig.
- **Arten mit Slugs, die dem Katalog nicht entsprechen,** erscheinen in Frage 1
  als eigene, vorgewählte Kacheln mit ihrem Namen.
- **Arten, die im neuen Plan fehlen,** werden deaktiviert (`active = false`),
  nie gelöscht.
- **Wochenfenster** werden vollständig ersetzt: alte löschen, neue anlegen.
  Buchungen hängen nicht an Fenstern (terminbuchung.md §2), deshalb ist das
  folgenlos.
- **Ausnahmen** (Urlaub, Sperren) fasst der Assistent nicht an.

## Aufbau

### `src/features/Appointments/interview.ts` — reine Logik

Kein React und kein PocketBase, vollständig mit Vitest testbar.

- `answersFromPlan(types, rules, settings): Answers` — Vorbelegung. Nicht
  passende Werte werden als `{ custom: <Wert> }` erhalten.
- `planFromAnswers(answers, current): Plan` — Zielplan aus Arten (mit `id`,
  falls über Slug zugeordnet), Fenstern und Grenzwerten.
- `diffPlans(alt, neu): Change[]` — `{ scope, kind, text }` mit
  `scope` ∈ `type:<slug>` | `rules` | `limits` | `enabled` und
  `kind` ∈ `neu` | `geändert` | `deaktiviert` | `entfällt`.

Bei jeder Antwort wird `diffPlans(aktuell, planFromAnswers(antworten))`
berechnet. Jede Frage zeigt nur die Änderungen aus ihrem `scope`, die
Zusammenfassung zeigt alle.

Wochenfenster aus den Fragen 7–9: pro Arbeitstag ein Fenster mit der Zeit aus
Frage 8. Bei Einschränkungen aus Frage 9 wird das Fenster an den Grenzen
aufgeteilt (z. B. 9–17 für alle, 17–21 zusätzlich für „nur abends“-Arten).
`allowedTypes` bleibt leer, wenn alle aktiven Arten darin buchbar sind.

### `src/pages/admin/AppointmentSetupPage.tsx` — der Assistent

- Route `/appointments/setup` in `src/App.tsx`, vor `appointments`.
- Einstieg: Button „Geführt einrichten“ auf `AppointmentTypesPage` und
  `AvailabilityPage`. In deren Leerzuständen ist er die Hauptaktion.
- Der Fortschrittsbalken folgt dem Muster von `EinrichtungPage`.
- Antworten liegen nur im React-State. Abbrechen ändert nichts.
- Ist Frage 1 leer, wird „Weiter“ deaktiviert. Frage 7 ebenso.

### `POST /api/custom/booking/apply-plan` — Speichern

In `pb_hooks/booking.pb.js`. Die Prüfung, wer zugreifen darf, entspricht den
übrigen Admin-Endpunkten dort
(`e.hasSuperuserAuth() || e.auth.getBool("isAdmin")`). Alles läuft in einer
`$app.runInTransaction`:

1. Arten anlegen oder aktualisieren (nur die Interview-Felder)
2. Arten, die nicht mehr im Plan sind, deaktivieren
3. alle `availabilityRules` löschen und neu anlegen
4. `bookingMaxPerDay`, `bookingHorizonDays` und `bookingEnabled` in
   `settings` schreiben

Der Server prüft die Eingaben erneut: Dauer ≥ 5, Fenster ≤ 24 Std, Slugs
eindeutig. Er gibt 400 mit einer deutschen Meldung zurück.

*Warum ein eigener Endpunkt:* SDK 0.21 kann keine Batches. Ein Abbruch nach
Schritt 3 ließe die Instanz ohne Fenster zurück, und das eingebettete Formular
zeigte dann „keine Termine“, ohne dass es jemand merkt.

Client: `applyPlan(plan)` in `features/Appointments/api.ts`. Nach Erfolg
ruft er `refresh()` für die Settings auf und leitet mit einer Toast-Meldung
auf `/appointments/availability` weiter.

## Fehlerbehandlung

- Transaktion schlägt fehl: Der alte Plan bleibt vollständig erhalten. Der
  Assistent bleibt auf der Zusammenfassung stehen, zeigt die Meldung, und die
  Antworten bleiben erhalten.
- Laden schlägt fehl (Migration fehlt): derselbe Banner wie auf den
  Formularseiten.

## Tests

- `tests/interview.test.ts` (Vitest):
  - Rundreise: `planFromAnswers(answersFromPlan(p))` ergibt ein leeres Diff.
  - Zuordnung über den Slug behält die `id`.
  - Abgewählte Art → `deaktiviert`, nicht gelöscht.
  - Eigene Werte bleiben bei „beibehalten“ unverändert.
  - Aufteilung der Fenster bei „nur abends“.
  - Fenster über Mitternacht (`endMinute` > 1440).
- Ein Playwright-Test: Interview auf leerer Instanz durchlaufen, übernehmen,
  danach stehen die Arten und Fenster auf den Formularseiten.

## Nicht im Umfang

- Zwischenspeichern halb ausgefüllter Interviews
- Ausnahmen/Urlaub im Interview
- Änderungen am Schema
