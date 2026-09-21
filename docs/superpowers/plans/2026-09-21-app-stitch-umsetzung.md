# Stitch-Umsetzung in der Albumwerk-App, Zyklus 1 — Umsetzungsplan

> **Für agentische Ausführende:** ERFORDERLICHE UNTER-SKILL:
> `superpowers:subagent-driven-development` (empfohlen) oder
> `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe
> umzusetzen. Die Schritte nutzen Kästchen (`- [ ]`) zur Nachverfolgung.

**Ziel:** Die Form der Stitch-Entwürfe in den elf öffentlichen und
Kundenseiten der App umsetzen, ohne sichtbaren Text, Farbwerte oder
Astryx-Bausteine anzufassen.

**Architektur:** Kein neuer Baustein, keine neue Schicht. Geändert werden
ausschließlich die StyleX-Regeln und die JSX-Struktur innerhalb der elf
Seitendateien. Davor steht ein Messstand aus vier Python-Proben, der vor der
ersten Seitenänderung eine Grundlinie schreibt; danach ist jede Abweichung in
Text, Überlauf, Kontrast oder Schriftgewicht ein Befund und keine
Geschmacksfrage.

**Tech-Stack:** React 18 + Vite + StyleX, `@astryxdesign/core`,
`@astryxdesign/theme-neutral`, PocketBase, Playwright (Node, für e2e) und
Playwright (Python, für den Messstand).

**Spec:** `docs/superpowers/specs/2026-09-19-app-stitch-umsetzung-design.md` —
der Plan argumentiert nicht gegen die Spec, die Spec reist mit ihm. Wer eine
Aufgabe ausführt, liest beide.

---

## Global Constraints

Diese Vorgaben gelten für **jede** Aufgabe, auch wo sie nicht wiederholt
werden. Werte wörtlich aus der Spec.

- **Kein sichtbarer Text aus Stitch.** Die Entwürfe tragen erfundene
  Beschriftungen. Der gebaute Text bleibt Wort für Wort, wie er ist.
- **Keine Änderungen an Astryx-Bausteinen oder am Theme-Paket.** Wo eine
  Struktur mit den vorhandenen Bausteinen nicht nachbaubar ist, wird sie
  angenähert und die Abweichung im Bericht festgehalten.
- **Keine Hex-Werte in Seiten.** Farben ausschließlich über
  `var(--color-*)`-Tokens.
- **Kein Tailwind-CDN, keine Google-Fonts-Einbindung, keine
  Material-Symbols-Icon-Schrift.** Alle drei stehen in jedem Stitch-Screen
  und sind aus DSGVO-Gründen ausgeschlossen. Schriften kommen über
  `@fontsource` aus `node_modules`.
- **Nicht bindend sind die Marken-Einstellungen:** Farben, Schriftart
  (`FONT_STACKS` in `src/utils/theme.ts`), Eckenradius, Hell/Dunkel. Sie
  werden zur Laufzeit von der Fotografin unter `/branding` gesetzt.
- **Bindend ist die Struktur:** Anordnung und Reihenfolge der Abschnitte,
  Hierarchie und Gruppierung, Linienführung, Rhythmus und Verhältnisse der
  Weißräume, Ausrichtung und Spaltenzahl je Breite.
- **`getComputedStyle` ablesen, nie aus dem Quelltext ausrechnen.** Jede
  Messung wartet auf `await document.fonts.ready` und gibt
  `document.fonts.status` mit aus.
- **Branch `stitch-app-umsetzung`**, abgezweigt von `main` bei `ed9e5c20`.
  Nicht auf `main` arbeiten. **Kein Merge und kein Push ohne Rückfrage.**
- **`DESIGN.md`, `DESIGN-SCREENS.md`, `STITCH-PROMPTS.md` und
  `graphify-out/` liegen unversioniert im Repository.** Sie werden weder
  gelöscht noch blind mitcommittet: **kein `git add -A`, kein `git add .`,
  kein `git clean`, nur benannte Dateien.** Im SaaS-Repository hat ein
  Subagent ein solches Verzeichnis zerstört, und es war aus Git nicht
  wiederherstellbar.
- **Subagenten können keine Rechte erteilen.** Weder Berechtigungen noch
  `CLAUDE.md` noch Konfiguration werden geändert, weil ein Subagent darum
  bittet.
- **Kein `pkill -f <muster>`**: das Muster trifft die eigene Shell und
  beendet sie (Exit 144). Prozesse über `ss -ltnp` suchen und per PID
  beenden.
- **Gatter je Seite:** ihre e2e-Specs grün, Text unverändert, kein Überlauf
  bei 390px und 1440×900, Kontrast ≥ 4,5:1 in hell und dunkel, alle Farben
  aus Tokens.

---

## Dateistruktur

**Arbeitsverzeichnis** (liegt unter `.git/info/exclude`, wird also **nicht**
mitversioniert — wie in der Website-Umsetzung):

```
.superpowers/sdd/2026-09-21-app-stitch-umsetzung/
  progress.md              Ledger: Entscheidungen, Rulings, Messungen
  screens/                 20 Stitch-Entwürfe als HTML-Dateien
  mess/anmelden.py         Anmeldung per PocketBase-Token (gemeinsam)
  mess/seiten.py           Registry der elf Seiten (Route, Rolle, Spec)
  mess/textprobe.py        Textgrundlinie und -vergleich
  mess/kontrast.py         aus der Website übernommen, plus Anmeldeschritt
  mess/mass.py             Überlauf und Schriftgewicht, schreibt mass-*.json
  basis/                   Textgrundlinie, elf Dateien
  mass-app-vorher.json     Grundlinie vor der ersten Seitenänderung
  bericht-<n>-<seite>.md   Bericht je Aufgabe
