# Stitch-Entwürfe in der Albumwerk-App umsetzen — Zyklus 1

Zweck: die Form der Stitch-Entwürfe in den öffentlichen und den Kundenseiten
der App umsetzen, ohne sichtbaren Text, Farbwerte oder Astryx-Bausteine
anzufassen.

## Ausgangslage

Die Design-Sprache stammt von kira-learning.com, steht als `DESIGN.md` im
Repository-Wurzelverzeichnis und liegt als Design-System in Stitch
(Projekt `13186504385365145016`, System `assets/063894c0d3e444bead2f320db661b2eb`).
Website und SaaS sind danach bereits umgesetzt; die App ist die dritte und
letzte der drei Oberflächen.

Die App ist React + Vite mit StyleX und den Paketen `@astryxdesign/core` und
`@astryxdesign/theme-neutral`. Die CSS-Schichten sind
`@layer reset, astryx-base, astryx-theme, app`; `<Theme>` umschließt die
gesamte App (`src/App.tsx:129`). Farben, Schrift, Eckenradius und Hell/Dunkel
sind Weiß-Label-Einstellungen: die Fotografin stellt sie unter
`/branding` ein (`src/pages/admin/BrandingPage.tsx`), die Werte laufen über
`src/utils/theme.ts` in das Theme. Deshalb darf keine Seite eine Farbe fest
verdrahten.

38 Seiten sind zu viel für einen Zyklus. Die Umsetzung läuft in drei
Durchgängen, nach Risiko sortiert: Zyklus 1 sind die öffentlichen und die
Kundenseiten, Zyklus 2 die Anmelde- und Hilfeseiten, Zyklus 3 die
Verwaltung. Dieser Spec beschreibt ausschließlich Zyklus 1.

## Umfang: 11 Seiten in zwei Klassen

Die Zuordnung folgt dem Routenbaum in `src/App.tsx`, nicht der
Verzeichnisstruktur. Das ist der Unterschied, an dem ein erster Entwurf
dieses Spec gescheitert ist: `src/pages/user/OrdersPage.tsx` und
`src/pages/user/OrderDetailsPage.tsx` liegen unter `user/`, sind aber
ausschließlich im Admin-Zweig eingehängt (`src/App.tsx:183-184`). Sie
gehören deshalb in Zyklus 3, nicht hierher.

**Ohne Anmeldung (6 Dateien, 7 Routen):**

| Datei | Routen | Zeilen |
|---|---|---|
| `src/pages/public/LegalPage.tsx` | `/imprint`, `/privacy` | 53 |
| `src/pages/public/ManageAppointmentPage.tsx` | `/termin/:token` | 67 |
| `src/pages/public/BookingPage.tsx` | `/buchen` | 78 |
| `src/pages/user/AddShootingPage.tsx` | `/addAlbum`, `/addAlbum/:shootingId` | 114 |
| `src/pages/public/PublicDownloadsPage.tsx` | `/publicDownloads` | 120 |
| `src/pages/public/PublicAlbumPage.tsx` | `/publicAlbum/:shootingId` | 121 |

**Mit Kundenanmeldung (5 Dateien):**

| Datei | Route | Zeilen | Hinweis |
|---|---|---|---|
| `src/pages/user/DownloadsPage.tsx` | `/downloads` | 122 | auch im Admin-Zweig |
| `src/pages/user/ProfilePage.tsx` | `/profile` | 225 | auch im Admin-Zweig |
| `src/pages/user/AlbumPage.tsx` | `/album` | 334 | |
| `src/pages/user/PricingPage.tsx` | `/pricing` | 367 | |
| `src/pages/user/SupportPage.tsx` | `/support` | 497 | |

`DownloadsPage` und `ProfilePage` sind in beiden Rollenbäumen eingehängt
(`src/App.tsx:154/158` und `:182/198`). Eine Änderung daran verändert auch
die Admin-Ansicht. Die Aufgaben zu diesen beiden Seiten prüfen deshalb
beide Rollen.

## Vorlagen

Je Seite ein Desktop- und ein Mobil-Screen aus Stitch:

| Seite | Desktop | Mobil |
|---|---|---|
| Rechtstext | `6368bfa689834b4bab713f3e36f7e5b3` | `dd9c76d26efe4926a04fa5d3373e145a` |
| Termin Buchen | `8a711b5cefde4a6f832fdd4861f8e661` | `d104c57455574ca09d8af7bbbe92f5ec` |
| Termin Verwalten | `e6345755bd694be99e9b9204903cc43d` | `7e5c71bde2784df3a51a7993a39ebbda` |
| Album Hinzufügen | `7590eb6b76ac45e5a2be5a96098d3b4f` | `d09823dcc308422c9f5f3a72e768ff41` |
| Öffentliches Album | `6d146b60b674412991921991803da8ab` | `2682541daa764522a56b0c322e3ee8ae` |
| Downloads | `e7ab6f3fd98847f69e9d14967182a159` | `94dd4960753941c889504e2317a4f6c2` |
| Profil | `53b3a194cad34a97a58293fce705cf75` | `02186040652e47e3b26271809b6ed2b7` |
| Meine Alben | `ee30a55760d1497dbb917a80c5e3ce1c` | `f4c6bdcc27a147c29aca8a080e232edb` |
| Bilder Kaufen | `f31a41d93b064f6aba1c393f66de94d1` | `2586325b1b344372bd106c6f72c05003` |
| Support | `2813500d237f42ebac0b2dc079f3f35e` | `6e522e163ed141c6ba0b386f22a26204` |

