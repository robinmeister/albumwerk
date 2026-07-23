import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { lazy, ReactElement, ReactNode, Suspense, useEffect, useState } from "react";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { SETTINGS_RECORD_ID } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import {
  buildImprintHtml,
  buildPrivacyHtml,
  type LegalOperator,
} from "../../utils/legalTemplates";

const s = stylex.create({
  sections: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    overflow: "hidden",
  },
  cardHead: { padding: "16px", borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 2 },
  cardBody: { padding: 16, display: "flex", flexDirection: "column", gap: 16 },
  grid2: { display: "grid", gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr" }, gap: 16 },
  full: { gridColumn: "1 / -1" },
  actionRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  saveRow: { display: "flex", justifyContent: "flex-end" },
});

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div {...stylex.props(s.card)}>
      <div {...stylex.props(s.cardHead)}>
        <Heading level={6}>{title}</Heading>
        <Text type="supporting" color="secondary">{subtitle}</Text>
      </div>
      <div {...stylex.props(s.cardBody)}>{children}</div>
    </div>
  );
}

// TipTap/ProseMirror is ~120 kB gzip and only ever needed on this admin page,
// so it stays out of the bundle every customer downloads.
const RichTextEditor = lazy(() => import("../../components/widgets/RichTextEditor"));

function EditorFallback({ label }: { label: string }) {
  return <Text type="supporting" color="secondary">{`${label} wird geladen …`}</Text>;
}

const EMPTY_OPERATOR: LegalOperator = {
  name: "", street: "", city: "", representative: "", phone: "", email: "", vatId: "",
  hostingProvider: "", mailProvider: "",
};

export default function AdminLegalPage(): ReactElement {
  const { settings, loaded, refresh } = useSettings();

  const [imprintHtml, setImprintHtml] = useState("");
  const [privacyHtml, setPrivacyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LegalOperator>(EMPTY_OPERATOR);
  // true while the privacy text on screen is the untouched template
  const [privacyPrefilled, setPrivacyPrefilled] = useState(false);

  const privacyContext = {
    paypalEnabled: settings.paypalEnabled,
    stripeEnabled: settings.stripeEnabled,
  };

  useEffect(() => {
    if (!loaded) return;
    const operator: LegalOperator = {
      ...EMPTY_OPERATOR,
      name: settings.businessName,
      email: settings.contactEmail,
    };
    setImprintHtml(settings.imprintHtml);
    setForm((f) => ({ ...f, name: f.name || operator.name, email: f.email || operator.email }));
    // Nothing stored yet: start from the template instead of a blank page, so
    // the instance has a complete draft to work through.
    if (settings.privacyHtml.trim()) {
      setPrivacyHtml(settings.privacyHtml);
    } else {
      setPrivacyHtml(buildPrivacyHtml(operator, privacyContext));
      setPrivacyPrefilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const setF = (patch: Partial<LegalOperator>) => setForm((f) => ({ ...f, ...patch }));
  const canGenerate = Boolean(form.name.trim() && form.street.trim() && form.city.trim() && form.email.trim());

  const generate = () => {
    setImprintHtml(buildImprintHtml(form));
    toast.info("Impressum erzeugt — unten prüfen und speichern");
  };

  const generatePrivacy = () => {
    setPrivacyHtml(buildPrivacyHtml(form, privacyContext));
    setPrivacyPrefilled(false);
    toast.info("Datenschutzerklärung erzeugt — unten prüfen und speichern");
  };

  const save = async () => {
    setSaving(true);
    try {
      await pb.collection("settings").update(SETTINGS_RECORD_ID, { imprintHtml, privacyHtml });
      await refresh();
      toast.success("Rechtstexte gespeichert");
    } catch (error) {
      console.error("legal save failed", error);
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Rechtliches">
      <div {...stylex.props(s.sections)}>
        <SectionCard
          title="Angaben zum Betrieb"
          subtitle="Grundlage für die erzeugten Texte — Impressum (§ 5 DDG) und Datenschutzerklärung"
        >
          <div {...stylex.props(s.grid2)}>
            <TextInput width="100%" label="Name / Firma" value={form.name}
              onChange={(v) => setF({ name: v })} />
            <TextInput width="100%" label="Vertreten durch (optional)" placeholder="z. B. Max Mustermann"
              value={form.representative} onChange={(v) => setF({ representative: v })} />
            <TextInput width="100%" label="Straße und Hausnummer" value={form.street}
              onChange={(v) => setF({ street: v })} />
            <TextInput width="100%" label="PLZ und Ort" value={form.city}
              onChange={(v) => setF({ city: v })} />
            <TextInput width="100%" label="Telefon (optional)" value={form.phone}
              onChange={(v) => setF({ phone: v })} />
            <TextInput width="100%" type="email" label="E-Mail" value={form.email}
              onChange={(v) => setF({ email: v })} />
            <TextInput width="100%" label="Umsatzsteuer-ID (optional)" placeholder="DE123456789"
              value={form.vatId} onChange={(v) => setF({ vatId: v })} />
            <TextInput width="100%" label="Hosting-Anbieter (für die Datenschutzerklärung)"
              placeholder="Firma, Anschrift — oder „eigener Server“"
              value={form.hostingProvider} onChange={(v) => setF({ hostingProvider: v })} />
            <TextInput width="100%" label="E-Mail-Dienst / SMTP (für die Datenschutzerklärung)"
              placeholder="Firma, Anschrift"
              value={form.mailProvider} onChange={(v) => setF({ mailProvider: v })} />
          </div>
          <div {...stylex.props(s.actionRow)}>
            <Button variant="secondary" label="Standard-Impressum erzeugen"
              isDisabled={!canGenerate} onClick={generate} />
            <Button variant="secondary" label="Datenschutzerklärung erzeugen"
              onClick={generatePrivacy} />
            <Text type="supporting" color="secondary">
              Überschreibt den jeweiligen Text unten — dort kannst du ihn weiter anpassen.
            </Text>
          </div>
          <Text type="supporting" color="secondary">
            Die beiden Anbieter-Angaben werden nur in den erzeugten Text übernommen und nicht gespeichert.
          </Text>
        </SectionCard>

        <SectionCard
          title="Impressum"
          subtitle="Öffentlich sichtbar unter /imprint"
        >
          <Suspense fallback={<EditorFallback label="Editor" />}>
            <RichTextEditor label="Impressum" value={imprintHtml} onChange={setImprintHtml} />
          </Suspense>
        </SectionCard>

        <SectionCard
          title="Datenschutzerklärung"
          subtitle="Öffentlich sichtbar unter /privacy"
        >
          {privacyPrefilled && (
            <Text type="supporting" color="secondary">
              Vorbelegt mit der Standard-Vorlage — noch nicht gespeichert. Bitte die mit „[bitte ergänzen: …]“
              markierten Stellen ausfüllen und den Text vor der Veröffentlichung rechtlich prüfen lassen.
            </Text>
          )}
          <Suspense fallback={<EditorFallback label="Editor" />}>
            <RichTextEditor
              label="Datenschutzerklärung"
              value={privacyHtml}
              onChange={(html) => {
                setPrivacyHtml(html);
                setPrivacyPrefilled(false);
              }}
              minHeight={420}
            />
          </Suspense>
        </SectionCard>

        <Divider />
        <div {...stylex.props(s.saveRow)}>
          <Button variant="primary" size="lg" label="Speichern"
            isDisabled={saving} isLoading={saving} onClick={() => void save()} />
        </div>
      </div>
    </Page>
  );
}
