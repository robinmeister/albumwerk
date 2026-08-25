/// <reference path="../../pb_data/types.d.ts" />
//
// Gemeinsame Bausteine der Terminbuchung (docs/terminbuchung.md).
//
// Liegt in lib/, weil JSVM-Handler in isolierten Runtimes laufen — Funktionen
// aus dem Modul-Scope einer *.pb.js sind im Handler nicht sichtbar. Alles hier
// wird per require IM Handler geholt.
//
// Die eigentliche Rechenlogik steht in availabilitylib.js und ist frei von
// Datenbank und PocketBase. Diese Datei ist die Schicht dazwischen: Sie liest
// Datensätze, macht daraus einfache Objekte und schreibt Ergebnisse zurück.

const SETTINGS_ID = "appsettings0001";

// Zeitkonstanten leben hier und nicht im Modul-Scope der *.pb.js-Dateien:
// JSVM-Handler laufen in isolierten Runtimes, in denen vom Modul-Scope der
// registrierenden Datei NICHTS sichtbar ist — auch keine Konstanten.
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;

// --- Zeitkonvertierung ----------------------------------------------------

// PocketBase speichert Datumsfelder als "2026-08-15 07:00:00.000Z".
function msToPbDate(ms) {
  return new Date(ms).toISOString().replace("T", " ");
}

function pbDateToMs(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  const parsed = new Date(text.replace(" ", "T"));
  const ms = parsed.getTime();
  return isNaN(ms) ? 0 : ms;
}

// Datumsfeld eines Records als Millisekunden. Verträgt beide Rückgabearten:
// die DateTime-Instanz und die Zeichenkette.
function recordMs(record, field) {
  const raw = record.get(field);
  if (!raw) return 0;
  if (typeof raw.unix === "function") {
    return raw.unix() * 1000;
  }
  return pbDateToMs(raw);
}

// "2026-08-15" → { year, month, day }
function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

// --- Einstellungen --------------------------------------------------------

// Alle Werte mit Rückfallwerten, damit eine frisch aufgesetzte Instanz ohne
// konfigurierte Buchung nicht in undefined-Vergleiche läuft.
function readConfig(app) {
  let record = null;
  try {
    record = app.findRecordById("settings", SETTINGS_ID);
  } catch (_) {
    // nicht eingerichtet — Standardwerte unten
  }

  const num = (field, fallback) => {
    const value = record ? Number(record.getInt(field)) : 0;
    return value > 0 ? value : fallback;
  };

  return {
    enabled: record ? record.getBool("bookingEnabled") : false,
    timezone: (record && record.getString("timezone")) || "Europe/Berlin",
    horizonDays: num("bookingHorizonDays", 90),
    // 0 heißt ausdrücklich "unbegrenzt", deshalb kein Rückfallwert
    maxPerDay: record ? Number(record.getInt("bookingMaxPerDay")) || 0 : 0,
    pendingExpiryHours: num("bookingPendingExpiryHours", 48),
    cancelDeadlineHours: num("bookingCancelDeadlineHours", 24),
    // 0 heißt "keine Erinnerung"
    reminderHours: record ? Number(record.getInt("bookingReminderHours")) || 0 : 0,
    retentionMonths: num("bookingRetentionMonths", 12),
    // großzügig, siehe 1785500002_booking_rate_limits.js — eine IP ist wegen
    // CGNAT kein Mensch, die zielgenaue Bremse ist das Limit pro E-Mail
    rateHour: num("bookingRateHour", 10),
    rateDay: num("bookingRateDay", 30),
    doubleOptIn: record ? record.getBool("bookingDoubleOptIn") : false,
    notificationEmail:
      (record && record.getString("bookingNotificationEmail")) ||
      (record && record.getString("contactEmail")) ||
      "",
    currency: (record && record.getString("currency")) || "EUR",
    businessName: (record && record.getString("businessName")) || "Fotogalerie",
  };
}

// --- Termin-Arten ---------------------------------------------------------

// Nimmt Slug oder Id entgegen — der Embed bekommt den Slug per URL, das
// Admin-UI arbeitet mit Ids.
function findType(app, identifier) {
  const value = String(identifier || "").trim();
  if (!value) return null;
  try {
    return app.findFirstRecordByFilter(
      "appointmentTypes",
      "slug = {:value} || id = {:value}",
      { value: value }
    );
  } catch (_) {
    return null;
  }
}

// Die Felder, die der Rechner braucht — bewusst als einfaches Objekt, damit
// availabilitylib.js nichts von PocketBase weiß.
function typeInput(record) {
  return {
    id: record.id,
    durationMin: record.getInt("durationMin"),
    bufferMin: record.getInt("bufferMin"),
    startIntervalMin: record.getInt("startIntervalMin"),
    leadTimeMin: record.getInt("leadTimeMin"),
  };
}

// --- Datensätze laden -----------------------------------------------------

