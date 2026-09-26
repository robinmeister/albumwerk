# Design System: Albumwerk

## 0. Herkunft der Design-Sprache

Ausgelesen von `kira-learning.com` (Framer, Stand 09/2026, Viewport 1440px) per
Computed-Style-Abzug. Die Referenzwerte stehen hier unverändert, damit jede
Ableitung nachvollziehbar bleibt:

| Merkmal | Referenzwert |
| --- | --- |
| Display-Schrift | Recife Text Web, **Weight 400** (nie fett), LS `-0.3px` bis `-0.4px`, LH `110%` |
| Text-Schrift | Messina Sans Web Regular/SemiBold, `16px`, LH `140%`, LS `-0.3px` |
| Canvas | `#FFFDF0` (Creme), `#FFFFFF`, Flächenpanel `#F5F5F4` |
| Tinte | `#1A1A1A` Headline, `#6B6761` Fließtext, `#504D49` tertiär |
| Marker-Töne | `#AC99FF`, `#56EAAF`, `#FFDD0A`, `#FC5201` — ausschließlich als Textmarker/Collage hinter Inhalt |
| Radius | `0` für Flächen, `4px` für Buttons, `14px` nur für schwebende Produkt-UI |
| Schatten | genau einer: `0 1px 2px rgba(235,235,235,.25)` |
| Sektionsrhythmus | `100px` oben/unten konstant, Hero `200px/40px`, Gutter `30px`, Container `1380px`, Inhalt `1076–1196px` |
| Abstandsstufen | 8 · 10 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 |
| Bewegung | Lenis Smooth-Scroll, Hover nur `color .2s cubic-bezier(.44,0,.56,1)`, Scroll-Reveal über `opacity`/`transform` |

Übernommen wird die **Grammatik**, nicht die Palette: Serifen-Display im
Regularschnitt, warmes Papier statt Weiß, Farbe nur als Markierung, Flächen
ohne Rahmen und ohne Radius, Bewegung fast unsichtbar. Die Töne kommen aus dem
bestehenden Albumwerk-Register (Kontaktbogen: Positivpapier, Filmträger,
Fettstift).

---

## 1. Visual Theme & Atmosphere

Ein Kontaktbogen auf dem Leuchttisch. Warmes Barytpapier statt Bildschirmweiß,
Bilder liegen als exakt beschnittene Platten darauf, daneben Notizen in
Grotesk und Maßangaben in Monospace. Ruhig, handwerklich, unaufgeregt teuer —
die Autorität kommt aus Weißraum und optisch justierter Typografie, nie aus
Effekten. Ein Fotograf soll das Gefühl haben, seine Arbeit hängt in einer gut
beleuchteten Galerie, nicht in einem SaaS-Dashboard.

- **Dichte:** 3/10 — Art Gallery Airy. Marketing-Sektionen dürfen eine einzige
  Aussage pro Bildschirm tragen. In der App (Album-Raster, Bestellansicht)
  steigt die Dichte auf 6/10, die Tokens bleiben identisch.
- **Varianz:** 5/10 — ruhiges Raster als Grundlage, aber asymmetrische
  Sektionsköpfe (Headline links, Dachzeile rechtsbündig) und Zickzack-Reihen.
  Nur der Hero darf zentriert sein.
- **Bewegung:** 3/10 — Static Restrained. Bewegung ist Höflichkeit, kein Auftritt.

---

## 2. Color Palette & Roles

**Grundflächen**

- **Barytpapier** (`#FAF7EE`) — Seitengrund, warmes Creme, ersetzt Weiß überall
- **Blattweiß** (`#FFFFFF`) — Bildplatte, Karteninneres, Produkt-UI
- **Ablage** (`#F2EFE6`) — flaches Panel für Karten-Raster und Bildzellen, trennt
  ohne Rahmen und ohne Schatten
- **Filmträger** (`#14130F`) — dunkles Feld: CTA-Band, Footer, Primärbutton.
  Nie `#000000`
- **Pauspause** (`#0D3550`) — alternatives dunkles Feld für technische Abschnitte
  (Selbsthosting, Systemanforderungen)

**Tinte**

