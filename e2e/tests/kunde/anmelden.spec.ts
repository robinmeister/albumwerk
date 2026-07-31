// Workflow: Kundin meldet sich an.
// Hilfe-Artikel: konto-passwort
//
// Der einzige Test, der die Anmeldung wirklich durchklickt. Alle anderen setzen
// den Anmeldestatus direkt (support/fixtures.ts) — sonst würde jeder Test
// dieselben drei Felder ausfüllen und dabei nichts Neues prüfen.

import { test, expect } from "../../support/fixtures";
import { shot } from "../../support/shot";

test("Kundin meldet sich an", async ({ page, album }) => {
  await page.goto("/login");

  const formular = page.locator("form").first();
  await page.getByLabel("E-Mail-Adresse").fill(album.kundin.email);
  await page.getByLabel("Passwort").fill(album.kundin.password);
  await shot(formular, "konto-passwort/01-anmelden");

  await page.getByRole("button", { name: "Anmelden" }).click();

  await page.waitForURL("**/album");
  await expect(page.getByText(album.title, { exact: true })).toBeVisible();
});

test("Falsches Passwort meldet einen Fehler", async ({ page, album }) => {
  await page.goto("/login");
  await page.getByLabel("E-Mail-Adresse").fill(album.kundin.email);
  await page.getByLabel("Passwort").fill("definitiv-falsch");
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Kein Durchkommen, und die Seite bleibt bedienbar (keine weiße Seite).
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
});
