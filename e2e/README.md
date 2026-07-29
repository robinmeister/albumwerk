# E2E-Tests

Die Suite prüft die wichtigen Workflows der App **und** erzeugt die Screenshots
für die Hilfe-Artikel. Beides aus einem Lauf: so können die Bilder nicht zeigen,
was die App gar nicht mehr tut.

## Voraussetzungen

* **Node ≥ 20** (`.nvmrc`). Ist nvm installiert, wählen die Make-Ziele die
  Version selbst; sonst `nvm use` vor dem Arbeiten.
* Eine **laufende Dev-Instanz**: `make dev` (App auf `:8091`, Demo-Daten).

Getestet wird gegen die **gebackene** Instanz, nicht gegen den Vite-Dev-Server —
die Screenshots sollen das Produktions-Bundle zeigen. Frontend-Änderungen sind
deshalb erst nach einem Rebuild sichtbar:

```bash
docker compose -p albumwerk-dev -f docker-compose.dev.yml up -d --build
```

## Befehle

| Befehl | Zweck |
|---|---|
| `make e2e` | Suite ausführen (nimmt keine Screenshots auf) |
| `make e2e ARGS="--project=desktop"` | nur ein Projekt |
| `make help-shots` | Suite mit Aufnahme laufen lassen und `public/help` neu schreiben |
| `make e2e-clean` | Reste eines abgebrochenen Laufs entfernen |
| `npm run e2e:check` | Typprüfung der Suite |

## Projekte

| Projekt | Verzeichnis | Viewport | Warum |
|---|---|---|---|
| `desktop` | `tests/admin` | 1440×900 @2x | Fotografen arbeiten am Rechner |
| `mobil` | `tests/kunde` | 390×844 @2x | Kundinnen öffnen ihr Album am Handy |
| `einstellungen` | `tests/einstellungen` | 1440×900 @2x | schreibt globalen Zustand |

Das Projekt `einstellungen` läuft **zuletzt und seriell**. Branding, Rechtstexte,
Zahlungen und Preise schreiben alle auf denselben Record (`appsettings0001`) —
das lässt sich nicht über Fixtures isolieren, und ein parallel laufender
Branding-Test würde die Screenshots aller anderen Tests umfärben. Der
Ausgangszustand wird vorher gesichert und danach zurückgeschrieben.

## Testdaten

Fixtures entstehen über die PocketBase-API, nicht durch Klicken — ein Test für
"Bilder auswählen" soll nicht vorher ein Album zusammenklicken.

**Sichtbare Namen sind doku-tauglich** („Hochzeit Anna & Tim", „Anna Berger"),
weil dieselben Läufe die Screenshots erzeugen. Aufgeräumt wird deshalb **nicht**
über den Namen, sondern über das Record-ID-Präfix `e2e`, das nirgends in der
Oberfläche auftaucht.

Zwei Sonderfälle:

* Records, die ein Test **über die Oberfläche** anlegt, bekommen eine
  PocketBase-ID ohne Präfix. Die müssen im `finally` über ihren Titel gelöscht
  werden — und brauchen deshalb einen **eigenen** Titel (`NEUES_ALBUM`), sonst
  löscht ein Test die Daten eines parallel laufenden anderen.
* Neue Beispieldaten gehören nach `support/data.ts`, nicht in den Test.

## Screenshots

Aufnahme nur mit `E2E_SHOTS=1`. Ohne den Schalter ist `shot()` ein No-op —
Browser-Rendering ist nicht bitstabil, jeder Lauf würde sonst Git-Diffs erzeugen.

```ts
await shot(page.getByTestId("bildraster"), "album-oeffnen/02-bilder");
```

Der Pfad ist `<artikel-slug>/<nn>-<beschreibung>`; der Slug muss einem Artikel in
`src/content/help` entsprechen.

**Regeln, die aus konkreten Fehlern stammen:**

1. **Nie `<main>` oder `<body>` fotografieren.** Diese Container spannen die
   volle Viewporthöhe; was darüber hinausragt, schneidet der Viewport ab, und
   darunter steht eine große leere Fläche. Immer das Element nehmen, um das es
   im jeweiligen Schritt geht.
2. **Zuschnitte an `data-testid` hängen, nicht an `ancestor::div[3]`.** Die App
   hat kaum semantische Container — Karten und Kopfbereiche sind alle `div` mit
   generierten StyleX-Klassen. Wo ein stabiler Anker fehlt, gehört einer ins
   Produkt (sparsam, auf Container-Elemente, mit Begründung im Kommentar).
3. **Vor jedem Bild `bilderGeladen(page)`**, sonst landen graue Kacheln in der
   Doku.
4. **Ausschnitte schmal halten** (~600px Inhalt). Die Artikelspalte ist 68ch
   breit; lieber ein Formular auf zwei Bilder aufteilen als eines quetschen.

`e2e/help-shots.mjs` wandelt die PNGs nach WebP unter `public/help/` und
schneidet dabei einfarbige Ränder weg. Die Bilder gehören ins Repo — sie werden
ins Docker-Image gebacken. Aus dem PWA-Precache sind sie ausgenommen
(`workbox.globIgnores` in `vite.config.ts`), damit Kunden beim ersten Öffnen
nicht die komplette Doku-Bildersammlung laden.

## Selektoren

* **Rollen und exakte Namen** bevorzugen: `getByRole("button", { name: "Speichern", exact: true })`.
  Ohne `exact` greift ein `/Speichern/`-Regex die „Speichern & prüfen"-Knöpfe der
  Zahlungs-Abschnitte — und der erste davon ist deaktiviert.
* **Titel stehen oft mehrfach im DOM** (Liste, Detailkopf, Kacheltext).
  `getByText(titel)` ist deshalb selten eindeutig; die Überschrift innerhalb
  eines `data-testid`-Containers ist es.
* **Jeder `HelpHint` rendert einen versteckten Popover** mit einem
  „Close popover"-Knopf. Bei Suchen über die ganze Seite mit
  `.locator("visible=true")` einschränken.

## Was die Suite nicht abdeckt

* **Bezahlvorgänge.** PayPal und Stripe rendern in fremden Iframes; ohne
  Sandbox-Zugangsdaten enden die Tests an der Bezahlseite. Was danach kommt,
  beschreiben die Artikel in Worten.
* **DNS/Custom Domain** und **Backups** — kein UI-Ablauf, der sich prüfen ließe.
