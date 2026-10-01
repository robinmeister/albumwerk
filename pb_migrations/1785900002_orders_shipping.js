/// <reference path="../pb_data/types.d.ts" />
// Bezahlter Versand an der Bestellung (Druckaufträge). finalizeOrder schreibt
// ihn, Bestätigungsmail und Bestellübersicht zeigen ihn an.
migrate((app) => {
  const orders = app.findCollectionByNameOrId("orders");
  orders.fields.add(new Field({
    name: "shipping", id: "num_order_shipping", type: "number",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(orders);
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders");
  orders.fields.removeByName("shipping");
  app.save(orders);
});
