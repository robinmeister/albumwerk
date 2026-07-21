/// <reference path="../pb_data/types.d.ts" />
// Free downloads for public shootings: images carry an `isPublic` flag
// (maintained by pb_hooks/images_public.pb.js) so the API rules can release
// originals of public shootings to anonymous visitors. Backfills existing
// images and extends the list/view rules.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("images");
  collection.fields.add(new Field({
    name: "isPublic",
    id: "bool_img_public",
    type: "bool",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  const rule =
    '@request.auth.isAdmin = true || type = "preview" || isPublic = true || @request.auth.shootingIds ~ shootingId';
  collection.listRule = rule;
  collection.viewRule = rule;
  app.save(collection);

  // backfill: flag every image belonging to a public shooting
  const publicShootings = app.findRecordsByFilter("shootings", 'type="public"', "", 0, 0);
  for (const shooting of publicShootings) {
    const images = app.findRecordsByFilter(
      "images",
      "shootingId={:sid}",
      "",
      0,
      0,
      { sid: shooting.id }
    );
    for (const image of images) {
      image.set("isPublic", true);
      app.save(image);
    }
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("images");
  const rule =
    '@request.auth.isAdmin = true || type = "preview" || @request.auth.shootingIds ~ shootingId';
  collection.listRule = rule;
  collection.viewRule = rule;
  collection.fields.removeByName("isPublic");
  app.save(collection);
});
