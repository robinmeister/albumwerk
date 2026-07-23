/// <reference path="../../pb_data/types.d.ts" />
//
// Forwarding of support tickets from a customer instance to the software vendor.
// Used by pb_hooks/support.pb.js. JSVM handlers run isolated, so the shared
// logic lives here and is pulled in via require(__hooks + "/lib/supportlib.js").
//
// Every instance is its own container with its own database (see
// docs/multi-tenant.md), so "forward to the vendor" means leaving the instance:
//   1. POST to the control plane (SAAS_CONTROL_URL) — the central inbox,
//   2. on any failure: e-mail to VENDOR_SUPPORT_EMAIL via the instance's SMTP.
// If neither is configured (the self-hosting default) nothing ever leaves the
// instance and tickets stay with the instance admin.

function env(key, fallback) {
  const v = $os.getenv(key);
  return v === "" || v === undefined || v === null
    ? (fallback === undefined ? "" : fallback)
    : v;
}

function vendorConfig() {
  const controlUrl = String(env("SAAS_CONTROL_URL")).replace(/\/+$/, "");
  const vendorEmail = env("VENDOR_SUPPORT_EMAIL");
  return {
    controlUrl: controlUrl,
    vendorEmail: vendorEmail,
    enabled: Boolean(controlUrl || vendorEmail),
  };
}

function instanceInfo(app) {
  let appUrl = "";
  try {
    appUrl = String(app.settings().meta.appURL || "").replace(/\/+$/, "");
  } catch (_) { /* keep empty */ }

  let businessName = "";
  let adminEmail = "";
  try {
    const s = app.findRecordById("settings", "appsettings0001");
    businessName = s.getString("businessName");
    adminEmail = s.getString("contactEmail") || s.getString("orderNotificationEmail");
  } catch (_) { /* settings not seeded yet */ }

  return { instanceUrl: appUrl, businessName: businessName, adminEmail: adminEmail };
}

// All messages of a ticket, oldest first, as plain objects.
function ticketMessages(app, ticketId) {
  let records = [];
  try {
    records = app.findRecordsByFilter(
      "supportMessages",
      "ticketId = {:ticket}",
      "created",
      200,
      0,
      { ticket: ticketId },
    );
  } catch (_) { /* no messages yet */ }

  return records.map(function (m) {
    return {
      role: m.getString("authorRole") || "user",
      at: String(m.get("created") || ""),
      body: m.getString("body"),
    };
  });
}