function loadRules(app) {
  let records = [];
  try {
    records = app.findRecordsByFilter("availabilityRules", "active = true", "weekday", 500, 0);
  } catch (_) {
    return [];
  }
  const rules = [];
  for (let i = 0; i < records.length; i++) {
    rules.push({
      weekday: records[i].getInt("weekday"),
      startMinute: records[i].getInt("startMinute"),
      endMinute: records[i].getInt("endMinute"),
      allowedTypes: records[i].get("allowedTypes") || [],
      active: true,
    });
  }
  return rules;
}

// Großzügig gepolsterter Bereich: Eine Sperre, die vor dem Bereich beginnt und
// hineinragt, muss mitgeladen werden.
function loadExceptions(app, fromMs, toMs) {
  let records = [];
  try {
    records = app.findRecordsByFilter(
      "availabilityExceptions",
      "end > {:from} && start < {:to}",
      "start",
      2000,
      0,
      { from: msToPbDate(fromMs), to: msToPbDate(toMs) }
    );
  } catch (_) {
    return [];
  }
  const exceptions = [];
  for (let i = 0; i < records.length; i++) {
    exceptions.push({
      kind: records[i].getString("kind"),
      startMs: recordMs(records[i], "start"),
      endMs: recordMs(records[i], "end"),
      allowedTypes: records[i].get("allowedTypes") || [],
    });
  }
  return exceptions;
}

// Belegende Termine: bestätigt oder noch offen. Abgesagte, abgelehnte und
// verfallene geben ihre Zeit wieder frei.
function loadBookings(app, fromMs, toMs, excludeId) {
  let records = [];
  try {
    records = app.findRecordsByFilter(
      "appointments",
      '(status = "confirmed" || status = "pending") && end > {:from} && start < {:to}',
      "start",
      2000,
      0,
      { from: msToPbDate(fromMs), to: msToPbDate(toMs) }
    );
  } catch (_) {
    return [];
  }
  const bookings = [];
  for (let i = 0; i < records.length; i++) {
    // beim Umbuchen darf der eigene Termin nicht gegen sich selbst kollidieren
    if (excludeId && records[i].id === excludeId) continue;
    bookings.push({
      startMs: recordMs(records[i], "start"),
      endMs: recordMs(records[i], "end"),
      bufferMin: records[i].getInt("bufferMin"),
    });
  }
  return bookings;
}

/**
 * Baut die vollständige Eingabe für availabilitylib.computeSlots().
 * `app` ist die Transaktions-App, wenn innerhalb einer Transaktion gerechnet
 * wird — deshalb wird sie immer durchgereicht statt global gegriffen.
 */
function availabilityInput(app, config, typeRecord, fromDate, toDate, nowMs, excludeId) {
  const availability = require(__hooks + "/lib/availabilitylib.js");
  const tz = require(__hooks + "/lib/tzlib.js");

  // Ladebereich mit einem Tag Puffer an beiden Enden, damit Fenster über
  // Mitternacht und hineinragende Sperren vollständig erfasst werden.
  const padded = {
    from: availability.addDays(fromDate, -1),
    to: availability.addDays(toDate, 2),
  };
  const fromMs = tz.toUtcMs(padded.from.year, padded.from.month, padded.from.day, 0, 0, config.timezone);
  const toMs = tz.toUtcMs(padded.to.year, padded.to.month, padded.to.day, 0, 0, config.timezone);

  return {
    timezone: config.timezone,
    type: typeInput(typeRecord),
    rules: loadRules(app),
    exceptions: loadExceptions(app, fromMs, toMs),
    bookings: loadBookings(app, fromMs, toMs, excludeId),
    fromDate: fromDate,
    toDate: toDate,
    nowMs: nowMs,
    horizonDays: config.horizonDays,
    maxPerDay: config.maxPerDay,
  };
}

/**
 * Überschneidet sich der Zeitraum mit einem belegenden Termin?
 *
 * Für den Fall, dass die Fotograf:in selbst einträgt: Dort gelten Regeln,
 * Mindestvorlauf und Tageslimit ausdrücklich nicht (sie weiß, was sie tut), die
 * Doppelbuchungsprüfung aber schon — als Warnung, nicht als Verbot.
 */
function collidingBooking(app, startMs, endMs, bufferMin, excludeId) {
  const occupiedEnd = endMs + (Number(bufferMin) || 0) * 60000;
  const candidates = loadBookings(app, startMs - 24 * 3600000, occupiedEnd + 24 * 3600000, excludeId);
  for (let i = 0; i < candidates.length; i++) {
    const otherEnd = candidates[i].endMs + (Number(candidates[i].bufferMin) || 0) * 60000;
    if (startMs < otherEnd && candidates[i].startMs < occupiedEnd) {
      return candidates[i];
    }
  }
  return null;
}

// --- Missbrauchsabwehr ----------------------------------------------------