- **Filmträger Ink** (`#14130F`) — alle Headlines, Buttonschrift auf Hell
- **Randnotiz** (`#55534A`) — Fließtext, Dachzeilen, Kartentext
- **Perforation** (`#8A8779`) — Metadaten, Zeitstempel, Bildnummern, Legalzeile
- **Bogenschrift** (`#E8E5DB`) — Text auf Filmträger/Pauspause
- **Bogenschrift gedämpft** (`rgba(232,229,219,.6)`) — Footer-Kleintext

**Linien**

- **Feine Kante** (`#DCD7C8`) — 1px Struktur, sparsam; Fläche schlägt Linie
- **Kante weich** (`#E7E3D7`) — Trennung innerhalb einer Karte

**Markierung — genau ein Akzent, plus ein geschlossenes Marker-Set**

- **Fettstift** (`#B3261A`) — der einzige Akzent: Fokusring, aktiver Zustand,
  Auswahlhaken, Links im Text, Pflichtmarkierung. Sättigung unter 80%.
- **Fettstift hell** (`#F0574A`) — dieselbe Rolle, aber auf Filmträger/Pauspause.
  Nie vertauschen, beide sind kontrastgeprüft für ihren Grund.
- **Marker-Set** (`#B3261A`, `#F2C400`, `#0D3550`) — ausschließlich als
  Textmarker-Block hinter einem Wort oder als angerissene Farbfläche hinter
  einem Screenshot. Niemals als Button, Badge, Icon-Füllung oder Verlauf.

**Regeln**

- Primärbutton ist **Tinte**, nicht Akzent. Farbe ist Markierung, nie Chrome.
- Eine Palette für alles — kein Wechsel zwischen warmem und kaltem Grau.
- Kein `#000000`, kein Verlauf auf Text, kein Neon, kein Glow.
- Dunkelmodus dreht nur die Polarität: Grund `#191814`, Panel `#211F1A`,
  Tinte `#E8E5DB`, Akzent `#F0574A`.

---

## 3. Typography Rules

- **Display — `Fraunces`** (Variable, `opsz 96`, `SOFT 0`, `WONK 0`),
  Fallback `Newsreader`, dann `Georgia`-freie Serif-Kette.
  **Immer Weight 400.** Hierarchie entsteht aus Größe und Farbe, niemals aus
  Fettung. Eine 48px-Headline im Regularschnitt ist das teuerste Element der
  Seite; dieselbe Headline in Bold ist eine Werbeanzeige.
- **Text — `Public Sans`**, Fallback `Helvetica Neue`, `Arial`.
  Regular für Fließtext, SemiBold nur für Buttons und Tabellenköpfe.
  Zeilenlänge maximal 65 Zeichen, Farbe Randnotiz, nie Filmträger.
- **Auszeichnung — `Martian Mono`** für Zahlen, Preise, Bildnummern,
  Dateigrößen, Zeitstempel, Dachzeilen. `12px`, Tracking `0`, nicht versal.
- **Tracking-Regel:** jede Größe bekommt `-0.3px`, ab 48px `-0.4px`. Keine
  Ausnahme, keine `normal`-Defaults.

**Skala (Desktop / mobil via `clamp()`)**

| Rolle | Größe | Line-Height | Tracking | Schrift |
| --- | --- | --- | --- | --- |
| Hero | `clamp(2.5rem, 4.4vw, 3.5rem)` = 40→56px | `120%` | `-0.4px` | Fraunces 400 |
| Sektion (H2) | `clamp(2rem, 3.3vw, 3rem)` = 32→48px | `110%` | `-0.3px` | Fraunces 400 |
| Feature (H3) | `clamp(1.5rem, 2.2vw, 2rem)` = 24→32px | `110%` | `-0.3px` | Fraunces 400 |
| Karte (H4) | `1.25rem` = 20px | `110%` | `-0.3px` | Fraunces 400 |
| Dachzeile | `0.75rem` = 12px | `140%` | `0` | Martian Mono 400 |
| Fließtext | `1rem` = 16px | `140%` | `-0.3px` | Public Sans 400 |
| Klein / Legal | `0.75rem` = 12px | `140%` | `-0.3px` | Public Sans 400 |

**Verboten:** `Inter`. `Times New Roman`, `Georgia`, `Garamond`, `Palatino`.
Fette Headlines (700/800/900) im Display. Versalien als Gestaltungsmittel
außerhalb der Monospace-Dachzeile. Eine dritte Schriftfamilie.

