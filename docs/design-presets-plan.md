# Design-Presets — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins wählen ein vorgefertigtes Design-Register (kontaktbogen, riss, passepartout); die ganze Instanz folgt ihm, einzelne Werte bleiben überschreibbar.

**Architecture:** Der Preset-Katalog liegt als reine Datei im Frontend. Die bestehenden Settings-Spalten tragen weiterhin den *effektiven* Wert (damit `pb_hooks` unangetastet bleibt); ein neues Feld `themeOverrides` hält fest, welche Felder der Admin bewusst gesetzt hat. Aufgelöst wird nur beim Schreiben. `buildAstryxTheme` ergänzt zusätzlich das Register — Surfaces, Schriftrollen, Component-Overrides.

**Tech Stack:** React 18, TypeScript, StyleX, `@astryxdesign/core`, PocketBase (pb_migrations), vitest, Playwright.

**Spec:** `docs/design-presets.md`

## Global Constraints

- Schriften werden **selbst gehostet** über `@fontsource`, kein Font-CDN (DSGVO). Imports in `src/main.tsx`.
- `pb_hooks/` wird in diesem Vorhaben **nicht angefasst**. `manifest.pb.js` und `lib/emaillib.js` lesen `primaryColor` direkt aus dem Datensatz; die Spalte muss deshalb immer den effektiven Wert tragen.
- Astryx-Mono-Token heißt `--font-family-code` (nicht `-mono`).
- `color.accent` normalisiert die Helligkeit und behält nur den Farbton. Nie ein Beinahe-Schwarz einspeisen — Messwerte in `docs/design-presets.md`.
- `themeMode` gehört weder zum Preset noch zu den überschreibbaren Feldern.
- Importrichtung: `designPresets.ts` importiert aus `settings.ts`, **nie umgekehrt**. `DesignPresetKey` und `OverridableField` wohnen deshalb in `settings.ts`.
- Kommentarsprache: Deutsch, wie in den neueren Dateien des Repos.
- Testlauf: `npm test` (vitest run). Typprüfung: `npm run test:check`.
- **Kein `npm run lint`.** Das Skript und `.eslintrc.cjs` existieren, aber im Repo ist keine eslint-Abhängigkeit installiert und die CI ruft lint nie auf — der Befehl ist seit jeher tot. Nicht reparieren: eine Lint-Toolchain einzuführen ist eine repoweite Entscheidung und gehört nicht in dieses Vorhaben.

---

### Task 1: Schriftpakete und Schrift-Stacks

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `src/config/settings.ts:6` (FontKey)
- Modify: `src/utils/theme.ts:10-16` (FONT_STACKS)
- Modify: `src/main.tsx:6-17` (fontsource-Imports)
- Test: `tests/designPresets.test.ts` (neu)

**Interfaces:**
- Consumes: nichts
- Produces: `FontKey` (erweitert), `FontStackKey`, `FONT_STACKS: Record<FontStackKey, FontStack>`, exportiert aus `src/utils/theme.ts`

- [ ] **Step 1: Pakete installieren**

```bash
cd /data/albumwerk
npm install @fontsource/familjen-grotesk @fontsource/public-sans \
  @fontsource/martian-mono @fontsource/instrument-serif @fontsource/newsreader
```

- [ ] **Step 2: Failing test schreiben**

`tests/designPresets.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { FONT_STACKS } from "../src/utils/theme";

describe("Schrift-Stacks", () => {
  it("kennt jede Familie, die ein Register belegen kann", () => {
    for (const key of [
      "inter", "lora", "playfair", "montserrat",
      "familjen-grotesk", "public-sans", "martian-mono",
      "instrument-serif", "newsreader",
    ] as const) {
      expect(FONT_STACKS[key], key).toBeDefined();
      expect(FONT_STACKS[key].family.length).toBeGreaterThan(0);
      expect(FONT_STACKS[key].fallbacks.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run tests/designPresets.test.ts`
Expected: FAIL — `FONT_STACKS` wird aus `theme.ts` nicht exportiert.

- [ ] **Step 4: Typen erweitern**

In `src/config/settings.ts` die Zeile `export type FontKey = "inter" | "lora" | "playfair" | "montserrat";` ersetzen durch:

```ts
// Was Admins im Branding-Formular auswählen können.
export type FontKey =
  | "inter" | "lora" | "playfair" | "montserrat"
  | "familjen-grotesk" | "public-sans" | "instrument-serif" | "newsreader";

// Obermenge: enthält zusätzlich reine Register-Schriften, die als
// Fließtextschrift nie zur Wahl stehen (Auszeichnung, Maßangaben).
export type FontStackKey = FontKey | "martian-mono";
```

- [ ] **Step 5: FONT_STACKS erweitern und exportieren**

