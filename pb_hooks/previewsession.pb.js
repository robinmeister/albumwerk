/// <reference path="../pb_data/types.d.ts" />
// Kundenansicht-Vorschau (docs/kundenansicht-vorschau.md).
//
// Ein Admin bekommt hier ein Token fuer ein kurzlebiges Schattenkonto, das
// dieselben shootingIds traegt wie die der Galerie zugeordnete Kundschaft.
// Die Zugriffsregeln fuer shootings und images haengen genau an diesem Feld,
// also ist die Auswertung echt — aber ein Schreibzugriff aus der Vorschau
// landet beim Schattenkonto und verschwindet mit ihm.
//
// Warum kein Impersonate der echten Kundin: ein Token auf ihren Datensatz
// koennte ihre Bildauswahl aendern (userSelection.updateRule erlaubt
// userId = @request.auth.id). Ein Fehlklick in einer Vorschau darf keine
// Kundendaten anfassen.

routerAdd("POST", "/api/custom/preview/session", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const shootingId = String(data.shootingId || "").trim();
  if (!shootingId) {
    return e.json(400, { status: "error", code: "missing-shooting" });
  }

  let shooting = null;
  try {
    shooting = e.app.findRecordById("shootings", shootingId);
  } catch (_) {
    return e.json(404, { status: "error", code: "unknown-shooting" });
  }

  // Wer an der Galerie haengt, steht am Shooting — die Beziehung wird
  // beidseitig gepflegt (link_shooting.pb.js). json-Felder kommen als rohe
  // Bytes, deshalb ueber getString + JSON.parse.
  let userIds = [];
  try {
    userIds = JSON.parse(shooting.getString("userIds") || "[]") || [];
  } catch (_) {
    userIds = [];
  }

  let name = "";
  if (userIds.length === 1) {
    try {
      const kunde = e.app.findRecordById("users", userIds[0]);
      name = (kunde.getString("firstName") + " " + kunde.getString("lastName")).trim();
    } catch (_) {
      name = "";
    }
  }

  const preview = require(__hooks + "/lib/previewsessionlib.js");
  const plan = preview.buildShadowUser(shootingId, Date.now(), preview.TTL_MINUTES,
    (len, alphabet) => $security.randomStringWithAlphabet(len, alphabet));

  let token = "";
  try {
    e.app.runInTransaction((txApp) => {
      const user = new Record(txApp.findCollectionByNameOrId("users"));
      // die users-ID hat kein Autogenerate-Muster (siehe signup.pb.js)
      user.set("id", plan.id);
      user.set("email", plan.email);
      user.set("emailVisibility", false);
      user.set("firstName", "Vorschau");
      user.set("lastName", "");
      user.set("isAdmin", false);
      user.set("verified", true);
      user.set("shootingIds", plan.shootingIds);
      user.set("isPreview", true);
      user.set("previewExpiresAt", plan.previewExpiresAt);
      user.setPassword(plan.password);
      txApp.save(user);
      token = user.newAuthToken();
    });
  } catch (err) {
    return e.json(500, { status: "error", code: "create-failed", message: String(err) });
  }

  e.app.logger().info(
    "Vorschau-Sitzung ausgestellt",
    "shootingId", shootingId,
    "shadowId", plan.id,
    "admin", e.auth ? e.auth.id : "superuser",
  );

  return e.json(200, {
    token: token,
    userId: plan.id,
    expiresAt: plan.previewExpiresAt,
    spiegelt: { anzahl: userIds.length, name: name },
  });
});

routerAdd("DELETE", "/api/custom/preview/session", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const userId = String(data.userId || "").trim();
  if (!userId) return e.json(400, { status: "error", code: "missing-user" });

  try {
    const rec = e.app.findRecordById("users", userId);
    // Nur Schattenkonten — dieser Endpunkt darf niemals ein echtes Konto
    // loeschen, auch nicht mit einer falschen ID von einem Admin.
    if (!rec.getBool("isPreview")) {
      return e.json(400, { status: "error", code: "not-a-preview" });
    }
    e.app.delete(rec);
  } catch (_) {
    // schon weg — fuer den Aufrufer dasselbe Ergebnis
  }

  return e.json(200, { status: "ok" });
});

// Zweite Linie: das Frontend loescht beim Schliessen, aber ein abgestuerzter
// Tab oder ein geschlossener Laptop tut das nicht.
cronAdd("previewSessionSweep", "*/5 * * * *", () => {
  try {
    const preview = require(__hooks + "/lib/previewsessionlib.js");
    const now = Date.now();
    const stale = $app.findRecordsByFilter("users", "isPreview = true", "", 0, 0);
    let removed = 0;
    for (const rec of stale) {
      if (preview.isExpired(rec.getString("previewExpiresAt"), now)) {
        $app.delete(rec);
        removed++;
      }
    }
    if (removed > 0) {
      $app.logger().info("abgelaufene Vorschau-Konten entfernt", "count", removed);
    }
  } catch (err) {
    $app.logger().warn("Vorschau-Sweep fehlgeschlagen", "error", String(err));
  }
});
