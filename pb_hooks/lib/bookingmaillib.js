/// <reference path="../../pb_data/types.d.ts" />
//
// Die Mails rund um einen Termin (docs/terminbuchung.md §8).
//
// Setzt auf emaillib.js auf — gleicher gebrandeter Rahmen wie die
// Bestell- und Auth-Mails, damit alles aus einer Hand aussieht.
//
// Wichtig für den Betrieb: Mailzustellbarkeit ist hier kritischer als
// anderswo in der App. Eine verlorene Bestellbestätigung ist ärgerlich; ein
// verlorener Storno-Link bedeutet blockierter Slot plus Nichterscheinen.
// Deshalb wirft hier nichts — ein Fehlschlag beim Versand darf niemals eine
// bereits geschriebene Buchung kippen. Die Aufrufer bekommen `false` zurück.

// --- Darstellung ----------------------------------------------------------

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function pad2(value) {
  return value < 10 ? "0" + value : "" + value;
}

// Termin in der Zeitzone der Instanz, ausgeschrieben und IMMER mit Angabe der
// Zone — sonst rechnet jemand aus dem Urlaub oder aus der Schweiz eine Stunde
// daneben (docs/terminbuchung.md §3).
//
// Die Zerlegung läuft über Gos Zeitzonendatenbank: Der Instant wird in der Zone
// formatiert und wieder eingelesen. In der JSVM gibt es kein Intl.
function formatLocal(ms, timezone) {
  const local = shiftToZone(ms, timezone);
  const zoneLabel = zoneCity(timezone);
  return (
    WEEKDAYS[local.weekday] + ", " +
    local.day + ". " + MONTHS[local.month - 1] + " " + local.year +
    ", " + pad2(local.hour) + ":" + pad2(local.minute) + " Uhr" +
    (zoneLabel ? " (Zeit in " + zoneLabel + ")" : "")
  );
}

function formatTimeOnly(ms, timezone) {
  const local = shiftToZone(ms, timezone);
  return pad2(local.hour) + ":" + pad2(local.minute) + " Uhr";
}

