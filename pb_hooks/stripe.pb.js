/// <reference path="../pb_data/types.d.ts" />
// Stripe Checkout integration. The secret key is stored in the hidden
// settings field `stripeSecretKey` (never serialized via the API) and only
// touched here. Flow: frontend asks for a Checkout Session, redirects the
// customer to Stripe's hosted payment page, and verifies the session state
// after the redirect back. Pricing and entitlement are server-authoritative
// (see pb_hooks/lib/checkoutlib.js) — the browser never sets the amount and can
// no longer create the order or grant downloads itself.

// POST /api/custom/stripe/config { secretKey }  (admin)
// Saves/replaces the secret key after validating it against the Stripe API;
// an empty key disables card payments.
routerAdd("POST", "/api/custom/stripe/config", (e) => {
  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (!isAdmin) return e.json(403, { status: "error", message: "forbidden" });

  const data = e.requestInfo().body || {};
  const secretKey = String(data.secretKey || "").trim();

  const settings = e.app.findRecordById("settings", "appsettings0001");

  if (secretKey === "") {
    settings.set("stripeSecretKey", "");
    settings.set("stripeEnabled", false);
    e.app.save(settings);
    return e.json(200, { status: "success", enabled: false });
  }

  if (secretKey.indexOf("sk_") !== 0 && secretKey.indexOf("rk_") !== 0) {
    return e.json(400, {
      status: "error",
      message: "Das ist kein geheimer Stripe-Schlüssel (er beginnt mit sk_live_ oder sk_test_).",
    });
  }

  // validate the key with a cheap authenticated request
  const res = $http.send({
    url: "https://api.stripe.com/v1/account",
    method: "GET",
    headers: { Authorization: "Bearer " + secretKey },
    timeout: 20,
  });
  if (res.statusCode !== 200) {
    return e.json(400, {
      status: "error",
      message: "Stripe hat den Schlüssel nicht akzeptiert. Bitte kopiere ihn erneut aus dem Stripe-Dashboard.",
    });
  }

  settings.set("stripeSecretKey", secretKey);
  settings.set("stripeEnabled", true);
  e.app.save(settings);

  const liveMode = secretKey.indexOf("sk_live_") === 0 || secretKey.indexOf("rk_live_") === 0;
  return e.json(200, { status: "success", enabled: true, liveMode: liveMode });
}, $apis.requireAuth());

// POST /api/custom/stripe/create-checkout-session { imagePriceObjectList, shootingId, userData, description, origin }
// The amount is computed server-side from the trusted prices/packages; the
// selection is stored as a payment intent so /verify can finalize it exactly
// once. Returns { url, id } — the frontend redirects to `url`.
routerAdd("POST", "/api/custom/stripe/create-checkout-session", (e) => {
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
  const secretKey = settings.getString("stripeSecretKey");
  if (!secretKey || !settings.getBool("stripeEnabled")) {
    return e.json(400, { status: "error", message: "stripe not configured" });
  }
  const currency = (settings.getString("currency") || "EUR").toLowerCase();
  const businessName = settings.getString("businessName") || "Fotogalerie";
  const description = String(data.description || "Fotobestellung bei " + businessName);

  // authoritative price — the client value is never trusted
  let total;
  try {
    total = co.authoritativeTotal(e.app, e.auth.id, shootingId, list);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    e.app.logger().error("stripe price calc failed", "error", String(err));
    return e.json(400, { status: "error", message: "price calculation failed" });
  }
  if (!total || total <= 0) {
    return e.json(400, { status: "error", message: "invalid total" });
  }
  const amount = Math.round(total * 100);

  // prefer the browser-sent Origin header over the client-provided value
  const origin =
    e.request.header.get("Origin") || String(data.origin || "");
  if (!origin || origin.indexOf("http") !== 0) {
    return e.json(400, { status: "error", message: "invalid origin" });
  }

  const params = [
    "mode=payment",
    "line_items[0][quantity]=1",
    "line_items[0][price_data][currency]=" + encodeURIComponent(currency),
    "line_items[0][price_data][unit_amount]=" + amount,
    "line_items[0][price_data][product_data][name]=" + encodeURIComponent(description),
    "success_url=" + encodeURIComponent(origin + "/pricing?stripeSession={CHECKOUT_SESSION_ID}"),
    "cancel_url=" + encodeURIComponent(origin + "/pricing?stripeCancelled=1"),
  ];
  if (e.auth && e.auth.email()) {
    params.push("customer_email=" + encodeURIComponent(e.auth.email()));
  }

  const res = $http.send({
    url: "https://api.stripe.com/v1/checkout/sessions",
    method: "POST",
    body: params.join("&"),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Bearer " + secretKey,
    },
    timeout: 30,
  });
  if (res.statusCode !== 200) {
    e.app.logger().warn("stripe session create failed", "status", res.statusCode, "body", res.raw);
    return e.json(502, { status: "error", message: "stripe session creation failed" });
  }
  const sessionId = res.json.id;

  const col = e.app.findCollectionByNameOrId("paymentIntents");
  const intent = new Record(col);
  intent.set("provider", "stripe");
  intent.set("providerRef", sessionId);
  intent.set("userId", e.auth.id);
  intent.set("shootingId", shootingId);
  intent.set("imagePriceObjectList", JSON.stringify(list));
  intent.set("userData", data.userData || {});
  intent.set("amount", total);
  intent.set("currency", settings.getString("currency") || "EUR");
  intent.set("status", "pending");
  e.app.save(intent);

  return e.json(200, { url: res.json.url, id: sessionId });
}, $apis.requireAuth());

