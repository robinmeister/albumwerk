// Gemeinsame Fixtures. Tests importieren `test`/`expect` von hier, nicht direkt
// von @playwright/test.
//
// Grundprinzip: Testdaten entstehen über die PocketBase-API, nicht durch Klicken.
// Ein Test, der "Bilder auswählen" prüft, soll nicht vorher zehn Minuten lang
// ein Album zusammenklicken — er bekommt eines fertig hingestellt.

import { test as base, expect, type Page } from "@playwright/test";

import { BEISPIELFOTOS, BEISPIEL_ALBUM, BEISPIEL_KUNDIN, DEMO_ADMIN } from "./data";
import { PbAdmin, e2eId, type PbRecord } from "./pb";

export type Beispielalbum = {
  id: string;
  title: string;
  /** Die Kundin, der das Album zugeordnet ist — inkl. Klartext-Passwort. */
  kundin: { id: string; email: string; password: string; name: string };
  bildIds: string[];
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

  album: async ({ pb }, use) => {
    const kundinId = e2eId();
    const albumId = e2eId();

    const kundin = await pb.create("users", {
      id: kundinId,
      email: BEISPIEL_KUNDIN.email,
      emailVisibility: false,
      password: BEISPIEL_KUNDIN.password,
      passwordConfirm: BEISPIEL_KUNDIN.password,
      firstName: BEISPIEL_KUNDIN.firstName,
      lastName: BEISPIEL_KUNDIN.lastName,
      phone: BEISPIEL_KUNDIN.phone,
      street: BEISPIEL_KUNDIN.street,
      zip: BEISPIEL_KUNDIN.zip,
      city: BEISPIEL_KUNDIN.city,
      isAdmin: false,
      verified: true,
      shootingIds: [albumId],
    });

    await pb.createWithFile(
      "shootings",
      {
        id: albumId,
        title: BEISPIEL_ALBUM.title,
        description: BEISPIEL_ALBUM.description,
        type: BEISPIEL_ALBUM.type,
        userIds: [kundin.id],
        priceIds: ["defaultprice001", "defaultprice002", "defaultprice003", "defaultprice004"],
        withUserSelection: false,
      },
      "coverImage",
      BEISPIELFOTOS[0],
    );

    const bilder: PbRecord[] = [];
    for (const [index, foto] of BEISPIELFOTOS.entries()) {
      bilder.push(
        await pb.createWithFile(
          "images",
          {
            id: e2eId(),
            shootingId: albumId,
            type: "original",
            name: `hochzeit-${String(index + 1).padStart(2, "0")}.jpg`,
          },
          "originalFile",
          foto,
        ),
      );
    }

    // previews.pb.js erzeugt die Wasserzeichen-Vorschauen asynchron. Ohne das
    // Warten zeigt das Album-Grid graue Kacheln — im Test wie im Screenshot.
    await wartenAufVorschauen(pb, albumId, BEISPIELFOTOS.length);

    await use({
      id: albumId,
      title: BEISPIEL_ALBUM.title,
      kundin: {
        id: kundin.id,
        email: BEISPIEL_KUNDIN.email,
        password: BEISPIEL_KUNDIN.password,
        name: `${BEISPIEL_KUNDIN.firstName} ${BEISPIEL_KUNDIN.lastName}`,
      },
      bildIds: bilder.map((b) => b.id),
    });

    // Aufräumen: Bilder vor dem Album, Album vor der Kundin.
    for (const bild of bilder) await pb.delete("images", bild.id);
    await pb.delete("shootings", albumId);
    await pb.delete("users", kundin.id);
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
