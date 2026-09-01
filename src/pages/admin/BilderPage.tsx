import { Button } from "@astryxdesign/core/Button";
import { Slider } from "@astryxdesign/core/Slider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useState } from "react";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { settingsFileUrl } from "../../config/settings";
import { ImageDrop, SectionCard, sf } from "../../features/Settings/components/SettingsSection";
import { useSettingsDraft } from "../../features/Settings/useSettingsDraft";

export default function BilderPage(): ReactElement {
  const { draft, set, files, setFile, save, saving, settings } = useSettingsDraft();
  const [regenerating, setRegenerating] = useState(false);

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

  return (
    <Page title="Bilder & Wasserzeichen" showTitleOnMobile>
      <div {...stylex.props(sf.sections)}>
        {watermarkSection}
        <div {...stylex.props(sf.saveRow)}>
          <Button variant="primary" size="lg" label="Speichern"
            isDisabled={saving} isLoading={saving} onClick={() => void save()} />
        </div>
      </div>
    </Page>
  );
}
