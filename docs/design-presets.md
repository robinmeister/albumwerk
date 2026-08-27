# Design-Presets — Entwurf und Beschlusslage

> **Stand: 2026-08-27.** Ergebnis einer Durcharbeitung vor der Umsetzung.
> Dieses Dokument hält die *Entscheidungen* fest, nicht den Code —
> insbesondere die Begründungen, damit später nachvollziehbar ist, warum eine
> Alternative verworfen wurde. Abweichungen bei der Umsetzung gehören hier
> nachgetragen.

## Ziel

Admins wählen ein vorgefertigtes Design-Register, die ganze Instanz folgt ihm —
Adminoberfläche wie Kundengalerie. Bisher konnten sie nur vier Einzelwerte
setzen (zwei Farben, eine Schrift, ein Radius); das reicht nicht, um eine
Gestaltung zu transportieren.

Die Register stammen aus der Gestaltung der Marketing-Website
(`albumwerk-website`, `src/styles/global.css`) und werden hier auf Astryx
übertragen.

## Was ein Preset ist

Ein Preset hat zwei Hälften mit unterschiedlichem Besitzer:

```ts
interface DesignPreset {
  key: DesignPresetKey;
  name: string;
  description: string;

  // überschreibbar — Voreinstellung für die vier bestehenden Felder
  defaults: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: FontKey;
    borderRadius: number;
  };

  // preset-eigen — das Register, nicht einzeln überschreibbar
  register: {
    surfaces: {
      body: [light: string, dark: string];
      surface: [light: string, dark: string];
      card: [light: string, dark: string];
    };
    headingFamily: FontStackKey;
    bodyFamily: FontStackKey;
    monoFamily: FontStackKey;
    components: AstryxComponentOverrides;
  };
}
```

Dabei sind zwei Typen zu unterscheiden:

- `FontKey` — was Admins im Formular auswählen können. Wird um die neuen
  Familien erweitert.
- `FontStackKey` — Obermenge, enthält zusätzlich reine Register-Schriften wie
  Martian Mono, die als Fließtextschrift nie zur Wahl stehen sollen.

`defaults.fontFamily` ist ein `FontKey`, die drei Rollen im Register sind
`FontStackKey`.

**Beschluss:** Die Astryx-`components`-Overrides (Schattenlosigkeit,
Überschriftengewicht, Knopfform, Auszeichnungsstil) sind preset-eigen und
*nicht* einzeln überschreibbar. Sonst bräuchte jedes Preset ein eigenes
Formular, und die Register verlören genau das, was sie ausmacht.
Überschreibbar sind ausschließlich die vier Werte, die heute schon Felder
haben.

## Die Schriftregel

Ein Register paart bis zu drei Schriften, das Settings-Feld kennt aber nur
eine `fontFamily`. Auflösung:

> `fontFamily` geerbt → das Schriftpaar des Presets gilt (Überschrift, Text,
> Auszeichnung getrennt).
> `fontFamily` gesetzt → eine Schrift für alles, wie bisher.

Im Formular erscheint das als „Schrift: vom Preset (Familjen Grotesk / Public
Sans)" mit der Möglichkeit, eine eigene zu wählen. Die neuen Familien werden
deshalb zusätzlich in die Auswahlliste aufgenommen — sie sind für genau
diesen Überschreibungsfall da.

## Die drei Presets

**Kein „Bestand"-Preset.** Ursprünglich war eines vorgesehen, das den heutigen
Look konserviert, damit bestehende Instanzen sich beim Update nicht verändern.
Verworfen, weil das Produkt vor dem Launch steht und es keine fremden
Instanzen zu schonen gibt. Folge, bewusst in Kauf genommen: bestehende
Instanzen ändern beim Update ihr Aussehen.

### kontaktbogen (Voreinstellung für neue Instanzen)

Auswahl als Handwerk. Positivpapier, Filmträger, Fettstift.

| | hell | dunkel |
|---|---|---|
| `--color-background-body` | `#e4e1d6` | `#191814` |
| `--color-background-surface` | `#edeae1` | `#211f1a` |
| `--color-background-card` | `#edeae1` | `#211f1a` |

- `defaults`: primary `#cf2f22` (Fettstift), secondary `#14130f` (Filmträger), font `public-sans`, radius `0`
- Schriften: Familjen Grotesk (Überschrift) · Public Sans (Text) · Martian Mono (Auszeichnung)
- `components`: heading `fontWeight: 600, letterSpacing: -0.035em` · button `borderRadius: 0, boxShadow: none, backgroundColor: Filmträger` · card `boxShadow: none, borderWidth: 1px`