// The exact payload that leaves the instance. Personal data of the reporter is
// only included when they ticked the consent box on the support form — the
// admin-initiated forward of someone else's ticket therefore stays anonymous
// unless that reporter agreed.
function buildReport(app, ticket, note) {
  const info = instanceInfo(app);
  const consent = ticket.getBool("consentForward");

  let reporterEmail = "";
  let reporterName = "";
  if (consent) {
    try {
      const user = app.findRecordById("users", ticket.getString("userId"));
      reporterEmail = user.email();
      reporterName = [user.getString("firstName"), user.getString("lastName")]
        .filter(Boolean)
        .join(" ");
    } catch (_) { /* user gone — send without */ }
  }

  // A json field comes back as raw bytes in the JSVM — getString() is what
  // yields the stored JSON text (JSON.stringify(get(...)) would emit a byte
  // array).
  let context = null;
  try {
    const rawContext = ticket.getString("context");
    if (rawContext && rawContext !== "null") context = JSON.parse(rawContext);
  } catch (_) { /* leave null */ }

  return {
    instanceUrl: info.instanceUrl,
    businessName: info.businessName,
    adminEmail: info.adminEmail,
    appVersion: env("APP_VERSION", "unknown"),
    ticketRef: ticket.id,
    subject: ticket.getString("subject"),
    category: ticket.getString("category"),
    createdAt: String(ticket.get("created") || ""),
    note: String(note || ""),
    consent: consent,
    reporterEmail: reporterEmail,
    reporterName: reporterName,
    context: context,
    messages: ticketMessages(app, ticket.id),
  };
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Fallback channel: the whole report as a readable mail, with the raw payload
// appended so nothing is lost compared to the HTTP route.
function mailReport(app, report, to) {
  const mail = require(__hooks + "/lib/emaillib.js");

  let conversation = "";
  for (const m of report.messages) {
    conversation +=
      "<p style='margin:0 0 4px'><b>" + escapeHtml(m.role) + "</b> · " +
      escapeHtml(m.at) + "</p>" +
      "<p style='margin:0 0 12px;white-space:pre-wrap'>" + escapeHtml(m.body) + "</p>";
  }

  const meta =
    "<p style='margin:0 0 12px'>" +
    "Instanz: <b>" + escapeHtml(report.instanceUrl || "unbekannt") + "</b><br/>" +
    "Betrieb: " + escapeHtml(report.businessName) + "<br/>" +
    "Version: " + escapeHtml(report.appVersion) + "<br/>" +
    "Kategorie: " + escapeHtml(report.category) + "<br/>" +
    "Admin: " + escapeHtml(report.adminEmail) + "<br/>" +
    "Melder: " + escapeHtml(report.reporterEmail || "(keine Einwilligung zur Weitergabe)") +
    "</p>";

  const noteHtml = report.note
    ? "<p style='margin:0 0 12px'><b>Notiz des Betreibers:</b><br/>" +
      escapeHtml(report.note) + "</p>"
    : "";

  const raw =
    "<pre style='margin-top:16px;padding:8px;background:#f4f4f5;font-size:11px;" +
    "white-space:pre-wrap;word-break:break-word'>" +
    escapeHtml(JSON.stringify(report, null, 2)) +
    "</pre>";

  app.newMailClient().send(new MailerMessage({
    from: {
      address: app.settings().meta.senderAddress,
      name: report.businessName || "Albumwerk",
    },
    to: [{ address: to }],
    subject: "[Support] " + (report.subject || "Anfrage") + " – " + (report.businessName || report.instanceUrl),
    html: mail.brandShell(
      app,
      "<h2 style='font-weight:600;margin:0 0 12px'>Support-Meldung einer Instanz</h2>" +
      meta + noteHtml +
      "<h3 style='font-weight:600;margin:16px 0 8px'>Verlauf</h3>" + conversation + raw,
    ),
    text: mail.plainText([
      "Support-Meldung einer Instanz",
      "",
      "Instanz: " + report.instanceUrl,
      "Betrieb: " + report.businessName,
      "Version: " + report.appVersion,
      "Kategorie: " + report.category,
      "Melder: " + (report.reporterEmail || "(keine Einwilligung zur Weitergabe)"),
      "",
      report.note ? "Notiz: " + report.note : "",
      "",
      JSON.stringify(report, null, 2),
    ]),
  }));
}

// Forward a ticket to the vendor and record the outcome on the ticket itself.
// Never throws: a failed forward must not stop the ticket from existing, it just
// shows up as forwardState="failed" with a retry button for the admin.
function forwardTicket(app, ticket, note) {
  const cfg = vendorConfig();
  if (!cfg.enabled) {
    ticket.set("forwardState", "failed");
    ticket.set("forwardError", "Keine Hersteller-Weiterleitung konfiguriert");
    try { app.save(ticket); } catch (_) { /* best effort */ }
    return { ok: false, via: "none", error: "not configured" };
  }

  const report = buildReport(app, ticket, note);
  let httpError = "";

  if (cfg.controlUrl) {
    try {
      const res = $http.send({
        url: cfg.controlUrl + "/api/saas/support-report",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
        timeout: 15,
      });
      if (res.statusCode === 200) {
        const json = res.json || {};
        ticket.set("forwardState", "sent");
        ticket.set("forwardRef", String(json.id || ""));
        ticket.set("forwardedAt", new Date().toISOString());
        ticket.set("forwardError", "");
        app.save(ticket);
        return { ok: true, via: "control-plane", id: json.id };
      }
      httpError = "Control-Plane antwortete mit HTTP " + res.statusCode;
    } catch (err) {
      httpError = "Control-Plane nicht erreichbar: " + String(err);
    }
    app.logger().warn("support forward: http failed", "error", httpError);
  }

  if (cfg.vendorEmail) {
    try {
      mailReport(app, report, cfg.vendorEmail);
      ticket.set("forwardState", "sent");
      ticket.set("forwardedAt", new Date().toISOString());
      ticket.set("forwardError", httpError ? httpError + " — per E-Mail zugestellt" : "");
      app.save(ticket);
      return { ok: true, via: "email" };
    } catch (err) {
      const mailError = "E-Mail-Fallback fehlgeschlagen: " + String(err);
      app.logger().error("support forward: mail failed", "error", mailError);
      ticket.set("forwardState", "failed");
      ticket.set("forwardError", [httpError, mailError].filter(Boolean).join(" · "));
      try { app.save(ticket); } catch (_) { /* best effort */ }
      return { ok: false, via: "none", error: mailError };
    }
  }

  ticket.set("forwardState", "failed");
  ticket.set("forwardError", httpError);
  try { app.save(ticket); } catch (_) { /* best effort */ }
  return { ok: false, via: "none", error: httpError };
}

module.exports = {
  env: env,
  vendorConfig: vendorConfig,
  instanceInfo: instanceInfo,
  ticketMessages: ticketMessages,
  buildReport: buildReport,
  forwardTicket: forwardTicket,
  escapeHtml: escapeHtml,
};