In `src/utils/theme.ts` den Block `const FONT_STACKS: Record<FontKey, FontStack> = {...}` ersetzen durch:

```ts
export type FontStack = { family: string; fallbacks: string };

export const FONT_STACKS: Record<FontStackKey, FontStack> = {
  inter: { family: "Inter", fallbacks: '"Helvetica", "Arial", sans-serif' },
  lora: { family: "Lora", fallbacks: '"Georgia", serif' },
  playfair: { family: "Playfair Display", fallbacks: '"Georgia", serif' },
  montserrat: { family: "Montserrat", fallbacks: '"Helvetica", "Arial", sans-serif' },
  "familjen-grotesk": { family: "Familjen Grotesk", fallbacks: '"Helvetica", "Arial", sans-serif' },
  "public-sans": { family: "Public Sans", fallbacks: '"Helvetica", "Arial", sans-serif' },
  "martian-mono": { family: "Martian Mono", fallbacks: 'ui-monospace, "Menlo", monospace' },
  "instrument-serif": { family: "Instrument Serif", fallbacks: '"Georgia", serif' },
  newsreader: { family: "Newsreader", fallbacks: '"Georgia", serif' },
};
```

Der Import in `theme.ts` wird um `FontStackKey` ergänzt.

- [ ] **Step 6: Schriften laden**

In `src/main.tsx` nach den bestehenden `@fontsource`-Imports ergänzen:

```ts
import "@fontsource/familjen-grotesk/500.css";
import "@fontsource/familjen-grotesk/600.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/martian-mono/400.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/600.css";
```

- [ ] **Step 7: Test laufen lassen**

Run: `npx vitest run tests/designPresets.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/config/settings.ts src/utils/theme.ts src/main.tsx tests/designPresets.test.ts
git commit -m "feat(design): Schriftfamilien fuer die Design-Register laden"
```

---

### Task 2: Preset-Katalog

**Files:**
- Create: `src/config/designPresets.ts`
- Modify: `src/config/settings.ts` (Typen `DesignPresetKey`, `OverridableField`)
- Test: `tests/designPresets.test.ts`

**Interfaces:**
- Consumes: `FontKey`, `FontStackKey` aus Task 1
- Produces:
  - `DesignPresetKey = "kontaktbogen" | "riss" | "passepartout"` (aus `settings.ts`)
  - `OverridableField = "primaryColor" | "secondaryColor" | "fontFamily" | "borderRadius"` (aus `settings.ts`)
  - `DESIGN_PRESETS: Record<DesignPresetKey, DesignPreset>`
  - `getPreset(key: string | undefined): DesignPreset`

- [ ] **Step 1: Failing test schreiben**

An `tests/designPresets.test.ts` anhängen:

```ts
import { DESIGN_PRESETS, getPreset } from "../src/config/designPresets";

describe("Preset-Katalog", () => {
  it("hält drei Register bereit", () => {
    expect(Object.keys(DESIGN_PRESETS).sort()).toEqual([
      "kontaktbogen", "passepartout", "riss",
    ]);
  });

  it("belegt in jedem Register alle drei Schriftrollen", () => {
    for (const preset of Object.values(DESIGN_PRESETS)) {
      expect(FONT_STACKS[preset.register.headingFamily], preset.key).toBeDefined();
      expect(FONT_STACKS[preset.register.bodyFamily], preset.key).toBeDefined();
      expect(FONT_STACKS[preset.register.monoFamily], preset.key).toBeDefined();
    }
  });

  it("setzt nie ein Beinahe-Schwarz als Akzent — Astryx macht daraus Senfgelb", () => {
    // siehe docs/design-presets.md, Messung vom 2026-08-27
    for (const preset of Object.values(DESIGN_PRESETS)) {
      const hex = preset.defaults.primaryColor.replace("#", "");
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const helligkeit = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      expect(helligkeit, `${preset.key} ist zu dunkel für color.accent`).toBeGreaterThan(0.08);
    }
  });

  it("fällt bei unbekanntem Schlüssel auf kontaktbogen zurück", () => {
    expect(getPreset("gibtesnicht").key).toBe("kontaktbogen");
    expect(getPreset(undefined).key).toBe("kontaktbogen");
    expect(getPreset("riss").key).toBe("riss");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run tests/designPresets.test.ts`
Expected: FAIL — Modul `../src/config/designPresets` existiert nicht.

- [ ] **Step 3: Typen in settings.ts ergänzen**

Direkt unter `FontStackKey` in `src/config/settings.ts`:

```ts
export type DesignPresetKey = "kontaktbogen" | "riss" | "passepartout";

// Die vier Werte, die ein Admin gegen das Preset setzen darf.
export type OverridableField =
  | "primaryColor" | "secondaryColor" | "fontFamily" | "borderRadius";
```

