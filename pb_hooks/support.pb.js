/// <reference path="../pb_data/types.d.ts" />
// Support tickets: routing, notification mails and vendor forwarding.
// Schema: pb_migrations/1784600008_support.js · forwarding: lib/supportlib.js
//
// Routing rule: category "technical" belongs to the software vendor (the admin
// of an instance cannot fix the app itself), everything else to the instance
// admin. The client may propose a category — target/status/forwardState are
// always decided here, never taken from the request.
//
// NOTE: PocketBase JSVM handlers run in isolated contexts, so each handler
// requires its own libs; top-level helpers are not visible inside them.

// --- ticket creation: force the server-owned fields ------------------------
onRecordCreateRequest((e) => {
  if (!e.auth) throw new BadRequestError("Nicht angemeldet.");

  const support = require(__hooks + "/lib/supportlib.js");
  const category = e.record.getString("category") || "other";

  // Who the ticket belongs to depends on the category AND on who wrote it.
  // "billing" from a customer is a question about their photographer's orders;
  // the same category from the instance admin is a question about their own
  // subscription, and only the vendor can answer that. Without this the admin
  // could only ever write a ticket to themselves.
  const fromAdmin = e.hasSuperuserAuth() || !!e.auth.getBool("isAdmin");
  const vendorCategories = fromAdmin ? ["technical", "billing"] : ["technical"];

  // Reaching the vendor at all requires a configured route; on an
  // unconfigured (self-hosted) instance everything stays with the admin.
  const toVendor = vendorCategories.indexOf(category) !== -1 && support.vendorConfig().enabled;

  e.record.set("userId", e.auth.id);
  e.record.set("target", toVendor ? "vendor" : "admin");
  e.record.set("status", "open");
  e.record.set("forwardState", "none");
  e.record.set("forwardRef", "");
  e.record.set("forwardError", "");
  e.record.set("forwardedAt", "");
  e.record.set("lastMessageAt", new Date().toISOString());
  e.record.set("unreadForAdmin", true);
  e.record.set("unreadForUser", false);

  return e.next();
}, "supportTickets");

// --- message creation: the author is whoever is authenticated ---------------
onRecordCreateRequest((e) => {
  if (!e.auth) throw new BadRequestError("Nicht angemeldet.");
  const isAdmin = e.hasSuperuserAuth() || !!e.auth.getBool("isAdmin");
  e.record.set("authorId", e.auth.id);
  e.record.set("authorRole", isAdmin ? "admin" : "user");
  return e.next();
}, "supportMessages");

// --- new ticket: notify the admin and/or forward to the vendor --------------
onRecordAfterCreateSuccess((e) => {
  const ticket = e.record;
  const support = require(__hooks + "/lib/supportlib.js");
  const mail = require(__hooks + "/lib/emaillib.js");
  const info = support.instanceInfo(e.app);

  const CATEGORY_LABELS = {
    technical: "Technisches Problem",
    album: "Album / Bilder",
    order: "Bestellung",
    billing: "Zahlung",
    other: "Sonstiges",
  };
  const categoryLabel = CATEGORY_LABELS[ticket.getString("category")] || "Anfrage";

  // The admin is told about every ticket on their instance — including the ones
  // routed to the vendor, since it is their customer who is stuck.
  if (info.adminEmail) {
    const forwarded = ticket.getString("target") === "vendor";
    const link = info.instanceUrl ? info.instanceUrl + "/support?ticket=" + ticket.id : "";
    try {
      e.app.newMailClient().send(new MailerMessage({
        from: { address: e.app.settings().meta.senderAddress, name: info.businessName || "Support" },
        to: [{ address: info.adminEmail }],
        subject: "Neue Support-Anfrage: " + ticket.getString("subject"),
        html: mail.brandShell(
          e.app,
          "<h2 style='font-weight:600;margin:0 0 12px'>Neue Support-Anfrage</h2>" +
          "<p><b>" + mail.escapeHtml(ticket.getString("subject")) + "</b><br/>" +
          "Kategorie: " + mail.escapeHtml(categoryLabel) + "</p>" +
          (forwarded
            ? "<p>Diese Anfrage betrifft die Software selbst und wurde automatisch an den Hersteller weitergeleitet.</p>"
            : "<p>Bitte im Support-Bereich der App beantworten.</p>") +
          (link ? mail.button("Anfrage öffnen", link) : ""),
        ),
        text: mail.plainText([
          "Neue Support-Anfrage",
          "",
          ticket.getString("subject"),
          "Kategorie: " + categoryLabel,
          "",
          forwarded
            ? "Diese Anfrage betrifft die Software selbst und wurde an den Hersteller weitergeleitet."
            : "Bitte im Support-Bereich der App beantworten.",
          link,
        ]),
      }));
    } catch (err) {
      e.app.logger().warn("support: admin notification failed", "error", String(err));
    }
  }

  e.next();
}, "supportTickets");

