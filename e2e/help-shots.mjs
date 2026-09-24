// Wandelt die Playwright-Aufnahmen aus e2e/.shots (PNG) in die ausgelieferten
// Doku-Bilder unter public/help (WebP).
//
// Warum WebP: die Bilder werden ins Docker-Image gebacken und liegen in Git.
// Als PNG wären das 12-30 MB auf ein 105-MB-Image, als WebP sind es 3-6 MB.
//
// Warum eine Höchstbreite von 1460px: die Artikelspalte ist 68ch (~730 CSS-px)
// breit; bei doppelter Pixeldichte reichen 1460 echte Pixel für ein scharfes
// Bild, alles darüber ist verschenktes Gewicht.
//
// Aufruf: node e2e/help-shots.mjs   (bzw. `make help-shots`, das vorher die
// Suite mit E2E_SHOTS=1 laufen lässt)

import { readdir, mkdir, rm, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const QUELLE = join(root, "e2e/.shots");

const ZIEL = join(root, "public/help");

const MAX_BREITE = 1460;
const QUALITAET = 85;

async function* pngDateien(verzeichnis) {
  let eintraege;
  try {
    eintraege = await readdir(verzeichnis, { withFileTypes: true });
  } catch {
    return;
  }
  for (const eintrag of eintraege) {
    const pfad = join(verzeichnis, eintrag.name);
    if (eintrag.isDirectory()) yield* pngDateien(pfad);
    else if (extname(eintrag.name) === ".png") yield pfad;
  }
}

const quellePruefen = await stat(QUELLE).catch(() => null);
if (!quellePruefen) {
  console.error(
    `Keine Aufnahmen in ${relative(root, QUELLE)}.\n` +
      `Erst die Suite mit E2E_SHOTS=1 laufen lassen — oder gleich: make help-shots`,
  );
  process.exit(1);
}

// Zielordner leeren, damit umbenannte oder entfallene Schritte keine
// verwaisten Bilder hinterlassen.
await rm(ZIEL, { recursive: true, force: true });

let anzahl = 0;
let bytes = 0;

for await (const png of pngDateien(QUELLE)) {
  const relativerPfad = relative(QUELLE, png).replace(/\.png$/, ".webp");
  const ziel = join(ZIEL, relativerPfad);
  await mkdir(dirname(ziel), { recursive: true });

  // Einfarbige Ränder wegschneiden. Container wie <main> spannen die volle
  // Viewporthöhe, der Inhalt endet aber oft nach der Hälfte — ohne das steht
  // unter jedem Handy-Screenshot eine große leere Fläche.
  //
  // Der Zuschnitt ist ausdrücklich nur für diese SENKRECHTE Leere gedacht.
  // sharp nimmt ohne Angabe das Eckpixel als Hintergrundfarbe. Bei Aufnahmen,
  // deren Ziel nur ein Knopf ist, füllt der Knopf das PNG randlos aus — dann
  // ist das Eckpixel die Knopffüllung und `trim` schneidet bis an die Glyphen.
  // Solange die Ecken rund waren, ragten sie über die Füllung hinaus und haben
  // das zufällig verhindert; mit Radius 0 fällt dieser Schutz weg. Deshalb:
  // schneidet der Zuschnitt seitlich, war er nicht gemeint und wird verworfen.
  const roh = await sharp(png).toBuffer({ resolveWithObject: true });
  let beschnitten = await sharp(png)
    .trim({ threshold: 5 })
    .toBuffer({ resolveWithObject: true });
  if (beschnitten.info.width < roh.info.width - 2) beschnitten = roh;

  const info = await sharp(beschnitten.data)
    .resize({ width: MAX_BREITE, withoutEnlargement: true })
    .webp({ quality: QUALITAET })
    .toFile(ziel);

  anzahl += 1;
  bytes += info.size;
  console.log(`  ${relativerPfad}  ${(info.size / 1024).toFixed(0)} KB`);
}

if (anzahl === 0) {
  console.error("Keine PNGs gefunden — hat die Suite wirklich mit E2E_SHOTS=1 gelaufen?");
  process.exit(1);
}

console.log(
  `\n${anzahl} Bilder nach public/help geschrieben, zusammen ${(bytes / 1024 / 1024).toFixed(2)} MB.`,
);
