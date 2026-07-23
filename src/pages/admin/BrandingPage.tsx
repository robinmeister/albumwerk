import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Theme } from "@astryxdesign/core";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import {
  AppSettings,
  FontKey,
  SETTINGS_RECORD_ID,
  ThemeMode,
  settingsFileUrl,
} from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import { buildAstryxTheme, themeModeProp } from "../../utils/theme";
import PaymentSettings from "../../features/Settings/components/PaymentSettings";

const FONT_OPTIONS: { value: FontKey; label: string }[] = [
  { value: "inter", label: "Inter (modern, serifenlos)" },
  { value: "lora", label: "Lora (klassisch, Serifen)" },
  { value: "playfair", label: "Playfair Display (elegant, Serifen)" },
  { value: "montserrat", label: "Montserrat (geometrisch, serifenlos)" },
];

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
  { value: "auto", label: "Automatisch (Systemeinstellung)" },
];

type FileFields = {
  logo: File | null;
  favicon: File | null;
  watermarkLogo: File | null;
};

const f = stylex.create({
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    overflow: "hidden",
  },
  cardHead: { padding: "16px", borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 2 },
  cardBody: { padding: 16 },
  grid2: { display: "grid", gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr" }, gap: 16 },
  grid1: { display: "grid", gridTemplateColumns: "1fr", gap: 16 },
  full: { gridColumn: "1 / -1" },
  drop: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: "var(--radius-element)",
    padding: 16,
    textAlign: "center",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 16,
    minHeight: 72,
  },
  dropImg: { height: 48, width: 48, objectFit: "contain" },
  dropPlaceholder: { height: 48, width: 48, backgroundColor: "var(--color-background-muted)", borderRadius: "var(--radius-element)" },
  colorField: { display: "flex", flexDirection: "column", gap: 4 },
  colorInput: { width: "100%", height: 40, borderRadius: "var(--radius-element)", border: "1px solid var(--color-border)", background: "none", cursor: "pointer", padding: 2 },
  sliderWrap: { display: "flex", flexDirection: "column", gap: 6 },
  ol: { paddingLeft: 20, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 },
  layout: { display: "grid", gridTemplateColumns: { default: "1fr", "@media (min-width: 900px)": "8fr 4fr" }, gap: 16, alignItems: "start" },
  sections: { display: "flex", flexDirection: "column", gap: 16 },
  wizardNav: { display: "flex", justifyContent: "space-between", marginTop: 16 },
  saveRow: { display: "flex", justifyContent: "flex-end" },
  stepper: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  step: { display: "flex", alignItems: "center", gap: 6 },
  dot: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600, backgroundColor: "var(--color-background-muted)", color: "var(--color-text-secondary)" },
  dotActive: { backgroundColor: "var(--color-accent)", color: "var(--color-on-accent)" },
  preview: { position: { "@media (min-width: 900px)": "sticky" }, top: 16, display: "flex", flexDirection: "column", gap: 8 },
  regenRow: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" },
});

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div {...stylex.props(f.card)}>
      <div {...stylex.props(f.cardHead)}>
        <Heading level={6}>{title}</Heading>
        <Text type="supporting" color="secondary">{subtitle}</Text>
      </div>
      <div {...stylex.props(f.cardBody)}>{children}</div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label {...stylex.props(f.colorField)}>
      <Text type="supporting" color="secondary">{label}</Text>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} {...stylex.props(f.colorInput)} />
    </label>
  );
}

function ImageDrop(props: {
  label: string;
  currentUrl: string;
  file: File | null;
  onFile: (file: File | null) => void;
}): ReactElement {
  const { label, currentUrl, file, onFile } = props;
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: { "image/*": [] },
    onDrop: (accepted) => accepted[0] && onFile(accepted[0]),
  });
  const previewUrl = file ? URL.createObjectURL(file) : currentUrl;

  return (
    <div
      {...getRootProps()}
      {...stylex.props(f.drop)}
      style={{ borderColor: isDragActive ? "var(--color-accent)" : "var(--color-border)" }}
    >
      <input {...getInputProps()} />
      {previewUrl ? (
        <img src={previewUrl} alt={label} {...stylex.props(f.dropImg)} />
      ) : (
        <div {...stylex.props(f.dropPlaceholder)} />
      )}
      <Text type="body" color="secondary">
        {label} — Bild hierher ziehen oder klicken
      </Text>
    </div>
  );
}

