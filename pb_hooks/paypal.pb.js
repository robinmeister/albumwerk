/// <reference path="../pb_data/types.d.ts" />
//
// Server-side PayPal (Orders v2). Same trust model as the Stripe hook:
//   - credentials in settings: public `paypalClientId`, hidden `paypalSecret`
//   - the SERVER prices, creates and captures the order; the browser only opens
//     the approval popup and hands back the PayPal order id.
//   - on a verified capture the server (checkoutlib.finalizeOrder) writes the
//     `orders` record and grants downloads — the client can do neither.
//
// Endpoints:
//   POST /api/custom/paypal/config        { clientId, secret, live }   (admin)
//   POST /api/custom/paypal/create-order  { imagePriceObjectList, shootingId, userData }
//   POST /api/custom/paypal/capture       { orderID }

// --- admin: store + validate credentials -------------------------------------
routerAdd("POST", "/api/custom/paypal/config", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const co = require(__hooks + "/lib/checkoutlib.js");
  const data = e.requestInfo().body || {};
  const clientId = String(data.clientId || "").trim();
  const secret = String(data.secret || "").trim();
  const live = !!data.live;

  const settings = e.app.findRecordById("settings", "appsettings0001");

  // empty client id OR secret disables PayPal
  if (clientId === "" || secret === "") {
    settings.set("paypalClientId", clientId);
    settings.set("paypalSecret", "");
    settings.set("paypalEnabled", false);
    e.app.save(settings);
    return e.json(200, { status: "success", enabled: false });
  }

  // validate the pair against PayPal by fetching an access token
  try {
    co.paypalAccessToken(clientId, secret, live);
  } catch (err) {
    const msg = String(err);
    e.app.logger().warn("paypal config validation failed", "error", msg);
    if (msg.indexOf("PAYPAL_UNREACHABLE") !== -1) {
      return e.json(502, {
        status: "error",
        message:
          "PayPal war nicht erreichbar. Prüfe, ob der Server ins Internet darf (Firewall/Proxy) und " +
          (live ? "api-m.paypal.com" : "api-m.sandbox.paypal.com") + " erreicht.",
      });
    }
    return e.json(400, {
      status: "error",
      message:
        "PayPal hat die Zugangsdaten nicht akzeptiert. Prüfe Client-ID, Secret und ob Test/Live richtig gewählt ist.",
    });
  }

  settings.set("paypalClientId", clientId);
  settings.set("paypalSecret", secret);
  settings.set("paypalLiveMode", live);
  settings.set("paypalEnabled", true);
  e.app.save(settings);

  return e.json(200, { status: "success", enabled: true, liveMode: live });
}, $apis.requireAuth());

// --- customer: create a server-priced PayPal order ---------------------------
routerAdd("POST", "/api/custom/paypal/create-order", (e) => {
  const co = require(__hooks + "/lib/checkoutlib.js");
  const data = e.requestInfo().body || {};

  let list = data.imagePriceObjectList;
  if (typeof list === "string") {
    try { list = JSON.parse(list); } catch (err) { list = null; }
  }
  if (!list || !list.length) {
    return e.json(400, { status: "error", message: "empty selection" });
  }
  const shootingId = String(data.shootingId || "");

  const settings = e.app.findRecordById("settings", "appsettings0001");

  // Verkauf gesperrt? Dann gar nicht erst eine Zahlung eröffnen. Dies und der
  // Zwilling in stripe.pb.js sind die einzigen zwei Eintritte in eine Zahlung
  // — ein Guard in der Oberfläche allein wäre keine Sperre.
  const vk = require(__hooks + "/lib/verkaufslib.js");
  const offen = vk.offeneHarte(vk.pruefeVerkaufsbereitschaft(vk.leseWerte(e.app)));
  if (offen.length) {
    return e.json(409, { status: "error", message: "sale locked", offen: offen });
  }

  const clientId = settings.getString("paypalClientId");
  const secret = settings.getString("paypalSecret");
  if (!clientId || !secret || !settings.getBool("paypalEnabled")) {
    return e.json(400, { status: "error", message: "paypal not configured" });
  }
  const live = settings.getBool("paypalLiveMode");
  const currency = settings.getString("currency") || "EUR";

  // authoritative price — the client value is never trusted
  let total;
  try {
    total = co.authoritativeTotal(e.app, shootingId, list, e.auth.id);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    e.app.logger().error("paypal price calc failed", "error", String(err));
    return e.json(400, { status: "error", message: "price calculation failed" });
  }
  if (!total || total <= 0) {
    return e.json(400, { status: "error", message: "invalid total" });
  }

  let token;
  try {
    token = co.paypalAccessToken(clientId, secret, live);
  } catch (err) {
    e.app.logger().error("paypal token failed", "error", String(err));
    return e.json(502, { status: "error", message: "paypal auth failed" });
  }

  const res = $http.send({
    url: co.paypalApiBase(live) + "/v2/checkout/orders",
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        { amount: { currency_code: currency, value: total.toFixed(2) } },
      ],
    }),
    timeout: 30,
  });
  if ((res.statusCode !== 201 && res.statusCode !== 200) || !res.json || !res.json.id) {
    e.app.logger().warn("paypal create order failed", "status", res.statusCode, "body", res.raw);
    return e.json(502, { status: "error", message: "paypal order creation failed" });
  }
  const orderID = res.json.id;

  // remember what we priced so capture can't be tricked with a swapped cart
  const col = e.app.findCollectionByNameOrId("paymentIntents");
  const intent = new Record(col);
  intent.set("provider", "paypal");
  intent.set("providerRef", orderID);
  intent.set("userId", e.auth.id);
  intent.set("shootingId", shootingId);
  intent.set("imagePriceObjectList", JSON.stringify(list));
  intent.set("userData", data.userData || {});
  intent.set("amount", total);
  intent.set("currency", currency);
  intent.set("status", "pending");
  e.app.save(intent);

  return e.json(200, { id: orderID });
}, $apis.requireAuth());

