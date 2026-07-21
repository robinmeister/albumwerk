/// <reference path="../pb_data/types.d.ts" />
// Stripe support: the secret key lives in a *hidden* field — hidden fields
// are never serialized in API responses and can only be read/written by
// server-side hooks (pb_hooks/stripe.pb.js). The public `stripeEnabled` flag
// tells the frontend whether to offer card payment.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.add(new Field({
    name: "stripeSecretKey",
    id: "txt_set_stripekey",
    type: "text",
    required: false,
    hidden: true,
    presentable: false,
    system: false,
  }));
  collection.fields.add(new Field({
    name: "stripeEnabled",
    id: "bool_set_stripeon",
    type: "bool",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.removeByName("stripeSecretKey");
  collection.fields.removeByName("stripeEnabled");
  app.save(collection);
});
