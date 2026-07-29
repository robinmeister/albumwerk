// Aufräumlogik, gemeinsam genutzt von global-setup.ts (vor jedem Lauf) und
// clean.ts (`make e2e-clean`, nach einem Abbruch).
//
// Warum vorher aufräumen und nicht nur hinterher: läuft ein Test in seinen
// Timeout, kürzt Playwright den Fixture-Teardown — angelegte Nutzer bleiben
// liegen und der nächste Lauf scheitert schon beim Aufbau an der eindeutigen
// E-Mail-Adresse. Ein Lauf darf nicht davon abhängen, dass der vorige sauber
// zu Ende gekommen ist.

import { NEUES_ALBUM, PERSONEN } from "./data";
import type { PbAdmin } from "./pb";

export type Aufraeumbilanz = { ueberPraefix: number; ueberNamen: number };

export async function fixturesEntfernen(pb: PbAdmin): Promise<Aufraeumbilanz> {
  const ueberPraefix = await pb.purgeFixtures();

  // Was ein Test über die Oberfläche angelegt hat, trägt kein e2e-ID-Präfix und
  // ist nur über die Beispieldaten-Namen auffindbar.
  let ueberNamen = 0;
  for (const titel of [NEUES_ALBUM.title, ...PERSONEN.map((p) => p.album.title)]) {
    for (const shooting of await pb.list("shootings", `title = "${titel}"`)) {
      for (const bild of await pb.list("images", `shootingId = "${shooting.id}"`)) {
        await pb.delete("images", bild.id);
      }
      await pb.delete("shootings", shooting.id);
      ueberNamen += 1;
    }
  }
  for (const person of PERSONEN) {
    const lokal = person.email.split("@")[0];
    for (const nutzer of await pb.list("users", `email ~ "${lokal}%"`)) {
      await pb.delete("users", nutzer.id);
      ueberNamen += 1;
    }
  }

  return { ueberPraefix, ueberNamen };
}
