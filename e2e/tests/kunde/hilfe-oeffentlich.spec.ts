// Workflow: Besucher nutzt die Hilfeseite ohne Konto.
// Hilfe-Artikel: was-ist-albumwerk
//
// Prüft zugleich die Sichtbarkeitsregel: ausgeloggt darf nur erscheinen, was
// als "public" markiert ist — keine Admin-Anleitungen.

import { test, expect } from "../../support/fixtures";
import { shot } from "../../support/shot";

test("Besucher findet Hilfe ohne Anmeldung", async ({ page }) => {
  await page.goto("/help");

  await expect(page.getByRole("heading", { name: "Wie können wir helfen?" })).toBeVisible();
  await shot(page.getByTestId("hilfe-hero"), "was-ist-albumwerk/01-hilfeseite");

  // Kein Admin-Artikel für Ausgeloggte.
  await expect(page.getByText("Erste Schritte als Fotograf")).toHaveCount(0);
  await expect(page.getByText("Zahlungen mit PayPal")).toHaveCount(0);

  await page.getByLabel("Hilfe durchsuchen").fill("Album");
  await expect(page.getByText(/Ergebnis|Ergebnisse/).first()).toBeVisible();
});
