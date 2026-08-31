# Verkaufsbereitschaft, Navigation und Einrichtung — Entwurf und Beschlusslage

> **Stand: 2026-08-31.** Ergebnis einer Durcharbeitung vor der Umsetzung.
> Dieses Dokument hält die *Entscheidungen* fest, nicht den Code —
> insbesondere die Begründungen, damit später nachvollziehbar ist, warum eine
> Alternative verworfen wurde. Abweichungen bei der Umsetzung gehören hier
> nachgetragen.

## Ziel

Drei Beschwerden, eine Ursache:

1. Die Seitenleiste hat neun flache Admin-Einträge ohne erkennbare Ordnung.
2. `/branding` trägt Domain, Kontakt, Zahlung und Wasserzeichen mit — Dinge,
   die mit Gestaltung nichts zu tun haben.
3. Der Einrichtungs-Wizard läuft genau einmal. Danach gibt es keinen Ort mehr,
   an dem steht, ob die Instanz überhaupt verkaufen *kann*.

Die Ursache ist dieselbe: es fehlt ein Begriff für „bereit zum Verkauf". Ohne
ihn wandert jede Einstellung dorthin, wo gerade Platz war, und ein Fotograf
erfährt erst von einer fehlenden Zahlungsart, wenn eine Kundin in der Kasse
steht.

Das Ziel ist deshalb nicht „Seiten umsortieren", sondern: **die
Verkaufsbereitschaft wird ein erstklassiger, an einer Stelle definierter
Zustand** — sichtbar in der Seitenleiste, durchgesetzt am Server, erklärt auf
einer Seite, die immer erreichbar ist.

## Ausgangslage

| Was | Wo | Umfang |
|---|---|---|
| Admin-Navigation | `src/utils/routes.ts` | 9 flache Einträge + 2 im Fußbereich |
| Seitengerüst | `src/components/layout/AppShell.tsx` | 303 Zeilen, rendert `navItems` und `menuItems` flach |
| Branding + Wizard | `src/pages/admin/BrandingPage.tsx` | 554 Zeilen, fünf Abschnitte, Wizard über `?setup=1` |
| Erst-Umleitung | `src/components/SetupRedirect.tsx` | leitet auf `/branding?setup=1`, solange `setupCompleted` falsch ist |
| Zahlungseinstellungen | `src/features/Settings/components/PaymentSettings.tsx` | wird **doppelt** gerendert: auf `/payments` und als Wizard-/Branding-Abschnitt |
| Kasse | `src/pages/user/PricingPage.tsx` | dreistufig: Auswahl → `PaymentForm` → Download |
| Zahlungs-Endpunkte | `pb_hooks/paypal.pb.js:68`, `pb_hooks/stripe.pb.js:62` | die einzigen zwei Wege in eine Zahlung |

Punktuelle Hinweise gibt es schon: `HelpBanner` warnt auf `/payments` vor
fehlendem Anbieter, auf `/pricing` vor leerem Katalog, auf `/legal` vor
fehlenden Rechtstexten. Drei getrennte Warnungen, die nie zusammenzählen — und
keine davon hindert jemanden daran, in eine unmögliche Zahlung zu laufen.

## 1. Die Prüfung lebt an genau einer Stelle

Die Versuchung ist, die Bedingungen dort hinzuschreiben, wo sie gebraucht
werden: eine im Sidebar-Badge, eine in der Kundenansicht, eine im Server. Drei
Kopien driften garantiert auseinander, und die Kopie, die am Ende falsch ist,
ist die im Server — also die, an der Geld hängt.

Deshalb: **eine Funktion in `pb_hooks/lib/verkaufslib.js`.**

```js
// liefert [{ key, hart, erfuellt }] — keine Texte, keine Routen
pruefeVerkaufsbereitschaft($app)
```

Sie gibt Keys und Booleans zurück, keine Beschriftungen. Texte und Zielrouten
gehören ins Frontend; der Server soll nicht wissen, wie eine deutsche
Oberfläche eine fehlende Bestell-E-Mail nennt.

