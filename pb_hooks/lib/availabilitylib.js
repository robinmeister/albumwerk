/// <reference path="../../pb_data/types.d.ts" />
//
// Verfügbarkeitsrechner (docs/terminbuchung.md §2).
//
// Reine Rechenlogik: keine Datenbank, kein `$app`, keine Netzwerkaufrufe. Die
// Endpunkte in pb_hooks/booking.pb.js laden die Datensätze und reichen sie als
// einfache Objekte herein — dadurch ist dieselbe Funktion in Node unter Vitest
// testbar (tests/availability.test.ts). Genau deshalb liegt hier auch keine
// Zeitzonen-Logik: die kommt als injizierbare Funktion aus tzlib.js.
//
// Grundgedanke: Slots existieren nicht als Datensätze. Sie werden bei jeder
// Anfrage aus Regeln minus Ausnahmen minus Buchungen berechnet. Gebucht wird
// ein Zeitpunkt; die Buchung speichert echte Zeitstempel und überlebt damit
// jede spätere Regeländerung.
//
// Die Regeln des Hauses, alle bewusst getroffen:
//
//   - Das Raster ist am Fensterbeginn verankert und rutscht NICHT nach.
//     Eine Buchung um 10:00 verschiebt die übrigen Startzeiten nicht. Das
//     verschenkt Restlücken, hält den Tag der Fotograf:in aber vorhersagbar —
//     sonst sortiert die Buchungsreihenfolge Fremder seinen Kalender um.
//   - Überlappende oder aneinandergrenzende Fenster werden vor der
//     Rastererzeugung verschmolzen, und das Raster hängt am Beginn des
//     verschmolzenen Fensters. Sonst erzeugen eine Regel 9–13 und eine
//     open-Ausnahme 12–15 zwei konkurrierende Raster mit krummen Startzeiten.
//   - Der Termin selbst muss ins Fenster passen, der Nachlauf-Puffer darf
//     überhängen. Andernfalls würde ein Puffer das buchbare Fenster still
//     verkürzen. Nach hinten wirkt der Puffer trotzdem: über das
//     Startintervall und über die Kollisionsprüfung.
//   - `block`-Ausnahmen sperren immer alles. `allowedTypes` gilt nur für
//     `open`-Ausnahmen und für Regeln — eine Sperre ist Lebenszeit, keine
//     Termin-Art.

// `__hooks` gibt es nur in der PocketBase-JSVM; unter Vitest wird relativ
// geladen. `typeof` statt einer direkten Prüfung, weil der Bezeichner in Node
// gar nicht deklariert ist.
const tz = typeof __hooks !== "undefined"
  ? require(__hooks + "/lib/tzlib.js")
  : require("./tzlib.js");

const MS_PER_MINUTE = 60000;
const MINUTES_PER_DAY = 1440;

// --- Kalenderarithmetik ---------------------------------------------------
// Rein proleptisch-gregorianisch über Date.UTC — hier ist noch keine Zeitzone
// im Spiel, es geht nur um Kalenderdaten als Zahlentripel.

function addDays(date, count) {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + count));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

