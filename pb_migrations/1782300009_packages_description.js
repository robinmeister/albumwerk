/// <reference path="../pb_data/types.d.ts" />
// Packages get a customer-facing description (shown in the checkout summary).
// Backfills the seeded defaults.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("packages");
  collection.fields.add(new Field({
    name: "description",
    id: "txt_pkg_desc",
    type: "text",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  app.save(collection);

  const backfill = {
    defaultpack0001: "10 Bilder deiner Wahl in voller Auflösung",
    defaultpack0002: "25 Bilder deiner Wahl in voller Auflösung",
  };
  Object.keys(backfill).forEach((id) => {
    try {
      const record = app.findRecordById("packages", id);
      record.set("description", backfill[id]);
      app.save(record);
    } catch (_) {
      /* not seeded on this instance */
    }
  });
}, (app) => {
  const collection = app.findCollectionByNameOrId("packages");
  collection.fields.removeByName("description");
  app.save(collection);
});
