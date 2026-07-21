import { pb } from "./pocketbase";

// Mirrors the `settings` collection (see pb_migrations/1782300001_create_settings.js).
// A single record with a fixed id holds all instance branding/configuration.
export const SETTINGS_RECORD_ID = "appsettings0001";

export type FontKey = "inter" | "lora" | "playfair" | "montserrat";
export type ThemeMode = "light" | "dark" | "auto";

export interface AppSettings {
  id: string;
  businessName: string;
  shortName: string;
  tagline: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: FontKey;
  themeMode: ThemeMode;
  borderRadius: number;
  contactEmail: string;
  orderNotificationEmail: string;
  websiteUrl: string;
  customDomain: string;
  paypalClientId: string;
  paypalBusinessEmail: string;
  paypalEnabled: boolean;
  paypalLiveMode: boolean;
  stripeEnabled: boolean;
  currency: string;
  imprintHtml: string;
  privacyHtml: string;
  watermarkText: string;
  watermarkLogo: string;
  watermarkOpacity: number;
  previewMaxSize: number;
  setupCompleted: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_RECORD_ID,
  businessName: "Fotogalerie",
  shortName: "Album",
  tagline: "",
  logo: "",
  favicon: "",
  primaryColor: "#3d4a3d",
  secondaryColor: "#b08d57",
  fontFamily: "inter",
  themeMode: "light",
  borderRadius: 8,
  contactEmail: "",
  orderNotificationEmail: "",
  websiteUrl: "",
  customDomain: "",
  paypalClientId: "",
  paypalBusinessEmail: "",
  paypalEnabled: false,
  paypalLiveMode: false,
  stripeEnabled: false,
  currency: "EUR",
  imprintHtml: "",
  privacyHtml: "",
  watermarkText: "",
  watermarkLogo: "",
  watermarkOpacity: 40,
  previewMaxSize: 1200,
  setupCompleted: true, // defaults never trigger the wizard; only a loaded record can
};

const CACHE_KEY = "app_settings_cache_v1";

export function readSettingsCache(): AppSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function writeSettingsCache(settings: AppSettings): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    // storage full/unavailable — cache is best-effort
  }
}

export async function fetchSettings(): Promise<AppSettings> {
  const record = await pb
    .collection("settings")
    .getOne(SETTINGS_RECORD_ID, { requestKey: null });
  return { ...DEFAULT_SETTINGS, ...(record as unknown as Partial<AppSettings>) };
}

// URL for a settings file field (logo, favicon, watermarkLogo); "" when unset.
export function settingsFileUrl(
  settings: AppSettings,
  field: "logo" | "favicon" | "watermarkLogo",
  thumb?: string,
): string {
  const filename = settings[field];
  if (!filename) return "";
  const record = {
    id: settings.id,
    collectionId: "settings",
    collectionName: "settings",
  };
  return pb.files.getUrl(record, filename, thumb ? { thumb } : undefined);
}
