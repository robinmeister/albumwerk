// Workflow: Fotograf sucht einen Kunden und vergibt Adminrechte.
// Hilfe-Artikel: nutzer-verwalten

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { shot } from "../../support/shot";

test("Fotograf findet einen Kunden und ändert die Rechte", async ({
  page,
  album,
  pb,
  anmelden,
}) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/users");

  await page.getByPlaceholder("Suche nach Name oder E-Mail…").fill(album.kundin.email);

  // Die E-Mail-Spalte ist nur befüllt, weil der Enrich-Hook in users_guard.pb.js
  // Admins die Adresse trotz emailVisibility=false ausliefert.
  const zeile = page.getByRole("row", { name: new RegExp(album.kundin.lastName) });
  await expect(zeile).toContainText(album.kundin.email);
  // Die ganze Tabelle, nicht nur die Zeile: ohne die Spaltenköpfe ist im Bild
  // nicht zu erkennen, was die Spalten bedeuten.
  await shot(page.locator("table"), "nutzer-verwalten/01-suchen");

  // Adminrechte setzen und wieder zurücknehmen — der Test hinterlässt keinen
  // veränderten Rechtestand. Beides läuft über den Dialog und verlangt die
  // E-Mail-Adresse als Bestätigung.
  await zeile.click();
  const dialog = page.getByRole("dialog");
  const bestaetigung = dialog.getByPlaceholder(album.kundin.email);

  await dialog.getByRole("button", { name: "Zum Admin machen" }).click();
  await bestaetigung.fill(album.kundin.email);
  await dialog.getByRole("button", { name: "Admin-Rechte vergeben" }).click();
  await expect
    .poll(async () => (await pb.get("users", album.kundin.id)).isAdmin, {
      timeout: 15_000,
      message: "Adminrecht wurde nicht gespeichert",
    })
    .toBe(true);

  await dialog.getByRole("button", { name: "Admin-Rechte entziehen" }).click();
  await bestaetigung.fill(album.kundin.email);
  await dialog.getByRole("button", { name: "Rechte entziehen", exact: true }).click();
  await expect
    .poll(async () => (await pb.get("users", album.kundin.id)).isAdmin, { timeout: 15_000 })
    .toBe(false);
});
