/// <reference path="../pb_data/types.d.ts" />
// Close the self-service gap: customers used to create their own `orders` /
// `finishedOrders` straight from the browser after a purely client-side
// "payment". Orders are now written server-side by pb_hooks/paypal.pb.js (which
// bypasses API rules via app.save), and finishing an order stays an admin
// action — so both create rules drop to admin-only.
migrate((app) => {
  const orders = app.findCollectionByNameOrId("orders");
  orders.createRule = "@request.auth.isAdmin = true";
  app.save(orders);

  const finished = app.findCollectionByNameOrId("finishedOrders");
  finished.createRule = "@request.auth.isAdmin = true";
  app.save(finished);
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders");
  orders.createRule = "@request.auth.isAdmin = true || userId = @request.auth.id";
  app.save(orders);

  const finished = app.findCollectionByNameOrId("finishedOrders");
  finished.createRule = "@request.auth.isAdmin = true || userId = @request.auth.id";
  app.save(finished);
});
