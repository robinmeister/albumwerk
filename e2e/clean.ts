// Reparaturbefehl für abgebrochene Läufe: `make e2e-clean`.
//
// Ein normaler Lauf räumt selbst auf. Nach Strg-C oder einem harten Fehlschlag
// können aber Fixture-Records und ein umgefärbtes Branding zurückbleiben — das
// hier setzt die Dev-Instanz wieder gerade.

import { PbAdmin } from "./support/pb";
import { einstellungenWiederherstellen } from "./support/settings";
import { BEISPIEL_ALBUM, BEISPIEL_KUNDIN, NEUES_ALBUM } from "./support/data";

async function main(): Promise<void> {
  const pb = new PbAdmin();
  await pb.login();

  const entfernt = await pb.purgeFixtures();
  console.log(`Fixture-Records gelöscht: ${entfernt}`);

  // Über die UI angelegte Records tragen kein e2e-ID-Präfix — die lassen sich
  // nur über die Beispieldaten-Namen wiederfinden.
  let ueberUi = 0;
  for (const titel of [BEISPIEL_ALBUM.title, NEUES_ALBUM.title]) {
    for (const shooting of await pb.list("shootings", `title = "${titel}"`)) {
      for (const bild of await pb.list("images", `shootingId = "${shooting.id}"`)) {
        await pb.delete("images", bild.id);
      }
      await pb.delete("shootings", shooting.id);
      ueberUi += 1;
    }
  }
  for (const nutzer of await pb.list("users", `email = "${BEISPIEL_KUNDIN.email}"`)) {
    await pb.delete("users", nutzer.id);
    ueberUi += 1;
  }
  console.log(`Über die Oberfläche angelegte Reste gelöscht: ${ueberUi}`);

  const zurueck = await einstellungenWiederherstellen(pb);
  console.log(
    zurueck
      ? "Globale Einstellungen aus der Sicherung zurückgeschrieben."
      : "Keine Einstellungs-Sicherung offen — nichts zurückzuschreiben.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
