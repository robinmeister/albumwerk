/// <reference path="../pb_data/types.d.ts" />
//
// Liefert der Oberfläche den Stand der Verkaufsbereitschaft.
//
// Öffentlich ohne Auth-Middleware, weil die Kundenansicht ihn ebenfalls
// braucht, um bei gesperrtem Verkauf den Kaufbereich zu ersetzen. Die Antwort
// enthält ausschließlich Keys und Booleans — keine Adressen, keine Schlüssel,
// keine E-Mail-Adressen. Dass eine Instanz keine Zahlungsart hat, ist an der
// Kasse ohnehin sichtbar.
routerAdd("GET", "/api/custom/verkaufsbereitschaft", (e) => {
  const vk = require(__hooks + "/lib/verkaufslib.js");
  const punkte = vk.pruefeVerkaufsbereitschaft(vk.leseWerte(e.app));
  return e.json(200, { punkte: punkte });
});
