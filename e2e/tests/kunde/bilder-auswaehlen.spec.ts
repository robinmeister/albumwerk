// Workflow: Kundin wählt Bilder aus ihrem Album aus.
// Hilfe-Artikel: bilder-auswaehlen

import { test, expect } from "../../support/fixtures";
import { bilderGeladen, shot } from "../../support/shot";

test("Kundin wählt Bilder aus", async ({ page, album, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).click();

  const raster = page.getByTestId("bildraster");
  await expect(raster.locator("img")).toHaveCount(album.bildIds.length);
  await bilderGeladen(page);

  const auswaehlen = page.getByRole("button", { name: "Bilder auswählen" });
  await shot(auswaehlen, "bilder-auswaehlen/01-modus-starten");
  await auswaehlen.click();

  await raster.locator("img").first().click();
  await expect(page.getByText("1 ausgewählt").first()).toBeVisible();
  await shot(raster, "bilder-auswaehlen/02-markiert");

  await page.getByRole("button", { name: "Alle" }).click();
  await expect(page.getByText(`${album.bildIds.length} ausgewählt`).first()).toBeVisible();

  // Abbrechen verwirft die Auswahl, statt sie stillschweigend zu behalten.
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByRole("button", { name: "Bilder auswählen" })).toBeVisible();
});
