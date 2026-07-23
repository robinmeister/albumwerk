/// <reference path="../pb_data/types.d.ts" />
//
// Zentraler Support-Eingang: Kunden-Instanzen leiten technische Tickets hierher
// weiter (pb_hooks/support.pb.js + lib/supportlib.js im Produkt-Repo).
//
// Der Endpoint ist bewusst unauthentifiziert — Instanzen besitzen keine
// Control-Plane-Credentials. Abgesichert wird er über Payload-Limits und ein
// Rate-Limit pro meldender Instanz. Ein missbräuchlicher Aufruf kann damit
// nichts lesen und nichts verändern, sondern höchstens einen Report anlegen.

routerAdd("POST", "/api/saas/support-report", (e) => {
  // JSVM-Handler laufen isoliert — Konstanten müssen im Handler stehen,
  // Top-Level-Definitionen sind hier nicht sichtbar.
  const MAX_BODY = 200 * 1024;   // 200 kB Payload
  const RATE_LIMIT = 20;         // Reports pro Instanz und Stunde

  const data = e.requestInfo().body || {};

  const raw = JSON.stringify(data);
  if (raw.length > MAX_BODY) {
    return e.json(413, { status: "error", message: "payload too large" });
  }

  const instanceUrl = String(data.instanceUrl || "").replace(/\/+$/, "").slice(0, 200);
  const subject = String(data.subject || "").trim().slice(0, 200);
  if (!instanceUrl || !subject) {
    return e.json(400, { status: "error", message: "instanceUrl and subject required" });
  }

  // Rate-Limit pro Instanz (letzte Stunde)
  const since = new Date(Date.now() - 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);
  try {
    const recent = $app.findRecordsByFilter(
      "supportReports",
      "instanceUrl = {:url} && created > {:since}",
      "-created",
      RATE_LIMIT + 1,
      0,
      { url: instanceUrl, since: since },
    );
    if (recent.length >= RATE_LIMIT) {
      return e.json(429, { status: "error", message: "rate limit exceeded" });
    }
  } catch (err) {
    $app.logger().warn("support-report: rate check failed", "error", String(err));
  }

  // Instanz einem Kunden zuordnen; unbekannte Instanzen (Self-Hosting) werden
  // trotzdem angenommen und markiert.
  let customerId = "";
  try {
    const customer = $app.findFirstRecordByFilter(
      "customers",
      "instanceUrl = {:url} || instanceUrl = {:urlSlash}",
      { url: instanceUrl, urlSlash: instanceUrl + "/" },
    );
    customerId = customer.id;
  } catch (_) { /* self-hosted oder noch nicht erfasst */ }

  // Verlauf zu einem lesbaren Textblock verdichten; das strukturierte Original
  // bleibt in `context.messages` erhalten.
  let body = "";
  const messages = Array.isArray(data.messages) ? data.messages : [];
  for (const m of messages) {
    body += "[" + String(m.role || "user") + " · " + String(m.at || "") + "]\n" +
      String(m.body || "") + "\n\n";
  }

  const collection = $app.findCollectionByNameOrId("supportReports");
  const record = new Record(collection);
  record.set("instanceUrl", instanceUrl);
  record.set("customerId", customerId);
  record.set("selfHosted", !customerId);
  record.set("businessName", String(data.businessName || "").slice(0, 200));
  record.set("appVersion", String(data.appVersion || "").slice(0, 50));
  record.set("subject", subject);
  record.set("category", String(data.category || "").slice(0, 50));
  record.set("body", body.slice(0, 20000));
  record.set("context", { context: data.context || null, messages: messages });
  record.set("note", String(data.note || "").slice(0, 2000));
  record.set("ticketRef", String(data.ticketRef || "").slice(0, 50));
  record.set("reporterEmail", String(data.reporterEmail || "").slice(0, 200));
  record.set("reporterName", String(data.reporterName || "").slice(0, 200));
  record.set("adminEmail", String(data.adminEmail || "").slice(0, 200));
  record.set("status", "new");
  $app.save(record);

  $app.logger().info("support report", "instance", instanceUrl, "subject", subject);
  return e.json(200, { status: "ok", id: record.id });
});

// Benachrichtigung an den Hersteller, sobald ein Report eingeht.
onRecordAfterCreateSuccess((e) => {
  const lib = require(__hooks + "/lib/provisionlib.js");
  const notify = lib.env("SUPPORT_NOTIFY_EMAIL");
  if (!notify) return e.next();

  const r = e.record;
  const controlUrl = String(
    lib.env("CONTROL_URL") || "https://control." + lib.env("SAAS_DOMAIN"),
  ).replace(/\/+$/, "");
  const link = controlUrl
    ? controlUrl + "/_/#/collections?collection=supportReports&recordId=" + r.id
    : "";

  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  try {
    lib.sendMail(
      $app,
      notify,
      "[Support] " + r.getString("subject") + " – " + (r.getString("businessName") || r.getString("instanceUrl")),
      "<h2>Neue Support-Meldung</h2>" +
      "<p>Instanz: <b>" + esc(r.getString("instanceUrl")) + "</b>" +
      (r.getBool("selfHosted") ? " (self-hosted)" : "") + "<br/>" +
      "Kategorie: " + esc(r.getString("category")) + "<br/>" +
      "Version: " + esc(r.getString("appVersion")) + "<br/>" +
      "Antwort an: " + esc(r.getString("reporterEmail") || r.getString("adminEmail")) + "</p>" +
      (r.getString("note") ? "<p><b>Notiz des Betreibers:</b><br/>" + esc(r.getString("note")) + "</p>" : "") +
      "<pre style='white-space:pre-wrap;background:#f4f4f5;padding:8px;font-size:12px'>" +
      esc(r.getString("body")) + "</pre>" +
      (link ? "<p><a href='" + link + "'>Im Dashboard öffnen</a></p>" : ""),
    );
  } catch (err) {
    $app.logger().warn("support-report: notify mail failed", "error", String(err));
  }

  e.next();
}, "supportReports");