### Die harten Punkte (sperren den Verkauf)

| Key | Bedingung | Warum hart |
|---|---|---|
| `zahlung` | `paypalEnabled \|\| stripeEnabled` | Ohne Anbieter kann niemand bezahlen. |
| `katalog` | `prices` + `packages` zusammen > 0 | Ohne Preis gibt es nichts zu kaufen. |
| `recht` | `imprintHtml` **und** `privacyHtml` nicht leer | In Deutschland Pflicht beim Verkauf an Verbraucher. Beide Seiten sind bereits öffentlich verlinkt. |
| `bestellmail` | `orderNotificationEmail` gesetzt | `pb_hooks/email.pb.js:36` liest das Feld **ohne Fallback**. Ist es leer, läuft eine Bestellung ein und niemand erfährt davon — sie steht nur auf `/orders`, wenn jemand nachsieht. |

### Die weichen Punkte (nur Hinweis)

`name` (`businessName` gesetzt und nicht mehr die Vorgabe „Fotogalerie") ·
`logo` · `kontaktmail` (`contactEmail`) · `domain` (`customDomain`) ·
`wasserzeichen` (`watermarkText` oder `watermarkLogo`).

Sie zählen in den Fortschrittsbalken, aber nie in den Satz „Noch *n* Dinge bis
zum Verkauf der Fotos" — sonst verspricht die Zahl etwas, das sie nicht hält.

### Zwei Verbraucher, dieselbe Funktion

- **`GET /api/custom/verkaufsbereitschaft`** — öffentlich zugänglich. Die
  Antwort enthält ausschließlich Keys und Booleans, keine Adressen, keine
  Schlüssel, keine E-Mail-Adressen. Dass eine Instanz keine Zahlungsart hat,
  ist ohnehin an der Kasse sichtbar.
- **Direkter Aufruf** am Kopf von `paypal/create-order` und
  `stripe/create-checkout-session` → **HTTP 409** mit der Liste der fehlenden
  harten Keys, wenn etwas fehlt.

Das sind die einzigen zwei Eintritte in eine Zahlung. Ein Guard je Endpunkt ist
die vollständige Sperre; ein Guard in der Oberfläche wäre es nicht.

### Kein neues Schema-Feld

Alles ist aus `settings` plus zwei Zählungen ableitbar. Ein gespeicherter
Checklisten-Zustand wäre ein zweiter Wahrheitsort, der veraltet, sobald jemand
einen Preis löscht.

## 2. Im Frontend: ein Feld an `SettingsContext`, kein neuer Provider

`SettingsContext` lädt beim Start, cached, und hat ein `refresh()`, das nach
**jedem** Speichern schon überall aufgerufen wird. Hängt die
Verkaufsbereitschaft dort mit drin, aktualisiert sich die Checkliste ohne eine
einzige zusätzliche Verdrahtung.

```ts
interface SettingsContextValue {
  settings: AppSettings;
  verkauf: Verkaufsbereitschaft;   // neu
  loaded: boolean;
  refresh: () => Promise<void>;    // lädt jetzt beides
}
```

`src/utils/verkauf.ts` hält die Frontend-Hälfte: Typ, Beschriftungen,
Zielrouten je Key, und die abgeleiteten Werte `offeneHarte`, `gesperrt`,
`erledigt`/`gesamt`.

Ein eigener Provider wäre ein zweiter Ladezustand, ein zweiter Cache und ein
zweites `refresh()`, das man an denselben Stellen aufrufen müsste. Verworfen.

## 3. Seitenleiste: aufklappbare Gruppen

```
✓ Einrichtung  ⚈3          ▸ Kunden
□ Album                        Nutzer · Termine · Support
▸ Verkauf                  ▾ Einstellungen
     Preise · Bestellungen        Branding · Domain · Kontakt & E-Mails
     · Zahlungen                  · Bilder & Wasserzeichen · Rechtliches
```

`routes.ts` behält `adminNavItems` für die ungruppierten Einträge oben
(Einrichtung, Album) und bekommt daneben:

```ts
export interface NavGroup { key: string; label: string; items: NavItem[] }
export const adminNavGroups: NavGroup[]
```

Der Kommentar in `routes.ts`, der vier flache Termin-Einträge ablehnt, bleibt
gültig: `/appointments` behält seine Reiter (`AppointmentsTabs.tsx`) und ist in
der Gruppe „Kunden" **ein** Eintrag.

**Umsetzung als natives `<details>`/`<summary>`.** Aufklappen, Tastaturbedienung
und die ARIA-Semantik gibt es damit ohne eine Zeile JavaScript. Zu regeln
bleibt nur:

- Offen/zu je Gruppe in `localStorage` unter `sidebar_groups_v1`, gesetzt über
  `onToggle`. Ein fehlender oder kaputter Wert heißt „offen" — wie beim
  `HelpBanner` ist ein Fehlschlag beim Lesen harmlos.
- Enthält eine Gruppe die aktive Route, wird sie **erzwungen offen**
  (`open` gesetzt, unabhängig vom gespeicherten Wert). Eine zugeklappte Gruppe,
  in der man gerade steht, wäre Orientierungsverlust.

Der mobile Drawer erbt das Verhalten unverändert, weil er dasselbe
`sidebarContent` rendert.

## 4. `/branding` wird aufgeteilt

`BrandingPage.tsx` (554 Zeilen) zerfällt in vier Seiten:

| Route | Inhalt | heutiger Abschnitt |
|---|---|---|
| `/branding` | Name, Logo, Favicon, Preset, Farben, Schrift, Theme + Live-Vorschau | `brandingSection` |
| `/domain` | Eigene Domain, Anleitung, Erreichbarkeitsprüfung | `domainSection` |
| `/kontakt` | `contactEmail`, `orderNotificationEmail`, `websiteUrl`, Währung | `contactSection` |
| `/bilder` | Wasserzeichen, Vorschaugröße, Neu-Erzeugen, Kundenansicht-Vorschau | `watermarkSection` |

**Der Zahlungs-Abschnitt wird ersatzlos gelöscht.** `/payments`
(`AdminPaymentsPage`) rendert dieselbe `PaymentSettings`-Komponente bereits —
der Abschnitt war schon immer eine zweite Ansicht auf denselben Zustand.

### Gemeinsames Speichern

Neuer Hook `src/features/Settings/useSettingsDraft.ts`:

```ts
const { draft, set, files, setFile, save, saving } = useSettingsDraft();
```

Der heutige `save()` schickt ohnehin **alle** Textfelder als `FormData` an den
einen Einstellungs-Datensatz, unabhängig davon, welcher Abschnitt sichtbar war.
Er funktioniert deshalb unverändert von jeder der vier Seiten aus — ein
Herausziehen, kein Umschreiben.

Wichtig für die Abgrenzung: der Hook füllt `draft` aus `settings`, sobald
`loaded` wahr wird. Vier Seiten heißt vier Entwürfe, aber immer nur einer
gleichzeitig auf dem Bildschirm; ein seitenübergreifender Entwurf wird
ausdrücklich **nicht** gebaut. Wer die Seite ohne Speichern verlässt, verliert
seine Änderungen — wie heute beim Wechsel auf eine andere Adminseite auch.

### Der Wizard entfällt

`activeStep`, `steps`, `goNext`, `f.stepper`, `f.step`, `f.dot`, `f.dotActive`,
`f.wizardNav` und der `setupMode`-Zweig in `BrandingPage` werden gelöscht.
Grund: mit vier eigenen Seiten existierte jeder Einstellungsblock sonst an zwei
Orten und müsste doppelt gepflegt werden. Die Checkliste übernimmt die Führung
— sie verweist auf die echten Seiten, statt sie nachzubauen.

`/branding?setup=1` leitet auf `/einrichtung` um, damit gespeicherte Links und
Hilfeartikel nicht ins Leere zeigen.

## 5. Die Einrichtungs-Seite

`/einrichtung` (`src/pages/admin/EinrichtungPage.tsx`) rendert die Punkte aus
dem Kontext:

```
Noch 3 Dinge bis zum Verkauf der Fotos
████░░░░░░░░  3 von 9

PFLICHT FÜR DEN VERKAUF
✓  Preise oder Pakete angelegt
✗  Zahlungsanbieter aktiv          [Einrichten →]
✗  Impressum & Datenschutz         [Einrichten →]
✗  Bestell-E-Mail hinterlegt       [Einrichten →]

EMPFOHLEN
✓  Name gesetzt                    ○  Kontakt-E-Mail     [Einrichten →]
✓  Logo hochgeladen                ○  Eigene Domain      [Einrichten →]
                                   ○  Wasserzeichen      [Einrichten →]
```

- Der Satz zählt **nur die offenen harten** Punkte. Sind alle erfüllt, steht
  dort „Du kannst deine Fotos verkaufen."
- Der Balken zählt **alle** Punkte.
- Jeder offene Punkt hat genau einen Button auf seine Zielroute. Kein
  Formular auf dieser Seite — sie erklärt und verweist, sie bearbeitet nicht.
- Weiche Punkte werden neutral dargestellt (`○`), nicht als Fehler. Eine eigene
  Domain ist kein Versäumnis.

### `setupCompleted` bekommt eine ehrlichere Bedeutung

Das Feld bleibt, heißt aber ab jetzt **„hat die Checkliste einmal gesehen"**
und wird beim ersten Öffnen von `/einrichtung` gesetzt.

`SetupRedirect` leitet dorthin statt auf `/branding?setup=1` und prüft
`location.pathname.startsWith("/einrichtung")` statt `"/branding"`.

Die Alternative — auf die Verkaufsbereitschaft selbst umzuleiten — wurde
verworfen: ein Fotograf mit einem offenen *weichen* Punkt (keine eigene Domain)
würde bei jedem Login umgeleitet, ohne dass irgendetwas kaputt wäre.

## 6. Wo der Zustand sichtbar wird

| Ort | Darstellung | Bedingung |
|---|---|---|
| Seitenleiste | Zahl-Badge am Eintrag „Einrichtung" | `offeneHarte > 0`; bei 0 verschwindet das Badge, der Eintrag bleibt |
| `/album` (Admin) | Warnbanner, **nicht** wegklickbar, mit „Jetzt erledigen →" | `gesperrt` |
| `/album` (Admin) | vorhandener `HelpBanner`, wegklickbar | nur weiche Punkte offen |
| Kundenansicht | neutraler Hinweis statt Kaufbereich | `gesperrt` |
| Zahlungs-Endpunkte | HTTP 409 | `gesperrt` |

Der harte Banner ist bewusst nicht wegklickbar: `HelpBanner` merkt sich
Ablehnungen pro Browser, und genau das wäre hier falsch — ein weggeklickter
Hinweis auf einen gesperrten Verkauf ist ein stiller Ausfall.

Er hängt auf `/album` und nicht im `AppShell`: `/album` ist die Startseite nach
dem Login, also der Ort, an dem er ohnehin jeden erreicht. Über *jeder*
Adminseite stünde er auch beim Hochladen, wo er nichts beiträgt.

### Die Kundenansicht

Zu unterscheiden ist, welche Galerien überhaupt durch die Kasse gehen.
`Album.tsx:298` verzweigt: Shootings vom Typ `paid` oder `public` führen direkt
auf die Download-Seite, ohne Zahlung. **Die Sperre betrifft ausschließlich den
Kauf-Weg** — Ansehen, Auswählen und freigegebene Downloads laufen unverändert
weiter, auch bei gesperrtem Verkauf. Das war eine ausdrückliche Entscheidung:
wer nur Bilder ausliefern will, soll das ohne Impressum und Zahlungsanbieter
können.

Zwei Berührungspunkte:

- **`src/features/Album/components/Album.tsx`** — führt der Weg in die Kasse
  (`!isAdminAlbum && !isFreeDownload`) und ist der Verkauf gesperrt, wird der
  „Kaufen"-Knopf deaktiviert und die Aktionsleiste trägt den Hinweis. Ein Knopf,
  der auf eine Absage führt, ist schlechter als ein Knopf, der nicht geht.
- **`src/pages/user/PricingPage.tsx`** — der maßgebliche Ort, weil er auch bei
  direktem Aufruf und beim Neuladen greift. Bei Sperre wird der dreistufige
  Ablauf durch den Hinweis ersetzt.

Der Text für Kundschaft lautet **„Der Bilderkauf ist gerade nicht möglich.
Bitte später erneut versuchen."** Er nennt keinen Grund. Eine Kundin kann mit
„es fehlt ein Impressum" nichts anfangen, und die Instanz muss ihre
Konfigurationslücken nicht öffentlich aufzählen.

Ist jemand mit Adminrechten angemeldet, steht an derselben Stelle stattdessen
die Warnung mit der offenen Zahl und dem Link auf `/einrichtung` — sonst würde
der Fotograf beim Selbsttest denselben nichtssagenden Satz lesen wie seine
Kundschaft.

## 7. Tests

| Ebene | Was | Wo |
|---|---|---|
| Unit | `pruefeVerkaufsbereitschaft` — jede harte Bedingung einzeln fehlend, alle erfüllt, Reihenfolge stabil | `tests/verkaufsbereitschaft.test.ts` |
| Unit | Frontend-Ableitungen: `offeneHarte` zählt nur harte, `gesperrt` folgt daraus, weiche verändern die Zahl nicht | dieselbe Datei |
| Hooks | `paypal/create-order` und `stripe/create-checkout-session` antworten 409 ohne Zahlungsanbieter und lassen mit vollständiger Einrichtung durch | ergänzt zur bestehenden Hook-Abdeckung |
| E2E | Frische Instanz landet auf `/einrichtung`, Badge zeigt 4; nach Erfüllen aller harten Punkte verschwinden Badge und Banner | `e2e/tests/einstellungen/einrichtung.spec.ts` |
| E2E | Kundin sieht bei gesperrtem Verkauf den Hinweis statt der Kasse, kann die Galerie aber weiter ansehen | `e2e/tests/kunde/verkauf-gesperrt.spec.ts` |
| E2E | Sidebar-Gruppen: Gruppe der aktiven Route ist offen, zugeklappter Zustand übersteht einen Seitenwechsel | `e2e/tests/admin/navigation.spec.ts` |

Die vorhandene Suite deckt Kundenansicht (`kundenansicht.spec.ts`, `ff6fa76a`),
Branding, Preise, Rechtstexte und Zahlungen bereits ab; deren Selektoren müssen
den neuen Routen folgen.

## 8. Ausdrücklich nicht im Umfang

| Verworfen | Warum |
|---|---|
| Schema-Feld für den Checklisten-Zustand | Ableitbar; ein gespeicherter Wert veraltet, sobald ein Preis gelöscht wird |
| Geführter Durchlauf über Seitengrenzen („alles der Reihe nach") | Neuer Mechanismus quer durch den Router, für einen Nutzen, den vier Buttons auch bringen |
| Sperren der Galerie selbst | Bilder ausliefern muss ohne Verkaufseinrichtung möglich bleiben |
| Grund der Sperre in der Kundenansicht | Für Kundschaft ohne Nutzen, für die Instanz unnötige Offenlegung |
| Eigener Provider für die Verkaufsbereitschaft | Zweiter Ladezustand, zweiter Cache, zweites `refresh()` |
| Seitenübergreifender ungespeicherter Entwurf der Einstellungen | Vier Seiten, vier Entwürfe; ein gemeinsamer Entwurf bräuchte eine Verlassen-Warnung, die es heute auch nicht gibt |
| Wizard neben der Checkliste behalten | Jeder Einstellungsblock existierte an zwei Orten |
