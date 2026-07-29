// Gemeinsame Fixtures. Tests importieren `test`/`expect` von hier, nicht direkt
// von @playwright/test.
//
// Grundprinzip: Testdaten entstehen über die PocketBase-API, nicht durch Klicken.
// Ein Test, der "Bilder auswählen" prüft, soll nicht vorher zehn Minuten lang
// ein Album zusammenklicken — er bekommt eines fertig hingestellt.

import { test as base, expect, type Page } from "@playwright/test";

import { BEISPIELFOTOS, BEISPIEL_PASSWORT, DEMO_ADMIN, personFuer } from "./data";
import { PbAdmin, e2eId, type PbRecord } from "./pb";

export type Beispielalbum = {
  id: string;
  title: string;
  description: string;
  /** Die Kundin bzw. der Kunde des Albums — inkl. Klartext-Passwort. */
  kundin: {
    id: string;
    email: string;
    password: string;
    name: string;
    firstName: string;
    lastName: string;
  };
  bildIds: string[];
  /** Dateinamen der hochgeladenen Bilder, in Reihenfolge. */
  bildNamen: string[];
};

type Fixtures = {
  /** Angemeldet als Instanz-Superuser; legt Testdaten an und räumt sie weg. */
  pb: PbAdmin;
  /** Meldet eine Seite ohne UI-Umweg an. Der Login selbst hat einen eigenen Test. */
  anmelden: (page: Page, email: string, password: string) => Promise<void>;
  /** Fertiges Album mit vier Bildern und zugeordneter Kundin. */
  album: Beispielalbum;
};

export const test = base.extend<Fixtures>({
  pb: async ({}, use) => {
    const pb = new PbAdmin();
    await pb.login();
    await use(pb);
  },

  anmelden: async ({ pb }, use) => {
    await use(async (page, email, password) => {
      const auth = await pb.userToken(email, password);
      // Die App nutzt den Standard-LocalAuthStore des PocketBase-SDK 0.21:
      // Schlüssel `pocketbase_auth`, Form { token, model }.
      await page.addInitScript(
        (state) => window.localStorage.setItem("pocketbase_auth", JSON.stringify(state)),
        { token: auth.token, model: auth.record },
      );
    });
  },

  album: async ({ pb }, use, testInfo) => {
    const person = personFuer(testInfo.parallelIndex);
    const albumId = e2eId();
    const bildNamen = BEISPIELFOTOS.map(
      (_, index) => `${person.lastName.toLowerCase()}-${String(index + 1).padStart(2, '0')}.jpg`,
    );

    // Alles Angelegte hier vormerken: scheitert der Aufbau auf halbem Weg,
    // wird der Teardown unten nie erreicht — der bereits erzeugte Nutzer bliebe
    // liegen und der nächste Lauf scheiterte an der eindeutigen E-Mail.
    const angelegt: Array<[string, string]> = [];
    const aufraeumen = async () => {
      // Erst alles, was am Nutzer hängt (Tickets, Bestellungen) — sonst
      // verweigert PocketBase das Löschen des Nutzers.
      const nutzerId = angelegt.find(([collection]) => collection === "users")?.[1];
      if (nutzerId) await pb.deleteDependents(nutzerId);
      for (const [collection, id] of [...angelegt].reverse()) await pb.delete(collection, id);
    };

    let kundin: PbRecord;
    let bilder: PbRecord[] = [];
    try {
      kundin = await pb.create('users', {
        id: e2eId(),
        email: person.email,
        emailVisibility: false,
        password: BEISPIEL_PASSWORT,
        passwordConfirm: BEISPIEL_PASSWORT,
        firstName: person.firstName,
        lastName: person.lastName,
        phone: person.phone,
        street: person.street,
        zip: person.zip,
        city: person.city,
        isAdmin: false,
        verified: true,
        shootingIds: [albumId],
      });
      angelegt.push(['users', kundin.id]);

      await pb.createWithFile(
        'shootings',
        {
          id: albumId,
          title: person.album.title,
          description: person.album.description,
          type: person.album.type,
          userIds: [kundin.id],
          priceIds: ['defaultprice001', 'defaultprice002', 'defaultprice003', 'defaultprice004'],
          withUserSelection: false,
        },
        'coverImage',
        BEISPIELFOTOS[0],
      );
      angelegt.push(['shootings', albumId]);

      for (const [index, foto] of BEISPIELFOTOS.entries()) {
        const bild = await pb.createWithFile(
          'images',
          { id: e2eId(), shootingId: albumId, type: 'original', name: bildNamen[index] },
          'originalFile',
          foto,
        );
        angelegt.push(['images', bild.id]);
        bilder.push(bild);
      }

      // previews.pb.js erzeugt die Wasserzeichen-Vorschauen asynchron. Ohne das
      // Warten zeigt das Bildraster graue Kacheln — im Test wie im Screenshot.
      await wartenAufVorschauen(pb, albumId, BEISPIELFOTOS.length);
    } catch (err) {
      await aufraeumen();
      throw err;
    }

    await use({
      id: albumId,
      title: person.album.title,
      description: person.album.description,
      kundin: {
        id: kundin.id,
        email: person.email,
        password: BEISPIEL_PASSWORT,
        name: `${person.firstName} ${person.lastName}`,
        firstName: person.firstName,
        lastName: person.lastName,
      },
      bildIds: bilder.map((b) => b.id),
      bildNamen,
    });

    await aufraeumen();
  },
});

// 90 s statt der naheliegenden 30: die Vorschauen entstehen über ImageMagick in
// mehreren Workern (pb_hooks/previews.pb.js). Auf einem frisch gestarteten
// Container ist der erste Aufruf deutlich langsamer, und parallele Tests teilen
// sich dieselben Worker.
async function wartenAufVorschauen(
  pb: PbAdmin,
  shootingId: string,
  erwartet: number,
  timeoutMs = 90_000,
): Promise<void> {
  const frist = Date.now() + timeoutMs;
  while (Date.now() < frist) {
    const vorschauen = await pb.list(
      "images",
      `shootingId = "${shootingId}" && type = "preview"`,
    );
    if (vorschauen.length >= erwartet) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Vorschauen für ${shootingId} nicht innerhalb von ${timeoutMs} ms erzeugt — ` +
      `läuft pb_hooks/previews.pb.js?`,
  );
}

export { expect, DEMO_ADMIN };
