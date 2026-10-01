// Bilder für die Website (albumwerk-website), die ohne Demo-Seed auskommen —
// Gegenstück zu website-shots.mjs.
//
//   node e2e/website-bilder.mjs
//
//   - Kontaktbogen der Startseite: acht Fotos aus demo-fotos/ (CC0)
//   - Managed: frische Instanz direkt nach der Registrierung, mit Adresszeile
//   - Self-hosted: Terminal mit dem Start des Deploy-Bundles
//
// Für die Managed-Aufnahme läuft eine eigene Wegwerf-Instanz auf :8094, ohne
// Demo-Seed — genau so leer, wie sie die Provisionierung übergibt.
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";
import { chromium } from "playwright";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEBSITE = resolve(root, "../albumwerk-website/public");
const NAME = "albumwerk-bilder";
const PORT = 8094;
const URL = `http://localhost:${PORT}`;
const ADMIN = "admin@demo.test";
const FOTOGRAFIN = "mara@mara-licht.de";
const PASSWORT = "demo123456";
const ADRESSE = "mara-licht.albumwerk.de";

const docker = (...args) => execFileSync("docker", args, { stdio: ["ignore", "pipe", "inherit"] }).toString();
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Kontaktbogen der Startseite ----------------------------------------------
// Reihenfolge = Feld 01–08 in Hero.astro; 03 und 07 tragen dort den Kreis.
const BOGEN = ["01", "02", "09", "04", "08", "11", "12", "03"];
await mkdir(join(WEBSITE, "bogen"), { recursive: true });
for (const [i, bild] of BOGEN.entries()) {
  const datei = `${String(i + 1).padStart(2, "0")}.webp`;
  await sharp(join(root, "demo-fotos", "Hochzeit Lena & Jonas", bild + ".jpg"))
    .resize(600, 400, { fit: "cover" }).webp({ quality: 78 }).toFile(join(WEBSITE, "bogen", datei));
  console.log("  bogen/" + datei);
}

// Beide Varianten-Bilder sind 16:9 wie ihre Bildfelder (funktionen.astro)
const browser = await chromium.launch();
async function aufnehmen(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const datei = join(WEBSITE, "shots", name + ".webp");
  await sharp(await page.screenshot()).resize({ width: 1600 }).webp({ quality: 82 }).toFile(datei);
  console.log("  shots/" + name + ".webp");
}

// --- Managed: frische Instanz -------------------------------------------------
try { docker("rm", "-f", NAME); } catch { /* gab es nicht */ }
docker("run", "-d", "--name", NAME, "-p", `127.0.0.1:${PORT}:8090`,
  "-e", `PB_SUPERUSER_EMAIL=${ADMIN}`, "-e", `PB_SUPERUSER_PASSWORD=${PASSWORT}`,
  "-e", `PB_DEV_APP_URL=${URL}`, "albumwerk-app:latest");
for (let i = 0; ; i++) {
  if (await fetch(`${URL}/api/health`).then((r) => r.ok, () => false)) break;
  if (i > 60) throw new Error("Instanz startet nicht");
  await warte(1000);
}

// Fotografen-Account wie in provisionlib.js bootstrapInstance()
const pb = new PocketBase(URL);
await pb.collection("_superusers").authWithPassword(ADMIN, PASSWORT);
await pb.collection("users").create({
  email: FOTOGRAFIN, password: PASSWORT, passwordConfirm: PASSWORT,
  firstName: "Mara", lastName: "Licht", isAdmin: true, verified: true,
});

// App ohne Adresszeile aufnehmen, dann in ein schlichtes Browserfenster setzen
const LEISTE = 44;
const app = await browser.newPage({ viewport: { width: 1280, height: 720 - LEISTE }, deviceScaleFactor: 2, locale: "de-DE", timezoneId: "Europe/Berlin" });
await app.goto(URL + "/");
await app.fill("input[type=email]", FOTOGRAFIN);
await app.fill("input[type=password]", PASSWORT);
await app.click("button[type=submit]");
await app.waitForURL("**/einrichtung");
await app.waitForLoadState("networkidle");
await app.evaluate(() => document.fonts.ready);
await app.waitForTimeout(600);
const appBild = "data:image/png;base64," + (await app.screenshot()).toString("base64");

