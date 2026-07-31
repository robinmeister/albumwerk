// Prüft, dass jedes Bild, das ein Hilfe-Artikel einbindet, auch wirklich in
// public/help/ liegt — und meldet umgekehrt Bilder, die kein Artikel benutzt.
//
// Hintergrund: die Bilder entstehen aus der E2E-Suite (make help-shots) und
// werden mit eingecheckt. Wird ein Artikel umbenannt oder ein Screenshot-Name
// in einem Test geändert, ohne die Bilder neu aufzunehmen, zeigt die Hilfeseite
// stumme kaputte Bilder. Das fällt niemandem auf — deshalb bricht hier die CI.
//
// Aufruf: node scripts/check-help-images.mjs

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const wurzel = resolve(import.meta.dirname, "..");
const ARTIKEL_DIR = join(wurzel, "src/content/help");
const BILD_DIR = join(wurzel, "public/help");

/** Alle src="/help/…"-Verweise aus den Artikel-Quellen. */
async function verwendeteBilder() {
  const treffer = new Map(); // pfad -> Datei, in der er steht
  for (const datei of await readdir(ARTIKEL_DIR)) {
    if (!datei.endsWith(".ts")) continue;
    const inhalt = await readFile(join(ARTIKEL_DIR, datei), "utf8");
    for (const m of inhalt.matchAll(/src=["'](\/help\/[^"']+)["']/g)) {
      if (!treffer.has(m[1])) treffer.set(m[1], datei);
    }
  }
  return treffer;
}

/** Alle tatsächlich vorhandenen Bilddateien, als /help/…-Pfad. */
async function vorhandeneBilder(dir = BILD_DIR) {
  const gefunden = [];
  let eintraege;
  try {
    eintraege = await readdir(dir, { withFileTypes: true });
  } catch {
    return gefunden; // public/help fehlt komplett — der Vergleich unten meldet das
  }
  for (const eintrag of eintraege) {
    const pfad = join(dir, eintrag.name);
    if (eintrag.isDirectory()) gefunden.push(...(await vorhandeneBilder(pfad)));
    else gefunden.push("/" + relative(join(wurzel, "public"), pfad).split("\\").join("/"));
  }
  return gefunden;
}

const verwendet = await verwendeteBilder();
const vorhanden = new Set(await vorhandeneBilder());

const fehlend = [...verwendet].filter(([pfad]) => !vorhanden.has(pfad));
const ungenutzt = [...vorhanden].filter((pfad) => !verwendet.has(pfad));

for (const [pfad, datei] of fehlend) {
  console.error(`FEHLT   ${pfad}  (eingebunden in src/content/help/${datei})`);
}
for (const pfad of ungenutzt) {
  console.warn(`unbenutzt  public${pfad}`);
}

if (fehlend.length > 0) {
  console.error(
    `\n${fehlend.length} Bild(er) fehlen. Neu aufnehmen mit:  make help-shots`,
  );
  process.exit(1);
}

console.log(
  `Hilfe-Bilder OK — ${verwendet.size} eingebunden, ${vorhanden.size} vorhanden` +
    (ungenutzt.length ? `, ${ungenutzt.length} unbenutzt (nur ein Hinweis)` : ""),
);
