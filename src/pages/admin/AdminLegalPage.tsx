import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, ReactNode, useEffect, useState } from "react";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { SETTINGS_RECORD_ID } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";

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

interface ImprintForm {
  name: string;
  street: string;
  city: string;
  representative: string;
  phone: string;
  email: string;
  vatId: string;
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ponytail: static template string, no CMS — reicht für ein Standard-Impressum nach § 5 DDG
function buildImprintHtml(g: ImprintForm): string {
  const address = `${esc(g.name)}<br/>${esc(g.street)}<br/>${esc(g.city)}`;
  return [
    "<h2>Impressum</h2>",
    "<h3>Angaben gemäß § 5 DDG</h3>",
    `<p>${address}</p>`,
    g.representative && `<p>Vertreten durch:<br/>${esc(g.representative)}</p>`,
    "<h3>Kontakt</h3>",
    `<p>${g.phone ? `Telefon: ${esc(g.phone)}<br/>` : ""}E-Mail: ${esc(g.email)}</p>`,
    g.vatId &&
      `<h3>Umsatzsteuer-ID</h3><p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br/>${esc(g.vatId)}</p>`,
    "<h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>",
    `<p>${address}</p>`,
    "<h3>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h3>",
    "<p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function AdminLegalPage(): ReactElement {
  const { settings, loaded, refresh } = useSettings();

  const [imprintHtml, setImprintHtml] = useState("");
  const [privacyHtml, setPrivacyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ImprintForm>({
    name: "", street: "", city: "", representative: "", phone: "", email: "", vatId: "",
  });

  useEffect(() => {
    if (!loaded) return;
    setImprintHtml(settings.imprintHtml);
    setPrivacyHtml(settings.privacyHtml);
    setForm((f) => ({
      ...f,
      name: f.name || settings.businessName,
      email: f.email || settings.contactEmail,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const setF = (patch: Partial<ImprintForm>) => setForm((f) => ({ ...f, ...patch }));
  const canGenerate = Boolean(form.name.trim() && form.street.trim() && form.city.trim() && form.email.trim());

  const generate = () => {
    setImprintHtml(buildImprintHtml(form));
    toast.info("Impressum erzeugt — unten prüfen und speichern");
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
          title="Impressum erstellen"
          subtitle="Angaben eintragen und ein Standard-Impressum (§ 5 DDG) erzeugen lassen"
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
          </div>
          <div {...stylex.props(s.actionRow)}>
            <Button variant="secondary" label="Standard-Impressum erzeugen"
              isDisabled={!canGenerate} onClick={generate} />
            <Text type="supporting" color="secondary">
              Überschreibt den Impressum-Text unten — dort kannst du ihn noch anpassen.
            </Text>
          </div>
        </SectionCard>

        <SectionCard
          title="Impressum"
          subtitle="Öffentlich sichtbar unter /imprint (HTML erlaubt)"
        >
          <TextArea width="100%" rows={12} label="Impressum"
            value={imprintHtml} onChange={setImprintHtml} />
        </SectionCard>

        <SectionCard
          title="Datenschutzerklärung"
          subtitle="Öffentlich sichtbar unter /privacy (HTML erlaubt)"
        >
          <TextArea width="100%" rows={12} label="Datenschutzerklärung"
            value={privacyHtml} onChange={setPrivacyHtml} />
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
