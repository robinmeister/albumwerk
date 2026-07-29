// Workflow: Fotograf teilt ein Album per Link, QR-Code oder Album-Code.
// Hilfe-Artikel: album-teilen-qr

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { shot } from "../../support/shot";

test("Fotograf teilt ein Album", async ({ page, album, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).first().click();

  // "Teilen" sitzt in der Aktionsleiste des Albums, nicht im Detailkopf.
  await page.getByRole("button", { name: "Teilen" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Album teilen" })).toBeVisible();

  // Der Album-Code ist die Shooting-ID — genau das gibt der Kunde unter
  // "Album hinzufügen" ein.
  await expect(dialog.getByText(album.id, { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Link kopieren" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "QR-Code herunterladen" })).toBeVisible();

  // Der QR-Code wird als <canvas> gezeichnet und braucht einen Moment.
  await expect(dialog.locator("canvas, svg").first()).toBeVisible();
  await shot(dialog, "album-teilen-qr/01-dialog");
});
