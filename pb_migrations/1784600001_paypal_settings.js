/// <reference path="../pb_data/types.d.ts" />
// PayPal server-side support. The secret lives in a *hidden* field (never
// serialized in API responses, only readable by pb_hooks/paypal.pb.js), exactly
// like stripeSecretKey. `paypalEnabled` is the public gate for the frontend;
// `paypalLiveMode` selects the live vs. sandbox PayPal API base URL.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.add(new Field({
    name: "paypalSecret",
    id: "txt_set_ppsecret",
    type: "text",
    required: false,
    hidden: true,
    presentable: false,
    system: false,
  }));
  collection.fields.add(new Field({
    name: "paypalEnabled",
    id: "bool_set_ppon",
    type: "bool",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  collection.fields.add(new Field({
    name: "paypalLiveMode",
    id: "bool_set_pplive",
    type: "bool",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.removeByName("paypalSecret");
  collection.fields.removeByName("paypalEnabled");
  collection.fields.removeByName("paypalLiveMode");
  app.save(collection);
});
