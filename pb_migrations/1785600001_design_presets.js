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
const ALT_FONTS = ["inter", "lora", "playfair", "montserrat"];

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

  // Nur zurücksetzen, was NICHT bewusst gesetzt war — sonst verliert ein Downgrade
  // die individuelle Markenfarbe, die `up()` gerade deshalb erhalten hatte.
  try {
    const record = app.findRecordById("settings", "appsettings0001");
    // "|| []" auch nach dem Parse: die literale Zeichenkette "null" ist kein
    // leerer String, parst aber zu null, und null.includes() würde sonst in
    // den blanket catch unten laufen und down() ohne Rücksetzung beenden
    // (siehe pb_hooks/lib/supportlib.js:97 für dasselbe Muster).
    const overrides = JSON.parse(record.getString("themeOverrides") || "[]") || [];

    for (const feld of ["primaryColor", "secondaryColor", "borderRadius"]) {
      if (!overrides.includes(feld)) record.set(feld, ALT[feld]);
    }
    // fontFamily: einen Override nur behalten, wenn er in der alten Auswahlliste
    // steht — sonst wäre der Datensatz nach der Narrowing unten ungültig.
    if (!overrides.includes("fontFamily") || !ALT_FONTS.includes(record.getString("fontFamily"))) {
      record.set("fontFamily", ALT.fontFamily);
    }

    app.save(record);
  } catch (_) {
    // nichts zurückzusetzen
  }

  const font = collection.fields.getByName("fontFamily");
  font.values = ALT_FONTS;
  collection.fields.removeByName("designPreset");
  collection.fields.removeByName("themeOverrides");
  app.save(collection);
});
