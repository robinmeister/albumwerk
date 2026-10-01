/// <reference path="../pb_data/types.d.ts" />
// Order confirmation emails, sent via PocketBase's configured SMTP mailer
// (dashboard > Settings > Mail). Branding (name, addresses) comes from the
// settings collection. HTML is built inline — JSVM handlers run isolated, so
// no shared top-level helpers.
//
// POST /api/custom/order-confirmation { orderId }
// Sends (a) a confirmation to the customer and (b) a summary to the
// photographer's orderNotificationEmail.
routerAdd("POST", "/api/custom/order-confirmation", (e) => {
  const data = e.requestInfo().body || {};
  const orderId = String(data.orderId || "");
  if (!orderId) return e.json(400, { status: "error", message: "orderId required" });

  let order;
  try {
    order = e.app.findRecordById("orders", orderId);
  } catch (_) {
    return e.json(404, { status: "error", message: "order not found" });
  }

  // customers may only trigger mails for their own order
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin && (!e.auth || order.getString("userId") !== e.auth.id)) {
    return e.json(403, { status: "error", message: "forbidden" });
  }

  const mail = require(__hooks + "/lib/emaillib.js");
  let settings = null;
  try {
    settings = e.app.findRecordById("settings", "appsettings0001");
  } catch (_) {
    // fall back to neutral defaults below
  }
  const businessName = (settings && settings.getString("businessName")) || "Fotogalerie";
  const notifyEmail = (settings && settings.getString("orderNotificationEmail")) || "";
  const currency = (settings && settings.getString("currency")) || "EUR";

  // customer email: prefer the auth record, fall back to order.userData
  let customerEmail = e.auth ? e.auth.email() : "";
  let customerName = "";
  try {
    const userData = JSON.parse(order.getString("userData") || "{}");
    customerEmail = customerEmail || userData.email || "";
    customerName = [userData.firstName, userData.lastName].filter(Boolean).join(" ");
  } catch (_) { /* keep defaults */ }

  // build a simple item list from imagePriceObjectList
  let itemsHtml = "";
  let itemsText = "";
  let total = 0;
  try {
    const items = JSON.parse(order.getString("imagePriceObjectList") || "[]");
    for (const item of items) {
      const prices = Array.isArray(item.price) ? item.price : [];
      for (const p of prices) {
        const amount = Number(p.amount) || 0;
        total += amount;
        const label = mail.escapeHtml(p.title || "Position");
        itemsHtml +=
          "<tr><td style='padding:4px 12px 4px 0'>" + label +
          "</td><td style='padding:4px 0;text-align:right'>" +
          amount.toFixed(2) + " " + currency +
          "</td></tr>";
        itemsText += "- " + (p.title || "Position") + ": " + amount.toFixed(2) + " " + currency + "\n";
      }
    }
  } catch (_) { /* leave empty */ }

  // Versand für Laborabzüge — vom Server bei der Zahlung berechnet
  const shipping = order.getFloat("shipping");
  if (shipping > 0) {
    total += shipping;
    itemsHtml +=
      "<tr><td style='padding:4px 12px 4px 0'>Versand</td><td style='padding:4px 0;text-align:right'>" +
      shipping.toFixed(2) + " " + currency + "</td></tr>";
    itemsText += "- Versand: " + shipping.toFixed(2) + " " + currency + "\n";
  }

  const totalHtml = total > 0
    ? "<p style='font-weight:600'>Gesamt: " + total.toFixed(2) + " " + currency + "</p>"
    : "";
  const totalText = total > 0 ? "Gesamt: " + total.toFixed(2) + " " + currency : "";

  const wrap = (title, inner) =>
    mail.brandShell(e.app, "<h2 style='font-weight:600;margin:0 0 12px'>" + title + "</h2>" + inner);

  const from = {
    address: e.app.settings().meta.senderAddress,
    name: businessName,
  };
  const client = e.app.newMailClient();
  const sent = { customer: false, owner: false };

  if (customerEmail) {
    try {
      client.send(new MailerMessage({
        from: from,
        to: [{ address: customerEmail }],
        subject: "Zahlung erhalten – " + businessName,
        html: wrap(
          "Vielen Dank" + (customerName ? ", " + mail.escapeHtml(customerName) : "") + "!",
          "<p>Deine Zahlung ist eingegangen. Deine Bestellung wird nun bearbeitet.</p>" +
          "<table style='border-collapse:collapse'>" + itemsHtml + "</table>" +
          totalHtml,
        ),
        text: mail.plainText([
          "Vielen Dank" + (customerName ? ", " + customerName : "") + "!",
          "",
          "Deine Zahlung ist eingegangen. Deine Bestellung wird nun bearbeitet.",
          "",
          itemsText,
          totalText,
          "",
          businessName,
        ]),
      }));
      sent.customer = true;
    } catch (err) {
      e.app.logger().error("order-confirmation: customer mail failed", "error", String(err));
    }
  }

  if (notifyEmail) {
    const who = (customerName || customerEmail)
      ? " von " + (customerName || "") + " (" + customerEmail + ")"
      : "";
    try {
      client.send(new MailerMessage({
        from: from,
        to: [{ address: notifyEmail }],
        subject: "Neue Bestellung – " + businessName,
        html: wrap(
          "Neue Bestellung eingegangen",
          "<p>Bestellung <b>" + mail.escapeHtml(orderId) + "</b>" + mail.escapeHtml(who) + "</p>" +
          "<table style='border-collapse:collapse'>" + itemsHtml + "</table>" +
          totalHtml +
          "<p>Details in der Bestellübersicht der Plattform.</p>",
        ),
        text: mail.plainText([
          "Neue Bestellung eingegangen",
          "",
          "Bestellung " + orderId + who,
          "",
          itemsText,
          totalText,
          "",
          "Details in der Bestellübersicht der Plattform.",
        ]),
      }));
      sent.owner = true;
    } catch (err) {
      e.app.logger().error("order-confirmation: owner mail failed", "error", String(err));
    }
  }

  return e.json(200, { status: "success", sent: sent });
}, $apis.requireAuth());
