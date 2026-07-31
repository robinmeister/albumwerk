// Workflow: Kundin liest eine bebilderte Anleitung.
//
// Kein eigener Hilfe-Artikel, sondern ein Wächter: die Bilder in den Artikeln
// laufen durch DOMPurify (HelpArticlePage). Fällt figure/figcaption/img oder
// das loading-Attribut aus der Freigabeliste, verschwinden sie stumm — die
// Seite sieht dann einfach wieder aus wie vorher. scripts/check-help-images.mjs
// prüft nur, dass die Dateien da sind; dass sie auch ankommen, prüft dieser Test.

import { test, expect } from "../../support/fixtures";
import { bilderGeladen } from "../../support/shot";

test("Bilder in den Anleitungen werden ausgeliefert", async ({ page, album, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/help/bilder-auswaehlen");

  const artikel = page.locator(".help-article");
  const bilder = artikel.locator("figure img");
  await expect(bilder.first()).toBeVisible();

  // Jedes Bild braucht eine Bildbeschreibung und soll faul nachgeladen werden.
  const anzahl = await bilder.count();
  expect(anzahl).toBeGreaterThan(0);
  for (let i = 0; i < anzahl; i++) {
    await expect(bilder.nth(i)).toHaveAttribute("alt", /\S/);
    await expect(bilder.nth(i)).toHaveAttribute("loading", "lazy");
  }
  await expect(artikel.locator("figcaption").first()).toBeVisible();

  // Und sie müssen wirklich laden — ein Tippfehler im Pfad fiele sonst nicht auf.
  await bilderGeladen(page);
});