- [ ] **Step 4: Katalog anlegen**

`src/config/designPresets.ts`:

```ts
import { DesignPresetKey, FontKey, FontStackKey } from "./settings";

// Ein Preset hat zwei Hälften mit unterschiedlichem Besitzer:
// `defaults` sind Vorgaben für die vier überschreibbaren Settings-Felder,
// `register` ist die Gestaltung selbst und nicht einzeln überschreibbar.
// Begründung und Farbmessungen: docs/design-presets.md
export interface DesignPreset {
  key: DesignPresetKey;
  name: string;
  description: string;
  defaults: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: FontKey;
    borderRadius: number;
  };
  register: {
    surfaces: {
      body: [string, string];
      surface: [string, string];
      card: [string, string];
    };
    headingFamily: FontStackKey;
    bodyFamily: FontStackKey;
    monoFamily: FontStackKey;
    // Astryx-Component-Overrides, Form wie in buildAstryxTheme
    components: Record<string, Record<string, Record<string, string>>>;
  };
}

// Gemeinsam für kontaktbogen und riss: flache Flächen, rechteckige Ecken,
// straffe Überschriften. Die Knopffüllung setzt jedes Register selbst, damit
// die Markierungsfarbe Markierung bleibt und nie zur Fläche wird.
function flachesRegister(tinte: string) {
  return {
    heading: { base: { fontWeight: "600", letterSpacing: "-0.035em" } },
    button: { base: { borderRadius: "0", boxShadow: "none", backgroundColor: tinte } },
    card: { base: { boxShadow: "none", borderWidth: "1px" } },
  };
}

export const DESIGN_PRESETS: Record<DesignPresetKey, DesignPreset> = {
  kontaktbogen: {
    key: "kontaktbogen",
    name: "Kontaktbogen",
    description: "Auswahl als Handwerk. Positivpapier, Filmträger, Fettstift.",
    defaults: {
      primaryColor: "#cf2f22",
      secondaryColor: "#14130f",
      fontFamily: "public-sans",
      borderRadius: 0,
    },
    register: {
      surfaces: {
        body: ["#e4e1d6", "#191814"],
        surface: ["#edeae1", "#211f1a"],
        card: ["#edeae1", "#211f1a"],
      },
      headingFamily: "familjen-grotesk",
      bodyFamily: "public-sans",
      monoFamily: "martian-mono",
      components: flachesRegister("#14130f"),
    },
  },
  riss: {
    key: "riss",
    name: "Riss",
    description: "Gerät, das dir gehört. Hell die Weißpause, dunkel die Blaupause.",
    defaults: {
      primaryColor: "#f2c400",
      secondaryColor: "#0a2233",
      fontFamily: "public-sans",
      borderRadius: 0,
    },
    register: {
      surfaces: {
        body: ["#dfe7eb", "#0d3550"],
        surface: ["#e9eef1", "#0f3d5c"],
        card: ["#e9eef1", "#0f3d5c"],
      },
      headingFamily: "familjen-grotesk",
      bodyFamily: "public-sans",
      monoFamily: "martian-mono",
      components: flachesRegister("#0a2233"),
    },
  },
  passepartout: {
    key: "passepartout",
    name: "Passepartout",
    description: "Das fertige Album. Karton, Buchleinen, tiefe Passepartouts.",
    defaults: {
      primaryColor: "#5a2231",
      secondaryColor: "#17181a",
      fontFamily: "newsreader",
      borderRadius: 0,
    },
    register: {
      surfaces: {
        body: ["#dfdcd4", "#1c1a17"],
        surface: ["#ece9e1", "#242119"],
        card: ["#ece9e1", "#242119"],
      },
      headingFamily: "instrument-serif",
      bodyFamily: "newsreader",
      monoFamily: "public-sans",
      components: {
        heading: { base: { fontWeight: "400", letterSpacing: "0" } },
        button: { base: { borderRadius: "0", boxShadow: "none", backgroundColor: "#17181a" } },
        card: { base: { boxShadow: "none", borderWidth: "1px" } },
      },
    },
  },
};

export const DEFAULT_PRESET: DesignPresetKey = "kontaktbogen";

// Ein unbekannter Schlüssel darf nicht auf einer ungestylten Seite enden —
// etwa nach einem Downgrade, wenn die DB ein neueres Register nennt.
export function getPreset(key: string | undefined): DesignPreset {
  return DESIGN_PRESETS[key as DesignPresetKey] ?? DESIGN_PRESETS[DEFAULT_PRESET];
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run tests/designPresets.test.ts`
Expected: PASS (4 Tests)

- [ ] **Step 6: Commit**

