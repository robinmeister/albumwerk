/// <reference path="../pb_data/types.d.ts" />
// Declare the thumb sizes used for shooting covers (album cards request
// 800x600, the admin list 100x100). Without the declaration PocketBase
// silently serves the full-size original instead.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("shootings");
  const field = collection.fields.getByName("coverImage");
  field.thumbs = ["100x100", "800x600"];
  field.maxSelect = 1;
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("shootings");
  const field = collection.fields.getByName("coverImage");
  field.thumbs = null;
  app.save(collection);
});
