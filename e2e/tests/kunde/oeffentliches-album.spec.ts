// Workflow: Besucher öffnet ein geteiltes Album ohne Konto.
// Hilfe-Artikel: was-ist-albumwerk, album-teilen-qr

import { test, expect } from "../../support/fixtures";
import { bilderGeladen, shot } from "../../support/shot";

test("Besucher sieht ein geteiltes Album ohne Anmeldung", async ({ page, album }) => {
  // Bewusst ohne `anmelden`: das ist der Link, den ein Fotograf verschickt.
  await page.goto(`/publicAlbum/${album.id}`);

  const raster = page.getByTestId("bildraster");
  await expect(raster.locator("img")).toHaveCount(album.bildIds.length);
  await bilderGeladen(page);
  await shot(raster, "album-teilen-qr/02-oeffentliche-ansicht");

  // Alle Bilder tragen das Wasserzeichen — Originale gibt es hier nicht.
  const quellen = await raster.locator("img").evaluateAll((imgs) =>
    imgs.map((i) => (i as HTMLImageElement).src),
  );
  expect(quellen.every((src) => src.includes("/api/files/"))).toBe(true);
});
