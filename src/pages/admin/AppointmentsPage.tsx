// Terminkalender der Fotograf:in (docs/terminbuchung.md §11.1).
//
// Aufbau: offene Anfragen ganz oben, darunter Monatsübersicht und Tagesdetail.
//
// Die Anfragen stehen bewusst AUSSERHALB des Kalenders und unabhängig vom
// angezeigten Monat: Sie sind die einzige zeitkritische Aktion — eine Anfrage
// hält einen Slot und verfällt nach Ablauf ihrer Frist. Sie im Kalender zu
// verstecken hieße, dass sie verfällt, nur weil gerade der falsche Monat
// offen war.

import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import Page from "../../components/layout/Page";
import { useSettings } from "../../context/SettingsContext";
import AppointmentsTabs from "../../features/Appointments/components/AppointmentsTabs";
import DayDetail from "../../features/Appointments/components/DayDetail";
import MonthGrid, { DaySummary } from "../../features/Appointments/components/MonthGrid";
import {
  Appointment,
  AppointmentType,
  AvailabilityException,
  BookingApiError,
  cancelAsOwner,
  createException,
  createManualBooking,
  decideRequest,
  deleteException,
  fetchAppointments,
  fetchExceptions,
  fetchPending,
  fetchTypes,
  linkAccount,
} from "../../features/Appointments/api";
import {
  CalendarDate,
  addDays,
  addMonths,
  dateOf,
  daysInMonth,
  formatDateTime,
  formatMonth,
  todayIn,
  toIsoDate,
  zoneHint,
  zonedToMs,
} from "../../features/Booking/time";

const s = stylex.create({
  column: { display: "flex", flexDirection: "column", gap: 16 },
  layout: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@media (min-width: 1000px)": "minmax(0, 420px) minmax(0, 1fr)",
    },
    gap: 16,
    alignItems: "start",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  monthBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  legend: { display: "flex", gap: 12, flexWrap: "wrap", paddingTop: 4 },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: "var(--radius-full)", backgroundColor: "var(--color-text-accent)" },
  dotHollow: {
    width: 8, height: 8, borderRadius: "var(--radius-full)",
    border: "2px solid var(--color-text-accent)",
  },
  pendingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: 12,
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
  },
  pendingMeta: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  center: { display: "flex", justifyContent: "center", padding: 48 },
});

