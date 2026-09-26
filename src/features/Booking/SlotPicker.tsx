// Auswahl eines freien Termins (docs/terminbuchung.md §11).
//
// Monatsraster links, die freien Zeiten des gewählten Tags rechts — Form nach
// dem Stitch-Entwurf "Termin buchen". Damit kein Tagesklick ins Leere geht,
// sind nur Tage mit freier Zeit wählbar, und beim Laden steht der erste davon
// schon ausgewählt: die nächste passende Zeit ist sofort sichtbar.
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
  isoWeekday,
  toIsoDate,
  todayIn,
} from "./time";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type Props = {
  typeSlug: string;
  timezone: string;
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
  onTimezoneKnown?: (timezone: string) => void;
  /** Nummer der Datums-Spalte in der Schrittfolge; ohne sie keine Nummern. */
  firstStep?: number;
};

export default function SlotPicker(props: Props): ReactElement {
  const { typeSlug, timezone, selected, onSelect, onTimezoneKnown, firstStep } = props;

  const [month, setMonth] = useState<CalendarDate>(() => {
    const today = todayIn(timezone);
    return { ...today, day: 1 };
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [horizonDays, setHorizonDays] = useState(90);
  const [dayKey, setDayKey] = useState("");

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
    return grouped;
  }, [slots, timezone]);

  // Gewählter Tag: der des gewählten Termins, sonst der erste freie im Monat.
  const selectedKey = selected ? toIsoDate(dateOf(selected.startMs, timezone)) : "";
  const activeKey = days.has(dayKey)
    ? dayKey
    : days.has(selectedKey)
      ? selectedKey
      : (days.keys().next().value ?? "");
  const activeDay = days.get(activeKey);

  const leading = isoWeekday({ ...month, day: 1 }) - 1;
  const cells = Array.from({ length: daysInMonth(month.year, month.month) }, (_, index) => ({
    ...month,
    day: index + 1,
  }));
  const label = (offset: number, text: string) =>
    firstStep ? `${firstStep + offset}. ${text}` : text;

  // Der Zurück-Knopf endet beim laufenden Monat, der Vor-Knopf am Horizont —
  // sonst blättert man ins Leere und hält das Formular für kaputt.
  const atFirstMonth =
    month.year === today.year && month.month === today.month;
  const horizonEnd = dateOf(Date.now() + horizonDays * 86400000, timezone);
  const atLastMonth =
    month.year > horizonEnd.year ||
    (month.year === horizonEnd.year && month.month >= horizonEnd.month);

  return (
    <div {...stylex.props(s.spanTwo)} data-testid="slot-auswahl">
      <section {...stylex.props(s.stackTight)}>
        <h3 {...stylex.props(s.kicker)}>{label(0, "Datum wählen")}</h3>
        <div {...stylex.props(s.panel)}>
          <div {...stylex.props(s.monthBar)}>
            <span {...stylex.props(s.monthLabel)}>{formatMonth(month)}</span>
            <span>
              <button
                type="button"
                aria-label="Vorheriger Monat"
                disabled={atFirstMonth}
                onClick={() => setMonth(addMonths(month, -1))}
                {...stylex.props(s.iconButton)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Nächster Monat"
                disabled={atLastMonth}
                onClick={() => setMonth(addMonths(month, 1))}
                {...stylex.props(s.iconButton)}
              >
                ›
              </button>
            </span>
          </div>

          <div {...stylex.props(s.weekGrid)} aria-busy={loading}>
            {WEEKDAYS.map((name) => (
              <span key={name} {...stylex.props(s.weekday)}>{name}</span>
            ))}
            {cells.map((date, index) => {
              const key = toIsoDate(date);
              return (
                <button
                  key={key}
                  type="button"
                  data-testid="tag"
                  disabled={!days.has(key)}
                  aria-pressed={key === activeKey}
                  aria-label={formatCalendarDateLong(date)}
                  onClick={() => setDayKey(key)}
                  style={index === 0 ? { gridColumnStart: leading + 1 } : undefined}
                  {...stylex.props(s.day, key === activeKey && s.daySelected)}
                >
                  {date.day}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section {...stylex.props(s.stackTight)}>
        <h3 {...stylex.props(s.kicker)}>{label(1, "Uhrzeit wählen")}</h3>
        <div {...stylex.props(s.panel)}>
          {loading && <p {...stylex.props(s.muted)}>Freie Zeiten werden geladen …</p>}
          {error && <p {...stylex.props(s.error)}>{error}</p>}

          {!loading && !error && !activeDay && (
            <p {...stylex.props(s.muted)}>
              In diesem Monat ist nichts mehr frei.
              {!atLastMonth && " Schau im nächsten Monat nach."}
            </p>
          )}

          {!loading && activeDay && (
            <>
              <span {...stylex.props(s.dayLabel)}>{formatCalendarDateLong(activeDay.date)}</span>
              <div {...stylex.props(s.slotRow)}>
                {activeDay.slots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    data-testid="slot"
                    aria-pressed={selected?.start === slot.start}
                    onClick={() => onSelect(slot)}
                    {...stylex.props(s.slot, selected?.start === slot.start && s.slotSelected)}
                  >
                    {formatTime(slot.startMs, timezone)} Uhr
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
