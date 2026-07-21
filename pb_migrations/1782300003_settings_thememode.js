/// <reference path="../pb_data/types.d.ts" />
// Adds the light/dark/auto theme mode to the instance settings.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.add(new Field({
    name: "themeMode",
    id: "sel_set_thememode",
    type: "select",
    maxSelect: 1,
    values: ["light", "dark", "auto"],
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  app.save(collection);

  try {
    const record = app.findRecordById("settings", "appsettings0001");
    record.set("themeMode", "light");
    app.save(record);
  } catch (_) {
    // seed record missing — defaults handle it client-side
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.removeByName("themeMode");
  app.save(collection);
});
