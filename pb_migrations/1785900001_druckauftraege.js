/// <reference path="../pb_data/types.d.ts" />
// Druckaufträge über Prodigi (docs/superpowers/specs/2026-10-01-druckauftraege-design.md).
//
// printJobs schreiben nur Hooks (app.save()) — die Admin-Oberfläche ändert per
// API einzig den Lieferweg. Kund:innen sehen die Sammlung gar nicht: Laborkosten
// und Prodigi-Fehler gehen sie nichts an, und an `orders` lassen sich einzelne
// Felder nicht sperren.
migrate((app) => {
  const prices = app.findCollectionByNameOrId("prices");
  prices.fields.add(new Field({
    name: "labSku", id: "txt_price_labsku", type: "text",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(prices);

  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new Field({
    name: "country", id: "txt_user_country", type: "text", max: 2,
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(users);

  const settings = app.findCollectionByNameOrId("settings");
  // wie stripeSecretKey: versteckt, nur Hooks lesen und schreiben ihn
  settings.fields.add(new Field({
    name: "prodigiApiKey", id: "txt_set_prodigikey", type: "text",
    required: false, hidden: true, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "prodigiEnabled", id: "bool_set_prodigion", type: "bool",
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "prodigiLive", id: "bool_set_prodigilive", type: "bool",
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "printDefaultRoute", id: "sel_set_printroute", type: "select", maxSelect: 1,
    values: ["customer", "studio"],
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "studioAddress", id: "json_set_studioaddr", type: "json", maxSize: 0,
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "shippingFlat", id: "num_set_shipflat", type: "number",
    required: false, hidden: false, presentable: false, system: false,
  }));
  settings.fields.add(new Field({
    name: "freeShippingFrom", id: "num_set_shipfree", type: "number",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(settings);

  const jobs = new Collection({
    name: "printJobs",
    type: "base",
    system: false,
    listRule: "@request.auth.isAdmin = true",
    viewRule: "@request.auth.isAdmin = true",
    createRule: null,
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: null,
    indexes: [
      "CREATE INDEX idx_pj_order ON printJobs (orderId)",
      "CREATE INDEX idx_pj_lab ON printJobs (labOrderId)",
    ],
    fields: [
      { name: "orderId", id: "txt_pj_order", type: "text", max: 0, min: 0, pattern: "", required: true, hidden: false, presentable: true, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "route", id: "sel_pj_route", type: "select", maxSelect: 1, values: ["customer", "studio"], required: true, hidden: false, presentable: false, system: false },
      { name: "recipient", id: "json_pj_recip", type: "json", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      { name: "items", id: "json_pj_items", type: "json", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      { name: "status", id: "sel_pj_status", type: "select", maxSelect: 1, values: ["awaiting_approval", "submitted", "in_production", "shipped", "delivered_to_customer", "cancelled", "failed"], required: true, hidden: false, presentable: false, system: false },
      { name: "labOrderId", id: "txt_pj_labid", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "trackingUrl", id: "txt_pj_trackurl", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "trackingNumber", id: "txt_pj_tracknr", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "labCost", id: "txt_pj_cost", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "error", id: "txt_pj_error", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // Zugang für Prodigi zu den Originalen, siehe /api/custom/printfile
      { name: "fileToken", id: "txt_pj_ftoken", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: true, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "fileTokenExpires", id: "num_pj_fexp", type: "number", required: false, hidden: true, presentable: false, system: false },
      { name: "created", id: "autodate_pj_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_pj_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(jobs);

  // Vorgaben für bestehende Instanzen: direkt an Kund:in, Versand noch nicht gesetzt
  try {
    const s = app.findRecordById("settings", "appsettings0001");
    s.set("printDefaultRoute", "customer");
    app.save(s);
  } catch (_) {
    // noch nicht geseedet
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("printJobs")); } catch (_) { /* schon weg */ }
  const settings = app.findCollectionByNameOrId("settings");
  ["prodigiApiKey", "prodigiEnabled", "prodigiLive", "printDefaultRoute", "studioAddress", "shippingFlat", "freeShippingFrom"]
    .forEach((n) => settings.fields.removeByName(n));
  app.save(settings);
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("country");
  app.save(users);
  const prices = app.findCollectionByNameOrId("prices");
  prices.fields.removeByName("labSku");
  app.save(prices);
});
