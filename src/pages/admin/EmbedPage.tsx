// Buchung in die eigene Website einbetten (docs/terminbuchung.md §9.2, §9.3).
//
// Diese Seite entscheidet, ob das Feature in der Praxis funktioniert. Die
// Allowlist ist die klassische Falle: Code eingebaut → weißes Rechteck →
// Fehler steht nur in der Browser-Konsole, in die niemand schaut. Drei
// Maßnahmen dagegen sind hier eingebaut:
//
//   1. Vorbelegung aus der bereits erfassten Website-Adresse.
//   2. Der Generator gibt KEINEN Code heraus, solange keine Domain
//      eingetragen ist — der Fehler kann gar nicht erst entstehen.
//   3. www-Varianten ergänzt der Server automatisch (pb_hooks/lib/embedlib.js).
//
// Dazu eine Live-Vorschau: Sehen schlägt Lesen.

import { ReactElement, useEffect, useMemo, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Check, Copy } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { SETTINGS_RECORD_ID } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import AppointmentsTabs from "../../features/Appointments/components/AppointmentsTabs";
import { AppointmentType, fetchTypes } from "../../features/Appointments/api";

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
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    margin: 0,
    padding: 12,
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-muted)",
  },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  preview: {
    width: "100%",
    minHeight: 520,
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-element)",
    backgroundColor: "#ffffff",
  },
  center: { display: "flex", justifyContent: "center", padding: 48 },
});