// POST /api/custom/stripe/verify { sessionId }
// Verifies the session was paid, then finalizes exactly once (creates the order
// + grants downloads). Returns { paid, orderId }.
routerAdd("POST", "/api/custom/stripe/verify", (e) => {
  const co = require(__hooks + "/lib/checkoutlib.js");
  const data = e.requestInfo().body || {};
  const sessionId = String(data.sessionId || "");
  if (!sessionId || sessionId.indexOf("cs_") !== 0) {
    return e.json(400, { status: "error", message: "invalid sessionId" });
  }

  const settings = e.app.findRecordById("settings", "appsettings0001");
  const secretKey = settings.getString("stripeSecretKey");
  if (!secretKey) {
    return e.json(400, { status: "error", message: "stripe not configured" });
  }

  let intent = null;
  try {
    intent = e.app.findFirstRecordByFilter(
      "paymentIntents",
      "provider = 'stripe' && providerRef = {:ref}",
      { ref: sessionId }
    );
  } catch (err) {
    intent = null;
  }

  const isAdmin = e.hasSuperuserAuth() || !!(e.auth && e.auth.getBool("isAdmin"));
  if (intent && !isAdmin && intent.getString("userId") !== e.auth.id) {
    return e.json(403, { status: "error", message: "forbidden" });
  }
  if (intent && intent.getString("status") === "paid") {
    return e.json(200, { paid: true, orderId: intent.getString("orderRecordId") });
  }

  const res = $http.send({
    url: "https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId),
    method: "GET",
    headers: { Authorization: "Bearer " + secretKey },
    timeout: 20,
  });
  if (res.statusCode !== 200) {
    return e.json(404, { status: "error", message: "session not found" });
  }
  if (res.json.payment_status !== "paid") {
    return e.json(200, { paid: false });
  }

  let orderId = "";
  if (intent) {
    orderId = co.finalizeOrder(e.app, {
      userId: intent.getString("userId"),
      shootingId: intent.getString("shootingId"),
      imagePriceObjectList: JSON.parse(intent.getString("imagePriceObjectList") || "[]"),
      userData: intent.get("userData"),
    });
    intent.set("status", "paid");
    intent.set("orderRecordId", orderId);
    e.app.save(intent);
  }

  return e.json(200, {
    paid: true,
    orderId: orderId,
    amountTotal: res.json.amount_total,
    currency: res.json.currency,
  });
}, $apis.requireAuth());
