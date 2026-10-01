/// <reference path="../../pb_data/types.d.ts" />
//
// Einzige Quelle für die Frage "kann diese Instanz Fotos verkaufen?".
// Benutzt von pb_hooks/verkauf.pb.js (öffentlicher Endpunkt für die
// Oberfläche) und direkt von paypal.pb.js / stripe.pb.js (Guard). Drei
// Kopien derselben Bedingungen würden auseinanderdriften, und die Kopie,
// die am Ende falsch ist, wäre die im Server — also die, an der Geld hängt.
//
// pruefeVerkaufsbereitschaft() fasst bewusst kein $app an: nur so lässt sie
// sich in tests/verkaufsbereitschaft.test.ts unter Node einbinden. Das Lesen
// aus PocketBase steckt getrennt in leseWerte().

// Reihenfolge ist Teil der Zusage: die Oberfläche zeigt die Punkte so an.
var HARTE = ["zahlung", "katalog", "recht", "bestellmail"];
var WEICHE = ["name", "logo", "kontaktmail", "domain", "wasserzeichen"];

// Vorgabe aus src/config/settings.ts (DEFAULT_SETTINGS.businessName). Wer sie
// nie geändert hat, hat den Namen nicht gesetzt.
var NAME_VORGABE = "Fotogalerie";

function nichtLeer(wert) {
  return String(wert || "").trim() !== "";
}

function pruefeVerkaufsbereitschaft(werte) {
  var w = werte || {};
  var erfuellt = {
    zahlung: Boolean(w.paypalEnabled) || Boolean(w.stripeEnabled),
    katalog: Boolean(w.katalogGefuellt),
    recht: nichtLeer(w.imprintHtml) && nichtLeer(w.privacyHtml),
    bestellmail: nichtLeer(w.orderNotificationEmail),
    name: nichtLeer(w.businessName) && String(w.businessName).trim() !== NAME_VORGABE,
    logo: nichtLeer(w.logo),
    kontaktmail: nichtLeer(w.contactEmail),
    domain: nichtLeer(w.customDomain),
    wasserzeichen: nichtLeer(w.watermarkText) || nichtLeer(w.watermarkLogo),
  };

  var punkte = [];
  var sammle = function (keys, hart) {
    for (var i = 0; i < keys.length; i++) {
      punkte.push({ key: keys[i], hart: hart, erfuellt: erfuellt[keys[i]] });
    }
  };
  sammle(HARTE, true);
  sammle(WEICHE, false);

  // Nur wer Laborpreise hat, braucht ein verbundenes Labor — allen anderen
  // zeigte der Punkt einen Haken an etwas, das sie nie eingerichtet haben.
  if (w.laborPreise) {
    punkte.push({ key: "druck", hart: false, erfuellt: Boolean(w.prodigiEnabled) });
  }

  return punkte;
}

function offeneHarte(punkte) {
  var offen = [];
  var liste = punkte || [];
  for (var i = 0; i < liste.length; i++) {
    if (liste[i].hart && !liste[i].erfuellt) offen.push(liste[i].key);
  }
  return offen;
}

// Zählt nicht, sondern fragt nur "gibt es überhaupt eins" — mehr braucht die
// Prüfung nicht. Muster aus pb_hooks/lib/seeddemolib.js:23.
function hatRecords(app, name) {
  try {
    return app.findRecordsByFilter(name, "id != ''", "", 1, 0).length > 0;
  } catch (_) {
    return false;
  }
}

function hatLaborPreise(app) {
  try {
    return app.findRecordsByFilter("prices", "labSku != ''", "", 1, 0).length > 0;
  } catch (_) {
    return false;
  }
}

function leseWerte(app) {
  var s = null;
  try {
    s = app.findRecordById("settings", "appsettings0001");
  } catch (_) {
    // noch nicht geseedet — dann ist nichts eingerichtet, und genau das
    // meldet die Prüfung mit den Vorgaben unten
  }
  var text = function (feld) {
    return s ? s.getString(feld) : "";
  };
  return {
    paypalEnabled: s ? s.getBool("paypalEnabled") : false,
    stripeEnabled: s ? s.getBool("stripeEnabled") : false,
    katalogGefuellt: hatRecords(app, "prices") || hatRecords(app, "packages"),
    imprintHtml: text("imprintHtml"),
    privacyHtml: text("privacyHtml"),
    orderNotificationEmail: text("orderNotificationEmail"),
    businessName: text("businessName"),
    logo: text("logo"),
    contactEmail: text("contactEmail"),
    customDomain: text("customDomain"),
    watermarkText: text("watermarkText"),
    watermarkLogo: text("watermarkLogo"),
    laborPreise: hatLaborPreise(app),
    prodigiEnabled: s ? s.getBool("prodigiEnabled") : false,
  };
}

module.exports = {
  pruefeVerkaufsbereitschaft: pruefeVerkaufsbereitschaft,
  offeneHarte: offeneHarte,
  leseWerte: leseWerte,
};
