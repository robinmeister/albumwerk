// Operator-authored help articles. The shipped articles in src/content/help are
// the base documentation; here the operator adds their own or overrides a
// shipped one by reusing its slug.

import { ReactElement, Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ArrowLeft, Plus as Add, Trash2 as Delete } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import DeleteModal from "../../components/widgets/DeleteModal";
import EmptyState from "../../components/feedback/EmptyState";
import Page from "../../components/layout/Page";
import {
  HelpArticle,
  HelpAudience,
  HelpCategoryKey,
  helpArticles,
  helpCategories,
} from "../../content/help";
import {
  CustomArticleInput,
  deleteCustomArticle,
  fetchAllCustomArticles,
  saveCustomArticle,
  slugify,
} from "../../utils/help";

// Same reasoning as AdminLegalPage: TipTap is large and only ever needed here.
const RichTextEditor = lazy(() => import("../../components/widgets/RichTextEditor"));

const AUDIENCE_LABELS: Record<HelpAudience, string> = {
  admin: "Nur für dich (Admin)",
  customer: "Angemeldete Kunden",
  public: "Auch ohne Anmeldung",
};

const AUDIENCE_OPTIONS = (Object.keys(AUDIENCE_LABELS) as HelpAudience[]).map(
  (value) => ({ value, label: AUDIENCE_LABELS[value] }),
);

const CATEGORY_OPTIONS = helpCategories.map((c) => ({
  value: c.key,
  label: c.label,
}));

