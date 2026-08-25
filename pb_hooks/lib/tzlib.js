/// <reference path="../../pb_data/types.d.ts" />
//
// Die einzige Stelle im Buchungssystem, an der Zeitzonen vorkommen.
//
// Verfügbarkeitsregeln sind Wanduhrzeit ("Sa 9–13" heißt ganzjährig 9 Uhr auf
// der Uhr an der Studiowand). Alles andere — Buchungen, Sperrzeiten,
// Vergleiche — rechnet in UTC-Millisekunden. Dazwischen steht genau eine
// Funktion: `toUtcMs`.
//
// Warum nur diese eine Richtung: Der Verfügbarkeitsrechner iteriert über
// *lokale Kalendertage*, die von außen als Datum hereinkommen, und baut daraus
// Wanduhrzeiten. Die Rückrichtung (UTC-Instant → lokales Datum) wird nirgends
// gebraucht. Das hält den Adapter klein genug, um ihn in zwei Umgebungen
// pflegen zu können.
//
// Zwei Umsetzungen, weil derselbe Rechner in zwei Laufzeiten läuft:
//
//   - `jsvmToUtcMs`  — produktiv in der PocketBase-JSVM. `new DateTime(str, tz)`
//                      ist Gos time.ParseInLocation, also echte IANA-Daten mit
//                      korrekter Sommerzeit.
//   - `intlToUtcMs`  — in Node (Vitest). Nutzt Intl mit der vollen ICU-Datenbank.
//
// `toUtcMs` wählt automatisch. Produktiv läuft ausschließlich der JSVM-Pfad;
// die Tests decken den Intl-Pfad ab. Überall außerhalb der beiden unten
// genannten Stunden im Jahr sind sie deckungsgleich.
//
// Verhalten an den Sommerzeit-Grenzen, bewusst NICHT festgelegt:
//
//   - Nicht existierende Wanduhrzeit (Nacht der Vorstellung, 02:00→03:00):
//     Beide Umsetzungen liefern einen benachbarten gültigen Zeitpunkt statt
//     eines Fehlers.
//   - Doppelte Wanduhrzeit (Nacht der Rückstellung, 03:00→02:00): Es wird
//     eines der beiden Vorkommen geliefert. WELCHES, ist bewusst offen
//     gelassen: Gos time.ParseInLocation nennt die Wahl in diesem Fall
//     ausdrücklich nicht garantiert, und die Intl-Variante hier landet auf dem
//     zweiten (Winterzeit). Die Zusicherung lautet nur: es kommt ein gültiger
//     Zeitpunkt heraus, der auf genau diese Wanduhrzeit zurückführt.
//
//   Betroffen sind ausschließlich Regeln, die genau in diesen beiden Stunden
//   liegen — für Fototermine praktisch nie. Wichtig ist allein, dass nichts
//   abstürzt und nichts still um eine Stunde verrutscht.

function pad2(value) {
  return value < 10 ? "0" + value : "" + value;
}

// "2026-08-15 09:30:00" aus den Kalenderbestandteilen. Kein Date-Objekt im
// Spiel — die Bestandteile sind bereits lokale Wanduhrzeit.
function wallclockString(year, month, day, hour, minute) {
  return (
    year +
    "-" + pad2(month) +
    "-" + pad2(day) +
    " " + pad2(hour) +
    ":" + pad2(minute) +
    ":00"
  );
}

// --- PocketBase-JSVM ------------------------------------------------------

function jsvmToUtcMs(year, month, day, hour, minute, timezone) {
  const parsed = new DateTime(
    wallclockString(year, month, day, hour, minute),
    timezone
  );
  // unix() liefert Sekunden
  return parsed.unix() * 1000;
}

// --- Node / Vitest --------------------------------------------------------

// Verschiebung der Zone gegenüber UTC zu einem konkreten Zeitpunkt, in
// Millisekunden. Formatiert den Instant in der Zone und liest die Bestandteile
// zurück — der Umweg über `Date.UTC` macht daraus wieder eine Zahl.
function intlOffsetMs(utcMs, timezone) {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = format.formatToParts(new Date(utcMs));
  const value = {};
  for (let i = 0; i < parts.length; i++) {
    value[parts[i].type] = parts[i].value;
  }
  // Intl gibt bei hour12:false je nach Umgebung "24" für Mitternacht zurück
  const hour = Number(value.hour) % 24;
  const asUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    hour,
    Number(value.minute),
    Number(value.second)
  );
  return asUtc - utcMs;
}

function intlToUtcMs(year, month, day, hour, minute, timezone) {
  // Die gesuchte Wanduhrzeit, so getan, als wäre sie UTC.
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  // Erster Versuch mit der Verschiebung an dieser Stelle …
  const firstOffset = intlOffsetMs(asIfUtc, timezone);
  const candidate = asIfUtc - firstOffset;
  // … und einmal nachjustieren, falls der Kandidat auf der anderen Seite einer
  // Umstellung liegt. Mehr als zwei Durchläufe braucht es nicht: Zonen wechseln
  // nie zweimal innerhalb der Verschiebungsspanne.
  const secondOffset = intlOffsetMs(candidate, timezone);
  if (secondOffset === firstOffset) {
    return candidate;
  }
  return asIfUtc - secondOffset;
}

// --- Auswahl --------------------------------------------------------------

function toUtcMs(year, month, day, hour, minute, timezone) {
  if (typeof DateTime !== "undefined") {
    return jsvmToUtcMs(year, month, day, hour, minute, timezone);
  }
  return intlToUtcMs(year, month, day, hour, minute, timezone);
}

module.exports = {
  toUtcMs: toUtcMs,
  jsvmToUtcMs: jsvmToUtcMs,
  intlToUtcMs: intlToUtcMs,
  wallclockString: wallclockString,
};
