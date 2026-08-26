/// <reference path="../pb_data/types.d.ts" />
//
// Self-Service-Signup (14-Tage-Trial, ohne Kreditkarte) + asynchroner
// Provisioning-Worker.
//
// Ablauf:
//   1. POST /api/saas/signup   → Datensatz "pending", Bestätigungsmail raus.
//                                Es entsteht noch KEIN Container.
//   2. GET  /api/saas/confirm  → Klick aus der Mail: "provisioning", Trial
//                                startet ab jetzt, Weiterleitung zur Warteseite.
//   3. Cron-Worker             → Coolify-App anlegen, Health abwarten,
//                                Bootstrap → "trial".
//   4. GET  /api/saas/status   → Die Warteseite pollt hier und bekommt, sobald
//                                die Instanz läuft, einen Login-Token für den
//                                Direkteinstieg ohne Passwort.
//
// Der Umweg über die Mailbestätigung ist Absicht: ein Skript mit
// Wegwerf-Adressen erzeugt so nur Datenbankzeilen statt echter Container.

// Hübsche Adresse für den Knopf auf der Marketing-Website: die Seite selbst
// liegt als statische Datei in pb_public, und PocketBase löst /signup nicht
// von allein auf signup.html auf.
routerAdd("GET", "/signup", (e) => e.redirect(302, "/signup.html"));

// --- Öffentlicher Signup-Endpoint ------------------------------------------
routerAdd("POST", "/api/saas/signup", (e) => {
  // JSVM-Handler laufen isoliert — Konstanten müssen im Handler stehen.
  const SIGNUPS_PER_HOUR = 20;   // globale Notbremse gegen Formular-Spam

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

  // Notbremse: begrenzt, wie viele Datensätze pro Stunde überhaupt entstehen
  const since = new Date(Date.now() - 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);
  try {
    const recent = e.app.findRecordsByFilter("customers", "created > {:since}", "-created",
      SIGNUPS_PER_HOUR + 1, 0, { since: since });
    if (recent.length >= SIGNUPS_PER_HOUR) {
      return e.json(429, {
        status: "error",
        message: "Gerade sind sehr viele Anmeldungen unterwegs. Bitte versuch es in einer Stunde noch einmal.",
      });
    }
  } catch (err) {
    e.app.logger().warn("signup: rate check failed", "error", String(err));
  }

  // Kapazität: der VPS trägt eine begrenzte Zahl gleichzeitiger Instanzen.
  // Ist sie erreicht, wird die Adresse notiert, aber nichts provisioniert —
  // die zahlenden Kunden auf demselben Server haben Vorrang.
  const maxTrials = parseInt(lib.env("MAX_TRIALS", "12"), 10);
  let running = 0;
  try {
    running = e.app.findRecordsByFilter("customers",
      "status = 'provisioning' || status = 'deploying' || status = 'trial' || status = 'active'",
      "created", maxTrials + 1, 0).length;
  } catch (_) { /* leere Collection */ }
  const full = running >= maxTrials;

  const collection = e.app.findCollectionByNameOrId("customers");
  const record = new Record(collection);
  record.set("name", name);
  record.set("email", email);
  record.set("subdomain", sub);
  record.set("status", full ? "waitlist" : "pending");
  record.set("confirmToken", $security.randomString(40));
  e.app.save(record);

  if (full) {
    e.app.logger().info("saas signup waitlisted", "subdomain", sub, "running", running);
    try {
      lib.sendMail(e.app, email, "Du stehst auf der Warteliste",
        "<p>Hallo" + (name ? " " + name : "") + ",</p>" +
        "<p>danke für dein Interesse an Albumwerk. Gerade sind alle Testplätze " +
        "belegt — wir schalten deinen frei, sobald einer frei wird, und melden " +
        "uns dann bei dieser Adresse.</p>" +
        "<p>Viele Grüße<br/>Albumwerk</p>");
    } catch (err) {
      e.app.logger().error("saas waitlist mail failed", "subdomain", sub, "error", String(err));
    }
    return e.json(200, {
      status: "waitlist",
      message: "Gerade sind alle Testplätze belegt. Wir haben dich vorgemerkt und melden uns, sobald einer frei wird.",
    });
  }

  const link = lib.controlUrl() + "/api/saas/confirm?token=" + record.getString("confirmToken");
  try {
    lib.sendMail(e.app, email, "Nur noch ein Klick: bestätige deine E-Mail-Adresse",
      "<p>Hallo" + (name ? " " + name : "") + ",</p>" +
      "<p>schön, dass du Albumwerk ausprobierst. Ein Klick noch, dann richten " +
      "wir dein Album unter <b>" + sub + "." + lib.env("SAAS_DOMAIN") + "</b> ein:</p>" +
      "<p><a href='" + link + "'>E-Mail-Adresse bestätigen und Album einrichten</a></p>" +
      "<p>Der Testzeitraum von 14 Tagen startet erst mit diesem Klick. Wenn du " +
      "dich nicht angemeldet hast, ignoriere diese Mail einfach — dann passiert nichts.</p>" +
      "<p>Viele Grüße<br/>Albumwerk</p>");
  } catch (err) {
    e.app.logger().error("saas confirm mail failed", "subdomain", sub, "error", String(err));
    return e.json(500, {
      status: "error",
      message: "Die Bestätigungsmail konnte nicht verschickt werden. Bitte melde dich bei uns.",
    });
  }

  e.app.logger().info("saas signup pending", "subdomain", sub, "email", email);
  return e.json(200, {
    status: "pending",
    message: "Fast geschafft! Wir haben dir eine E-Mail geschickt — bestätige darin deine Adresse, dann richten wir dein Album ein.",
  });
});

