// Tagesdetail des Termin-Kalenders (docs/terminbuchung.md §11.1).
//
// Hier passiert die eigentliche Arbeit: bestätigen, ablehnen, stornieren,
// sperren, manuell eintragen, mit einem Konto verknüpfen.
//
// Eine Vorgabe aus dem Entwurf ist hier tragend: **Sperren muss in zwei Klicks
// gehen.** Solange es keinen Kalender-Import gibt (Etappe 5), ist die manuelle
// Sperre die einzige Möglichkeit, private Termine freizuhalten — und was zäh
// ist, wird nicht benutzt. Deshalb der eigene Knopf „Ganzer Tag zu“ neben dem
// Formular für einzelne Zeitfenster.

import { ReactElement, useEffect, useState } from "react";
import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Ban, CalendarPlus, Check, Link2, Trash2, X } from "lucide-react";
import * as stylex from "@stylexjs/stylex";

import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AvailabilityException,
  findAccountByEmail,
} from "../api";
import {
  CalendarDate,
  addDays,
  formatCalendarDateLong,
  formatTime,
  timeToMinutes,
  zonedToMs,
} from "../../Booking/time";

type Props = {
  date: CalendarDate;
  timezone: string;
  appointments: Appointment[];
  exceptions: AvailabilityException[];
  types: AppointmentType[];
  onDecide: (id: string, approve: boolean, note: string) => Promise<void>;
  onCancel: (id: string, note: string) => Promise<void>;
  onBlock: (startMs: number, endMs: number, note: string) => Promise<void>;
  onDeleteException: (id: string) => Promise<void>;
  onManual: (input: {
    type: string;
    startMs: number;
    durationMin: number;
    name: string;
    email: string;
    phone: string;
    force: boolean;
  }) => Promise<void>;
  onLink: (appointmentId: string, userId: string) => Promise<void>;
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Anfrage offen",
  confirmed: "Bestätigt",
  cancelled: "Abgesagt",
  declined: "Abgelehnt",
  expired: "Verfallen",
};

const STATUS_COLOR: Record<AppointmentStatus, BadgeVariant> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "neutral",
  declined: "neutral",
  expired: "neutral",
};

const s = stylex.create({
  column: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  entry: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 12,
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
  },
  entryPast: { opacity: 0.6 },
  entryHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  meta: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap" },
  formGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@media (min-width: 720px)": "repeat(2, minmax(0, 1fr))",
    },
    gap: 12,
  },
  empty: { padding: "16px 0", textAlign: "center" },
});

function statusBadge(status: AppointmentStatus): ReactElement {
  return <Badge variant={STATUS_COLOR[status]} label={STATUS_LABEL[status]} />;
}

// --- Einzelner Termin ------------------------------------------------------

function AppointmentEntry(props: {
  appointment: Appointment;
  timezone: string;
  onDecide: Props["onDecide"];
  onCancel: Props["onCancel"];
  onLink: Props["onLink"];
}): ReactElement {
  const { appointment, timezone, onDecide, onCancel, onLink } = props;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNote, setShowNote] = useState<"cancel" | "decline" | null>(null);
  const [suggestion, setSuggestion] = useState<{ id: string; name: string } | null>(null);

  const open = appointment.status === "pending" || appointment.status === "confirmed";

  // Kontovorschlag: nur ein VORSCHLAG. Die Adresse im Buchungsformular ist
  // unverifiziert — automatisch zu verknüpfen hieße, eine fremde Buchung an ein
  // echtes Konto zu hängen (docs/terminbuchung.md §1).
  useEffect(() => {
    let cancelled = false;
    if (appointment.user || !appointment.customerEmail || !open) {
      setSuggestion(null);
      return () => { cancelled = true; };
    }
    void findAccountByEmail(appointment.customerEmail).then((account) => {
      if (!cancelled && account) setSuggestion({ id: account.id, name: account.name });
    });
    return () => { cancelled = true; };
  }, [appointment.user, appointment.customerEmail, open]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      setShowNote(null);
      setNote("");
    }
  };

  return (
    <div
      data-testid="termin-eintrag"
      {...stylex.props(s.entry, !open && s.entryPast)}
    >
      <div {...stylex.props(s.entryHead)}>
        <div {...stylex.props(s.meta)}>
          <Text type="body" weight="semibold">
            {formatTime(appointment.startMs, timezone)}–{formatTime(appointment.endMs, timezone)}
            {" · "}
            {appointment.typeName || "Termin"}
          </Text>
          <Text type="supporting" color="secondary">
            {appointment.customerName || "Ohne Namen"}
            {appointment.customerEmail ? ` · ${appointment.customerEmail}` : ""}
            {appointment.customerPhone ? ` · ${appointment.customerPhone}` : ""}
          </Text>
          {appointment.message && (
            <Text type="supporting" color="secondary">
              „{appointment.message}“
            </Text>
          )}
          {appointment.cancelReason && (
            <Text type="supporting" color="secondary">
              Grund: {appointment.cancelReason}
            </Text>
          )}
        </div>
        {statusBadge(appointment.status)}
      </div>

      {suggestion && (
        <div {...stylex.props(s.actions)}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Link2 />}
            label={`Mit Konto „${suggestion.name}“ verknüpfen`}
            isDisabled={busy}
            onClick={() => void run(() => onLink(appointment.id, suggestion.id))}
          />
        </div>
      )}

      {showNote && (
        <TextArea
          width="100%"
          rows={2}
          label={showNote === "decline" ? "Begründung (optional)" : "Nachricht an die Kundin (optional)"}
          description="Steht in der Mail, die jetzt rausgeht."
          value={note}
          onChange={setNote}
        />
      )}

      {open && (
        <div {...stylex.props(s.actions)}>
          {appointment.status === "pending" && (
            <>
              <Button
                size="sm"
                icon={<Check />}
                label="Zusagen"
                isDisabled={busy}
                onClick={() => void run(() => onDecide(appointment.id, true, ""))}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<X />}
                label={showNote === "decline" ? "Ablehnen senden" : "Ablehnen"}
                isDisabled={busy}
                onClick={() =>
                  showNote === "decline"
                    ? void run(() => onDecide(appointment.id, false, note))
                    : setShowNote("decline")
                }
              />
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            icon={<Ban />}
            label={showNote === "cancel" ? "Absage senden" : "Absagen"}
            isDisabled={busy}
            onClick={() =>
              showNote === "cancel"
                ? void run(() => onCancel(appointment.id, note))
                : setShowNote("cancel")
            }
          />
        </div>
      )}
    </div>
  );
}

