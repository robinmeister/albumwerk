/// <reference path="../../pb_data/types.d.ts" />
//
// E-Mails rund um den Druckauftrag. Jede Funktion schluckt ihre Fehler: Eine
// Mail, die nicht rausgeht, darf weder die Bestellung noch den Auftrag kippen.

var mail = typeof __hooks !== "undefined"
  ? require(__hooks + "/lib/emaillib.js")
  : require("./emaillib.js");

function appUrl(app) {
  try {
    return String(app.settings().meta.appURL || "").replace(/\/+$/, "");
  } catch (_) {
    return "";
  }
}

function photographerEmail(app) {
  try {
    var s = app.findRecordById("settings", "appsettings0001");
    return s.getString("orderNotificationEmail") || s.getString("contactEmail");
  } catch (_) {
    return "";
  }
}

function customerEmail(job) {
  try {
    return String(JSON.parse(job.getString("recipient") || "{}").email || "");
  } catch (_) {
    return "";
  }
}

function send(app, to, subject, title, paragraphs, buttonLabel, buttonUrl) {
  if (!to) return;
  try {
    var brand = mail.readBrand(app);
    var inner = "<h2 style='font-weight:600;margin:0 0 12px'>" + mail.escapeHtml(title) + "</h2>" +
      paragraphs.map(function (p) { return "<p>" + mail.escapeHtml(p) + "</p>"; }).join("") +
      (buttonUrl ? mail.button(buttonLabel, buttonUrl) : "");
    app.newMailClient().send(new MailerMessage({
      from: { address: app.settings().meta.senderAddress, name: brand.businessName || "Fotogalerie" },
      to: [{ address: to }],
      subject: subject,
      html: mail.brandShell(app, inner),
      text: mail.plainText([title, ""].concat(paragraphs).concat(buttonUrl ? ["", buttonUrl] : [])),
    }));
  } catch (err) {
    app.logger().warn("print mail failed", "subject", subject, "error", String(err));
  }
}

function jobsLink(app) {
  var base = appUrl(app);
  return base ? base + "/print" : "";
}

function trackingLines(job) {
  var nr = job.getString("trackingNumber");
  return nr ? ["Sendungsnummer: " + nr] : [];
}

function notifyAwaitingApproval(app, job) {
  send(app, photographerEmail(app),
    "Neue Druckbestellung wartet auf Freigabe",
    "Neue Druckbestellung",
    ["Eine bezahlte Bestellung enthält Drucke. Prüfe sie und gib sie frei, dann geht der Auftrag an Prodigi."],
    "Druckaufträge öffnen", jobsLink(app));
}

function notifyFailed(app, job) {
  send(app, photographerEmail(app),
    "Druckauftrag braucht deine Aufmerksamkeit",
    "Druckauftrag fehlgeschlagen",
    ["Prodigi meldet ein Problem mit einem Druckauftrag:", job.getString("error")],
    "Druckaufträge öffnen", jobsLink(app));
}

function notifyStudioShipped(app, job) {
  send(app, photographerEmail(app),
    "Deine Drucke sind unterwegs zu dir",
    "Drucke unterwegs",
    ["Prodigi hat die Drucke an dich verschickt. Wenn du sie an die Kund:in weitergeschickt hast, markiere den Auftrag als versendet."]
      .concat(trackingLines(job)),
    "Druckaufträge öffnen", jobsLink(app));
}

// Gemeinsam für Labor (Webhook) und Handdrucke („Abschicken“).
function notifyShipped(app, to, trackingNumber, trackingUrl) {
  var nr = String(trackingNumber || "");
  var url = String(trackingUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) url = "";
  send(app, to,
    "Deine Drucke sind unterwegs",
    "Deine Drucke sind unterwegs",
    ["Deine bestellten Drucke wurden verschickt."].concat(nr ? ["Sendungsnummer: " + nr] : []),
    "Sendung verfolgen", url);
}

function notifyCustomerShipped(app, job) {
  notifyShipped(app, customerEmail(job), job.getString("trackingNumber"), job.getString("trackingUrl"));
}

module.exports = {
  notifyAwaitingApproval: notifyAwaitingApproval,
  notifyFailed: notifyFailed,
  notifyStudioShipped: notifyStudioShipped,
  notifyCustomerShipped: notifyCustomerShipped,
  notifyShipped: notifyShipped,
};
