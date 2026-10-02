/// <reference path="../pb_data/types.d.ts" />
//
// Kundenseite „Drucke“ (docs/superpowers/specs/2026-10-02-kunden-drucke-design.md).
//
//   GET /api/custom/drucke   bestellte Drucke der angemeldeten Kundin
//   finishedOrders create    „Abschicken“ → Mail an die Kundin bei Handdrucken

// printJobs ist nur für Admins lesbar (Laborkosten, Prodigi-Fehler). Die
// Kundin bekommt hier eine bereinigte Sicht — und immer nur die eigene:
// userId kommt aus der Anmeldung, nie aus dem Request.
routerAdd("GET", "/api/custom/drucke", (e) => {
  const dl = require(__hooks + "/lib/druckelib.js");
  return e.json(200, dl.ordersView(e.app, e.auth.id));
}, $apis.requireAuth());

onRecordAfterCreateSuccess((e) => {
  try {
    const dl = require(__hooks + "/lib/druckelib.js");
    const pm = require(__hooks + "/lib/printmaillib.js");
    const finished = e.record;
    const orderId = finished.getString("orderId");
    let order = null;
    try { order = e.app.findRecordById("orders", orderId); } catch (_) { order = null; }
    const decision = order ? dl.shipmentMailDecision(e.app, order, finished) : null;
    if (decision) {
      let to = "";
      try { to = String(JSON.parse(order.getString("userData") || "{}").email || ""); } catch (_) { to = ""; }
      if (!to) {
        try { to = e.app.findRecordById("users", order.getString("userId")).email(); } catch (_) { to = ""; }
      }
      pm.notifyShipped(e.app, to, finished.getString("trackingNumber"), finished.getString("trackingUrl"), decision.partial);
    }
  } catch (err) {
    // „Abschicken“ ist gespeichert — eine fehlende Mail darf das nicht kippen
    e.app.logger().warn("manual shipment mail failed", "error", String(err));
  }
  e.next();
}, "finishedOrders");