```bash
git add src/config/designPresets.ts src/config/settings.ts tests/designPresets.test.ts
git commit -m "feat(design): Preset-Katalog mit drei Registern"
```

---

### Task 3: Override-Logik

**Files:**
- Create: `src/utils/themeOverrides.ts`
- Test: `tests/designPresets.test.ts`

**Interfaces:**
- Consumes: `DESIGN_PRESETS`, `getPreset` (Task 2); `AppSettings`, `OverridableField` (Task 4 ergänzt die Felder — für diesen Task genügt ein struktureller Teiltyp, siehe unten)
- Produces:
  - `isOverridden(s: ThemeFields, field: OverridableField): boolean`
  - `applyPreset<T extends ThemeFields>(s: T, key: DesignPresetKey): T`
  - `setOverride<T extends ThemeFields, F extends OverridableField>(s: T, field: F, value: ThemeFields[F]): T`
  - `clearOverride<T extends ThemeFields>(s: T, field): T`
  - `ThemeFields` — der Teil von `AppSettings`, den diese Funktionen brauchen

- [ ] **Step 1: Failing test schreiben**

An `tests/designPresets.test.ts` anhängen:

```ts
import {
  applyPreset, clearOverride, isOverridden, setOverride, type ThemeFields,
} from "../src/utils/themeOverrides";

const basis: ThemeFields = {
  designPreset: "kontaktbogen",
  themeOverrides: [],
  primaryColor: "#cf2f22",
  secondaryColor: "#14130f",
  fontFamily: "public-sans",
  borderRadius: 0,
};

describe("Override-Logik", () => {
  it("übernimmt beim Preset-Wechsel alle geerbten Felder", () => {
    const nachher = applyPreset(basis, "riss");
    expect(nachher.designPreset).toBe("riss");
    expect(nachher.primaryColor).toBe("#f2c400");
    expect(nachher.secondaryColor).toBe("#0a2233");
    expect(nachher.borderRadius).toBe(0);
  });

  it("lässt gesetzte Felder beim Preset-Wechsel stehen", () => {
    const eigen = setOverride(basis, "primaryColor", "#0066ff");
    const nachher = applyPreset(eigen, "riss");
    expect(nachher.primaryColor).toBe("#0066ff");
    expect(nachher.secondaryColor).toBe("#0a2233"); // geerbt, zieht mit
    expect(nachher.themeOverrides).toEqual(["primaryColor"]);
  });

  it("merkt sich borderRadius 0 als bewusst gesetzt", () => {
    // 0 ist ein gültiger Wert — genau deshalb eine Namensliste statt Leerwerten
    const eigen = setOverride(basis, "borderRadius", 0);
    expect(isOverridden(eigen, "borderRadius")).toBe(true);
    expect(applyPreset(eigen, "passepartout").borderRadius).toBe(0);
  });

  it("stellt beim Zurücksetzen den Preset-Wert wieder her", () => {
    const eigen = setOverride(basis, "primaryColor", "#0066ff");
    const zurueck = clearOverride(eigen, "primaryColor");
    expect(zurueck.primaryColor).toBe("#cf2f22");
    expect(zurueck.themeOverrides).toEqual([]);
    expect(isOverridden(zurueck, "primaryColor")).toBe(false);
  });

  it("nimmt denselben Override nicht doppelt auf", () => {
    const zweimal = setOverride(setOverride(basis, "fontFamily", "lora"), "fontFamily", "inter");
    expect(zweimal.themeOverrides).toEqual(["fontFamily"]);
    expect(zweimal.fontFamily).toBe("inter");
  });

  it("verändert die Eingabe nicht", () => {
    const vorher = { ...basis, themeOverrides: [...basis.themeOverrides] };
    applyPreset(basis, "riss");
    setOverride(basis, "primaryColor", "#0066ff");
    expect(basis).toEqual(vorher);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run tests/designPresets.test.ts`
Expected: FAIL — Modul `../src/utils/themeOverrides` existiert nicht.

- [ ] **Step 3: Implementieren**

`src/utils/themeOverrides.ts`:

```ts
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

export function setOverride<T extends ThemeFields, F extends OverridableField>(
  s: T,
  field: F,
  value: ThemeFields[F],
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
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/designPresets.test.ts`
Expected: PASS (alle Tests aus Task 1–3)

- [ ] **Step 5: Commit**

```bash
git add src/utils/themeOverrides.ts tests/designPresets.test.ts
git commit -m "feat(design): geerbt-vs-gesetzt fuer die vier Branding-Werte"
```

---

### Task 4: Settings-Felder und Migration

**Files:**
- Modify: `src/config/settings.ts` (AppSettings, DEFAULT_SETTINGS)
- Create: `pb_migrations/1785600001_design_presets.js`

