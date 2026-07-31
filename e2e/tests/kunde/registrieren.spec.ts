// Workflow: Neuer Kunde legt sich über den Album-Link ein Konto an.
// Hilfe-Artikel: album-oeffnen (Abschnitt Registrierung)

import { test, expect } from "../../support/fixtures";
import { NEUER_KUNDE } from "../../support/data";
import { shot } from "../../support/shot";

test("Neuer Kunde registriert sich über den Album-Link", async ({ page, album, pb }) => {
  try {
    // Query-Parameter, nicht Pfadsegment: SignUpPage liest `searchParams`,
    // die Route `/signUp/:shootingId` in App.tsx ist toter Code.
    await page.goto(`/signUp?shootingId=${album.id}`);

    const formular = page.locator("form").first();
    await page.getByLabel("Vorname").fill(NEUER_KUNDE.firstName);
    await page.getByLabel("Nachname").fill(NEUER_KUNDE.lastName);
    await page.getByLabel("E-Mail-Adresse").fill(NEUER_KUNDE.email);
    await page.getByLabel("Passwort").fill(NEUER_KUNDE.password);
    await shot(formular, "album-oeffnen/03-registrieren");

    await page.getByRole("button", { name: "Registrieren" }).click();

    await expect
      .poll(async () => (await pb.list("users", `email = "${NEUER_KUNDE.email}"`)).length, {
        timeout: 30_000,
        message: "Konto wurde nicht angelegt",
      })
      .toBe(1);

    // Das Album aus dem Link hängt direkt am neuen Konto — genau dafür ist der
    // Link da, der Kunde muss keinen Code eintippen.
    const neu = (await pb.list("users", `email = "${NEUER_KUNDE.email}"`))[0];
    expect(neu.shootingIds).toContain(album.id);
  } finally {
    for (const rest of await pb.list("users", `email = "${NEUER_KUNDE.email}"`)) {
      await pb.deleteDependents(rest.id);
      await pb.delete("users", rest.id);
    }
  }
});