// --- new message: bump the ticket and notify the other side -----------------
onRecordAfterCreateSuccess((e) => {
  const message = e.record;
  const support = require(__hooks + "/lib/supportlib.js");
  const mail = require(__hooks + "/lib/emaillib.js");

  let ticket;
  try {
    ticket = e.app.findRecordById("supportTickets", message.getString("ticketId"));
  } catch (_) {
    return e.next();
  }

  const fromAdmin = message.getString("authorRole") === "admin";

  // app.save() bypasses the request rules, so the customer's own reply can
  // update the ticket even though updateRule is admin-only.
  try {
    ticket.set("lastMessageAt", new Date().toISOString());
    ticket.set("unreadForAdmin", !fromAdmin);
    ticket.set("unreadForUser", fromAdmin);
    if (ticket.getString("status") === "resolved" || ticket.getString("status") === "closed") {
      ticket.set("status", "open");
    } else if (fromAdmin) {
      ticket.set("status", "waiting");
    } else {
      ticket.set("status", "open");
    }
    e.app.save(ticket);
  } catch (err) {
    e.app.logger().warn("support: ticket bump failed", "ticketId", ticket.id, "error", String(err));
  }

  // Weiterleitung an den Hersteller passiert HIER und nicht beim Anlegen des
  // Tickets. Der Client legt erst das Ticket und dann die erste Nachricht an
  // (utils/support.ts createTicket) — beim Ticket-Hook waere supportMessages
  // noch leer, und beim Hersteller kaeme ein Report mit Betreff, aber ohne
  // einen einzigen Satz Text an. forwardState begrenzt es auf das erste Mal;
  // ein erneutes Senden ist eine bewusste Handlung ueber
  // POST /api/custom/support/forward.
  if (ticket.getString("target") === "vendor" && ticket.getString("forwardState") === "none") {
    try {
      support.forwardTicket(e.app, ticket, "");
    } catch (err) {
      // forwardTicket handles its own errors; this is the belt-and-braces case
      e.app.logger().error("support: forward threw", "ticketId", ticket.id, "error", String(err));
    }
  }

  const info = support.instanceInfo(e.app);
  let recipient = "";
  if (fromAdmin) {
    try {
      recipient = e.app.findRecordById("users", ticket.getString("userId")).email();
    } catch (_) { /* user gone */ }
  } else {
    recipient = info.adminEmail;
  }

  if (recipient) {
    const link = info.instanceUrl ? info.instanceUrl + "/support?ticket=" + ticket.id : "";
    try {
      e.app.newMailClient().send(new MailerMessage({
        from: { address: e.app.settings().meta.senderAddress, name: info.businessName || "Support" },
        to: [{ address: recipient }],
        subject: (fromAdmin ? "Antwort auf deine Anfrage: " : "Neue Nachricht: ") + ticket.getString("subject"),
        html: mail.brandShell(
          e.app,
          "<h2 style='font-weight:600;margin:0 0 12px'>" +
          (fromAdmin ? "Es gibt eine Antwort auf deine Anfrage" : "Neue Nachricht zu einer Anfrage") +
          "</h2>" +
          "<p><b>" + mail.escapeHtml(ticket.getString("subject")) + "</b></p>" +
          "<p style='white-space:pre-wrap'>" + mail.escapeHtml(message.getString("body")) + "</p>" +
          (link ? mail.button("Im Support-Bereich öffnen", link) : ""),
        ),
        text: mail.plainText([
          fromAdmin ? "Es gibt eine Antwort auf deine Anfrage" : "Neue Nachricht zu einer Anfrage",
          "",
          ticket.getString("subject"),
          "",
          message.getString("body"),
          "",
          link,
        ]),
      }));
    } catch (err) {
      e.app.logger().warn("support: message notification failed", "error", String(err));
    }
  }

  e.next();
}, "supportMessages");

