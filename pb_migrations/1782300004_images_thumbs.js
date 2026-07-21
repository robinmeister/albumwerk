/// <reference path="../pb_data/types.d.ts" />
// Enable on-the-fly thumbnails for album tiles (?thumb=400x0). PocketBase
// only serves thumb sizes that are declared on the file field; the thumbs are
// generated lazily on first request and cached next to the original.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("images");
  const field = collection.fields.getByName("file");
  field.thumbs = ["400x0", "800x0"];
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("images");
  const field = collection.fields.getByName("file");
  field.thumbs = null;
  app.save(collection);
});
