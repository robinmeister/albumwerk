/// <reference path="../pb_data/types.d.ts" />
// Server-side record of a payment we initiated, so a capture can be verified
// against the price/selection we committed to at create time (no cart swapping
// between approval and capture). Written only by pb_hooks/paypal.pb.js via
// app.save(); all API rules are null → not reachable from the client at all.
migrate((app) => {
  const collection = new Collection({
    name: "paymentIntents",
    type: "base",
    system: false,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    indexes: [
      "CREATE INDEX idx_pi_ref ON paymentIntents (provider, providerRef)",
    ],
    fields: [
      { name: "provider", id: "txt_pi_provider", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "providerRef", id: "txt_pi_ref", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "userId", id: "txt_pi_user", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "shootingId", id: "txt_pi_shoot", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "imagePriceObjectList", id: "json_pi_ipol", type: "json", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      { name: "userData", id: "json_pi_udata", type: "json", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      { name: "amount", id: "num_pi_amount", type: "number", min: null, max: null, onlyInt: false, required: false, hidden: false, presentable: false, system: false },
      { name: "currency", id: "txt_pi_curr", type: "text", max: 3, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "status", id: "txt_pi_status", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "orderRecordId", id: "txt_pi_order", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "created", id: "autodate_pi_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_pi_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("paymentIntents");
    app.delete(collection);
  } catch (_) {
    // already gone
  }
});
