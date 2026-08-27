// Workflow: Fotograf richtet sein Branding ein.
// Hilfe-Artikel: branding-einrichten
//
// Schreibt auf den globalen Settings-Record — läuft deshalb im Projekt
// "einstellungen": zuletzt (dependencies in playwright.config.ts) und seriell.
// Ohne das zeigt jeder parallel laufende Test eine halb umgefärbte App, und
// genau solche Screenshots landen sonst in der Doku.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";
import { shot } from "../../support/shot";
import { PbAdmin } from "../../support/pb";

test.describe.configure({ mode: "serial" });

const NEUER_NAME = "Atelier Lichtblick";

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

test("Fotograf ändert den Namen des Geschäfts", async ({ page, pb, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/branding");

  const abschnitt = page.getByTestId("abschnitt:Branding");
  const nameFeld = abschnitt.getByLabel("Name des Geschäfts");
  await expect(nameFeld).toBeVisible();
  await nameFeld.fill(NEUER_NAME);
  await shot(abschnitt, "branding-einrichten/01-name");

  // exact: die Zahlungs-Abschnitte haben Knöpfe namens "Speichern & prüfen",
  // ein /Speichern/-Regex greift den falschen (und deaktivierten) davon.
  await page.getByRole("button", { name: "Speichern", exact: true }).click();

  // Sichtbares Ergebnis: der Name schlägt in die Seitenleiste durch.
  await expect(page.getByText(NEUER_NAME).first()).toBeVisible();

  // Datenstand dahinter.
  const settings = await pb.get("settings", "appsettings0001");
  expect(settings.businessName).toBe(NEUER_NAME);
});

test("Fotograf wechselt das Design-Register und es überlebt den Neuladen", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/branding");

  // document.body selbst trägt keine Hintergrundfarbe — die AppShell malt sie
  // auf ihren eigenen Wurzel-Container. Die Seitenleiste (<aside>, Landmark
  // "complementary") ist ein stabiler, IDs-freier Ankerpunkt dafür und ihre
  // Fläche (--color-background-surface) unterscheidet sich zwischen den
  // Registern tatsächlich (Kontaktbogen #edeae1 vs. Riss #e9eef1 im Hellmodus).
  const seitenleiste = () =>
    page.getByRole("complementary").evaluate((el) => getComputedStyle(el).backgroundColor);
  const vorher = await seitenleiste();

  await page.getByTestId("preset:riss").click();
  // exact: die Zahlungs-Abschnitte haben Knöpfe namens "Speichern & prüfen",
  // ein /Speichern/-Regex greift den falschen (und deaktivierten) davon.
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByText("Einstellungen gespeichert")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("preset:riss")).toHaveAttribute("aria-pressed", "true");
  expect(await seitenleiste()).not.toBe(vorher);
});

test("eine eigene Farbe überlebt den Registerwechsel", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/branding");

  const abschnitt = page.getByTestId("abschnitt:Branding");
  await abschnitt.getByLabel("Primärfarbe").fill("#0066ff");
  await page.getByTestId("preset:passepartout").click();

  await expect(abschnitt.getByLabel("Primärfarbe")).toHaveValue("#0066ff");
  await expect(abschnitt.getByRole("button", { name: "Auf Preset zurücksetzen" }).first()).toBeVisible();
});
