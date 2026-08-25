/// <reference path="../pb_data/types.d.ts" />
//
// Die Endpunkte der Terminbuchung (docs/terminbuchung.md §4.2).
//
// `appointments.createRule` ist null — Buchungen entstehen ausschließlich hier.
// Der Grund steht ausführlich in der Migration; kurz:
//
//   - Prüfung und Anlage müssen in EINER Transaktion liegen, sonst gewinnen bei
//     zwei gleichzeitigen Klicks beide. Ein Unique-Index hilft nicht, er kann
//     Gleichheit prüfen, aber keine Überschneidung.
//   - Der Client darf keine Felder mitschicken. Er nennt Art, Startzeit,
//     Kontaktdaten und Einwilligung; alles andere leitet der Server her —
//     sonst käme `status: "confirmed"` oder `durationMin: 5` von außen.
//
// Regeln und Ausnahmen bleiben unter Verschluss: Nach außen geht nur die Liste
// freier Startzeiten, nie der Kalender. Fremde erfahren dadurch auch nicht,
// ob eine Zeit leer oder gebucht ist — nur, was buchbar ist.
//
// Alle Antworten sind bewusst knapp und ohne interne Details.

// ---------------------------------------------------------------------------
// Verfügbarkeit
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/custom/booking/availability", (e) => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const availability = require(__hooks + "/lib/availabilitylib.js");
  return booking.guard(e, "Verfügbarkeit", () => {

    const config = booking.readConfig(e.app);
    if (!config.enabled) {
      return e.json(404, { status: "error", message: "Terminbuchung ist nicht aktiviert." });
    }

    const query = e.request.url.query();
    const typeRecord = booking.findType(e.app, query.get("type"));
    if (!typeRecord || !typeRecord.getBool("active")) {
      return e.json(404, { status: "error", message: "Diese Leistung gibt es nicht." });
    }

    const fromDate = booking.parseDate(query.get("from"));
    const toDate = booking.parseDate(query.get("to"));
    if (!fromDate || !toDate) {
      return e.json(400, { status: "error", message: "from und to müssen als JJJJ-MM-TT angegeben werden." });
    }

    // Der Bereich wird begrenzt, damit niemand mit einer Anfrage über zehn Jahre
    // den Rechner beschäftigt. Die Oberfläche fragt ohnehin monatsweise.
    const spanDays = Math.round(
      (Date.UTC(toDate.year, toDate.month - 1, toDate.day) -
        Date.UTC(fromDate.year, fromDate.month - 1, fromDate.day)) / 86400000
    );
    if (spanDays < 0 || spanDays > 62) {
      return e.json(400, { status: "error", message: "Der Zeitraum darf höchstens 62 Tage umfassen." });
    }

    const nowMs = Date.now();
    const input = booking.availabilityInput(e.app, config, typeRecord, fromDate, toDate, nowMs);
    const slots = availability.computeSlots(input);

    const out = [];
    for (let i = 0; i < slots.length; i++) {
      out.push({
        start: new Date(slots[i].startMs).toISOString(),
        end: new Date(slots[i].endMs).toISOString(),
      });
    }

    return e.json(200, {
      status: "ok",
      timezone: config.timezone,
      horizonDays: config.horizonDays,
      type: {
        id: typeRecord.id,
        slug: typeRecord.getString("slug"),
        name: typeRecord.getString("name"),
        description: typeRecord.getString("description"),
        location: typeRecord.getString("location"),
        durationMin: typeRecord.getInt("durationMin"),
        price: typeRecord.getFloat("price"),
        currency: config.currency,
        phoneMode: typeRecord.getString("phoneMode") || "optional",
        requiresApproval: typeRecord.getBool("requiresApproval"),
      },
      slots: out,
    });
  });
});

