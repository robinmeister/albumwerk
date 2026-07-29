// Workflow: Fotograf legt ein neues Shooting an.
// Hilfe-Artikel: album-anlegen

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { NEUES_ALBUM } from "../../support/data";
import { shot } from "../../support/shot";

test("Fotograf legt ein Shooting an", async ({ page, pb, anmelden }) => {
  try {
    await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
    await page.goto("/album");

    const neuesShooting = page.getByRole("button", { name: "Neues Shooting" });
    await expect(neuesShooting).toBeVisible();
    await shot(neuesShooting, "album-anlegen/01-neues-shooting");

    await neuesShooting.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Titel").fill(NEUES_ALBUM.title);
    await dialog.getByLabel("Beschreibung").fill(NEUES_ALBUM.description);
    await shot(dialog, "album-anlegen/02-formular");

    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(dialog).toBeHidden();

    const treffer = await pb.list("shootings", `title = "${NEUES_ALBUM.title}"`);
    expect(treffer).toHaveLength(1);
    expect(treffer[0].description).toBe(NEUES_ALBUM.description);

    // Sichtbares Ergebnis: das neue Shooting ist ausgewählt und zeigt seinen
    // Detailkopf. Der Titel steht mehrfach im DOM (Liste, Kopf, Kacheltext) —
    // die Überschrift ist die eindeutige Stelle.
    const detail = page.getByTestId("shooting-detail");
    await expect(detail.getByRole("heading", { name: NEUES_ALBUM.title })).toBeVisible();
    await shot(detail, "album-anlegen/03-angelegt");
  } finally {
    // Über die Oberfläche angelegte Records bekommen eine PocketBase-ID ohne
    // e2e-Präfix — der Prefix-Purge greift hier nicht. Aufgeräumt wird über den
    // Titel und nicht über eine vorher gemerkte ID, damit auch ein Abbruch
    // mitten im Test nichts liegen lässt.
    for (const rest of await pb.list("shootings", `title = "${NEUES_ALBUM.title}"`)) {
      await pb.delete("shootings", rest.id);
    }
  }
});