**Interfaces:**
- Consumes: `DesignPresetKey`, `OverridableField` (Task 2)
- Produces: `AppSettings.designPreset`, `AppSettings.themeOverrides`; Collection-Felder gleichen Namens

- [ ] **Step 1: AppSettings erweitern**

In `src/config/settings.ts` im Interface `AppSettings` direkt nach `borderRadius: number;`:

```ts
  // Gewähltes Design-Register (docs/design-presets.md).
  designPreset: DesignPresetKey;
  // Welche der vier Branding-Werte der Admin bewusst gesetzt hat. Alles, was
  // hier nicht steht, stammt aus dem Preset und zieht beim Wechsel mit.
  themeOverrides: OverridableField[];
```

- [ ] **Step 2: DEFAULT_SETTINGS auf kontaktbogen ziehen**

In `DEFAULT_SETTINGS` ersetzen:

```ts
  primaryColor: "#cf2f22",
  secondaryColor: "#14130f",
  fontFamily: "public-sans",
  borderRadius: 0,
  designPreset: "kontaktbogen",
  themeOverrides: [],
```

- [ ] **Step 3: Migration schreiben**

`pb_migrations/1785600001_design_presets.js`:

```js
/// <reference path="../pb_data/types.d.ts" />
// Design-Register für die Instanz (docs/design-presets.md).
//
// Die bestehenden Spalten tragen weiterhin den *effektiven* Wert — pb_hooks
// liest primaryColor direkt (manifest.pb.js, lib/emaillib.js) und kann nichts
// auflösen. `themeOverrides` hält nur fest, welche Werte bewusst gesetzt sind.
//
// Backfill-Regel: Wer noch auf den alten Voreinstellungen steht, hat nie etwas
// eingestellt und bekommt das neue Register. Wer abweicht, behält seinen Wert
// und bekommt ihn als Override eingetragen.
const ALT = {
  primaryColor: "#3d4a3d",
  secondaryColor: "#b08d57",
  fontFamily: "inter",
  borderRadius: 8,
};

const KONTAKTBOGEN = {
  primaryColor: "#cf2f22",
  secondaryColor: "#14130f",
  fontFamily: "public-sans",
  borderRadius: 0,
};

migrate((app) => {
  const collection = app.findCollectionByNameOrId("settings");

  collection.fields.add(new Field({
    name: "designPreset",
    id: "sel_set_preset",
    type: "select", maxSelect: 1,
    values: ["kontaktbogen", "riss", "passepartout"],
    required: false, hidden: false, presentable: false, system: false,
  }));
  collection.fields.add(new Field({
    name: "themeOverrides",
    id: "jsn_set_ovrd",
    type: "json", maxSize: 512,
    required: false, hidden: false, presentable: false, system: false,
  }));

  // Auswahlliste der Schriften erweitern; die vier bisherigen bleiben gültig,
  // sonst würden bestehende Datensätze beim nächsten Speichern ungültig.
  const font = collection.fields.getByName("fontFamily");
  font.values = [
    "inter", "lora", "playfair", "montserrat",
    "familjen-grotesk", "public-sans", "instrument-serif", "newsreader",
  ];

  app.save(collection);

  try {
    const record = app.findRecordById("settings", "appsettings0001");
    const overrides = [];

    for (const feld of ["primaryColor", "secondaryColor", "fontFamily"]) {
      if (record.getString(feld) && record.getString(feld) !== ALT[feld]) {
        overrides.push(feld);
      } else {
        record.set(feld, KONTAKTBOGEN[feld]);
      }
    }
    if (record.getInt("borderRadius") !== ALT.borderRadius) {
      overrides.push("borderRadius");
    } else {
      record.set("borderRadius", KONTAKTBOGEN.borderRadius);
    }

    record.set("designPreset", "kontaktbogen");
    record.set("themeOverrides", overrides);
    app.save(record);
  } catch (_) {
    // Einstellungen noch nicht angelegt — DEFAULT_SETTINGS trägt dieselben Werte
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings");

  try {
    const record = app.findRecordById("settings", "appsettings0001");
    record.set("primaryColor", ALT.primaryColor);
    record.set("secondaryColor", ALT.secondaryColor);
    record.set("fontFamily", ALT.fontFamily);
    record.set("borderRadius", ALT.borderRadius);
    app.save(record);
  } catch (_) {
    // nichts zurückzusetzen
  }

  const font = collection.fields.getByName("fontFamily");
  font.values = ["inter", "lora", "playfair", "montserrat"];
  collection.fields.removeByName("designPreset");
  collection.fields.removeByName("themeOverrides");
  app.save(collection);
});
```

- [ ] **Step 4: Typprüfung**

Run: `npm run test:check && npm run lint`
Expected: keine Fehler.

- [ ] **Step 5: Migration gegen eine frische Instanz laufen lassen**

