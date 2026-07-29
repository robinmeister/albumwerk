// E2E-Suite gegen die gebackene Dev-Instanz (make dev, http://localhost:8091).
// Ausdrücklich NICHT gegen den Vite-Dev-Server: dieselben Läufe erzeugen die
// Screenshots für die Hilfe-Artikel, und ein Bild aus einem unminifizierten
// Dev-Build zeigt etwas, das kein Kunde je zu sehen bekommt.
//
// Drei Projekte:
//   desktop        Admin-Workflows, 1440x900 bei 2x Pixeldichte
//   mobil          Kunden-Workflows, 390px — so nutzen Kunden die App wirklich
//   einstellungen  alles, was den globalen Settings-Record anfasst; läuft
//                  zuletzt (dependencies) und streng seriell, weil Branding &
//                  Co. nicht über Fixtures isolierbar sind und ein halb
//                  umgefärbtes UI die Screenshots aller anderen Tests ruiniert.

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8091";

// Screenshot-Aufnahme hängt an einem Schalter (make help-shots). Normale
// Testläufe schreiben keine Bilder und erzeugen damit auch keine Git-Diffs.
const SHOTS = process.env.E2E_SHOTS === "1";

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/.artifacts",
  // Entfernt Rückstände abgebrochener Läufe, bevor irgendein Test startet.
  globalSetup: "./e2e/global-setup.ts",
  // Beim Screenshot-Lauf seriell: parallele Läufe teilen sich eine PocketBase
  // und damit die Vorschau-Worker — das erzeugt Wartezeiten, die als halb
  // geladene Bilder im Screenshot landen.
  fullyParallel: !SHOTS,
  // Zwei Worker, nicht "so viele wie Kerne": jeder Test lädt vier Bilder hoch,
  // deren Vorschauen ImageMagick im selben Container erzeugt. Bei voller
  // Parallelität warten die Tests länger auf die Vorschauen als ihr Zeitbudget
  // hergibt — gemessen: dieselben Tests laufen seriell durch und scheitern
  // parallel im Timeout.
  workers: SHOTS ? 1 : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 90 s: die Tests mit Bild-Upload warten auf die Vorschau-Erzeugung durch
  // ImageMagick, und ein zu knappes Budget kürzt zusätzlich den Fixture-Teardown.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]]
    : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    // Die Doku-Bilder sind ausschließlich hell (siehe .help-article img in
    // index.css, das die Bilder im Dunkelmodus einfasst).
    colorScheme: "light",
  },

  projects: [
    {
      name: "desktop",
      testDir: "./e2e/tests/admin",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      },
    },
    {
      name: "mobil",
      testDir: "./e2e/tests/kunde",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "einstellungen",
      testDir: "./e2e/tests/einstellungen",
      dependencies: ["desktop", "mobil"],
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      },
    },
  ],
});
