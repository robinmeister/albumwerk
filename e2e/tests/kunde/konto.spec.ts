// Workflow: Kundin pflegt ihre Kontaktdaten.
// Hilfe-Artikel: konto-passwort
//
// Die Adresse ist kein Selbstzweck: bei Abzügen und Leinwänden geht die
// Bestellung genau dorthin.

import { test, expect } from "../../support/fixtures";
import { shot } from "../../support/shot";

const NEUE_STRASSE = "Uferpromenade 5";

test("Kundin ändert ihre Adresse", async ({ page, album, pb, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/profile");

  await expect(page.getByRole("heading", { name: "Adressinformationen" })).toBeVisible();
  const strasse = page.getByLabel("Straße");
  await strasse.fill(NEUE_STRASSE);
  await shot(page.locator("form"), "konto-passwort/02-adresse");

  await page.getByRole("button", { name: "Speichern", exact: true }).click();

  await expect
    .poll(async () => (await pb.get("users", album.kundin.id)).street, {
      timeout: 15_000,
      message: "Adresse wurde nicht gespeichert",
    })
    .toBe(NEUE_STRASSE);
});
