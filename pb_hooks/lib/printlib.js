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

module.exports = {
  readSettings: readSettings,
  labItems: labItems,
  shippingFor: shippingFor,
  shippingCost: shippingCost,
};
