/// <reference path="../pb_data/types.d.ts" />
//
// Wraps PocketBase's built-in auth e-mails (verification, password reset, email
// change) in the shared branded shell so they match the order-confirmation
// mails and carry the instance's logo/colours. PocketBase has already rendered
// the localized body (German text + correct SPA link from the DB templates, see
// pb_migrations/*_email_templates_*.js) into e.message.html before these Send
// hooks fire — we only wrap it, so no token/URL handling is needed here.
//
// NOTE: JSVM handlers run isolated and cannot see top-level helpers, so each
// handler is fully self-contained (require + wrap inline).

onMailerRecordVerificationSend((e) => {
  try {
    const mail = require(__hooks + "/lib/emaillib.js");
    if (e.message && e.message.html) {
      e.message.html = mail.brandShell(e.app, e.message.html);
    }
  } catch (err) {
    e.app.logger().warn("verification mail branding failed", "error", String(err));
  }
  e.next();
});

onMailerRecordPasswordResetSend((e) => {
  try {
    const mail = require(__hooks + "/lib/emaillib.js");
    if (e.message && e.message.html) {
      e.message.html = mail.brandShell(e.app, e.message.html);
    }
  } catch (err) {
    e.app.logger().warn("password reset mail branding failed", "error", String(err));
  }
  e.next();
});

onMailerRecordEmailChangeSend((e) => {
  try {
    const mail = require(__hooks + "/lib/emaillib.js");
    if (e.message && e.message.html) {
      e.message.html = mail.brandShell(e.app, e.message.html);
    }
  } catch (err) {
    e.app.logger().warn("email change mail branding failed", "error", String(err));
  }
  e.next();
});