---

## 4. Component Stylings

- **Buttons.** Primär: Filmträger-Fläche `#14130F`, Text `#E8E5DB`, Padding
  `12px 16px`, Höhe 42px, Radius `4px`, kein Schatten, kein Glow. Sekundär:
  transparent mit 1px Feine Kante, Text Filmträger. Hover ändert nur die Farbe
  (`.2s cubic-bezier(.44,0,.56,1)`), Active verschiebt um `translateY(1px)`.
  Maximal ein Primärbutton pro Sektion.
- **Karten.** Flaches Ablage-Panel `#F2EFE6`, Radius `0`, kein Rahmen, kein
  Schatten. Innenabstand `24px`, bei großen Karten `32px`. Bild sitzt oben
  randlos in der Zelle, Titel und Text darunter mit `12px` Abstand. Elevation
  gibt es nur für schwebende Produkt-UI in Screenshots: Radius `14px`,
  `0 1px 2px rgba(20,19,15,.06)`.
- **Bildplatten.** Fotos sind das Produkt: randlos, Radius `0`, exakter
  Beschnitt, nie abgerundet, nie mit Rahmen. Hinter einer Bildplatte darf eine
  angerissene Marker-Fläche hervorschauen — versetzt, nicht überlappend mit Text.
- **Inputs.** Label darüber in `12px` Martian Mono, Feld mit 1px Feine Kante,
  Radius `4px`, Höhe 42px, Grund Blattweiß. Fokus: 2px Fettstift-Ring, kein
  Schattenwechsel. Fehlertext darunter in Fettstift, `12px`. Keine
  Floating-Labels.
- **Ladezustände.** Skelette in Ablage-Ton, exakt in den Maßen des späteren
  Inhalts, langsamer Shimmer. Keine Kreis-Spinner.
- **Leerzustände.** Gezeichnete Komposition (Bleistiftstrich, wie die Referenz)
  plus ein Satz, der sagt, was als Nächstes zu tun ist. Nie nur „Keine Daten".
- **Fehlerzustände.** Inline an der Ursache, Fettstift als Markierung links,
  Text in Randnotiz. Kein modales Rot.
- **Navigation.** Einzeilig, transparent auf Barytpapier, Logo links, Links in
  Public Sans `16px`, rechts genau ein Filmträger-Button.

---

## 5. Layout Principles

- **Container** `1380px`, Gutter `30px`, Inhaltsspalte `1076–1196px` innerhalb
  der Sektion. Nichts läuft ungebremst auf 1920px.
- **Sektionsrhythmus:** konstant `100px` oben und unten
  (`clamp(3.5rem, 8vw, 6.25rem)`), Hero `200px` oben / `40px` unten. Dieser
  konstante Takt ist der Hauptgrund, warum die Referenz teuer wirkt.
- **Abstandsstufen:** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80.
  Karten-Raster `48px` Spaltenabstand, Textblöcke `12–20px`.
- **Radius:** `0` als Standard. `4px` nur für Bedienelemente, `14px` nur für
  schwebende Produkt-UI.
- **Rhythmus über die Sektionen** (in dieser Reihenfolge, so liest sich die
  Referenz und so baut Albumwerk):
  1. Hero auf Barytpapier, zentrierte Serifen-Headline, ein bis zwei Wörter mit
     Marker hinterlegt, Deck in Randnotiz, zwei Buttons.
  2. Vollbreite Farbplatte mit Produktansicht — bricht das Papier, erstes Bild.
  3. Atempause: eine einzige gezeichnete Linie über die volle Breite, sonst nichts.
  4. Zentrierte Aussage-Headline, darunter alternierende Zweispalter
     (Bild links / Bild rechts, ~455px hoch), `48px` Spalten-, `100px` Reihenabstand.
  5. Split-Kopf: Headline links, Dachzeile rechtsbündig — darunter
     Dreier-Raster aus flachen Ablage-Panels.
  6. Vertrauensband (Recht, DSGVO, Hosting) auf Blattweiß, ruhig gesetzt.
  7. Integrationswand: Logos in gleicher optischer Größe, ein Ton.
  8. CTA auf Filmträger, eine Zeile, ein Button.
  9. Footer Filmträger, Kleintext `12px` in gedämpfter Bogenschrift.