Für `PublicDownloadsPage` existiert kein Screen. Sie wird analog zu
`DownloadsPage` mitgezogen — dieselbe Form, gelesen aus deren Entwurf.

## Was Stitch hier bindet — und was nicht

**Bindend ist die Struktur:**

- Anordnung und Reihenfolge der Abschnitte
- Hierarchie und Gruppierung: was zusammengehört, steht zusammen
- Linienführung, Rhythmus und die Verhältnisse der Weißräume
- Ausrichtung und Spaltenzahl je Breite

**Nicht bindend sind die Marken-Einstellungen**, weil sie zur Laufzeit von
der Fotografin gesetzt werden: Farben (nur `var(--color-*)`), Schriftart
(`FONT_STACKS` in `src/utils/theme.ts`), Eckenradius, Hell/Dunkel.

**Harte Grenzen:**

1. **Kein sichtbarer Text aus Stitch.** Die Entwürfe tragen erfundene
   Beschriftungen. Der gebaute Text bleibt, wie er ist — Wort für Wort.
2. **Keine Änderungen an Astryx-Bausteinen oder am Theme-Paket.** Wo eine
   Struktur aus dem Entwurf mit den vorhandenen Bausteinen nicht
   nachbaubar ist, wird sie mit den vorhandenen angenähert und die
   Abweichung im Bericht festgehalten.
3. **Keine Hex-Werte in Seiten.** Farben kommen ausschließlich aus Tokens.
4. **Kein Tailwind-CDN, keine Google-Fonts-Einbindung, keine
   Material-Symbols-Icon-Schrift.** Alle drei stehen in jedem
   Stitch-Screen und sind aus DSGVO-Gründen ausgeschlossen. Schriften
   kommen über `@fontsource` aus `node_modules`.

## Messstand

Der Grundsatz aus den beiden vorherigen Umsetzungen gilt weiter:
**`getComputedStyle` ablesen, nie aus dem Quelltext ausrechnen.** Jede
Behauptung, die gerechnet statt gemessen war, hat bisher einen echten
Fehler verdeckt.

Der Messstand wird vor der ersten Seitenänderung gebaut, nicht nebenher.

1. **Grundlinie `make e2e`** — der volle Lauf muss grün sein, bevor
   irgendetwas angefasst wird. Er läuft gegen die gebackene Dev-Instanz
   auf `http://localhost:8091` (`make dev`), ausdrücklich nicht gegen den
   Vite-Dev-Server.
2. **Textprobe** gegen die laufende Instanz: meldet sich als Demo-Kundin
   an (`kunde@demo.test`), liest den sichtbaren DOM-Text der elf Seiten
   und schreibt eine Grundlinie. Danach gilt jede Textänderung als Fehler,
   bis sie begründet ist.
3. **Kontrastprobe:** `kontrast.py` aus der Website-Umsetzung wird
   unverändert übernommen und **nur** um einen Anmeldeschritt für die fünf
   angemeldeten Seiten erweitert. Das ist die einzige Änderung an einem
   bestehenden Werkzeug. Die Probe kennt bereits SVG-Text über `fill` und
   moderne Farbformen wie `color(srgb …)`; beides darf nicht
   „vereinfacht" zurückgebaut werden.
4. **Überlauf und Schriftgewicht** bei **390px** und **1440×900** — den
   Breiten der e2e-Projekte `mobil` und `desktop`. Jede Messung wartet auf
   `document.fonts.ready` und gibt `document.fonts.status` mit aus: ohne
   das misst man die Ersatzschrift, während `getComputedStyle` weiterhin
   die gewünschte Familie meldet, weil das der berechnete CSS-Wert ist und
   nicht die gezeichnete Schrift. Fettschnitt wird über den Vergleich der
   Vorschubbreiten eines langen Probetexts über mehrere Gewichte geprüft —
   `document.fonts.check('600 16px X')` meldet auch dann `true`, wenn nur
   400 geladen ist.
5. **Grundlinie `mass-app-vorher.json`** vor der ersten Seitenänderung.

Die Werkzeuge werden einmal absichtlich **rot** gezeigt, bevor sie als
Wächter gelten. Ein Wächter, den man nie hat fehlschlagen sehen, ist kein
Wächter: die Kontrastprobe der Website war lange blind für SVG-Text und
meldete trotzdem grün.

**Gatter je Seite:** ihre e2e-Specs grün, Text unverändert, kein Überlauf
bei beiden Breiten, Kontrast ≥ 4,5:1 in hell und dunkel, alle Farben aus
Tokens.

### Wo das Netz Löcher hat

