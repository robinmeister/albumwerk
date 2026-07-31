// Workflow: Kundin legt Bilder in eine Bestellung und geht bis zur Bezahlseite.
// Hilfe-Artikel: bestellen-bezahlen
//
// Der Test endet vor der Bezahlung. PayPal und Stripe rendern in fremden
// Iframes; ohne Sandbox-Zugangsdaten wäre alles dahinter nicht prüfbar — und
// ein Screenshot fremder Oberflächen gehörte ohnehin nicht in diese Doku.
//
// Bewusst wird hier kein `orders`-Datensatz geprüft: die Bestellung entsteht
// erst serverseitig nach verifizierter Zahlung (pb_hooks/paypal.pb.js,
// stripe.pb.js). Bis zur Bezahlseite existiert nur der lokale Entwurf.

import { test, expect } from "../../support/fixtures";
import { bilderGeladen, shot } from "../../support/shot";

test("Kundin stellt eine Bestellung zusammen", async ({ page, album, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).click();

  const raster = page.getByTestId("bildraster");
  await bilderGeladen(page);
  await page.getByRole("button", { name: "Bilder auswählen" }).click();
  await raster.locator("img").first().click();
  await expect(page.getByText("1 ausgewählt").first()).toBeVisible();

  await page.getByRole("button", { name: "Kaufen" }).click();
  await page.waitForURL("**/pricing");

  // Die Preisseite führt in Schritten: erst Produkte wählen, dann bezahlen,
  // dann herunterladen. Die Seitenüberschrift ist der Albumtitel.
  const schritte = page.getByTestId("bestellschritte");
  await expect(schritte).toBeVisible();
  await shot(schritte, "bestellen-bezahlen/01-schritte");

  // Jedes Bild braucht mindestens ein Produkt, sonst bleibt „Weiter zur
  // Bezahlung" deaktiviert.
  const weiter = page.getByRole("button", { name: "Weiter zur Bezahlung" });
  await expect(weiter).toBeDisabled();
  await page.getByRole("button", { name: "Mehr" }).first().click();
  await expect(page.getByText("Alle Bilder bepreist")).toBeVisible();
  await shot(page.locator("main"), "bestellen-bezahlen/02-produkt-waehlen");

  await expect(weiter).toBeEnabled();
  await weiter.click();

  // Schritt 2: Kontaktdaten und Zahlart. Die Kontaktdaten kommen aus dem Profil.
  await expect(page.getByText("Bestellübersicht")).toBeVisible();
  const kontakt = page.getByLabel("Vorname");
  await expect(kontakt).toHaveValue(album.kundin.firstName);
  await shot(page.locator("main"), "bestellen-bezahlen/03-bezahlseite");
});