export default function EmbedPage(): ReactElement {
  const { settings, refresh } = useSettings();

  const [origins, setOrigins] = useState(settings.bookingEmbedOrigins);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [typeSlug, setTypeSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    void fetchTypes(false)
      .then(setTypes)
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!dirty) setOrigins(settings.bookingEmbedOrigins);
  }, [settings.bookingEmbedOrigins, dirty]);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const hasOrigins = origins.trim().length > 0;
  const saved = origins.trim() === settings.bookingEmbedOrigins.trim();

  const query = typeSlug ? `?type=${encodeURIComponent(typeSlug)}` : "";
  const scriptSnippet = useMemo(
    () =>
      `<script src="${appUrl}/embed.js"${typeSlug ? ` data-type="${typeSlug}"` : ""}></script>`,
    [appUrl, typeSlug],
  );
  const iframeSnippet = useMemo(
    () =>
      `<iframe src="${appUrl}/embed/${query}" width="100%" height="640" frameborder="0" title="Termin buchen"></iframe>`,
    [appUrl, query],
  );

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      toast.error("Kopieren hat nicht geklappt — markiere den Code und kopiere ihn von Hand.");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await pb.collection("settings").update(SETTINGS_RECORD_ID, {
        bookingEmbedOrigins: origins,
      });
      await refresh();
      setDirty(false);
      toast.success("Domains gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page title="Einbetten">
        <div {...stylex.props(s.center)}>
          <Spinner />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="In deine Website einbetten"
      subtitle="Zeig das Buchungsformular direkt auf deiner eigenen Seite."
    >
      <div {...stylex.props(s.column)}>
        <AppointmentsTabs />

        {/* --- Schritt 1: Domains ------------------------------------------ */}
        <div {...stylex.props(s.card)}>
          <div>
            <Heading level={6}>1. Auf welchen Seiten soll es erscheinen?</Heading>
            <Text type="supporting" color="secondary">
              Trage die Adresse deiner Website ein — eine pro Zeile. Nur von
              dort darf das Formular eingebunden werden. Ob mit oder ohne
              „www“ spielt keine Rolle, beides wird automatisch erlaubt.
            </Text>
          </div>

          <TextArea
            width="100%"
            rows={3}
            label="Erlaubte Domains"
            placeholder={"meine-fotografie.de\nblog.meine-fotografie.de"}
            value={origins}
            onChange={(value) => {
              setOrigins(value);
              setDirty(true);
            }}
          />

          {!hasOrigins && settings.websiteUrl && (
            <Banner
              status="info"
              title="Deine hinterlegte Website übernehmen?"
              endContent={
                <Button
                  size="sm"
                  variant="secondary"
                  label="Übernehmen"
                  onClick={() => {
                    setOrigins(settings.websiteUrl);
                    setDirty(true);
                  }}
                />
              }
            >
              <Text type="body">{settings.websiteUrl}</Text>
            </Banner>
          )}

          <div {...stylex.props(s.actions)}>
            <Button
              label="Domains speichern"
              isDisabled={saved}
              isLoading={saving}
              onClick={() => void save()}
            />
          </div>
        </div>

        {/* --- Schritt 2: Code --------------------------------------------- */}
        <div {...stylex.props(s.card)}>
          <div>
            <Heading level={6}>2. Diesen Code auf deiner Website einfügen</Heading>
            <Text type="supporting" color="secondary">
              An die Stelle, an der das Formular erscheinen soll.
            </Text>
          </div>

          {types.length > 1 && (
            <Selector
              width="100%"
              label="Leistung vorwählen (optional)"
              description="Praktisch, wenn du auf einer Unterseite gezielt eine Leistung anbietest."
              placeholder="Kund:in wählt selbst"
              options={[
                { value: "", label: "Kund:in wählt selbst" },
                ...types.map((type) => ({ value: type.slug, label: type.name })),
              ]}
              value={typeSlug}
              onChange={(value) => setTypeSlug(value ?? "")}
            />
          )}

          {!saved || !hasOrigins ? (
            // Kein Code, solange die Domains nicht gespeichert sind: Sonst baut
            // die Fotograf:in ihn ein, sieht ein weißes Rechteck und sucht den
            // Fehler an der falschen Stelle.
            <Banner
              status="warning"
              title={
                hasOrigins
                  ? "Speichere zuerst die Domains oben."
                  : "Trage zuerst oben deine Website ein."
              }
              description="Ohne freigegebene Domain blockiert der Browser die Einbindung — du würdest nur ein leeres Feld sehen."
            />
          ) : (
            <>
              <div>
                <Text type="body" weight="semibold">
                  Empfohlen
                </Text>
                <Text type="supporting" color="secondary">
                  Passt die Höhe automatisch an, wenn deine Kund:innen weiterklicken.
                </Text>
              </div>
              <pre {...stylex.props(s.code)} data-testid="snippet-script">
                {scriptSnippet}
              </pre>
              <div {...stylex.props(s.actions)}>
                <Button
                  size="sm"
                  icon={copied === "script" ? <Check /> : <Copy />}
                  label={copied === "script" ? "Kopiert" : "Code kopieren"}
                  onClick={() => void copy("script", scriptSnippet)}
                />
              </div>

              <div>
                <Text type="body" weight="semibold">
                  Falls dein Baukasten kein JavaScript erlaubt
                </Text>
                <Text type="supporting" color="secondary">
                  Etwa bei Jimdo oder Wix. Feste Höhe — bei langen Formularen
                  entsteht ein Scrollbalken im Rahmen.
                </Text>
              </div>
              <pre {...stylex.props(s.code)} data-testid="snippet-iframe">
                {iframeSnippet}
              </pre>
              <div {...stylex.props(s.actions)}>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copied === "iframe" ? <Check /> : <Copy />}
                  label={copied === "iframe" ? "Kopiert" : "Code kopieren"}
                  onClick={() => void copy("iframe", iframeSnippet)}
                />
              </div>
            </>
          )}
        </div>

        {/* --- Schritt 3: Vorschau ------------------------------------------ */}
        <div {...stylex.props(s.card)}>
          <div>
            <Heading level={6}>3. So wird es aussehen</Heading>
            <Text type="supporting" color="secondary">
              Die Vorschau ist das echte Formular — was du hier tust, legt
              wirklich Termine an.
            </Text>
          </div>
          {!settings.bookingEnabled && (
            <Banner
              status="warning"
              title="Die Terminbuchung ist noch nicht freigeschaltet."
              description="Solange sie aus ist, sehen deine Kund:innen hier nur einen Hinweis."
            />
          )}
          <iframe
            title="Vorschau der Terminbuchung"
            src={`${appUrl}/embed/${query}`}
            data-testid="embed-vorschau"
            {...stylex.props(s.preview)}
          />
        </div>
      </div>
    </Page>
  );
}
