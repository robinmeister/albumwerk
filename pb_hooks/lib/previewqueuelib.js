// Preview queue, require()d from the isolated JSVM handlers in previews.pb.js.
// PocketBase runs every hook/route handler in its own VM, so handlers cannot
// see anything from their file's outer scope — all shared logic has to live in
// a module like this one.
//
// Previews used to be rendered inside the upload request, which blocked the
// browser's XHR for 1.4–2.9 s per 24 MP image while the network sat idle. Now
// originals are queued (previewPending) and drained here, in parallel to the
// uploads.

const MAX_ATTEMPTS = 3;   // bounded retries per original
const CLAIM_BATCH = 5;    // records looked at per round
const WORKER_BUDGET_MS = 20000; // keep a worker request well under any proxy timeout
const CRON_BUDGET_MS = 45000;   // cron fires every minute — stay below that

// Claim one queued original: atomic test-and-set on previewPending. The single
// conditional UPDATE is the lock — whoever flips TRUE->FALSE gets rowsAffected>0
// and owns the record, everyone else sees it as no longer queued.
//
// Clearing the flag on *success* instead would not be exclusive: a second worker
// could pick the record up while the first is still rendering, and both would
// pass the "already has a preview" check in previewlib. That happened in
// testing — two workers plus the cron produced three previews for one original.
//
// Raw SQL on purpose — a record save would fire update hooks and realtime.
function claim(app, record) {
  const result = app.db().newQuery(
    "UPDATE images" +
    "   SET previewPending = FALSE," +
    "       previewAttempts = COALESCE(previewAttempts, 0) + 1" +
    " WHERE id = {:id} AND previewPending = TRUE"
  ).bind({ id: record.id }).execute();
  return result.rowsAffected() > 0;
}

// Rendering failed: put it back in the queue unless it has burned its retries.
function requeueFailed(app, record) {
  app.db().newQuery(
    "UPDATE images SET previewPending = TRUE" +
    " WHERE id = {:id} AND COALESCE(previewAttempts, 0) < {:max}"
  ).bind({ id: record.id, max: MAX_ATTEMPTS }).execute();
}

/** Number of originals still waiting for a preview (retired ones excluded). */
function pendingCount(app) {
  try {
    const row = new DynamicModel({ c: 0 });
    app.db().newQuery(
      "SELECT COUNT(*) AS c FROM images" +
      " WHERE type = 'original' AND previewPending = TRUE" +
      "   AND COALESCE(previewAttempts, 0) < {:max}"
    ).bind({ max: MAX_ATTEMPTS }).one(row);
    return row.c;
  } catch (err) {
    app.logger().warn("preview queue count failed", "error", String(err));
    return 0;
  }
}

/** Render queued previews until the queue is empty or the budget is used up. */
function drain(app, budgetMs) {
  const generatePreview = require(__hooks + "/lib/previewlib.js");
  const deadline = Date.now() + budgetMs;
  let generated = 0;
  let failed = 0;

  while (Date.now() < deadline) {
    // sorted by id, not by age: the images collection has no created/updated
    // autodate fields. Order is irrelevant for a queue, it only has to be
    // stable so parallel workers walk the same list.
    const queued = app.findRecordsByFilter(
      "images",
      'type="original" && previewPending=true && previewAttempts<{:max}',
      "id",
      CLAIM_BATCH,
      0,
      { max: MAX_ATTEMPTS },
    );
    if (queued.length === 0) break;

    let claimed = 0;
    for (const original of queued) {
      if (Date.now() >= deadline) break;
      // lost the race against another worker — skip, it is being handled
      if (!claim(app, original)) continue;
      claimed++;
      try {
        generatePreview(app, original);
        generated++;
      } catch (err) {
        // back into the queue until MAX_ATTEMPTS is used up
        requeueFailed(app, original);
        failed++;
        app.logger().warn(
          "preview generation failed", "imageId", original.id, "error", String(err),
        );
      }
    }
    // everything in this batch belongs to other workers — let them finish
    if (claimed === 0) break;
  }

  return { generated: generated, failed: failed };
}

/**
 * Re-queue originals that ended up with no preview and are not queued either —
 * a claimed record whose render was cut short by a restart or a crash would
 * otherwise stay invisible forever. Full scan, so this runs on a slow cron, not
 * on the hot path. Originals that used up their retries stay out.
 */
function requeueOrphans(app) {
  return app.db().newQuery(
    "UPDATE images" +
    "   SET previewPending = TRUE" +
    " WHERE type = 'original'" +
    "   AND previewPending = FALSE" +
    "   AND COALESCE(previewAttempts, 0) < {:max}" +
    "   AND NOT EXISTS (" +
    "         SELECT 1 FROM images p" +
    "          WHERE p.type = 'preview'" +
    "            AND p.shootingId = images.shootingId" +
    "            AND p.name = images.name" +
    "       )"
  ).bind({ max: MAX_ATTEMPTS }).execute().rowsAffected();
}

/** Re-queue originals, e.g. after the watermark settings changed. */
function requeue(app, shootingId) {
  const query = shootingId
    ? app.db().newQuery(
        "UPDATE images SET previewPending = TRUE, previewAttempts = 0" +
        " WHERE type = 'original' AND shootingId = {:sid}"
      ).bind({ sid: shootingId })
    : app.db().newQuery(
        "UPDATE images SET previewPending = TRUE, previewAttempts = 0" +
        " WHERE type = 'original'"
      );
  return query.execute().rowsAffected();
}

module.exports = {
  MAX_ATTEMPTS: MAX_ATTEMPTS,
  WORKER_BUDGET_MS: WORKER_BUDGET_MS,
  CRON_BUDGET_MS: CRON_BUDGET_MS,
  drain: drain,
  pendingCount: pendingCount,
  requeue: requeue,
  requeueOrphans: requeueOrphans,
};
