// Der Buchungsablauf (docs/terminbuchung.md §2.2, §4).
//
// Reihenfolge: Leistung → Termin → Kontaktdaten → Bestätigung. Die ersten
// drei stehen nach dem Stitch-Entwurf "Termin buchen" nebeneinander auf einer
// Seite; die Kontaktdaten erscheinen darunter, sobald eine Zeit gewählt ist.
//
// Dass die Leistung ZUERST gewählt wird, ist keine Geschmacksfrage: Regeln
// können Arten einschränken („Sa nur Shootings“), damit ist die Verfügbarkeit
// ohne gewählte Art nicht definiert. Gibt es nur eine aktive Art — oder ist
// eine per URL vorgewählt —, entfällt der Schritt.
//
// Diese Komponente wird von BEIDEN Einstiegspunkten benutzt: vom schlanken
// Embed-Bundle und von der App. Sie darf deshalb nichts aus dem App-Kontext
// importieren (kein Router, kein Auth, kein Astryx).

import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";

import {
  BookingBranding,
  BookingError,
  BookingType,
  Slot,
  book,
  fetchBranding,
  fetchTypes,
} from "./api";
import BookingForm, { FormValues } from "./BookingForm";
import SlotPicker from "./SlotPicker";
import { brandVars, s } from "./styles";
import { formatDateTime, zoneHint } from "./time";

type Props = {
  /** Slug einer vorgewählten Leistung, z. B. aus ?type= im eingebetteten Formular. */
  preselectedType?: string;
  /** Basis-URL der Instanz für Links, die den iframe verlassen müssen. */
  originUrl?: string;
};

type Step = "choose" | "done";

