// Workflow: Fotograf beantwortet eine Kundenanfrage.
// Hilfe-Artikel: support-postfach

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { e2eId } from "../../support/pb";
import { shot } from "../../support/shot";

const FRAGE = "Wie lange kann ich die Bilder herunterladen?";
const ANTWORT = "Die Downloads bleiben dauerhaft in deinem Konto verfügbar.";

test("Fotograf beantwortet eine Anfrage", async ({ page, album, pb, anmelden }) => {
  // Als Kundin anlegen, nicht als Superuser: die Relation auf `users` lässt
  // sich mit dem Superuser-Token nicht setzen (siehe createAsUser in pb.ts).
  const ticket = await pb.createAsUser(album.kundin.email, album.kundin.password, "supportTickets", {
    userId: album.kundin.id,
    subject: FRAGE,
    category: "album",
    consentForward: false,
  });
  const ticketId = ticket.id;
  await pb.createAsUser(album.kundin.email, album.kundin.password, "supportMessages", {
    ticketId,
    body: FRAGE,
  });

  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/support");

  const eintrag = page.getByText(FRAGE, { exact: false }).first();
  await expect(eintrag).toBeVisible();
  await shot(
    eintrag.locator("xpath=ancestor::*[self::li or self::tr or self::div][2]"),
    "support-postfach/01-postfach",
  );

  await eintrag.click();
  const feld = page.getByRole("textbox").last();
  await feld.fill(ANTWORT);
  await page.getByRole("button", { name: "Antwort senden" }).click();

  await expect
    .poll(
      async () =>
        (await pb.list("supportMessages", `ticketId = "${ticketId}" && authorRole = "admin"`))
          .length,
      { timeout: 30_000, message: "Antwort wurde nicht gespeichert" },
    )
    .toBe(1);

  await expect(page.getByText(ANTWORT, { exact: false }).first()).toBeVisible();
});
