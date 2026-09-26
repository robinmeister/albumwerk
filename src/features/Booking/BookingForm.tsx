// Kontaktdaten und Einwilligung (docs/terminbuchung.md §10).
//
// Pflichtfelder bewusst minimal: Name und E-Mail. Die Telefonnummer hängt an
// der Termin-Art — bei einem Hochzeitsshooting will die Fotograf:in erreichbar
// sein, beim kostenlosen Kennenlerngespräch ist es unnötige Datensammelei.
//
// Zwei Dinge stecken unsichtbar drin:
//   - ein Honeypot-Feld (für Menschen unerreichbar, für Bots verlockend)
//   - der Zeitpunkt, zu dem die Buchung BEGONNEN wurde
// Beides prüft der Server, nicht diese Komponente.
//
// Wichtig am zweiten Punkt: gemessen wird ab dem Laden des Formulars insgesamt,
// NICHT ab dem Erscheinen dieser Maske. Wer Leistung und Zeit bereits gewählt
// hat, tippt hier nur noch Name und E-Mail — mit Autofill in unter zwei
// Sekunden. Genau das ist beim Testen passiert: Eine echte Buchung wurde als
// Bot abgewiesen. Die Zeit, die jemand insgesamt mit der Auswahl verbracht hat,
// ist das ehrlichere Signal.

import { ReactElement, useState } from "react";
import * as stylex from "@stylexjs/stylex";

import { BookingType, Slot } from "./api";
import { s } from "./styles";
import { formatDateTime } from "./time";

export interface FormValues {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
  website: string;
  renderedAt: number;
}

type Props = {
  type: BookingType;
  slot: Slot;
  timezone: string;
  zoneNote: string;
  privacyUrl: string;
  busy: boolean;
  error: string;
  /** Zeitpunkt, zu dem die Buchung begonnen wurde (nicht: dieses Formular). */
  startedAt: number;
  onSubmit: (values: FormValues) => void;
};

export default function BookingForm(props: Props): ReactElement {
  const {
    type, slot, timezone, zoneNote, privacyUrl, busy, error, startedAt, onSubmit,
  } = props;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [touched, setTouched] = useState(false);

  const phoneRequired = type.phoneMode === "required";
  const missing =
    !name.trim() || !email.trim() || !consent || (phoneRequired && !phone.trim());

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (missing) return;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim(),
      consent,
      website,
      renderedAt: startedAt,
    });
  };

  return (
    <form onSubmit={submit} {...stylex.props(s.stack)} data-testid="buchungsformular">
      <h2 {...stylex.props(s.kicker)}>4. Kontaktdaten</h2>
      <div {...stylex.props(s.summary)}>
        <strong>{type.name}</strong>
        <span {...stylex.props(s.cardMeta)}>
          {formatDateTime(slot.startMs, timezone)}
          {zoneNote ? ` · ${zoneNote}` : ""}
        </span>
        <span {...stylex.props(s.cardMeta)}>
          {type.durationMin} Minuten{type.location ? ` · ${type.location}` : ""}
        </span>
      </div>

      <div {...stylex.props(s.formGrid)}>
        <div {...stylex.props(s.field)}>
          <label htmlFor="booking-name" {...stylex.props(s.label)}>
            Name
          </label>
          <input
            id="booking-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            {...stylex.props(s.input)}
          />
        </div>

        <div {...stylex.props(s.field)}>
          <label htmlFor="booking-email" {...stylex.props(s.label)}>
            E-Mail
          </label>
          <input
            id="booking-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            {...stylex.props(s.input)}
          />
          <span {...stylex.props(s.muted)}>
            Hierhin geht die Bestätigung — darüber kannst du auch absagen.
          </span>
        </div>

        {type.phoneMode !== "off" && (
          <div {...stylex.props(s.field, s.fullRow)}>
            <label htmlFor="booking-phone" {...stylex.props(s.label)}>
              Telefon{phoneRequired ? "" : " (optional)"}
            </label>
            <input
              id="booking-phone"
              name="tel"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              {...stylex.props(s.input)}
            />
          </div>
        )}

        <div {...stylex.props(s.field, s.fullRow)}>
          <label htmlFor="booking-message" {...stylex.props(s.label)}>
            Dein Anliegen (optional)
          </label>
          <textarea
            id="booking-message"
            value={message}
            maxLength={1000}
            onChange={(event) => setMessage(event.target.value)}
            {...stylex.props(s.textarea)}
          />
        </div>
      </div>

      {/* Honeypot. `aria-hidden` und `tabIndex={-1}`, damit Screenreader und
          Tastaturbedienung ihn nicht anbieten — er ist keine echte Eingabe. */}
      <div {...stylex.props(s.honeypot)} aria-hidden="true">
        <label htmlFor="booking-website">Website (bitte frei lassen)</label>
        <input
          id="booking-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div {...stylex.props(s.checkboxRow)}>
        <input
          id="booking-consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <label htmlFor="booking-consent" {...stylex.props(s.checkboxLabel)}>
          Ich bin einverstanden, dass meine Angaben zur Bearbeitung des Termins
          gespeichert werden.{" "}
          {/* Muss in einem neuen Tab öffnen: Im iframe würde die
              Datenschutzerklärung sonst IM Rahmen laden — die Besucherin säße
              in einem 400-Pixel-Fenster fest und ihre Eingaben wären weg. */}
          <a
            href={privacyUrl}
            target="_blank"
            rel="noreferrer noopener"
            {...stylex.props(s.link)}
          >
            Datenschutzerklärung
          </a>
        </label>
      </div>

      {touched && missing && (
        <p {...stylex.props(s.error)}>
          Bitte fülle Name, E-Mail{phoneRequired ? ", Telefon" : ""} aus und
          stimme der Datenschutzerklärung zu.
        </p>
      )}
      {error && <p {...stylex.props(s.error)}>{error}</p>}

      <div {...stylex.props(s.buttonRow)}>
        <button
          type="submit"
          disabled={busy}
          data-testid="buchen"
          {...stylex.props(s.button)}
        >
          {busy ? "Wird gebucht …" : type.requiresApproval ? "Termin anfragen" : "Verbindlich buchen"}
        </button>
      </div>

      {type.requiresApproval && (
        <p {...stylex.props(s.muted)}>
          Diese Leistung wird erst nach einer Rückmeldung verbindlich. Die Zeit
          bleibt bis dahin für dich reserviert.
        </p>
      )}
    </form>
  );
}
