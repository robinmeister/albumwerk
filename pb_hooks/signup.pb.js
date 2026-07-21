/// <reference path="../pb_data/types.d.ts" />
// Public signup endpoint. Replaces the old frontend flow that logged in as a
// superuser to link the new user with a shooting. Creates the user and keeps
// both relation sides (users.shootingIds / shootings.userIds) in sync — these
// are stored as plain JSON id arrays (firebase legacy), not pb relations.
//
// POST /api/custom/signup { email, password, firstName, lastName, shootingId? }
routerAdd("POST", "/api/custom/signup", (e) => {
  const data = e.requestInfo().body || {};
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  const firstName = String(data.firstName || "").trim();
  const lastName = String(data.lastName || "").trim();
  const shootingId = String(data.shootingId || "").trim();

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return e.json(400, { status: "error", code: "invalid-email" });
  }
  if (password.length < 8) {
    return e.json(400, { status: "error", code: "weak-password" });
  }
  if (!firstName || !lastName) {
    return e.json(400, { status: "error", code: "missing-name" });
  }

  let shooting = null;
  if (shootingId) {
    try {
      shooting = e.app.findRecordById("shootings", shootingId);
    } catch (_) {
      return e.json(400, { status: "error", code: "unknown-shooting" });
    }
  }

  let userId = "";
  try {
    e.app.runInTransaction((txApp) => {
      const usersCol = txApp.findCollectionByNameOrId("users");
      const user = new Record(usersCol);
      // the users id field has no autogenerate pattern (firebase legacy ids),
      // so generate one explicitly
      user.set("id", $security.randomStringWithAlphabet(15, "abcdefghijklmnopqrstuvwxyz0123456789"));
      user.set("email", email);
      user.set("emailVisibility", false);
      user.set("firstName", firstName);
      user.set("lastName", lastName);
      user.set("isAdmin", false);
      user.set("shootingIds", shooting ? [shooting.id] : []);
      user.setPassword(password);
      txApp.save(user);
      userId = user.id;

      if (shooting) {
        // json fields come back as raw bytes in the JSVM — parse via string
        let userIds = [];
        try {
          userIds = JSON.parse(shooting.getString("userIds") || "[]") || [];
        } catch (_) {
          userIds = [];
        }
        if (!userIds.includes(user.id)) {
          userIds.push(user.id);
          shooting.set("userIds", JSON.stringify(userIds));
          txApp.save(shooting);
        }
      }
    });
  } catch (err) {
    // unique email violation is by far the most likely failure
    const msg = String(err);
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("email")) {
      return e.json(400, { status: "error", code: "email-in-use" });
    }
    return e.json(400, { status: "error", code: "create-failed", message: msg });
  }

  return e.json(200, { status: "success", id: userId });
});
