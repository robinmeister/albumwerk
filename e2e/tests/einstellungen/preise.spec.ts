// Workflow: Fotograf legt ein Produkt in seinem Preiskatalog an.
// Hilfe-Artikel: preise-pakete
//
// Preise liegen zwar in einer eigenen Collection, tauchen aber in jedem
// Bestellvorgang auf: legt dieser Test parallel zu einem Kundentest ein Produkt
// an, ändert sich dessen Preisliste mitten im Lauf. Deshalb seriell und zuletzt.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { shot } from "../../support/shot";

test.describe.configure({ mode: "serial" });

const PRODUKT = {
  groesse: "30×40 cm",
  betrag: "34",
  titel: "Feinkorn-Abzug 30×40",
  beschreibung: "Baryt-Papier, matt, ohne Rahmen",
};

test("Fotograf legt ein neues Produkt an", async ({ page, pb, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/pricing");

  try {
    await page.getByRole("button", { name: "Neues Produkt" }).click();
    await expect(page.getByRole("heading", { name: "Neues Produkt" })).toBeVisible();

    await page.getByLabel("Produktart").click();
    await page.getByRole("option", { name: "Abzug", exact: true }).click();
    await page.getByLabel("Größe").fill(PRODUKT.groesse);
    await page.getByLabel("Preis (€)").fill(PRODUKT.betrag);
    await page.getByLabel("Titel (optional)").fill(PRODUKT.titel);
    await page.getByLabel("Beschreibung").fill(PRODUKT.beschreibung);
    await shot(page.getByTestId("preisformular"), "preise-pakete/01-neues-produkt");

    await page.getByRole("button", { name: "Speichern", exact: true }).click();

    // Datenstand: das Produkt steht im Katalog …
    await expect
      .poll(async () => (await pb.list("prices", `title = "${PRODUKT.titel}"`)).length, {
        timeout: 15_000,
        message: "Produkt wurde nicht gespeichert",
      })
      .toBe(1);

    // … und sichtbar in der Liste links.
    await expect(page.getByText(PRODUKT.titel).first()).toBeVisible();
    await shot(page.locator("main"), "preise-pakete/02-katalog");
  } finally {
    for (const rest of await pb.list("prices", `title = "${PRODUKT.titel}"`)) {
      await pb.delete("prices", rest.id);
    }
  }
});
