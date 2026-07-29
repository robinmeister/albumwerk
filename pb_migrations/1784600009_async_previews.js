/// <reference path="../pb_data/types.d.ts" />
// Previews are no longer rendered inside the upload request. Measured on a
// 24 MP / 7.4 MB JPEG the POST took 1387–2940 ms with the old synchronous hook
// versus 58–71 ms without it — ~96 % of the request was ImageMagick, so the
// browser's upload slots sat idle while the CPU worked.
//
// Originals are queued instead and drained by the worker endpoint / cron job in
// pb_hooks/previews.pb.js:
//   previewPending  — true while the original still needs a watermarked preview
//   previewAttempts — bounded retries, so one permanently broken file cannot
//                     spin the workers forever
migrate((app) => {
  const collection = app.findCollectionByNameOrId("images");

  collection.fields.add(new Field({
    name: "previewPending",
    id: "bool_img_prevpend",
    type: "bool",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
  }));
  collection.fields.add(new Field({
    name: "previewAttempts",
    id: "num_img_prevatt",
    type: "number",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
    onlyInt: true,
    min: 0,
    max: null,
  }));

  // partial index: only the handful of rows actually waiting in the queue
  collection.indexes = [
    "CREATE INDEX `idx_images_preview_queue` ON `images` (`previewPending`, `previewAttempts`) WHERE `previewPending` = TRUE",
  ];
  app.save(collection);

  // Backfill: queue every original that has no preview yet. Also self-heals
  // uploads whose preview failed under the old synchronous hook (it swallowed
  // errors so the upload would not fail).
  app.db().newQuery(
    "UPDATE images" +
    "   SET previewPending = TRUE, previewAttempts = 0" +
    " WHERE type = 'original'" +
    "   AND NOT EXISTS (" +
    "         SELECT 1 FROM images p" +
    "          WHERE p.type = 'preview'" +
    "            AND p.shootingId = images.shootingId" +
    "            AND p.name = images.name" +
    "       )"
  ).execute();
}, (app) => {
  const collection = app.findCollectionByNameOrId("images");
  collection.indexes = [];
  collection.fields.removeByName("previewPending");
  collection.fields.removeByName("previewAttempts");
  app.save(collection);
});
