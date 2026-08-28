/// <reference path="../pb_data/types.d.ts" />
// Schattenkonten für die Kundenansicht-Vorschau (docs/kundenansicht-vorschau.md).
//
// Ein Schattenkonto traegt dieselben shootingIds wie die zugeordnete
// Kundschaft, aber keinerlei personenbezogene Daten. Es lebt Minuten, nicht
// Wochen — und weil ein PocketBase-Auth-Token nur so lange gilt, wie sein
// Datensatz existiert, ist das Loeschen des Kontos der eigentliche Ablauf.
//
// isPreview markiert es, previewExpiresAt sagt, ab wann der Sweep es abraeumen
// darf. Beide Felder sind nur fuer den Server interessant; die Oberflaeche
// filtert Schattenkonten ueberall aus.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.add(new Field({
    name: "isPreview",
    id: "bool_usr_prev",
    type: "bool",
    required: false, hidden: false, presentable: false, system: false,
  }));
  collection.fields.add(new Field({
    name: "previewExpiresAt",
    id: "date_usr_prevexp",
    type: "date", min: "", max: "",
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  // Schattenkonten zuerst weg, sonst bleiben sie ohne Markierung liegen und
  // waeren von echten Konten nicht mehr zu unterscheiden.
  try {
    const leftovers = app.findRecordsByFilter("users", "isPreview = true", "", 0, 0);
    for (const rec of leftovers) app.delete(rec);
  } catch (_) {
    // keine vorhanden
  }
  collection.fields.removeByName("isPreview");
  collection.fields.removeByName("previewExpiresAt");
  app.save(collection);
});
