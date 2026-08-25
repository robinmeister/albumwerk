/// <reference path="../pb_data/types.d.ts" />
// Einstellbare Obergrenzen für die Buchungen pro IP (docs/terminbuchung.md §6).
//
// Warum konfigurierbar und warum nicht knapp: Eine IP ist heute kein Mensch.
// Mobilfunkanbieter setzen tausende Kund:innen hinter dieselbe Adresse (CGNAT),
// Firmen- und Hotelnetze ebenso. Eine harte Grenze von wenigen Buchungen pro
// Stunde würde damit echte Kund:innen abweisen — und zwar unsichtbar, denn die
// Fotograf:in erfährt von der abgelehnten Buchung nie.
//
// Die Grenzen sind deshalb bewusst großzügig und dienen nur als Flutschutz
// gegen Skripte. Die zielgenaue Bremse ist das Limit offener Termine pro
// E-Mail-Adresse, das unabhängig davon greift.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.add(new Field({
    name: "bookingRateHour",
    id: "num_set_bkrth",
    type: "number", min: 1, max: 1000, onlyInt: true,
    required: false, hidden: false, presentable: false, system: false,
  }));
  collection.fields.add(new Field({
    name: "bookingRateDay",
    id: "num_set_bkrtd",
    type: "number", min: 1, max: 5000, onlyInt: true,
    required: false, hidden: false, presentable: false, system: false,
  }));
  app.save(collection);

  try {
    const record = app.findRecordById("settings", "appsettings0001");
    if (!record.getInt("bookingRateHour")) {
      record.set("bookingRateHour", 10);
    }
    if (!record.getInt("bookingRateDay")) {
      record.set("bookingRateDay", 30);
    }
    app.save(record);
  } catch (_) {
    // Einstellungen noch nicht angelegt — readConfig() nutzt dieselben Werte
    // als Rückfallwerte
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.removeByName("bookingRateHour");
  collection.fields.removeByName("bookingRateDay");
  app.save(collection);
});
