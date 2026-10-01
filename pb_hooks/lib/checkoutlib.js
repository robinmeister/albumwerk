/// <reference path="../../pb_data/types.d.ts" />
//
// Shared checkout helpers used by both pb_hooks/paypal.pb.js and
// pb_hooks/stripe.pb.js. JSVM handlers run isolated, so reusable logic lives
// here and is pulled in via require(__hooks + "/lib/checkoutlib.js").
//
// Security model: the frontend never decides the price or the entitlement. The
// server recomputes the amount from the trusted `prices` / `packages`
// collections, drives the payment with its own credentials, and — only after a
// verified payment — writes the `orders` record and grants downloadable images.

// `__hooks` gibt es nur in der PocketBase-JSVM; unter Vitest wird relativ
// geladen (Muster availabilitylib.js).
var pl = typeof __hooks !== "undefined"
  ? require(__hooks + "/lib/printlib.js")
  : require("./printlib.js");

// --- base64 (JSVM has no btoa; $security only does the S256 challenge) --------
function base64(input) {
  var chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var i = 0;
  while (i < input.length) {
    var c1 = input.charCodeAt(i++) & 0xff;
    var c2 = i < input.length ? input.charCodeAt(i++) & 0xff : NaN;
    var c3 = i < input.length ? input.charCodeAt(i++) & 0xff : NaN;
    var e1 = c1 >> 2;
    var e2 = ((c1 & 3) << 4) | (c2 >> 4);
    var e3 = ((c2 & 15) << 2) | (c3 >> 6);
    var e4 = c3 & 63;
    if (isNaN(c2)) {
      e3 = e4 = 64;
    } else if (isNaN(c3)) {
      e4 = 64;
    }
    output +=
      chars.charAt(e1) +
      chars.charAt(e2) +
      (e3 === 64 ? "=" : chars.charAt(e3)) +
      (e4 === 64 ? "=" : chars.charAt(e4));
  }
  return output;
}

// --- PayPal REST base + OAuth -------------------------------------------------
function paypalApiBase(live) {
  return live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function paypalAccessToken(clientId, secret, live) {
  var res;
  try {
    res = $http.send({
      url: paypalApiBase(live) + "/v1/oauth2/token",
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + base64(clientId + ":" + secret),
      },
      timeout: 30,
    });
  } catch (err) {
    // could not even reach PayPal (DNS/firewall/no egress) — distinct from
    // PayPal answering with a rejection, so callers can message accordingly.
    throw new Error("PAYPAL_UNREACHABLE: " + String(err));
  }
  if (res.statusCode === 401 || res.statusCode === 403) {
    throw new Error("PAYPAL_REJECTED: " + res.statusCode);
  }
  if (res.statusCode !== 200 || !res.json || !res.json.access_token) {
    throw new Error("PAYPAL_ERROR: " + res.statusCode);
  }
  return res.json.access_token;
}

// --- pricing -----------------------------------------------------------------
function round2(n) {
  return Math.round(n * 100) / 100;
}

function clampQty(q) {
  var n = parseInt(q, 10);
  if (!n || n < 1) return 1;
  if (n > 999) return 999;
  return n;
}

function itemsTotal(app, list) {
  var total = 0;
  for (var i = 0; i < list.length; i++) {
    var obj = list[i];
    if (!obj || !obj.price || !obj.price.length) continue;
    for (var j = 0; j < obj.price.length; j++) {
      var rec;
      try {
        rec = app.findRecordById("prices", String(obj.price[j].id));
      } catch (err) {
        throw new BadRequestError("Unbekannter Preis in der Bestellung.");
      }
      total += rec.getFloat("amount") * clampQty(obj.price[j].quantity);
    }
  }
  return round2(total);
}

// The package attached to a shooting, or null when the shooting sells
// per-image prices instead.
function packageOf(app, shootingId) {
  if (!shootingId) return null;
  var shooting;
  try {
    shooting = app.findRecordById("shootings", shootingId);
  } catch (err) {
    return null;
  }
  var packageId = shooting.getString("packageId");
  if (!packageId) return null;
  try {
    return app.findRecordById("packages", packageId);
  } catch (err) {
    return null;
  }
}