// Millisekunden → lokale Kalenderbestandteile.
//
// Trick: `new DateTime(utcString, zone)` liest eine Wanduhrzeit IN der Zone.
// Interpretiert man dieselbe Zeichenkette einmal als UTC und einmal in der
// Zone, ist die Differenz genau die Verschiebung der Zone zu diesem Zeitpunkt.
// Damit lässt sich der Instant in die lokale Wanduhrzeit umrechnen, ohne dass
// die JSVM eine Formatierfunktion mit Zeitzone anbietet.
function shiftToZone(ms, timezone) {
  let offsetMs = 0;
  try {
    const iso = new Date(ms).toISOString().replace("T", " ").substring(0, 19);
    const asZone = new DateTime(iso, timezone).unix() * 1000;
    const asUtc = new DateTime(iso + "Z").unix() * 1000;
    offsetMs = asUtc - asZone;
  } catch (_) {
    offsetMs = 0; // im Zweifel UTC anzeigen statt gar nichts
  }
  const shifted = new Date(ms + offsetMs);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

// "Europe/Berlin" → "Berlin"
function zoneCity(timezone) {
  const parts = String(timezone || "").split("/");
  return parts.length > 1 ? parts[parts.length - 1].replace(/_/g, " ") : "";
}

// --- Bausteine ------------------------------------------------------------

// Die Eckdaten als Tabelle — in jeder Mail gleich aufgebaut, damit man sie
// nicht jedes Mal neu lesen muss.
function detailsTable(mail, view) {
  const row = (label, value) =>
    "<tr>" +
      "<td style='padding:4px 16px 4px 0;color:#666;vertical-align:top'>" + mail.escapeHtml(label) + "</td>" +
      "<td style='padding:4px 0'><b>" + mail.escapeHtml(value) + "</b></td>" +
    "</tr>";

  let html = "<table style='border-collapse:collapse;margin:16px 0'>";
  html += row("Termin", view.whenLong);
  html += row("Dauer", view.durationMin + " Minuten");
  html += row("Leistung", view.typeName);
  if (view.location) html += row("Ort", view.location);
  if (view.customerName) html += row("Name", view.customerName);
  if (view.customerEmail) html += row("E-Mail", view.customerEmail);
  if (view.customerPhone) html += row("Telefon", view.customerPhone);
  if (view.message) html += row("Anliegen", view.message);
  html += "</table>";
  return html;
}

function detailsText(view) {
  const lines = [
    "Termin:   " + view.whenLong,
    "Dauer:    " + view.durationMin + " Minuten",
    "Leistung: " + view.typeName,
  ];
  if (view.location) lines.push("Ort:      " + view.location);
  if (view.customerName) lines.push("Name:     " + view.customerName);
  if (view.customerEmail) lines.push("E-Mail:   " + view.customerEmail);
  if (view.customerPhone) lines.push("Telefon:  " + view.customerPhone);
  if (view.message) lines.push("Anliegen: " + view.message);
  return lines;
}

/**
 * Die Anzeigedaten einer Buchung an einer Stelle gebündelt, damit jede Mail
 * dieselben Werte benutzt.
 */
function viewOf(app, record, config) {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const startMs = booking.recordMs(record, "start");
  const endMs = booking.recordMs(record, "end");

  let appUrl = "";
  try {
    appUrl = String(app.settings().meta.appURL || "").replace(/\/+$/, "");
  } catch (_) { /* leer lassen */ }

  let location = "";
  try {
    location = app.findRecordById("appointmentTypes", record.getString("type")).getString("location");
  } catch (_) { /* Art gelöscht — Ort entfällt */ }

  const token = record.getString("token");
  return {
    id: record.id,
    startMs: startMs,
    endMs: endMs,
    whenLong: formatLocal(startMs, config.timezone),
    endTime: formatTimeOnly(endMs, config.timezone),
    durationMin: record.getInt("durationMin"),
    typeName: record.getString("typeName") || "Termin",
    location: location,
    customerName: record.getString("customerName"),
    customerEmail: record.getString("customerEmail"),
    customerPhone: record.getString("customerPhone"),
    message: record.getString("message"),
    appUrl: appUrl,
    manageUrl: token ? appUrl + "/termin/" + token : "",
    businessName: config.businessName,
  };
}

// --- .ics-Anhang ----------------------------------------------------------

// Als Anhang statt als Link: Ein Anhang landet mit einem Tippen im
// Handy-Kalender. Schlägt das Erzeugen fehl, geht die Mail trotzdem raus —
// ohne Kalendereintrag ist schlechter als ohne Mail, aber nicht annähernd so
// schlecht wie gar keine Bestätigung. Der Fehlschlag wird aber protokolliert:
// Ein still fehlender Anhang fällt sonst monatelang niemandem auf.
//
// PocketBase erwartet als Anhang einen io.Reader. `$filesystem.fileFromBytes`
// liefert eine File-Struktur, die selbst KEIN Reader ist — erst
// `.reader.open()` gibt den ReadSeekCloser, den der Mailer verarbeiten kann.
function icsAttachment(app, view, options) {
  try {
    const ical = require(__hooks + "/lib/icallib.js");
    const description = options.cancelled
      ? "Dieser Termin wurde abgesagt."
      : (view.manageUrl ? "Termin absagen oder verschieben: " + view.manageUrl : "");

    const text = ical.calendar([{
      uid: ical.uidFor(view.id, view.appUrl),
      startMs: view.startMs,
      endMs: view.endMs,
      summary: view.typeName + " – " + view.businessName,
      description: description,
      location: view.location,
      status: options.cancelled ? "CANCELLED" : (options.tentative ? "TENTATIVE" : "CONFIRMED"),
      // hochgezählt, damit eine Änderung den vorhandenen Eintrag ersetzt
      sequence: options.sequence || 0,
      organizer: options.organizer,
      stampMs: Date.now(),
    }], { name: view.businessName });

    const file = $filesystem.fileFromBytes(toBytes(text), "termin.ics");
    return { "termin.ics": file.reader.open() };
  } catch (err) {
    try {
      app.logger().error("[booking] .ics-Anhang konnte nicht erzeugt werden", "error", String(err));
    } catch (_) { /* Logging darf die Mail nicht verhindern */ }
    return null;
  }
}

// --- Versand --------------------------------------------------------------

function senderAddress(app) {
  try {
    const meta = app.settings().meta;
    return { address: meta.senderAddress, name: meta.senderName };
  } catch (_) {
    return { address: "noreply@localhost", name: "Albumwerk" };
  }
}

// Einziger Ort, an dem tatsächlich versendet wird. Fängt alles ab.
function send(app, options) {
  if (!options.to) return false;
  const mail = require(__hooks + "/lib/emaillib.js");
  try {
    const message = new MailerMessage({
      from: senderAddress(app),
      to: [{ address: options.to }],
      subject: options.subject,
      html: mail.brandShell(app, options.html),
      text: mail.plainText(options.text),
    });
    if (options.attachments) {
      message.attachments = options.attachments;
    }
    app.newMailClient().send(message);
    return true;
  } catch (err) {
    app.logger().error("[booking] Mailversand fehlgeschlagen", "to", options.to, "error", String(err));
    return false;
  }
}

function heading(text) {
  return "<h2 style='margin:0 0 12px;font-size:18px'>" + text + "</h2>";
}

function manageBlock(mail, view, config) {
  if (!view.manageUrl) return "";
  return (
    mail.button("Termin verwalten", view.manageUrl) +
    "<p style='color:#666;font-size:13px'>Über diesen Link kannst du deinen Termin " +
    "bis " + config.cancelDeadlineHours + " Stunden vorher absagen oder verschieben.</p>"
  );
}

// --- Die einzelnen Mails --------------------------------------------------

function customerConfirmation(app, record, config, options) {
  const mail = require(__hooks + "/lib/emaillib.js");
  const view = viewOf(app, record, config);
  const pending = !!(options && options.pending);

  const title = pending ? "Deine Terminanfrage ist eingegangen" : "Dein Termin steht";
  const intro = pending
    ? "<p>Wir haben deine Anfrage erhalten und melden uns innerhalb von " +
      config.pendingExpiryHours + " Stunden.</p>"
    : "<p>Dein Termin ist bestätigt. Wir freuen uns auf dich!</p>";

  return send(app, {
    to: view.customerEmail,
    subject: (pending ? "Terminanfrage eingegangen – " : "Terminbestätigung – ") + view.businessName,
    html:
      heading(mail.escapeHtml(title)) +
      intro +
      detailsTable(mail, view) +
      manageBlock(mail, view, config),
    text: [
      title,
      "",
      pending
        ? "Wir melden uns innerhalb von " + config.pendingExpiryHours + " Stunden."
        : "Dein Termin ist bestätigt.",
      "",
    ].concat(detailsText(view), [
      "",
      view.manageUrl ? "Absagen oder verschieben: " + view.manageUrl : "",
    ]),
    // Eine offene Anfrage ist noch kein fester Termin — als TENTATIVE, damit im
    // Kalender sichtbar ist, dass die Zusage noch aussteht.
    attachments: icsAttachment(app, view, {
      tentative: pending,
      organizer: { name: config.businessName, email: config.notificationEmail },
    }),
  });
}

function ownerNotification(app, record, config, options) {
  const mail = require(__hooks + "/lib/emaillib.js");
  const view = viewOf(app, record, config);
  const pending = !!(options && options.pending);
  const manual = !!(options && options.manual);

  const title = pending ? "Neue Terminanfrage" : "Neuer Termin gebucht";
  const adminUrl = view.appUrl ? view.appUrl + "/appointments" : "";

  return send(app, {
    to: config.notificationEmail,
    subject: (pending ? "Neue Terminanfrage – " : "Neuer Termin – ") + view.businessName,
    html:
      heading(mail.escapeHtml(title)) +
      (pending
        ? "<p>Die Anfrage hält den Termin frei und verfällt in " +
          config.pendingExpiryHours + " Stunden, wenn du nicht reagierst.</p>"
        : (manual ? "<p>Von dir selbst eingetragen.</p>" : "<p>Der Termin steht bereits fest.</p>")) +
      detailsTable(mail, view) +
      (adminUrl ? mail.button(pending ? "Anfrage bearbeiten" : "Im Kalender ansehen", adminUrl) : ""),
    text: [title, ""].concat(detailsText(view), [
      "",
      adminUrl ? adminUrl : "",
    ]),
  });
}

function customerDecision(app, record, config, options) {
  const mail = require(__hooks + "/lib/emaillib.js");
  const view = viewOf(app, record, config);
  const approved = !!(options && options.approved);
  const note = (options && options.note) || "";

  return send(app, {
    to: view.customerEmail,
    subject: (approved ? "Termin bestätigt – " : "Termin leider nicht möglich – ") + view.businessName,
    html:
      heading(approved ? "Dein Termin ist bestätigt" : "Dein Terminwunsch hat leider nicht geklappt") +
      (approved
        ? "<p>Wir freuen uns auf dich!</p>"
        : "<p>Der angefragte Termin lässt sich leider nicht einrichten. " +
          "Du kannst gern einen anderen Zeitpunkt wählen.</p>") +
      (note ? "<p style='background:#f7f7f7;padding:12px;border-radius:6px'>" +
        mail.escapeHtml(note) + "</p>" : "") +
      detailsTable(mail, view) +
      (approved ? manageBlock(mail, view, config) : ""),
    text: [
      approved ? "Dein Termin ist bestätigt." : "Der angefragte Termin ist leider nicht möglich.",
      note ? "" : null,
      note || null,
      "",
    ].concat(detailsText(view)),
    attachments: approved
      ? icsAttachment(app, view, {
          sequence: 1,
          organizer: { name: config.businessName, email: config.notificationEmail },
        })
      : icsAttachment(app, view, { cancelled: true, sequence: 1 }),
  });
}

function reminder(app, record, config) {
  const mail = require(__hooks + "/lib/emaillib.js");
  const view = viewOf(app, record, config);

  return send(app, {
    to: view.customerEmail,
    subject: "Erinnerung an deinen Termin – " + view.businessName,
    html:
      heading("Bis bald!") +
      "<p>Nur eine kurze Erinnerung an deinen Termin.</p>" +
      detailsTable(mail, view) +
      manageBlock(mail, view, config),
    text: ["Erinnerung an deinen Termin", ""].concat(detailsText(view), [
      "",
      view.manageUrl ? "Absagen oder verschieben: " + view.manageUrl : "",
    ]),
  });
}

function cancellation(app, record, config, options) {
  const mail = require(__hooks + "/lib/emaillib.js");
  const view = viewOf(app, record, config);
  const byOwner = !!(options && options.byOwner);
  const note = (options && options.note) || "";

  const results = { customer: false, owner: false };

  results.customer = send(app, {
    to: view.customerEmail,
    subject: "Termin abgesagt – " + view.businessName,
    html:
      heading("Der Termin wurde abgesagt") +
      (byOwner
        ? "<p>Leider müssen wir den folgenden Termin absagen.</p>"
        : "<p>Deine Absage ist eingegangen. Der Termin ist gestrichen.</p>") +
      (note ? "<p style='background:#f7f7f7;padding:12px;border-radius:6px'>" +
        mail.escapeHtml(note) + "</p>" : "") +
      detailsTable(mail, view),
    text: ["Der Termin wurde abgesagt.", note || null, ""].concat(detailsText(view)),
    attachments: icsAttachment(app, view, { cancelled: true, sequence: 2 }),
  });

  // Ohne diese Mail erfährt die Fotograf:in von einer Kundenabsage nie und
  // fährt ins Studio.
  if (!byOwner) {
    results.owner = send(app, {
      to: config.notificationEmail,
      subject: "Termin abgesagt – " + view.businessName,
      html:
        heading("Ein Termin wurde abgesagt") +
        "<p>Die Kundin oder der Kunde hat den Termin über den Link in der " +
        "Bestätigungsmail abgesagt. Die Zeit ist wieder buchbar.</p>" +
        detailsTable(mail, view),
      text: ["Ein Termin wurde abgesagt — die Zeit ist wieder buchbar.", ""]
        .concat(detailsText(view)),
    });
  }

  return results;
}

function rescheduled(app, record, config, previousStartMs) {
  const mail = require(__hooks + "/lib/emaillib.js");
  const view = viewOf(app, record, config);
  const wasWhen = formatLocal(previousStartMs, config.timezone);

  const results = {};
  results.customer = send(app, {
    to: view.customerEmail,
    subject: "Termin verschoben – " + view.businessName,
    html:
      heading("Dein Termin wurde verschoben") +
      "<p>Bisher: <s>" + mail.escapeHtml(wasWhen) + "</s></p>" +
      detailsTable(mail, view) +
      manageBlock(mail, view, config),
    text: ["Dein Termin wurde verschoben.", "Bisher: " + wasWhen, ""]
      .concat(detailsText(view)),
    attachments: icsAttachment(app, view, {
      sequence: 3,
      organizer: { name: config.businessName, email: config.notificationEmail },
    }),
  });

  results.owner = send(app, {
    to: config.notificationEmail,
    subject: "Termin verschoben – " + view.businessName,
    html:
      heading("Ein Termin wurde verschoben") +
      "<p>Bisher: <s>" + mail.escapeHtml(wasWhen) + "</s></p>" +
      detailsTable(mail, view),
    text: ["Ein Termin wurde verschoben.", "Bisher: " + wasWhen, ""]
      .concat(detailsText(view)),
  });

  return results;
}

// Erinnerung an die Fotograf:in, bevor eine Anfrage verfällt.
function pendingExpiryWarning(app, records, config) {
  const mail = require(__hooks + "/lib/emaillib.js");
  if (!records.length) return false;

  let list = "<ul style='padding-left:18px'>";
  const lines = [];
  for (let i = 0; i < records.length; i++) {
    const view = viewOf(app, records[i], config);
    const entry = view.whenLong + " – " + view.typeName +
      (view.customerName ? " (" + view.customerName + ")" : "");
    list += "<li style='margin:4px 0'>" + mail.escapeHtml(entry) + "</li>";
    lines.push("- " + entry);
  }
  list += "</ul>";

  const adminUrl = records.length ? (viewOf(app, records[0], config).appUrl + "/appointments") : "";

  return send(app, {
    to: config.notificationEmail,
    subject: "Offene Terminanfragen verfallen bald – " + config.businessName,
    html:
      heading("Offene Anfragen brauchen deine Antwort") +
      "<p>Die folgenden Anfragen verfallen demnächst. Danach wird die Zeit " +
      "wieder für andere freigegeben.</p>" +
      list +
      (adminUrl ? mail.button("Anfragen bearbeiten", adminUrl) : ""),
    text: ["Offene Terminanfragen verfallen bald:", ""].concat(lines),
  });
}

module.exports = {
  formatLocal: formatLocal,
  formatTimeOnly: formatTimeOnly,
  shiftToZone: shiftToZone,
  viewOf: viewOf,
  customerConfirmation: customerConfirmation,
  ownerNotification: ownerNotification,
  customerDecision: customerDecision,
  reminder: reminder,
  cancellation: cancellation,
  rescheduled: rescheduled,
  pendingExpiryWarning: pendingExpiryWarning,
};
