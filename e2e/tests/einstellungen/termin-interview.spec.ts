// Workflow: Fotograf richtet den Terminkalender im Interview ein.
//
// Ersetzt Fenster und schreibt auf den Settings-Record — deshalb im Projekt
// "einstellungen": zuletzt und seriell. Arten und Fenster werden vorher
// gesichert und danach zurückgeschrieben.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";
import { PbAdmin, PbRecord } from "../../support/pb";

test.describe.configure({ mode: "serial" });

let typesBefore: PbRecord[] = [];
let rulesBefore: PbRecord[] = [];

test.beforeAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenSichern(pb);
  typesBefore = await pb.list("appointmentTypes");
  rulesBefore = await pb.list("availabilityRules");
});

test.afterAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenWiederherstellen(pb);
  for (const rule of await pb.list("availabilityRules")) await pb.delete("availabilityRules", rule.id);
  for (const rule of rulesBefore) {
    const { id: _id, collectionId: _c, collectionName: _n, created: _cr, updated: _u, ...data } = rule;
    await pb.create("availabilityRules", data);
  }
  for (const type of await pb.list("appointmentTypes")) {
    const before = typesBefore.find((t) => t.id === type.id);
    if (before) {
      const { id: _id, collectionId: _c, collectionName: _n, created: _cr, updated: _u, ...data } = before;
      await pb.update("appointmentTypes", type.id, data);
    } else {
      await pb.delete("appointmentTypes", type.id);
    }
  }
});

test("Interview legt Leistung und Arbeitszeit an und zeigt Änderungen vorher an", async ({ page, pb, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/appointments/setup");
  const schritt = page.getByTestId("interview-schritt");
  const weiter = page.getByTestId("interview-weiter");

  // Frage 1: eine eigene Leistung dazu
  await expect(schritt).toHaveText("Was können Kund:innen bei dir buchen?");
  await page.getByLabel("Eigene Leistung").fill("E2E Newborn");
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(page.getByTestId("interview-aenderungen")).toContainText("„E2E Newborn“ wird neu angelegt");

  // Fragen 2–6 mit Vorbelegung durchklicken
  for (let i = 0; i < 6; i++) await weiter.click();

  // Frage 7: nur Samstag
  await expect(schritt).toHaveText("An welchen Tagen arbeitest du?");
  for (const tag of ["Mo", "Di", "Mi", "Do", "Fr", "So"]) {
    const kachel = page.getByRole("checkbox", { name: tag, exact: true });
    if (await kachel.isChecked()) await kachel.click({ force: true });
  }
  const samstag = page.getByRole("checkbox", { name: "Sa", exact: true });
  if (!(await samstag.isChecked())) await samstag.click({ force: true });
  await weiter.click();

  // Frage 8: nachmittags (weicht von den Seed-Zeiten ab, damit ein Hinweis erscheint)
  await page.getByRole("checkbox", { name: "Nachmittags 13–18" }).click({ force: true });
  await expect(page.getByTestId("interview-aenderungen")).toContainText("Sa 13:00 – 18:00");

  // bis zur Zusammenfassung
  for (let i = 0; i < 4; i++) await weiter.click();
  await expect(schritt).toHaveText("Das ändert sich");
  await expect(page.getByText("„E2E Newborn“ wird neu angelegt")).toBeVisible();

  await page.getByTestId("interview-uebernehmen").click();
  await expect(page).toHaveURL(/\/appointments\/availability$/);

  const newborn = await pb.list("appointmentTypes", 'slug = "e2e-newborn"');
  expect(newborn).toHaveLength(1);
  expect(newborn[0].active).toBe(true);
  const rules = await pb.list("availabilityRules", "active = true");
  expect(rules.map((r) => [r.weekday, r.startMinute, r.endMinute])).toEqual([[6, 780, 1080]]);
});
