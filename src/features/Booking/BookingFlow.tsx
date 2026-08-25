// Der Buchungsablauf (docs/terminbuchung.md §2.2, §4).
//
// Reihenfolge: Leistung → Termin → Kontaktdaten → Bestätigung.
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

type Step = "type" | "slot" | "form" | "done";

export default function BookingFlow(props: Props): ReactElement {
  const { preselectedType, originUrl } = props;

  const [branding, setBranding] = useState<BookingBranding | null>(null);
  const [types, setTypes] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [type, setType] = useState<BookingType | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [step, setStep] = useState<Step>("type");
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
        if (chosen) {
          setType(chosen);
          setStep("slot");
        }
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
      // Ist die Zeit inzwischen weg, zurück zur Auswahl — im Formular
      // stehenzubleiben wäre eine Sackgasse.
      if (failure.code === "slot_taken") {
        setSlot(null);
        setStep("slot");
      }
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setResult(null);
    setSlot(null);
    setSubmitError("");
    setStep(types.length === 1 || preselectedType ? "slot" : "type");
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

  // --- Leistung wählen -----------------------------------------------------
  if (step === "type") {
    return root(
      <>
        <h2 {...stylex.props(s.headline)}>Was möchtest du buchen?</h2>
        <div {...stylex.props(s.stackTight)}>
          {types.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              data-testid="art"
              onClick={() => {
                setType(candidate);
                setStep("slot");
              }}
              {...stylex.props(s.card)}
            >
              <span {...stylex.props(s.cardTitle)}>{candidate.name}</span>
              <span {...stylex.props(s.cardMeta)}>
                {candidate.durationMin} Minuten
                {candidate.price > 0
                  ? ` · ${candidate.price} ${branding?.currency ?? "EUR"}`
                  : " · kostenlos"}
                {candidate.location ? ` · ${candidate.location}` : ""}
              </span>
              {candidate.description && (
                <span {...stylex.props(s.cardMeta)}>{candidate.description}</span>
              )}
            </button>
          ))}
        </div>
      </>,
    );
  }

  // --- Termin wählen -------------------------------------------------------
  if (step === "slot" && type) {
    const canGoBack = types.length > 1 && !preselectedType;
    return root(
      <>
        <div {...stylex.props(s.stackTight)}>
          <h2 {...stylex.props(s.headline)}>{type.name}</h2>
          <p {...stylex.props(s.subline)}>
            {type.durationMin} Minuten
            {type.price > 0 ? ` · ${type.price} ${branding?.currency ?? "EUR"}` : " · kostenlos"}
            {type.location ? ` · ${type.location}` : ""}
          </p>
          {zoneNote && <p {...stylex.props(s.muted)}>Alle Zeiten: {zoneNote}.</p>}
        </div>

        {submitError && <p {...stylex.props(s.error)}>{submitError}</p>}

        <SlotPicker
          typeSlug={type.slug}
          timezone={timezone}
          selected={slot}
          onSelect={(chosen) => {
            setSlot(chosen);
            setSubmitError("");
            setStep("form");
          }}
          onTimezoneKnown={setTimezone}
        />

        {canGoBack && (
          <div {...stylex.props(s.buttonRow)}>
            <button
              type="button"
              onClick={() => {
                setType(null);
                setStep("type");
              }}
              {...stylex.props(s.button, s.buttonSecondary)}
            >
              Andere Leistung
            </button>
          </div>
        )}
      </>,
    );
  }

  // --- Kontaktdaten --------------------------------------------------------
  if (step === "form" && type && slot) {
    return root(
      <BookingForm
        type={type}
        slot={slot}
        timezone={timezone}
        zoneNote={zoneNote}
        privacyUrl={privacyUrl}
        busy={busy}
        error={submitError}
        startedAt={startedAt.current}
        onBack={() => setStep("slot")}
        onSubmit={(values) => void submit(values)}
      />,
    );
  }

  return root(<p {...stylex.props(s.muted)}>Wird geladen …</p>);
}
