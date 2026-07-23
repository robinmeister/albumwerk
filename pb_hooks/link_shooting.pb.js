/// <reference path="../pb_data/types.d.ts" />
// Links an existing shooting to the currently logged-in user — the "add album"
// flow (QR code scan or manually entered album code). The counterpart to
// signup.pb.js, which does the same for accounts that do not exist yet.
//
// Customers may not write shootings.userIds through the API (updateRule is
// admin-only), so both sides of the relation can only be kept in sync here.
//
// POST /api/custom/link-shooting { shootingId } -> { id, title, type }
routerAdd("POST", "/api/custom/link-shooting", (e) => {
  const data = e.requestInfo().body || {};
  const shootingId = String(data.shootingId || "").trim();

  if (!shootingId) {
    return e.json(400, { status: "error", code: "unknown-shooting" });
  }

  let shooting = null;
  try {
    shooting = e.app.findRecordById("shootings", shootingId);
  } catch (_) {
    // wrong code, typo, or an album that has been deleted in the meantime
    return e.json(404, { status: "error", code: "unknown-shooting" });
  }

  const userId = e.auth.id;
  let alreadyLinked = false;

  try {
    e.app.runInTransaction((txApp) => {
      const user = txApp.findRecordById("users", userId);
      const shootingRec = txApp.findRecordById("shootings", shootingId);

      // json fields come back as raw bytes in the JSVM; getStringSlice unwraps
      // them, but records written as a json-encoded *string* (legacy) need the
      // extra parse step.
      const readIds = (record, key) => {
        const slice = record.getStringSlice(key) || [];
        if (slice.length === 1 && slice[0].charAt(0) === "[") {
          try {
            const parsed = JSON.parse(slice[0]);
            return Array.isArray(parsed) ? parsed.map(String) : slice;
          } catch (_) {
            return slice;
          }
        }
        return slice;
      };

      const shootingIds = readIds(user, "shootingIds");
      if (shootingIds.indexOf(shootingId) === -1) {
        shootingIds.push(shootingId);
        user.set("shootingIds", shootingIds);
        txApp.save(user);
      } else {
        alreadyLinked = true;
      }

      const userIds = readIds(shootingRec, "userIds");
      if (userIds.indexOf(userId) === -1) {
        userIds.push(userId);
        shootingRec.set("userIds", userIds);
        txApp.save(shootingRec);
      }
    });
  } catch (err) {
    e.app.logger().error("link-shooting failed", "error", String(err));
    return e.json(400, { status: "error", code: "link-failed" });
  }

  return e.json(200, {
    status: "success",
    alreadyLinked: alreadyLinked,
    id: shooting.id,
    title: shooting.getString("title"),
    type: shooting.getString("type"),
  });
}, $apis.requireAuth());