const fenster = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await fenster.setContent(`<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#fff}
  .leiste{height:${LEISTE}px;box-sizing:border-box;display:flex;align-items:center;gap:18px;padding:0 16px;background:#ebe8e3;border-bottom:1px solid #d6d1c9}
  .punkte{display:flex;gap:8px} .punkte i{width:12px;height:12px;border-radius:50%;background:#cfc9c0}
  .adresse{flex:1;max-width:560px;margin:0 auto;height:28px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:6px;background:#fff;font:14px system-ui;color:#2b2723}
  .adresse svg{width:12px;height:12px}
  img{display:block;width:1280px;height:${720 - LEISTE}px}
</style>
<div class="leiste"><div class="punkte"><i></i><i></i><i></i></div>
<div class="adresse"><svg viewBox="0 0 12 12"><path d="M3 5V3.5a3 3 0 0 1 6 0V5M2 5h8v6H2z" fill="none" stroke="#5c534a" stroke-width="1.3"/></svg>${ADRESSE}</div>
<div style="width:52px"></div></div>
<img src="${appBild}">`);
await aufnehmen(fenster, "managed");
docker("rm", "-f", NAME);

// --- Self-hosted: Terminal ----------------------------------------------------
// Ausgabe aus einem echten Lauf des Deploy-Bundles (docker-compose.yml,
// Caddyfile, .env) übernommen; nur Nutzer und Host sind erfunden.
const P = `<b>mara@vps</b>:<u>~/albumwerk</u>$ `;
const zeilen = [
  `${P}ls -A`,
  `.env  Caddyfile  docker-compose.yml`,
  `${P}docker compose up -d`,
  `[+] Running 6/6`,
  ` <em>✔</em> app Pulled                         <s>14.2s</s>`,
  ` <em>✔</em> caddy Pulled                        <s>6.8s</s>`,
  ` <em>✔</em> Network albumwerk_default        <em>Created</em>`,
  ` <em>✔</em> Volume "albumwerk_caddy_data"    <em>Created</em>`,
  ` <em>✔</em> Container albumwerk-app-1        <em>Started</em>`,
  ` <em>✔</em> Container albumwerk-caddy-1      <em>Started</em>`,
  `${P}docker compose logs app | tail -3`,
  `<s>app-1  |</s> Successfully saved superuser "mara@mara-licht.de"!`,
  `<s>app-1  |</s> 2026/09/30 11:17:13 Server started at http://0.0.0.0:8090`,
  `<s>app-1  |</s> └─ Dashboard: http://0.0.0.0:8090/_/`,
  `${P}<span class="cursor"> </span>`,
];
const terminal = await browser.newPage({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 2 });
await terminal.setContent(`<!doctype html><meta charset="utf-8"><style>
  body{margin:0;height:450px;display:flex;flex-direction:column;background:#1c1a17;color:#e6e0d6}
  .titel{height:30px;display:flex;align-items:center;justify-content:center;position:relative;background:#2b2824;font:12px system-ui;color:#a39a8e}
  .titel .punkte{position:absolute;left:12px;display:flex;gap:7px} .titel i{width:11px;height:11px;border-radius:50%;background:#4a453f}
  pre{margin:0;padding:14px 18px;font:14.5px/1.55 "DejaVu Sans Mono",ui-monospace,monospace;white-space:pre}
  b{color:#9fc48a;font-weight:normal} u{color:#8fb3d9;text-decoration:none} em{color:#9fc48a;font-style:normal} s{color:#8a8176;text-decoration:none}
  .cursor{background:#e6e0d6}
</style>
<div class="titel"><div class="punkte"><i></i><i></i><i></i></div>mara@vps: ~/albumwerk</div>
<pre>${zeilen.join("\n")}</pre>`);
await aufnehmen(terminal, "self-hosted");

await browser.close();
console.log("Fertig: " + WEBSITE);
