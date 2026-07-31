// Workflow: Kundin stellt eine Support-Anfrage an ihren Fotografen.
// Hilfe-Artikel: hilfe-anfordern

import { test, expect } from "../../support/fixtures";
import { shot } from "../../support/shot";

const BETREFF = "Frage zum Abzugsformat";
const TEXT = "Kann ich Bild 2 auch im Format 20x30 bekommen?";

test("Kundin stellt eine Anfrage", async ({ page, album, pb, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/support");

  const neu = page.getByRole("button", { name: "Neue Anfrage" }).first();
  await expect(neu).toBeVisible();
  await shot(neu, "hilfe-anfordern/01-neue-anfrage");
  await neu.click();

  await page.getByLabel("Betreff").fill(BETREFF);
  await page.getByLabel("Beschreibung").fill(TEXT);
  await shot(page.getByTestId("anfrage-formular"), "hilfe-anfordern/02-formular");

  await page.getByRole("button", { name: "Anfrage senden" }).click();

  await expect
    .poll(async () => (await pb.list("supportTickets", `userId = "${album.kundin.id}"`)).length, {
      timeout: 30_000,
      message: "Anfrage wurde nicht gespeichert",
    })
    .toBe(1);

  await expect(page.getByText(BETREFF, { exact: false }).first()).toBeVisible();
});