// ISO-Wochentag: 1 = Montag … 7 = Sonntag (wie availabilityRules.weekday)
function isoWeekday(date) {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function compareDates(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

// --- Termin-Art -----------------------------------------------------------

// Abstand zwischen zwei möglichen Startzeiten. Leer heißt "dicht an dicht",
// also Dauer + Puffer.
function startIntervalOf(type) {
  const configured = Number(type.startIntervalMin) || 0;
  if (configured > 0) {
    return configured;
  }
  return Number(type.durationMin) + (Number(type.bufferMin) || 0);
}

// Wie lange der Kalender durch einen Termin dieser Art tatsächlich belegt ist.
function occupiedMinutesOf(type) {
  return Number(type.durationMin) + (Number(type.bufferMin) || 0);
}

function allowsType(entry, typeId) {
  const allowed = entry.allowedTypes;
  if (!allowed || allowed.length === 0) {
    return true;
  }
  for (let i = 0; i < allowed.length; i++) {
    if (allowed[i] === typeId) {
      return true;
    }
  }
  return false;
}

// --- Fenster --------------------------------------------------------------

// Wanduhr-Minute eines lokalen Tages als UTC-Zeitstempel. Minuten >= 1440
// verschieben den Kalendertag — so werden Fenster über Mitternacht (22:00–01:00)
// zu einem durchgehenden Zeitraum, ohne dass irgendwo 24*60*60*1000 addiert
// wird (ein Tag hat an den Umstellungswochenenden 23 bzw. 25 Stunden).
function wallclockMinuteToMs(date, minute, timezone, toUtcMs) {
  const dayOffset = Math.floor(minute / MINUTES_PER_DAY);
  const withinDay = minute - dayOffset * MINUTES_PER_DAY;
  const target = dayOffset === 0 ? date : addDays(date, dayOffset);
  return toUtcMs(
    target.year,
    target.month,
    target.day,
    Math.floor(withinDay / 60),
    withinDay % 60,
    timezone
  );
}

// Überlappende und direkt aneinandergrenzende Fenster zusammenfassen.
function mergeWindows(windows) {
  if (windows.length < 2) {
    return windows.slice();
  }
  const sorted = windows.slice().sort(function (a, b) {
    return a.startMs - b.startMs;
  });
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.startMs <= last.endMs) {
      if (current.endMs > last.endMs) {
        last.endMs = current.endMs;
      }
    } else {
      merged.push({ startMs: current.startMs, endMs: current.endMs });
    }
  }
  return merged;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

// --- Hauptfunktion --------------------------------------------------------

/**
 * Freie Startzeiten für eine Termin-Art in einem lokalen Datumsbereich.
 *
 * @param {object} input
 *   timezone     IANA-Zone der Instanz, z. B. "Europe/Berlin"
 *   type         { id, durationMin, bufferMin, startIntervalMin, leadTimeMin }
 *   rules        [{ weekday, startMinute, endMinute, allowedTypes, active }]
 *   exceptions   [{ kind: "block"|"open", startMs, endMs, allowedTypes }]
 *   bookings     [{ startMs, endMs, bufferMin }] — belegende Termine
 *   fromDate     { year, month, day } lokales Startdatum, einschließlich
 *   toDate       { year, month, day } lokales Enddatum, einschließlich
 *   nowMs        Jetzt-Zeitpunkt
 *   horizonDays  Buchungshorizont in Tagen
 *   maxPerDay    Tageslimit; 0/leer = unbegrenzt
 * @param {object} [deps] { toUtcMs } — nur für Tests
 * @returns {Array<{startMs:number,endMs:number}>} aufsteigend sortiert
 */
function computeSlots(input, deps) {
  const toUtcMs = (deps && deps.toUtcMs) || tz.toUtcMs;
  const timezone = input.timezone;
  const type = input.type;

  const durationMs = Number(type.durationMin) * MS_PER_MINUTE;
  const occupiedMs = occupiedMinutesOf(type) * MS_PER_MINUTE;
  const stepMs = startIntervalOf(type) * MS_PER_MINUTE;
  if (!(durationMs > 0) || !(stepMs > 0)) {
    return [];
  }

  // Der früheste buchbare Zeitpunkt: Mindestvorlauf ab jetzt.
  const earliestMs = input.nowMs + (Number(type.leadTimeMin) || 0) * MS_PER_MINUTE;
  // Der späteste: Buchungshorizont ab jetzt.
  const horizonDays = Number(input.horizonDays) || 0;
  const latestMs = horizonDays > 0
    ? input.nowMs + horizonDays * MINUTES_PER_DAY * MS_PER_MINUTE
    : Infinity;

  // --- lokale Tage des Bereichs mit ihren UTC-Grenzen ---------------------
  // Wird für die Zuordnung "welcher Slot gehört zu welchem Tag" gebraucht
  // (Tageslimit) und begrenzt zugleich den ausgegebenen Bereich.
  const days = [];
  let cursor = input.fromDate;
  // harte Obergrenze gegen versehentlich riesige Bereiche
  for (let guard = 0; guard < 800 && compareDates(cursor, input.toDate) <= 0; guard++) {
    const startMs = wallclockMinuteToMs(cursor, 0, timezone, toUtcMs);
    const endMs = wallclockMinuteToMs(cursor, MINUTES_PER_DAY, timezone, toUtcMs);
    days.push({ date: cursor, startMs: startMs, endMs: endMs, bookings: 0 });
    cursor = addDays(cursor, 1);
  }
  if (days.length === 0) {
    return [];
  }
  const rangeStartMs = days[0].startMs;
  const rangeEndMs = days[days.length - 1].endMs;

  const dayOf = function (ms) {
    for (let i = 0; i < days.length; i++) {
      if (ms >= days[i].startMs && ms < days[i].endMs) {
        return days[i];
      }
    }
    return null;
  };

  // --- belegende Buchungen ------------------------------------------------
  const bookings = input.bookings || [];
  const occupied = [];
  for (let i = 0; i < bookings.length; i++) {
    const booking = bookings[i];
    const bufferMs = (Number(booking.bufferMin) || 0) * MS_PER_MINUTE;
    occupied.push({ startMs: booking.startMs, endMs: booking.endMs + bufferMs });
    const day = dayOf(booking.startMs);
    if (day) {
      day.bookings++;
    }
  }

  // --- Fenster sammeln ----------------------------------------------------
  const exceptions = input.exceptions || [];
  const rules = input.rules || [];
  const windows = [];
  const blocks = [];

  for (let i = 0; i < exceptions.length; i++) {
    const exception = exceptions[i];
    if (exception.kind === "block") {
      // Sperren gelten für jede Art — allowedTypes wird hier bewusst ignoriert.
      blocks.push({ startMs: exception.startMs, endMs: exception.endMs });
    } else if (exception.kind === "open" && allowsType(exception, type.id)) {
      if (exception.endMs > rangeStartMs && exception.startMs < rangeEndMs) {
        windows.push({ startMs: exception.startMs, endMs: exception.endMs });
      }
    }
  }

  for (let d = 0; d < days.length; d++) {
    const date = days[d].date;
    const weekday = isoWeekday(date);
    for (let r = 0; r < rules.length; r++) {
      const rule = rules[r];
      if (rule.active === false) continue;
      if (Number(rule.weekday) !== weekday) continue;
      if (!allowsType(rule, type.id)) continue;
      const startMinute = Number(rule.startMinute);
      const endMinute = Number(rule.endMinute);
      if (!(endMinute > startMinute)) continue;
      windows.push({
        startMs: wallclockMinuteToMs(date, startMinute, timezone, toUtcMs),
        endMs: wallclockMinuteToMs(date, endMinute, timezone, toUtcMs),
      });
    }
  }

  // --- Raster erzeugen und filtern ----------------------------------------
  const merged = mergeWindows(windows);
  const slots = [];

  for (let w = 0; w < merged.length; w++) {
    const windowStart = merged[w].startMs;
    const windowEnd = merged[w].endMs;

    // Der Termin muss ins Fenster passen; der Puffer darf überhängen.
    for (
      let startMs = windowStart, guard = 0;
      startMs + durationMs <= windowEnd && guard < 2000;
      startMs += stepMs, guard++
    ) {
      const endMs = startMs + durationMs;

      if (startMs < earliestMs) continue;
      if (startMs > latestMs) break;

      const day = dayOf(startMs);
      if (!day) continue;
      if (input.maxPerDay && day.bookings >= Number(input.maxPerDay)) continue;

      let blocked = false;
      for (let b = 0; b < blocks.length; b++) {
        if (overlaps(startMs, startMs + occupiedMs, blocks[b].startMs, blocks[b].endMs)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      for (let o = 0; o < occupied.length; o++) {
        if (overlaps(startMs, startMs + occupiedMs, occupied[o].startMs, occupied[o].endMs)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      slots.push({ startMs: startMs, endMs: endMs });
    }
  }

  slots.sort(function (a, b) {
    return a.startMs - b.startMs;
  });
  return slots;
}

/**
 * Ist ein konkreter Zeitpunkt buchbar? Der Buchungs-Endpunkt prüft damit
 * innerhalb der Transaktion gegen, was die Kund:in behauptet — die Slot-Liste
 * aus computeSlots() ist eine Anzeige, keine Zusage.
 */
function isSlotBookable(input, startMs, deps) {
  const slots = computeSlots(input, deps);
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].startMs === startMs) {
      return true;
    }
  }
  return false;
}

module.exports = {
  computeSlots: computeSlots,
  isSlotBookable: isSlotBookable,
  startIntervalOf: startIntervalOf,
  occupiedMinutesOf: occupiedMinutesOf,
  mergeWindows: mergeWindows,
  isoWeekday: isoWeekday,
  addDays: addDays,
};
