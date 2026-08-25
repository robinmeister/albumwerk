/// <reference path="../../pb_data/types.d.ts" />
//
// iCalendar-Erzeugung (RFC 5545), reine Zeichenkettenarbeit ohne Fremdpaket.
//
// Zwei Abnehmer:
//   - der .ics-Anhang der Bestätigungsmail (Etappe 2) — die wirksamste
//     Maßnahme gegen Nichterscheinen: ein Termin im Handy-Kalender wird
//     eingehalten, einer in einer Mail vergessen.
//   - der abonnierbare Kalender-Feed der Fotograf:in (Etappe 5).
//
// Alle Zeiten werden in UTC ausgegeben (Form "20260815T070000Z"). Damit
// braucht die Datei keinen VTIMEZONE-Block, und kein Kalenderprogramm kann
// sich bei der Auslegung vertun. Die Anzeige in der jeweiligen Ortszeit
// übernimmt das Kalenderprogramm.

// Zeichen, die in einem Property-Wert eine Bedeutung haben (RFC 5545 §3.3.11).
function escapeText(value) {
  return String(value == null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Millisekunden → "20260815T070000Z"
function toIcalDate(ms) {
  const date = new Date(ms);
  return (
    date.getUTCFullYear() +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    "T" +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes()) +
    pad2(date.getUTCSeconds()) +
    "Z"
  );
}

// RFC 5545 §3.1: Zeilen dürfen 75 Oktette nicht überschreiten; längere werden
// umgebrochen und mit einem führenden Leerzeichen fortgesetzt. Ohne das
// verwerfen manche Kalenderprogramme die ganze Datei — betrifft in der Praxis
// die Beschreibung mit dem Storno-Link.
//
// Gezählt wird in Oktetten, nicht in Zeichen: Ein Umlaut belegt in UTF-8 zwei.
// Ein Umbruch mitten in einer Mehrbyte-Folge wäre kaputt, deshalb wird
// zeichenweise aufaddiert.
function foldLine(line) {
  const text = String(line);
  let out = "";
  let bytes = 0;
  let index = 0;
  while (index < text.length) {
    const code = text.charCodeAt(index);
    // Ersatzzeichenpaar (z. B. ein Emoji im Anliegen der Kund:in): zwei
    // JS-Zeichen, vier Oktette — und es darf zwischen ihnen nicht umgebrochen
    // werden, sonst steht in der Datei ein kaputtes Zeichen.
    const isPair = code >= 0xd800 && code <= 0xdbff && index + 1 < text.length;
    const width = isPair ? 2 : 1;
    const size = isPair ? 4 : code < 0x80 ? 1 : code < 0x800 ? 2 : 3;

    if (bytes + size > 75) {
      out += "\r\n ";
      bytes = 1; // das führende Leerzeichen der Fortsetzungszeile zählt mit
    }
    out += text.substr(index, width);
    bytes += size;
    index += width;
  }
  return out;
}

/**
 * Einzelner VEVENT-Block.
 *
 * @param {object} event
 *   uid          stabile Kennung — dieselbe Kennung ersetzt im Kalender den
 *                vorhandenen Eintrag, statt einen zweiten anzulegen
 *   startMs/endMs
 *   summary, description, location
 *   status       "CONFIRMED" | "TENTATIVE" | "CANCELLED"
 *   sequence     hochzählen, wenn ein bestehender Termin geändert wird
 *   organizer    { name, email }
 *   stampMs      Erstellungszeitpunkt der Datei
 */
function event(event_) {
  const lines = [];
  lines.push("BEGIN:VEVENT");
  lines.push("UID:" + escapeText(event_.uid));
  lines.push("DTSTAMP:" + toIcalDate(event_.stampMs || Date.now()));
  lines.push("DTSTART:" + toIcalDate(event_.startMs));
  lines.push("DTEND:" + toIcalDate(event_.endMs));
  lines.push("SUMMARY:" + escapeText(event_.summary));
  if (event_.description) {
    lines.push("DESCRIPTION:" + escapeText(event_.description));
  }
  if (event_.location) {
    lines.push("LOCATION:" + escapeText(event_.location));
  }
  if (event_.organizer && event_.organizer.email) {
    lines.push(
      "ORGANIZER;CN=" + escapeText(event_.organizer.name || "") +
      ":mailto:" + escapeText(event_.organizer.email)
    );
  }
  lines.push("STATUS:" + (event_.status || "CONFIRMED"));
  lines.push("SEQUENCE:" + (Number(event_.sequence) || 0));
  lines.push("END:VEVENT");
  return lines;
}

/**
 * Vollständige .ics-Datei.
 *
 * METHOD:PUBLISH und nicht REQUEST: REQUEST macht daraus eine Einladung mit
 * Zu-/Absage-Logik, auf die manche Kalenderprogramme mit einer automatischen
 * Antwortmail an die Fotograf:in reagieren. Gewollt ist nur „trag dir das ein".
 */
function calendar(events, options) {
  const settings = options || {};
  const name = settings.name || "Termine";
  let lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Albumwerk//Terminbuchung//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + escapeText(name),
  ];
  for (let i = 0; i < events.length; i++) {
    lines = lines.concat(event(events[i]));
  }
  lines.push("END:VCALENDAR");

  const folded = [];
  for (let i = 0; i < lines.length; i++) {
    folded.push(foldLine(lines[i]));
  }
  // RFC 5545 verlangt CRLF als Zeilenende
  return folded.join("\r\n") + "\r\n";
}

// Stabile Kennung eines Termins. Der Hostanteil muss nur eindeutig aussehen,
// er wird nie aufgelöst.
function uidFor(appointmentId, appUrl) {
  let host = String(appUrl || "").replace(/^[a-z]+:\/\//, "").split("/")[0];
  if (!host) host = "albumwerk.local";
  return appointmentId + "@" + host;
}

module.exports = {
  escapeText: escapeText,
  toIcalDate: toIcalDate,
  foldLine: foldLine,
  event: event,
  calendar: calendar,
  uidFor: uidFor,
};
