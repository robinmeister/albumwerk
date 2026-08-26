/// <reference path="../pb_data/types.d.ts" />
//
// Speicherverbrauch für die Anzeige im Admin-Bereich.
//
// Die Zahlen kennt nur die Control-Plane des Anbieters (SAAS_CONTROL_URL);
// gemessen wird host-seitig, siehe albumwerk-saas. Dieser Endpoint holt sie
// von dort und reicht sie an das Frontend weiter — der Browser darf die
// Control-Plane nicht selbst befragen, weil deren Adresse eine Server-Env ist.
//
// Bei einer selbst gehosteten Instanz ist SAAS_CONTROL_URL leer. Dann liefert
// der Endpoint 204 und die Anzeige blendet sich aus: wer auf eigener Hardware
// hostet, hat kein Inklusivvolumen und will davon auch nichts lesen.

routerAdd("GET", "/api/custom/storage", (e) => {
  const controlUrl = String($os.getenv("SAAS_CONTROL_URL") || "").replace(/\/+$/, "");
  if (!controlUrl) return e.noContent(204);

  let appUrl = "";
  try {
    appUrl = String(e.app.settings().meta.appURL || "").replace(/\/+$/, "");
  } catch (_) { /* bleibt leer */ }
  if (!appUrl) return e.noContent(204);

  try {
    const res = $http.send({
      url: controlUrl + "/api/saas/usage?instanceUrl=" + encodeURIComponent(appUrl),
      method: "GET",
      timeout: 10,
    });
    if (res.statusCode !== 200) return e.noContent(204);
    return e.json(200, res.json);
  } catch (err) {
    // Control-Plane nicht erreichbar: kein Grund, dem Admin einen Fehler zu
    // zeigen. Die Anzeige ist eine Zusatzinformation, keine Funktion.
    e.app.logger().warn("storage usage lookup failed", "error", String(err));
    return e.noContent(204);
  }
});
