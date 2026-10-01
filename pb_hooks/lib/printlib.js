/// <reference path="../../pb_data/types.d.ts" />
//
// Druckaufträge über Prodigi
// (docs/superpowers/specs/2026-10-01-druckauftraege-design.md).
//
// Benutzt von checkoutlib.js (Versand, Auftrag anlegen) und print.pb.js
// (Freigabe, Webhook, Druckdatei). Alles oberhalb von "Prodigi-Aufrufe" fasst
// weder $http noch $security an, damit tests/druckauftraege.test.ts es unter
// Node einbinden kann.

function round2(n) {
  return Math.round(n * 100) / 100;
}

// wie clampQty in checkoutlib.js — dort wird mit derselben Menge abgerechnet
function copiesOf(q) {
  var n = parseInt(q, 10);
  if (!n || n < 1) return 1;
  if (n > 999) return 999;
  return n;
}

function readSettings(app) {
  try {
    return app.findRecordById("settings", "appsettings0001");
  } catch (_) {
    return null;
  }
}

// Positionen, deren Preis mit einem Laborprodukt verknüpft ist. labSku kommt
// aus der prices-Sammlung, nie aus der Liste des Browsers.
function labItems(app, list) {
  var out = [];
  var l = list || [];
  for (var i = 0; i < l.length; i++) {
    var obj = l[i];
    if (!obj || !obj.image || !obj.price) continue;
    for (var j = 0; j < obj.price.length; j++) {
      var rec;
      try {
        rec = app.findRecordById("prices", String(obj.price[j].id));
      } catch (_) {
        continue;
      }
      var sku = rec.getString("labSku").trim();
      if (!sku) continue;
      out.push({ image: String(obj.image), sku: sku, copies: copiesOf(obj.price[j].quantity) });
    }
  }
  return out;
}

// Gespiegelt in src/features/Pricing/utils/shipping.ts — tests/versand.test.ts
// hält beide auf derselben Tabelle. freeFrom 0 heißt: nie versandkostenfrei.
function shippingFor(goodsTotal, hasLab, flat, freeFrom) {
  if (!hasLab || !(flat > 0)) return 0;
  if (freeFrom > 0 && goodsTotal >= freeFrom) return 0;
  return round2(flat);
}

function shippingCost(app, list, goodsTotal) {
  if (!labItems(app, list).length) return 0;
  var s = readSettings(app);
  if (!s) return 0;
  return shippingFor(goodsTotal, true, s.getFloat("shippingFlat"), s.getFloat("freeShippingFrom"));
}

// Gleiches Muster wie fileUrlRecordId in src/utils/functions.ts: Die Bestellung
// trägt die URL der Vorschau, das Original hat denselben Namen im selben Shooting.
var FILE_URL_RE = /\/api\/files\/[^/]+\/([^/]+)\//;

function originalIdFor(app, imageUrl) {
  var m = String(imageUrl || "").match(FILE_URL_RE);
  if (!m) return "";
  try {
    var image = app.findRecordById("images", m[1]);
    if (image.getString("type") === "original") return image.id;
    var original = app.findFirstRecordByFilter(
      "images",
      "shootingId = {:s} && type = 'original' && name = {:n}",
      { s: image.getString("shootingId"), n: image.getString("name") }
    );
    return original.id;
  } catch (_) {
    return "";
  }
}

// Schnappschuss der Lieferadresse zum Zeitpunkt der Zahlung. Ändert die
// Kund:in später ihr Profil, bleibt der Auftrag, wie er bezahlt wurde.
function recipientFromUserData(userData) {
  var d = userData || {};
  return {
    name: [d.firstName, d.lastName].filter(Boolean).join(" ").trim(),
    email: String(d.email || ""),
    phone: String(d.phone || ""),
    line1: String(d.street || ""),
    postalCode: String(d.zip || ""),
    city: String(d.city || ""),
    state: String(d.state || ""),
    countryCode: String(d.country || "DE").toUpperCase(),
  };
}

function createPrintJob(app, order, list) {
  var items = labItems(app, list);
  if (!items.length) return null;

  var missing = false;
  for (var i = 0; i < items.length; i++) {
    items[i].originalId = originalIdFor(app, items[i].image);
    if (!items[i].originalId) missing = true;
  }

  var s = readSettings(app);
  var userData = {};
  try {
    userData = JSON.parse(order.getString("userData") || "{}");
  } catch (_) {
    userData = {};
  }

  var job = new Record(app.findCollectionByNameOrId("printJobs"));
  job.set("orderId", order.id);
  job.set("route", (s && s.getString("printDefaultRoute")) || "customer");
  job.set("recipient", recipientFromUserData(userData));
  job.set("items", items);
  job.set("status", "awaiting_approval");
  job.set("error", missing ? "Zu mindestens einem Bild fehlt das Original." : "");
  app.save(job);
  return job;
}

var FILE_TOKEN_DAYS = 14;

function prodigiBase(live) {
  return live ? "https://api.prodigi.com/v4.0" : "https://api.sandbox.prodigi.com/v4.0";
}

function parseJson(text, fallback) {
  try {
    return JSON.parse(text || "");
  } catch (_) {
    return fallback;
  }
}

