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

  await page.getByPlaceholder("Suche nach Name oder E-Mail…").fill(album.kundin.lastName);

  // Nicht über die E-Mail suchen: die Spalte bleibt leer, weil users.emailVisibility
  // false ist und PocketBase das Feld deshalb auch Admins nicht ausliefert.
  const zeile = page.getByRole("row", { name: new RegExp(album.kundin.lastName) });
  await expect(zeile).toBeVisible();
  await shot(zeile, "nutzer-verwalten/01-suchen");

  // Adminrechte setzen und wieder zurücknehmen — der Test hinterlässt keinen
  // veränderten Rechtestand.
  // Der Schalter liegt außerhalb des row-Elements, deshalb über `main` gesucht —
  // die Suche oben hat die Liste bereits auf diesen einen Nutzer eingegrenzt.
  // force, weil Astryx ein gestaltetes Label über die eigentliche Checkbox legt:
  // Playwrights Klickbarkeitsprüfung hält sie sonst dauerhaft für verdeckt.
  const adminSchalter = page.locator('main input[type="checkbox"]');
  await adminSchalter.click({ force: true });
  await expect
    .poll(async () => (await pb.get("users", album.kundin.id)).isAdmin, {
      timeout: 15_000,
      message: "Adminrecht wurde nicht gespeichert",
    })
    .toBe(true);

  await adminSchalter.click({ force: true });
  await expect
    .poll(async () => (await pb.get("users", album.kundin.id)).isAdmin, { timeout: 15_000 })
    .toBe(false);
});
