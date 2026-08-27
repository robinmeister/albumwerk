import { useEffect } from "react";

import { getPreset } from "../config/designPresets";
import { settingsFileUrl } from "../config/settings";
import { useSettings } from "../context/SettingsContext";
import { resolveMode } from "../utils/theme";

function upsertLink(rel: string, href: string): void {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

function upsertMeta(name: string, content: string): void {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

// Applies the instance branding to the document: tab title, favicon and the
// browser theme color. Runs whenever the settings change (e.g. after saving
// on the branding page) — no rebuild needed.
export function useBranding(): void {
  const { settings } = useSettings();

  useEffect(() => {
    document.title = settings.businessName || "Fotogalerie";
    // status bar follows the active register's (neutral) body surface, not
    // the accent color
    const body = getPreset(settings.designPreset).register.surfaces.body;
    upsertMeta("theme-color", resolveMode(settings) === "dark" ? body[1] : body[0]);
    upsertMeta("description", settings.tagline || settings.businessName);

    const favicon =
      settingsFileUrl(settings, "favicon") || settingsFileUrl(settings, "logo");
    if (favicon) {
      // replace all statically declared icons so the uploaded one wins
      document
        .querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
        .forEach((el, index) => index > 0 && el.remove());
      upsertLink("icon", favicon);
      upsertLink("apple-touch-icon", favicon);
    }
  }, [settings]);
}
