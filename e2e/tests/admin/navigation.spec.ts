// Workflow: Fotograf findet sich in der gruppierten Seitenleiste zurecht.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";

test("Gruppe der aktiven Route ist offen, andere bleiben zugeklappt", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/branding");

  const einstellungen = page.locator("details", { has: page.getByText("Einstellungen", { exact: true }) });
  await expect(einstellungen).toHaveAttribute("open", "");
  await expect(page.getByRole("button", { name: "Domain" })).toBeVisible();
});

test("zugeklappte Gruppe bleibt ueber einen Seitenwechsel zugeklappt", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");

  const verkauf = page.locator("details", { has: page.getByText("Verkauf", { exact: true }) });
  await verkauf.getByText("Verkauf", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Preise" })).toBeHidden();

  await page.goto("/users");
  await expect(page.getByRole("button", { name: "Preise" })).toBeHidden();
});
