// Was Kund:innen an einem Tag buchen können — für den Termin-Kalender
// (docs/terminbuchung.md §11.1). Die Zeiten kommen fertig gerechnet vom
// öffentlichen Verfügbarkeits-Endpunkt; hier werden sie nur nach Tag sortiert.
import { dateOf, formatTime, toIsoDate } from "../Booking/time";

export interface BookableType {
  name: string;
  /** Startzeiten als „HH:MM“, aufsteigend. */
  times: string[];
}

/** ISO-Datum → buchbare Arten an diesem Tag, in der Reihenfolge von `results`. */
export function bookableByDay(
  results: { name: string; slots: { startMs: number }[] }[],
  timezone: string,
): Map<string, BookableType[]> {
  const days = new Map<string, BookableType[]>();
  for (const result of results) {
    const sorted = [...result.slots].sort((a, b) => a.startMs - b.startMs);
    for (const slot of sorted) {
      const iso = toIsoDate(dateOf(slot.startMs, timezone));
      const list = days.get(iso) ?? [];
      let entry = list.find((item) => item.name === result.name);
      if (!entry) {
        entry = { name: result.name, times: [] };
        list.push(entry);
        days.set(iso, list);
      }
      entry.times.push(formatTime(slot.startMs, timezone));
    }
  }
  return days;
}
