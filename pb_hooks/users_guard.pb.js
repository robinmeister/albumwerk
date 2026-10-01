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
  // Admin-Rechte vergeben ist kein Klick nebenbei: Wer sich selbst entzieht,
  // sperrt im Zweifel das ganze Studio aus — und nur bestätigte, echte Konten
  // dürfen hochgestuft werden. Da sich niemand selbst herabstufen kann, bleibt
  // immer mindestens ein Admin übrig. Superuser (PB-Dashboard) bleiben frei.
  if (privileged && !e.hasSuperuserAuth()) {
    const original = e.record.original();
    const promote = e.record.getBool("isAdmin");
    if (promote !== original.getBool("isAdmin")) {
      if (e.auth.id === e.record.id) {
        throw new BadRequestError("Den eigenen Admin-Status kannst du nicht ändern.");
      }
      if (promote && (!original.getBool("verified") || original.getBool("isPreview"))) {
        throw new BadRequestError("Nur Konten mit bestätigter E-Mail können Admin werden.");
      }
    }
  }
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