// --- Tagesdetail -----------------------------------------------------------

export default function DayDetail(props: Props): ReactElement {
  const {
    date, timezone, appointments, exceptions, types,
    onDecide, onCancel, onBlock, onDeleteException, onManual, onLink,
  } = props;

  const [form, setForm] = useState<"block" | "manual" | null>(null);
  const [busy, setBusy] = useState(false);

  const [blockFrom, setBlockFrom] = useState("09:00");
  const [blockTo, setBlockTo] = useState("12:00");
  const [blockNote, setBlockNote] = useState("");

  const activeTypes = types.filter((type) => type.active);
  const [manualType, setManualType] = useState(activeTypes[0]?.id ?? "");
  const [manualTime, setManualTime] = useState("10:00");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  // Beim Wechsel des Tages die offenen Formulare schließen — sonst trägt man
  // versehentlich am falschen Tag ein.
  useEffect(() => {
    setForm(null);
  }, [date.year, date.month, date.day]);

  const submitBlock = async (wholeDay: boolean) => {
    const startMinute = wholeDay ? 0 : timeToMinutes(blockFrom);
    const endMinute = wholeDay ? 0 : timeToMinutes(blockTo);
    if (!wholeDay && (startMinute === null || endMinute === null || endMinute <= startMinute)) {
      return;
    }
    const startMs = wholeDay
      ? zonedToMs(date, 0, 0, timezone)
      : zonedToMs(date, Math.floor(startMinute! / 60), startMinute! % 60, timezone);
    const endMs = wholeDay
      ? zonedToMs(addDays(date, 1), 0, 0, timezone)
      : zonedToMs(date, Math.floor(endMinute! / 60), endMinute! % 60, timezone);

    setBusy(true);
    try {
      await onBlock(startMs, endMs, wholeDay ? "Ganzer Tag" : blockNote);
      setForm(null);
      setBlockNote("");
    } finally {
      setBusy(false);
    }
  };

  const submitManual = async (force: boolean) => {
    const minutes = timeToMinutes(manualTime);
    const type = activeTypes.find((t) => t.id === manualType);
    if (minutes === null || !type) return;
    setBusy(true);
    try {
      await onManual({
        type: type.id,
        startMs: zonedToMs(date, Math.floor(minutes / 60), minutes % 60, timezone),
        durationMin: type.durationMin,
        name: manualName,
        email: manualEmail,
        phone: manualPhone,
        force,
      });
      setForm(null);
      setManualName("");
      setManualEmail("");
      setManualPhone("");
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...appointments].sort((a, b) => a.startMs - b.startMs);

  return (
    <div data-testid="tagesdetail" {...stylex.props(s.card)}>
      <Heading level={6}>{formatCalendarDateLong(date)}</Heading>

      <div {...stylex.props(s.toolbar)}>
        {/* Der Zwei-Klick-Weg aus §11.1: Tag antippen, „Ganzer Tag zu“. */}
        <Button
          variant="secondary"
          size="sm"
          icon={<Ban />}
          label="Ganzer Tag zu"
          isDisabled={busy}
          onClick={() => void submitBlock(true)}
        />
        <Button
          variant="ghost"
          size="sm"
          label="Zeitfenster sperren"
          isDisabled={busy}
          onClick={() => setForm(form === "block" ? null : "block")}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<CalendarPlus />}
          label="Termin eintragen"
          isDisabled={busy || activeTypes.length === 0}
          onClick={() => setForm(form === "manual" ? null : "manual")}
        />
        {/* Ein Knopf, der ohne Erklärung ausgegraut ist, wirkt kaputt. */}
        {activeTypes.length === 0 && (
          <Text type="supporting" color="secondary">
            Zum Eintragen brauchst du zuerst eine Termin-Art.
          </Text>
        )}
      </div>

      {form === "block" && (
        <div {...stylex.props(s.column)} data-testid="sperrformular">
          <div {...stylex.props(s.formGrid)}>
            <TextInput width="100%" label="Von" value={blockFrom} onChange={setBlockFrom} />
            <TextInput width="100%" label="Bis" value={blockTo} onChange={setBlockTo} />
          </div>
          <TextInput
            width="100%"
            label="Notiz (optional)"
            description="Nur für dich sichtbar."
            value={blockNote}
            onChange={setBlockNote}
          />
          <div {...stylex.props(s.actions)}>
            <Button
              size="sm"
              label="Sperren"
              isDisabled={busy}
              onClick={() => void submitBlock(false)}
            />
          </div>
        </div>
      )}

      {form === "manual" && (
        <div {...stylex.props(s.column)} data-testid="manueller-termin">
          {/* Leitplanken gelten hier NICHT (§5): kein Mindestvorlauf, kein
              Tageslimit, auch außerhalb der Regeln. Wer selbst einträgt, weiß
              was sie tut. Nur die Doppelbuchung wird gemeldet. */}
          <Text type="supporting" color="secondary">
            Freie Zeiten spielen hier keine Rolle — du kannst auch außerhalb
            deiner Öffnungszeiten eintragen.
          </Text>
          <div {...stylex.props(s.formGrid)}>
            <Selector
              width="100%"
              label="Leistung"
              placeholder="Bitte wählen"
              options={activeTypes.map((type) => ({
                value: type.id,
                label: `${type.name} (${type.durationMin} Min)`,
              }))}
              value={manualType}
              onChange={(value) => value && setManualType(value)}
            />
            <TextInput width="100%" label="Uhrzeit" value={manualTime} onChange={setManualTime} />
            <TextInput width="100%" label="Name" value={manualName} onChange={setManualName} />
            <TextInput
              width="100%"
              label="E-Mail (optional)"
              description="Nur mit Adresse geht eine Bestätigung raus."
              value={manualEmail}
              onChange={setManualEmail}
            />
            <TextInput width="100%" label="Telefon (optional)" value={manualPhone} onChange={setManualPhone} />
          </div>
          <div {...stylex.props(s.actions)}>
            <Button
              size="sm"
              label="Eintragen"
              isDisabled={busy}
              onClick={() => void submitManual(false)}
            />
          </div>
        </div>
      )}

      {exceptions.length > 0 && (
        <div {...stylex.props(s.column)}>
          {exceptions.map((exception) => (
            <div key={exception.id} {...stylex.props(s.entry)}>
              <div {...stylex.props(s.entryHead)}>
                <div {...stylex.props(s.meta)}>
                  <Text type="body" weight="semibold">
                    {formatTime(exception.startMs, timezone)}–{formatTime(exception.endMs, timezone)}
                    {" · "}
                    {exception.kind === "block" ? "Gesperrt" : "Zusätzlich geöffnet"}
                  </Text>
                  {exception.note && (
                    <Text type="supporting" color="secondary">
                      {exception.note}
                    </Text>
                  )}
                  {exception.source === "imported" && (
                    <Text type="supporting" color="secondary">
                      Aus deinem verbundenen Kalender
                    </Text>
                  )}
                </div>
                {/* Importierte Sperren gehören dem Kalender-Abgleich; sie hier
                    zu löschen würde beim nächsten Abruf rückgängig gemacht. */}
                {exception.source !== "imported" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 />}
                    label="Aufheben"
                    isDisabled={busy}
                    onClick={() => void onDeleteException(exception.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sorted.length === 0 && exceptions.length === 0 ? (
        <div {...stylex.props(s.empty)}>
          <Text type="body" color="secondary">
            An diesem Tag ist nichts eingetragen.
          </Text>
        </div>
      ) : (
        sorted.map((appointment) => (
          <AppointmentEntry
            key={appointment.id}
            appointment={appointment}
            timezone={timezone}
            onDecide={onDecide}
            onCancel={onCancel}
            onLink={onLink}
          />
        ))
      )}
    </div>
  );
}
