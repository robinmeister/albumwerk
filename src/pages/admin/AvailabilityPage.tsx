// Verfügbarkeit und Leitplanken (docs/terminbuchung.md §2, §2.4).
//
// Drei Abschnitte, in der Reihenfolge, in der man sie einrichtet:
//
//   1. Freischalten — solange das aus ist, kann niemand buchen.
//   2. Wochenregeln — „Di 10–16, Sa 9–13“. Sie laufen unbegrenzt weiter;
//      daraus werden die buchbaren Zeiten berechnet, nicht gespeichert.
//   3. Leitplanken — Vorlauf, Horizont, Tageslimit, Fristen.
//
// Einzelne Sperren und Sondertermine stehen bewusst NICHT hier, sondern im
// Kalender: Dort sieht man, was man sperrt. Diese Seite ist Einrichtung, der
// Kalender ist Tagesgeschäft.

import { ReactElement, useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as stylex from "@stylexjs/stylex";
import { toast } from "react-toastify";

import EmptyState from "../../components/feedback/EmptyState";
import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { SETTINGS_RECORD_ID } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import AppointmentsTabs from "../../features/Appointments/components/AppointmentsTabs";
import {
  AppointmentType,
  AvailabilityRule,
  AvailabilityRuleInput,
  deleteRule,
  fetchRules,
  fetchTypes,
  saveRule,
} from "../../features/Appointments/api";
import { formatWindow, minutesToTime, timeToMinutes } from "../../features/Booking/time";

const WEEKDAYS = [
  { value: "1", label: "Montag" },
  { value: "2", label: "Dienstag" },
  { value: "3", label: "Mittwoch" },
  { value: "4", label: "Donnerstag" },
  { value: "5", label: "Freitag" },
  { value: "6", label: "Samstag" },
  { value: "7", label: "Sonntag" },
];

const WEEKDAY_LABEL = new Map(WEEKDAYS.map((day) => [Number(day.value), day.label]));

const s = stylex.create({
  column: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: 12,
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
  },
  rowMain: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
  badges: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@media (min-width: 720px)": "repeat(2, minmax(0, 1fr))",
    },
    gap: 16,
  },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  center: { display: "flex", justifyContent: "center", padding: 48 },
});

const EMPTY_RULE: AvailabilityRuleInput = {
  weekday: 6,
  startMinute: 540,
  endMinute: 720,
  allowedTypes: [],
  active: true,
};