const preview = stylex.create({
  card: {
    overflow: "hidden",
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-body)",
  },
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderBottom: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-surface)",
  },
  spacer: { flexGrow: 1 },
  body: { padding: 20, display: "flex", flexDirection: "column", gap: 12 },
  actions: { display: "flex", gap: 8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 },
  swatch: {
    paddingTop: "100%",
    backgroundColor: "var(--color-accent)",
    borderRadius: "var(--radius-element)",
  },
});

function ThemePreview({ draft }: { draft: AppSettings }): ReactElement {
  const previewTheme = useMemo(() => buildAstryxTheme(draft), [draft]);
  return (
    <Theme theme={previewTheme} mode={themeModeProp(draft)}>
      <div {...stylex.props(preview.card)}>
        <div {...stylex.props(preview.bar)}>
          <Text type="label" weight="semibold">
            {draft.businessName || "Fotogalerie"}
          </Text>
          <div {...stylex.props(preview.spacer)} />
          <Text type="supporting" color="secondary">
            Album
          </Text>
        </div>
        <div {...stylex.props(preview.body)}>
          <Heading level={4}>{draft.tagline || "So sieht dein Album aus"}</Heading>
          <Text type="body" color="secondary">
            Überschriften, Schrift, Farben und Hell/Dunkel folgen deinen
            Einstellungen.
          </Text>
          <div {...stylex.props(preview.actions)}>
            <Button variant="primary" label="Primär" />
            <Button variant="secondary" label="Sekundär" />
          </div>
          <div {...stylex.props(preview.grid)}>
            {[0.9, 0.75, 0.6].map((op) => (
              <div key={op} {...stylex.props(preview.swatch)} style={{ opacity: op * 0.35 }} />
            ))}
          </div>
        </div>
      </div>
    </Theme>
  );
}

