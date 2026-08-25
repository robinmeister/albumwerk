/// <reference path="../../pb_data/types.d.ts" />
//
// Allowlist-Auswertung für die Einbettung (docs/terminbuchung.md §9.2).
//
// Liegt in lib/, weil JSVM-Handler in isolierten Runtimes laufen: Funktionen,
// die im Modul-Scope einer *.pb.js neben dem Handler stehen, sind beim
// späteren Aufruf des Handlers NICHT sichtbar ("ReferenceError: … is not
// defined"). Wiederverwendbares wird deshalb im Handler per require geholt —
// dasselbe Muster wie emaillib.js und supportlib.js.

const SETTINGS_ID = "appsettings0001";

// "example.com", "www.example.com", "https://example.com/kontakt" → Hostname.
function hostOf(value) {
  let host = String(value == null ? "" : value).trim().toLowerCase();
  if (!host) return "";
  host = host.replace(/^[a-z]+:\/\//, ""); // Schema abschneiden
  host = host.split("/")[0];               // Pfad abschneiden
  host = host.split("?")[0];
  // Zugangsdaten vor dem @ verwerfen, Port behalten (localhost:3000 beim Testen)
  const at = host.lastIndexOf("@");
  if (at !== -1) {
    host = host.substring(at + 1);
  }
  if (!/^[a-z0-9.\-:]+$/.test(host)) return "";
  return host;
}

// Aus einem Hostnamen die Herkunftsangaben für frame-ancestors bauen.
//
// Mit und ohne "www", weil das genau der Fehler ist, den sonst jede zweite
// Fotograf:in macht — sie trägt "beispiel.de" ein und bettet auf
// "www.beispiel.de" ein, sieht ein weißes Rechteck und findet den Grund nur in
// der Browser-Konsole, in die sie nie schaut.
//
// http zusätzlich zu https, weil eine unverschlüsselte Seite unser https-iframe
// ohnehin nicht laden kann (Mixed Content) — es entsteht also kein zusätzliches
// Risiko, aber ein Support-Fall weniger.
function originsFor(host) {
  const hosts = [host];
  if (host.indexOf("www.") === 0) {
    hosts.push(host.substring(4));
  } else {
    hosts.push("www." + host);
  }
  const origins = [];
  for (let i = 0; i < hosts.length; i++) {
    origins.push("https://" + hosts[i]);
    origins.push("http://" + hosts[i]);
  }
  return origins;
}

// Der Wert für `frame-ancestors` auf /embed*.
//
// Fehlerverhalten bewusst restriktiv: Ist keine Domain eingetragen oder lassen
// sich die Einstellungen nicht lesen, gilt 'none'. Der Snippet-Generator im
// Admin verhindert den leeren Zustand von vornherein — aber der Server
// verlässt sich nicht darauf.
function embedAncestors(app) {
  let raw = "";
  try {
    raw = app.findRecordById("settings", SETTINGS_ID).getString("bookingEmbedOrigins") || "";
  } catch (_) {
    return "'none'";
  }

  const lines = raw.split(/[\r\n,;]+/);
  const seen = {};
  const origins = [];
  for (let i = 0; i < lines.length; i++) {
    const host = hostOf(lines[i]);
    if (!host) continue;
    const candidates = originsFor(host);
    for (let c = 0; c < candidates.length; c++) {
      if (!seen[candidates[c]]) {
        seen[candidates[c]] = true;
        origins.push(candidates[c]);
      }
    }
  }

  if (origins.length === 0) {
    return "'none'";
  }
  // 'self' erlaubt die eigenständige Buchungsseite unter der Instanz-Domain
  return "'self' " + origins.join(" ");
}

module.exports = {
  hostOf: hostOf,
  originsFor: originsFor,
  embedAncestors: embedAncestors,
};
