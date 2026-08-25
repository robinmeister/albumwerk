// Termin absagen oder verschieben (docs/terminbuchung.md §4.3).
//
// Erreichbar über den Token-Link aus der Bestätigungsmail, ohne Login: **Wer
// die Mail hat, darf handeln** — der Termin gehört der Adresse, an die die Mail
// ging. Wurde eine fremde Adresse eingetippt, landet der Link bei der fremden
// Person, und dass sie absagen kann, ist genau richtig: Sie wollte den Termin
// nie.
//
// Nach Ablauf der Frist verschwinden die Knöpfe NICHT einfach — die Seite
// erklärt, warum nichts mehr geht, und nennt die Kontaktmöglichkeit. Sonst
// kommt „Ihr Link funktioniert nicht“.

import { ReactElement, useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";

import {
  BookingBranding,
  ManageResult,
  Slot,
  cancelAppointment,
  fetchAppointmentByToken,
  fetchBranding,
  rescheduleAppointment,
} from "./api";
import SlotPicker from "./SlotPicker";
import { brandVars, s } from "./styles";
import { formatDateTime, zoneHint } from "./time";

type Props = { token: string };

type Mode = "view" | "confirmCancel" | "reschedule" | "cancelled" | "moved";

export default function ManageView(props: Props): ReactElement {
  const { token } = props;

  const [data, setData] = useState<ManageResult | null>(null);
  const [branding, setBranding] = useState<BookingBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [reason, setReason] = useState("");
  const [newSlot, setNewSlot] = useState<Slot | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [appointment, loadedBranding] = await Promise.all([
        fetchAppointmentByToken(token),
        fetchBranding(),
      ]);
      setData(appointment);
      setBranding(loadedBranding);
      setLoadError("");
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const root = (children: ReactElement | ReactElement[]) => (
    <div
      {...stylex.props(s.root, s.stack)}
      style={brandVars(branding?.primaryColor ?? "")}
      data-testid="termin-verwalten"
    >
      {children}
    </div>
  );

  if (loading) return root(<p {...stylex.props(s.muted)}>Wird geladen …</p>);

  if (loadError || !data) {
    return root(
      <>
        <h2 {...stylex.props(s.headline)}>Dieser Link führt ins Leere</h2>
        <p {...stylex.props(s.muted)}>
          Möglicherweise wurde der Termin bereits abgesagt oder der Link ist
          unvollständig kopiert. Melde dich am besten direkt bei uns.
        </p>
      </>,
    );
  }

  const { appointment, timezone, changeable, cancelDeadlineHours, contactEmail } = data;
  const zoneNote = zoneHint(timezone);

  const summary = (
    <div {...stylex.props(s.summary)}>
      <strong>{appointment.typeName}</strong>
      <span {...stylex.props(s.cardMeta)}>
        {formatDateTime(appointment.startMs, timezone)}
        {zoneNote ? ` · ${zoneNote}` : ""}
      </span>
      <span {...stylex.props(s.cardMeta)}>{appointment.durationMin} Minuten</span>
    </div>
  );

  if (mode === "cancelled") {
    return root(
      <>
        <h2 {...stylex.props(s.headline)}>Termin abgesagt</h2>
        <p {...stylex.props(s.success)}>
          Die Absage ist eingegangen. Du bekommst gleich eine Bestätigung per
          E-Mail.
        </p>
        {summary}
      </>,
    );
  }

  if (mode === "moved") {
    return root(
      <>
        <h2 {...stylex.props(s.headline)}>Termin verschoben</h2>
        <p {...stylex.props(s.success)}>
          Dein neuer Termin steht. Die Bestätigung ist unterwegs.
        </p>
        {summary}
      </>,
    );
  }

  const alreadyOver =
    appointment.status === "cancelled" ||
    appointment.status === "declined" ||
    appointment.status === "expired";

  if (alreadyOver) {
    return root(
      <>
        <h2 {...stylex.props(s.headline)}>Dieser Termin besteht nicht mehr</h2>
        {summary}
        <p {...stylex.props(s.muted)}>
          Er wurde bereits abgesagt.
          {contactEmail ? ` Für einen neuen Termin melde dich gern: ${contactEmail}` : ""}
        </p>
      </>,
    );
  }

  // --- Verschieben ---------------------------------------------------------
  if (mode === "reschedule") {
    return root(
      <>
        <h2 {...stylex.props(s.headline)}>Neuen Termin wählen</h2>
        <p {...stylex.props(s.muted)}>
          Bisher: {formatDateTime(appointment.startMs, timezone)}
        </p>
        {actionError && <p {...stylex.props(s.error)}>{actionError}</p>}

        <SlotPicker
          typeSlug={appointment.typeSlug}
          timezone={timezone}
          selected={newSlot}
          onSelect={setNewSlot}
        />

        <div {...stylex.props(s.buttonRow)}>
          <button
            type="button"
            disabled={!newSlot || busy}
            data-testid="verschieben-bestaetigen"
            onClick={() => {
              if (!newSlot) return;
              setBusy(true);
              setActionError("");
              rescheduleAppointment(token, newSlot.start)
                .then(() => load())
                .then(() => setMode("moved"))
                .catch((error: Error) => setActionError(error.message))
                .finally(() => setBusy(false));
            }}
            {...stylex.props(s.button)}
          >
            {busy ? "Wird verschoben …" : "Auf diese Zeit verschieben"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("view");
              setNewSlot(null);
            }}
            {...stylex.props(s.button, s.buttonSecondary)}
          >
            Abbrechen
          </button>
        </div>
      </>,
    );
  }

  // --- Absage bestätigen ---------------------------------------------------
  if (mode === "confirmCancel") {
    return root(
      <>
        <h2 {...stylex.props(s.headline)}>Termin wirklich absagen?</h2>
        {summary}
        <div {...stylex.props(s.field)}>
          <label htmlFor="cancel-reason" {...stylex.props(s.label)}>
            Grund (optional)
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            {...stylex.props(s.textarea)}
          />
        </div>
        {actionError && <p {...stylex.props(s.error)}>{actionError}</p>}
        <div {...stylex.props(s.buttonRow)}>
          <button
            type="button"
            disabled={busy}
            data-testid="absage-bestaetigen"
            onClick={() => {
              setBusy(true);
              setActionError("");
              cancelAppointment(token, reason)
                .then(() => setMode("cancelled"))
                .catch((error: Error) => setActionError(error.message))
                .finally(() => setBusy(false));
            }}
            {...stylex.props(s.button)}
          >
            {busy ? "Wird abgesagt …" : "Ja, absagen"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("view")}
            {...stylex.props(s.button, s.buttonSecondary)}
          >
            Doch nicht
          </button>
        </div>
      </>,
    );
  }

  // --- Übersicht -----------------------------------------------------------
  return root(
    <>
      <h2 {...stylex.props(s.headline)}>Dein Termin</h2>
      {appointment.status === "pending" && (
        <p {...stylex.props(s.muted)}>
          Diese Anfrage ist noch nicht bestätigt — die Zeit ist für dich
          reserviert, bis wir uns melden.
        </p>
      )}
      {summary}

      {changeable ? (
        <div {...stylex.props(s.buttonRow)}>
          <button
            type="button"
            data-testid="verschieben"
            onClick={() => setMode("reschedule")}
            {...stylex.props(s.button)}
          >
            Verschieben
          </button>
          <button
            type="button"
            data-testid="absagen"
            onClick={() => setMode("confirmCancel")}
            {...stylex.props(s.button, s.buttonSecondary)}
          >
            Absagen
          </button>
        </div>
      ) : (
        // Erklären statt Knöpfe verstecken.
        <p {...stylex.props(s.muted)}>
          Online lässt sich der Termin nur bis {cancelDeadlineHours} Stunden
          vorher ändern — diese Frist ist vorbei.
          {contactEmail
            ? ` Melde dich bitte direkt bei uns: ${contactEmail}`
            : " Melde dich bitte direkt bei uns."}
        </p>
      )}
    </>,
  );
}