Run: `make dev-reset` (löscht die Dev-Instanz und legt sie mit Demo-Daten neu an), danach `make dev-logs`.
Expected: Migration läuft ohne Fehler durch; im PocketBase-Dashboard trägt der Settings-Datensatz `designPreset: kontaktbogen` und `themeOverrides: []`.

Zweiter Durchgang für die Backfill-Regel. **Achtung:** PocketBase-Migrationen laufen einmalig — ein blosser Neustart (`dev-stop && dev`) führt sie nicht erneut aus. Der Backfill wird nur über einen echten Rückwärts-/Vorwärtslauf geprüft: `migrate down 1`, dann im Dashboard `primaryColor` auf `#0066ff` setzen, dann `migrate up`.
Expected: `themeOverrides` enthält `["primaryColor"]`, `primaryColor` ist noch `#0066ff`, `secondaryColor` steht auf `#14130f`.

- [ ] **Step 6: Commit**

```bash
git add src/config/settings.ts pb_migrations/1785600001_design_presets.js
git commit -m "feat(design): designPreset und themeOverrides in den Einstellungen"
```

---

### Task 5: Register in buildAstryxTheme

**Files:**
- Modify: `src/utils/theme.ts:56-130` (buildAstryxTheme)
- Test: `tests/designPresets.test.ts`

**Interfaces:**
- Consumes: `getPreset` (Task 2), `isOverridden` (Task 3), `AppSettings` (Task 4)
- Produces: `buildAstryxTheme(settings)` berücksichtigt zusätzlich das Register

- [ ] **Step 1: Failing test schreiben**

An `tests/designPresets.test.ts` anhängen:

```ts
import { DEFAULT_SETTINGS } from "../src/config/settings";
import { buildAstryxTheme } from "../src/utils/theme";

const tokensVon = (theme: unknown) =>
  (theme as { tokens: Record<string, string | [string, string]> }).tokens;

describe("buildAstryxTheme mit Register", () => {
  it("nimmt die Flächen aus dem gewählten Register", () => {
    const t = buildAstryxTheme({ ...DEFAULT_SETTINGS, designPreset: "riss" });
    expect(tokensVon(t)["--color-background-body"]).toEqual(["#dfe7eb", "#0d3550"]);
  });

  it("nutzt bei geerbter Schrift das Paar des Registers", () => {
    const t = buildAstryxTheme({ ...DEFAULT_SETTINGS, designPreset: "kontaktbogen" });
    const tokens = tokensVon(t);
    expect(String(tokens["--font-family-heading"])).toContain("Familjen Grotesk");
    expect(String(tokens["--font-family-body"])).toContain("Public Sans");
    expect(String(tokens["--font-family-code"])).toContain("Martian Mono");
  });

  it("nutzt bei gesetzter Schrift eine Familie für alles", () => {
    const t = buildAstryxTheme({
      ...DEFAULT_SETTINGS,
      designPreset: "kontaktbogen",
      fontFamily: "lora",
      themeOverrides: ["fontFamily"],
    });
    const tokens = tokensVon(t);
    expect(String(tokens["--font-family-heading"])).toContain("Lora");
    expect(String(tokens["--font-family-body"])).toContain("Lora");
  });

  it("fällt bei unbekanntem Register auf kontaktbogen zurück", () => {
    const t = buildAstryxTheme({
      ...DEFAULT_SETTINGS,
      designPreset: "gibtesnicht" as never,
    });
    expect(tokensVon(t)["--color-background-body"]).toEqual(["#e4e1d6", "#191814"]);
  });

  // Fängt versehentliche Token-Dreher, die kein gezielter Test abdeckt.
  it.each(["kontaktbogen", "riss", "passepartout"] as const)(
    "hält die Tokens von %s stabil",
    (key) => {
      const t = buildAstryxTheme({ ...DEFAULT_SETTINGS, designPreset: key });
      expect(tokensVon(t)).toMatchSnapshot();
    },
  );
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run tests/designPresets.test.ts`
Expected: FAIL — Flächen und Schriften stammen noch aus den fest verdrahteten Werten.

- [ ] **Step 3: buildAstryxTheme umbauen**

In `src/utils/theme.ts` die Importzeile ergänzen:

```ts
import { getPreset } from "../config/designPresets";
import { isOverridden } from "./themeOverrides";
```

Im Rumpf von `buildAstryxTheme` den Block ab `const font = FONT_STACKS[...]` bis zum `return defineTheme({...})` ersetzen durch:

```ts
  const preset = getPreset(settings.designPreset);
  const radiusPx = Number.isFinite(settings.borderRadius)
    ? Math.min(Math.max(settings.borderRadius, 0), 32)
    : preset.defaults.borderRadius;

  // Schriftregel (docs/design-presets.md): geerbt -> das Paar des Registers,
  // gesetzt -> eine Familie für alles, wie vor den Presets.
  const eigeneSchrift = isOverridden(settings, "fontFamily");
  const heading = eigeneSchrift
    ? FONT_STACKS[settings.fontFamily]
    : FONT_STACKS[preset.register.headingFamily];
  const body = eigeneSchrift
    ? FONT_STACKS[settings.fontFamily]
    : FONT_STACKS[preset.register.bodyFamily];
  const mono = FONT_STACKS[preset.register.monoFamily];

  const tokens: Record<string, string | [string, string]> = {
    "--color-brand-secondary": secondary,
    "--radius-element": `${radiusPx}px`,
    "--radius-container": `${radiusPx}px`,
    "--color-background-body": preset.register.surfaces.body,
    "--color-background-surface": preset.register.surfaces.surface,
    "--color-background-card": preset.register.surfaces.card,
    "--font-family-code": `"${mono.family}", ${mono.fallbacks}`,
  };

  return defineTheme({
    name: `albumwerk-${preset.key}`,
    extends: neutralTheme,
    color: { accent: primary },
    typography: {
      body: { family: body.family, fallbacks: body.fallbacks },
      heading: { family: heading.family, fallbacks: heading.fallbacks },
    },
    tokens: tokens as DefineThemeTokens,
    components: preset.register.components,
  });
```

Die alten `components`-Overrides (heading/button/card) und der `--color-background-*`-Block entfallen — sie leben jetzt im Katalog. Der Kommentarblock zur gestauchten Astryx-Überschriftenskala wandert nach `src/config/designPresets.ts` über `flachesRegister`.

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS, alle Testdateien.

- [ ] **Step 5: Sichtprüfung**

Run: `npm run dev`, dann `/branding` öffnen und `designPreset` im PocketBase-Dashboard auf `riss` und `passepartout` stellen.
Expected: Die App wechselt Fläche, Schrift und Knopfform. Notiere, ob der Akzent bei passepartout zu sehr nach Himbeere zieht (siehe Spec) — wenn ja, `defaults.primaryColor` dort nachjustieren und den Messwert in `docs/design-presets.md` nachtragen.

- [ ] **Step 6: Commit**

```bash
git add src/utils/theme.ts tests/designPresets.test.ts
git commit -m "feat(design): Register aus dem Preset in das Astryx-Theme ziehen"
```

---

### Task 6: Preset-Wähler auf der Branding-Seite

**Files:**
- Create: `src/features/Settings/components/PresetPicker.tsx`
- Modify: `src/pages/admin/BrandingPage.tsx` (FONT_OPTIONS, Formularfelder, `save`)

**Interfaces:**
- Consumes: `DESIGN_PRESETS`, `applyPreset`, `clearOverride`, `isOverridden`, `setOverride`, `buildAstryxTheme`
- Produces: `<PresetPicker value onChange />`

- [ ] **Step 1: Wähler anlegen**

`src/features/Settings/components/PresetPicker.tsx`:

```tsx
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
    textAlign: "left", background: "none",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-container)",
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
```

- [ ] **Step 2: Schriftauswahl erweitern**

In `src/pages/admin/BrandingPage.tsx` die Liste `FONT_OPTIONS` ergänzen:

```ts
  { value: "familjen-grotesk", label: "Familjen Grotesk (kantig, serifenlos)" },
  { value: "public-sans", label: "Public Sans (nüchtern, serifenlos)" },
  { value: "instrument-serif", label: "Instrument Serif (hoher Kontrast, Serifen)" },
  { value: "newsreader", label: "Newsreader (Lesetext, Serifen)" },
```

- [ ] **Step 3: Wähler und Zurücksetzen einbauen**

Importe ergänzen:

```tsx
import PresetPicker from "../../features/Settings/components/PresetPicker";
import { applyPreset, clearOverride, isOverridden, setOverride } from "../../utils/themeOverrides";
import { DesignPresetKey, OverridableField } from "../../config/settings";
```

Im Abschnitt „Design" oberhalb der Farbfelder einsetzen:

```tsx
<PresetPicker settings={draft} onChange={(key: DesignPresetKey) => setDraft((d) => applyPreset(d, key))} />
```

Und einen kleinen Helfer, der neben jedem der vier Felder den Zustand zeigt:

```tsx
const Herkunft = ({ feld }: { feld: OverridableField }): ReactElement =>
  isOverridden(draft, feld) ? (
    <Button variant="ghost" onClick={() => setDraft((d) => clearOverride(d, feld))}>
      Auf Preset zurücksetzen
    </Button>
  ) : (
    <Text type="supporting" color="secondary">vom Preset</Text>
  );
```