// ---------------------------------------------------------------------------
// Buchen
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/custom/booking", (e) => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const availability = require(__hooks + "/lib/availabilitylib.js");
  const mails = require(__hooks + "/lib/bookingmaillib.js");
  return booking.guard(e, "Buchen", () => {

    const config = booking.readConfig(e.app);
    if (!config.enabled) {
      return e.json(404, { status: "error", message: "Terminbuchung ist nicht aktiviert." });
    }

    const body = e.requestInfo().body || {};

    // --- Missbrauchsabwehr, bevor irgendetwas geladen wird -------------------

    // Honeypot: ein für Menschen unsichtbares Feld. Ist es gefüllt, war es ein
    // Bot. Antwort bewusst wie ein Erfolg aussehend, damit der Bot nichts lernt.
    if (booking.cleanText(body.website, 200)) {
      return e.json(200, { status: "ok", token: "", requiresApproval: false });
    }

    // Ein Formular, das in unter zwei Sekunden abgeschickt wurde, hat niemand
    // ausgefüllt. Der Wert kommt vom Client und ist fälschbar — das ist bekannt
    // und in Ordnung: Es geht um naive Bots, nicht um entschlossene Angreifer.
    const renderedAt = Number(body.renderedAt) || 0;
    if (renderedAt && Date.now() - renderedAt < 2000) {
      return e.json(429, { status: "error", message: "Bitte versuche es noch einmal." });
    }

    const key = booking.clientKey(e);
    if (!booking.withinRateLimit(e.app, "bk:h:" + key, 3600000, config.rateHour, false) ||
        !booking.withinRateLimit(e.app, "bk:d:" + key, 86400000, config.rateDay, false)) {
      return e.json(429, {
        status: "error",
        message: "Zu viele Buchungen in kurzer Zeit. Bitte melde dich direkt bei uns.",
      });
    }

    // --- Eingaben ------------------------------------------------------------

    const typeRecord = booking.findType(e.app, body.type);
    if (!typeRecord || !typeRecord.getBool("active")) {
      return e.json(404, { status: "error", message: "Diese Leistung gibt es nicht." });
    }

    const startMs = booking.pbDateToMs(body.start);
    if (!startMs) {
      return e.json(400, { status: "error", message: "Bitte wähle einen Termin." });
    }

    const name = booking.cleanText(body.name, 120);
    const email = booking.cleanText(body.email, 200).toLowerCase();
    const phone = booking.cleanText(body.phone, 40);
    const message = booking.cleanText(body.message, 1000);

    if (!name) {
      return e.json(400, { status: "error", message: "Bitte gib deinen Namen an." });
    }
    if (!booking.looksLikeEmail(email)) {
      return e.json(400, { status: "error", message: "Bitte gib eine gültige E-Mail-Adresse an." });
    }
    if (typeRecord.getString("phoneMode") === "required" && !phone) {
      return e.json(400, { status: "error", message: "Bitte gib eine Telefonnummer an." });
    }
    // Ohne Einwilligung wird nichts gespeichert. Zeitpunkt und Textfassung
    // landen auf der Buchung, sonst ist die Einwilligung nicht nachweisbar.
    if (!body.consent) {
      return e.json(400, { status: "error", message: "Bitte stimme der Datenschutzerklärung zu." });
    }

    if (booking.openBookingsForEmail(e.app, email, Date.now()) >= 3) {
      return e.json(429, {
        status: "error",
        message: "Für diese E-Mail-Adresse stehen bereits mehrere Termine offen.",
      });
    }

    // Ab hier ist die Eingabe vollständig und plausibel — erst jetzt zählt der
    // Versuch gegen das Kontingent.
    booking.withinRateLimit(e.app, "bk:h:" + key, 3600000, config.rateHour, true);
    booking.withinRateLimit(e.app, "bk:d:" + key, 86400000, config.rateDay, true);

    // --- Anlegen -------------------------------------------------------------

    const durationMin = typeRecord.getInt("durationMin");
    const endMs = startMs + durationMin * booking.MS_PER_MINUTE;
    const requiresApproval = typeRecord.getBool("requiresApproval");
    const token = booking.newToken();

    // Eingeloggte Kund:innen bekommen die Kontoverknüpfung automatisch — das ist
    // eine authentifizierte Tatsache, keine Behauptung. Anonyme Buchungen werden
    // NIE automatisch zugeordnet, auch wenn die Adresse zufällig passt.
    let userId = "";
    if (e.auth && !e.auth.getBool("isAdmin")) {
      userId = e.auth.id;
    }

    let createdId = "";
    let failure = null;

    try {
      e.app.runInTransaction((txApp) => {
        // Innerhalb der Transaktion neu rechnen — die Slot-Liste, die der Client
        // gesehen hat, ist eine Anzeige, keine Zusage. Zwischen Anzeige und Klick
        // kann jemand anders gebucht haben.
        const local = mails.shiftToZone(startMs, config.timezone);
        const day = { year: local.year, month: local.month, day: local.day };
        const input = booking.availabilityInput(txApp, config, typeRecord, day, day, Date.now());

        if (!availability.isSlotBookable(input, startMs)) {
          failure = "slot";
          return;
        }

        const record = new Record(txApp.findCollectionByNameOrId("appointments"));
        record.set("type", typeRecord.id);
        record.set("start", booking.msToPbDate(startMs));
        record.set("end", booking.msToPbDate(endMs));
        // Kopien statt Verweise: Ändert sich die Art später, darf ein bereits
        // gebuchter Termin nicht rückwirkend anders werden.
        record.set("durationMin", durationMin);
        record.set("bufferMin", typeRecord.getInt("bufferMin"));
        record.set("price", typeRecord.getFloat("price"));
        record.set("typeName", typeRecord.getString("name"));
        record.set("status", requiresApproval ? "pending" : "confirmed");
        record.set("customerName", name);
        record.set("customerEmail", email);
        record.set("customerPhone", phone);
        record.set("message", message);
        record.set("token", token);
        record.set("source", "customer");
        record.set("consentAt", booking.msToPbDate(Date.now()));
        record.set("consentVersion", booking.cleanText(body.consentVersion, 40) || "v1");
        if (userId) {
          record.set("user", userId);
        }
        if (requiresApproval) {
          // Eine offene Anfrage hält den Slot — aber nicht ewig.
          record.set(
            "expiresAt",
            booking.msToPbDate(Date.now() + config.pendingExpiryHours * 3600000)
          );
        }
        txApp.save(record);
        createdId = record.id;
      });
    } catch (err) {
      e.app.logger().error("[booking] Anlegen fehlgeschlagen", "error", String(err));
      return e.json(500, { status: "error", message: "Die Buchung konnte nicht gespeichert werden." });
    }

    if (failure === "slot") {
      return e.json(409, {
        status: "error",
        code: "slot_taken",
        message: "Dieser Termin ist inzwischen vergeben. Bitte wähle einen anderen.",
      });
    }

    // Mails erst NACH der Transaktion: Ein Fehler beim Versand darf eine
    // geschriebene Buchung nicht zurückrollen.
    try {
      const record = e.app.findRecordById("appointments", createdId);
      mails.customerConfirmation(e.app, record, config, { pending: requiresApproval });
      mails.ownerNotification(e.app, record, config, { pending: requiresApproval });
    } catch (err) {
      e.app.logger().error("[booking] Mailversand nach Buchung fehlgeschlagen", "error", String(err));
    }

    return e.json(200, {
      status: "ok",
      token: token,
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      requiresApproval: requiresApproval,
    });
  });
});