const EMPTY: CustomArticleInput = {
  slug: "",
  title: "",
  summary: "",
  audience: ["customer"],
  category: "basics",
  bodyHtml: "",
  sort: 0,
  published: true,
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

export default function HelpAdminPage(): ReactElement {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [draft, setDraft] = useState<CustomArticleInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<HelpArticle | null>(null);

  const shippedSlugs = useMemo(
    () => new Set(helpArticles.map((a) => a.slug)),
    [],
  );

  const load = async () => {
    setLoading(true);
    try {
      setArticles(await fetchAllCustomArticles());
      setUnavailable(false);
    } catch {
      // Most likely the migration has not run on this instance yet.
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = (article: HelpArticle) => {
    setDraft({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      audience: article.audience,
      category: article.category,
      bodyHtml: article.bodyHtml,
      sort: article.sort ?? 0,
      published: article.published ?? false,
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    const slug = draft.slug.trim() || slugify(draft.title);
    if (!draft.title.trim() || !slug) {
      toast.error("Titel und Kurz-Link werden gebraucht.");
      return;
    }
    if (draft.audience.length === 0) {
      toast.error("Wähle mindestens eine Zielgruppe.");
      return;
    }

    setSaving(true);
    try {
      await saveCustomArticle({ ...draft, slug });
      toast.success("Artikel gespeichert");
      setDraft(null);
      await load();
    } catch {
      toast.error("Speichern fehlgeschlagen — ist der Kurz-Link schon vergeben?");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete?.id) return;
    try {
      await deleteCustomArticle(pendingDelete.id);
      toast.success("Artikel gelöscht");
      await load();
    } catch {
      toast.error("Löschen fehlgeschlagen");
    } finally {
      setPendingDelete(null);
    }
  };

  const set = (patch: Partial<CustomArticleInput>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  return (
    <Page
      title="Eigene Hilfe-Artikel"
      subtitle="Ergänze die mitgelieferte Dokumentation um eigene Texte für deine Kunden."
      breadcrumps={[{ name: "Hilfe", href: "/help" }, { name: "Eigene Artikel" }]}
      actions={
        <Button
          variant="ghost"
          icon={<ArrowLeft />}
          label="Zur Hilfe"
          onClick={() => navigate("/help")}
        />
      }
    >
      <div {...stylex.props(s.column)}>
        {unavailable && (
          <Banner
            status="warning"
            title="Eigene Artikel sind auf dieser Instanz noch nicht verfügbar."
          >
            <Text type="body">
              Die dafür nötige Datenbank-Änderung wurde noch nicht eingespielt.
              Starte deine Instanz einmal neu — die Migration läuft dabei
              automatisch mit.
            </Text>
          </Banner>
        )}

        {draft ? (
          <div {...stylex.props(s.card)}>
            <Heading level={6}>
              {draft.id ? "Artikel bearbeiten" : "Neuer Artikel"}
            </Heading>

            <div {...stylex.props(s.grid)}>
              <TextInput
                width="100%"
                label="Titel"
                value={draft.title}
                onChange={(v) =>
                  set({
                    title: v,
                    // keep the slug in sync until the article exists; changing
                    // it afterwards would break links that already point at it
                    slug: draft.id ? draft.slug : slugify(v),
                  })
                }
              />
              <TextInput
                width="100%"
                label="Kurz-Link"
                description={
                  shippedSlugs.has(draft.slug)
                    ? "Überschreibt den gleichnamigen mitgelieferten Artikel."
                    : "Teil der Adresse: /help/<Kurz-Link>"
                }
                value={draft.slug}
                onChange={(v) => set({ slug: slugify(v) })}
              />
              <Selector
                placeholder="Bitte wählen"
                width="100%"
                label="Kategorie"
                options={CATEGORY_OPTIONS}
                value={draft.category}
                onChange={(v) => v && set({ category: v as HelpCategoryKey })}
              />
              <MultiSelector
                placeholder="Bitte wählen"
                width="100%"
                label="Sichtbar für"
                options={AUDIENCE_OPTIONS}
                value={draft.audience}
                onChange={(v) => set({ audience: v as HelpAudience[] })}
              />
            </div>

            <TextArea
              width="100%"
              label="Kurzbeschreibung"
              description="Ein Satz — erscheint in der Übersicht und in den Hilfe-Hinweisen."
              rows={2}
              value={draft.summary}
              onChange={(v) => set({ summary: v })}
            />

            <Suspense
              fallback={
                <Text type="supporting" color="secondary">
                  Editor wird geladen …
                </Text>
              }
            >
              <RichTextEditor
                label="Inhalt"
                value={draft.bodyHtml}
                onChange={(html) => set({ bodyHtml: html })}
                minHeight={360}
              />
            </Suspense>

            <Switch
              label="Veröffentlicht — für die gewählte Zielgruppe sichtbar"
              value={draft.published}
              onChange={() => set({ published: !draft.published })}
            />

            <div {...stylex.props(s.actions)}>
              <Button
                variant="secondary"
                label="Abbrechen"
                onClick={() => setDraft(null)}
              />
              <Button
                variant="primary"
                label="Speichern"
                isLoading={saving}
                isDisabled={saving}
                onClick={() => void handleSave()}
              />
            </div>
          </div>
        ) : (
          <div {...stylex.props(s.actions)}>
            <Button
              variant="primary"
              icon={<Add />}
              label="Neuer Artikel"
              isDisabled={unavailable}
              onClick={() => setDraft({ ...EMPTY })}
            />
          </div>
        )}

        {loading ? (
          <div {...stylex.props(s.center)}>
            <Spinner size="md" />
          </div>
        ) : articles.length === 0 ? (
          !unavailable && (
            <EmptyState
              dense
              title="Noch keine eigenen Artikel"
              description="Die mitgelieferte Hilfe ist bereits vollständig nutzbar. Eigene Artikel lohnen sich für alles, was nur bei dir gilt — Ablauf, Fristen, Lieferzeiten."
            />
          )
        ) : (
          articles.map((article) => (
            <div key={article.id} {...stylex.props(s.row)}>
              <div {...stylex.props(s.rowMain)}>
                <Text type="label" weight="semibold">
                  {article.title}
                </Text>
                <Text type="supporting" color="secondary" maxLines={1}>
                  /help/{article.slug}
                </Text>
                <div {...stylex.props(s.badges)}>
                  <Badge
                    variant={article.published ? "success" : "neutral"}
                    label={article.published ? "Veröffentlicht" : "Entwurf"}
                  />
                  {shippedSlugs.has(article.slug) && (
                    <Badge variant="info" label="Überschreibt Standardartikel" />
                  )}
                  {article.audience.map((a) => (
                    <Badge key={a} variant="neutral" label={AUDIENCE_LABELS[a]} />
                  ))}
                </div>
              </div>
              <div {...stylex.props(s.badges)}>
                <Button
                  variant="secondary"
                  label="Bearbeiten"
                  onClick={() => startEdit(article)}
                />
                <IconButton
                  variant="ghost"
                  icon={<Delete />}
                  label="Artikel löschen"
                  tooltip="Artikel löschen"
                  onClick={() => setPendingDelete(article)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <DeleteModal
        name={`den Artikel „${pendingDelete?.title ?? ""}“`}
        open={Boolean(pendingDelete)}
        setOpen={(open) => !open && setPendingDelete(null)}
        onDelete={() => void handleDelete()}
      />
    </Page>
  );
}