### riss

Gerät, das dir gehört. Technische Zeichnung: hell ist die Weißpause, dunkel
die Blaupause.

| | hell | dunkel |
|---|---|---|
| `--color-background-body` | `#dfe7eb` | `#0d3550` |
| `--color-background-surface` | `#e9eef1` | `#0f3d5c` |
| `--color-background-card` | `#e9eef1` | `#0f3d5c` |

- `defaults`: primary `#f2c400` (Signal), secondary `#0a2233` (Risstinte), font `public-sans`, radius `0`
- Schriften wie kontaktbogen
- `components` wie kontaktbogen

### passepartout

Das fertige Album. Karton, Buchleinen, tiefe Passepartouts.

| | hell | dunkel |
|---|---|---|
| `--color-background-body` | `#dfdcd4` | `#1c1a17` |
| `--color-background-surface` | `#ece9e1` | `#242119` |
| `--color-background-card` | `#ece9e1` | `#242119` |

- `defaults`: primary `#5e3128` (Buchleinen), secondary `#17181a` (Tiefdruck), font `newsreader`, radius `0`
- Schriften: Instrument Serif (Überschrift) · Newsreader (Text) · Public Sans (Auszeichnung, versal und gesperrt)
- `components`: heading `fontWeight: 400, letterSpacing: 0` · button `borderRadius: 0, boxShadow: none` · card `boxShadow: none, borderWidth: 1px`

Die dunklen Werte für passepartout sind neu — die Website hat diese Richtung
nie gebaut, es gibt also keine Vorlage. Als Auszeichnungsschrift nutzt
passepartout Public Sans statt des ursprünglich vorgesehenen Instrument Sans;
das spart ein Schriftpaket bei praktisch gleichem Ergebnis.

## Datenmodell

**Beschluss (Ansatz A):** Die bestehenden Spalten tragen weiterhin den
*effektiven* Wert. Aufgelöst wird **nur beim Schreiben**.

Begründung: `pb_hooks` liest `primaryColor` direkt aus dem Datensatz —
`manifest.pb.js` für die PWA-Themefarbe, `lib/emaillib.js` für den Balken in
den Bestellmails. Serverseitig läuft kein React. Würden die Spalten nur noch
Overrides enthalten, müssten die Preset-Definitionen in `pb_hooks` dupliziert
werden; zwei Quellen derselben Wahrheit, die auseinanderlaufen. So bleibt
`pb_hooks` unangetastet und es gibt keine Leseschicht, die von der DB
abweichen kann.

Neue Felder in der `settings`-Collection:

| Feld | Typ | Inhalt |
|---|---|---|
| `designPreset` | select | `kontaktbogen` \| `riss` \| `passepartout` |
| `themeOverrides` | json | Liste der bewusst gesetzten Feldnamen, z. B. `["primaryColor"]` |

`fontFamily` bekommt zusätzlich die Werte `familjen-grotesk`, `public-sans`,
`instrument-serif`, `newsreader`. Die vier bisherigen bleiben wählbar.

`themeMode` (hell/dunkel/auto) bleibt unberührt und gehört **weder** zum
Preset noch zu den überschreibbaren Feldern: jedes Register definiert beide
Polaritäten, die Wahl zwischen ihnen bleibt eine eigenständige Einstellung.

**Warum eine Namensliste statt Leerwerten:** `borderRadius: 0` ist ein
gültiger Wert und ließe sich nicht von „nicht gesetzt" unterscheiden. Eine
explizite Liste beantwortet die Frage eindeutig und ohne Sentinel-Werte.

### Migration

`pb_migrations/1785600001_design_presets.js`

Backfill des vorhandenen Datensatzes:

> Felder, die noch auf den alten Voreinstellungen stehen (`#3d4a3d`,
> `#b08d57`, `inter`, `8`), gelten als **nicht** überschrieben und übernehmen
> kontaktbogen. Felder, die davon abweichen, wandern nach `themeOverrides`
> und behalten ihren Wert.

Wer nie etwas eingestellt hat, bekommt also das neue Design; wer bewusst
Farben gesetzt hat, behält sie.