// Zähler im app.store() — der überlebt zwischen Anfragen, anders als alles im
// Modul-Scope eines Handlers. Als Zeichenkette abgelegt, weil Werte die Grenze
// zwischen den isolierten Runtimes überqueren und ein JS-Array das nicht
// zuverlässig übersteht.
//
// Rate-Limiting ist bewusst näherungsweise: Zwei exakt gleichzeitige Anfragen
// können sich überholen. Das ist hier folgenlos — es geht darum, das massenhafte
// Zumüllen zu bremsen, nicht darum, auf die Anfrage genau abzuzählen.
function withinRateLimit(app, key, windowMs, max, record) {
  const store = app.store();
  const now = Date.now();
  const raw = String(store.get(key) || "");
  const kept = [];
  if (raw) {
    const parts = raw.split(",");
    for (let i = 0; i < parts.length; i++) {
      const stamp = Number(parts[i]);
      if (stamp && now - stamp < windowMs) {
        kept.push(stamp);
      }
    }
  }
  if (kept.length >= max) {
    store.set(key, kept.join(","));
    return false;
  }
  // `record` trennt Prüfen vom Zählen: Der Endpunkt prüft früh (bevor er
  // irgendetwas lädt), zählt aber erst, wenn die Eingaben gültig sind. Sonst
  // verbraucht jemand, der seine E-Mail dreimal vertippt, sein Kontingent —
  // und liest dann "zu viele Buchungen", obwohl er noch keine einzige hat.
  if (record) {
    kept.push(now);
  }
  store.set(key, kept.join(","));
  return true;
}

// Die IP wird nur gehasht und nur im Arbeitsspeicher gehalten (siehe
// docs/terminbuchung.md §10 — auf der Buchung landet sie nie).
function clientKey(event) {
  let ip = "";
  try {
    ip = event.realIP() || "";
  } catch (_) {
    ip = "";
  }
  return $security.md5("albumwerk-booking:" + ip);
}

// Zu viele offene Termine auf dieselbe Adresse? Bremst den naiven Massenangriff
// mit einer einzigen Adresse aus.
function openBookingsForEmail(app, email, nowMs) {
  if (!email) return 0;
  try {
    const records = app.findRecordsByFilter(
      "appointments",
      '(status = "confirmed" || status = "pending") && customerEmail = {:email} && start > {:now}',
      "start",
      50,
      0,
      { email: email, now: msToPbDate(nowMs) }
    );
    return records.length;
  } catch (_) {
    return 0;
  }
}

// --- Token ----------------------------------------------------------------

// Storno-/Umbuchungs-Link. Wer die Mail hat, darf handeln — der Termin gehört
// der Adresse, an die die Mail ging.
function newToken() {
  return $security.randomString(42);
}

function findByToken(app, token) {
  const value = String(token || "").trim();
  if (value.length < 20) return null;
  try {
    return app.findFirstRecordByFilter("appointments", "token = {:token}", { token: value });
  } catch (_) {
    return null;
  }
}

// --- Fehlerbehandlung -----------------------------------------------------

/**
 * Umschließt einen Endpunkt-Handler.
 *
 * Ohne das macht PocketBase aus einer unerwarteten Ausnahme im Handler ein
 * nacktes `400 Something went wrong` ohne Logeintrag — irreführend (ein
 * Serverfehler ist kein Client-Fehler) und im Betrieb nicht nachvollziehbar.
 * Hier wird die Ursache samt Stack protokolliert und ehrlich 500 geantwortet.
 */
function guard(event, label, handler) {
  try {
    return handler();
  } catch (err) {
    try {
      event.app.logger().error(
        "[booking] " + label + " fehlgeschlagen",
        "error", String(err),
        "stack", String((err && err.stack) || "")
      );
    } catch (_) { /* Logging darf die Antwort nicht verhindern */ }
    return event.json(500, {
      status: "error",
      message: "Da ist etwas schiefgelaufen. Bitte versuche es später noch einmal.",
    });
  }
}

// --- Eingabeprüfung -------------------------------------------------------

function cleanText(value, maxLength) {
  return String(value == null ? "" : value).trim().substring(0, maxLength);
}

function looksLikeEmail(value) {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(String(value || ""));
}

module.exports = {
  SETTINGS_ID: SETTINGS_ID,
  MS_PER_MINUTE: MS_PER_MINUTE,
  MS_PER_HOUR: MS_PER_HOUR,
  msToPbDate: msToPbDate,
  pbDateToMs: pbDateToMs,
  recordMs: recordMs,
  parseDate: parseDate,
  readConfig: readConfig,
  findType: findType,
  typeInput: typeInput,
  loadRules: loadRules,
  loadExceptions: loadExceptions,
  loadBookings: loadBookings,
  collidingBooking: collidingBooking,
  availabilityInput: availabilityInput,
  withinRateLimit: withinRateLimit,
  clientKey: clientKey,
  openBookingsForEmail: openBookingsForEmail,
  newToken: newToken,
  findByToken: findByToken,
  guard: guard,
  cleanText: cleanText,
  looksLikeEmail: looksLikeEmail,
};
