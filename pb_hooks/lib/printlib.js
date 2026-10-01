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

module.exports = {
  readSettings: readSettings,
  labItems: labItems,
  shippingFor: shippingFor,
  shippingCost: shippingCost,
  recipientFromUserData: recipientFromUserData,
  createPrintJob: createPrintJob,
};