export default function BrandingPage(): ReactElement {
  const { settings, loaded, refresh } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setupMode = searchParams.get("setup") === "1";

  const [draft, setDraft] = useState<AppSettings>(settings);
  const [files, setFiles] = useState<FileFields>({ logo: null, favicon: null, watermarkLogo: null });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    if (loaded) setDraft(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const set = (patch: Partial<AppSettings>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async (markCompleted = false) => {
    setSaving(true);
    try {
      const fd = new FormData();
      const textFields: (keyof AppSettings)[] = [
        "businessName", "shortName", "tagline", "primaryColor", "secondaryColor",
        "fontFamily", "themeMode", "contactEmail", "orderNotificationEmail",
        "websiteUrl", "customDomain", "currency", "watermarkText",
      ];
      textFields.forEach((k) => fd.append(k, String(draft[k] ?? "")));
      fd.append("borderRadius", String(draft.borderRadius ?? 8));
      fd.append("watermarkOpacity", String(draft.watermarkOpacity ?? 40));
      fd.append("previewMaxSize", String(draft.previewMaxSize ?? 1200));
      if (markCompleted || draft.setupCompleted) fd.append("setupCompleted", "true");
      if (files.logo) fd.append("logo", files.logo);
      if (files.favicon) fd.append("favicon", files.favicon);
      if (files.watermarkLogo) fd.append("watermarkLogo", files.watermarkLogo);

      await pb.collection("settings").update(SETTINGS_RECORD_ID, fd);
      await refresh();
      setFiles({ logo: null, favicon: null, watermarkLogo: null });
      toast.success("Einstellungen gespeichert");
      if (markCompleted) navigate("/album");
    } catch (error) {
      console.error("settings save failed", error);
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const regeneratePreviews = async () => {
    setRegenerating(true);
    try {
      const result = await pb.send("/api/custom/regenerate-previews", { method: "POST", body: {} });
      toast.success(
        `Vorschauen neu erzeugt: ${result.generated ?? 0}` +
          (result.failed ? `, fehlgeschlagen: ${result.failed}` : ""),
      );
    } catch (error) {
      console.error("preview regeneration failed", error);
      toast.error("Neu-Erzeugen fehlgeschlagen");
    } finally {
      setRegenerating(false);
    }
  };

  const goNext = async () => {
    await save(false);
    setActiveStep((s) => s + 1);
  };

  const checkDomain = async () => {
    const domain = draft.customDomain.trim().toLowerCase();
    if (!domain) return;
    setCheckingDomain(true);
    setDomainStatus("idle");
    try {
      await save(false);
      await fetch(`https://${domain}/api/health`, { mode: "no-cors", cache: "no-store" });
      setDomainStatus("ok");
    } catch (_) {
      setDomainStatus("fail");
    } finally {
      setCheckingDomain(false);
    }
  };

  const brandingSection = (
    <SectionCard title="Branding" subtitle="Name, Logo, Farben und Schrift">
      <div {...stylex.props(f.grid2)}>
        <div {...stylex.props(f.full)}>
          <TextInput width="100%" label="Name des Geschäfts" value={draft.businessName}
            onChange={(v) => set({ businessName: v })} />
        </div>
        <TextInput width="100%" label="Kurzname (App)" value={draft.shortName}
          onChange={(v) => set({ shortName: v.slice(0, 12) })} />
        <Selector width="100%" label="Schriftart" value={draft.fontFamily}
          options={FONT_OPTIONS} onChange={(v) => v && set({ fontFamily: v as FontKey })} />
        <Selector width="100%" label="Erscheinungsbild" value={draft.themeMode}
          options={MODE_OPTIONS} onChange={(v) => v && set({ themeMode: v as ThemeMode })} />
        <div {...stylex.props(f.full)}>
          <TextInput width="100%" label="Slogan / Untertitel" value={draft.tagline}
            onChange={(v) => set({ tagline: v })} />
        </div>
        <ImageDrop label="Logo" file={files.logo}
          currentUrl={settingsFileUrl(settings, "logo")}
          onFile={(file) => setFiles((s) => ({ ...s, logo: file }))} />
        <ImageDrop label="Favicon (optional)" file={files.favicon}
          currentUrl={settingsFileUrl(settings, "favicon")}
          onFile={(file) => setFiles((s) => ({ ...s, favicon: file }))} />
        <ColorField label="Primärfarbe" value={draft.primaryColor} onChange={(v) => set({ primaryColor: v })} />
        <ColorField label="Sekundärfarbe" value={draft.secondaryColor} onChange={(v) => set({ secondaryColor: v })} />
        <div {...stylex.props(f.sliderWrap, f.full)}>
          <Text type="supporting" color="secondary">Eckenradius: {draft.borderRadius}px</Text>
          <Slider label="Eckenradius" isLabelHidden min={0} max={24}
            value={draft.borderRadius} onChange={(v) => set({ borderRadius: v })} />
        </div>
      </div>
    </SectionCard>
  );

  const contactSection = (
    <SectionCard title="Kontakt & Geschäft" subtitle="E-Mail-Adressen und Website">
      <div {...stylex.props(f.grid2)}>
        <TextInput width="100%" type="email" label="Kontakt-E-Mail (Support)"
          value={draft.contactEmail} onChange={(v) => set({ contactEmail: v })} />
        <TextInput width="100%" type="email" label="Bestell-Benachrichtigungen an"
          description="Hier gehen neue Bestellungen ein"
          value={draft.orderNotificationEmail} onChange={(v) => set({ orderNotificationEmail: v })} />
        <TextInput width="100%" label="Website (optional)"
          value={draft.websiteUrl} onChange={(v) => set({ websiteUrl: v })} />
        <TextInput width="100%" label="Währung" description="ISO-Code, z. B. EUR"
          value={draft.currency} onChange={(v) => set({ currency: v.toUpperCase().slice(0, 3) })} />
      </div>
    </SectionCard>
  );

  const domainSection = (
    <SectionCard title="Eigene Domain" subtitle="Unter welcher Adresse soll dein Album erreichbar sein?">
      <div {...stylex.props(f.grid1)}>
        <TextInput width="100%" label="Domain" placeholder="fotos.deine-domain.de"
          description="Ohne https:// — z. B. fotos.deine-domain.de. Leer lassen, wenn (noch) keine eigene Domain."
          value={draft.customDomain}
          onChange={(v) => { setDomainStatus("idle"); set({ customDomain: v.trim().toLowerCase() }); }} />
        <Banner status="info" title="So richtest du deine Domain ein:">
          <ol {...stylex.props(f.ol)}>
            <li><Text type="body">Lege bei deinem Domain-Anbieter einen <strong>A-Record</strong> (und optional AAAA für IPv6) an, der auf die <strong>IP-Adresse deines Servers</strong> zeigt.</Text></li>
            <li><Text type="body">Trage die Domain oben ein und speichere.</Text></li>
            <li><Text type="body">Das HTTPS-Zertifikat wird beim ersten Aufruf <strong>automatisch</strong> von Let's Encrypt geholt — du musst nichts weiter konfigurieren.</Text></li>
          </ol>
        </Banner>
        <div {...stylex.props(f.regenRow)}>
          <Button variant="secondary" label="Domain prüfen" isLoading={checkingDomain}
            isDisabled={checkingDomain || !draft.customDomain.trim()} onClick={() => void checkDomain()} />
          {domainStatus === "ok" && (
            <Banner status="success" title="Deine Domain ist erreichbar und per HTTPS gesichert." />
          )}
          {domainStatus === "fail" && (
            <Banner status="warning" title="Noch nicht erreichbar. Das ist direkt nach dem Anlegen des DNS-Eintrags normal — es kann einige Minuten bis Stunden dauern, bis die Änderung überall aktiv ist. Später erneut prüfen." />
          )}
        </div>
      </div>
    </SectionCard>
  );

  const paymentSection = (
    <SectionCard title="Zahlung" subtitle="PayPal und Kartenzahlung (Stripe) — optional, jederzeit änderbar">
      <PaymentSettings compact />
    </SectionCard>
  );

  const watermarkSection = (
    <SectionCard title="Wasserzeichen & Vorschau" subtitle="Für die automatisch erzeugten Vorschaubilder in Alben">
      <div {...stylex.props(f.grid2)}>
        <TextInput width="100%" label="Wasserzeichen-Text"
          description="Leer lassen, um den Geschäftsnamen zu verwenden"
          value={draft.watermarkText} onChange={(v) => set({ watermarkText: v })} />
        <ImageDrop label="Wasserzeichen-Logo (optional, statt Text)" file={files.watermarkLogo}
          currentUrl={settingsFileUrl(settings, "watermarkLogo")}
          onFile={(file) => setFiles((s) => ({ ...s, watermarkLogo: file }))} />
        <div {...stylex.props(f.sliderWrap)}>
          <Text type="supporting" color="secondary">Deckkraft: {draft.watermarkOpacity}%</Text>
          <Slider label="Deckkraft" isLabelHidden min={5} max={100}
            value={draft.watermarkOpacity} onChange={(v) => set({ watermarkOpacity: v })} />
        </div>
        <TextInput width="100%" label="Max. Vorschaugröße (px)"
          value={String(draft.previewMaxSize)} onChange={(v) => set({ previewMaxSize: Number(v) })} />
        <div {...stylex.props(f.regenRow, f.full)}>
          <Button variant="secondary" label="Vorschauen neu erzeugen" isLoading={regenerating}
            isDisabled={regenerating} onClick={() => void regeneratePreviews()} />
          <Text type="supporting" color="secondary">
            Nach Änderungen am Wasserzeichen für alle Alben neu generieren (kann einige Minuten dauern).
          </Text>
        </div>
      </div>
    </SectionCard>
  );

  const steps: { label: string; content: ReactNode }[] = [
    { label: "Branding", content: brandingSection },
    { label: "Domain", content: domainSection },
    { label: "Kontakt", content: contactSection },
    { label: "Zahlung", content: paymentSection },
  ];

  return (
    <Page title={setupMode ? "Einrichtung" : "Branding & Einstellungen"}>
      {setupMode && (
        <div style={{ marginBottom: 16 }}>
          <Banner status="info" title="Willkommen! Richte dein Album in wenigen Schritten ein. Alles lässt sich später unter „Branding“ ändern." />
        </div>
      )}
      <div {...stylex.props(f.layout)}>
        <div>
          {setupMode ? (
            <div>
              <div {...stylex.props(f.stepper)}>
                {steps.map((st, idx) => (
                  <div key={st.label} {...stylex.props(f.step)}>
                    <span {...stylex.props(f.dot, idx <= activeStep && f.dotActive)}>{idx + 1}</span>
                    <Text type="supporting" color={idx <= activeStep ? "primary" : "secondary"}>{st.label}</Text>
                  </div>
                ))}
              </div>
              {steps[activeStep].content}
              <div {...stylex.props(f.wizardNav)}>
                <Button variant="secondary" label="Zurück" isDisabled={activeStep === 0}
                  onClick={() => setActiveStep((s) => s - 1)} />
                {activeStep < steps.length - 1 ? (
                  <Button variant="primary" label="Weiter" isDisabled={saving} isLoading={saving}
                    onClick={() => void goNext()} />
                ) : (
                  <Button variant="primary" label="Einrichtung abschließen" isDisabled={saving} isLoading={saving}
                    onClick={() => void save(true)} />
                )}
              </div>
            </div>
          ) : (
            <div {...stylex.props(f.sections)}>
              {brandingSection}
              {domainSection}
              {contactSection}
              {paymentSection}
              {watermarkSection}
              <Divider />
              <div {...stylex.props(f.saveRow)}>
                <Button variant="primary" size="lg" label="Speichern" isDisabled={saving} isLoading={saving}
                  onClick={() => void save(false)} />
              </div>
            </div>
          )}
        </div>
        <div {...stylex.props(f.preview)}>
          <Text type="label" weight="semibold" color="secondary">Live-Vorschau</Text>
          <ThemePreview draft={draft} />
        </div>
      </div>
    </Page>
  );
}
