// Workflow: Fotograf erzeugt Impressum und Datenschutzerklärung.
// Hilfe-Artikel: rechtstexte
//
// Schreibt auf den globalen Settings-Record (imprintHtml/privacyHtml) — läuft
// deshalb im seriellen Projekt "einstellungen" und stellt den Ausgangszustand
// danach wieder her.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";
import { shot } from "../../support/shot";
import { PbAdmin } from "../../support/pb";

test.describe.configure({ mode: "serial" });

const BETRIEB = {
  name: "Atelier Lichtblick",
  strasse: "Seilerstraße 12",
  ort: "20359 Hamburg",
  email: "kontakt@atelier-lichtblick.example",
};

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

test("Fotograf erzeugt und speichert seine Rechtstexte", async ({ page, pb, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/legal");

  const angaben = page.getByTestId("abschnitt:Angaben zum Betrieb");
  await expect(angaben).toBeVisible();
  await angaben.getByLabel("Name / Firma").fill(BETRIEB.name);
  await angaben.getByLabel("Straße und Hausnummer").fill(BETRIEB.strasse);
  await angaben.getByLabel("PLZ und Ort").fill(BETRIEB.ort);
  await angaben.getByLabel("E-Mail", { exact: true }).fill(BETRIEB.email);
  await shot(angaben, "rechtstexte/01-betriebsdaten");

  // Erst mit vollständigen Angaben werden die Erzeugen-Knöpfe aktiv.
  const erzeugen = page.getByRole("button", { name: "Standard-Impressum erzeugen" });
  await expect(erzeugen).toBeEnabled();
  await erzeugen.click();
  await page.getByRole("button", { name: "Datenschutzerklärung erzeugen" }).click();

  // Der Editor lädt lazy (TipTap) — er ist erst nach dem Chunk da.
  const impressum = page.getByTestId("abschnitt:Impressum");
  // .first(): der Editor rendert die Adresse in Anschrift und Kontaktblock.
  await expect(impressum.getByText(BETRIEB.strasse).first()).toBeVisible({ timeout: 30_000 });
  await shot(impressum, "rechtstexte/02-erzeugtes-impressum");

  await page.getByRole("button", { name: "Speichern", exact: true }).click();

  await expect
    .poll(async () => (await pb.get("settings", "appsettings0001")).imprintHtml as string, {
      timeout: 15_000,
      message: "Impressum wurde nicht gespeichert",
    })
    .toContain(BETRIEB.strasse);

  // Sichtbares Ergebnis: /imprint zeigt den Text. Die Route liegt im
  // öffentlichen Block von App.tsx — dass sie auch ohne Anmeldung trägt,
  // prüft hilfe-oeffentlich.spec.ts für denselben Layout-Pfad.
  await page.goto("/imprint");
  await expect(page.getByText(BETRIEB.strasse).first()).toBeVisible();
});
