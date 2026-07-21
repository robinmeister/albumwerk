/// <reference path="../pb_data/types.d.ts" />
// The users collection allows public create (signup) and self-update, so the
// isAdmin flag must be guarded here — API rules alone cannot prevent a user
// from flipping a field on their own record.
//
// NOTE: PocketBase JSVM handlers run in isolated contexts, so the privilege
// check is inlined in each handler (top-level helpers are not visible there).

onRecordCreateRequest((e) => {
  const privileged =
    e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!privileged && e.record.getBool("isAdmin")) {
    throw new BadRequestError("isAdmin kann nicht bei der Registrierung gesetzt werden.");
  }
  return e.next();
}, "users");

onRecordUpdateRequest((e) => {
  const privileged =
    e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!privileged) {
    const original = e.record.original();
    if (e.record.getBool("isAdmin") !== original.getBool("isAdmin")) {
      throw new BadRequestError("isAdmin kann nur von Admins geändert werden.");
    }
    // Download entitlement is granted server-side after a verified payment
    // (pb_hooks/paypal.pb.js). A customer must not be able to add images to
    // their own downloadableImages via the API. Server hooks use app.save(),
    // which bypasses this request hook, so legitimate grants still work.
    const before = JSON.stringify(original.getStringSlice("downloadableImages") || []);
    const after = JSON.stringify(e.record.getStringSlice("downloadableImages") || []);
    if (before !== after) {
      throw new BadRequestError("downloadableImages kann nicht selbst geändert werden.");
    }
  }
  return e.next();
}, "users");
