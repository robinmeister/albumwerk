// Reparaturbefehl für abgebrochene Läufe: `make e2e-clean`.
//
// Ein normaler Lauf räumt selbst auf, und global-setup.ts entfernt Rückstände
// vor dem nächsten Lauf. Dieser Befehl ist für den Fall dazwischen: die
// Dev-Instanz soll sofort wieder sauber sein, ohne dass man die Suite startet —
// insbesondere das Branding, das sonst umgefärbt bliebe.

import { fixturesEntfernen } from "./support/aufraeumen";
import { PbAdmin } from "./support/pb";
import { einstellungenWiederherstellen } from "./support/settings";

async function main(): Promise<void> {
  const pb = new PbAdmin();
  await pb.login();

  const { ueberPraefix, ueberNamen } = await fixturesEntfernen(pb);
  console.log(`Fixture-Records gelöscht: ${ueberPraefix}`);
  console.log(`Über die Oberfläche angelegte Reste gelöscht: ${ueberNamen}`);

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