`down()` entfernt die beiden Felder samt der neuen `fontFamily`-Werte und
setzt die alten Voreinstellungen **nur für Felder zurück, die nicht in
`themeOverrides` stehen**.

**Korrigiert am 2026-08-27 nach dem Task-4-Review.** Ursprünglich sollte
`down()` alle vier Werte bedingungslos zurücksetzen. Das ist Datenverlust:
`up()` bewahrt einen bewusst gesetzten Wert gerade deshalb, weil er bewusst
ist — ihn beim Rollback zu überschreiben macht aus einer Rücknahme eine
Löschung. Schlimmer noch, `down()` entfernt `themeOverrides`, also die
einzige Aufzeichnung darüber, welche Felder bewusst waren; ein danach
erneut laufendes `up()` liest die überschriebene Marken­farbe als „nie
konfiguriert" und ersetzt sie ein zweites Mal.

Einzige Ausnahme ist `fontFamily`: steht dort eine der neu hinzugekommenen
Familien, muss sie zurückgesetzt werden, sonst ist der Datensatz gegen die
wieder verengte Auswahlliste ungültig und scheitert beim nächsten Speichern.

`DEFAULT_SETTINGS` in `src/config/settings.ts` wird auf die
kontaktbogen-Werte gezogen: `designPreset: "kontaktbogen"`,
`themeOverrides: []`, primary `#14130f`, secondary `#b3261a`, font
`public-sans`, radius `0`.

## Theme-Aufbau

`buildAstryxTheme(settings)` ändert sich an einer Stelle: Farben, Schrift und
Radius kommen weiter aus den flachen Feldern, das Register — Surfaces,
Component-Overrides, Schriftrollen — kommt zusätzlich aus
`PRESETS[settings.designPreset]`.

Unbekannter Preset-Key fällt auf `kontaktbogen` zurück, damit ein Downgrade
nicht auf einer ungestylten Seite endet.

**Der Theme-Name muss die Werte widerspiegeln, nicht nur das Register.**
Astryx spritzt das erzeugte CSS einmal pro `theme.name` ein und merkt sich das
in einem modulweiten `Set` (`Theme.tsx:98,117-120`); wer denselben Namen mit
anderen Werten mountet, bekommt stillschweigend das zuerst eingespritzte CSS.
Vor diesem Vorhaben hiess das Theme konstant `"albumwerk"` — deshalb hat die
Live-Vorschau auf der Branding-Seite nie den Entwurf gezeigt, sondern immer
das gespeicherte Theme. Der Name enthält daher jetzt einen Fingerabdruck der
Werte, die das CSS bestimmen. Aufgefallen im Task-6-Review.

**Geprüft am 2026-08-27 (ersetzt das ursprünglich offene Risiko).** Astryx
normalisiert die Helligkeit des Akzents und behält nur den Farbton. Gemessen
über `defineTheme({ color: { accent } })`:

| eingespeist | erzeugter Akzent (hell / dunkel) |
|---|---|
| `#14130f` Filmträger | `#666000` / `#D5C86C` — Oliv/Senfgelb |
| `#0a2233` Risstinte | `#00659C` / `#91CCFF` — Mittelblau |
| `#cf2f22` Fettstift | `#BB1714` / `#FFB3A2` |
| `#f2c400` Signal | `#775B00` / `#EFC100` |
| `#5a2231` Buchleinen | `#A43657` / `#FFB0C1` |

Ein Beinahe-Schwarz kann `color.accent` also **nicht** tragen: der winzige
Farbstich des warmen Schwarz wird zu Senfgelb hochgezogen. Der ursprüngliche
Plan — `primaryColor` = Tinte — hätte kontaktbogen einen Senf-Akzent gegeben.

**Beschluss:** `primaryColor` ist die **Markierungsfarbe** des Registers, nicht
die Tinte. Daraus leitet Astryx eine brauchbare Skala für Links, Fokus und
Auswahl ab; bei riss trifft sie die handgerechneten Website-Werte fast exakt.
Die Website-Regel „die Markierung ist nie eine Fläche" bleibt trotzdem
gewahrt, weil die Knopffüllung über einen `components.button`-Override auf die
Tinte gesetzt wird. `secondaryColor` trägt jetzt die Tinte und bleibt wie
bisher als `--color-brand-secondary` verfügbar.

