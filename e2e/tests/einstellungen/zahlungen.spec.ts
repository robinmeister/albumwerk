// Workflow: Fotograf richtet Zahlungen ein.
// Hilfe-Artikel: zahlungen-stripe, zahlungen-paypal
//
// Bewusst ohne echtes Speichern: „Speichern & prüfen" schickt den Schlüssel an
// Stripe bzw. PayPal (pb_hooks/stripe.pb.js, paypal.pb.js). Ein Test, der davon
// abhängt, wäre von fremden Diensten und Zugangsdaten abhängig — und für die
// Doku brauchen wir genau den Zustand davor: leere Felder plus Anleitung.
// Geprüft wird deshalb die Seite und ihre Führung, nicht der Netzwerkaufruf.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { shot } from "../../support/shot";

test.describe.configure({ mode: "serial" });

test("Fotograf findet die Einrichtung für Karte und PayPal", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/payments");

  const stripe = page.getByTestId("zahlungsart:stripe");
  await expect(stripe.getByLabel("Geheimer Stripe-Schlüssel")).toBeVisible();
  await shot(stripe, "zahlungen-stripe/01-schluesselfeld");

  // Ohne Schlüssel im Feld bleibt der Knopf gesperrt — das erklärt die Doku mit.
  await expect(stripe.getByRole("button", { name: "Speichern & prüfen" })).toBeDisabled();

  // Die Schritt-für-Schritt-Anleitung steht direkt auf der Seite; im Artikel
  // zeigen wir sie aufgeklappt.
  const anleitung = page.getByText("Anleitung: Stripe in 5 Schritten einrichten");
  await anleitung.click();
  await expect(page.getByText(/API-Schlüssel/).first()).toBeVisible();
  await shot(stripe, "zahlungen-stripe/02-anleitung");

  const paypal = page.getByTestId("zahlungsart:paypal");
  await expect(paypal.getByLabel("PayPal Client-ID")).toBeVisible();
  await expect(paypal.getByLabel("PayPal-Geschäftskonto (E-Mail)")).toBeVisible();
  await shot(paypal, "zahlungen-paypal/01-zugangsdaten");
});
