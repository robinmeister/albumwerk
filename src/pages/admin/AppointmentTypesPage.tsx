// Termin-Arten verwalten (docs/terminbuchung.md §2.2).
//
// Eine Fotograf:in verkauft selten nur eine Sache: Kennenlerngespräch,
// Portraitshooting, Hochzeits-Vorgespräch. Verschiedene Dauern, Orte, Preise —
// und verschiedene Regeln, ob sofort zugesagt wird.
//
// Gibt es nur eine aktive Art, überspringt das Buchungsformular später die
// Auswahl. Der einfache Fall kostet die Kund:in also keinen Klick.

import { ReactElement, useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Plus, Trash2 } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { toast } from "react-toastify";

import DeleteModal from "../../components/widgets/DeleteModal";
import EmptyState from "../../components/feedback/EmptyState";
import Page from "../../components/layout/Page";
import { useSettings } from "../../context/SettingsContext";
import AppointmentsTabs from "../../features/Appointments/components/AppointmentsTabs";
import {
  AppointmentType,
  AppointmentTypeInput,
  PhoneMode,
  deleteType,
  fetchTypes,
  saveType,
} from "../../features/Appointments/api";
import { slugify } from "../../utils/slug";

const PHONE_OPTIONS: { value: PhoneMode; label: string }[] = [
  { value: "off", label: "Nicht abfragen" },
  { value: "optional", label: "Freiwillig" },
  { value: "required", label: "Pflichtfeld" },
];

const EMPTY: AppointmentTypeInput = {
  name: "",
  slug: "",
  description: "",
  location: "",
  durationMin: 60,
  bufferMin: 0,
  startIntervalMin: 0,
  leadTimeMin: 1440,
  requiresApproval: false,
  phoneMode: "optional",
  price: 0,
  active: true,
  sort: 0,
};

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
    padding: 16,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
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

