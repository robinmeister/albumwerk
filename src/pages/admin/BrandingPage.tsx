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
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import {
  AppSettings,
  DesignPresetKey,
  FontKey,
  OverridableField,
  ThemeMode,
  settingsFileUrl,
} from "../../config/settings";
import { buildAstryxTheme, themeModeProp } from "../../utils/theme";
import { applyPreset, clearOverride, isOverridden, setOverride } from "../../utils/themeOverrides";
import PaymentSettings from "../../features/Settings/components/PaymentSettings";
import PresetPicker from "../../features/Settings/components/PresetPicker";
import { ColorField, Herkunft, ImageDrop, SectionCard, sf } from "../../features/Settings/components/SettingsSection";
import CustomerPreview from "../../features/Preview/CustomerPreview";
import { useSettingsDraft } from "../../features/Settings/useSettingsDraft";

const FONT_OPTIONS: { value: FontKey; label: string }[] = [
  { value: "inter", label: "Inter (modern, serifenlos)" },
  { value: "lora", label: "Lora (klassisch, Serifen)" },
  { value: "playfair", label: "Playfair Display (elegant, Serifen)" },
  { value: "montserrat", label: "Montserrat (geometrisch, serifenlos)" },
  { value: "familjen-grotesk", label: "Familjen Grotesk (kantig, serifenlos)" },
  { value: "public-sans", label: "Public Sans (nüchtern, serifenlos)" },
  { value: "instrument-serif", label: "Instrument Serif (hoher Kontrast, Serifen)" },
  { value: "newsreader", label: "Newsreader (Lesetext, Serifen)" },
];

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
  { value: "auto", label: "Automatisch (Systemeinstellung)" },
];