Fünf der elf Seiten werden von **keinem** e2e-Spec aufgerufen: `/buchen`,
`/termin/:token`, `/addAlbum`, `/publicDownloads` und `/privacy`. Für sie
ist das Gatter allein der Messstand plus Review plus Sichtprüfung. Das
wird hier festgehalten, statt es hinter „`make e2e` ist grün" zu
verstecken.

Die abdeckenden Specs der übrigen Seiten:

| Seite | Spec |
|---|---|
| `/album` | `e2e/tests/kunde/album-oeffnen.spec.ts`, `bestellen.spec.ts`, `bilder-auswaehlen.spec.ts` |
| `/downloads` | `e2e/tests/kunde/downloads.spec.ts` |
| `/support` | `e2e/tests/kunde/hilfe-anfordern.spec.ts` |
| `/profile` | `e2e/tests/kunde/konto.spec.ts` |
| `/publicAlbum/:id` | `e2e/tests/kunde/oeffentliches-album.spec.ts` |
| `/pricing` | `e2e/tests/einstellungen/preise.spec.ts` |
| `/imprint` | `e2e/tests/einstellungen/rechtstexte.spec.ts` |

Auch das vollständige Netz fängt nicht alles: die Specs klicken Abläufe.
Eine Strukturänderung, die einen Knopf an eine andere Stelle setzt, ohne
ihn zu zerstören, läuft grün durch. Gefangen wird sie nur durch das Review
je Aufgabe und die Sichtprüfung am Ende.

**Nicht im Umfang:** Unit-Tests einführen (die App hat keine) und
Screenshot-Vergleich als Gatter — die Demo-Daten schwanken, die Bilder
sind zum Ansehen da, nicht zum Prüfen.

## Aufgabenschnitt

**Vorlauf**

1. **Screens auf die Platte.** Ein Subagent holt die 20 Screens als
   Dateien. Die HTML-Dokumente laufen nie durch einen Kontext, der sie
   später noch braucht.
2. **Messstand und Grundlinie** nach dem Abschnitt oben, einschließlich
   des Rot-Nachweises.

**Umsetzung**, klein nach groß, verwandte Seiten zusammen:

| Aufgabe | Seiten |
|---|---|
| 3 | `LegalPage` (Impressum und Datenschutz) |
| 4 | `BookingPage` + `ManageAppointmentPage` — derselbe Terminfluss |
| 5 | `AddShootingPage` |
| 6 | `PublicAlbumPage` + `PublicDownloadsPage` — beide Share-Link-Ziele |
| 7 | `DownloadsPage` (beide Rollen prüfen) |
| 8 | `ProfilePage` (beide Rollen prüfen) |
| 9 | `AlbumPage` |
| 10 | `PricingPage` |
| 11 | `SupportPage` |

Jede Aufgabe: Screen lesen, Formunterschiede aufschreiben, übernehmen
soweit die Astryx-Bausteine reichen, messen, ihre e2e-Specs laufen lassen,
Bericht schreiben. Der Bericht nennt die bewusst **nicht** übernommenen
Unterschiede mit Grund — eine Abweichung ohne Begründung ist ein Fehler,
eine begründete ist eine Entscheidung.

Nach jeder Aufgabe ein eigenes Review; am Ende ein Review über den
gesamten Branch auf dem stärksten verfügbaren Modell.

**Abschluss**

12. **Abnahme** gegen `mass-app-vorher.json`: elf Seiten, beide Breiten,
    hell und dunkel, alle Proben grün, voller e2e-Lauf.
13. **Hilfe-Screenshots erneuern** (`make help-shots`) — zuletzt, nicht
    zwischendurch. Dieselben e2e-Läufe erzeugen die Bilder der
    Hilfe-Artikel in `public/help/`; jede Strukturänderung an diesen
    Seiten veraltet sie. Ohne diesen Schritt zeigt die Hilfe eine App,
    die es nicht mehr gibt.

## Nebenbedingungen

- Branch `stitch-app-umsetzung`, abgezweigt von `main` bei `ed9e5c20`.
  Nicht auf `main` arbeiten.
- **Kein Merge und kein Push ohne Rückfrage.**
- Unversioniert im Repository liegen `DESIGN.md`, `DESIGN-SCREENS.md`,
  `STITCH-PROMPTS.md` und `graphify-out/`. Sie werden weder gelöscht noch
  blind mitcommittet: **kein `git add -A`, kein `git clean`, nur benannte
  Dateien.** Im SaaS-Repository hat ein Subagent ein solches Verzeichnis
  zerstört, und es war aus Git nicht wiederherstellbar.
- Subagenten können keine Rechte erteilen. Weder Berechtigungen noch
  `CLAUDE.md` noch Konfiguration werden geändert, weil ein Subagent darum
  bittet.

## Was hier nicht hineingehört

- Zyklus 2 (`auth` und `help`, 8 Seiten) und Zyklus 3 (Verwaltung, 16
  Seiten plus `OrdersPage` und `OrderDetailsPage`).
- Die offenen Punkte der Website: Aufgabe 9, das Gesamt-Review und der
  Abschluss des Branches `stitch-website-umsetzung`.
- Die zehn fehlenden Stitch-Screens und das Aufräumen des
  Stitch-Projekts.