// --- customer: capture + verify, then finalize -------------------------------
routerAdd("POST", "/api/custom/paypal/capture", (e) => {
  const co = require(__hooks + "/lib/checkoutlib.js");
  const data = e.requestInfo().body || {};
  const orderID = String(data.orderID || "");
  if (!orderID) return e.json(400, { status: "error", message: "orderID required" });

  let intent;
  try {
    intent = e.app.findFirstRecordByFilter(
      "paymentIntents",
      "provider = 'paypal' && providerRef = {:ref}",
      { ref: orderID }
    );
  } catch (err) {
    return e.json(404, { status: "error", message: "unknown order" });
  }

  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin && intent.getString("userId") !== e.auth.id) {
    return e.json(403, { status: "error", message: "forbidden" });
  }
  if (intent.getString("status") === "paid") {
    // idempotent: already processed, don't double-grant
    return e.json(200, { status: "success", orderId: intent.getString("orderRecordId") });
  }

  const settings = e.app.findRecordById("settings", "appsettings0001");
  const clientId = settings.getString("paypalClientId");
  const secret = settings.getString("paypalSecret");
  const live = settings.getBool("paypalLiveMode");

  let token;
  try {
    token = co.paypalAccessToken(clientId, secret, live);
  } catch (err) {
    return e.json(502, { status: "error", message: "paypal auth failed" });
  }

  const res = $http.send({
    url: co.paypalApiBase(live) + "/v2/checkout/orders/" + encodeURIComponent(orderID) + "/capture",
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: "{}",
    timeout: 30,
  });
  if ((res.statusCode !== 201 && res.statusCode !== 200) || !res.json || res.json.status !== "COMPLETED") {
    e.app.logger().warn("paypal capture not completed", "status", res.statusCode, "body", res.raw);
    return e.json(402, { status: "error", message: "payment not completed" });
  }

  // sanity-check the captured amount against what we priced (we set it, so this
  // should always match; a mismatch is logged but the buyer did pay).
  try {
    const cap = res.json.purchase_units[0].payments.captures[0].amount;
    if (
      parseFloat(cap.value) !== intent.getFloat("amount") ||
      cap.currency_code !== intent.getString("currency")
    ) {
      e.app.logger().warn(
        "paypal captured amount mismatch",
        "captured", cap.value + " " + cap.currency_code,
        "expected", intent.getFloat("amount") + " " + intent.getString("currency")
      );
    }
  } catch (err) {
    // shape unexpected — proceed, capture status was COMPLETED
  }

  const list = JSON.parse(intent.getString("imagePriceObjectList") || "[]");
  const orderId = co.finalizeOrder(e.app, {
    userId: intent.getString("userId"),
    shootingId: intent.getString("shootingId"),
    imagePriceObjectList: list,
    userData: intent.get("userData"),
  });

  intent.set("status", "paid");
  intent.set("orderRecordId", orderId);
  e.app.save(intent);

  return e.json(200, { status: "success", orderId: orderId });
}, $apis.requireAuth());
