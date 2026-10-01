/// <reference path="../pb_data/types.d.ts" />
//
// Druckaufträge über Prodigi
// (docs/superpowers/specs/2026-10-01-druckauftraege-design.md).
//
//   POST /api/custom/prodigi/config          { apiKey, live }                 (admin)
//   POST /api/custom/print/{id}/submit                                        (admin)
//   POST /api/custom/print/{id}/cancel                                        (admin)
//   POST /api/custom/print/{id}/delivered    { trackingNumber, trackingUrl }  (admin)
//   POST /api/custom/prodigi/callback        Webhook von Prodigi              (öffentlich)
//   GET  /api/custom/printfile/{id}/{index}?t=  Original für Prodigi          (öffentlich, Token)

routerAdd("POST", "/api/custom/prodigi/config", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  if (!pl.isAdmin(e)) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const apiKey = String(data.apiKey || "").trim();
  const live = data.live === true;
  const settings = e.app.findRecordById("settings", "appsettings0001");

  if (apiKey === "") {
    settings.set("prodigiApiKey", "");
    settings.set("prodigiEnabled", false);
    e.app.save(settings);
    return e.json(200, { status: "success", enabled: false, live: false });
  }

  // billigster Aufruf, der einen gültigen Schlüssel braucht
  let res;
  try {
    res = $http.send({
      url: pl.prodigiBase(live) + "/orders?top=1",
      method: "GET",
      headers: { "X-API-Key": apiKey },
      timeout: 20,
    });
  } catch (err) {
    e.app.logger().warn("prodigi config unreachable", "error", String(err));
    return e.json(502, {
      status: "error",
      message: "Prodigi war nicht erreichbar. Prüfe, ob der Server ins Internet darf.",
    });
  }
  if (res.statusCode !== 200) {
    return e.json(400, {
      status: "error",
      message: "Prodigi hat den Schlüssel nicht akzeptiert. Prüfe, ob Test oder Live richtig gewählt ist.",
    });
  }

  settings.set("prodigiApiKey", apiKey);
  settings.set("prodigiLive", live);
  settings.set("prodigiEnabled", true);
  e.app.save(settings);
  return e.json(200, { status: "success", enabled: true, live: live });
}, $apis.requireAuth());

routerAdd("POST", "/api/custom/print/{id}/submit", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  if (!pl.isAdmin(e)) return e.json(403, { status: "error", message: "forbidden" });
  let job;
  try { job = e.app.findRecordById("printJobs", e.request.pathValue("id")); }
  catch (_) { return e.json(404, { status: "error", message: "Auftrag nicht gefunden." }); }
  const r = pl.submitJob(e.app, job);
  return r.ok ? e.json(200, { status: "success" }) : e.json(400, { status: "error", message: r.message });
}, $apis.requireAuth());

routerAdd("POST", "/api/custom/print/{id}/cancel", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  if (!pl.isAdmin(e)) return e.json(403, { status: "error", message: "forbidden" });
  let job;
  try { job = e.app.findRecordById("printJobs", e.request.pathValue("id")); }
  catch (_) { return e.json(404, { status: "error", message: "Auftrag nicht gefunden." }); }
  const r = pl.cancelJob(e.app, job);
  return r.ok ? e.json(200, { status: "success" }) : e.json(400, { status: "error", message: r.message });
}, $apis.requireAuth());

routerAdd("POST", "/api/custom/print/{id}/delivered", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  if (!pl.isAdmin(e)) return e.json(403, { status: "error", message: "forbidden" });
  let job;
  try { job = e.app.findRecordById("printJobs", e.request.pathValue("id")); }
  catch (_) { return e.json(404, { status: "error", message: "Auftrag nicht gefunden." }); }
  const data = e.requestInfo().body || {};
  const r = pl.markDelivered(e.app, job, data.trackingNumber, data.trackingUrl);
  return r.ok ? e.json(200, { status: "success" }) : e.json(400, { status: "error", message: r.message });
}, $apis.requireAuth());

// Vom Rumpf zählt nur die Auftrags-ID. Den Stand holt syncJob selbst bei
// Prodigi — ein gefälschter Aufruf bewirkt so höchstens eine überflüssige
// Abfrage. Immer 200, sonst wiederholt Prodigi die Zustellung endlos.
routerAdd("POST", "/api/custom/prodigi/callback", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  const body = e.requestInfo().body || {};
  const labOrderId = String(body.subject || "");
  if (labOrderId.indexOf("ord_") !== 0) return e.json(200, { ok: true });

  let job;
  try {
    job = e.app.findFirstRecordByFilter("printJobs", "labOrderId = {:id}", { id: labOrderId });
  } catch (_) {
    return e.json(200, { ok: true });
  }
  try {
    pl.syncJob(e.app, job);
  } catch (err) {
    e.app.logger().warn("prodigi sync failed", "labOrderId", labOrderId, "error", String(err));
  }
  return e.json(200, { ok: true });
});

// Liefert Prodigi das Original. Jeder Fehler ist ein 404, damit niemand an der
// Antwort ablesen kann, welcher Teil (Auftrag, Token, Bild) falsch war.
routerAdd("GET", "/api/custom/printfile/{id}/{index}", (e) => {
  const pl = require(__hooks + "/lib/printlib.js");
  const notFound = () => e.json(404, { status: "error", message: "not found" });

  let job;
  try { job = e.app.findRecordById("printJobs", e.request.pathValue("id")); }
  catch (_) { return notFound(); }

  const token = String(e.request.url.query().get("t") || "");
  const ok = pl.fileAccessOk(
    token, job.getString("fileToken"), job.getFloat("fileTokenExpires"), Date.now(),
    (a, b) => $security.equal(a, b)
  );
  if (!ok) return notFound();

  const items = pl.parseJson(job.getString("items"), []);
  const item = items[parseInt(e.request.pathValue("index"), 10)];
  if (!item || !item.originalId) return notFound();

  let image;
  try { image = e.app.findRecordById("images", item.originalId); }
  catch (_) { return notFound(); }
  const filename = image.getString("originalFile");
  if (!filename) return notFound();

  const fsys = e.app.newFilesystem();
  try {
    fsys.serve(e.response, e.request, image.baseFilesPath() + "/" + filename, filename);
  } finally {
    fsys.close();
  }
});
