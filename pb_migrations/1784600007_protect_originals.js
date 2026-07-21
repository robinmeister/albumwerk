/// <reference path="../pb_data/types.d.ts" />
// Harden file URLs: originals move into a *protected* file field. Previews stay
// in the public `file` field (anonymous public galleries), while the bytes of
// `originalFile` can only be fetched with a short-lived file token whose auth
// record passes the collection view rule (admin / assigned user / isPublic).
// Until now every file field was unprotected — anyone in possession of the
// (unguessable) /api/files/... URL could download full-resolution originals.
migrate((app) => {
  // 1) add the protected file field
  const collection = app.findCollectionByNameOrId("images");
  collection.fields.add(new Field({
    name: "originalFile",
    id: "file_im_orig",
    type: "file",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
    maxSelect: 1,
    maxSize: 52428800, // 50 MB, same as `file`
    protected: true,
  }));
  app.save(collection);

  // 2) move the bytes of every existing original from `file` to `originalFile`
  const originals = app.findRecordsByFilter(
    "images",
    'type="original"',
    "",
    0,
    0,
  );
  for (const record of originals) {
    const filename = record.getString("file");
    if (!filename) continue;
    const path = [
      app.dataDir(), "storage", record.collection().id, record.id, filename,
    ].join("/");
    record.set("originalFile", $filesystem.fileFromPath(path));
    record.set("file", null);
    app.save(record);
  }
}, (app) => {
  // reverse: move bytes back into the public `file` field, drop the new field
  const originals = app.findRecordsByFilter(
    "images",
    'type="original"',
    "",
    0,
    0,
  );
  for (const record of originals) {
    const filename = record.getString("originalFile");
    if (!filename) continue;
    const path = [
      app.dataDir(), "storage", record.collection().id, record.id, filename,
    ].join("/");
    record.set("file", $filesystem.fileFromPath(path));
    record.set("originalFile", null);
    app.save(record);
  }
  const collection = app.findCollectionByNameOrId("images");
  collection.fields.removeByName("originalFile");
  app.save(collection);
});