function jobView(rec) {
  return {
    id: rec.id,
    orderId: rec.getString("orderId"),
    route: rec.getString("route"),
    status: rec.getString("status"),
    recipient: parseJson(rec.getString("recipient"), {}),
    items: parseJson(rec.getString("items"), []),
  };
}

function studioRecipient(a) {
  var s = a || {};
  return {
    name: String(s.name || ""),
    email: "",
    phone: "",
    line1: String(s.line1 || ""),
    postalCode: String(s.zip || ""),
    city: String(s.city || ""),
    state: "",
    countryCode: String(s.country || "DE").toUpperCase(),
  };
}

function recipientFor(view, studioAddress) {
  return view.route === "studio" ? studioRecipient(studioAddress) : view.recipient;
}

function addressComplete(r) {
  return Boolean(r && r.name && r.line1 && r.postalCode && r.city && r.countryCode);
}

function prodigiOrderBody(view, recipient, baseUrl, token) {
  var address = {
    line1: recipient.line1,
    postalOrZipCode: recipient.postalCode,
    townOrCity: recipient.city,
    countryCode: recipient.countryCode,
  };
  if (recipient.state) address.stateOrCounty = recipient.state;
  var to = { name: recipient.name };
  if (recipient.email) to.email = recipient.email;
  if (recipient.phone) to.phoneNumber = recipient.phone;
  to.address = address;

  return {
    merchantReference: view.orderId,
    // Doppelklick oder "Erneut senden" erzeugt bei Prodigi keinen zweiten Auftrag
    idempotencyKey: view.id,
    callbackUrl: baseUrl + "/api/custom/prodigi/callback",
    shippingMethod: "Standard",
    recipient: to,
    items: view.items.map(function (it, i) {
      return {
        merchantReference: it.originalId,
        sku: it.sku,
        copies: it.copies,
        sizing: "fillPrintArea",
        assets: [{
          printArea: "default",
          url: baseUrl + "/api/custom/printfile/" + view.id + "/" + i + "?t=" + encodeURIComponent(token),
        }],
      };
    }),
  };
}

function labCostOf(charges) {
  var sum = 0;
  var currency = "";
  (charges || []).forEach(function (c) {
    if (!c || !c.totalCost) return;
    sum += parseFloat(c.totalCost.amount) || 0;
    currency = c.totalCost.currency || currency;
  });
  return currency ? sum.toFixed(2) + " " + currency : "";
}

function issueText(issue) {
  var text = issue.description || issue.errorCode || "Unbekanntes Problem";
  var auth = issue.authorisationDetails && issue.authorisationDetails.authorisationUrl;
  return auth ? text + " — freigeben unter " + auth : text;
}

// Übersetzt einen Prodigi-Auftrag in die Felder des Druckauftrags. Was das
// Studio schon selbst weiterversandt hat, setzt eine späte Meldung nicht zurück.
function applyLabOrder(currentStatus, o) {
  var status = (o && o.status) || {};
  var details = status.details || {};
  var issues = status.issues || [];
  var shipped = ((o && o.shipments) || []).filter(function (s) {
    return String(s.status || "").toLowerCase() === "shipped";
  });
  var tracking = (shipped[0] && shipped[0].tracking) || {};

  var out = {
    labOrderId: String((o && o.id) || ""),
    status: "submitted",
    trackingUrl: String(tracking.url || ""),
    trackingNumber: String(tracking.number || ""),
    labCost: labCostOf(o && o.charges),
    error: "",
  };

  if (status.stage === "Cancelled") {
    out.status = "cancelled";
  } else if (issues.length) {
    out.status = "failed";
    out.error = issues.map(issueText).join(" · ");
  } else if (shipped.length || status.stage === "Complete") {
    out.status = "shipped";
  } else if (details.inProduction === "InProgress" || details.inProduction === "Complete") {
    out.status = "in_production";
  }

  if (currentStatus === "delivered_to_customer") out.status = currentStatus;
  return out;
}

// Ohne eigene Sendungsnummer bleibt das Feld leer — sonst bekäme die Kund:in
// die Sendung Labor → Studio als ihre eigene.
function deliveredFields(trackingNumber, trackingUrl) {
  var url = String(trackingUrl || "").trim();
  return {
    status: "delivered_to_customer",
    trackingNumber: String(trackingNumber || "").trim(),
    trackingUrl: /^https?:\/\//i.test(url) ? url : "",
  };
}

// `equal` ist in der JSVM $security.equal (zeitkonstant), im Test ein ===.
function fileAccessOk(token, expected, expiresMs, nowMs, equal) {
  if (!expected || !token) return false;
  if (!(nowMs < expiresMs)) return false;
  return Boolean(equal(String(token), String(expected)));
}

module.exports = {
  FILE_TOKEN_DAYS: FILE_TOKEN_DAYS,
  prodigiBase: prodigiBase,
  parseJson: parseJson,
  jobView: jobView,
  studioRecipient: studioRecipient,
  recipientFor: recipientFor,
  addressComplete: addressComplete,
  prodigiOrderBody: prodigiOrderBody,
  applyLabOrder: applyLabOrder,
  deliveredFields: deliveredFields,
  fileAccessOk: fileAccessOk,
  readSettings: readSettings,
  labItems: labItems,
  shippingFor: shippingFor,
  shippingCost: shippingCost,
  recipientFromUserData: recipientFromUserData,
  createPrintJob: createPrintJob,
};
