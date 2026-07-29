// Screenshot-Aufnahme für die Hilfe-Artikel.
//
// Nimmt gezielt einzelne Elemente auf, nicht ganze Seiten: die Artikelspalte ist
// auf 68ch (~729px) begrenzt, ein 1440px-Vollbild schrumpft darin auf die Hälfte
// und die Beschriftungen werden unlesbar.
//
// Aufnahme passiert nur mit E2E_SHOTS=1 (make help-shots). Ohne den Schalter ist
// `shot()` ein No-op — normale Testläufe erzeugen so keine Git-Diffs, denn
// Browser-Rendering ist nicht bitstabil.
//
// Geschrieben werden PNGs nach e2e/.shots/; scripts/help-shots.mjs wandelt sie
// anschließend nach WebP unter public/help/.

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
export const SHOT_DIR = resolve(here, "../.shots");

export const SHOTS_ENABLED = process.env.E2E_SHOTS === "1";

/**
 * Nimmt `target` auf und legt es unter e2e/.shots/<name>.png ab.
 *
 * @param name Pfad ohne Endung, Form `<artikel-slug>/<nn>-<beschreibung>`,
 *             z. B. "album-anlegen/01-titel-eingeben". Der Slug muss einem
 *             Artikel in src/content/help entsprechen — die CI prüft das.
 */
export async function shot(target: Locator | Page, name: string): Promise<void> {
  if (!SHOTS_ENABLED) return;

  const path = resolve(SHOT_DIR, `${name}.png`);
  await mkdir(dirname(path), { recursive: true });

  // Animationen anhalten, sonst landet ein halb eingeblendeter Zustand im Bild.
  await target.screenshot({ path, animations: "disabled", scale: "device" });
}

/**
 * Wartet, bis alle Bilder im Ausschnitt wirklich dekodiert sind. Ohne das
 * landen im Album-Grid graue Kacheln in der Doku.
 */
export async function bilderGeladen(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
  );
}