- **Verboten:** Überlappende Elemente — jedes Element hat seine eigene Zone.
  Absolute Stapelung von Text über Bild. Drei gleich breite Karten als einziges
  Layoutmittel in mehr als einer Sektion. `calc()`-Prozentrechnerei statt Grid.
  `h-screen` (immer `min-h-[100dvh]`).
- **Grid vor Flex.** Zellen über `grid-template-columns`, keine Breitenmathematik.

---

## 6. Responsive Rules

- Unter `768px` kollabiert jedes mehrspaltige Layout auf eine Spalte,
  ausnahmslos. Zickzack-Reihen: Bild immer über Text.
- Kein horizontaler Überlauf. Bildplatten skalieren mit, sie scrollen nicht.
- Typografie über `clamp()`, Fließtext nie unter `16px`.
- Touch-Ziele mindestens `44px`; der 42px-Button bekommt mobil `44px` Höhe.
- Sektionsabstand skaliert proportional: `clamp(3.5rem, 8vw, 6.25rem)`.
- Navigation klappt in ein ruhiges Vollbild-Menü auf Barytpapier, gleiche Typo,
  keine Overlay-Effekte.
- Marker-Flächen hinter Headlines bleiben erhalten, werden aber schmaler
  gesetzt, damit keine Silbe auf zwei Marker fällt.

---

## 7. Motion & Interaction

- **Grundeinstellung: zurückhaltend.** Bewegung darf nie der Grund sein, warum
  jemand hinsieht.
- **Hover:** ausschließlich Farbwechsel, `200ms`, `cubic-bezier(.44, 0, .56, 1)`.
  Kein Scale, kein Schattenaufbau, kein Unterstreichungs-Slide.
- **Scroll-Reveal:** `opacity 0→1` plus `translateY(12px→0)`, `560ms`, dieselbe
  Kurve, Staffelung `70ms` zwischen Geschwistern. Nur einmal, nicht bei
  Rückwärtsscroll wiederholen.
- **Smooth Scrolling** (Lenis o. ä.) mit kurzer Dämpfung; bei
  `prefers-reduced-motion: reduce` komplett aus, ebenso alle Reveals.
- **Nur `transform` und `opacity` animieren.** Nie `top`, `left`, `width`,
  `height`, nie `filter` auf großen Flächen.
- **Keine Dauerschleifen** auf Marketing-Seiten: kein Float, kein Pulse, kein
  Shimmer außer im Ladeskelett.
- **Active-State** ist taktil: `translateY(1px)`, sofort, ohne Übergang.

---

## 8. Anti-Patterns (verboten)

- Keine Emojis, nirgends.
- Kein `Inter`, keine generischen Serifen (`Times New Roman`, `Georgia`,
  `Garamond`, `Palatino`).
- Kein fetter Serifenschnitt für Headlines — Display ist immer Weight 400.
- Kein `#000000`, kein reines `#FFFFFF` als Seitengrund.
- Keine Neon-, Glow- oder Außenschatten; genau ein Schatten existiert im System.
- Keine Farbverläufe, schon gar nicht auf Text.
- Kein Akzent als Flächenfarbe für Buttons oder Badges — Farbe ist Markierung.
- Keine abgerundeten Fotos, keine Bildrahmen, keine Polaroid-Optik.
- Keine überlappenden Elemente, keine Textblöcke über Bildern.
- Keine benutzerdefinierten Mauszeiger.
- Kein „Scroll to explore", keine springenden Chevrons, keine Scroll-Pfeile.
- Keine drei gleich breiten Karten als Standardantwort auf jede Sektion.
- Keine Platzhalternamen wie „Max Mustermann", „Acme", „Nexus" — Albumwerk
  zeigt Fotografennamen und echte Bestellnummern im Format `AW-2026-0148`.
- Keine gerundeten Fantasiezahlen (`99,99 %`, `50 %`, `10.000+ Kunden`).
- Keine Werbefloskeln: „revolutionär", „nahtlos", „Game-Changer", „Elevate",
  „Next-Gen", „Unleash".
- Keine toten Unsplash-Links; Platzhalter über `picsum.photos` oder SVG.
