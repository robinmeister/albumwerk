/// <reference path="../pb_data/types.d.ts" />
// Logogröße je Einsatzort in Prozent, z. B. { "navigation": 150, "galerie": 80 }
// (LOGO_PLAETZE in src/config/settings.ts). Fehlt ein Ort, gilt 100 % — die
// Grundgröße, die dort vorher fest verdrahtet war.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.add(new Field({
    name: "logoScales",
    id: "json_set_logoscales",
    type: "json", maxSize: 0,
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.removeByName("logoScales");
  app.save(collection);
});
