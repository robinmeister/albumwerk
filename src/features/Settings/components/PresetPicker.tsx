import { Theme } from "@astryxdesign/core";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useMemo } from "react";

import { DESIGN_PRESETS, DesignPreset } from "../../../config/designPresets";
import { AppSettings, DesignPresetKey } from "../../../config/settings";
import { buildAstryxTheme, themeModeProp } from "../../../utils/theme";
import { applyPreset } from "../../../utils/themeOverrides";

const s = stylex.create({
  grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  karte: {
    display: "flex", flexDirection: "column", gap: 8, padding: 12, cursor: "pointer",
    textAlign: "left", background: "none", font: "inherit",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-container)",
    outline: { default: "none", ":focus-visible": "2px solid var(--color-accent)" },
    outlineOffset: 3,
  },
  gewaehlt: { borderColor: "var(--color-accent)", borderWidth: 2 },
  probe: { display: "flex", gap: 6, alignItems: "center" },
  flaeche: { flex: 1, height: 34, border: "1px solid var(--color-border)" },
  knopf: { width: 34, height: 34 },
});

// Zeigt jedes Register an sich selbst: die kleine Probe rendert in einem
// eigenen <Theme>, damit man Fläche, Akzent und Knopfform sieht, statt sie
// zu lesen.
//
// Die Probe ignoriert bewusst jeden Override (themeOverrides: []) — das
// gebaute Theme hängt also nur von preset.key und settings.themeMode ab, nie
// vom Rest des Drafts. buildAstryxTheme(draft) ohne Memo erzeugt bei jedem
// Tastendruck im Formular ein neues Theme-Objekt (anderer Name, siehe
// fingerprint() in theme.ts), und Theme's Injection-Effekt entfernt dafür bei
// jedem Re-Render die eingespritzten <style>-Tags und hängt sie neu an — pro
// Tastendruck dreimal, einmal je Preset-Karte. Auf die tatsächlich
// relevanten Werte memoisieren vermeidet das.
function Probe({ preset, settings }: { preset: DesignPreset; settings: AppSettings }): ReactElement {
  const themeMode = settings.themeMode;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- draft hängt absichtlich nur von preset.key/themeMode ab, siehe Kommentar oben
  const draft = useMemo(
    () => applyPreset({ ...settings, themeOverrides: [] }, preset.key),
    [preset.key, themeMode],
  );
  const theme = useMemo(() => buildAstryxTheme(draft), [draft]);
  return (
    <Theme theme={theme} mode={themeModeProp(draft)}>
      <div {...stylex.props(s.probe)}>
        <div {...stylex.props(s.flaeche)} style={{ background: "var(--color-background-card)" }} />
        <div {...stylex.props(s.knopf)} style={{ background: "var(--color-accent)" }} />
      </div>
    </Theme>
  );
}

export default function PresetPicker({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (key: DesignPresetKey) => void;
}): ReactElement {
  return (
    <div {...stylex.props(s.grid)} data-testid="preset-waehler">
      {Object.values(DESIGN_PRESETS).map((preset) => {
        const aktiv = settings.designPreset === preset.key;
        return (
          <button
            key={preset.key}
            type="button"
            aria-pressed={aktiv}
            data-testid={`preset:${preset.key}`}
            onClick={() => onChange(preset.key)}
            {...stylex.props(s.karte, aktiv && s.gewaehlt)}
          >
            <Probe preset={preset} settings={settings} />
            <Text weight="semibold">{preset.name}</Text>
            <Text type="supporting" color="secondary">{preset.description}</Text>
          </button>
        );
      })}
    </div>
  );
}