// A package order is billed as: package price, plus the single-image price for
// every image beyond the included count. The count comes from the order list
// itself (one entry per chosen image) — `userSelection` is the album wish list,
// which stays empty unless the shooting has that feature switched on, and
// billing off it silently dropped the surcharge.
function packageTotal(app, shootingId, list) {
  var pkg = packageOf(app, shootingId);
  if (!pkg) return 0;

  var count = list.length;
  var included = pkg.getInt("numberOfImages");
  var totalPrice = parseFloat(pkg.getString("totalPrice")) || 0;
  var singlePrice = parseFloat(pkg.getString("singlePrice")) || 0;
  if (count <= included) return round2(totalPrice);
  return round2(totalPrice + (count - included) * singlePrice);
}

// True when the order is billed through the package: the shooting has one and
// the order carries no per-image prices. The package flow (PackageForm) never
// assigns any, so this is what a package purchase looks like on the wire.
function isPackageOrder(app, shootingId, list) {
  return itemsTotal(app, list) === 0 && packageOf(app, shootingId) !== null;
}

// Authoritative total in major currency units. Per-image prices take
// precedence; if there are none, fall back to package pricing. Shipping is
// added for per-image orders that contain a lab product — packages sell
// images, not prints.
function authoritativeTotal(app, shootingId, list) {
  var total = itemsTotal(app, list);
  if (total === 0 && shootingId) {
    return packageTotal(app, shootingId, list);
  }
  return round2(total + pl.shippingCost(app, list, total));
}

// Every image in the order, regardless of price — used for package orders.
function allImages(list) {
  var out = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].image) out.push(String(list[i].image));
  }
  return out;
}

// Images the buyer may download: those whose selected price is downloadable
// according to the prices collection (never the client payload).
function downloadableImages(app, list) {
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var obj = list[i];
    if (!obj || !obj.image || !obj.price || !obj.price.length) continue;
    for (var j = 0; j < obj.price.length; j++) {
      var rec;
      try {
        rec = app.findRecordById("prices", String(obj.price[j].id));
      } catch (err) {
        continue;
      }
      if (rec.getBool("isDownloadable")) {
        out.push(String(obj.image));
        break;
      }
    }
  }
  return out;
}

// Write the order and grant entitlement after a verified payment. Runs via
// app.save(), which bypasses collection API rules and the users update guard,
// so this is the only path that may create orders / grant downloads. Returns
// the new order id.
function finalizeOrder(app, opts) {
  var list = opts.imagePriceObjectList || [];

  var orderCol = app.findCollectionByNameOrId("orders");
  var order = new Record(orderCol);
  order.set("userId", opts.userId);
  order.set("shootingId", opts.shootingId || "");
  order.set("imagePriceObjectList", JSON.stringify(list));
  order.set("userData", opts.userData || {});
  app.save(order);

  // A package buys the images themselves, so everything in the order is
  // downloadable. Per-image orders grant only what their prices allow.
  var grant = isPackageOrder(app, opts.shootingId, list)
    ? allImages(list)
    : downloadableImages(app, list);
  if (grant.length) {
    try {
      var user = app.findRecordById("users", opts.userId);
      var existing = user.getStringSlice("downloadableImages") || [];
      var seen = {};
      var merged = [];
      existing.concat(grant).forEach(function (img) {
        if (img && !seen[img]) { seen[img] = true; merged.push(img); }
      });
      user.set("downloadableImages", merged);
      app.save(user);
    } catch (err) {
      app.logger().error("entitlement grant failed", "error", String(err));
    }
  }

  return order.id;
}

module.exports = {
  paypalApiBase: paypalApiBase,
  paypalAccessToken: paypalAccessToken,
  authoritativeTotal: authoritativeTotal,
  downloadableImages: downloadableImages,
  isPackageOrder: isPackageOrder,
  finalizeOrder: finalizeOrder,
};
