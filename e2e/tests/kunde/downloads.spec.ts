// Workflow: Kundin ruft ihre gekauften Bilder ab.
// Hilfe-Artikel: downloads-nutzen
//
// Ohne abgeschlossene Bestellung ist die Seite leer — und genau dieser Zustand
// ist erklärungsbedürftig: Kunden suchen ihre Downloads oft, bevor der Fotograf
// die Bestellung abgeschickt hat.

import { test, expect } from "../../support/fixtures";
import { shot } from "../../support/shot";

test("Kundin sieht ihren Download-Bereich", async ({ page, album, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/downloads");

  // Der leere Zustand verweist selbst auf die passende Anleitung (helpSlug).
  const hinweis = page.getByRole("link", { name: /Wie das geht/ });
  await expect(hinweis).toBeVisible();
  await shot(
    hinweis.locator("xpath=ancestor::*[self::section or self::div][2]"),
    "downloads-nutzen/01-noch-leer",
  );

  await hinweis.click();
  await page.waitForURL("**/help/**");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
