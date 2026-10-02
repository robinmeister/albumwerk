/// <reference path="../pb_data/types.d.ts" />
// Kundenseite „Drucke“ (docs/superpowers/specs/2026-10-02-kunden-drucke-design.md).
//
// finishedOrders nimmt beim „Abschicken“ die Sendung der Fotograf:in auf.
// orders hatte bisher keinen Zeitstempel — die Kundenseite zeigt das Datum,
// und die Admin-Seite las `created` schon immer (bisher ins Leere).
// Altbestände bleiben ohne Datum.
migrate((app) => {
  const finished = app.findCollectionByNameOrId("finishedOrders");
  finished.fields.add(new Field({
    name: "trackingNumber", id: "txt_fo_tracknr", type: "text",
    required: false, hidden: false, presentable: false, system: false,
  }));
  finished.fields.add(new Field({
    name: "trackingUrl", id: "txt_fo_trackurl", type: "text",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(finished);

  const orders = app.findCollectionByNameOrId("orders");
  if (!orders.fields.getByName("created")) {
    orders.fields.add(new Field({
      name: "created", id: "autodate_ord_c", type: "autodate",
      onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false,
    }));
    app.save(orders);
  }
}, (app) => {
  const finished = app.findCollectionByNameOrId("finishedOrders");
  finished.fields.removeByName("trackingNumber");
  finished.fields.removeByName("trackingUrl");
  app.save(finished);
  const orders = app.findCollectionByNameOrId("orders");
  if (orders.fields.getById("autodate_ord_c")) {
    orders.fields.removeById("autodate_ord_c");
    app.save(orders);
  }
});
