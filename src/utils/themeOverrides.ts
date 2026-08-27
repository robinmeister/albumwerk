import { getPreset } from "../config/designPresets";
import { DesignPresetKey, FontKey, OverridableField } from "../config/settings";

// Nur der Ausschnitt von AppSettings, den die Theme-Auflösung braucht. So
// lassen sich die Funktionen sowohl auf den gespeicherten Einstellungen als
// auch auf dem Formular-Draft der Branding-Seite anwenden.
export interface ThemeFields {
  designPreset: DesignPresetKey;
  themeOverrides: OverridableField[];
  primaryColor: string;
  secondaryColor: string;
  fontFamily: FontKey;
  borderRadius: number;
}

export function isOverridden(s: ThemeFields, field: OverridableField): boolean {
  return s.themeOverrides.includes(field);
}

// Wechselt das Register und rechnet dabei alle geerbten Felder neu. Bewusst
// gesetzte Felder bleiben unangetastet — das ist der ganze Zweck der Liste.
export function applyPreset<T extends ThemeFields>(s: T, key: DesignPresetKey): T {
  const { defaults } = getPreset(key);
  const next = { ...s, designPreset: key };
  for (const field of Object.keys(defaults) as OverridableField[]) {
    if (!isOverridden(s, field)) {
      (next as ThemeFields)[field] = defaults[field] as never;
    }
  }
  return next;
}

export function setOverride<T extends ThemeFields>(
  s: T,
  field: OverridableField,
  value: string | number,
): T {
  return {
    ...s,
    [field]: value,
    themeOverrides: isOverridden(s, field) ? s.themeOverrides : [...s.themeOverrides, field],
  };
}

export function clearOverride<T extends ThemeFields>(s: T, field: OverridableField): T {
  const { defaults } = getPreset(s.designPreset);
  return {
    ...s,
    [field]: defaults[field],
    themeOverrides: s.themeOverrides.filter((f) => f !== field),
  };
}