export default function BookingFlow(props: Props): ReactElement {
  const { preselectedType, originUrl } = props;

  const [branding, setBranding] = useState<BookingBranding | null>(null);
  const [types, setTypes] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [type, setType] = useState<BookingType | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<{ requiresApproval: boolean; start: string } | null>(null);
  const [timezone, setTimezone] = useState("Europe/Berlin");
  // Beginn der Buchung — der Server prüft damit, ob überhaupt jemand
  // interagiert hat (§6). Bewusst hier und nicht im Formular: siehe
  // BookingForm.tsx.
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchBranding(), fetchTypes()])
      .then(([loadedBranding, loadedTypes]) => {
        if (cancelled) return;
        setBranding(loadedBranding);
        setTypes(loadedTypes);
        setTimezone(loadedBranding.timezone);

        // Vorwahl per URL, sonst automatisch, wenn es nur eine Leistung gibt.
        const preselected = preselectedType
          ? loadedTypes.find((candidate) => candidate.slug === preselectedType)
          : undefined;
        const only = loadedTypes.length === 1 ? loadedTypes[0] : undefined;
        const chosen = preselected ?? only;
        if (chosen) setType(chosen);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preselectedType]);

  const origin = originUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const privacyUrl = `${origin}/privacy`;
  // Nur anzeigen, wenn der Browser tatsächlich in einer anderen Zone steht —
  // sonst wäre „Zeit in Berlin“ für die allermeisten nur Rauschen (§3).
  const zoneNote = useMemo(() => zoneHint(timezone), [timezone]);

  const submit = async (values: FormValues) => {
    if (!type || !slot) return;
    setBusy(true);
    setSubmitError("");
    try {
      const booked = await book({
        type: type.slug,
        start: slot.start,
        name: values.name,
        email: values.email,
        phone: values.phone,
        message: values.message,
        consent: values.consent,
        website: values.website,
        renderedAt: values.renderedAt,
      });
      setResult({ requiresApproval: booked.requiresApproval, start: booked.start });
      setStep("done");
    } catch (error) {
      const failure = error as BookingError;
      setSubmitError(failure.message);
      // Ist die Zeit inzwischen weg, Auswahl lösen — sonst bliebe das
      // Formular an einer Zeit hängen, die es nicht mehr gibt.
      if (failure.code === "slot_taken") setSlot(null);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setResult(null);
    setSlot(null);
    setSubmitError("");
    setStep("choose");
  };

  const root = (children: ReactElement | ReactElement[]) => (
    <div
      {...stylex.props(s.root, s.stack)}
      style={brandVars(branding?.primaryColor ?? "")}
      data-testid="buchung"
    >
      {children}
    </div>
  );

  if (loading) {
    return root(<p {...stylex.props(s.muted)}>Wird geladen …</p>);
  }

  if (loadError) {
    return root(<p {...stylex.props(s.error)}>{loadError}</p>);
  }

  if (branding && !branding.bookingEnabled) {
    return root(
      <p {...stylex.props(s.muted)}>
        Online-Terminbuchung ist gerade nicht möglich.
        {branding.contactEmail ? ` Melde dich gern direkt: ${branding.contactEmail}` : ""}
      </p>,
    );
  }

  if (types.length === 0) {
    return root(
      <p {...stylex.props(s.muted)}>
        Zurzeit ist nichts buchbar.
        {branding?.contactEmail ? ` Melde dich gern direkt: ${branding.contactEmail}` : ""}
      </p>,
    );
  }

  // --- Bestätigung ---------------------------------------------------------
  if (step === "done" && result) {
    return root(
      <>
        <h2 {...stylex.props(s.headline)}>
          {result.requiresApproval ? "Anfrage ist eingegangen" : "Termin steht"}
        </h2>
        <p {...stylex.props(s.success)} data-testid="bestaetigung">
          {result.requiresApproval
            ? "Wir haben deine Anfrage erhalten und melden uns per E-Mail."
            : "Wir haben dir eine Bestätigung per E-Mail geschickt."}
        </p>
        <div {...stylex.props(s.summary)}>
          <strong>{type?.name}</strong>
          <span {...stylex.props(s.cardMeta)}>
            {formatDateTime(new Date(result.start).getTime(), timezone)}
            {zoneNote ? ` · ${zoneNote}` : ""}
          </span>
        </div>
        <p {...stylex.props(s.muted)}>
          In der E-Mail findest du einen Link, über den du absagen oder
          verschieben kannst. Schau notfalls im Spam-Ordner nach.
        </p>
        <div {...stylex.props(s.buttonRow)}>
          <button
            type="button"
            onClick={restart}
            {...stylex.props(s.button, s.buttonSecondary)}
          >
            Weiteren Termin buchen
          </button>
        </div>
      </>,
    );
  }

  // --- Leistung, Datum, Uhrzeit ------------------------------------------
  // Mit Vorwahl per URL steht nur die vorgewählte Leistung da — wer über
  // einen Link für ein bestimmtes Shooting kommt, soll nicht umwählen.
  const shownTypes = preselectedType && type ? [type] : types;
  const price = (candidate: BookingType) =>
    candidate.price > 0 ? `${candidate.price} ${branding?.currency ?? "EUR"}` : "kostenlos";

  return root(
    <>
      {zoneNote && <p {...stylex.props(s.muted)}>Alle Zeiten: {zoneNote}.</p>}
      {submitError && !slot && <p {...stylex.props(s.error)}>{submitError}</p>}

      <div {...stylex.props(s.columns)}>
        <section {...stylex.props(s.stackTight)}>
          <h2 {...stylex.props(s.kicker)}>1. Was möchtest du buchen?</h2>
          {shownTypes.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              data-testid="art"
              aria-pressed={type?.id === candidate.id}
              onClick={() => {
                if (type?.id !== candidate.id) setSlot(null);
                setType(candidate);
                setSubmitError("");
              }}
              {...stylex.props(s.card, type?.id === candidate.id && s.cardSelected)}
            >
              <span {...stylex.props(s.cardHead)}>
                <span {...stylex.props(s.cardTitle)}>{candidate.name}</span>
                <span {...stylex.props(s.cardMono)}>{candidate.durationMin} Minuten</span>
              </span>
              <span {...stylex.props(s.cardFoot)}>
                <span {...stylex.props(s.cardMeta)}>
                  {[candidate.description, candidate.location].filter(Boolean).join(" · ")}
                </span>
                <span {...stylex.props(s.price)}>{price(candidate)}</span>
              </span>
            </button>
          ))}
        </section>

        {type ? (
          <SlotPicker
            key={type.slug}
            typeSlug={type.slug}
            timezone={timezone}
            selected={slot}
            firstStep={2}
            onSelect={(chosen) => {
              setSlot(chosen);
              setSubmitError("");
            }}
            onTimezoneKnown={setTimezone}
          />
        ) : (
          <p {...stylex.props(s.muted, s.spanTwo)}>
            Wähle zuerst eine Leistung, dann zeigen wir dir die freien Zeiten.
          </p>
        )}
      </div>

      {type && slot && (
        <section {...stylex.props(s.formSection)}>
          <BookingForm
            type={type}
            slot={slot}
            timezone={timezone}
            zoneNote={zoneNote}
            privacyUrl={privacyUrl}
            busy={busy}
            error={submitError}
            startedAt={startedAt.current}
            onSubmit={(values) => void submit(values)}
          />
        </section>
      )}
    </>,
  );
}
