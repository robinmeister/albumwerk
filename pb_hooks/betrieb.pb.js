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

// Domain-Wunsch an die Control-Plane melden.
//
// Der Browser darf das nicht selbst tun: die Adresse der Control-Plane ist eine
// Server-Variable, genau wie bei /api/custom/storage. Auf einer selbst
// gehosteten Instanz gibt es niemanden zu fragen — dann 204, und die
// Oberflaeche verlaesst sich allein auf das Support-Ticket.
routerAdd("POST", "/api/custom/domain/request", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const controlUrl = String($os.getenv("SAAS_CONTROL_URL") || "").replace(/\/+$/, "");
  if (!controlUrl) return e.noContent(204);

  const domain = String((e.requestInfo().body || {}).domain || "").trim().toLowerCase();
  if (!domain) return e.json(400, { status: "error", message: "domain required" });

  let appUrl = "";
  try {
    appUrl = String(e.app.settings().meta.appURL || "").replace(/\/+$/, "");
  } catch (_) { /* bleibt leer */ }
  if (!appUrl) return e.json(500, { status: "error", message: "appURL unbekannt" });

  try {
    const res = $http.send({
      url: controlUrl + "/api/saas/domain-request",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceUrl: appUrl, domain: domain }),
      timeout: 20,
    });
    if (res.statusCode !== 200) {
      e.app.logger().warn("domain-request abgelehnt", "status", res.statusCode);
      return e.json(502, { status: "error", message: "control plane: " + res.statusCode });
    }
  } catch (err) {
    e.app.logger().warn("domain-request fehlgeschlagen", "error", String(err));
    return e.json(502, { status: "error", message: "control plane nicht erreichbar" });
  }

  return e.json(200, { status: "success" });
}, $apis.requireAuth());
