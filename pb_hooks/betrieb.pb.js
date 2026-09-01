/// <reference path="../pb_data/types.d.ts" />
//
// Betriebsart der Instanz: selbst gehostet oder vom Anbieter verwaltet.
//
// Verwaltete Instanzen laufen hinter dem Reverse Proxy des Anbieters (Traefik
// unter Coolify), nicht hinter dem Caddy aus diesem Repo. Der On-Demand-TLS-
// Weg aus Caddyfile und domain.pb.js greift dort also nicht — eine eigene
// Domain traegt dort der Anbieter ein. Die Oberflaeche muss das wissen,
// sonst bietet sie ein Formular an, das nichts bewirkt.
//
// Erkannt wird es an SAAS_CONTROL_URL, genau wie in storage.pb.js und
// lib/supportlib.js: gesetzt heisst verwaltet.
//
// Oeffentlich ohne Auth-Middleware — die Antwort verraet nur, wer die Instanz
// betreibt, und das steht ohnehin in der Adresszeile.
routerAdd("GET", "/api/custom/betrieb", (e) => {
  const verwaltet = Boolean(String($os.getenv("SAAS_CONTROL_URL") || "").trim());

  // Ziel fuer den CNAME des Kunden. Kommt aus den PocketBase-Einstellungen,
  // nicht aus dem Browser: wer die Seite bereits ueber eine eigene Domain
  // aufruft, bekaeme sonst diese als Ziel angezeigt.
  let instanz = "";
  try {
    const url = String(e.app.settings().meta.appURL || "");
    instanz = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  } catch (_) {
    // bleibt leer — die Oberflaeche zeigt dann keinen CNAME-Hinweis
  }

  return e.json(200, { verwaltet: verwaltet, instanz: instanz });
});