// --- Bestätigungslink aus der Mail ------------------------------------------
routerAdd("GET", "/api/saas/confirm", (e) => {
  const lib = require(__hooks + "/lib/provisionlib.js");
  const token = String(e.requestInfo().query.token || "");
  if (token.length < 20) {
    return e.redirect(302, lib.controlUrl() + "/warten.html?fehler=token");
  }

  let record;
  try {
    record = e.app.findFirstRecordByFilter("customers", "confirmToken = {:t}", { t: token });
  } catch (_) {
    return e.redirect(302, lib.controlUrl() + "/warten.html?fehler=token");
  }

  // Idempotent: ein zweiter Klick (oder der Weg zurück nach geschlossenem Tab)
  // führt einfach wieder auf die Warteseite.
  if (record.getString("status") === "pending") {
    record.set("status", "provisioning");
    record.set("confirmedAt", new Date().toISOString());
    record.set("trialEndsAt", new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString());
    e.app.save(record);
    e.app.logger().info("saas signup confirmed", "subdomain", record.getString("subdomain"));
  }
  return e.redirect(302, lib.controlUrl() + "/warten.html?token=" + token);
});

// --- Statusabfrage der Warteseite -------------------------------------------
// Ausweis ist der Bestätigungstoken aus der Mail. Sobald die Instanz läuft,
// kommt zusätzlich ein kurzlebiger Login-Token für den Direkteinstieg.
routerAdd("GET", "/api/saas/status", (e) => {
  const lib = require(__hooks + "/lib/provisionlib.js");
  const LOGIN_WINDOW_H = 24;   // so lange taugt der Mail-Link zum Einloggen

  const token = String(e.requestInfo().query.token || "");
  let record;
  try {
    record = e.app.findFirstRecordByFilter("customers", "confirmToken = {:t}", { t: token });
  } catch (_) {
    return e.json(404, { status: "error", message: "Unbekannter Link." });
  }

  const status = record.getString("status");
  const out = {
    status: status,
    subdomain: record.getString("subdomain"),
    url: record.getString("instanceUrl"),
  };
  if (status !== "trial" && status !== "active") {
    return e.json(200, out);
  }

  const confirmed = new Date(record.getString("confirmedAt")).getTime();
  if (!confirmed || Date.now() - confirmed > LOGIN_WINDOW_H * 3600 * 1000) {
    return e.json(200, out);   // Fenster zu: normaler Login auf der Instanz
  }
  try {
    out.loginToken = lib.instanceLoginToken(record.getString("instanceUrl"),
      record.getString("opsEmail"), record.getString("opsPass"),
      record.getString("email"), 1800);
  } catch (err) {
    e.app.logger().error("saas login token failed",
      "subdomain", record.getString("subdomain"), "error", String(err));
  }
  return e.json(200, out);
});

// --- Provisioning-Worker (jede Minute) ---------------------------------------
// provisioning: Coolify-App anlegen + Deploy starten → deploying
// deploying:    Health prüfen; gesund → Bootstrap (SMTP, Admin) → trial
//               länger als 30 min nicht gesund → error
cronAdd("saas-provisioner", "* * * * *", () => {
  const lib = require(__hooks + "/lib/provisionlib.js");

  // 1) bestätigte Anmeldungen anlegen
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
      // Timeout: 30 Minuten ab Deploy-Start (= letzte Statusänderung,
      // fehlgeschlagene Health-Checks speichern den Record nicht)
      const since = new Date(r.getString("updated")).getTime();
      if (Date.now() - since > 30 * 60 * 1000) {
        r.set("status", "error");
        r.set("lastError", "Instanz wurde nicht gesund (Timeout) — in Coolify prüfen.");
        $app.save(r);
        $app.logger().error("saas deploy timeout", "subdomain", r.getString("subdomain"));
      }
      continue;
    }
    try {
      // sendWelcome=false: den Einstieg macht die Warteseite per Login-Token
      lib.bootstrapInstance(url, r.getString("opsEmail"), r.getString("opsPass"),
        r.getString("email"), r.getString("name"), false);
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
