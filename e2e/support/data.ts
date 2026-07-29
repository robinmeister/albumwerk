// Beispieldaten für die Fixtures.
//
// Diese Namen landen in den Screenshots der Hilfe-Artikel — sie müssen also
// aussehen wie echte Daten eines Fotografen, nicht wie Testmüll. Identifiziert
// und aufgeräumt werden die Records über ihr ID-Präfix (siehe pb.ts), nicht
// über diese Texte.

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Vier generierte Beispielfotos (e2e/fixtures/photos), eingecheckt. */
export const BEISPIELFOTOS = ["foto-01.jpg", "foto-02.jpg", "foto-03.jpg", "foto-04.jpg"].map(
  (name) => resolve(here, "../fixtures/photos", name),
);

/** Das fertige Album, das die Fixture per API hinstellt. */
export const BEISPIEL_ALBUM = {
  title: "Hochzeit Anna & Tim",
  description: "Trauung und Feier am Seehaus, 14. Juni",
  type: "Hochzeit",
};

/**
 * Das Album, das ein Test über die Oberfläche anlegt.
 *
 * Muss sich vom Fixture-Album unterscheiden: solche Records tragen kein
 * e2e-ID-Präfix und werden deshalb über den Titel aufgeräumt — bei gleichem
 * Titel würde ein Test die Daten eines parallel laufenden anderen löschen.
 */
export const NEUES_ALBUM = {
  title: "Portraits Lena Sommer",
  description: "Business-Portraits im Studio, Nachmittagstermin",
  type: "Portrait",
};

export const BEISPIEL_KUNDIN = {
  firstName: "Anna",
  lastName: "Berger",
  email: "anna.berger@beispiel.de",
  password: "beispiel123456",
  phone: "+49 170 9876543",
  street: "Seestraße 8",
  zip: "82319",
  city: "Starnberg",
};

/** Demo-Admin aus dem Seed (pb_hooks/lib/seeddemolib.js). */
export const DEMO_ADMIN = {
  email: "admin@demo.test",
  password: "demo123456",
};
