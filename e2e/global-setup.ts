// Läuft einmal vor der Suite: entfernt Rückstände früherer Läufe.
//
// Ohne das blockiert ein einziger abgebrochener Lauf alle folgenden — die
// Beispiel-Kundinnen haben feste E-Mail-Adressen, und die müssen in PocketBase
// eindeutig sein.

import { fixturesEntfernen } from "./support/aufraeumen";
import { PbAdmin } from "./support/pb";

export default async function globalSetup(): Promise<void> {
  const pb = new PbAdmin();
  await pb.login();
  const { ueberPraefix, ueberNamen } = await fixturesEntfernen(pb);
  const gesamt = ueberPraefix + ueberNamen;
  if (gesamt > 0) {
    console.log(`[e2e] ${gesamt} Rückstände aus früheren Läufen entfernt.`);
  }
}
