/// <reference path="../pb_data/types.d.ts" />
//
// Trial-Lebenszyklus: Erinnerung 2 Tage vor Ablauf, Pausieren nach Ablauf.
// Läuft stündlich (Zeitfenster sind tagesgenau); LIFECYCLE_CRON übersteuert
// den Zeitplan (Tests setzen "* * * * *").

cronAdd("saas-lifecycle", $os.getenv("LIFECYCLE_CRON") || "0 * * * *", () => {
  const lib = require(__hooks + "/lib/provisionlib.js");
  const now = Date.now();

  // --- Erinnerung: Trial endet in <= 2 Tagen, noch nicht erinnert -----------
  const expiring = $app.findRecordsByFilter(
    "customers", "status = 'trial' && reminderSentAt = ''", "trialEndsAt", 20, 0);
  for (const r of expiring) {
    const ends = new Date(r.getString("trialEndsAt")).getTime();
    if (!ends || ends - now > 2 * 24 * 3600 * 1000 || ends < now) continue;
    try {
      lib.sendMail($app, r.getString("email"),
        "Dein Testzeitraum endet in 2 Tagen",
        "<p>Hallo" + (r.getString("name") ? " " + r.getString("name") : "") + ",</p>" +
        "<p>dein kostenloser Testzeitraum für <a href='" + r.getString("instanceUrl") + "'>" +
        r.getString("instanceUrl") + "</a> endet in 2 Tagen.</p>" +
        "<p>Wenn du dein Album behalten möchtest, antworte einfach auf diese " +
        "E-Mail — wir kümmern uns um alles Weitere. Deine Daten bleiben in jedem " +
        "Fall noch 30 Tage erhalten.</p>" +
        "<p>Viele Grüße<br/>Albumwerk</p>");
      r.set("reminderSentAt", new Date().toISOString());
      $app.save(r);
      $app.logger().info("saas trial reminder sent", "subdomain", r.getString("subdomain"));
    } catch (err) {
      $app.logger().error("saas reminder failed", "subdomain", r.getString("subdomain"), "error", String(err));
    }
  }

  // --- Ablauf: Trial vorbei → Instanz pausieren ------------------------------
  const expired = $app.findRecordsByFilter(
    "customers", "status = 'trial' && trialEndsAt != '' && trialEndsAt < {:now}",
    "trialEndsAt", 20, 0, { now: new Date(now).toISOString().replace("T", " ") });
  for (const r of expired) {
    try {
      lib.stopInstance(r.getString("coolifyAppUuid"));
      r.set("status", "suspended");
      $app.save(r);
      lib.sendMail($app, r.getString("email"),
        "Dein Testzeitraum ist abgelaufen",
        "<p>Hallo" + (r.getString("name") ? " " + r.getString("name") : "") + ",</p>" +
        "<p>dein Testzeitraum ist zu Ende und dein Album wurde pausiert. " +
        "<b>Deine Daten und Fotos sind noch 30 Tage sicher gespeichert.</b></p>" +
        "<p>Du möchtest weitermachen? Antworte einfach auf diese E-Mail und wir " +
        "schalten dein Album wieder frei.</p>" +
        "<p>Viele Grüße<br/>Albumwerk</p>");
      $app.logger().info("saas trial expired, suspended", "subdomain", r.getString("subdomain"));
    } catch (err) {
      $app.logger().error("saas suspend failed", "subdomain", r.getString("subdomain"), "error", String(err));
    }
  }
});
