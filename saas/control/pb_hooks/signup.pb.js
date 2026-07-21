/// <reference path="../pb_data/types.d.ts" />
//
// Self-Service-Signup (14-Tage-Trial, ohne Kreditkarte) + asynchroner
// Provisioning-Worker. Der HTTP-Handler antwortet sofort; das eigentliche
// Anlegen/Deployen übernimmt ein Cron-Worker über Status-Übergänge
// (provisioning → deploying → trial), damit kein Request minutenlang blockt
// und Fehler automatisch erneut versucht werden.

// --- Öffentlicher Signup-Endpoint ------------------------------------------
routerAdd("POST", "/api/saas/signup", (e) => {
  const lib = require(__hooks + "/lib/provisionlib.js");
  const data = e.requestInfo().body || {};
  const name = String(data.name || "").trim().slice(0, 80);
  const email = String(data.email || "").trim().toLowerCase();
  const sub = String(data.subdomain || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return e.json(400, { status: "error", message: "Bitte eine gültige E-Mail-Adresse angeben." });
  }
  try {
    lib.validateSubdomain(sub);
  } catch (err) {
    return e.json(400, { status: "error", message: String(err.message || err) });
  }

  // Eindeutigkeit (Subdomain + eine Instanz pro E-Mail für den Trial)
  try {
    e.app.findFirstRecordByFilter("customers", "subdomain = {:sub}", { sub: sub });
    return e.json(409, { status: "error", message: "Diese Adresse ist schon vergeben — bitte eine andere wählen." });
  } catch (_) { /* frei */ }
  try {
    e.app.findFirstRecordByFilter("customers", "email = {:email} && status != 'deleted'", { email: email });
    return e.json(409, { status: "error", message: "Für diese E-Mail-Adresse existiert schon ein Album." });
  } catch (_) { /* frei */ }

  const collection = e.app.findCollectionByNameOrId("customers");
  const record = new Record(collection);
  const trialEnd = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  record.set("name", name);
  record.set("email", email);
  record.set("subdomain", sub);
  record.set("status", "provisioning");
  record.set("trialEndsAt", trialEnd.toISOString());
  e.app.save(record);

  e.app.logger().info("saas signup", "subdomain", sub, "email", email);
  return e.json(200, {
    status: "ok",
    message: "Dein Album wird eingerichtet. Du bekommst in wenigen Minuten eine E-Mail zum Setzen deines Passworts.",
    url: "https://" + sub + "." + lib.env("SAAS_DOMAIN"),
  });
});

// --- Provisioning-Worker (jede Minute) ---------------------------------------
// provisioning: Coolify-App anlegen + Deploy starten → deploying
// deploying:    Health prüfen; gesund → Bootstrap (SMTP, Admin, Mail) → trial
//               länger als 30 min nicht gesund → error
cronAdd("saas-provisioner", "* * * * *", () => {
  const lib = require(__hooks + "/lib/provisionlib.js");

  // 1) neue Anmeldungen anlegen
  const fresh = $app.findRecordsByFilter("customers", "status = 'provisioning'", "created", 5, 0);
  for (const r of fresh) {
    try {
      const inst = lib.createInstance(r.getString("subdomain"));
      r.set("coolifyAppUuid", inst.uuid);
      r.set("instanceUrl", inst.url);
      r.set("opsEmail", inst.opsEmail);
      r.set("opsPass", inst.opsPass);
      r.set("status", "deploying");
      r.set("lastError", "");
      $app.save(r);
      $app.logger().info("saas provisioned", "subdomain", r.getString("subdomain"), "uuid", inst.uuid);
    } catch (err) {
      r.set("lastError", String(err).slice(0, 500));
      $app.save(r);
      $app.logger().error("saas provisioning failed", "subdomain", r.getString("subdomain"), "error", String(err));
    }
  }

  // 2) deployende Instanzen prüfen und fertigstellen
  const deploying = $app.findRecordsByFilter("customers", "status = 'deploying'", "created", 10, 0);
  for (const r of deploying) {
    const url = r.getString("instanceUrl");
    if (!lib.isHealthy(url)) {
      // Timeout: 30 Minuten nach Erstellung
      const created = new Date(r.getString("created")).getTime();
      if (Date.now() - created > 30 * 60 * 1000) {
        r.set("status", "error");
        r.set("lastError", "Instanz wurde nicht gesund (Timeout) — in Coolify prüfen.");
        $app.save(r);
        $app.logger().error("saas deploy timeout", "subdomain", r.getString("subdomain"));
      }
      continue;
    }
    try {
      lib.bootstrapInstance(url, r.getString("opsEmail"), r.getString("opsPass"),
        r.getString("email"), r.getString("name"));
      r.set("status", "trial");
      r.set("lastError", "");
      $app.save(r);
      $app.logger().info("saas trial started", "subdomain", r.getString("subdomain"));
    } catch (err) {
      r.set("lastError", String(err).slice(0, 500));
      $app.save(r);
      $app.logger().error("saas bootstrap failed", "subdomain", r.getString("subdomain"), "error", String(err));
    }
  }
});
