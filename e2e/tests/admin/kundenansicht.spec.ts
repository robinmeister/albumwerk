// Workflow: Fotograf schaut sich eine Galerie aus Kundensicht an.
//
// Legt Schattenkonten an und loescht sie wieder. Laeuft deshalb seriell,
// damit ein paralleler Test keine halb abgeraeumte Nutzerliste sieht.
//
// Reihenfolge bewusst gewählt: die drei Tests, die nicht am iframe hängen
// (Sicherheitsgrenze, Sitzungs-Lebenszyklus, Admin-Regression), stehen vorn.
// serial-Modus bricht bei einem fehlgeschlagenen Test alle folgenden als
// "did not run" ab — stünde ein iframe-abhängiger Test vorn, verschluckte ein
// einzelner Ausfall dort das Ergebnis der anderen drei völlig unabhängigen
// Prüfungen.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";

test.describe.configure({ mode: "serial" });

/**
 * Räumt jedes Schattenkonto ab, das noch an dieser Galerie hängt.
 *
 * Das Frontend versucht das selbst (Klick auf "Schließen", `pagehide`), aber
 * beides ist Best-Effort — ein `fetch()` beim Navigieren oder Schließen der
 * Seite kann vom Browser abgebrochen werden, bevor die Antwort ankommt
 * (docs/kundenansicht-vorschau.md nennt genau deshalb den Cron-Sweep als
 * zweite Linie, nicht als Garantie). Ein Test, der selbst Schattenkonten
 * anlegt, darf sich darauf nicht verlassen: er räumt hier direkt über die API
 * nach, unabhängig davon, ob der App-eigene Weg schon gegriffen hat.
 */
async function schattenkontoAbraeumen(
  pb: { list: (c: string, f?: string) => Promise<any[]>; delete: (c: string, id: string) => Promise<void> },
  shootingId: string,
) {
  const uebrig = await pb.list("users", "isPreview = true");
  for (const u of uebrig) {
    if ((u.shootingIds ?? []).includes(shootingId)) await pb.delete("users", u.id);
  }
}

test("weder anonym noch mit dem Token einer Kundin lässt sich eine Vorschau-Sitzung ausstellen", async ({
  page,
  album,
  pb,
}) => {
  // Das Verstecken des Knopfes ist keine Sicherheit — der Endpunkt muss
  // selbst ablehnen, unabhängig davon, wer ihn aufruft. Wichtigster Test der
  // Datei.
  const anonym = await page.request.post("/api/custom/preview/session", {
    data: { shootingId: album.id },
  });
  expect(anonym.status()).toBe(403);

  const { token } = await pb.userToken(album.kundin.email, album.kundin.password);
  const alsKundin = await page.request.post("/api/custom/preview/session", {
    data: { shootingId: album.id },
    headers: { Authorization: token },
  });
  expect(alsKundin.status()).toBe(403);
});

test("die angemeldete Ansicht stellt eine Sitzung aus und räumt sie wieder ab", async ({
  page,
  album,
  pb,
  anmelden,
}) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).first().click();
  await page.getByTestId("shooting-detail").waitFor();
  await page.getByTestId("kundenansicht-oeffnen").click();

  try {
    await page.getByTestId("ansicht:angemeldet").click();

    // Während die Vorschau offen ist, existiert genau ein Schattenkonto.
    await expect
      .poll(async () => (await pb.list("users", "isPreview = true")).length, { timeout: 10_000 })
      .toBe(1);

    await page.getByTestId("vorschau:schliessen").click();

    // Und danach keins mehr — das ist der Unterschied zwischen einer Vorschau
    // und einem Zugang, den niemand mehr im Auge behält.
    await expect
      .poll(async () => (await pb.list("users", "isPreview = true")).length, { timeout: 10_000 })
      .toBe(0);
  } finally {
    await schattenkontoAbraeumen(pb, album.id);
  }
});

test("nach dem Schliessen ist der Admin noch angemeldet", async ({ page, album, pb, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).first().click();
  await page.getByTestId("shooting-detail").waitFor();
  await page.getByTestId("kundenansicht-oeffnen").click();

  try {
    await page.getByTestId("ansicht:angemeldet").click();
    await page.getByTestId("vorschau:schliessen").click();

    // Die teuerste denkbare Regression: die Vorschau überschreibt die
    // Admin-Sitzung im selben localStorage. Ein Login-Bildschirm hier wäre
    // der Beweis dafür.
    await page.goto("/branding");
    await expect(page.getByTestId("abschnitt:Branding")).toBeVisible();
  } finally {
    await schattenkontoAbraeumen(pb, album.id);
  }
});

test("Fotograf sieht die Galerie so, wie sie über den Link erscheint", async ({ page, album, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).first().click();

  await page.getByTestId("shooting-detail").waitFor();
  await page.getByTestId("kundenansicht-oeffnen").click();
  await expect(page.getByTestId("kundenansicht")).toBeVisible();

  // Die Link-Ansicht ist anonym — shootings.viewRule ist leer, sie zeigt
  // sich ohne jede Sitzung, also entsteht hier kein Schattenkonto. Der
  // Galerietitel im Rahmen beweist, dass tatsächlich die richtige Galerie
  // geladen wurde, nicht nur irgendein leeres iframe.
  const rahmen = page.frameLocator('iframe[title="Kundenansicht"]');
  await expect(rahmen.getByText(album.title, { exact: true }).first()).toBeVisible();
});

test("die Vorschau fasst die Admin-Sitzung im localStorage nicht an", async ({ page, album, pb, anmelden }) => {
  // Der eigentliche Zweck der Store-Weiche aus Task 3. Wichtig: der Test muss
  // den Umschalter tatsächlich betätigen und warten, bis im iframe wirklich
  // eine Sitzung steht — auf der anonymen Link-Ansicht ruft nichts
  // authStore.save() auf, ein Test, der nur das iframe-Vorhandensein prüft,
  // bliebe auch bei einer komplett kaputten Store-Weiche grün.
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/album");
  await page.getByText(album.title, { exact: true }).first().click();
  await page.getByTestId("shooting-detail").waitFor();

  const vorher = await page.evaluate(() => localStorage.getItem("pocketbase_auth"));
  expect(vorher).not.toBeNull();

  await page.getByTestId("kundenansicht-oeffnen").click();

  try {
    await page.getByTestId("ansicht:angemeldet").click();

    // Erst wenn die Kundenansicht im iframe tatsächlich "Meine Alben" mit
    // dieser Galerie zeigt, hat das Schattenkonto seine Sitzung dort wirklich
    // übernommen (Token per postMessage, dann authRefresh) — vorher wäre
    // jeder Vergleich mit "vorher" bedeutungslos.
    const rahmen = page.frameLocator('iframe[title="Kundenansicht"]');
    await expect(rahmen.getByTestId("albumliste")).toContainText(album.title, { timeout: 15_000 });

    const nachher = await page.evaluate(() => localStorage.getItem("pocketbase_auth"));
    expect(nachher).toBe(vorher);
  } finally {
    await schattenkontoAbraeumen(pb, album.id);
  }
});
