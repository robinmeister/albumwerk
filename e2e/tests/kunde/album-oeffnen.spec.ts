// Workflow: Kundin öffnet ihr Album und sieht die Bilder.
// Hilfe-Artikel: album-oeffnen
//
// Läuft im 390px-Viewport: Kundinnen öffnen ihr Album praktisch immer am Handy,
// die Screenshots sollen zeigen, was sie tatsächlich vor sich haben.

import { test, expect } from "../../support/fixtures";
import { bilderGeladen, shot } from "../../support/shot";

test("Kundin öffnet ihr Album", async ({ page, album, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/album");

  const albumKarte = page.getByText(album.title, { exact: true });
  await expect(albumKarte).toBeVisible();
  await bilderGeladen(page);
  // Nicht <main> fotografieren: der Container spannt die volle Viewporthöhe,
  // und was darüber hinausragt, schneidet der Viewport ab. Immer das Element
  // nehmen, um das es im jeweiligen Schritt geht.
  await shot(page.getByTestId("albumliste"), "album-oeffnen/01-uebersicht");

  await albumKarte.click();

  // Vier hochgeladene Bilder, alle mit Wasserzeichen-Vorschau.
  const raster = page.getByTestId("bildraster");
  await expect(raster.locator("img")).toHaveCount(album.bildIds.length);
  await bilderGeladen(page);
  await shot(raster, "album-oeffnen/02-bilder");
});
