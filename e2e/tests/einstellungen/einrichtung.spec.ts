// Workflow: Fotograf sieht, was bis zum Verkauf noch fehlt.
// Hilfe-Artikel: erste-schritte-admin
//
// Schreibt auf den globalen Settings-Record — deshalb im Projekt
// "einstellungen": zuletzt und seriell.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";
import { PbAdmin } from "../../support/pb";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenSichern(pb);
});

test.afterAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenWiederherstellen(pb);
});

test("offene Pflichtpunkte stehen auf der Checkliste und im Badge", async ({ page, pb, anmelden }) => {
  // Der Demo-Seed erfüllt alle vier harten Punkte. Für eine eindeutige Zahl
  // im Badge wird hier genau einer wieder geöffnet: recht.
  await pb.update("settings", "appsettings0001", {
    paypalEnabled: true,
    imprintHtml: "",
    privacyHtml: "",
  });

  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/einrichtung");

  await expect(page.getByText("Noch 1 Ding bis zum Verkauf der Fotos")).toBeVisible();
  await expect(page.getByTestId("einrichtung-badge")).toHaveText("1");

  const recht = page.getByTestId("punkt:recht");
  await expect(recht.getByRole("button", { name: "Einrichten" })).toBeVisible();
  await recht.getByRole("button", { name: "Einrichten" }).click();
  await expect(page).toHaveURL(/\/legal$/);
});

test("mit vollstaendiger Einrichtung verschwinden Badge und Warnung", async ({ page, pb, anmelden }) => {
  await pb.update("settings", "appsettings0001", {
    imprintHtml: "<p>Impressum</p>",
    privacyHtml: "<p>Datenschutz</p>",
    orderNotificationEmail: "bestellungen@demo.test",
    paypalEnabled: true,
  });

  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/einrichtung");

  await expect(page.getByText("Du kannst deine Fotos verkaufen.")).toBeVisible();
  await expect(page.getByTestId("einrichtung-badge")).toHaveCount(0);
});
