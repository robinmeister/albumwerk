import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { pb } from "../../config/pocketbase";
import { AppSettings, SETTINGS_RECORD_ID } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";

export type FileField = "logo" | "favicon" | "watermarkLogo";
type FileFields = Record<FileField, File | null>;

const LEERE_DATEIEN: FileFields = { logo: null, favicon: null, watermarkLogo: null };

// Alle Textfelder gehen bei jedem Speichern mit, unabhängig davon, welcher
// Abschnitt gerade sichtbar ist — das war schon im alten BrandingPage.save()
// so und ist der Grund, warum die vier Seiten sich einen Hook teilen können.
const TEXT_FIELDS: (keyof AppSettings)[] = [
  "businessName", "shortName", "tagline", "primaryColor", "secondaryColor",
  "fontFamily", "themeMode", "contactEmail", "orderNotificationEmail",
  "websiteUrl", "customDomain", "currency", "watermarkText", "designPreset",
];

// Ein Entwurf pro Seite, kein seitenübergreifender: wer ohne Speichern
// wechselt, verliert seine Änderungen — wie bisher beim Wechsel auf eine
// andere Adminseite auch.
export function useSettingsDraft() {
  const { settings, loaded, refresh } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [files, setFiles] = useState<FileFields>(LEERE_DATEIEN);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Bestandsbefund, verschoben aus BrandingPage.tsx:259 (dort bereits in der
    // Lint-Baseline) — unveränderte Übernahme, keine neue Verhaltensänderung.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loaded) setDraft(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const set = (patch: Partial<AppSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const setFile = (feld: FileField, file: File | null) =>
    setFiles((s) => ({ ...s, [feld]: file }));

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const fd = new FormData();
      TEXT_FIELDS.forEach((k) => fd.append(k, String(draft[k] ?? "")));
      fd.append("borderRadius", String(draft.borderRadius ?? 0));
      fd.append("themeOverrides", JSON.stringify(draft.themeOverrides ?? []));
      fd.append("watermarkOpacity", String(draft.watermarkOpacity ?? 40));
      fd.append("previewMaxSize", String(draft.previewMaxSize ?? 1200));
      if (draft.setupCompleted) fd.append("setupCompleted", "true");
      (Object.keys(files) as FileField[]).forEach((feld) => {
        const file = files[feld];
        if (file) fd.append(feld, file);
      });

      await pb.collection("settings").update(SETTINGS_RECORD_ID, fd);
      await refresh();
      setFiles(LEERE_DATEIEN);
      toast.success("Einstellungen gespeichert");
    } catch (error) {
      console.error("settings save failed", error);
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return { draft, setDraft, set, files, setFile, save, saving, settings, loaded };
}
