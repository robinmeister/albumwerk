// Termin-Interview (docs/superpowers/specs/2026-09-30-termin-interview-design.md).
//
// Statt zweier großer Formulare eine Frage pro Bildschirm, mit Kacheln zum
// Anklicken. Vorausgefüllt aus dem aktuellen Plan; jede Abweichung davon
// steht sofort unter der Frage. Gespeichert wird erst im letzten Schritt —
// Abbrechen lässt alles, wie es war.

import { ComponentProps, ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { useSettings } from "../../context/SettingsContext";
import { applyPlan, fetchRules, fetchTypes } from "../../features/Appointments/api";
import {
  Answers,
  CATALOG,
  Change,
  ChangeField,
  Plan,
  Restriction,
  Service,
  TimeWindow,
  addCustomService,
  answersFromPlan,
  currentPlan,
  diffPlans,
  formatSpan,
  hasEvening,
  planFromAnswers,
  serviceFor,
} from "../../features/Appointments/interview";
import { formatWindow, timeToMinutes } from "../../features/Booking/time";

type Option<T> = { value: T; label: string; isDisabled?: boolean };

const STEPS: { title: string; fields: ChangeField[] }[] = [
  { title: "Was können Kund:innen bei dir buchen?", fields: ["service"] },
  { title: "Wie lange dauert ein Termin?", fields: ["durationMin"] },
  { title: "Wie viel Luft brauchst du danach?", fields: ["bufferMin"] },
  { title: "Wie kurzfristig darf man buchen?", fields: ["leadTimeMin"] },
  { title: "Sagst du jeden Termin selbst zu?", fields: ["requiresApproval"] },
  { title: "Wo findet es statt, und was kostet es?", fields: ["location", "price"] },
  { title: "An welchen Tagen arbeitest du?", fields: ["rules"] },
  { title: "Zu welchen Zeiten?", fields: ["rules"] },
  { title: "Sollen manche Leistungen nur zu bestimmten Zeiten buchbar sein?", fields: ["rules"] },
  { title: "Wie viele Termine schaffst du an einem Tag höchstens?", fields: ["maxPerDay"] },
  { title: "Wie weit im Voraus darf gebucht werden?", fields: ["horizonDays"] },
  { title: "Das ändert sich", fields: [] },
];
const SUMMARY = STEPS.length - 1;

const WEEKDAYS: Option<number>[] = [
  { value: 1, label: "Mo" }, { value: 2, label: "Di" }, { value: 3, label: "Mi" },
  { value: 4, label: "Do" }, { value: 5, label: "Fr" }, { value: 6, label: "Sa" },
  { value: 7, label: "So" },
];
const WEEKDAY_LONG = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

const DURATIONS = [15, 30, 60, 90, 120].map((v) => ({ value: v, label: `${v} Min` }));
const BUFFERS = [0, 15, 30, 60].map((v) => ({ value: v, label: formatSpan(v) }));
const LEADS: Option<number>[] = [
  { value: 120, label: "Gleicher Tag (2 Std vorher)" },
  { value: 1440, label: "Einen Tag vorher" },
  { value: 4320, label: "Drei Tage vorher" },
  { value: 10080, label: "Eine Woche vorher" },
];
const APPROVAL: Option<boolean>[] = [
  { value: false, label: "Sofort verbindlich" },
  { value: true, label: "Erst nach meiner Zusage" },
];
const HOURS: Option<TimeWindow[]>[] = [
  { value: [{ startMinute: 540, endMinute: 780 }], label: "Vormittags 9–13" },
  { value: [{ startMinute: 780, endMinute: 1080 }], label: "Nachmittags 13–18" },
  { value: [{ startMinute: 540, endMinute: 1080 }], label: "Ganztags 9–18" },
  { value: [{ startMinute: 1020, endMinute: 1260 }], label: "Abends 17–21" },
];
const MAX_PER_DAY = [1, 2, 3, 0].map((v) => ({ value: v, label: v ? String(v) : "Egal" }));
const HORIZON: Option<number>[] = [
  { value: 28, label: "4 Wochen" },
  { value: 90, label: "3 Monate" },
  { value: 180, label: "6 Monate" },
  { value: 365, label: "1 Jahr" },
];
const KIND_LABEL: Record<Change["kind"], string> = {
  warnung: "Achtung",
  neu: "Neu",
  geändert: "Geändert",
  deaktiviert: "Nicht mehr buchbar",
  entfällt: "Entfällt",
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const s = stylex.create({
  column: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 8,
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 16,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  inline: { display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" },
  list: { margin: 0, paddingLeft: 20 },
  actions: { display: "flex", justifyContent: "space-between", gap: 8 },
  center: { display: "flex", justifyContent: "center", padding: 48 },
});

/**
 * Kacheln für eine Einfachauswahl. Passt der aktuelle Wert zu keiner Kachel,
 * kommt eine zusätzliche, gewählte Kachel „Eigene Einstellung“ dazu — so
 * überschreibt das Interview nichts, was im Formular feiner eingestellt war.
 */
// SelectableCard nutzt `label` nur als aria-label — sichtbar wird erst das Kind
function Tile(props: ComponentProps<typeof SelectableCard>): ReactElement {
  return (
    <SelectableCard {...props}>
      <Text type="body">{props.label}</Text>
    </SelectableCard>
  );
}

function Tiles<T>({
  options,
  value,
  onChange,
  custom,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  custom?: (value: T) => string;
}): ReactElement {
  const known = options.some((option) => same(option.value, value));
  return (
    <div {...stylex.props(s.tiles)}>
      {options.map((option) => (
        <Tile
          key={option.label}
          label={option.label}
          isSelected={same(option.value, value)}
          isDisabled={option.isDisabled}
          onChange={() => onChange(option.value)}
        />
      ))}
      {!known && custom && (
        <Tile label={`Eigene Einstellung: ${custom(value)}`} isSelected onChange={() => undefined} />
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <div {...stylex.props(s.block)}>
      <Text type="body" weight="semibold">{title}</Text>
      {children}
    </div>
  );
}

/** Zeitkacheln plus freie Eingabe, für einen Tag oder für alle. */
function HoursPicker({
  value,
  onChange,
}: {
  value: TimeWindow[];
  onChange: (value: TimeWindow[]) => void;
}): ReactElement {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const setOwn = () => {
    const start = timeToMinutes(from);
    let end = timeToMinutes(to);
    if (start === null || end === null) {
      toast.error("Bitte Uhrzeiten als HH:MM angeben.");
      return;
    }
    // wie auf der Verfügbarkeitsseite: Ende vor Beginn heißt „über Mitternacht“
    if (end <= start) end += 1440;
    onChange([{ startMinute: start, endMinute: end }]);
  };
  return (
    <>
      <Tiles
        options={HOURS}
        value={value}
        onChange={onChange}
        custom={(windows) => windows.map((w) => formatWindow(w.startMinute, w.endMinute)).join(", ")}
      />
      <div {...stylex.props(s.inline)}>
        <TextInput label="Eigene Zeit von" placeholder="10:00" value={from} onChange={setFrom} />
        <TextInput label="bis" placeholder="16:00" value={to} onChange={setTo} />
        <Button variant="secondary" label="Übernehmen" onClick={setOwn} />
      </div>
    </>
  );
}

export default function AppointmentSetupPage(): ReactElement {
  const navigate = useNavigate();
  const { settings, loaded, refresh } = useSettings();
  const [current, setCurrent] = useState<Plan | null>(null);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [step, setStep] = useState(0);
  const [perDay, setPerDay] = useState(false);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    // Erst mit geladenen Settings: vorher stehen dort neutrale Vorgaben, und
    // der „alte Plan“ hätte z. B. eine ausgeschaltete Buchung.
    if (!loaded || current) return;
    Promise.all([fetchTypes(), fetchRules()])
      .then(([types, rules]) => {
        const plan = currentPlan(types, rules, settings);
        setCurrent(plan);
        setAnswers(answersFromPlan(plan));
        // Unterschiedliche Zeiten je Tag gleich aufgeklappt zeigen
        const first = plan.rules[0];
        setPerDay(
          plan.rules.some(
            (rule) => rule.startMinute !== first.startMinute || rule.endMinute !== first.endMinute,
          ),
        );
      })
      .catch(() => setUnavailable(true));
    // Nur einmal: ein späteres Nachladen der Settings würde die Antworten
    // zurücksetzen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const changes = useMemo(
    () => (current && answers ? diffPlans(current, planFromAnswers(answers, current), settings.currency || "EUR") : []),
    [current, answers, settings.currency],
  );

  if (unavailable) {
    return (
      <Page title="Geführt einrichten">
        <Banner status="warning" title="Die Terminbuchung ist auf dieser Instanz noch nicht eingerichtet.">
          <Text type="body">
            Starte deine Instanz einmal neu — die nötige Migration läuft dabei automatisch mit.
          </Text>
        </Banner>
      </Page>
    );
  }
  if (!current || !answers) {
    return (
      <Page title="Geführt einrichten">
        <div {...stylex.props(s.center)}>
          <Spinner />
        </div>
      </Page>
    );
  }

  const set = (patch: Partial<Answers>) => setAnswers({ ...answers, ...patch });
  // Gleicher Wert wie jetzt: nichts tun, sonst gälte der Zeitplan als berührt
  const setSchedule = (patch: Partial<Answers>) => {
    if (Object.entries(patch).every(([key, value]) => same(answers[key as keyof Answers], value))) return;
    set({ ...patch, scheduleTouched: true });
  };
  const setService = (slug: string, patch: Partial<Service>) =>
    set({ services: answers.services.map((sv) => (sv.slug === slug ? { ...sv, ...patch } : sv)) });
  const perService = (render: (service: Service) => ReactNode) =>
    answers.services.map((service) => (
      <Block key={service.slug} title={service.name}>
        {render(service)}
      </Block>
    ));

  // Frage 1: Katalog plus alle schon vorhandenen Arten, auch inaktive
  const serviceOptions = [
    ...CATALOG.map((c) => ({ slug: c.slug, name: current.types.find((t) => t.slug === c.slug)?.name ?? c.name })),
    ...current.types.filter((t) => !CATALOG.some((c) => c.slug === t.slug)).map((t) => ({ slug: t.slug, name: t.name })),
    ...answers.services
      .filter((sv) => !CATALOG.some((c) => c.slug === sv.slug) && !current.types.some((t) => t.slug === sv.slug))
      .map((sv) => ({ slug: sv.slug, name: sv.name })),
  ];
  const toggleService = (slug: string, on: boolean) =>
    set({
      services: on
        ? [...answers.services, serviceFor(slug, current)]
        : answers.services.filter((sv) => sv.slug !== slug),
    });

  const setDays = (days: number[]) => {
    const template = answers.windows[answers.days[0]] ?? [{ startMinute: 540, endMinute: 1080 }];
    const windows: Record<number, TimeWindow[]> = {};
    for (const day of days) windows[day] = answers.windows[day] ?? template;
    setSchedule({ days: [...days].sort((a, b) => a - b), windows });
  };
  const setAllHours = (value: TimeWindow[]) =>
    setSchedule({ windows: Object.fromEntries(answers.days.map((day) => [day, value])) });

  const restrictionOptions: Option<Restriction>[] = [
    { value: "all", label: "Wie meine Arbeitszeit" },
    { value: "weekdays", label: "Nur werktags", isDisabled: !answers.days.some((d) => d <= 5) },
    { value: "weekend", label: "Nur am Wochenende", isDisabled: !answers.days.some((d) => d >= 6) },
    { value: "evening", label: "Nur abends (ab 17 Uhr)", isDisabled: !hasEvening(answers) },
  ];

  const questions: ReactNode[] = [
    // 1
    <>
      <div {...stylex.props(s.tiles)}>
        {serviceOptions.map((option) => (
          <Tile
            key={option.slug}
            label={option.name}
            isSelected={answers.services.some((sv) => sv.slug === option.slug)}
            onChange={(on) => toggleService(option.slug, on)}
          />
        ))}
      </div>
      <div {...stylex.props(s.inline)}>
        <TextInput label="Eigene Leistung" placeholder="z. B. Newborn" value={customName} onChange={(v) => setCustomName(v.slice(0, 80))} />
        <Button
          variant="secondary"
          label="Hinzufügen"
          onClick={() => {
            setAnswers(addCustomService(answers, customName));
            setCustomName("");
          }}
        />
      </div>
    </>,
    // 2
    perService((service) => (
      <>
        <Tiles
          options={DURATIONS}
          value={service.durationMin}
          onChange={(v) => setService(service.slug, { durationMin: v })}
          custom={(v) => `${v} Min`}
        />
        <NumberInput
          label="Andere Dauer (Minuten)"
          value={service.durationMin}
          onChange={(v) => setService(service.slug, { durationMin: Number(v) || 0 })}
        />
      </>
    )),
    // 3
    perService((service) => (
      <Tiles
        options={BUFFERS}
        value={service.bufferMin}
        onChange={(v) => setService(service.slug, { bufferMin: v })}
        custom={formatSpan}
      />
    )),
    // 4
    perService((service) => (
      <Tiles
        options={LEADS}
        value={service.leadTimeMin}
        onChange={(v) => setService(service.slug, { leadTimeMin: v })}
        custom={formatSpan}
      />
    )),
    // 5
    perService((service) => (
      <Tiles
        options={APPROVAL}
        value={service.requiresApproval}
        onChange={(v) => setService(service.slug, { requiresApproval: v })}
      />
    )),
    // 6
    perService((service) => (
      <div {...stylex.props(s.inline)}>
        <TextInput
          label="Ort (optional)"
          value={service.location}
          onChange={(v) => setService(service.slug, { location: v })}
        />
        <NumberInput
          label={`Preis (${settings.currency || "EUR"}), 0 = kostenlos`}
          value={service.price}
          onChange={(v) => setService(service.slug, { price: Number(v) || 0 })}
        />
      </div>
    )),
    // 7
    <>
      <div {...stylex.props(s.tiles)}>
        {WEEKDAYS.map((day) => (
          <Tile
            key={day.value}
            label={day.label}
            isSelected={answers.days.includes(day.value)}
            onChange={(on) =>
              setDays(on ? [...answers.days, day.value] : answers.days.filter((d) => d !== day.value))
            }
          />
        ))}
      </div>
      <div {...stylex.props(s.inline)}>
        <Button variant="secondary" label="Mo–Fr" onClick={() => setDays([1, 2, 3, 4, 5])} />
        <Button variant="secondary" label="Wochenende" onClick={() => setDays([6, 7])} />
      </div>
    </>,
    // 8
    <>
      <Switch label="Nicht jeden Tag gleich" value={perDay} onChange={setPerDay} />
      {perDay ? (
        answers.days.map((day) => (
          <Block key={day} title={WEEKDAY_LONG[day]}>
            <HoursPicker
              value={answers.windows[day] ?? []}
              onChange={(value) => setSchedule({ windows: { ...answers.windows, [day]: value } })}
            />
          </Block>
        ))
      ) : (
        <HoursPicker value={answers.windows[answers.days[0]] ?? []} onChange={setAllHours} />
      )}
    </>,
    // 9
    <>
      <Tiles
        options={[
          { value: false, label: "Nein, alles jederzeit" },
          { value: true, label: "Ja" },
        ]}
        value={answers.restrict}
        onChange={(v) => setSchedule({ restrict: v })}
      />
      {answers.restrict &&
        perService((service) => (
          <Tiles
            options={restrictionOptions}
            value={service.restriction}
            onChange={(v) => {
              setSchedule({
                services: answers.services.map((sv) => (sv.slug === service.slug ? { ...sv, restriction: v } : sv)),
              });
            }}
          />
        ))}
    </>,
    // 10
    <Tiles options={MAX_PER_DAY} value={answers.maxPerDay} onChange={(v) => set({ maxPerDay: v })} custom={String} />,
    // 11
    <Tiles
      options={HORIZON}
      value={answers.horizonDays}
      onChange={(v) => set({ horizonDays: v })}
      custom={(v) => `${v} Tage`}
    />,
    // 12
    changes.length === 0 ? (
      <Text type="body">Dein Plan bleibt, wie er ist.</Text>
    ) : (
      (["warnung", "neu", "geändert", "deaktiviert", "entfällt"] as const).map((kind) => {
        const group = changes.filter((c) => c.kind === kind);
        return (
          group.length > 0 && (
            <Block key={kind} title={KIND_LABEL[kind]}>
              <ul {...stylex.props(s.list)}>
                {group.map((c) => (
                  <li key={c.text}><Text type="body">{c.text}</Text></li>
                ))}
              </ul>
            </Block>
          )
        );
      })
    ),
  ];

  const hints = changes.filter((change) => STEPS[step].fields.includes(change.field));
  const blocked =
    (step === 0 && answers.services.length === 0) ||
    (step === 6 && answers.days.length === 0) ||
    (step === 1 && answers.services.some((sv) => sv.durationMin < 5));

  const handleApply = async () => {
    setSaving(true);
    setError("");
    try {
      await applyPlan(planFromAnswers(answers, current));
      await refresh();
      toast.success("Dein Terminplan ist übernommen");
      navigate("/appointments/availability");
    } catch (err) {
      // Antworten bleiben stehen — der Server hat nichts verändert
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Geführt einrichten" subtitle={`Frage ${step + 1} von ${STEPS.length}`}>
      <div {...stylex.props(s.column)}>
        <ProgressBar label="Fortschritt" isLabelHidden value={step + 1} max={STEPS.length} />
        <Heading level={5} data-testid="interview-schritt">{STEPS[step].title}</Heading>

        {questions[step]}

        {step === 1 && answers.services.some((sv) => sv.durationMin < 5) && (
          <Banner status="warning" title="Die Dauer muss mindestens 5 Minuten betragen." />
        )}

        {step !== SUMMARY && hints.length > 0 && (
          <div data-testid="interview-aenderungen">
            <Banner status="info" title="Das ändert sich an deinem Plan" defaultIsExpanded>
              <ul {...stylex.props(s.list)}>
                {hints.map((c) => (
                  <li key={c.text}><Text type="body">{c.text}</Text></li>
                ))}
              </ul>
            </Banner>
          </div>
        )}

        {error && <Banner status="error" title="Nicht übernommen" description={error} />}

        <div {...stylex.props(s.actions)}>
          <Button
            variant="ghost"
            label={step === 0 ? "Abbrechen" : "Zurück"}
            onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
          />
          {step === SUMMARY ? (
            <Button
              data-testid="interview-uebernehmen"
              label="Plan übernehmen"
              isLoading={saving}
              onClick={() => void handleApply()}
            />
          ) : (
            <Button
              data-testid="interview-weiter"
              label="Weiter"
              isDisabled={blocked}
              onClick={() => setStep(step + 1)}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
