// Workflow: Kundin öffnet eine Galerie, während der Verkauf gesperrt ist.
//
// Liegt im Projekt "einstellungen" (seriell, zuletzt), weil er den globalen
// Settings-Record verändert — parallel dazu würde jeder andere Kundentest
// eine gesperrte Kasse sehen.

import { test, expect } from "../../support/fixtures";
import { bilderGeladen } from "../../support/shot";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";
import { PbAdmin } from "../../support/pb";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenSichern(pb);
  // Genau einen harten Punkt öffnen.
  await pb.update("settings", "appsettings0001", { imprintHtml: "", privacyHtml: "" });
});

test.afterAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenWiederherstellen(pb);
});

test("Kundin sieht den Hinweis statt der Kasse, kann die Galerie aber ansehen", async ({ page, album, anmelden }) => {
  await anmelden(page, album.kundin.email, album.kundin.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).click();

  // Die Galerie selbst bleibt offen — nur der Kauf ist gesperrt.
  await expect(page.getByRole("button", { name: "Bilder auswählen" })).toBeVisible();

  // Der Kaufen-Knopf in der Aktionsleiste: erreichbar erst im Auswahlmodus.
  await bilderGeladen(page);
  await page.getByRole("button", { name: "Bilder auswählen" }).click();
  await page.getByTestId("bildraster").locator("img").first().click();

  const kaufen = page.getByRole("button", { name: "Kaufen" });
  await expect(kaufen).toBeDisabled();
  await expect(
    page.getByText("Der Bilderkauf ist gerade nicht möglich. Bitte später erneut versuchen."),
  ).toBeVisible();

  // Direktaufruf der Kasse: der maßgebliche Ort der Sperre.
  await page.goto("/pricing");
  await expect(page.getByTestId("kauf-gesperrt")).toBeVisible();
  await expect(
    page.getByText("Der Bilderkauf ist gerade nicht möglich. Bitte später erneut versuchen."),
  ).toBeVisible();
  // Der dreistufige Ablauf ist weg (data-testid aus PricingPage).
  await expect(page.getByTestId("bestellschritte")).toHaveCount(0);
});

test("beide Zahlungs-Endpunkte antworten 409, solange der Verkauf gesperrt ist", async ({ album, request }) => {
  const pb = new PbAdmin();
  await pb.login();
  const auth = await pb.userToken(album.kundin.email, album.kundin.password);

  // Der Guard sitzt vor der Preisberechnung — die Auswahl muss nur nicht leer
  // sein, nicht bepreisbar.
  const daten = {
    shootingId: album.id,
    imagePriceObjectList: [{ imageId: album.bildIds[0], price: [] }],
  };

  for (const pfad of [
    "/api/custom/paypal/create-order",
    "/api/custom/stripe/create-checkout-session",
  ]) {
    const antwort = await request.post(pfad, {
      headers: { Authorization: auth.token },
      data: daten,
    });
    expect(antwort.status(), pfad).toBe(409);
    expect((await antwort.json()).message, pfad).toBe("sale locked");
  }
});
