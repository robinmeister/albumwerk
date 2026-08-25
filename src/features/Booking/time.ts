// Zeitrechnung und -darstellung für die Terminbuchung im Browser.
//
// ====================== BINDENDE EINSCHRÄNKUNG ======================
// Diese Datei wird von BEIDEN Einstiegspunkten importiert: vom Admin-UI in der
// App und vom schlanken Embed-Bundle (src/embed). Sie darf deshalb NICHTS aus
// dem App-Kontext importieren — kein React, kein Router, kein
// SettingsProvider, kein PocketBase-Client. Nur reine Funktionen.
// Siehe docs/terminbuchung.md §9.1.
//
// Grundsatz wie serverseitig (§3): Die Zeitzone der Instanz ist die Wahrheit.
// Gerechnet wird in UTC-Millisekunden, angezeigt wird in der Zone der
// Fotograf:in, und die Zone wird benannt, wo Verwechslung möglich ist.
//
// Anders als in der PocketBase-JSVM steht im Browser `Intl` mit der vollen
// Zeitzonendatenbank zur Verfügung — hier ist also kein Umweg nötig.

/** Kalenderdatum ohne Zeitanteil, immer als lokales Datum der Instanz-Zone. */
export type CalendarDate = { year: number; month: number; day: number };

const WEEKDAYS_LONG = [
  "Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag",
];
const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTHS_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const pad2 = (value: number) => (value < 10 ? `0${value}` : `${value}`);

// --- Kalenderarithmetik ----------------------------------------------------
// Rein gregorianisch über Date.UTC — hier ist noch keine Zeitzone im Spiel.

export function addDays(date: CalendarDate, count: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + count));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function addMonths(date: CalendarDate, count: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1 + count, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: 1,
  };
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag (wie availabilityRules.weekday). */
export function isoWeekday(date: CalendarDate): number {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function sameDate(a: CalendarDate, b: CalendarDate): boolean {
  return compareDates(a, b) === 0;
}

/** "2026-08-15" */
export function toIsoDate(date: CalendarDate): string {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

export function fromIsoDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return { year: +match[1], month: +match[2], day: +match[3] };
}

// --- Zeitzone --------------------------------------------------------------

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timezone, formatter);
  }
  return formatter;
}

type ZonedParts = CalendarDate & { hour: number; minute: number; weekday: number };

/** Ein UTC-Zeitpunkt zerlegt in die Wanduhrzeit der angegebenen Zone. */
export function zonedParts(ms: number, timezone: string): ZonedParts {
  const parts = partsFormatter(timezone).formatToParts(new Date(ms));
  const value: Record<string, string> = {};
  for (const part of parts) value[part.type] = part.value;
  const hour = Number(value.hour) % 24; // manche Umgebungen liefern "24"
  const asUtc = Date.UTC(
    Number(value.year), Number(value.month) - 1, Number(value.day),
    hour, Number(value.minute), Number(value.second),
  );
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    hour,
    minute: Number(value.minute),
    weekday: new Date(asUtc).getUTCDay(),
  };
}

/**
 * Wanduhrzeit in der Zone → UTC-Millisekunden.
 *
 * Zwei Durchläufe, weil die Verschiebung selbst vom gesuchten Zeitpunkt
 * abhängt: erst mit der Verschiebung am geschätzten Punkt rechnen, dann
 * einmal nachjustieren, falls der Kandidat auf der anderen Seite einer
 * Sommerzeit-Umstellung liegt. Dieselbe Vorgehensweise wie serverseitig in
 * pb_hooks/lib/tzlib.js — an den zwei mehrdeutigen Stunden im Jahr ist das
 * Ergebnis bewusst nicht festgelegt.
 */
export function zonedToMs(
  date: CalendarDate, hour: number, minute: number, timezone: string,
): number {
  const asIfUtc = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);
  const offsetAt = (ms: number) => {
    const p = zonedParts(ms, timezone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0) - ms;
  };
  const first = offsetAt(asIfUtc);
  const candidate = asIfUtc - first;
  const second = offsetAt(candidate);
  return second === first ? candidate : asIfUtc - second;
}

/** Das lokale Kalenderdatum, in das ein UTC-Zeitpunkt fällt. */
export function dateOf(ms: number, timezone: string): CalendarDate {
  const parts = zonedParts(ms, timezone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

/** Heute in der Zone der Instanz — nicht im Browser der Betrachter:in. */
export function todayIn(timezone: string): CalendarDate {
  return dateOf(Date.now(), timezone);
}

// --- Darstellung -----------------------------------------------------------

/** "09:30" */
export function formatTime(ms: number, timezone: string): string {
  const parts = zonedParts(ms, timezone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/** "Sa, 15. August 2026" */
export function formatDateLong(ms: number, timezone: string): string {
  const parts = zonedParts(ms, timezone);
  return `${WEEKDAYS_SHORT[parts.weekday]}, ${parts.day}. ${MONTHS_LONG[parts.month - 1]} ${parts.year}`;
}

/** "Samstag, 15. August 2026" */
export function formatCalendarDateLong(date: CalendarDate): string {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return `${WEEKDAYS_LONG[weekday]}, ${date.day}. ${MONTHS_LONG[date.month - 1]} ${date.year}`;
}

/** "August 2026" */
export function formatMonth(date: CalendarDate): string {
  return `${MONTHS_LONG[date.month - 1]} ${date.year}`;
}

/** "Sa, 15. August 2026, 09:30 Uhr" */
export function formatDateTime(ms: number, timezone: string): string {
  return `${formatDateLong(ms, timezone)}, ${formatTime(ms, timezone)} Uhr`;
}

/**
 * Der Zonenhinweis, der laut §3 überall dabeistehen muss, wo eine Verwechslung
 * möglich ist — aber nur, wenn der Browser tatsächlich woanders steht.
 * Sonst wäre „(Zeit in Berlin)“ für 95 % der Betrachter:innen nur Rauschen.
 */
export function zoneHint(timezone: string): string {
  let local = "";
  try {
    local = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    local = "";
  }
  if (!local || local === timezone) return "";
  const city = timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
  return `Zeit in ${city}`;
}

/** Minuten seit Mitternacht → "09:30" (für Regel-Zeitfenster). */
export function minutesToTime(minutes: number): string {
  const withinDay = ((minutes % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(withinDay / 60))}:${pad2(withinDay % 60)}`;
}

/** "09:30" → 570. Gibt null zurück, wenn die Eingabe keine Uhrzeit ist. */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value).trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Zeitfenster einer Regel als Text. Fenster über Mitternacht werden mit einem
 * Hinweis gekennzeichnet, sonst liest sich "22:00 – 01:00" wie ein Fehler.
 */
export function formatWindow(startMinute: number, endMinute: number): string {
  const overnight = endMinute > 1440;
  return `${minutesToTime(startMinute)} – ${minutesToTime(endMinute)}${overnight ? " (Folgetag)" : ""}`;
}
