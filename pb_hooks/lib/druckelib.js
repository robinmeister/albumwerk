/// <reference path="../../pb_data/types.d.ts" />
//
// Kundenseite „Drucke" (docs/superpowers/specs/2026-10-02-kunden-drucke-design.md).
//
// Übersetzt Druckaufträge und erledigte Bestellungen in das, was die Kundin
// sehen darf. Fasst weder $http noch $security an, damit
// tests/drucke.test.ts es unter Node einbinden kann.

function safeUrl(u) {
  var url = String(u || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function view(status, trackingUrl, trackingNumber) {
  return { status: status, trackingUrl: safeUrl(trackingUrl), trackingNumber: String(trackingNumber || "") };
}

// Beim Weg „an mich" ist `shipped` die Sendung Labor → Studio — für die
// Kundin ist das noch nicht unterwegs, und die Nummer geht sie nichts an.
function customerStatus(job) {
  var st = job.status;
  if (st === "cancelled") return view("cancelled", "", "");
  if (st === "in_production") return view("printing", "", "");
  if (st === "delivered_to_customer" || (st === "shipped" && job.route !== "studio")) {
    return view("shipped", job.trackingUrl, job.trackingNumber);
  }
  return view("processing", "", "");
}

// „Abschicken" heißt „versendet": Ein Archiveintrag ist der Versand.
function manualStatus(finished) {
  if (!finished) return view("processing", "", "");
  return view("shipped", finished.trackingUrl, finished.trackingNumber);
}

// wie copiesOf in printlib.js
function quantityOf(q) {
  var n = parseInt(q, 10);
  if (!n || n < 1) return 1;
  if (n > 999) return 999;
  return n;
}

// Titel, „physisch" und Labor kommen aus der prices-Sammlung, nie aus der
// Liste des Browsers.
function physicalItems(app, list) {
  var out = [];
  var l = list || [];
  for (var i = 0; i < l.length; i++) {
    var obj = l[i];
    if (!obj || !obj.image || !obj.price) continue;
    for (var j = 0; j < obj.price.length; j++) {
      var rec;
      try {
        rec = app.findRecordById("prices", String(obj.price[j].id));
      } catch (_) {
        continue;
      }
      if (rec.getBool("isDownloadable")) continue;
      out.push({
        image: String(obj.image),
        title: rec.getString("title"),
        quantity: quantityOf(obj.price[j].quantity),
        lab: rec.getString("labSku").trim() !== "",
      });
    }
  }
  return out;
}

// Ohne Druckauftrag (Bestellung von vor dem Labor, oder die Anlage schlug
// fehl) gilt auch eine Laborposition als Handdruck — sonst hinge sie ohne
// Status in der Luft.
function groupsForOrder(items, job, finished) {
  var lab = [];
  var manual = [];
  items.forEach(function (it) {
    var entry = { image: it.image, title: it.title, quantity: it.quantity };
    if (it.lab && job) lab.push(entry);
    else manual.push(entry);
  });
  var out = [];
  if (lab.length) {
    var s = customerStatus(job);
    out.push({ kind: "lab", status: s.status, trackingUrl: s.trackingUrl, trackingNumber: s.trackingNumber, items: lab });
  }
  if (manual.length) {
    var m = manualStatus(finished);
    out.push({ kind: "manual", status: m.status, trackingUrl: m.trackingUrl, trackingNumber: m.trackingNumber, items: manual });
  }
  return out;
}

function findByOrder(app, collection, orderId) {
  try {
    return app.findFirstRecordByFilter(collection, "orderId = {:o}", { o: orderId });
  } catch (_) {
    return null;
  }
}

// Altbestände wurden ohne orderId archiviert und tragen die id der Bestellung
// (siehe OrdersPage.loadAll).
function findFinished(app, orderId) {
  var rec = findByOrder(app, "finishedOrders", orderId);
  if (rec) return rec;
  try {
    return app.findRecordById("finishedOrders", orderId);
  } catch (_) {
    return null;
  }
}

function parseList(text) {
  try {
    var v = JSON.parse(text || "[]");
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

function jobFields(rec) {
  if (!rec) return null;
  return {
    status: rec.getString("status"),
    route: rec.getString("route"),
    trackingUrl: rec.getString("trackingUrl"),
    trackingNumber: rec.getString("trackingNumber"),
  };
}

function finishedFields(rec) {
  if (!rec) return null;
  return { trackingUrl: rec.getString("trackingUrl"), trackingNumber: rec.getString("trackingNumber") };
}

// userId kommt im Endpunkt ausschließlich aus e.auth.id.
function ordersView(app, userId) {
  var records = [];
  try {
    records = app.findRecordsByFilter("orders", "userId = {:u}", "-created", 0, 0, { u: userId });
  } catch (_) {
    records = [];
  }
  var orders = [];
  records.forEach(function (order) {
    var items = physicalItems(app, parseList(order.getString("imagePriceObjectList")));
    if (!items.length) return;
    var groups = groupsForOrder(
      items,
      jobFields(findByOrder(app, "printJobs", order.id)),
      finishedFields(findFinished(app, order.id))
    );
    orders.push({ id: order.id, created: order.getString("created"), groups: groups });
  });
  return { orders: orders };
}

// Beim Abschicken: Mail nur, wenn es Handdrucke gibt. Laborpositionen meldet
// der Labor-Webhook, sonst käme die Mail vor dem eigentlichen Versand.
function needsManualShipmentMail(app, order) {
  var items = physicalItems(app, parseList(order.getString("imagePriceObjectList")));
  var job = jobFields(findByOrder(app, "printJobs", order.id));
  return groupsForOrder(items, job, null).some(function (g) { return g.kind === "manual"; });
}

module.exports = {
  customerStatus: customerStatus,
  manualStatus: manualStatus,
  physicalItems: physicalItems,
  groupsForOrder: groupsForOrder,
  findFinished: findFinished,
  ordersView: ordersView,
  needsManualShipmentMail: needsManualShipmentMail,
};