const f = stylex.create({
  presetWrap: { marginBottom: 16 },
  layout: { display: "grid", gridTemplateColumns: { default: "1fr", "@media (min-width: 900px)": "8fr 4fr" }, gap: 16, alignItems: "start" },
  wizardNav: { display: "flex", justifyContent: "space-between", marginTop: 16 },
  stepper: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  step: { display: "flex", alignItems: "center", gap: 6 },
  dot: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600, backgroundColor: "var(--color-background-muted)", color: "var(--color-text-secondary)" },
  dotActive: { backgroundColor: "var(--color-accent)", color: "var(--color-on-accent)" },
  preview: { position: { "@media (min-width: 900px)": "sticky" }, top: 16, display: "flex", flexDirection: "column", gap: 8 },
});

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
  const { draft, setDraft, set, files, setFile, save, saving, settings } = useSettingsDraft();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setupMode = searchParams.get("setup") === "1";

  const [regenerating, setRegenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [beispielGalerie, setBeispielGalerie] = useState<string>("");
  const [vorschauFuer, setVorschauFuer] = useState<string | null>(null);

  useEffect(() => {
    // Es gibt keine "zuletzt angelegte" Galerie: die shootings-Sammlung fuehrt
    // kein Datumsfeld, und ein sort: "-created" scheitert mit HTTP 400. Gewaehlt
    // wird deshalb die alphabetisch erste — deterministisch und erklaerbar. Welche
    // es ist, sagt die Leiste ueber der Vorschau.
    pb.collection("shootings")
      .getList(1, 1, { sort: "title", requestKey: null })
      .then((res) => setBeispielGalerie(res.items[0]?.id ?? ""))
      .catch(() => setBeispielGalerie(""));
  }, []);

  const resetToPreset = (feld: OverridableField) => setDraft((d) => clearOverride(d, feld));

  // Bisheriges save(true): einmal speichern, dann in den Album-Bereich
  // wechseln. Das Markieren als "eingerichtet" übernimmt in Task 8 die
  // Checkliste — hier bleibt nur noch die Navigation.
  const finishSetup = async () => {
    await save();
    navigate("/album");
  };

  const regeneratePreviews = async () => {
    setRegenerating(true);
    try {
      const result = await pb.send("/api/custom/regenerate-previews", { method: "POST", body: {} });
      // the previews are rendered in the background (pb_hooks/previews.pb.js)
      toast.success(
        result.queued === 1
          ? "1 Vorschau wird im Hintergrund neu erzeugt"
          : `${result.queued ?? 0} Vorschauen werden im Hintergrund neu erzeugt`,
      );
    } catch (error) {
      console.error("preview regeneration failed", error);
      toast.error("Neu-Erzeugen fehlgeschlagen");
    } finally {
      setRegenerating(false);
    }
  };

  const goNext = async () => {
    await save();
    setActiveStep((s) => s + 1);
  };

  const checkDomain = async () => {
    const domain = draft.customDomain.trim().toLowerCase();
    if (!domain) return;
    setCheckingDomain(true);
    setDomainStatus("idle");
    try {
      await save();
      await fetch(`https://${domain}/api/health`, { mode: "no-cors", cache: "no-store" });
      setDomainStatus("ok");
    } catch (_) {
      setDomainStatus("fail");
    } finally {
      setCheckingDomain(false);
    }
  };

  const brandingSection = (
    <SectionCard title="Branding" subtitle="Name, Logo, Farben und Schrift" helpSlug="branding-einrichten">
      <div {...stylex.props(f.presetWrap)}>
        <PresetPicker settings={draft} onChange={(key: DesignPresetKey) => setDraft((d) => applyPreset(d, key))} />
      </div>
      <div {...stylex.props(sf.grid2)}>
        <div {...stylex.props(sf.full)}>
          <TextInput width="100%" label="Name des Geschäfts" value={draft.businessName}
            onChange={(v) => set({ businessName: v })} />
        </div>
        <TextInput width="100%" label="Kurzname (App)" value={draft.shortName}
          onChange={(v) => set({ shortName: v.slice(0, 12) })} />
        <div {...stylex.props(sf.sliderWrap)}>
          <Selector width="100%" label="Schriftart" value={draft.fontFamily}
            options={FONT_OPTIONS}
            onChange={(v) => v && setDraft((d) => setOverride(d, "fontFamily", v as FontKey))} />
          <Herkunft feld="Schriftart" istGesetzt={isOverridden(draft, "fontFamily")} onReset={() => resetToPreset("fontFamily")} />
        </div>
        <Selector width="100%" label="Erscheinungsbild" value={draft.themeMode}
          options={MODE_OPTIONS} onChange={(v) => v && set({ themeMode: v as ThemeMode })} />
        <div {...stylex.props(sf.full)}>
          <TextInput width="100%" label="Slogan / Untertitel" value={draft.tagline}
            onChange={(v) => set({ tagline: v })} />
        </div>
        <ImageDrop label="Logo" file={files.logo}
          currentUrl={settingsFileUrl(settings, "logo")}
          onFile={(file) => setFile("logo", file)} />
        <ImageDrop label="Favicon (optional)" file={files.favicon}
          currentUrl={settingsFileUrl(settings, "favicon")}
          onFile={(file) => setFile("favicon", file)} />
        <div {...stylex.props(sf.sliderWrap)}>
          <ColorField label="Primärfarbe" value={draft.primaryColor}
            onChange={(v) => setDraft((d) => setOverride(d, "primaryColor", v))} />
          <Herkunft feld="Primärfarbe" istGesetzt={isOverridden(draft, "primaryColor")} onReset={() => resetToPreset("primaryColor")} />
        </div>
        <div {...stylex.props(sf.sliderWrap)}>
          <ColorField label="Sekundärfarbe" value={draft.secondaryColor}
            onChange={(v) => setDraft((d) => setOverride(d, "secondaryColor", v))} />
          <Herkunft feld="Sekundärfarbe" istGesetzt={isOverridden(draft, "secondaryColor")} onReset={() => resetToPreset("secondaryColor")} />
        </div>
        <div {...stylex.props(sf.sliderWrap, sf.full)}>
          <Text type="supporting" color="secondary">Eckenradius: {draft.borderRadius}px</Text>
          <Slider label="Eckenradius" isLabelHidden min={0} max={24}
            value={draft.borderRadius} onChange={(v) => setDraft((d) => setOverride(d, "borderRadius", v))} />
          <Herkunft feld="Eckenradius" istGesetzt={isOverridden(draft, "borderRadius")} onReset={() => resetToPreset("borderRadius")} />
        </div>
      </div>
      <div {...stylex.props(sf.regenRow)}>
        <Button
          variant="secondary"
          label="Kundenansicht"
          isDisabled={!beispielGalerie}
          onClick={() => setVorschauFuer(beispielGalerie)}
          data-testid="kundenansicht-oeffnen"
        />
        {!beispielGalerie && (
          <Text type="supporting" color="secondary">
            Sobald du eine Galerie angelegt hast, kannst du sie hier aus Kundensicht ansehen.
          </Text>
        )}
      </div>
    </SectionCard>
  );

  const contactSection = (
    <SectionCard title="Kontakt & Geschäft" subtitle="E-Mail-Adressen und Website" helpSlug="kontakt-benachrichtigungen">
      <div {...stylex.props(sf.grid2)}>
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
    <SectionCard title="Eigene Domain" subtitle="Unter welcher Adresse soll dein Album erreichbar sein?" helpSlug="custom-domain">
      <div {...stylex.props(sf.grid1)}>
        <TextInput width="100%" label="Domain" placeholder="fotos.deine-domain.de"
          description="Ohne https:// — z. B. fotos.deine-domain.de. Leer lassen, wenn (noch) keine eigene Domain."
          value={draft.customDomain}
          onChange={(v) => { setDomainStatus("idle"); set({ customDomain: v.trim().toLowerCase() }); }} />
        <Banner status="info" title="So richtest du deine Domain ein:">
          <ol {...stylex.props(sf.ol)}>
            <li><Text type="body">Lege bei deinem Domain-Anbieter einen <strong>A-Record</strong> (und optional AAAA für IPv6) an, der auf die <strong>IP-Adresse deines Servers</strong> zeigt.</Text></li>
            <li><Text type="body">Trage die Domain oben ein und speichere.</Text></li>
            <li><Text type="body">Das HTTPS-Zertifikat wird beim ersten Aufruf <strong>automatisch</strong> von Let's Encrypt geholt — du musst nichts weiter konfigurieren.</Text></li>
          </ol>
        </Banner>
        <div {...stylex.props(sf.regenRow)}>
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
    <SectionCard title="Zahlung" subtitle="PayPal und Kartenzahlung (Stripe) — optional, jederzeit änderbar" helpSlug="zahlungen-paypal">
      <PaymentSettings compact />
    </SectionCard>
  );

  const watermarkSection = (
    <SectionCard title="Wasserzeichen & Vorschau" subtitle="Für die automatisch erzeugten Vorschaubilder in Alben" helpSlug="wasserzeichen-vorschau">
      <div {...stylex.props(sf.grid2)}>
        <TextInput width="100%" label="Wasserzeichen-Text"
          description="Leer lassen, um den Geschäftsnamen zu verwenden"
          value={draft.watermarkText} onChange={(v) => set({ watermarkText: v })} />
        <ImageDrop label="Wasserzeichen-Logo (optional, statt Text)" file={files.watermarkLogo}
          currentUrl={settingsFileUrl(settings, "watermarkLogo")}
          onFile={(file) => setFile("watermarkLogo", file)} />
        <div {...stylex.props(sf.sliderWrap)}>
          <Text type="supporting" color="secondary">Deckkraft: {draft.watermarkOpacity}%</Text>
          <Slider label="Deckkraft" isLabelHidden min={5} max={100}
            value={draft.watermarkOpacity} onChange={(v) => set({ watermarkOpacity: v })} />
        </div>
        <TextInput width="100%" label="Max. Vorschaugröße (px)"
          value={String(draft.previewMaxSize)} onChange={(v) => set({ previewMaxSize: Number(v) })} />
        <div {...stylex.props(sf.regenRow, sf.full)}>
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
                    onClick={() => void finishSetup()} />
                )}
              </div>
            </div>
          ) : (
            <div {...stylex.props(sf.sections)}>
              {brandingSection}
              {domainSection}
              {contactSection}
              {paymentSection}
              {watermarkSection}
              <Divider />
              <div {...stylex.props(sf.saveRow)}>
                <Button variant="primary" size="lg" label="Speichern" isDisabled={saving} isLoading={saving}
                  onClick={() => void save()} />
              </div>
            </div>
          )}
        </div>
        <div {...stylex.props(f.preview)}>
          <Text type="label" weight="semibold" color="secondary">Live-Vorschau</Text>
          <ThemePreview draft={draft} />
        </div>
      </div>

      {vorschauFuer && (
        <CustomerPreview shootingId={vorschauFuer} onClose={() => setVorschauFuer(null)} />
      )}
    </Page>
  );
}
