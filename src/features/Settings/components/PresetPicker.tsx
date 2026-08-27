import { Theme } from "@astryxdesign/core";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement } from "react";

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
function Probe({ preset, settings }: { preset: DesignPreset; settings: AppSettings }): ReactElement {
  const draft = applyPreset({ ...settings, themeOverrides: [] }, preset.key);
  return (
    <Theme theme={buildAstryxTheme(draft)} mode={themeModeProp(draft)}>
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