// ---------------------------------------------------------------------------
// Termin über den Token-Link ansehen
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/custom/booking/manage", (e) => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  return booking.guard(e, "Termin abrufen", () => {

    const config = booking.readConfig(e.app);
    const record = booking.findByToken(e.app, e.request.url.query().get("token"));
    if (!record) {
      return e.json(404, { status: "error", message: "Dieser Link ist nicht (mehr) gültig." });
    }

    const startMs = booking.recordMs(record, "start");
    const status = record.getString("status");
    const deadlineMs = startMs - config.cancelDeadlineHours * 3600000;
    const changeable = (status === "confirmed" || status === "pending") && Date.now() < deadlineMs;

    return e.json(200, {
      status: "ok",
      timezone: config.timezone,
      appointment: {
        start: new Date(startMs).toISOString(),
        end: new Date(booking.recordMs(record, "end")).toISOString(),
        durationMin: record.getInt("durationMin"),
        typeName: record.getString("typeName"),
        typeSlug: (function () {
          try {
            return e.app.findRecordById("appointmentTypes", record.getString("type")).getString("slug");
          } catch (_) {
            return "";
          }
        })(),
        status: status,
        customerName: record.getString("customerName"),
      },
      // Nach Fristablauf zeigt die Seite den Termin weiter an und erklärt, warum
      // nichts mehr geht — sonst kommt „Ihr Link funktioniert nicht".
      changeable: changeable,
      cancelDeadlineHours: config.cancelDeadlineHours,
      contactEmail: config.notificationEmail,
    });
  });
});