**Nachgemessen am 2026-08-27, nachdem der Task-5-Sichttest die Drift
bestätigt hat.** Astryx pinnt nicht nur bei dunklen Eingaben die Helligkeit,
sondern *immer*: sechs Kandidaten von `#5a2231` bis `#701c24` landen alle bei
rund `#A0` Helligkeit, nur der Farbton wandert.

| eingespeist | erzeugter Akzent (hell / dunkel) |
|---|---|
| `#5a2231` | `#A43657` / `#FFB0C1` — Himbeere |
| `#5c2b2b` | `#A33B40` / `#FFB2AF` |
| `#5e3128` | `#9F4031` / `#FFB3A2` — Ziegelrot |
| `#63302a` | `#A13E36` / `#FFB3A7` |

Ein wirklich dunkles Ochsenblut als Akzent ist über `color.accent` also
grundsätzlich nicht erreichbar. Erreichbar ist nur die Wahl zwischen Himbeere
und Ziegelrot. **Beschluss:** `#5e3128`, weil Ziegelrot dem Charakter von
Buchleinen näher steht als Himbeere. Die Registeridentität trägt ohnehin die
Fläche, nicht der Akzent.

Nicht geändert wurde riss: dass `#f2c400` im Hellmodus zu `#775B00` wird, ist
kein Defekt, sondern die Absicht — die Website nutzt auf der Weißpause
denselben abgedunkelten Bernstein (`#7d5806`), weil heller Grund es verlangt.

## Oberfläche

`src/pages/admin/BrandingPage.tsx` (heute 477 Zeilen) bekommt oben einen
Preset-Wähler mit drei Karten. Jede Karte rendert eine kleine Vorschau über
den dort bereits vorhandenen `<Theme theme={buildAstryxTheme(draft)}>`-
Mechanismus.

Darunter die vier Felder wie heute, jedes mit sichtbarem Zustand:

- geerbt → Hinweis „vom Preset", Wert grau
- gesetzt → Zurücksetzen-Knopf, der das Feld aus `themeOverrides` entfernt und
  den Preset-Wert wiederherstellt

Ein Preset-Wechsel rechnet alle geerbten Felder im Draft neu; angefasste
bleiben stehen.

Die Seite ist mit dem Preset-Wähler nahe an der Grenze, an der sie in zwei
Komponenten zerfallen sollte. Sofern der Wähler mehr als etwa 80 Zeilen
braucht, wandert er nach `src/features/Settings/components/PresetPicker.tsx`.

## Neue Abhängigkeiten

`@fontsource/familjen-grotesk`, `@fontsource/public-sans`,
`@fontsource/martian-mono`, `@fontsource/instrument-serif`,
`@fontsource/newsreader` — jeweils selbst gehostet, kein Font-CDN (DSGVO,
siehe `src/main.tsx`).

Die vier bisherigen Pakete bleiben, ihre Schriften sind weiter wählbar.

## Tests

- `tests/designPresets.test.ts` (vitest, Muster wie `tests/time.test.ts`):
  Übernehmen eines Presets, Markieren und Zurücksetzen einzelner Felder,
  Backfill-Regel, Fallback bei unbekanntem Key
- ein Theme-Snapshot je Preset über `buildAstryxTheme`, damit ein
  versehentlicher Token-Dreher auffällt
- ein Playwright-Test in `e2e/tests`: Preset wechseln, speichern, neu laden,
  Register ist noch da

## Verworfene Alternativen

**Spalten enthalten nur Overrides, aufgelöst wird überall.** Sauberer im
Datenmodell, erzwingt aber die Preset-Definitionen ein zweites Mal in
`pb_hooks`, sonst brechen Bestellmails und PWA-Manifest. Dazu das
`borderRadius: 0`-Problem.

**Preset füllt die Felder einmalig aus.** Ein Knopf „Preset anwenden"
schreibt vier Werte, danach ist alles frei editierbar. Kleinster Eingriff,
aber ein Preset kann dann nur die vier Werte transportieren, nicht das
Register — kontaktbogen wäre eine Umfärbung, keine Gestaltung.

**Preset besitzt alles, keine Einzelüberschreibung.** Am kohärentesten und am
wenigsten Code, nimmt Fotograf:innen aber die eigene Markenfarbe weg und
widerspricht dem White-Label-Versprechen.

**Adminoberfläche fest im Register, Kundengalerie White-Label.** War der
ursprüngliche Vorschlag. Hinfällig, sobald der Admin das Register selbst
wählt: dann ist es seine Markenentscheidung, und die Galerie darf ihr folgen.
