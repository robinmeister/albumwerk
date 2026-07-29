// Workflow: Fotograf schreibt einen eigenen Hilfe-Artikel für seine Kunden.
// Hilfe-Artikel: eigene-hilfeartikel

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { shot } from "../../support/shot";

const TITEL = "Abholung im Studio";
const SLUG = "abholung-im-studio";

test("Fotograf legt einen eigenen Hilfe-Artikel an", async ({ page, pb, anmelden }) => {
  try {
    await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
    await page.goto("/help/manage");

    const neu = page.getByRole("button", { name: "Neuer Artikel" });
    await expect(neu).toBeVisible();
    await shot(neu, "eigene-hilfeartikel/01-neuer-artikel");
    await neu.click();

    // Das Formular öffnet sich eingebettet in der Seite, nicht als Dialog.
    const titel = page.getByLabel("Titel");
    await expect(titel).toBeVisible();
    await titel.fill(TITEL);
    await page
      .getByLabel("Kurzbeschreibung")
      .fill("Wann und wie du fertige Abzüge bei mir abholen kannst.");

    const formular = titel.locator("xpath=ancestor::form[1] | xpath=ancestor::*[self::section][1]");
    await shot(formular.first(), "eigene-hilfeartikel/02-formular");

    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(titel).toBeHidden();

    const gespeichert = await pb.list("helpArticles", `title = "${TITEL}"`);
    expect(gespeichert).toHaveLength(1);
    expect(gespeichert[0].slug).toBe(SLUG);

    await expect(page.getByText(TITEL, { exact: false }).first()).toBeVisible();
  } finally {
    for (const rest of await pb.list("helpArticles", `title = "${TITEL}"`)) {
      await pb.delete("helpArticles", rest.id);
    }
  }
});