// ---------------------------------------------------------------------------
// Absagen und Verschieben
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/custom/booking/cancel", (e) => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const availability = require(__hooks + "/lib/availabilitylib.js");
  const mails = require(__hooks + "/lib/bookingmaillib.js");
  return booking.guard(e, "Absage/Verschiebung", () => {

    const config = booking.readConfig(e.app);
    const body = e.requestInfo().body || {};

    const record = booking.findByToken(e.app, body.token);
    if (!record) {
      return e.json(404, { status: "error", message: "Dieser Link ist nicht (mehr) gültig." });
    }

    const status = record.getString("status");
    if (status !== "confirmed" && status !== "pending") {
      return e.json(409, { status: "error", message: "Dieser Termin ist bereits abgesagt." });
    }

    const startMs = booking.recordMs(record, "start");
    if (Date.now() >= startMs - config.cancelDeadlineHours * 3600000) {
      return e.json(403, {
        status: "error",
        code: "deadline_passed",
        message: "Der Termin lässt sich online nicht mehr ändern. Bitte melde dich direkt bei uns.",
      });
    }

    const action = String(body.action || "cancel");

    // --- Absagen -------------------------------------------------------------
    if (action === "cancel") {
      // Nicht löschen, sondern stornieren: Der Slot wird frei, die Historie
      // bleibt — sonst sieht man nie, dass da mal etwas war.
      record.set("status", "cancelled");
      record.set("cancelledAt", booking.msToPbDate(Date.now()));
      record.set("cancelReason", booking.cleanText(body.reason, 500));
      try {
        e.app.save(record);
      } catch (err) {
        e.app.logger().error("[booking] Storno fehlgeschlagen", "error", String(err));
        return e.json(500, { status: "error", message: "Die Absage konnte nicht gespeichert werden." });
      }
      mails.cancellation(e.app, record, config, { byOwner: false });
      return e.json(200, { status: "ok", action: "cancelled" });
    }

    // --- Verschieben ---------------------------------------------------------
    if (action !== "reschedule") {
      return e.json(400, { status: "error", message: "Unbekannte Aktion." });
    }

    const newStartMs = booking.pbDateToMs(body.start);
    if (!newStartMs) {
      return e.json(400, { status: "error", message: "Bitte wähle einen neuen Termin." });
    }

    // Nur innerhalb derselben Art. Ein Artwechsel wäre eine neue Buchung —
    // sonst müssten Preisdifferenzen und Freigabe-Regeln nachgezogen werden.
    const typeRecord = booking.findType(e.app, record.getString("type"));
    if (!typeRecord || !typeRecord.getBool("active")) {
      return e.json(409, {
        status: "error",
        message: "Diese Leistung wird nicht mehr angeboten. Bitte melde dich direkt bei uns.",
      });
    }

    const durationMin = record.getInt("durationMin");
    const newEndMs = newStartMs + durationMin * booking.MS_PER_MINUTE;
    let failure = null;

    try {
      e.app.runInTransaction((txApp) => {
        const local = mails.shiftToZone(newStartMs, config.timezone);
        const day = { year: local.year, month: local.month, day: local.day };
        // Der eigene Termin darf beim Verschieben nicht gegen sich selbst
        // kollidieren — deshalb wird er aus der Belegung herausgerechnet.
        const input = booking.availabilityInput(
          txApp, config, typeRecord, day, day, Date.now(), record.id
        );
        if (!availability.isSlotBookable(input, newStartMs)) {
          failure = "slot";
          return;
        }
        const fresh = txApp.findRecordById("appointments", record.id);
        fresh.set("start", booking.msToPbDate(newStartMs));
        fresh.set("end", booking.msToPbDate(newEndMs));
        // Die Erinnerung muss für den neuen Zeitpunkt erneut greifen.
        fresh.set("reminderSentAt", "");
        txApp.save(fresh);
      });
    } catch (err) {
      e.app.logger().error("[booking] Verschieben fehlgeschlagen", "error", String(err));
      return e.json(500, { status: "error", message: "Der Termin konnte nicht verschoben werden." });
    }

    if (failure === "slot") {
      return e.json(409, {
        status: "error",
        code: "slot_taken",
        message: "Dieser Termin ist inzwischen vergeben. Bitte wähle einen anderen.",
      });
    }

    try {
      const fresh = e.app.findRecordById("appointments", record.id);
      mails.rescheduled(e.app, fresh, config, startMs);
    } catch (err) {
      e.app.logger().error("[booking] Mailversand nach Verschieben fehlgeschlagen", "error", String(err));
    }

    return e.json(200, {
      status: "ok",
      action: "rescheduled",
      start: new Date(newStartMs).toISOString(),
    });
  });
});

