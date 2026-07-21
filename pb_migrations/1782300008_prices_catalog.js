/// <reference path="../pb_data/types.d.ts" />
// Catalog fields for prices: product category + physical size, mirroring how
// photo print price lists are structured. Backfills the seeded defaults.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("prices");
  collection.fields.add(new Field({
    name: "category",
    id: "sel_price_categ",
    type: "select",
    maxSelect: 1,
    values: ["digital", "print", "canvas", "poster", "other"],
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  collection.fields.add(new Field({
    name: "size",
    id: "txt_price_size",
    type: "text",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  app.save(collection);

  // backfill the records seeded by 1782300006 (fresh instances)
  const backfill = {
    defaultprice001: { category: "digital", size: "" },
    defaultprice002: { category: "print", size: "13×18 cm" },
    defaultprice003: { category: "print", size: "20×30 cm" },
    defaultprice004: { category: "canvas", size: "40×60 cm" },
  };
  Object.keys(backfill).forEach((id) => {
    try {
      const record = app.findRecordById("prices", id);
      record.set("category", backfill[id].category);
      record.set("size", backfill[id].size);
      app.save(record);
    } catch (_) {
      /* not seeded on this instance */
    }
  });
}, (app) => {
  const collection = app.findCollectionByNameOrId("prices");
  collection.fields.removeByName("category");
  collection.fields.removeByName("size");
  app.save(collection);
});
