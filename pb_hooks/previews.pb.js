/// <reference path="../pb_data/types.d.ts" />
// Automatic watermarked previews for album images (replaces the old
// firebase `generatePreview` cloud function). The heavy lifting lives in
// lib/previewlib.js (rendering) and lib/previewqueuelib.js (queue);
// ImageMagick is provided by the Docker image.
//
// Previews are generated *asynchronously*: rendering them inside the upload
// request blocked the browser's XHR for 1.4–2.9 s per 24 MP image, so the
// upload slots idled while ImageMagick worked (see migration
// 1784600009_async_previews.js). Instead:
//
// - upload of an "original" images record  -> flagged previewPending
// - POST /api/custom/preview-worker (admin) -> drains the queue; the upload
//   dialog calls this in parallel to the uploads (useImageUpload.ts)
// - cron every minute                       -> safety net, so nothing is lost
//   when no client is around to drive the workers
// - deletion of an "original" images record -> deletes its preview
// - POST /api/custom/regenerate-previews { shootingId? } (admin)
//   drops the previews and re-queues, e.g. after changing the watermark
//
// The client learns about finished previews through the realtime `create`
// event on the preview records — no polling of the queue is required.
//
// NB: every handler below runs in its own JSVM without access to this file's
// outer scope, hence the require() inside each one — constants included.

// Queue the original as part of its own INSERT (no extra write, no extra
// realtime event). Previews written by the worker are type="preview" and skip
// this branch, so they never queue themselves.
onRecordCreate((e) => {
  if (e.record.getString("type") === "original") {
    e.record.set("previewPending", true);
    e.record.set("previewAttempts", 0);
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

// Driven by the upload dialog while the uploads are still running, so network
// transfer and ImageMagick overlap instead of alternating.
routerAdd("POST", "/api/custom/preview-worker", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const queue = require(__hooks + "/lib/previewqueuelib.js");
  const result = queue.drain(e.app, queue.WORKER_BUDGET_MS);
  return e.json(200, {
    status: "success",
    generated: result.generated,
    failed: result.failed,
    pending: queue.pendingCount(e.app),
  });
}, $apis.requireAuth());

// Safety net: picks up anything left behind when no client is driving the
// workers (tab closed mid-upload, worker request failed, server restarted).
cronAdd("previewQueue", "* * * * *", () => {
  try {
    const queue = require(__hooks + "/lib/previewqueuelib.js");
    if (queue.pendingCount($app) === 0) return;
    const result = queue.drain($app, queue.CRON_BUDGET_MS);
    if (result.generated > 0 || result.failed > 0) {
      $app.logger().info(
        "preview queue drained",
        "generated", result.generated, "failed", result.failed,
      );
    }
  } catch (err) {
    $app.logger().warn("preview queue cron failed", "error", String(err));
  }
});

// Slow self-healing sweep: an original whose render was interrupted by a
// restart is neither queued nor has a preview. Full scan, hence the low rate.
cronAdd("previewOrphans", "*/15 * * * *", () => {
  try {
    const queue = require(__hooks + "/lib/previewqueuelib.js");
    const requeued = queue.requeueOrphans($app);
    if (requeued > 0) {
      $app.logger().info("re-queued previews without a result", "count", requeued);
    }
  } catch (err) {
    $app.logger().warn("preview orphan sweep failed", "error", String(err));
  }
});

routerAdd("POST", "/api/custom/regenerate-previews", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const sid = String(data.shootingId || "");
  const previewsFilter = sid
    ? 'type="preview" && shootingId={:sid}'
    : 'type="preview"';

  // drop existing previews so watermark changes take effect
  const oldPreviews = e.app.findRecordsByFilter("images", previewsFilter, "", 0, 0, { sid: sid });
  for (const preview of oldPreviews) {
    e.app.delete(preview);
  }

  // Re-queue instead of rendering inline: a library with a few thousand images
  // would otherwise run far past any request timeout. The cron picks it up
  // within a minute, the admin does not have to keep the tab open.
  const queue = require(__hooks + "/lib/previewqueuelib.js");
  return e.json(200, { status: "success", queued: queue.requeue(e.app, sid) });
}, $apis.requireAuth());
