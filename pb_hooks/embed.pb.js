/// <reference path="../pb_data/types.d.ts" />
//
// Einbettungs-Kontrolle per CSP (docs/terminbuchung.md §9.2).
//
// Zwei Aufgaben in einer Middleware:
//
//   1. `/embed*` darf von den Domains der Fotograf:in eingebettet werden —
//      genau dafür existiert das Bundle.
//   2. ALLES ANDERE bekommt `frame-ancestors 'self'`: fremde Seiten bleiben
//      draußen, die eigene Instanz nicht. Die Kundenansicht-Vorschau im Admin
//      zeigt `/publicAlbum/…` bzw. `/album` in einem iframe derselben
//      Herkunft — mit 'none' blieb dort ein leeres Rechteck und in der
//      Konsole „Framing … violates … frame-ancestors 'none'".
//
// Punkt 2 schließt eine Lücke, die es vor diesem Feature schon gab: Die App
// setzte weder X-Frame-Options noch eine CSP, war also von beliebigen Seiten
// einbettbar. Damit war Clickjacking auf das Admin-UI möglich — ein
// unsichtbarer iframe über einer harmlosen Seite, und die Fotograf:in klickt
// ahnungslos auf „Kunde löschen".
//
// Die Auswertung der Allowlist liegt in lib/embedlib.js und wird IM Handler
// geholt: JSVM-Handler laufen in isolierten Runtimes, Funktionen aus dem
// Modul-Scope dieser Datei wären beim Aufruf nicht sichtbar.

routerUse((e) => {
  const embed = require(__hooks + "/lib/embedlib.js");

  const path = e.request.url.path || "";
  const isEmbed = path === "/embed" || path.indexOf("/embed/") === 0 || path === "/embed.js";
  const header = e.response.header();

  if (isEmbed) {
    header.set("Content-Security-Policy", "frame-ancestors " + embed.embedAncestors(e.app));
  } else {
    header.set("Content-Security-Policy", "frame-ancestors 'self'");
    // X-Frame-Options kann keine Allowlist ausdrücken und wird deshalb nur
    // hier gesetzt — für Browser, die frame-ancestors noch nicht kennen.
    // (PocketBase setzt selbst schon SAMEORIGIN; hier steht es explizit, damit
    // die Regel nicht an einer Voreinstellung hängt, die sich ändern kann.)
    header.set("X-Frame-Options", "SAMEORIGIN");
  }

  // Dokumente (SPA-Routen, /index.html, API-Antworten) nie heuristisch cachen.
  // PocketBase liefert index.html ohne Cache-Control, nur mit Last-Modified —
  // der Browser darf sie damit stundenlang wiederverwenden, samt der
  // Kopfzeilen von damals. Nach einem Deploy gilt dann noch die alte CSP: die
  // Kundenansicht-Vorschau blieb leer, obwohl der Server längst 'self'
  // schickte. Dateien mit Endung (die gehashten Bundles unter /assets/)
  // behalten ihr Caching — ihr Name ändert sich bei jeder Änderung.
  if (!/\.[a-z0-9]+$/i.test(path) || /\.html$/i.test(path)) {
    header.set("Cache-Control", "no-cache");
  }

  return e.next();
});