Die vier Eingaben schreiben ab jetzt über `setOverride` statt über `set`, damit das Anfassen eines Feldes es als gesetzt markiert. Beispiel für die Schriftart (Zeile 314–315):

```tsx
<Selector width="100%" label="Schriftart" value={draft.fontFamily}
  options={FONT_OPTIONS}
  onChange={(v) => v && setDraft((d) => setOverride(d, "fontFamily", v as FontKey))} />
<Herkunft feld="fontFamily" />
```

Die drei übrigen Felder (Zeilen 328–329 und 332–333) entsprechend:

```tsx
<ColorField label="Primärfarbe" value={draft.primaryColor}
  onChange={(v) => setDraft((d) => setOverride(d, "primaryColor", v))} />
<Herkunft feld="primaryColor" />

<ColorField label="Sekundärfarbe" value={draft.secondaryColor}
  onChange={(v) => setDraft((d) => setOverride(d, "secondaryColor", v))} />
<Herkunft feld="secondaryColor" />

<Text type="supporting" color="secondary">Eckenradius: {draft.borderRadius}px</Text>
<Slider min={0} max={32} step={1} value={draft.borderRadius}
  onChange={(v) => setDraft((d) => setOverride(d, "borderRadius", v))} />
<Herkunft feld="borderRadius" />
```

- [ ] **Step 4: Speichern erweitern**

In `save` (Zeile ~237) die Liste `textFields` um `"designPreset"` ergänzen und nach der `borderRadius`-Zeile einfügen:

```ts
      fd.append("themeOverrides", JSON.stringify(draft.themeOverrides ?? []));
```

- [ ] **Step 5: Prüfen**

Run: `npm run lint && npm run test:check && npm test`
Expected: keine Fehler, alle Tests grün.

Run: `npm run dev`, `/branding` öffnen.
Expected: Drei Karten, jede in ihrem eigenen Register gerendert. Klick wechselt die ganze Seite. Ein Farbfeld anfassen → Hinweis wechselt auf „Auf Preset zurücksetzen". Registerwechsel lässt dieses Feld stehen, die anderen ziehen mit.

- [ ] **Step 6: Commit**

```bash
git add src/features/Settings/components/PresetPicker.tsx src/pages/admin/BrandingPage.tsx
git commit -m "feat(design): Preset-Waehler und Herkunftsanzeige im Branding"
```

---

### Task 7: End-to-End-Absicherung

**Files:**
- Modify: `e2e/tests/einstellungen/branding.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `DEMO_ADMIN` aus `../../support/fixtures`; `einstellungenSichern`, `einstellungenWiederherstellen` aus `../../support/settings`

- [ ] **Step 1: Test anhängen**

An `e2e/tests/einstellungen/branding.spec.ts` anhängen (die vorhandenen `beforeAll`/`afterAll` sichern und stellen die Einstellungen bereits wieder her):

```ts
test("Fotograf wechselt das Design-Register und es überlebt den Neuladen", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/branding");

  const koerper = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const vorher = await koerper();

  await page.getByTestId("preset:riss").click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Einstellungen gespeichert")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("preset:riss")).toHaveAttribute("aria-pressed", "true");
  expect(await koerper()).not.toBe(vorher);
});

test("eine eigene Farbe überlebt den Registerwechsel", async ({ page, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/branding");

  const abschnitt = page.getByTestId("abschnitt:Branding");
  await abschnitt.getByLabel("Primärfarbe").fill("#0066ff");
  await page.getByTestId("preset:passepartout").click();

  await expect(abschnitt.getByLabel("Primärfarbe")).toHaveValue("#0066ff");
  await expect(abschnitt.getByRole("button", { name: "Auf Preset zurücksetzen" }).first()).toBeVisible();
});
```

- [ ] **Step 2: Laufen lassen**

Run: `npm run e2e:check && npx playwright test e2e/tests/einstellungen/branding.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/einstellungen/branding.spec.ts
git commit -m "test(design): Registerwechsel und Override end-to-end absichern"
```

---

## Was dieser Plan bewusst nicht tut

- **Kein „Bestand"-Preset.** Bestehende Instanzen ändern beim Update ihr Aussehen; begründet in der Spec.
- **Keine Änderung an `pb_hooks/`.** Die effektiven Werte stehen weiter in den Spalten, deshalb bleiben Bestellmails und PWA-Manifest unberührt.
- **Keine Unit-Tests für die Backfill-Regel der Migration.** Sie läuft in PocketBases eigener JS-Umgebung; abgedeckt wird sie über Task 4, Step 5 und den e2e-Lauf.
- **Kein Umbau der Kundengalerie.** Sie folgt dem Theme automatisch, weil `<Theme>` in `App.tsx` die ganze Anwendung umschließt.
