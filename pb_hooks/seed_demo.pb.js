/// <reference path="../pb_data/types.d.ts" />
// Demo data + dev conveniences. Only active when PB_SEED_DEMO is set
// (docker-compose.dev.yml does this; the production compose file does not),
// and the seed itself refuses to touch an instance that already has data.

onBootstrap((e) => {
  e.next(); // bootstrap first — the seed needs the migrated database

  const flag = ($os.getenv("PB_SEED_DEMO") || "").toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") {
    try {
      const seedDemo = require(__hooks + "/lib/seeddemolib.js");
      if (seedDemo(e.app)) {
        e.app.logger().info("demo data seeded (admin@demo.test / kunde@demo.test)");
      }
    } catch (err) {
      e.app.logger().error("demo seed failed", "error", String(err));
    }
  }

  // dev only: point PocketBase's mail settings at the mailpit container so
  // verification/order mails work out of the box (visible on the mailpit UI)
  const smtpHost = $os.getenv("PB_DEV_SMTP_HOST") || "";
  if (smtpHost) {
    try {
      const settings = e.app.settings();
      settings.smtp.enabled = true;
      settings.smtp.host = smtpHost;
      settings.smtp.port = parseInt($os.getenv("PB_DEV_SMTP_PORT") || "1025", 10);
      settings.smtp.tls = false;
      if (!settings.meta.senderAddress || settings.meta.senderAddress === "support@example.com") {
        settings.meta.senderAddress = "noreply@demo.test";
        settings.meta.senderName = "Demo Fotostudio";
      }
      if (!settings.meta.appName || settings.meta.appName === "Acme") {
        settings.meta.appName = "Demo Fotostudio";
      }
      const appUrl = $os.getenv("PB_DEV_APP_URL");
      if (appUrl) settings.meta.appURL = appUrl;
      e.app.save(settings);
    } catch (err) {
      e.app.logger().warn("dev smtp autoconfig failed", "error", String(err));
    }
  }
});
