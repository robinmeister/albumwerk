/// <reference path="../pb_data/types.d.ts" />
// Automatic watermarked previews for album images (replaces the old
// firebase `generatePreview` cloud function). The heavy lifting lives in
// lib/previewlib.js; ImageMagick is provided by the Docker image.
//
// - upload of an "original" images record  -> creates a "preview" record
// - deletion of an "original" images record -> deletes its preview
// - POST /api/custom/regenerate-previews { shootingId? } (admin)
//   rebuilds previews, e.g. after changing the watermark settings

onRecordAfterCreateSuccess((e) => {
  const record = e.record;
  if (record.getString("type") === "original") {
    try {
      const generatePreview = require(__hooks + "/lib/previewlib.js");
      generatePreview(e.app, record);
    } catch (err) {
      // never block the upload because of a failed preview
      e.app.logger().warn("preview generation failed", "imageId", record.id, "error", String(err));
    }
  }
  e.next();
}, "images");

onRecordAfterDeleteSuccess((e) => {
  const record = e.record;
  if (record.getString("type") === "original") {
    try {
      const previews = e.app.findRecordsByFilter(
        "images",
        'shootingId={:sid} && type="preview" && name={:name}',
        "",
        100,
        0,
        { sid: record.getString("shootingId"), name: record.getString("name") },
      );
      for (const preview of previews) {
        e.app.delete(preview);
      }
    } catch (err) {
      e.app.logger().warn("preview cleanup failed", "imageId", record.id, "error", String(err));
    }
  }
  e.next();
}, "images");

routerAdd("POST", "/api/custom/regenerate-previews", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const sid = String(data.shootingId || "");
  const params = { sid: sid };
  const originalsFilter = sid
    ? 'type="original" && shootingId={:sid}'
    : 'type="original"';
  const previewsFilter = sid
    ? 'type="preview" && shootingId={:sid}'
    : 'type="preview"';

  // drop existing previews so watermark changes take effect
  const oldPreviews = e.app.findRecordsByFilter("images", previewsFilter, "", 0, 0, params);
  for (const preview of oldPreviews) {
    e.app.delete(preview);
  }

  const generatePreview = require(__hooks + "/lib/previewlib.js");
  const originals = e.app.findRecordsByFilter("images", originalsFilter, "", 0, 0, params);
  let generated = 0;
  let failed = 0;
  for (const original of originals) {
    try {
      if (generatePreview(e.app, original)) generated++;
    } catch (err) {
      failed++;
      e.app.logger().warn("preview regeneration failed", "imageId", original.id, "error", String(err));
    }
  }

  return e.json(200, { status: "success", generated: generated, failed: failed });
}, $apis.requireAuth());