// --- ticket state changes owned by the server -------------------------------
// The ticket's updateRule is admin-only (routing/forwarding fields must not be
// client-writable), so the two things a reporter legitimately does with their
// own ticket go through these endpoints instead.

// POST /api/custom/support/status { ticketId, status }
routerAdd("POST", "/api/custom/support/status", (e) => {
  const data = e.requestInfo().body || {};
  const ticketId = String(data.ticketId || "");
  const status = String(data.status || "");
  if (!ticketId || !status) {
    return e.json(400, { status: "error", message: "ticketId and status required" });
  }

  let ticket;
  try {
    ticket = e.app.findRecordById("supportTickets", ticketId);
  } catch (_) {
    return e.json(404, { status: "error", message: "ticket not found" });
  }

  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  const isOwner = !!e.auth && ticket.getString("userId") === e.auth.id;
  if (!isAdmin && !isOwner) {
    return e.json(403, { status: "error", message: "forbidden" });
  }

  // reporters may only settle or reopen their own ticket
  const allowed = isAdmin
    ? ["open", "waiting", "resolved", "closed"]
    : ["open", "resolved"];
  if (allowed.indexOf(status) === -1) {
    return e.json(400, { status: "error", message: "status not allowed" });
  }

  ticket.set("status", status);
  e.app.save(ticket);
  return e.json(200, { status: "success" });
}, $apis.requireAuth());

// POST /api/custom/support/seen { ticketId } — clears the caller's unread flag
routerAdd("POST", "/api/custom/support/seen", (e) => {
  const data = e.requestInfo().body || {};
  const ticketId = String(data.ticketId || "");
  if (!ticketId) return e.json(400, { status: "error", message: "ticketId required" });

  let ticket;
  try {
    ticket = e.app.findRecordById("supportTickets", ticketId);
  } catch (_) {
    return e.json(404, { status: "error", message: "ticket not found" });
  }

  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  const isOwner = !!e.auth && ticket.getString("userId") === e.auth.id;
  if (!isAdmin && !isOwner) {
    return e.json(403, { status: "error", message: "forbidden" });
  }

  ticket.set(isAdmin ? "unreadForAdmin" : "unreadForUser", false);
  e.app.save(ticket);
  return e.json(200, { status: "success" });
}, $apis.requireAuth());

// --- admin: forward an existing ticket to the vendor ------------------------
// POST /api/custom/support/forward { ticketId, note }
routerAdd("POST", "/api/custom/support/forward", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const ticketId = String(data.ticketId || "");
  const note = String(data.note || "").slice(0, 2000);
  if (!ticketId) return e.json(400, { status: "error", message: "ticketId required" });

  let ticket;
  try {
    ticket = e.app.findRecordById("supportTickets", ticketId);
  } catch (_) {
    return e.json(404, { status: "error", message: "ticket not found" });
  }

  const support = require(__hooks + "/lib/supportlib.js");
  if (!support.vendorConfig().enabled) {
    return e.json(400, {
      status: "error",
      message: "Für diese Instanz ist keine Weiterleitung an den Hersteller eingerichtet.",
    });
  }

  const result = support.forwardTicket(e.app, ticket, note);
  if (!result.ok) {
    return e.json(502, {
      status: "error",
      message: "Weiterleitung fehlgeschlagen: " + (result.error || "unbekannter Fehler"),
    });
  }
  return e.json(200, { status: "success", via: result.via, forwardRef: result.id || "" });
}, $apis.requireAuth());

// --- UI capability probe ----------------------------------------------------
// GET /api/custom/support/config -> { vendorForwarding }
// Lets the support form hide the "technical problem goes to the vendor" wording
// on instances where nothing is configured to leave the box.
routerAdd("GET", "/api/custom/support/config", (e) => {
  const support = require(__hooks + "/lib/supportlib.js");
  return e.json(200, { vendorForwarding: support.vendorConfig().enabled });
}, $apis.requireAuth());
