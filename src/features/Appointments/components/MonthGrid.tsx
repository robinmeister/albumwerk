// Monatsübersicht des Termin-Kalenders (docs/terminbuchung.md §11.1).
//
// Bewusst ein reines CSS-Grid und KEIN Zeitraster mit Stundenspalten:
//
//   - Ein Zeitraster mit Ziehen, Überlappungsdarstellung und Touch-Bedienung
//     ist wochenlange Arbeit oder eine schwere Fremdbibliothek — und die
//     widerspricht der Bundle-Disziplin aus §9.1.
//   - Vor allem aber hat die Fotograf:in längst einen guten Kalender: ihren
//     eigenen, am Handy. Dafür gibt es den Export (§7.1). Albumwerk muss ihn
//     füttern, nicht nachbauen.
//
// Astryx' `Calendar` kommt hier nicht in Frage: Es ist ein reiner
// Datumswähler ohne Möglichkeit, pro Tag etwas darzustellen — und genau das
// ist der Zweck dieser Ansicht.

import { ReactElement } from "react";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";

import {
  CalendarDate,
  addDays,
  isoWeekday,
  sameDate,
  toIsoDate,
} from "../../Booking/time";

export interface DaySummary {
  confirmed: number;
  pending: number;
  blocked: boolean;
  imported: boolean;
  opened: boolean;
  /** Anzahl der Termin-Arten, die Kund:innen an diesem Tag buchen können. */
  bookable: number;
}

type Props = {
  month: CalendarDate;
  selected: CalendarDate;
  today: CalendarDate;
  summaries: Map<string, DaySummary>;
  onSelect: (date: CalendarDate) => void;
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const s = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 4,
  },
  weekday: {
    padding: "4px 0",
    textAlign: "center",
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    minHeight: { default: 56, "@media (min-width: 720px)": 72 },
    padding: "6px 2px",
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
    backgroundColor: {
      default: "var(--color-background-card)",
      ":hover": "var(--color-overlay-hover)",
    },
    color: "var(--color-text-primary)",
    cursor: "pointer",
    font: "inherit",
  },
  cellOutside: {
    opacity: 0.45,
  },
  cellToday: {
    borderColor: "var(--color-text-accent)",
  },
  cellSelected: {
    backgroundColor: {
      default: "var(--color-background-muted)",
      ":hover": "var(--color-background-muted)",
    },
    // zweifarbige Kennzeichnung: Rahmen allein ist neben "heute" nicht
    // unterscheidbar genug
    outline: "2px solid var(--color-text-accent)",
    outlineOffset: -1,
  },
  cellBlocked: {
    // diagonale Schraffur — funktioniert auch dort, wo Farbe allein nicht
    // ankommt (Farbsehschwäche, Ausdruck)
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent, transparent 5px, var(--color-border) 5px, var(--color-border) 6px)",
  },
  markers: {
    display: "flex",
    gap: 3,
    alignItems: "center",
    minHeight: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "var(--radius-full)",
  },
  dotConfirmed: { backgroundColor: "var(--color-text-accent)" },
  dotPending: {
    backgroundColor: "transparent",
    border: "2px solid var(--color-text-accent)",
    width: 8,
    height: 8,
  },
  count: { lineHeight: 1 },
});

// Höchstens vier Punkte, danach eine Zahl — sonst platzt die Zelle bei einem
// vollen Tag, und die genaue Anzahl steht ohnehin im Tagesdetail.
const MAX_DOTS = 4;

function markers(summary: DaySummary | undefined): ReactElement | null {
  if (!summary) return null;
  const total = summary.confirmed + summary.pending;
  if (total === 0) return null;

  if (total > MAX_DOTS) {
    return (
      <div {...stylex.props(s.markers)}>
        <Text type="supporting" weight="semibold">
          {total}
          {summary.pending > 0 ? ` (${summary.pending}?)` : ""}
        </Text>
      </div>
    );
  }

  const dots: ReactElement[] = [];
  for (let i = 0; i < summary.confirmed; i++) {
    dots.push(<span key={`c${i}`} {...stylex.props(s.dot, s.dotConfirmed)} />);
  }
  for (let i = 0; i < summary.pending; i++) {
    dots.push(<span key={`p${i}`} {...stylex.props(s.dot, s.dotPending)} />);
  }
  return <div {...stylex.props(s.markers)}>{dots}</div>;
}

// Vorlesbare Beschreibung der Zelle. Punkte allein sind für Screenreader
// nichts wert.
function describe(date: CalendarDate, summary: DaySummary | undefined): string {
  const parts = [`${date.day}.${date.month}.${date.year}`];
  if (summary?.confirmed) parts.push(`${summary.confirmed} Termine`);
  if (summary?.pending) parts.push(`${summary.pending} offene Anfragen`);
  if (summary?.blocked) parts.push("gesperrt");
  if (summary?.opened) parts.push("zusätzlich geöffnet");
  if (summary?.bookable) parts.push(`${summary.bookable} Termin-Arten buchbar`);
  if (parts.length === 1) parts.push("nichts eingetragen");
  return parts.join(", ");
}

export default function MonthGrid(props: Props): ReactElement {
  const { month, selected, today, summaries, onSelect } = props;

  // Die Woche beginnt am Montag (ISO) — alles andere ist im deutschsprachigen
  // Raum eine Stolperfalle.
  const first: CalendarDate = { year: month.year, month: month.month, day: 1 };
  const lead = isoWeekday(first) - 1;
  // immer sechs Wochen, damit die Höhe beim Monatswechsel nicht springt
  const cells: CalendarDate[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(first, i - lead));
  }

  return (
    <div>
      <div {...stylex.props(s.grid)} aria-hidden>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} {...stylex.props(s.weekday)}>
            <Text type="supporting" color="secondary">
              {label}
            </Text>
          </div>
        ))}
      </div>
      <div {...stylex.props(s.grid)} role="grid" data-testid="monatsraster">
        {cells.map((date) => {
          const iso = toIsoDate(date);
          const summary = summaries.get(iso);
          const outside = date.month !== month.month || date.year !== month.year;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-label={describe(date, summary)}
              aria-selected={sameDate(date, selected)}
              data-date={iso}
              onClick={() => onSelect(date)}
              {...stylex.props(
                s.cell,
                outside && s.cellOutside,
                summary?.blocked && s.cellBlocked,
                sameDate(date, today) && s.cellToday,
                sameDate(date, selected) && s.cellSelected,
              )}
            >
              <Text
                type="supporting"
                weight={sameDate(date, today) ? "semibold" : "normal"}
              >
                {date.day}
              </Text>
              {markers(summary)}
              {/* kurz, weil die Zelle am Handy kaum 45 px breit ist */}
              {summary?.bookable ? (
                <Text type="supporting" color="secondary">
                  {summary.bookable} frei
                </Text>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
