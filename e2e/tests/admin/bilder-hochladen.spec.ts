// Workflow: Fotograf lädt Bilder in ein bestehendes Album.
// Hilfe-Artikel: bilder-hochladen

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { BEISPIELFOTOS } from "../../support/data";
import { bilderGeladen, shot } from "../../support/shot";

test("Fotograf lädt Bilder hoch", async ({ page, album, pb, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).first().click();

  const detail = page.getByTestId("shooting-detail");
  const hochladen = detail.getByRole("button", { name: "Bilder hochladen" });
  await expect(hochladen).toBeVisible();
  await shot(detail, "bilder-hochladen/01-album-oeffnen");

  await hochladen.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await shot(dialog, "bilder-hochladen/02-dialog");

  // react-dropzone hält ein verstecktes File-Input bereit; setInputFiles ist der
  // zuverlässige Weg — echtes Drag & Drop lässt sich nicht nachstellen.
  await dialog.locator('input[type="file"]').setInputFiles(BEISPIELFOTOS[1]);

  // Auf die Vorschau warten, nicht auf das Original: das Raster zeigt die
  // Wasserzeichen-Vorschauen, und die erzeugt previews.pb.js erst danach.
  await expect
    .poll(
      async () =>
        (await pb.list("images", `shootingId = "${album.id}" && type = "preview"`)).length,
      { timeout: 60_000, message: "Vorschau des hochgeladenen Bildes fehlt" },
    )
    .toBe(album.bildIds.length + 1);

  await dialog.getByRole("button", { name: "Fertig" }).click();
  await expect(dialog).toBeHidden();

  const raster = page.getByTestId("bildraster");
  await expect(raster.locator("img")).toHaveCount(album.bildIds.length + 1);
  await bilderGeladen(page);
  await shot(raster, "bilder-hochladen/03-im-album");
});