export default function AppointmentsPage(): ReactElement {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const timezone = settings.timezone || "Europe/Berlin";

  const [today] = useState<CalendarDate>(() => todayIn(timezone));
  const [month, setMonth] = useState<CalendarDate>(() => ({ ...today, day: 1 }));
  const [selected, setSelected] = useState<CalendarDate>(today);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [pending, setPending] = useState<Appointment[]>([]);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  // Der geladene Bereich ist der ganze angezeigte Monat plus je ein Tag Puffer:
  // Ein Termin, der am Monatsletzten über Mitternacht läuft, gehört noch dazu.
  const range = useMemo(() => {
    const first = { ...month, day: 1 };
    const last = { ...month, day: daysInMonth(month.year, month.month) };
    return {
      fromMs: zonedToMs(addDays(first, -1), 0, 0, timezone),
      toMs: zonedToMs(addDays(last, 2), 0, 0, timezone),
    };
  }, [month, timezone]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedAppointments, loadedExceptions, loadedPending, loadedTypes] =
        await Promise.all([
          fetchAppointments(range.fromMs, range.toMs),
          fetchExceptions(range.fromMs, range.toMs),
          fetchPending(),
          fetchTypes(),
        ]);
      setAppointments(loadedAppointments);
      setExceptions(loadedExceptions);
      setPending(loadedPending);
      setTypes(loadedTypes);
      setUnavailable(false);
    } catch {
      // Wahrscheinlichster Grund: Die Migration ist auf dieser Instanz noch
      // nicht gelaufen (gleiche Behandlung wie bei den Hilfe-Artikeln).
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [range.fromMs, range.toMs]);

  useEffect(() => {
    void load();
  }, [load]);

  // Ein Tag gilt als gesperrt, wenn ihn eine Sperre vollständig abdeckt —
  // eine Sperre von 10 bis 11 Uhr macht den Tag nicht zu.
  const summaries = useMemo(() => {
    const map = new Map<string, DaySummary>();
    const ensure = (iso: string): DaySummary => {
      let entry = map.get(iso);
      if (!entry) {
        entry = { confirmed: 0, pending: 0, blocked: false, imported: false, opened: false };
        map.set(iso, entry);
      }
      return entry;
    };

    for (const appointment of appointments) {
      if (appointment.status === "confirmed" || appointment.status === "pending") {
        const entry = ensure(toIsoDate(dateOf(appointment.startMs, timezone)));
        if (appointment.status === "confirmed") entry.confirmed++;
        else entry.pending++;
      }
    }

    for (const exception of exceptions) {
      let cursor = dateOf(exception.startMs, timezone);
      const lastDate = dateOf(Math.max(exception.startMs, exception.endMs - 1), timezone);
      for (let guard = 0; guard < 400; guard++) {
        const dayStart = zonedToMs(cursor, 0, 0, timezone);
        const dayEnd = zonedToMs(addDays(cursor, 1), 0, 0, timezone);
        const entry = ensure(toIsoDate(cursor));
        if (exception.kind === "block") {
          if (exception.startMs <= dayStart && exception.endMs >= dayEnd) entry.blocked = true;
          if (exception.source === "imported") entry.imported = true;
        } else {
          entry.opened = true;
        }
        if (toIsoDate(cursor) === toIsoDate(lastDate)) break;
        cursor = addDays(cursor, 1);
      }
    }

    return map;
  }, [appointments, exceptions, timezone]);

  const dayAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => toIsoDate(dateOf(appointment.startMs, timezone)) === toIsoDate(selected),
      ),
    [appointments, selected, timezone],
  );

  const dayExceptions = useMemo(() => {
    const dayStart = zonedToMs(selected, 0, 0, timezone);
    const dayEnd = zonedToMs(addDays(selected, 1), 0, 0, timezone);
    return exceptions.filter(
      (exception) => exception.endMs > dayStart && exception.startMs < dayEnd,
    );
  }, [exceptions, selected, timezone]);

  // Jede Aktion lädt neu statt den Zustand von Hand nachzuführen: Ein
  // bestätigter Termin ändert Status, Verfügbarkeit und Anfragenliste
  // gleichzeitig, und ein halb nachgeführter Zustand ist schlimmer als ein
  // kurzer Ladevorgang.
  const after = async (action: () => Promise<void>, success: string) => {
    try {
      await action();
      toast.success(success);
      await load();
    } catch (error) {
      const failure = error as BookingApiError;
      toast.error(failure.message || "Die Aktion ist fehlgeschlagen.");
      throw error;
    }
  };

  const handleManual = async (input: {
    type: string; startMs: number; durationMin: number;
    name: string; email: string; phone: string; force: boolean;
  }) => {
    try {
      await createManualBooking(input);
      toast.success("Termin eingetragen");
      await load();
    } catch (error) {
      const failure = error as BookingApiError;
      // Die Überschneidung ist eine Warnung, kein Verbot (§5) — die
      // Fotograf:in darf sie bewusst übergehen.
      if (failure.code === "overlap") {
        const when = failure.conflictStart
          ? formatDateTime(new Date(failure.conflictStart).getTime(), timezone)
          : "einem bestehenden Termin";
        if (window.confirm(`Überschneidet sich mit ${when}. Trotzdem eintragen?`)) {
          await createManualBooking({ ...input, force: true });
          toast.success("Termin eingetragen");
          await load();
          return;
        }
        return;
      }
      toast.error(failure.message || "Der Termin konnte nicht eingetragen werden.");
    }
  };

  const goToPending = (appointment: Appointment) => {
    const date = dateOf(appointment.startMs, timezone);
    setMonth({ ...date, day: 1 });
    setSelected(date);
  };

  if (loading && appointments.length === 0 && !unavailable) {
    return (
      <Page title="Termine">
        <div {...stylex.props(s.center)}>
          <Spinner />
        </div>
      </Page>
    );
  }

  const hint = zoneHint(timezone);

  return (
    <Page
      title="Termine"
      subtitle={
        hint
          ? `Alle Zeiten in ${hint.replace("Zeit in ", "")}er Zeit.`
          : "Dein Kalender mit allen gebuchten Terminen."
      }
    >
      <div {...stylex.props(s.column)}>
        <AppointmentsTabs />

        {unavailable && (
          <Banner status="warning" title="Die Terminbuchung ist auf dieser Instanz noch nicht eingerichtet.">
            <Text type="body">
              Die dafür nötige Datenbank-Änderung wurde noch nicht eingespielt.
              Starte deine Instanz einmal neu — die Migration läuft dabei
              automatisch mit.
            </Text>
          </Banner>
        )}

        {!settings.bookingEnabled && !unavailable && (
          <Banner
            status="info"
            title="Die Terminbuchung ist noch nicht freigeschaltet."
            endContent={
              <Button
                variant="secondary"
                size="sm"
                label="Einstellungen öffnen"
                onClick={() => navigate("/appointments/availability")}
              />
            }
          >
            <Text type="body">
              Kund:innen können noch nichts buchen. Du kannst hier trotzdem
              schon alles einrichten und Termine von Hand eintragen.
            </Text>
          </Banner>
        )}

        {pending.length > 0 && (
          <div data-testid="offene-anfragen" {...stylex.props(s.card)}>
            <Heading level={6}>
              Offene Anfragen <Badge variant="warning" label={String(pending.length)} />
            </Heading>
            <Text type="supporting" color="secondary">
              Diese Anfragen halten ihren Termin frei und verfallen, wenn du
              nicht reagierst.
            </Text>
            {pending.map((appointment) => (
              <div key={appointment.id} {...stylex.props(s.pendingRow)}>
                <div {...stylex.props(s.pendingMeta)}>
                  <Text type="body" weight="semibold">
                    {formatDateTime(appointment.startMs, timezone)} · {appointment.typeName}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {appointment.customerName}
                    {appointment.customerEmail ? ` · ${appointment.customerEmail}` : ""}
                  </Text>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    size="sm"
                    label="Zusagen"
                    onClick={() =>
                      void after(() => decideRequest(appointment.id, true), "Termin bestätigt")
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Im Kalender"
                    onClick={() => goToPending(appointment)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div {...stylex.props(s.layout)}>
          <div {...stylex.props(s.card)}>
            <div {...stylex.props(s.monthBar)}>
              <IconButton
                label="Vorheriger Monat"
                icon={<ChevronLeft />}
                variant="ghost"
                onClick={() => setMonth(addMonths(month, -1))}
              />
              <Text type="body" weight="semibold">
                {formatMonth(month)}
              </Text>
              <IconButton
                label="Nächster Monat"
                icon={<ChevronRight />}
                variant="ghost"
                onClick={() => setMonth(addMonths(month, 1))}
              />
            </div>

            <MonthGrid
              month={month}
              selected={selected}
              today={today}
              summaries={summaries}
              onSelect={setSelected}
            />

            <div {...stylex.props(s.legend)}>
              <span {...stylex.props(s.legendItem)}>
                <span {...stylex.props(s.dot)} />
                <Text type="supporting" color="secondary">Bestätigt</Text>
              </span>
              <span {...stylex.props(s.legendItem)}>
                <span {...stylex.props(s.dotHollow)} />
                <Text type="supporting" color="secondary">Anfrage</Text>
              </span>
              <span {...stylex.props(s.legendItem)}>
                <Text type="supporting" color="secondary">Schraffur = ganztägig gesperrt</Text>
              </span>
            </div>
          </div>

          <DayDetail
            date={selected}
            timezone={timezone}
            appointments={dayAppointments}
            exceptions={dayExceptions}
            types={types}
            onDecide={(id, approve, note) =>
              after(
                () => decideRequest(id, approve, note),
                approve ? "Termin bestätigt" : "Anfrage abgelehnt",
              )
            }
            onCancel={(id, note) => after(() => cancelAsOwner(id, note), "Termin abgesagt")}
            onBlock={(startMs, endMs, note) =>
              after(
                () => createException({ kind: "block", startMs, endMs, note }),
                "Zeit gesperrt",
              )
            }
            onDeleteException={(id) => after(() => deleteException(id), "Sperre aufgehoben")}
            onManual={handleManual}
            onLink={(appointmentId, userId) =>
              after(() => linkAccount(appointmentId, userId), "Mit Konto verknüpft")
            }
          />
        </div>
      </div>
    </Page>
  );
}