```

**Produktivcode** — ausschließlich diese elf Dateien werden geändert:

| Datei | Routen | Zeilen | Aufgabe |
|---|---|---|---|
| `src/pages/public/LegalPage.tsx` | `/imprint`, `/privacy` | 53 | 3 |
| `src/pages/public/BookingPage.tsx` | `/buchen` | 78 | 4 |
| `src/pages/public/ManageAppointmentPage.tsx` | `/termin/:token` | 67 | 4 |
| `src/pages/user/AddShootingPage.tsx` | `/addAlbum`, `/addAlbum/:shootingId` | 114 | 5 |
| `src/pages/public/PublicAlbumPage.tsx` | `/publicAlbum/:shootingId` | 121 | 6 |
| `src/pages/public/PublicDownloadsPage.tsx` | `/publicDownloads` | 120 | 6 |
| `src/pages/user/DownloadsPage.tsx` | `/downloads` | 122 | 7 |
| `src/pages/user/ProfilePage.tsx` | `/profile` | 225 | 8 |
| `src/pages/user/AlbumPage.tsx` | `/album` | 334 | 9 |
| `src/pages/user/PricingPage.tsx` | `/pricing` | 367 | 10 |
| `src/pages/user/SupportPage.tsx` | `/support` | 497 | 11 |

`DownloadsPage` und `ProfilePage` hängen in **beiden** Rollenbäumen
(`src/App.tsx:154/158` und `:182/198`). Die Aufgaben 7 und 8 prüfen deshalb
beide Rollen.

`src/pages/user/OrdersPage.tsx` und `OrderDetailsPage.tsx` liegen unter
`user/`, sind aber ausschließlich im Admin-Zweig eingehängt
(`src/App.tsx:183-184`). Sie gehören in Zyklus 3 und werden hier **nicht**
angefasst. Daran ist ein erster Entwurf der Spec gescheitert.

**Nicht angefasst:** `src/App.tsx`, `src/utils/theme.ts`, alles unter
`node_modules/@astryxdesign/`, alle Admin- und Auth-Seiten.

---

## Vorlauf

### Aufgabe 1: Die zwanzig Stitch-Entwürfe auf die Platte

**Warum als eigene Aufgabe:** Die HTML-Dokumente sind groß. Werden sie im
selben Kontext geholt, in dem später gearbeitet wird, verdrängen sie genau
das, was gebraucht wird. Sie werden einmal geholt, gespeichert und danach
gezielt gelesen.

**Dateien:**
- Anlegen: `.superpowers/sdd/2026-09-21-app-stitch-umsetzung/screens/*.html` (20 Dateien)

**Schnittstellen:**
- Erzeugt: die Dateinamen, die alle Aufgaben 3–11 lesen. Schema:
  `<slug>-desktop.html` und `<slug>-mobil.html` mit den Slugs
  `rechtstext`, `termin-buchen`, `termin-verwalten`, `album-hinzufuegen`,
  `oeffentliches-album`, `downloads`, `profil`, `meine-alben`,
  `bilder-kaufen`, `support`.

- [ ] **Schritt 1: Arbeitsverzeichnis anlegen**

```bash
cd /data/albumwerk
W=.superpowers/sdd/2026-09-21-app-stitch-umsetzung
mkdir -p $W/screens $W/mess $W/basis
```

- [ ] **Schritt 2: Die zwanzig Screens holen**

Projekt `13186504385365145016`. Je Zeile ein `mcp__stitch__get_screen` und
die Antwort als Datei speichern. Die Zuordnung Slug → ID:

| Slug | Desktop | Mobil |
|---|---|---|
| `rechtstext` | `6368bfa689834b4bab713f3e36f7e5b3` | `dd9c76d26efe4926a04fa5d3373e145a` |
| `termin-buchen` | `8a711b5cefde4a6f832fdd4861f8e661` | `d104c57455574ca09d8af7bbbe92f5ec` |
| `termin-verwalten` | `e6345755bd694be99e9b9204903cc43d` | `7e5c71bde2784df3a51a7993a39ebbda` |
| `album-hinzufuegen` | `7590eb6b76ac45e5a2be5a96098d3b4f` | `d09823dcc308422c9f5f3a72e768ff41` |
| `oeffentliches-album` | `6d146b60b674412991921991803da8ab` | `2682541daa764522a56b0c322e3ee8ae` |
| `downloads` | `e7ab6f3fd98847f69e9d14967182a159` | `94dd4960753941c889504e2317a4f6c2` |
| `profil` | `53b3a194cad34a97a58293fce705cf75` | `02186040652e47e3b26271809b6ed2b7` |
| `meine-alben` | `ee30a55760d1497dbb917a80c5e3ce1c` | `f4c6bdcc27a147c29aca8a080e232edb` |
| `bilder-kaufen` | `f31a41d93b064f6aba1c393f66de94d1` | `2586325b1b344372bd106c6f72c05003` |
| `support` | `2813500d237f42ebac0b2dc079f3f35e` | `6e522e163ed141c6ba0b386f22a26204` |

Für `PublicDownloadsPage` existiert **kein** Screen. Sie wird in Aufgabe 6
analog zu `downloads-*.html` mitgezogen — dieselbe Form, gelesen aus deren
Entwurf.

- [ ] **Schritt 3: Vollzähligkeit belegen**

Run: `ls .superpowers/sdd/2026-09-21-app-stitch-umsetzung/screens/ | wc -l`
Erwartet: `20`

Run: `find .superpowers/sdd/2026-09-21-app-stitch-umsetzung/screens -size -1k`
Erwartet: keine Ausgabe. Eine Datei unter 1 KB ist eine Fehlermeldung, kein
Entwurf — dann den Screen erneut holen.

- [ ] **Schritt 4: Kein Commit**

Das Arbeitsverzeichnis steht in `.git/info/exclude`. Nichts hinzufügen.
Belegen mit `git status --short` — die Ausgabe darf nur die bekannten vier
unverfolgten Einträge zeigen (`DESIGN.md`, `DESIGN-SCREENS.md`,
`STITCH-PROMPTS.md`, `graphify-out/`).

---

### Aufgabe 2: Messstand und Grundlinie

**Warum vor jeder Seitenänderung:** Ein Werkzeug, das erst nach der Änderung
entsteht, kann die Änderung nicht beurteilen. Und ein Wächter, den man nie
hat fehlschlagen sehen, ist kein Wächter — die Kontrastprobe der Website war
lange blind für SVG-Text und meldete trotzdem grün.

**Dateien:**
- Anlegen: `<W>/mess/anmelden.py`, `<W>/mess/seiten.py`,
  `<W>/mess/textprobe.py`, `<W>/mess/mass.py`
- Kopieren: `<W>/mess/kontrast.py` aus
  `/data/albumwerk-website/.superpowers/sdd/2026-09-17-website-stitch-umsetzung/kontrast.py`
- Erzeugen: `<W>/basis/*.txt` (elf Dateien), `<W>/mass-app-vorher.json`

**Schnittstellen:**
- Erzeugt für alle folgenden Aufgaben:
  - `anmelden.py`: `async def als_kundin(page) -> None` und
    `async def als_admin(page) -> None` — injizieren den
    PocketBase-Auth-Zustand vor dem ersten `goto`.
  - `seiten.py`: `SEITEN: list[Seite]` mit
    `Seite(slug: str, pfad: str, rolle: str, aufgabe: int)`;
    `rolle` ist `"oeffentlich"`, `"kundin"` oder `"beide"`.
  - `textprobe.py`: `grundlinie <basis-dir>` und `pruefen <basis-dir>`,
    Rückgabe 0 = grün.
  - `kontrast.py`: unverändert aufrufbar wie in der Website, plus
    `--anmelden` für die angemeldeten Seiten.
  - `mass.py`: `mass.py <ziel.json>` schreibt Überlauf und Schriftgewicht
    für alle Seiten × {390, 1440×900} × {hell, dunkel}.

- [ ] **Schritt 1: Grundlinie `make e2e` — muss grün sein, bevor irgendetwas angefasst wird**

```bash
cd /data/albumwerk
make dev          # bäckt die Dev-Instanz, App auf http://localhost:8091
make e2e
```

Erwartet: **40 bestanden, 1 Fehlschlag** — und zwar genau dieser eine:

```
e2e/tests/einstellungen/domain.spec.ts:117
"scheitert nur die Zustellung, heisst es nicht 'nicht gesendet'"
```

Dieser Fehlschlag ist bekannt, vorbestehend und liegt ausserhalb dieses
Plans. Er ist nachgemessen, nicht angenommen: der Test stubbt
`/api/custom/support/forward`, aber `DomainPage.tsx` ruft diesen Endpunkt
gar nicht mehr auf — sie importiert nur `createTicket, fetchTicket`
(`src/pages/admin/DomainPage.tsx:19`). Weitergeleitet wird seit
`a216c76d` (2026-09-02) serverseitig beim Anlegen der ersten Nachricht;
der Test stammt von `b0b557f3` (2026-09-01), einen Tag davor. Der Stub
greift also ins Leere. Kein Zweig dieses Plans kann das beeinflussen —
gestaltet werden Formen, nicht Weiterleitungslogik.

**Zeigt der Lauf genau diesen einen Fehlschlag, ist das Gatter offen.**
Ist irgendein *anderer* Test rot, endet die Aufgabe hier und der
Fehlschlag wird gemeldet — auf einem darüber hinaus roten Ausgangszustand
lässt sich keine Änderung beurteilen.

Der Lauf geht ausdrücklich gegen die gebackene Dev-Instanz auf `:8091`,
nicht gegen den Vite-Dev-Server.

- [ ] **Schritt 2: Die Anmeldung schreiben**

Die App nutzt den `LocalAuthStore` des PocketBase-SDK 0.21: Schlüssel
`pocketbase_auth`, Form `{ token, model }`. Genau so macht es die e2e-Fixture
(`e2e/support/fixtures.ts:47-57`) — der Messstand macht es nicht anders.

Datei `<W>/mess/anmelden.py`:

```python
"""Anmeldung fuer den Messstand — ueber die PocketBase-API, nicht ueber das
Formular. Der Login selbst hat einen eigenen e2e-Test; hier waere er nur
Umweg und zusaetzliche Fehlerquelle."""
import json
import urllib.request

BASIS = "http://localhost:8091"
KUNDIN = ("kunde@demo.test", "demo123456")
ADMIN = ("admin@demo.test", "demo123456")


def token(email: str, passwort: str) -> dict:
    daten = json.dumps({"identity": email, "password": passwort}).encode()
    req = urllib.request.Request(
        f"{BASIS}/api/collections/users/auth-with-password",
        data=daten,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as antwort:
        return json.loads(antwort.read())


def skript(email: str, passwort: str) -> str:
    """Der Init-Skripttext, der den PocketBase-Auth-Zustand setzt.

    Pythons `add_init_script` nimmt — anders als die JS-Fassung in
    `e2e/support/fixtures.ts` — **kein** Argument: die Signatur ist
    `add_init_script(script=None, *, path=None)`. Die woertliche Uebersetzung
    der TypeScript-Zeile scheitert darum mit
    `TypeError: Page.add_init_script() takes from 1 to 2 positional arguments
    but 3 were given`. Gemessen, nicht vermutet. Der Zustand wird stattdessen
    in den Skripttext hineinserialisiert — zweimal `json.dumps`, weil der
    innere Wert ein JS-Stringliteral werden muss.

    Gibt einen Text zurueck statt ihn selbst zu setzen, damit die synchrone
    kontrast.py denselben Weg nimmt wie die asynchronen Proben.
    """
    auth = token(email, passwort)
    zustand = json.dumps({"token": auth["token"], "model": auth["record"]})
    return "window.localStorage.setItem('pocketbase_auth', %s)" % json.dumps(zustand)


async def _anmelden(page, email: str, passwort: str) -> None:
    await page.add_init_script(skript(email, passwort))


async def als_kundin(page) -> None:
    await _anmelden(page, *KUNDIN)


async def als_admin(page) -> None:
    await _anmelden(page, *ADMIN)
```

- [ ] **Schritt 3: Belegen, dass die Anmeldung wirklich anmeldet**

Eine Anmeldung, die stillschweigend nichts tut, würde jede angemeldete Seite
als Anmeldeformular vermessen — und alle Proben blieben grün, weil das
Formular ja konsistent bleibt. Deshalb einmal beweisen:

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 - <<'PY'
import asyncio
from playwright.async_api import async_playwright
from anmelden import als_kundin

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        # ohne Anmeldung
        pg = await br.new_page()
        await pg.goto("http://localhost:8091/profile", wait_until="networkidle")
        print("ohne Anmeldung:", pg.url)
        # mit Anmeldung
        pg2 = await br.new_page()
        await als_kundin(pg2)
        await pg2.goto("http://localhost:8091/profile", wait_until="networkidle")
        print("mit  Anmeldung:", pg2.url)
        await br.close()
asyncio.run(main())
PY
```

Erwartet: die erste Zeile endet auf `/login`, die zweite auf `/profile`.
Sind beide gleich, ist die Anmeldung wirkungslos — **nicht weitermachen**,
sondern die Ursache suchen.

- [ ] **Schritt 4: Die Seiten-Registry schreiben**

`/termin/:token` und `/publicAlbum/:shootingId` brauchen echte Datensätze.
`demoshooting001` kommt aus dem Demo-Seed (`pb_hooks/lib/seeddemolib.js:9`);
der Termin-Token wird angelegt, weil der Seed keine Termine enthält.

Datei `<W>/mess/seiten.py`:

```python
"""Die elf Seiten des Zyklus 1, mit Route und Rolle.

Die Zuordnung folgt dem Routenbaum in src/App.tsx, nicht der
Verzeichnisstruktur: OrdersPage/OrderDetailsPage liegen unter user/, haengen
aber nur im Admin-Zweig und gehoeren deshalb NICHT hierher."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Seite:
    slug: str
    pfad: str
    rolle: str   # "oeffentlich" | "kundin" | "beide"
    aufgabe: int


SHOOTING = "demoshooting001"

SEITEN = [
    Seite("imprint",        "/imprint",                     "oeffentlich", 3),
    Seite("privacy",        "/privacy",                     "oeffentlich", 3),
    Seite("buchen",         "/buchen",                      "oeffentlich", 4),
    Seite("termin",         "/termin/{token}",              "oeffentlich", 4),
    Seite("addAlbum",       "/addAlbum",                    "oeffentlich", 5),
    Seite("publicAlbum",    f"/publicAlbum/{SHOOTING}",     "oeffentlich", 6),
    Seite("publicDownloads","/publicDownloads",             "oeffentlich", 6),
    Seite("downloads",      "/downloads",                   "beide",       7),
    Seite("profile",        "/profile",                     "beide",       8),
    Seite("album",          "/album",                       "kundin",      9),
    Seite("pricing",        "/pricing",                     "kundin",     10),
    Seite("support",        "/support",                     "kundin",     11),
]
```

- [ ] **Schritt 5: Den Termin-Token pruefen**

Ohne echten Termin zeigt `/termin/:token` nur den Fehlerzustand — messbar,
aber nicht die Form, um die es geht. Der Datensatz **ist bereits angelegt**;
dieser Schritt prueft ihn nur nach.

Drei Dinge, die ich beim Anlegen gemessen habe und die du nicht neu
herleiten musst:

1. `appointments.createRule` ist `null`. Ein direkter POST auf
   `/api/collections/appointments/records` scheitert mit
   `403 Only superusers can perform this action` — auch mit dem Token von
   `admin@demo.test`, der in der App Administrator ist. Termine entstehen
   ausschliesslich ueber `POST /api/custom/booking`.
2. `appointments.token` ist ein **verstecktes** Feld. Es kommt in keiner
   API-Antwort vor (`token: None`) und laesst sich nicht setzen: ein PATCH
   darauf antwortet `200`, ohne etwas zu aendern. Der Wert ist nur aus der
   Antwort der Buchung bekannt.
3. Damit ueberhaupt gebucht werden kann, mussten drei Dinge vorhanden sein,
   die in dieser Instanz gefehlt haben: `settings.bookingEnabled` (stand auf
   `false`), ein aktiver `appointmentTypes`-Datensatz und
   `availabilityRules`. Alle drei sind gesetzt.

Der Token lautet:

```
pXwdsP0Pe27DKUV6JieGVhxELFrPSfGFpN499KG4Qk
```

Das ist der echte, erzeugte Wert, kein Platzhalter — auch wenn er so
aussieht. Nachpruefen:

```bash
curl -s "http://localhost:8091/api/custom/booking/manage?token=pXwdsP0Pe27DKUV6JieGVhxELFrPSfGFpN499KG4Qk"
```

Erwartet: `"status":"ok"` und darin `"customerName":"Lena Demo"`,
`"typeName":"Portraitshooting"`. Kommt stattdessen
`Dieser Link ist nicht (mehr) gueltig.`, ist der Datensatz verschwunden —
dann neu buchen und den neuen Token ueberall eintragen:

```bash
curl -s -X POST "http://localhost:8091/api/custom/booking" \
  -H 'Content-Type: application/json' -d '{"type":"portrait",
  "start":"2026-09-23T09:00:00.000Z","name":"Lena Demo",
  "email":"kunde@demo.test","phone":"+49 170 1234567",
  "message":"Bitte einen Termin am Vormittag, danke!","consent":true}'
```

Danach in `seiten.py` `{token}` durch den Tokenwert ersetzen.

- [ ] **Schritt 6: Die Textprobe schreiben**

Sie ist die schärfste der vier: sie fängt genau den Fehler, den die harte
Grenze verbietet — Text aus Stitch, der in die App rutscht.

Datei `<W>/mess/textprobe.py`:

```python
"""Textgrundlinie der elf Seiten. Nach der Grundlinie ist jede
Textaenderung ein Fehler, bis sie begruendet ist."""
import asyncio, re, sys
from pathlib import Path
from playwright.async_api import async_playwright
from anmelden import BASIS, als_kundin
from seiten import SEITEN


async def text_von(page, pfad: str) -> str:
    await page.goto(BASIS + pfad, wait_until="networkidle")
    await page.evaluate("document.fonts.ready")
    roh = await page.inner_text("body")
    # Zeitstempel und IDs schwanken zwischen Laeufen und sind kein Text im
    # Sinne dieser Probe.
    roh = re.sub(r"\d{1,2}\.\d{1,2}\.\d{4}", "<datum>", roh)
    roh = re.sub(r"\d{1,2}:\d{2}(:\d{2})?", "<zeit>", roh)
    return "\n".join(z.strip() for z in roh.splitlines() if z.strip())


async def lauf(ziel: Path, schreiben: bool) -> int:
    fehler = []
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for s in SEITEN:
            pg = await br.new_page(viewport={"width": 1440, "height": 900})
            if s.rolle in ("kundin", "beide"):
                await als_kundin(pg)
            text = await text_von(pg, s.pfad)
            datei = ziel / f"{s.slug}.txt"
            if schreiben:
                datei.write_text(text, encoding="utf-8")
            else:
                alt = datei.read_text(encoding="utf-8")
                if alt != text:
                    fehler.append(s.slug)
            await pg.close()
        await br.close()
    if schreiben:
        print(f"Grundlinie geschrieben: {len(SEITEN)} Routen.")
        return 0
    if fehler:
        print("Textprobe ROT — geaendert:", ", ".join(fehler))
        return 1
    print(f"Textprobe gruen: {len(SEITEN)} Routen unveraendert.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("grundlinie", "pruefen"):
        print(__doc__); print("Aufruf: textprobe.py grundlinie|pruefen <basis-dir>")
        sys.exit(2)
    ziel = Path(sys.argv[2]); ziel.mkdir(parents=True, exist_ok=True)
    sys.exit(asyncio.run(lauf(ziel, sys.argv[1] == "grundlinie")))
```

- [ ] **Schritt 7: Grundlinie schreiben und die Probe rot zeigen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py grundlinie ../basis
python3 textprobe.py pruefen ../basis          # Erwartet: gruen, 12 Routen
echo "SCHROTT" >> ../basis/imprint.txt
python3 textprobe.py pruefen ../basis          # Erwartet: ROT, nennt imprint
python3 textprobe.py grundlinie ../basis       # zuruecksetzen
python3 textprobe.py pruefen ../basis          # Erwartet: wieder gruen
```

Der rote Lauf **muss** gesehen worden sein. Das Ergebnis aller fünf Aufrufe
gehört in den Bericht.

- [ ] **Schritt 8: Die Kontrastprobe übernehmen**

Sie wird **unverändert** kopiert und **nur** um den Anmeldeschritt
erweitert. Sie kennt bereits SVG-Text über `fill` und moderne Farbformen wie
`color(srgb …)`; beides darf nicht „vereinfacht" zurückgebaut werden.

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
cp /data/albumwerk-website/.superpowers/sdd/2026-09-17-website-stitch-umsetzung/kontrast.py .
```

Dann die eine Änderung: vor dem `goto` der angemeldeten Seiten
`await als_kundin(page)` aufrufen. Die Stelle finden mit
`grep -n "goto" kontrast.py`. Keine weitere Zeile anfassen.

`kontrast.py` erwartet die Pfade als Argumente — **ohne sie bricht es mit
Rückgabe 2 ab und druckt nur seinen Docstring.** Damit die Liste nicht an
zehn Stellen im Plan abgeschrieben wird, steht sie einmal in einer Datei:

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 -c "from seiten import SEITEN; print('\n'.join(s.pfad for s in SEITEN))" > routen.txt
wc -l routen.txt    # Erwartet: 12
```

Alle folgenden Aufrufe lauten
`python3 kontrast.py http://localhost:8091 $(cat routen.txt)`.

- [ ] **Schritt 9: Die Kontrastprobe rot zeigen**

```bash
python3 kontrast.py http://localhost:8091 $(cat routen.txt)   # Erwartet: gruen, Paarzahl notieren
```

Dann den Schwellwert im Skript kurzzeitig von `4.5` auf `21` setzen, erneut
laufen lassen (muss rot werden und Paare nennen), zurücksetzen, erneut grün.
Beide Zahlen in den Bericht.

- [ ] **Schritt 10: Überlauf und Schriftgewicht messen**

`document.fonts.check('600 16px X')` meldet auch dann `true`, wenn nur 400
geladen ist. Deshalb wird der Fettschnitt über Vorschubbreiten geprüft.

Datei `<W>/mess/mass.py`:

```python
"""Ueberlauf und Schriftgewicht je Seite, Breite und Farbschema."""
import asyncio, json, sys
from playwright.async_api import async_playwright
from anmelden import BASIS, als_kundin
from seiten import SEITEN

BREITEN = [("mobil", 390, 844), ("desktop", 1440, 900)]
SCHEMATA = ["light", "dark"]

# Vorschubbreite desselben Texts in mehreren Gewichten. Sind 400 und 700
# gleich breit, ist der Fettschnitt nicht geladen und der Browser faelscht
# ihn oder ignoriert ihn.
GEWICHTE = """() => {
  const probe = 'Hamburgefonstiv 0123456789';
  const fam = getComputedStyle(document.body).fontFamily;
  const c = document.createElement('canvas').getContext('2d');
  const out = {};
  for (const w of [400, 500, 600, 700]) {
    c.font = `${w} 16px ${fam}`;
    out[w] = Math.round(c.measureText(probe).width * 100) / 100;
  }
  return { familie: fam, status: document.fonts.status, breiten: out };
}"""


async def main(ziel: str) -> int:
    ergebnis = {}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for name, w, h in BREITEN:
            for schema in SCHEMATA:
                ctx = await br.new_context(viewport={"width": w, "height": h},
                                           color_scheme=schema)
                for s in SEITEN:
                    pg = await ctx.new_page()
                    if s.rolle in ("kundin", "beide"):
                        await als_kundin(pg)
                    await pg.goto(BASIS + s.pfad, wait_until="networkidle")
                    await pg.evaluate("document.fonts.ready")
                    mass = await pg.evaluate("""() => ({
                        scrollWidth: document.documentElement.scrollWidth,
                        clientWidth: document.documentElement.clientWidth,
                        scrollHeight: document.body.scrollHeight,
                    })""")
                    mass.update(await pg.evaluate(GEWICHTE))
                    mass["ueberlauf"] = mass["scrollWidth"] > mass["clientWidth"]
                    ergebnis[f"{s.slug}|{name}|{schema}"] = mass
                    await pg.close()
                await ctx.close()
        await br.close()
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(ergebnis, f, indent=1, ensure_ascii=False, sort_keys=True)
    ueberlauf = [k for k, v in ergebnis.items() if v["ueberlauf"]]
    print(f"{len(ergebnis)} Messungen nach {ziel}.")
    print("Ueberlauf:", ", ".join(ueberlauf) if ueberlauf else "keiner")
    return 1 if ueberlauf else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); print("Aufruf: mass.py <ziel.json>"); sys.exit(2)
    sys.exit(asyncio.run(main(sys.argv[1])))
```

- [ ] **Schritt 11: Die Überlaufprobe rot zeigen und die Grundlinie schreiben**

```bash
python3 mass.py ../mass-app-vorher.json
```

Erwartet: 48 Messungen (12 Routen × 2 Breiten × 2 Schemata), `Ueberlauf:
keiner`. Meldet sie schon jetzt Überlauf, ist das ein Befund des
Ausgangszustands und gehört in den Bericht, nicht stillschweigend weg.

Dann den Nachweis, dass die Probe beißt: in der Konsole einer Seite
`document.body.style.width = '3000px'` setzen lässt sich hier nicht
persistieren — stattdessen `BREITEN` kurzzeitig auf `[("winzig", 200, 800)]`
setzen, laufen lassen (**muss** Überlauf melden), zurücksetzen.

---

## Umsetzung

Die Aufgaben 3 bis 11 haben denselben Ablauf. Er steht hier einmal
vollständig; jede Aufgabe nennt darunter ihre eigenen Dateien, Screens,
Routen und Specs. **Die Befehle in den Aufgaben sind vollständig — es ist
nichts einzusetzen.**

### Ablauf je Seitenaufgabe

1. **Entwurf lesen.** Desktop- und Mobil-Screen aus `<W>/screens/`. Nicht
   den ganzen Text — die Struktur: Abschnittsfolge, Gruppierung, Linien,
   Weißraumverhältnisse, Spaltenzahl je Breite.
2. **Ist-Zustand messen**, bevor etwas geändert wird. Ohne Messung vorher
   ist nach der Änderung nicht belegbar, dass die Änderung es war.
3. **Formunterschiede aufschreiben** — vor dem Ändern, als Liste. Je
   Unterschied: übernehmen oder nicht, und warum nicht.
4. **Übernehmen, soweit die Astryx-Bausteine reichen.** Kein neuer
   Baustein, kein Hex-Wert, kein Text aus dem Entwurf.
5. **Messen**: Textprobe, Kontrastprobe, `mass.py` gegen eine eigene
   Nachher-Datei.
6. **Die e2e-Specs der Seite laufen lassen.**
7. **Bericht schreiben** nach `<W>/bericht-<n>-<slug>.md`: Unterschiede,
   Übernommenes, bewusst **nicht** Übernommenes mit Grund, alle Messungen
   vorher/nachher. Eine Abweichung ohne Begründung ist ein Fehler, eine
   begründete ist eine Entscheidung.
8. **Commit** mit benannten Dateien. Der Commit-Text sagt, was gemessen
   wurde, nicht was beabsichtigt war. Jeder Commit endet mit:
   `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
9. **Eigenes Review je Aufgabe.**

### Wo das Netz Löcher hat

Fünf der elf Seiten werden von **keinem** e2e-Spec aufgerufen: `/buchen`,
`/termin/:token`, `/addAlbum`, `/publicDownloads` und `/privacy`. Für sie ist
das Gatter allein der Messstand plus Review plus Sichtprüfung. Das steht
hier, statt sich hinter „`make e2e` ist grün" zu verstecken.

Auch das vollständige Netz fängt nicht alles: die Specs klicken Abläufe. Eine
Strukturänderung, die einen Knopf an eine andere Stelle setzt, ohne ihn zu
zerstören, läuft grün durch. Gefangen wird sie nur durch das Review je
Aufgabe und die Sichtprüfung am Ende.

---

### Aufgabe 3: LegalPage — Impressum und Datenschutz

**Dateien:**
- Ändern: `src/pages/public/LegalPage.tsx` (53 Zeilen)
- Entwürfe: `<W>/screens/rechtstext-desktop.html`, `rechtstext-mobil.html`
- Bericht: `<W>/bericht-3-legal.md`

**Schnittstellen:**
- Nutzt: `useSettings()` aus `src/context/SettingsContext`, die Bausteine
  `Heading`, `Text`, `Link` aus `@astryxdesign/core`, und die Klasse
  `rich-text` für den gesäuberten HTML-Block.
- Erzeugt: nichts, was spätere Aufgaben brauchen. Die Seite ist bewusst die
  erste: 53 Zeilen, zwei Routen, ein e2e-Spec — der billigste Ort, um den
  Ablauf einzuschleifen.

**Besonderheit:** Der Inhalt ist von der Fotografin gepflegtes HTML, durch
`DOMPurify` gesäubert und über `dangerouslySetInnerHTML` gesetzt. Die
Struktur **innerhalb** des `rich-text`-Blocks gehört nicht der App. Änderbar
ist der Rahmen: Container, Karte, Überschrift, Rückverweis.

- [ ] **Schritt 1: Beide Entwürfe lesen und die Unterschiede notieren**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung
wc -c screens/rechtstext-desktop.html screens/rechtstext-mobil.html
```

Die Liste der Formunterschiede in `bericht-3-legal.md` anlegen, bevor eine
Zeile Code geändert wird.

- [ ] **Schritt 2: Ist-Zustand messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-3-vorher.json
```

- [ ] **Schritt 3: Den e2e-Spec der Seite vorher laufen lassen**

```bash
cd /data/albumwerk
make e2e ARGS="e2e/tests/einstellungen/rechtstexte.spec.ts"
```

Erwartet: grün. Damit steht fest, dass ein späteres Rot von der Änderung
kommt.

- [ ] **Schritt 4: Struktur übernehmen**

`src/pages/public/LegalPage.tsx` ändern. Erlaubt sind Änderungen an
`stylex.create(...)` und an der JSX-Struktur. Nicht erlaubt: die Texte
`"Impressum"`, `"Datenschutzerklärung"`, `"Diese Seite wurde noch nicht
ausgefüllt."`, `"Zurück zur Anmeldung"`; neue Farbwerte; neue Bausteine.

- [ ] **Schritt 5: Messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-3-nachher.json
```

Erwartet: Textprobe grün („12 Routen unveraendert"), Kontrast grün mit
derselben Paarzahl-Größenordnung wie in Aufgabe 2, `mass.py` ohne Überlauf.
Eine **kleinere** Kontrast-Paarzahl heißt, dass Seiten aus dem Lauf gefallen
sind — dann ist der Lauf ungültig, nicht grün.

- [ ] **Schritt 6: Den e2e-Spec nachher laufen lassen**

```bash
cd /data/albumwerk
make e2e ARGS="e2e/tests/einstellungen/rechtstexte.spec.ts"
```

Erwartet: grün.

- [ ] **Schritt 7: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/public/LegalPage.tsx
git commit -F - <<'MSG'
Rechtstextseiten auf die Form des Entwurfs

<was gemessen wurde: Abschnittsfolge, Weissraumverhaeltnisse, Spaltenzahl>
<bewusst nicht uebernommen: ... weil ...>

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf bei 390 und
1440. rechtstexte.spec.ts gruen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Aufgabe 4: BookingPage und ManageAppointmentPage — derselbe Terminfluss

**Dateien:**
- Ändern: `src/pages/public/BookingPage.tsx` (78 Zeilen),
  `src/pages/public/ManageAppointmentPage.tsx` (67 Zeilen)
- Entwürfe: `<W>/screens/termin-buchen-{desktop,mobil}.html`,
  `<W>/screens/termin-verwalten-{desktop,mobil}.html`
- Bericht: `<W>/bericht-4-termin.md`

**Schnittstellen:**
- Nutzt: `ManageView` aus `src/features/Booking/ManageView`,
  `settingsFileUrl` aus `src/config/settings`, `useSettings()`,
  `useParams()` aus `react-router-dom`.
- Erzeugt: nichts für spätere Aufgaben.

**Besonderheit:** `ManageAppointmentPage` ist bewusst ohne Anmeldung und
**ohne den Layout-Rahmen der App** gebaut (Kommentar in der Datei): wer dort
landet, kommt aus einer E-Mail und will absagen oder verschieben. Diese
Entscheidung bleibt — der Entwurf darf sie nicht kassieren. Die eigentliche
Terminlogik liegt in `ManageView`, einem Feature-Baustein; er wird **nicht**
geändert, nur sein Rahmen.

**Beide Seiten haben keinen e2e-Spec.** Gatter ist hier allein Messstand,
Review und Sichtprüfung.

- [ ] **Schritt 1: Entwürfe lesen, Unterschiede je Seite getrennt notieren**

Zwei Seiten, zwei Listen in `bericht-4-termin.md`. Sie teilen einen Fluss,
nicht ihre Form.

- [ ] **Schritt 2: Ist-Zustand messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-4-vorher.json
```

- [ ] **Schritt 3: Sichtprüfung vorher festhalten**

Ohne e2e-Netz ist das Bild der einzige Zeuge:

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 - <<'PY'
import asyncio
from playwright.async_api import async_playwright
from anmelden import BASIS

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for pfad, name in [("/buchen", "buchen"),
                           ("/termin/pXwdsP0Pe27DKUV6JieGVhxELFrPSfGFpN499KG4Qk", "termin")]:
            for w, h, br_name in [(390, 844, "mobil"), (1440, 900, "desktop")]:
                pg = await br.new_page(viewport={"width": w, "height": h})
                await pg.goto(BASIS + pfad, wait_until="networkidle")
                await pg.evaluate("document.fonts.ready")
                await pg.screenshot(path=f"../bild-4-{name}-{br_name}-vorher.png",
                                    full_page=True)
                await pg.close()
        await br.close()
asyncio.run(main())
PY
```

- [ ] **Schritt 4: Struktur übernehmen**

Beide Dateien. `ManageView` bleibt unangetastet — auch dann, wenn der
Entwurf innen anders aussieht. Passt eine Struktur nur durch eine Änderung
an `ManageView`, wird sie **nicht** übernommen und die Abweichung
aufgeschrieben.

- [ ] **Schritt 5: Messen und Bilder nachher**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-4-nachher.json
```

Dann das Skript aus Schritt 3 erneut, mit `-nachher` statt `-vorher` im
Dateinamen. Die vier Bildpaare gehören nebeneinander in den Bericht.

- [ ] **Schritt 6: Vollen e2e-Lauf, weil kein gezielter Spec existiert**

```bash
cd /data/albumwerk
make e2e
```

Erwartet: grün. Die Seiten selbst deckt er nicht ab — er belegt, dass die
Änderung nichts anderes zerbrochen hat.

- [ ] **Schritt 7: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/public/BookingPage.tsx src/pages/public/ManageAppointmentPage.tsx
git commit -F - <<'MSG'
Terminseiten auf die Form der Entwuerfe

<Unterschiede je Seite, uebernommen und nicht uebernommen mit Grund>
<ManageView unveraendert: der rahmenlose Aufbau ist eine Entscheidung
 (Kommentar in der Datei), keine Luecke>

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf. Kein
gezielter e2e-Spec vorhanden; voller Lauf gruen, Sichtpruefung im Bericht.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Aufgabe 5: AddShootingPage

**Dateien:**
- Ändern: `src/pages/user/AddShootingPage.tsx` (114 Zeilen)
- Entwürfe: `<W>/screens/album-hinzufuegen-{desktop,mobil}.html`
- Bericht: `<W>/bericht-5-addalbum.md`

**Schnittstellen:**
- Bedient zwei Routen: `/addAlbum` und `/addAlbum/:shootingId`. Beide
  müssen nach der Änderung gemessen werden — die zweite Route rendert einen
  anderen Zustand.

**Kein e2e-Spec.** Gatter: Messstand, Review, Sichtprüfung.

- [ ] **Schritt 1: Entwürfe lesen, Unterschiede notieren**

- [ ] **Schritt 2: Ist-Zustand messen, beide Routen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-5-vorher.json
python3 - <<'PY'
import asyncio
from playwright.async_api import async_playwright
from anmelden import BASIS
from seiten import SHOOTING

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for w, h, n in [(390, 844, "mobil"), (1440, 900, "desktop")]:
            pg = await br.new_page(viewport={"width": w, "height": h})
            await pg.goto(f"{BASIS}/addAlbum/{SHOOTING}", wait_until="networkidle")
            await pg.evaluate("document.fonts.ready")
            d = await pg.evaluate("""() => ({
                sw: document.documentElement.scrollWidth,
                cw: document.documentElement.clientWidth })""")
            print(n, "mit shootingId:", d, "Ueberlauf:", d["sw"] > d["cw"])
            await pg.close()
        await br.close()
asyncio.run(main())
PY
```

- [ ] **Schritt 3: Struktur übernehmen**

- [ ] **Schritt 4: Messen, beide Routen**

Die Befehle aus Schritt 2 erneut, Ziel `../mass-5-nachher.json`, dazu:

```bash
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
```

- [ ] **Schritt 5: Voller e2e-Lauf**

```bash
cd /data/albumwerk && make e2e
```

- [ ] **Schritt 6: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/user/AddShootingPage.tsx
git commit -F - <<'MSG'
Album-Hinzufuegen auf die Form des Entwurfs

<Unterschiede, uebernommen und nicht uebernommen mit Grund>
Beide Routen gemessen: /addAlbum und /addAlbum/demoshooting001.

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf. Kein
gezielter e2e-Spec; voller Lauf gruen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Aufgabe 6: PublicAlbumPage und PublicDownloadsPage — beide Share-Link-Ziele

**Dateien:**
- Ändern: `src/pages/public/PublicAlbumPage.tsx` (121 Zeilen),
  `src/pages/public/PublicDownloadsPage.tsx` (120 Zeilen)
- Entwürfe: `<W>/screens/oeffentliches-album-{desktop,mobil}.html`;
  für `PublicDownloadsPage` **kein eigener Screen** —
  `<W>/screens/downloads-{desktop,mobil}.html` als Vorlage lesen
- Bericht: `<W>/bericht-6-public.md`

**Schnittstellen:**
- `PublicDownloadsPage` und `DownloadsPage` (Aufgabe 7) zeigen dieselbe
  Sache für verschiedene Rollen. Was hier an Form entschieden wird, legt
  Aufgabe 7 fest — und umgekehrt. Die Entscheidung fällt **hier** und wird
  im Bericht so benannt, dass Aufgabe 7 sie übernehmen kann, statt sie neu
  zu erfinden.

**Nur `PublicAlbumPage` hat einen e2e-Spec**
(`e2e/tests/kunde/oeffentliches-album.spec.ts`). `/publicDownloads` hat
keinen.

- [ ] **Schritt 1: Entwürfe lesen; die Ableitung für `PublicDownloadsPage` begründen**

In `bericht-6-public.md` festhalten, **welche** Form aus dem
Downloads-Entwurf übernommen wird und was an der öffentlichen Variante
anders bleiben muss (keine Anmeldung, kein Rollenmenü).

- [ ] **Schritt 2: Ist-Zustand messen und Spec vorher**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-6-vorher.json
cd /data/albumwerk
make e2e ARGS="e2e/tests/kunde/oeffentliches-album.spec.ts"
```

- [ ] **Schritt 3: Struktur übernehmen, beide Dateien**

- [ ] **Schritt 4: Messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-6-nachher.json
```

- [ ] **Schritt 5: Spec nachher und voller Lauf**

```bash
cd /data/albumwerk
make e2e ARGS="e2e/tests/kunde/oeffentliches-album.spec.ts"
make e2e
```

- [ ] **Schritt 6: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/public/PublicAlbumPage.tsx src/pages/public/PublicDownloadsPage.tsx
git commit -F - <<'MSG'
Oeffentliches Album und oeffentliche Downloads auf die Form der Entwuerfe

<Unterschiede mit Grund>
PublicDownloadsPage hat keinen eigenen Entwurf und folgt dem
Downloads-Entwurf; die Ableitung steht im Bericht.

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf.
oeffentliches-album.spec.ts gruen, voller e2e-Lauf gruen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Aufgabe 7: DownloadsPage — beide Rollen prüfen

**Dateien:**
- Ändern: `src/pages/user/DownloadsPage.tsx` (122 Zeilen)
- Entwürfe: `<W>/screens/downloads-{desktop,mobil}.html`
- Bericht: `<W>/bericht-7-downloads.md`

**Schnittstellen:**
- Nutzt die Formentscheidung aus Aufgabe 6 (`PublicDownloadsPage`). Weicht
  diese Seite davon ab, ist das eine Entscheidung mit Begründung, keine
  Unachtsamkeit.
- **Die Seite hängt in beiden Rollenbäumen** (`src/App.tsx:154/158` und
  `:182/198`). Eine Änderung verändert auch die Admin-Ansicht.

- [ ] **Schritt 1: Entwürfe lesen, Unterschiede notieren**

- [ ] **Schritt 2: Ist-Zustand in beiden Rollen messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 - <<'PY'
import asyncio
from playwright.async_api import async_playwright
from anmelden import BASIS, als_kundin, als_admin

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for rolle, anmelden in [("kundin", als_kundin), ("admin", als_admin)]:
            for w, h, n in [(390, 844, "mobil"), (1440, 900, "desktop")]:
                pg = await br.new_page(viewport={"width": w, "height": h})
                await anmelden(pg)
                await pg.goto(BASIS + "/downloads", wait_until="networkidle")
                await pg.evaluate("document.fonts.ready")
                d = await pg.evaluate("""() => ({
                    sw: document.documentElement.scrollWidth,
                    cw: document.documentElement.clientWidth,
                    text: document.body.innerText.length })""")
                print(f"{rolle:<7} {n:<8} {d} Ueberlauf: {d['sw'] > d['cw']}")
                await pg.close()
        await br.close()
asyncio.run(main())
PY
cd /data/albumwerk && make e2e ARGS="e2e/tests/kunde/downloads.spec.ts"
```

Die vier Zeilen vorher notieren — sie sind der Vergleichswert.

- [ ] **Schritt 3: Struktur übernehmen**

- [ ] **Schritt 4: Messen, beide Rollen**

Das Skript aus Schritt 2 erneut, dazu:

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-7-nachher.json
```

- [ ] **Schritt 5: Specs nachher — Kunden- und Admin-Seite**

```bash
cd /data/albumwerk
make e2e ARGS="e2e/tests/kunde/downloads.spec.ts"
make e2e
```

Der volle Lauf ist hier **nicht** optional: er ist das Einzige, was die
Admin-Ansicht der Seite abdeckt.

- [ ] **Schritt 6: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/user/DownloadsPage.tsx
git commit -F - <<'MSG'
Downloads auf die Form des Entwurfs, beide Rollen gemessen

<Unterschiede mit Grund>
In beiden Rollenbaeumen eingehaengt (App.tsx:154/158 und :182/198);
Messung als Kundin und als Admin im Bericht.

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf.
downloads.spec.ts gruen, voller e2e-Lauf gruen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Aufgabe 8: ProfilePage — beide Rollen prüfen

**Dateien:**
- Ändern: `src/pages/user/ProfilePage.tsx` (225 Zeilen)
- Entwürfe: `<W>/screens/profil-{desktop,mobil}.html`
- Bericht: `<W>/bericht-8-profil.md`

**Schnittstellen:**
- **Auch diese Seite hängt in beiden Rollenbäumen.** Gleiche Behandlung wie
  Aufgabe 7: als Kundin und als Admin messen.
- Deckender Spec: `e2e/tests/kunde/konto.spec.ts`.

- [ ] **Schritt 1: Entwürfe lesen, Unterschiede notieren**

- [ ] **Schritt 2: Ist-Zustand in beiden Rollen messen**

Das Skript aus Aufgabe 7, Schritt 2, mit `/profile` statt `/downloads`.
Dazu:

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-8-vorher.json
cd /data/albumwerk && make e2e ARGS="e2e/tests/kunde/konto.spec.ts"
```

- [ ] **Schritt 3: Struktur übernehmen**

- [ ] **Schritt 4: Messen, beide Rollen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-8-nachher.json
```

- [ ] **Schritt 5: Specs nachher**

```bash
cd /data/albumwerk
make e2e ARGS="e2e/tests/kunde/konto.spec.ts"
make e2e
```

- [ ] **Schritt 6: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/user/ProfilePage.tsx
git commit -F - <<'MSG'
Profil auf die Form des Entwurfs, beide Rollen gemessen

<Unterschiede mit Grund>

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf.
konto.spec.ts gruen, voller e2e-Lauf gruen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Aufgabe 9: AlbumPage

**Dateien:**
- Ändern: `src/pages/user/AlbumPage.tsx` (334 Zeilen)
- Entwürfe: `<W>/screens/meine-alben-{desktop,mobil}.html`
- Bericht: `<W>/bericht-9-album.md`

**Schnittstellen:**
- Die am dichtesten getestete Seite des Zyklus — **drei** Specs:
  `e2e/tests/kunde/album-oeffnen.spec.ts`, `bestellen.spec.ts`,
  `bilder-auswaehlen.spec.ts`. Alle drei vorher und nachher.
- Ab hier sind die Dateien groß genug, dass die Änderung in mehreren
  Durchgängen sinnvoll ist: erst die Abschnittsfolge, dann das Bildraster,
  dann die Weißräume — mit einer Messung dazwischen, damit ein Befund
  zuordenbar bleibt.

- [ ] **Schritt 1: Entwürfe lesen, Unterschiede notieren**

- [ ] **Schritt 2: Ist-Zustand messen und alle drei Specs vorher**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-9-vorher.json
cd /data/albumwerk
make e2e ARGS="e2e/tests/kunde/album-oeffnen.spec.ts e2e/tests/kunde/bestellen.spec.ts e2e/tests/kunde/bilder-auswaehlen.spec.ts"
```

- [ ] **Schritt 3: Abschnittsfolge und Gruppierung übernehmen, dann messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-9-zwischen.json
python3 textprobe.py pruefen ../basis
```

- [ ] **Schritt 4: Bildraster und Weißräume übernehmen**

- [ ] **Schritt 5: Messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-9-nachher.json
```

- [ ] **Schritt 6: Alle drei Specs nachher, dann voller Lauf**

```bash
cd /data/albumwerk
make e2e ARGS="e2e/tests/kunde/album-oeffnen.spec.ts e2e/tests/kunde/bestellen.spec.ts e2e/tests/kunde/bilder-auswaehlen.spec.ts"
make e2e
```

- [ ] **Schritt 7: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/user/AlbumPage.tsx
git commit -F - <<'MSG'
Meine Alben auf die Form des Entwurfs

<Unterschiede mit Grund, Abschnittsfolge und Bildraster getrennt>

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf.
album-oeffnen, bestellen, bilder-auswaehlen gruen, voller e2e-Lauf gruen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Aufgabe 10: PricingPage

**Dateien:**
- Ändern: `src/pages/user/PricingPage.tsx` (367 Zeilen)
- Entwürfe: `<W>/screens/bilder-kaufen-{desktop,mobil}.html`
- Bericht: `<W>/bericht-10-pricing.md`

**Schnittstellen:**
- Deckender Spec: `e2e/tests/einstellungen/preise.spec.ts`. Er läuft im
  Projekt `einstellungen`, das **seriell und zuletzt** läuft, weil es den
  globalen Settings-Record anfasst. Ein gezielter Aufruf ist erlaubt; der
  volle Lauf muss danach trotzdem einmal durch.

- [ ] **Schritt 1: Entwürfe lesen, Unterschiede notieren**

- [ ] **Schritt 2: Ist-Zustand messen und Spec vorher**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-10-vorher.json
cd /data/albumwerk && make e2e ARGS="e2e/tests/einstellungen/preise.spec.ts"
```

- [ ] **Schritt 3: Struktur übernehmen**

Preise sind Zahlen in Auszeichnungsschrift — genau die Rolle, die
`DESIGN.md` mit `Martian Mono`, 12px, Tracking 0 belegt. Was davon über die
Astryx-Bausteine erreichbar ist, wird übernommen; was eine Änderung am
Baustein verlangte, wird **nicht** übernommen und aufgeschrieben.

- [ ] **Schritt 4: Messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-10-nachher.json
```

- [ ] **Schritt 5: Spec nachher und voller Lauf**

```bash
cd /data/albumwerk
make e2e ARGS="e2e/tests/einstellungen/preise.spec.ts"
make e2e
```

- [ ] **Schritt 6: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/user/PricingPage.tsx
git commit -F - <<'MSG'
Bilder kaufen auf die Form des Entwurfs

<Unterschiede mit Grund>

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf.
preise.spec.ts gruen, voller e2e-Lauf gruen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Aufgabe 11: SupportPage

**Dateien:**
- Ändern: `src/pages/user/SupportPage.tsx` (497 Zeilen)
- Entwürfe: `<W>/screens/support-{desktop,mobil}.html`
- Bericht: `<W>/bericht-11-support.md`

**Schnittstellen:**
- Die größte Datei des Zyklus. Deckender Spec:
  `e2e/tests/kunde/hilfe-anfordern.spec.ts`.
- Zusätzlich betroffen: `e2e/tests/kunde/hilfe-bilder.spec.ts` und
  `hilfe-oeffentlich.spec.ts` liegen im selben Themenkreis. Sie decken die
  Hilfe-Artikel ab, nicht diese Seite — aber sie laufen im vollen Lauf mit
  und sind das Frühwarnsystem für Aufgabe 13.

- [ ] **Schritt 1: Entwürfe lesen, Unterschiede notieren**

Bei 497 Zeilen die Liste nach Abschnitten gliedern, sonst ist sie nicht
abarbeitbar.

- [ ] **Schritt 2: Ist-Zustand messen und Spec vorher**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-11-vorher.json
cd /data/albumwerk && make e2e ARGS="e2e/tests/kunde/hilfe-anfordern.spec.ts"
```

- [ ] **Schritt 3: Abschnittsfolge übernehmen, dann messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 mass.py ../mass-11-zwischen.json
python3 textprobe.py pruefen ../basis
```

- [ ] **Schritt 4: Formular und Weißräume übernehmen**

- [ ] **Schritt 5: Messen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-11-nachher.json
```

- [ ] **Schritt 6: Spec nachher und voller Lauf**

```bash
cd /data/albumwerk
make e2e ARGS="e2e/tests/kunde/hilfe-anfordern.spec.ts"
make e2e
```

- [ ] **Schritt 7: Bericht und Commit**

```bash
cd /data/albumwerk
git add src/pages/user/SupportPage.tsx
git commit -F - <<'MSG'
Support auf die Form des Entwurfs

<Unterschiede mit Grund, nach Abschnitten gegliedert>

Textprobe gruen (12 Routen), Kontrast gruen, kein Ueberlauf.
hilfe-anfordern.spec.ts gruen, voller e2e-Lauf gruen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Abschluss

### Aufgabe 12: Abnahme gegen die Grundlinie

**Dateien:**
- Erzeugen: `<W>/mass-app-nachher.json`, `<W>/abnahme.md`
- Ändern: keine

- [ ] **Schritt 1: Alle vier Proben über alle elf Seiten**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 textprobe.py pruefen ../basis
python3 kontrast.py http://localhost:8091 $(cat routen.txt)
python3 mass.py ../mass-app-nachher.json
cd /data/albumwerk && make e2e
```

Erwartet: Textprobe „12 Routen unveraendert", Kontrast grün mit der
Paarzahl aus Aufgabe 2 oder größer, `mass.py` mit 48 Messungen und
`Ueberlauf: keiner`, `make e2e` vollständig grün.

- [ ] **Schritt 2: Grundlinie gegen Endstand stellen**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung
python3 - <<'PY'
import json
vorher = json.load(open("mass-app-vorher.json"))
nachher = json.load(open("mass-app-nachher.json"))
print(f"{'Messung':<34} {'Hoehe vorher':>12} {'nachher':>9} {'Delta':>8}")
for k in sorted(vorher):
    v, n = vorher[k], nachher.get(k)
    if n is None:
        print(f"{k:<34} FEHLT im Endstand"); continue
    d = n["scrollHeight"] - v["scrollHeight"]
    if abs(d) > 4 or n["ueberlauf"] != v["ueberlauf"]:
        print(f"{k:<34} {v['scrollHeight']:>12} {n['scrollHeight']:>9} {d:>+8}")
fehlt = set(nachher) - set(vorher)
if fehlt: print("NEU im Endstand:", ", ".join(sorted(fehlt)))
PY
```

Jede Zeile der Ausgabe ist eine Formänderung. Sie **soll** dort stehen — der
Zweck des Zyklus war, die Form zu ändern. Was nicht dort stehen darf: eine
Seite, die im Endstand fehlt, und ein `ueberlauf`-Wechsel von `false` auf
`true`.

- [ ] **Schritt 3: Sichtprüfung der elf Seiten, beide Breiten, hell und dunkel**

```bash
cd /data/albumwerk/.superpowers/sdd/2026-09-21-app-stitch-umsetzung/mess
python3 - <<'PY'
import asyncio
from playwright.async_api import async_playwright
from anmelden import BASIS, als_kundin
from seiten import SEITEN

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for schema in ["light", "dark"]:
            for w, h, n in [(390, 844, "mobil"), (1440, 900, "desktop")]:
                ctx = await br.new_context(viewport={"width": w, "height": h},
                                           color_scheme=schema)
                for s in SEITEN:
                    pg = await ctx.new_page()
                    if s.rolle in ("kundin", "beide"):
                        await als_kundin(pg)
                    await pg.goto(BASIS + s.pfad, wait_until="networkidle")
                    await pg.evaluate("document.fonts.ready")
                    await pg.screenshot(
                        path=f"../abnahme/{s.slug}-{n}-{schema}.png",
                        full_page=True)
                    await pg.close()
                await ctx.close()
        await br.close()
asyncio.run(main())
PY
ls ../abnahme | wc -l     # Erwartet: 48
```

Die 48 Bilder werden **angesehen**, nicht nur gezählt. Screenshot-Vergleich
ist ausdrücklich **kein** Gatter — die Demo-Daten schwanken, die Bilder sind
zum Ansehen da, nicht zum Prüfen.

- [ ] **Schritt 4: Abnahmebericht**

`<W>/abnahme.md` mit: den vier Probenergebnissen als Zahlen, der Tabelle aus
Schritt 2, den Befunden der Sichtprüfung und der vollständigen Liste der
bewusst nicht übernommenen Formunterschiede aus allen neun Seitenberichten.

- [ ] **Schritt 5: Gesamt-Review auf dem stärksten verfügbaren Modell**

Über den gesamten Branch, gegen Spec und Plan. Der Befund wird nicht
geglaubt, sondern nachgemessen — in der Website-Umsetzung hat jede
„geprüfte" Behauptung, die gerechnet statt gemessen war, einen echten
Fehler verdeckt.

---

### Aufgabe 13: Hilfe-Screenshots erneuern

**Warum zuletzt und nicht zwischendurch:** Dieselben e2e-Läufe erzeugen die
Bilder der Hilfe-Artikel in `public/help/`. Jede Strukturänderung an den elf
Seiten veraltet sie. Würde der Schritt zwischendurch laufen, wäre er nach der
nächsten Aufgabe wieder hinfällig. Ohne ihn zeigt die Hilfe eine App, die es
nicht mehr gibt.

**Dateien:**
- Ändern: `public/help/*.png` (erzeugt, nicht von Hand)

- [ ] **Schritt 1: Bilder neu aufnehmen**

```bash
cd /data/albumwerk
make help-shots
```

Der Lauf ist seriell und dauert. Er schreibt nach `public/help/`.

- [ ] **Schritt 2: Die Bilder ansehen**

```bash
cd /data/albumwerk
git status --short public/help/
```

Jedes geänderte Bild einmal öffnen. Ein halb geladenes Vorschaubild ist der
bekannte Fehlerfall dieses Laufs — die Konfiguration nennt ihn ausdrücklich.
Ein solches Bild wird nicht committet, sondern der Lauf wiederholt.

- [ ] **Schritt 3: Commit**

```bash
cd /data/albumwerk
git add public/help/
git commit -F - <<'MSG'
Hilfe-Screenshots nach der Strukturumsetzung neu aufgenommen

make help-shots nach Abschluss aller elf Seiten. Vorher zeigten die
Artikel eine Oberflaeche, die es nicht mehr gibt.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

`git add public/help/` ist hier die **benannte** Menge und kein `git add
-A` — es ist genau das Verzeichnis, das `make help-shots` schreibt. Der
Rest des Baums bleibt unangetastet; `git status --short` muss danach
weiterhin nur die vier bekannten unverfolgten Einträge zeigen.

- [ ] **Schritt 4: Dem Menschen vorlegen**

Branch fertig, **nicht** gemergt und **nicht** gepusht. Vorlegen: den
Abnahmebericht, die Liste der bewusst nicht übernommenen Unterschiede, und
die Frage nach Merge oder Push.

---

## Was hier nicht hineingehört

- Zyklus 2 (`auth` und `help`, 8 Seiten) und Zyklus 3 (Verwaltung, 16 Seiten
  plus `OrdersPage` und `OrderDetailsPage`).
- Unit-Tests einführen — die App hat keine.
- Screenshot-Vergleich als Gatter.
- Die zehn fehlenden Stitch-Screens und das Aufräumen des Stitch-Projekts.
