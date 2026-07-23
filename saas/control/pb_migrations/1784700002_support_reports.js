/// <reference path="../pb_data/types.d.ts" />
// Control-Plane-Schema: zentraler Support-Eingang des Herstellers.
// Ein Record pro von einer Kunden-Instanz weitergeleitetem Ticket.
//
// Alle API-Rules sind null (nur Superuser) — Instanzen schreiben ausschließlich
// über den Custom-Endpoint in pb_hooks/support.pb.js, gelesen/beantwortet wird
// im PB-Dashboard (wie bei `customers`).
//
// Status-Lebenszyklus:  new → in_progress → answered → closed
migrate((app) => {
  const collection = new Collection({
    name: "supportReports",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      // Herkunft
      { name: "instanceUrl", id: "txt_sr_url", type: "text", required: true },
      { name: "customerId", id: "rel_sr_cust", type: "relation", collectionId: app.findCollectionByNameOrId("customers").id, cascadeDelete: false, minSelect: 0, maxSelect: 1, required: false },
      { name: "selfHosted", id: "bool_sr_self", type: "bool" },
      { name: "businessName", id: "txt_sr_biz", type: "text" },
      { name: "appVersion", id: "txt_sr_ver", type: "text" },
      // Ticket
      { name: "subject", id: "txt_sr_subj", type: "text", required: true, presentable: true },
      { name: "category", id: "txt_sr_cat", type: "text" },
      { name: "body", id: "txt_sr_body", type: "text", max: 20000 },
      { name: "context", id: "json_sr_ctx", type: "json", maxSize: 0 },
      { name: "note", id: "txt_sr_note", type: "text", max: 2000 },
      { name: "ticketRef", id: "txt_sr_ref", type: "text" },
      // Kontakt — reporter* nur befüllt, wenn der Melder eingewilligt hat
      { name: "reporterEmail", id: "txt_sr_repmail", type: "text" },
      { name: "reporterName", id: "txt_sr_repname", type: "text" },
      { name: "adminEmail", id: "txt_sr_admmail", type: "text" },
      // Bearbeitung
      {
        name: "status", id: "sel_sr_status", type: "select", required: true,
        maxSelect: 1, values: ["new", "in_progress", "answered", "closed"],
      },
      { name: "notes", id: "txt_sr_notes", type: "text", max: 5000 },
      { name: "created", id: "auto_sr_created", type: "autodate", onCreate: true },
      { name: "updated", id: "auto_sr_updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_reports_status ON supportReports (status)",
      "CREATE INDEX idx_reports_instance ON supportReports (instanceUrl, created)",
    ],
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("supportReports");
  app.delete(collection);
});
