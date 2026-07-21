/// <reference path="../pb_data/types.d.ts" />
// Control-Plane-Schema: ein Record pro SaaS-Kunde/Instanz.
// Alle API-Rules sind null (nur Superuser) — der öffentliche Signup läuft
// ausschließlich über den Custom-Endpoint in pb_hooks/signup.pb.js.
//
// Status-Lebenszyklus:
//   provisioning → deploying → trial → active
//                              trial → suspended (Trial abgelaufen)
//   active ↔ suspended (Billing/manuell) · error (Provisionierung gescheitert)
migrate((app) => {
  const collection = new Collection({
    name: "customers",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "name", id: "txt_cu_name", type: "text" },
      { name: "email", id: "email_cu_mail", type: "email", required: true },
      {
        name: "subdomain", id: "txt_cu_sub", type: "text", required: true,
        min: 3, max: 31, pattern: "^[a-z0-9][a-z0-9-]{2,30}$",
      },
      {
        name: "status", id: "sel_cu_status", type: "select", required: true,
        maxSelect: 1,
        values: ["provisioning", "deploying", "trial", "active", "suspended", "error", "deleted"],
      },
      { name: "trialEndsAt", id: "date_cu_trial", type: "date" },
      { name: "reminderSentAt", id: "date_cu_remind", type: "date" },
      { name: "coolifyAppUuid", id: "txt_cu_uuid", type: "text" },
      { name: "instanceUrl", id: "txt_cu_url", type: "text" },
      // Ops-Zugang der Instanz — nur für Betrieb/Bootstrap, nie öffentlich
      { name: "opsEmail", id: "txt_cu_opsmail", type: "text", hidden: true },
      { name: "opsPass", id: "txt_cu_opspass", type: "text", hidden: true },
      { name: "lastError", id: "txt_cu_err", type: "text" },
      { name: "notes", id: "txt_cu_notes", type: "text" },
      { name: "created", id: "auto_cu_created", type: "autodate", onCreate: true },
      { name: "updated", id: "auto_cu_updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_customers_subdomain ON customers (subdomain)",
      "CREATE INDEX idx_customers_status ON customers (status)",
    ],
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("customers");
  app.delete(collection);
});
