// Auswahl eines freien Termins (docs/terminbuchung.md §11).
//
// Monatsweise, und pro Tag die freien Startzeiten als Chips. Bewusst KEIN
// Kalenderraster wie im Admin-UI: Im iframe steht oft nur eine schmale Spalte
// zur Verfügung, und die Kund:in will nicht wissen, wie voll der Kalender ist —
// sie will die nächste passende Zeit sehen. Eine Liste beantwortet das
// unmittelbar, ein Raster verlangt erst einen Tagesklick.
//
// Die Liste zeigt ausschließlich freie Zeiten. Dass ein Tag leer ist, weil er
// gebucht oder gesperrt ist, erfährt niemand — der Server liefert nur das
// Ergebnis, nie den Kalender (§4.2).

import { ReactElement, useEffect, useMemo, useState } from "react";
import * as stylex from "@stylexjs/stylex";

import { Slot, fetchAvailability } from "./api";
import { s } from "./styles";
import {
  CalendarDate,
  addMonths,
  dateOf,
  daysInMonth,
  formatCalendarDateLong,
  formatTime,
  formatMonth,
  toIsoDate,
  todayIn,
} from "./time";

type Props = {
  typeSlug: string;
  timezone: string;
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
  onTimezoneKnown?: (timezone: string) => void;
};

export default function SlotPicker(props: Props): ReactElement {
  const { typeSlug, timezone, selected, onSelect, onTimezoneKnown } = props;

  const [month, setMonth] = useState<CalendarDate>(() => {
    const today = todayIn(timezone);
    return { ...today, day: 1 };
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [horizonDays, setHorizonDays] = useState(90);

  const today = todayIn(timezone);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    // Der laufende Monat wird ab heute abgefragt statt ab dem Ersten: Slots in
    // der Vergangenheit filtert der Server zwar ohnehin weg, aber so bleibt die
    // Anfrage klein.
    const isCurrentMonth = month.year === today.year && month.month === today.month;
    const from = isCurrentMonth ? today : { ...month, day: 1 };
    const to = { ...month, day: daysInMonth(month.year, month.month) };

    void fetchAvailability(typeSlug, toIsoDate(from), toIsoDate(to))
      .then((result) => {
        if (cancelled) return;
        setSlots(result.slots);
        setHorizonDays(result.horizonDays);
        if (result.timezone && onTimezoneKnown) onTimezoneKnown(result.timezone);
      })
      .catch((failure: Error) => {
        if (!cancelled) setError(failure.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `today` ist aus Date.now() abgeleitet und würde die Abhängigkeitsliste
    // bei jedem Rendern ändern — der Monat und die Art genügen als Auslöser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeSlug, month.year, month.month]);

  // Nach Tagen gruppieren, damit pro Tag eine Zeile mit Uhrzeiten entsteht.
  const days = useMemo(() => {
    const grouped = new Map<string, { date: CalendarDate; slots: Slot[] }>();
    for (const slot of slots) {
      const date = dateOf(slot.startMs, timezone);
      const key = toIsoDate(date);
      const entry = grouped.get(key);
      if (entry) entry.slots.push(slot);
      else grouped.set(key, { date, slots: [slot] });
    }
    return [...grouped.values()];
  }, [slots, timezone]);

  // Der Zurück-Knopf endet beim laufenden Monat, der Vor-Knopf am Horizont —
  // sonst blättert man ins Leere und hält das Formular für kaputt.
  const atFirstMonth =
    month.year === today.year && month.month === today.month;
  const horizonEnd = dateOf(Date.now() + horizonDays * 86400000, timezone);
  const atLastMonth =
    month.year > horizonEnd.year ||
    (month.year === horizonEnd.year && month.month >= horizonEnd.month);

  return (
    <div {...stylex.props(s.stack)} data-testid="slot-auswahl">
      <div {...stylex.props(s.monthBar)}>
        <button
          type="button"
          aria-label="Vorheriger Monat"
          disabled={atFirstMonth}
          onClick={() => setMonth(addMonths(month, -1))}
          {...stylex.props(s.iconButton)}
        >
          ‹
        </button>
        <span {...stylex.props(s.monthLabel)}>{formatMonth(month)}</span>
        <button
          type="button"
          aria-label="Nächster Monat"
          disabled={atLastMonth}
          onClick={() => setMonth(addMonths(month, 1))}
          {...stylex.props(s.iconButton)}
        >
          ›
        </button>
      </div>

      {loading && <p {...stylex.props(s.muted)}>Freie Zeiten werden geladen …</p>}
      {error && <p {...stylex.props(s.error)}>{error}</p>}

      {!loading && !error && days.length === 0 && (
        <p {...stylex.props(s.muted)}>
          In diesem Monat ist nichts mehr frei.
          {!atLastMonth && " Schau im nächsten Monat nach."}
        </p>
      )}

      {days.map((day) => (
        <div key={toIsoDate(day.date)} {...stylex.props(s.dayBlock)}>
          <span {...stylex.props(s.dayLabel)}>{formatCalendarDateLong(day.date)}</span>
          <div {...stylex.props(s.slotRow)}>
            {day.slots.map((slot) => (
              <button
                key={slot.start}
                type="button"
                data-testid="slot"
                aria-pressed={selected?.start === slot.start}
                onClick={() => onSelect(slot)}
                {...stylex.props(s.slot, selected?.start === slot.start && s.slotSelected)}
              >
                {formatTime(slot.startMs, timezone)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
