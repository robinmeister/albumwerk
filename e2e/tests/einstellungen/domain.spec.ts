// Workflow: Eigene Domain — selbst gehostet einrichten, verwaltet anfragen.
// Hilfe-Artikel: custom-domain
//
// Schreibt auf den globalen Settings-Record und legt Tickets an — deshalb im
// Projekt "einstellungen": zuletzt und seriell.
//
// Die verwaltete Betriebsart haengt an der Server-Umgebung (SAAS_CONTROL_URL).
// Die laesst sich mitten im Testlauf nicht umstellen, ohne den Container neu
// zu starten; deshalb wird nur die eine Auskunft abgefangen, die daraus
// abgeleitet wird. Alles dahinter — Ticket, Weiterleitung, Speichern — laeuft
// echt gegen die Instanz.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { PbAdmin } from "../../support/pb";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";

test.describe.configure({ mode: "serial" });

// Die Anfrage legt ein echtes Ticket an. Vorher UND nachher aufraeumen: sonst
// zaehlt ein Rest aus einem abgebrochenen Lauf mit und der Test schlaegt aus
// einem Grund fehl, der nichts mit dem Code zu tun hat.
async function anfragenAufraeumen(pb: PbAdmin): Promise<void> {
  for (const ticket of await pb.list("supportTickets", 'subject ~ "Eigene Domain:"')) {
    await pb.delete("supportTickets", ticket.id);
  }
}

test.beforeAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenSichern(pb);
  await anfragenAufraeumen(pb);
});

test.afterAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenWiederherstellen(pb);
  await anfragenAufraeumen(pb);
});

test("selbst gehostet bleibt es beim Eintragen und Pruefen", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/domain");

  // Die Dev-Instanz laeuft ohne SAAS_CONTROL_URL — also der Selbsthoster-Fall,
  // ohne Stub.
  const abschnitt = page.getByTestId("abschnitt:Eigene Domain");
  await expect(abschnitt.getByRole("button", { name: "Domain prüfen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Speichern" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Domain anfragen" })).toHaveCount(0);
  // Der A-Record-Weg gilt nur hier: eine verwaltete Instanz hat keinen eigenen
  // Server, auf dessen IP man zeigen koennte.
  await expect(abschnitt.getByText("A-Record", { exact: true })).toBeVisible();
});

test("verwaltet wird angefragt statt selbst eingetragen", async ({ page, anmelden }) => {
  await page.route("**/api/custom/betrieb", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ verwaltet: true, instanz: "kunde.albumwerk.de" }),
    }),
  );

  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/domain");

  await expect(page.getByRole("button", { name: "Domain anfragen" })).toBeVisible();
  // Kein zweiter Knopf, der so aussieht, als taete er dasselbe.
  await expect(page.getByRole("button", { name: "Speichern" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Domain prüfen" })).toHaveCount(0);

  // Der Kostenhinweis und die Anleitung muessen sichtbar sein, nicht hinter
  // dem Aufklapp-Pfeil des Banners liegen.
  const abschnitt = page.getByTestId("abschnitt:Eigene Domain");
  // Der Preis muss dastehen, nicht nur "kostenpflichtig" — sonst kommt genau
  // die Rueckfrage, die er ersparen soll.
  await expect(abschnitt.getByText("einmalig 39 €", { exact: false })).toBeVisible();
  await expect(abschnitt.getByText("kunde.albumwerk.de", { exact: false })).toBeVisible();
  await expect(abschnitt.getByText("A-Record", { exact: true })).toHaveCount(0);
});

const verwaltetStubben = async (page: import("@playwright/test").Page) => {
  await page.route("**/api/custom/betrieb", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ verwaltet: true, instanz: "kunde.albumwerk.de" }),
    }),
  );
};

test("die Anfrage legt ein Ticket an und meldet die Zustellung", async ({
  page,
  pb,
  anmelden,
}) => {
  await verwaltetStubben(page);
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/domain");

  await page.getByRole("textbox", { name: "Domain" }).fill("fotos.kunde-test.de");
  await page.getByRole("button", { name: "Domain anfragen" }).click();

  await expect(page.getByText("Anfrage gesendet", { exact: false })).toBeVisible();

  const tickets = await pb.list("supportTickets", 'subject = "Eigene Domain: fotos.kunde-test.de"');
  expect(tickets).toHaveLength(1);

  // Der Wunsch steht im Settings-Record, damit die Seite ihn nach einem
  // Neuladen wiederfindet — es gibt kein eigenes Statusfeld.
  const settings = await pb.get("settings", "appsettings0001");
  expect(settings.customDomain).toBe("fotos.kunde-test.de");
});

test("scheitert nur die Zustellung, heisst es nicht 'nicht gesendet'", async ({
  page,
  pb,
  anmelden,
}) => {
  await verwaltetStubben(page);
  // support.pb.js leitet beim Anlegen weiter, die Seite liest danach nur
  // forwardState am Ticket. Der Fehlschlag wird dort vorgetäuscht, weil die
  // Dev-Instanz sonst erfolgreich per Mail zustellt.
  await page.route("**/api/collections/supportTickets/records/*", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), forwardState: "failed" } });
  });

  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/domain");

  await page.getByRole("textbox", { name: "Domain" }).fill("fotos.zweite-kunde.de");
  await page.getByRole("button", { name: "Domain anfragen" }).click();

  // Das Ticket ist angelegt — "konnte nicht gesendet werden" waere gelogen.
  await expect(page.getByText("Anfrage gespeichert", { exact: false })).toBeVisible();
  const tickets = await pb.list("supportTickets", 'subject = "Eigene Domain: fotos.zweite-kunde.de"');
  expect(tickets).toHaveLength(1);
});
