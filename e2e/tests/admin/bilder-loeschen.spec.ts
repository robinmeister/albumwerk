// Workflow: Fotograf entfernt Bilder aus einem Album.
// Hilfe-Artikel: bild-sichtbarkeit (Abschnitt "Bilder entfernen")
//
// Eine Sichtbarkeits-Schaltfläche pro Bild gibt es nicht: was ein Kunde sieht,
// entscheidet der Shooting-Typ. Herausnehmen heißt löschen — genau das prüft
// dieser Test.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { bilderGeladen, shot } from "../../support/shot";

test("Fotograf entfernt ein Bild aus dem Album", async ({ page, album, pb, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).first().click();

  const raster = page.getByTestId("bildraster");
  await expect(raster.locator("img")).toHaveCount(album.bildIds.length);
  await bilderGeladen(page);

  await page.getByRole("button", { name: "Bilder auswählen" }).click();
  await raster.locator("img").first().click();
  // Der Zähler steht doppelt im DOM (Leiste und Kurzform) — erste Fundstelle reicht.
  await expect(page.getByText("1 ausgewählt").first()).toBeVisible();
  await shot(raster, "bild-sichtbarkeit/01-auswahl");

  await page.getByRole("button", { name: "Löschen", exact: true }).click();

  // Löschen fragt nach. Der Bestätigungsknopf heißt genauso wie der in der
  // Aktionsleiste dahinter — deshalb im Dialog suchen, nicht auf der Seite.
  const bestaetigung = page.getByRole("dialog");
  await expect(bestaetigung.getByText("Bist du dir sicher?")).toBeVisible();
  await shot(bestaetigung, "bild-sichtbarkeit/02-bestaetigen");
  await bestaetigung.getByRole("button", { name: "Löschen", exact: true }).click();

  await expect
    .poll(
      async () =>
        (await pb.list("images", `shootingId = "${album.id}" && type = "original"`)).length,
      { timeout: 30_000, message: "Bild wurde nicht gelöscht" },
    )
    .toBe(album.bildIds.length - 1);

  await expect(raster.locator("img")).toHaveCount(album.bildIds.length - 1);
});
