/// <reference path="../pb_data/types.d.ts" />
// On-demand TLS gate for the Caddy reverse proxy.
//
// The production Caddyfile uses `on_demand_tls { ask ... }` pointing at this
// endpoint. Before Caddy obtains a Let's Encrypt certificate for an incoming
// hostname it asks here whether that host is allowed. We approve (HTTP 200)
// only when the requested domain matches the `customDomain` configured in the
// settings singleton — this prevents anyone from pointing arbitrary hostnames
// at the server to burn through Let's Encrypt rate limits.
//
// Public by design (no auth middleware): Caddy calls it internally over the
// Docker network. It leaks nothing beyond whether a given host is the
// configured one.
routerAdd("GET", "/api/custom/domain/ask", (e) => {
  const info = e.requestInfo();
  const asked = String((info.query && info.query.domain) || "").trim().toLowerCase();
  if (!asked) return e.string(400, "missing domain");

  let configured = "";
  try {
    const settings = e.app.findRecordById("settings", "appsettings0001");
    configured = settings.getString("customDomain").trim().toLowerCase();
  } catch (_) {
    // settings not seeded yet — deny until configured
  }

  if (configured && asked === configured) {
    return e.string(200, "OK");
  }
  return e.string(404, "unknown domain");
});
