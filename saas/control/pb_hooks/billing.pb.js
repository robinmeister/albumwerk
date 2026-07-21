/// <reference path="../pb_data/types.d.ts" />
//
// Billing — VORBEREITET, noch kein Anbieter angebunden (Entscheidung
// Stripe Billing vs. Paddle fällt nach der Steuerberatung, siehe
// saas/README.md → „Billing anbinden").
//
// Bis dahin ist der Status-Wechsel im PB-Dashboard der manuelle Schalter
// (z. B. Zahlung per Überweisung): status → active schaltet die Instanz
// frei, status → suspended pausiert sie.

onRecordAfterUpdateSuccess((e) => {
  const lib = require(__hooks + "/lib/provisionlib.js");
  const before = e.record.original().getString("status");
  const after = e.record.getString("status");
  if (before === after) {
    e.next();
    return;
  }
  const uuid = e.record.getString("coolifyAppUuid");
  try {
    if (after === "active" && (before === "suspended" || before === "trial")) {
      if (before === "suspended" && uuid) lib.startInstance(uuid);
      e.app.logger().info("saas customer activated", "subdomain", e.record.getString("subdomain"));
    } else if (after === "suspended" && (before === "active" || before === "trial")) {
      if (uuid) lib.stopInstance(uuid);
      e.app.logger().info("saas customer suspended", "subdomain", e.record.getString("subdomain"));
    }
  } catch (err) {
    e.app.logger().error("saas status switch failed",
      "subdomain", e.record.getString("subdomain"), "error", String(err));
  }
  e.next();
}, "customers");

// --- Webhook-Stub für den späteren Billing-Anbieter --------------------------
// Hier dockt Stripe Billing ODER Paddle an. Beim Anbinden sind genau drei
// Dinge zu tun:
//   1. Signatur des Webhooks prüfen (Stripe: `Stripe-Signature`-Header +
//      Webhook-Secret; Paddle: `Paddle-Signature`).
//   2. Events auf Status mappen:
//      - subscription aktiv/bezahlt  → customers.status = "active"
//        (+ trialEndsAt leeren; billing.pb.js oben startet die Instanz)
//      - Zahlung fehlgeschlagen/gekündigt → nach Kulanzfrist status = "suspended"
//   3. Kunden-Zuordnung: beim Checkout die customers-Record-ID als
//      client_reference_id/custom_data mitgeben und hier auflösen.
routerAdd("POST", "/api/saas/billing-webhook", (e) => {
  return e.json(501, {
    status: "error",
    message: "Billing ist noch nicht angebunden (siehe saas/README.md).",
  });
});