// ---------------------------------------------------------------------------
// Admin: Anfrage zusagen oder ablehnen
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/custom/booking/decide", (e) => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const mails = require(__hooks + "/lib/bookingmaillib.js");
  return booking.guard(e, "Entscheidung", () => {

    if (!e.hasSuperuserAuth() && !(e.auth && e.auth.getBool("isAdmin"))) {
      return e.json(403, { status: "error", message: "Nur für Administrator:innen." });
    }

    const body = e.requestInfo().body || {};
    const config = booking.readConfig(e.app);

    let record;
    try {
      record = e.app.findRecordById("appointments", String(body.id || ""));
    } catch (_) {
      return e.json(404, { status: "error", message: "Termin nicht gefunden." });
    }
    if (record.getString("status") !== "pending") {
      return e.json(409, { status: "error", message: "Diese Anfrage ist bereits entschieden." });
    }

    const approved = !!body.approve;
    const note = booking.cleanText(body.note, 500);

    record.set("status", approved ? "confirmed" : "declined");
    record.set("expiresAt", "");
    if (!approved) {
      record.set("cancelledAt", booking.msToPbDate(Date.now()));
      record.set("cancelReason", note);
    }
    try {
      e.app.save(record);
    } catch (err) {
      e.app.logger().error("[booking] Entscheidung fehlgeschlagen", "error", String(err));
      return e.json(500, { status: "error", message: "Konnte nicht gespeichert werden." });
    }

    mails.customerDecision(e.app, record, config, { approved: approved, note: note });
    return e.json(200, { status: "ok", approved: approved });
  });
});

