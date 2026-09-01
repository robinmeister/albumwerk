import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Theme } from "@astryxdesign/core";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

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
  // Der Wizard lief unter /branding?setup=1; die Checkliste hat ihn abgelöst.
  // Hooks laufen erst vollständig, der Redirect steht darum unten vor dem
  // JSX — ein früher return vor useSettingsDraft() würde React Hooks
  // konditionell aufrufen (react-hooks/rules-of-hooks).
  const [searchParams] = useSearchParams();
  const { draft, setDraft, set, files, setFile, save, saving, settings } = useSettingsDraft();

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

  if (searchParams.get("setup") === "1") return <Navigate to="/einrichtung" replace />;

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

  return (
    <Page title="Branding">
      <div {...stylex.props(f.layout)}>
        <div {...stylex.props(sf.sections)}>
          {brandingSection}
          <div {...stylex.props(sf.saveRow)}>
            <Button variant="primary" size="lg" label="Speichern" isDisabled={saving} isLoading={saving}
              onClick={() => void save()} />
          </div>
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