export default function AppointmentTypesPage(): ReactElement {
  const { settings } = useSettings();
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [draft, setDraft] = useState<AppointmentTypeInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AppointmentType | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTypes(await fetchTypes());
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

  const set = (patch: Partial<AppointmentTypeInput>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  const handleSave = async () => {
    if (!draft) return;
    const slug = draft.slug.trim() || slugify(draft.name);
    if (!draft.name.trim() || !slug) {
      toast.error("Name und Kurz-Link werden gebraucht.");
      return;
    }
    if (draft.durationMin < 5) {
      toast.error("Die Dauer muss mindestens 5 Minuten betragen.");
      return;
    }
    setSaving(true);
    try {
      await saveType({ ...draft, slug });
      toast.success("Termin-Art gespeichert");
      setDraft(null);
      await load();
    } catch {
      toast.error("Speichern fehlgeschlagen — ist der Kurz-Link schon vergeben?");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteType(pendingDelete.id);
      toast.success("Termin-Art gelöscht");
      await load();
    } catch {
      // Bestehende Buchungen verweisen auf die Art; PocketBase verhindert das
      // Löschen dann. Deaktivieren ist ohnehin der richtige Weg.
      toast.error(
        "Löschen fehlgeschlagen — vermutlich gibt es Termine dieser Art. Deaktiviere sie stattdessen.",
      );
    } finally {
      setPendingDelete(null);
    }
  };

  if (loading) {
    return (
      <Page title="Termin-Arten">
        <div {...stylex.props(s.center)}>
          <Spinner />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Termin-Arten"
      subtitle="Was können deine Kund:innen bei dir buchen?"
      actions={
        !draft && (
          <Button icon={<Plus />} label="Neue Art" onClick={() => setDraft({ ...EMPTY })} />
        )
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

        {draft && (
          <div data-testid="art-formular" {...stylex.props(s.card)}>
            <Heading level={6}>
              {draft.id ? "Termin-Art bearbeiten" : "Neue Termin-Art"}
            </Heading>

            <div {...stylex.props(s.grid)}>
              <TextInput
                width="100%"
                label="Name"
                value={draft.name}
                onChange={(value) =>
                  set({
                    name: value,
                    // Solange die Art neu ist, folgt der Kurz-Link dem Namen.
                    // Danach nicht mehr: Er steckt in eingebetteten Links auf
                    // der Website der Fotograf:in und würde sie brechen.
                    slug: draft.id ? draft.slug : slugify(value),
                  })
                }
              />
              <TextInput
                width="100%"
                label="Kurz-Link"
                description="Damit lässt sich diese Leistung im eingebetteten Formular vorwählen."
                value={draft.slug}
                onChange={(value) => set({ slug: slugify(value) })}
              />
              <NumberInput
                width="100%"
                label="Dauer (Minuten)"
                value={draft.durationMin}
                onChange={(value) => set({ durationMin: Number(value) || 0 })}
              />
              <NumberInput
                width="100%"
                label="Puffer danach (Minuten)"
                description="Auf-/Abbau oder Fahrtzeit. Wirkt nur nach dem Termin."
                value={draft.bufferMin}
                onChange={(value) => set({ bufferMin: Number(value) || 0 })}
              />
              <NumberInput
                width="100%"
                label="Abstand der Startzeiten (Minuten)"
                description="Leer lassen = Dauer + Puffer, also dicht an dicht."
                value={draft.startIntervalMin || null}
                onChange={(value) => set({ startIntervalMin: Number(value) || 0 })}
              />
              <NumberInput
                width="100%"
                label="Mindestvorlauf (Minuten)"
                description="1440 = einen Tag vorher. Ein kurzes Gespräch darf spontaner sein als ein Shooting."
                value={draft.leadTimeMin}
                onChange={(value) => set({ leadTimeMin: Number(value) || 0 })}
              />
              <NumberInput
                width="100%"
                label={`Preis (${settings.currency || "EUR"})`}
                description="Wird nur angezeigt — bezahlt wird nicht bei der Buchung."
                value={draft.price}
                onChange={(value) => set({ price: Number(value) || 0 })}
              />
              <Selector
                width="100%"
                label="Telefonnummer"
                placeholder="Bitte wählen"
                options={PHONE_OPTIONS}
                value={draft.phoneMode}
                onChange={(value) => value && set({ phoneMode: value as PhoneMode })}
              />
              <TextInput
                width="100%"
                label="Ort (optional)"
                description="Steht in der Bestätigung und im Kalendereintrag."
                value={draft.location}
                onChange={(value) => set({ location: value })}
              />
              <NumberInput
                width="100%"
                label="Reihenfolge"
                value={draft.sort}
                onChange={(value) => set({ sort: Number(value) || 0 })}
              />
            </div>

            <TextArea
              width="100%"
              rows={2}
              label="Beschreibung (optional)"
              description="Ein bis zwei Sätze — erscheint im Buchungsformular."
              value={draft.description}
              onChange={(value) => set({ description: value })}
            />

            <Switch
              label="Erst nach deiner Zusage verbindlich"
              description="Die Anfrage hält den Termin frei und verfällt, wenn du nicht reagierst. Für ein kostenloses Erstgespräch meist unnötig."
              value={draft.requiresApproval}
              onChange={(value) => set({ requiresApproval: value })}
            />
            <Switch
              label="Buchbar"
              description="Deaktivierte Arten verschwinden aus dem Buchungsformular. Bestehende Termine bleiben."
              value={draft.active}
              onChange={(value) => set({ active: value })}
            />

            <div {...stylex.props(s.actions)}>
              <Button variant="ghost" label="Abbrechen" onClick={() => setDraft(null)} />
              <Button label="Speichern" isLoading={saving} onClick={() => void handleSave()} />
            </div>
          </div>
        )}

        {types.length === 0 && !draft ? (
          <EmptyState
            title="Noch keine Termin-Arten"
            description="Lege zuerst an, was buchbar sein soll — zum Beispiel „Kennenlerngespräch, 20 Minuten“ und „Portraitshooting, 90 Minuten“."
          />
        ) : (
          types.map((type) => (
            <div key={type.id} data-testid="art-eintrag" {...stylex.props(s.row)}>
              <div {...stylex.props(s.rowMain)}>
                <Text type="body" weight="semibold">
                  {type.name}
                </Text>
                <Text type="supporting" color="secondary">
                  {type.durationMin} Minuten
                  {type.bufferMin > 0 ? ` + ${type.bufferMin} Puffer` : ""}
                  {type.price > 0 ? ` · ${type.price} ${settings.currency || "EUR"}` : " · kostenlos"}
                  {type.location ? ` · ${type.location}` : ""}
                </Text>
                <div {...stylex.props(s.badges)}>
                  {!type.active && <Badge variant="neutral" label="Nicht buchbar" />}
                  {type.requiresApproval && <Badge variant="warning" label="Mit Zusage" />}
                  <Badge variant="info" label={`/${type.slug}`} />
                </div>
              </div>
              <div {...stylex.props(s.badges)}>
                <Button
                  variant="ghost"
                  size="sm"
                  label="Bearbeiten"
                  onClick={() => setDraft({ ...type })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 />}
                  label="Löschen"
                  onClick={() => setPendingDelete(type)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <DeleteModal
        open={Boolean(pendingDelete)}
        setOpen={(open) => !open && setPendingDelete(null)}
        onDelete={() => void handleDelete()}
        name={`die Termin-Art „${pendingDelete?.name ?? ""}“`}
      />
    </Page>
  );
}
