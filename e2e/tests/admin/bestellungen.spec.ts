// Workflow: Fotograf bearbeitet eine eingegangene Bestellung.
// Hilfe-Artikel: bestellungen-bearbeiten
//
// Die Bestellung wird per API angelegt statt durchgeklickt: der Kaufvorgang hat
// einen eigenen Test, und dieser hier soll die Bearbeitung prüfen, nicht den
// Weg dorthin.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { e2eId } from "../../support/pb";
import { shot } from "../../support/shot";

test("Fotograf schließt eine Bestellung ab", async ({ page, album, pb, anmelden }) => {
  const bestellungId = e2eId();
  // Ein Abzug, kein Download — sonst landet die Bestellung im Reiter "DL"
  // statt bei den zu bearbeitenden Druckaufträgen (isAllDownloadable).
  await pb.create("orders", {
    id: bestellungId,
    userId: album.kundin.id,
    shootingId: album.id,
    imagePriceObjectList: JSON.stringify([
      {
        image: album.bildNamen[0],
        price: [
          {
            id: "defaultprice002",
            title: "Abzug 13x18",
            description: "Klassischer Fotoabzug im Format 13 x 18 cm",
            amount: "5",
            isDownloadable: false,
            quantity: 2,
          },
        ],
      },
    ]),
  });

  try {
    await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
    await page.goto("/orders");

    // Die Liste zeigt Shooting und Betrag; eine Kundenspalte gibt es nicht,
    // weil users.emailVisibility false ist und PocketBase das Feld auch
    // Admins nicht ausliefert.
    const zeile = page.getByTestId("bestellzeile").filter({ hasText: album.title });
    await expect(zeile).toBeVisible();
    await shot(zeile, "bestellungen-bearbeiten/01-eingegangen");

    await zeile.click();
    const abschicken = page.getByRole("button", { name: "Bestellung abschicken" });
    await expect(abschicken).toBeVisible();
    await shot(
      abschicken.locator("xpath=ancestor::*[self::section or self::div][2]"),
      "bestellungen-bearbeiten/02-details",
    );
    await abschicken.click();

    await expect
      .poll(async () => (await pb.list("finishedOrders", `orderId = "${bestellungId}"`)).length, {
        timeout: 30_000,
        message: "Bestellung wurde nicht als erledigt gespeichert",
      })
      .toBe(1);

    // Und sie verschwindet aus der Liste der offenen Aufträge. Genau das ging
    // vorher schief: ohne orderId fand die App keine Verknüpfung zwischen
    // Archiveintrag und offener Bestellung, die Bestellung blieb für immer offen.
    await page.reload();
    await expect(page.getByTestId("bestellzeile").filter({ hasText: album.title })).toHaveCount(0);
  } finally {
    for (const rest of await pb.list("finishedOrders", `orderId = "${bestellungId}"`)) {
      await pb.delete("finishedOrders", rest.id);
    }
    await pb.delete("orders", bestellungId);
  }
});