// ---------------------------------------------------------------------------
// Admin: Termin selbst eintragen
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/custom/booking/manual", (e) => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const mails = require(__hooks + "/lib/bookingmaillib.js");
  return booking.guard(e, "Manueller Termin", () => {

    if (!e.hasSuperuserAuth() && !(e.auth && e.auth.getBool("isAdmin"))) {
      return e.json(403, { status: "error", message: "Nur für Administrator:innen." });
    }

    const body = e.requestInfo().body || {};
    const config = booking.readConfig(e.app);

    const typeRecord = booking.findType(e.app, body.type);
    if (!typeRecord) {
      return e.json(404, { status: "error", message: "Diese Leistung gibt es nicht." });
    }

    const startMs = booking.pbDateToMs(body.start);
    if (!startMs) {
      return e.json(400, { status: "error", message: "Bitte gib einen Zeitpunkt an." });
    }

    // Dauer darf abweichen — eine telefonisch vereinbarte Sitzung hält sich nicht
    // ans Raster.
    const durationMin = Number(body.durationMin) || typeRecord.getInt("durationMin");
    const endMs = startMs + durationMin * booking.MS_PER_MINUTE;

    // Leitplanken gelten hier NICHT: kein Mindestvorlauf, kein Tageslimit, auch
    // außerhalb der eigenen Regeln. Wer sich selbst einen Termin einträgt, weiß
    // was sie tut. Nur die Doppelbuchung wird geprüft — und zwar als Warnung,
    // die mit `force` übergangen werden kann.
    const clash = booking.collidingBooking(e.app, startMs, endMs, typeRecord.getInt("bufferMin"), "");
    if (clash && !body.force) {
      return e.json(409, {
        status: "error",
        code: "overlap",
        message: "Der Zeitraum überschneidet sich mit einem bestehenden Termin.",
        conflict: { start: new Date(clash.startMs).toISOString() },
      });
    }

    const email = booking.cleanText(body.email, 200).toLowerCase();
    const token = booking.newToken();
    let createdId = "";

    try {
      const record = new Record(e.app.findCollectionByNameOrId("appointments"));
      record.set("type", typeRecord.id);
      record.set("start", booking.msToPbDate(startMs));
      record.set("end", booking.msToPbDate(endMs));
      record.set("durationMin", durationMin);
      record.set("bufferMin", typeRecord.getInt("bufferMin"));
      record.set("price", typeRecord.getFloat("price"));
      record.set("typeName", typeRecord.getString("name"));
      record.set("status", "confirmed");
      record.set("customerName", booking.cleanText(body.name, 120));
      record.set("customerEmail", email);
      record.set("customerPhone", booking.cleanText(body.phone, 40));
      record.set("message", booking.cleanText(body.message, 1000));
      record.set("token", token);
      record.set("source", "admin");
      if (body.user) {
        record.set("user", String(body.user));
      }
      e.app.save(record);
      createdId = record.id;
    } catch (err) {
      e.app.logger().error("[booking] Manuelles Eintragen fehlgeschlagen", "error", String(err));
      return e.json(500, { status: "error", message: "Der Termin konnte nicht gespeichert werden." });
    }

    // Nur benachrichtigen, wenn es überhaupt eine Adresse gibt — ein Eintrag
    // „Fahrtzeit" ohne Kundendaten braucht keine Mail.
    if (email && body.notify !== false) {
      try {
        const record = e.app.findRecordById("appointments", createdId);
        mails.customerConfirmation(e.app, record, config, { pending: false });
      } catch (err) {
        e.app.logger().error("[booking] Mailversand nach manuellem Eintrag fehlgeschlagen", "error", String(err));
      }
    }

    return e.json(200, { status: "ok", id: createdId });
  });
});

// ---------------------------------------------------------------------------
// Admin: Termin absagen
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/custom/booking/owner-cancel", (e) => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const mails = require(__hooks + "/lib/bookingmaillib.js");
  return booking.guard(e, "Absage durch Admin", () => {

    if (!e.hasSuperuserAuth() && !(e.auth && e.auth.getBool("isAdmin"))) {
      return e.json(403, { status: "error", message: "Nur für Administrator:innen." });
    }

    const body = e.requestInfo().body || {};
    const config = booking.readConfig(e.app);

    let record;
    try {
      record = e.app.findRecordById("appointments", String(body.id || ""));
    } catch (_) {
      return e.json(404, { status: "error", message: "Termin nicht gefunden." });
    }

    const status = record.getString("status");
    if (status !== "confirmed" && status !== "pending") {
      return e.json(409, { status: "error", message: "Dieser Termin ist bereits abgesagt." });
    }

    const note = booking.cleanText(body.note, 500);
    // Die Fotograf:in darf IMMER absagen, auch nach Fristablauf.
    record.set("status", "cancelled");
    record.set("cancelledAt", booking.msToPbDate(Date.now()));
    record.set("cancelReason", note);
    try {
      e.app.save(record);
    } catch (err) {
      e.app.logger().error("[booking] Absage durch Admin fehlgeschlagen", "error", String(err));
      return e.json(500, { status: "error", message: "Konnte nicht gespeichert werden." });
    }

    mails.cancellation(e.app, record, config, { byOwner: true, note: note });
    return e.json(200, { status: "ok" });
  });
});