export default function AvailabilityPage(): ReactElement {
  const { settings, refresh } = useSettings();
  const navigate = useNavigate();

  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [draft, setDraft] = useState<AvailabilityRuleInput | null>(null);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("12:00");
  const [savingSettings, setSavingSettings] = useState(false);
  // Eigener Entwurfszustand: Bei einem Speichern pro Tastendruck stünde nach
  // dem Tippen der ersten Ziffer von "90" für einen Moment die 9 als Horizont
  // in der Datenbank — und jede Zwischenstufe löst einen Schreibvorgang aus.
  const [limits, setLimits] = useState({
    bookingHorizonDays: settings.bookingHorizonDays,
    bookingMaxPerDay: settings.bookingMaxPerDay,
    bookingPendingExpiryHours: settings.bookingPendingExpiryHours,
    bookingCancelDeadlineHours: settings.bookingCancelDeadlineHours,
    bookingReminderHours: settings.bookingReminderHours,
    bookingNotificationEmail: settings.bookingNotificationEmail,
  });
  const [limitsDirty, setLimitsDirty] = useState(false);

  // Nachziehen, wenn die Einstellungen von außen neu geladen wurden — aber nur,
  // solange nichts Ungespeichertes im Formular steht.
  useEffect(() => {
    if (limitsDirty) return;
    setLimits({
      bookingHorizonDays: settings.bookingHorizonDays,
      bookingMaxPerDay: settings.bookingMaxPerDay,
      bookingPendingExpiryHours: settings.bookingPendingExpiryHours,
      bookingCancelDeadlineHours: settings.bookingCancelDeadlineHours,
      bookingReminderHours: settings.bookingReminderHours,
      bookingNotificationEmail: settings.bookingNotificationEmail,
    });
  }, [settings, limitsDirty]);

  const load = async () => {
    setLoading(true);
    try {
      const [loadedRules, loadedTypes] = await Promise.all([fetchRules(), fetchTypes()]);
      setRules(loadedRules);
      setTypes(loadedTypes);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = (rule: AvailabilityRule) => {
    setDraft({ ...rule });
    setFrom(minutesToTime(rule.startMinute));
    setTo(minutesToTime(rule.endMinute));
  };

  const startNew = () => {
    setDraft({ ...EMPTY_RULE });
    setFrom("09:00");
    setTo("12:00");
  };

  const handleSaveRule = async () => {
    if (!draft) return;
    const startMinute = timeToMinutes(from);
    let endMinute = timeToMinutes(to);
    if (startMinute === null || endMinute === null) {
      toast.error("Bitte Uhrzeiten als HH:MM angeben.");
      return;
    }
    // Ein Fenster, das vor seinem Beginn endet, ist als „über Mitternacht“
    // gemeint — 22:00 bis 01:00. Der Rechner erwartet dafür Minuten über 1440.
    if (endMinute <= startMinute) {
      endMinute += 1440;
    }
    if (endMinute - startMinute > 1440) {
      toast.error("Ein Zeitfenster darf höchstens 24 Stunden umfassen.");
      return;
    }
    try {
      await saveRule({ ...draft, startMinute, endMinute });
      toast.success("Zeitfenster gespeichert");
      setDraft(null);
      await load();
    } catch {
      toast.error("Speichern fehlgeschlagen");
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRule(id);
      toast.success("Zeitfenster entfernt");
      await load();
    } catch {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  // Die Leitplanken liegen im Settings-Singleton, nicht auf den Regeln —
  // sie gelten für die ganze Instanz.
  const setLimit = (patch: Partial<typeof limits>) => {
    setLimits((current) => ({ ...current, ...patch }));
    setLimitsDirty(true);
  };

  const saveSettings = async (patch: Record<string, unknown>) => {
    setSavingSettings(true);
    try {
      await pb.collection("settings").update(SETTINGS_RECORD_ID, patch);
      await refresh();
      toast.success("Gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <Page title="Verfügbarkeit">
        <div {...stylex.props(s.center)}>
          <Spinner />
        </div>
      </Page>
    );
  }

  const typeOptions = types
    .filter((type) => type.active)
    .map((type) => ({ value: type.id, label: type.name }));

  return (
    <Page
      title="Verfügbarkeit"
      subtitle="Wann kann bei dir gebucht werden?"
      actions={
        <Button
          variant="secondary"
          icon={<Wand2 />}
          label="Geführt einrichten"
          onClick={() => navigate("/appointments/setup")}
        />
      }
    >
      <div {...stylex.props(s.column)}>
        <AppointmentsTabs />

        {unavailable && (
          <Banner status="warning" title="Die Terminbuchung ist auf dieser Instanz noch nicht eingerichtet.">
            <Text type="body">
              Starte deine Instanz einmal neu — die nötige Migration läuft dabei
              automatisch mit.
            </Text>
          </Banner>
        )}

        {/* --- Freischalten ------------------------------------------------ */}
        <div {...stylex.props(s.card)}>
          <Switch
            label="Terminbuchung aktiv"
            description="Solange das aus ist, kann niemand einen Termin buchen — weder auf deiner Website noch in der App."
            value={settings.bookingEnabled}
            isLoading={savingSettings}
            onChange={(value) => void saveSettings({ bookingEnabled: value })}
          />
          {rules.length === 0 && settings.bookingEnabled && (
            <Banner
              status="warning"
              title="Ohne Zeitfenster ist nichts buchbar."
              description="Lege unten mindestens ein wöchentliches Zeitfenster an."
            />
          )}
        </div>

        {/* --- Wochenregeln ------------------------------------------------ */}
        <div {...stylex.props(s.card)}>
          <div {...stylex.props(s.row)} style={{ border: "none", padding: 0 }}>
            <div {...stylex.props(s.rowMain)}>
              <Heading level={6}>Wöchentliche Zeitfenster</Heading>
              <Text type="supporting" color="secondary">
                Diese Fenster wiederholen sich jede Woche. Urlaub und einzelne
                Sperren trägst du im Kalender ein.
              </Text>
            </div>
            {!draft && <Button icon={<Plus />} size="sm" label="Zeitfenster" onClick={startNew} />}
          </div>

          {draft && (
            <div data-testid="regel-formular" {...stylex.props(s.column)}>
              <div {...stylex.props(s.grid)}>
                <Selector
                  width="100%"
                  label="Wochentag"
                  placeholder="Bitte wählen"
                  options={WEEKDAYS}
                  value={String(draft.weekday)}
                  onChange={(value) => value && setDraft({ ...draft, weekday: Number(value) })}
                />
                <div {...stylex.props(s.grid)}>
                  <TextInput width="100%" label="Von" value={from} onChange={setFrom} />
                  <TextInput width="100%" label="Bis" value={to} onChange={setTo} />
                </div>
              </div>
              {typeOptions.length > 0 && (
                <MultiSelector
                  triggerDisplay="labels"
                  width="100%"
                  label="Nur für diese Leistungen"
                  description="Nichts ausgewählt = alle Leistungen dürfen in diesem Fenster gebucht werden."
                  placeholder="Alle Leistungen"
                  options={typeOptions}
                  value={draft.allowedTypes}
                  onChange={(value) => setDraft({ ...draft, allowedTypes: value as string[] })}
                />
              )}
              <Switch
                label="Aktiv"
                value={draft.active}
                onChange={(value) => setDraft({ ...draft, active: value })}
              />
              <div {...stylex.props(s.actions)}>
                <Button variant="ghost" label="Abbrechen" onClick={() => setDraft(null)} />
                <Button label="Speichern" onClick={() => void handleSaveRule()} />
              </div>
            </div>
          )}

          {rules.length === 0 && !draft ? (
            <EmptyState
              dense
              title="Noch keine Zeitfenster"
              description="Trage ein, wann du grundsätzlich buchbar bist — zum Beispiel „Samstag 9 bis 13 Uhr“."
              action={{ label: "Geführt einrichten", icon: <Wand2 />, onClick: () => navigate("/appointments/setup") }}
            />
          ) : (
            rules.map((rule) => (
              <div key={rule.id} data-testid="regel-eintrag" {...stylex.props(s.row)}>
                <div {...stylex.props(s.rowMain)}>
                  <Text type="body" weight="semibold">
                    {WEEKDAY_LABEL.get(rule.weekday) ?? "?"} · {formatWindow(rule.startMinute, rule.endMinute)}
                  </Text>
                  <div {...stylex.props(s.badges)}>
                    {!rule.active && <Badge variant="neutral" label="Inaktiv" />}
                    {rule.allowedTypes.length > 0 &&
                      rule.allowedTypes.map((id) => (
                        <Badge
                          key={id}
                          variant="info"
                          label={types.find((type) => type.id === id)?.name ?? "?"}
                        />
                      ))}
                  </div>
                </div>
                <div {...stylex.props(s.badges)}>
                  {/* Zeilenaktionen als secondary — als Ghost waren sie von
                      Fließtext nicht zu unterscheiden. */}
                  <Button variant="secondary" size="sm" label="Bearbeiten" onClick={() => startEdit(rule)} />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Trash2 />}
                    label="Entfernen"
                    onClick={() => void handleDeleteRule(rule.id)}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- Leitplanken -------------------------------------------------- */}
        <div {...stylex.props(s.card)}>
          <div {...stylex.props(s.rowMain)}>
            <Heading level={6}>Grenzen</Heading>
            <Text type="supporting" color="secondary">
              Diese Werte schützen dich vor deinem eigenen Kalender. Der
              Mindestvorlauf und der Puffer stehen bei der jeweiligen
              Termin-Art, weil sie sich je Leistung unterscheiden.
            </Text>
          </div>

          <div {...stylex.props(s.grid)}>
            <NumberInput
              width="100%"
              label="Buchbar bis wie viele Tage im Voraus"
              value={limits.bookingHorizonDays}
              onChange={(value) => setLimit({ bookingHorizonDays: Number(value) || 0 })}
            />
            <NumberInput
              width="100%"
              label="Höchstens Termine pro Tag"
              description="0 = unbegrenzt. Die Einstellung, die dich vor dem dritten Shooting an einem Tag rettet."
              value={limits.bookingMaxPerDay}
              onChange={(value) => setLimit({ bookingMaxPerDay: Number(value) || 0 })}
            />
            <NumberInput
              width="100%"
              label="Anfragen verfallen nach (Stunden)"
              description="Solange hält eine unbeantwortete Anfrage ihren Termin frei."
              value={limits.bookingPendingExpiryHours}
              onChange={(value) => setLimit({ bookingPendingExpiryHours: Number(value) || 0 })}
            />
            <NumberInput
              width="100%"
              label="Absagen möglich bis (Stunden vorher)"
              value={limits.bookingCancelDeadlineHours}
              onChange={(value) => setLimit({ bookingCancelDeadlineHours: Number(value) || 0 })}
            />
            <NumberInput
              width="100%"
              label="Erinnerung vorher (Stunden)"
              description="0 = keine Erinnerung. Erinnerte Termine werden deutlich seltener vergessen."
              value={limits.bookingReminderHours}
              onChange={(value) => setLimit({ bookingReminderHours: Number(value) || 0 })}
            />
            <TextInput
              width="100%"
              label="Benachrichtigungen an"
              description="Leer = deine Kontaktadresse. Am besten das Postfach, in das du sofort schaust."
              value={limits.bookingNotificationEmail}
              onChange={(value) => setLimit({ bookingNotificationEmail: value })}
            />
          </div>

          <div {...stylex.props(s.actions)}>
            <Button
              label="Grenzen speichern"
              isDisabled={!limitsDirty}
              isLoading={savingSettings}
              onClick={() => void saveSettings(limits).then(() => setLimitsDirty(false))}
            />
          </div>
        </div>
      </div>
    </Page>
  );
}
