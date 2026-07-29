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

/**
 * Beispiel-Personen samt Album, eine je paralleler Worker.
 *
 * Warum ein Vorrat statt eines festen Datensatzes: E-Mail-Adressen müssen in
 * PocketBase eindeutig sein. Legen zwei parallel laufende Tests dieselbe
 * Kundin an, scheitert der zweite mit `validation_not_unique`. Über den
 * Worker-Index bekommt jeder Test seine eigene Person — und weil Tests
 * innerhalb eines Workers nacheinander laufen, ist die Adresse beim nächsten
 * Test wieder frei.
 *
 * Alle Namen sind bewusst unauffällig: sie stehen später in den Screenshots
 * der Hilfe-Artikel, unter anderem in der Nutzerverwaltung.
 */
export const PERSONEN = [
  {
    firstName: "Anna",
    lastName: "Berger",
    email: "anna.berger@beispiel.de",
    phone: "+49 170 9876543",
    street: "Seestraße 8",
    zip: "82319",
    city: "Starnberg",
    album: {
      title: "Hochzeit Anna & Tim",
      description: "Trauung und Feier am Seehaus, 14. Juni",
      type: "Hochzeit",
    },
  },
  {
    firstName: "Jonas",
    lastName: "Keller",
    email: "jonas.keller@beispiel.de",
    phone: "+49 151 2233445",
    street: "Lindenweg 21",
    zip: "79100",
    city: "Freiburg",
    album: {
      title: "Familienshooting Keller",
      description: "Nachmittag im Stadtgarten, drei Generationen",
      type: "Familie",
    },
  },
  {
    firstName: "Mira",
    lastName: "Falk",
    email: "mira.falk@beispiel.de",
    phone: "+49 160 5544332",
    street: "Hafenstraße 3",
    zip: "24103",
    city: "Kiel",
    album: {
      title: "Taufe Mathilda",
      description: "Kirche und Feier im Garten, Vormittagstermin",
      type: "Familie",
    },
  },
  {
    firstName: "Elias",
    lastName: "Rot",
    email: "elias.rot@beispiel.de",
    phone: "+49 176 6677889",
    street: "Bergstraße 44",
    zip: "01067",
    city: "Dresden",
    album: {
      title: "Bewerbungsfotos Elias",
      description: "Studiotermin, heller Hintergrund",
      type: "Portrait",
    },
  },
] as const;

/** Einheitliches Passwort für alle Beispiel-Personen. */
export const BEISPIEL_PASSWORT = "beispiel123456";

/**
 * Person für einen Worker.
 *
 * Beim Screenshot-Lauf läuft die Suite mit einem einzigen Worker — dort ist es
 * also immer dieselbe Person (Anna Berger), die Doku bleibt in sich stimmig.
 * Nur bei mehr parallelen Workern als Einträgen bekommt die Adresse einen
 * Zusatz, damit sie eindeutig bleibt.
 */
export function personFuer(workerIndex: number) {
  const person = PERSONEN[workerIndex % PERSONEN.length];
  if (workerIndex < PERSONEN.length) return person;
  const [lokal, domain] = person.email.split("@");
  return { ...person, email: `${lokal}+w${workerIndex}@${domain}` };
}

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

/** Demo-Admin aus dem Seed (pb_hooks/lib/seeddemolib.js). */
export const DEMO_ADMIN = {
  email: "admin@demo.test",
  password: "demo123456",
};
