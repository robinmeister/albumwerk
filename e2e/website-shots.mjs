// Screenshots der App für die Funktionen-Seite der Website (albumwerk-website).
//
//   node e2e/website-shots.mjs
//
// Läuft gegen eine eigene Wegwerf-Instanz, nie gegen die Dev-Instanz: dort
// stehen echte Zahlungsdaten, ein echtes Logo und Test-Warenkörbe, die auf
// einer Werbeseite nichts verloren haben.
//
//   1. albumwerk-app:latest mit Demo-Seed auf :8093 starten
//   2. Fotos aus demo-fotos/ hochladen (scripts/demo-fotos.mjs)
//   3. Demo-Kundschaft, Bestellungen und ein Paket anlegen
//   4. Aufnehmen, als WebP nach ../albumwerk-website/public/shots/
//   5. Instanz wieder entfernen
//
// Voraussetzung: das Image ist aktuell (make dev baut es) und demo-fotos/
// enthält die Alben.
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";
import { chromium, devices } from "playwright";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = resolve(root, "../albumwerk-website/public/shots");
const NAME = "albumwerk-shots";
const PORT = 8093;
const URL = `http://localhost:${PORT}`;
// Die App läuft im Browser unter einer Studio-Domain, damit Teilen-Link und
// QR-Code nicht localhost zeigen. Playwright reicht alles an die Instanz durch;
// Realtime (Dauerverbindung) bleibt aus, die Aufnahmen brauchen es nicht.
const STUDIO = "https://fotos.demo-fotostudio.de";
const ADMIN = "admin@demo.test";
const KUNDE = "kunde@demo.test";
const PASSWORT = "demo123456";

const docker = (...args) => execFileSync("docker", args, { stdio: ["ignore", "pipe", "inherit"] }).toString();
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 1. Instanz ---------------------------------------------------------------
if (!process.env.SHOTS_KEEP) {
  try { docker("rm", "-f", NAME); } catch { /* gab es nicht */ }
  docker("run", "-d", "--name", NAME, "-p", `127.0.0.1:${PORT}:8090`,
    "-e", `PB_SUPERUSER_EMAIL=${ADMIN}`, "-e", `PB_SUPERUSER_PASSWORD=${PASSWORT}`,
    "-e", "PB_SEED_DEMO=1", "-e", `PB_DEV_APP_URL=${URL}`, "albumwerk-app:latest");
  for (let i = 0; ; i++) {
    if (await fetch(`${URL}/api/health`).then((r) => r.ok, () => false)) break;
    if (i > 60) throw new Error("Instanz startet nicht");
    await warte(1000);
  }
  await warte(3000); // der Demo-Seed läuft nach dem Health-Check an

  // --- 2. Fotos ---------------------------------------------------------------
  execFileSync("node", [join(root, "scripts/demo-fotos.mjs"), join(root, "demo-fotos"), URL], { stdio: "inherit" });
}

// --- 3. Demo-Daten ------------------------------------------------------------
const pb = new PocketBase(URL);
pb.autoCancellation(false);
await pb.collection("_superusers").authWithPassword(ADMIN, PASSWORT);

const alben = Object.fromEntries((await pb.collection("shootings").getFullList()).map((s) => [s.title, s]));

// Das Verlaufs-Album des Seeds und das Beispiel-Album sehen nach Test aus
for (const titel of ["Demo-Shooting: Familie Muster", "Portrait Beispiel"]) {
  const s = alben[titel];
  if (!s) continue;
  for (const o of await pb.collection("finishedOrders").getFullList({ filter: `shootingId="${s.id}"` })) await pb.collection("finishedOrders").delete(o.id);
  for (const i of await pb.collection("images").getFullList({ filter: `shootingId="${s.id}" && type="original"` })) await pb.collection("images").delete(i.id);
  await pb.collection("shootings").delete(s.id);
  delete alben[titel];
}

// Paket am Album für die Auswahl-Aufnahme: "noch x von 10 inklusive"
await pb.collection("shootings").update(alben["Hochzeit Sophie & Max"].id, { packageId: "defaultpack0001" });

const preise = Object.fromEntries((await pb.collection("prices").getFullList()).map((p) => [p.id, p]));
const posten = (id, quantity = 1) => {
  const p = preise[id];
  return { id, title: p.title, description: p.description, amount: String(p.amount), isDownloadable: p.isDownloadable, quantity };
};
const DIGITAL = "defaultprice001", A13 = "defaultprice002", A20 = "defaultprice003", LEINWAND = "defaultprice004";

const vorschauen = async (titel, n) =>
  (await pb.collection("images").getFullList({ filter: `shootingId="${alben[titel].id}" && type="preview"`, sort: "name" }))
    .slice(0, n).map((r) => pb.files.getUrl(r, r.file).replace(URL, STUDIO)); // Bestellungen speichern absolute URLs

const summe = (liste) => liste.reduce((s, i) => s + i.price.reduce((t, p) => t + Number(p.amount) * p.quantity, 0), 0);

// id, Name, Album, Positionen (je Bild eine Liste), erledigt?
const bestellungen = [
  ["shotkundelena01", "Lena", "Berg", "Hochzeit Lena & Jonas", [[LEINWAND, A20], [A20, [A13, 2]], [DIGITAL], [DIGITAL, A13]], false],
  ["shotkundeanna01", "Anna", "Berger", "Familie Berger", [[A20, [A13, 3]], [LEINWAND], [A13]], false],
  ["shotkundemara01", "Mara", "Ahrens", "Baby Emil", [[DIGITAL], [DIGITAL], [DIGITAL], [DIGITAL], [DIGITAL]], false],
  ["shotkundesoph01", "Sophie", "Klein", "Hochzeit Sophie & Max", [[DIGITAL, A20], [DIGITAL], [DIGITAL, A13], [DIGITAL]], true],
  ["shotkundejule01", "Jule", "Winter", "Portrait Outdoor-Tag", [[DIGITAL], [DIGITAL], [A20]], true],
];
for (const [id, vor, nach, titel, bilder, erledigt] of bestellungen) {
  const email = `${vor}.${nach}@example.de`.toLowerCase();
  const album = alben[titel];
  try { await pb.collection("users").getOne(id); } catch {
    await pb.collection("users").create({
      id, email, emailVisibility: true, firstName: vor, lastName: nach, verified: true, isAdmin: false,
      shootingIds: [album.id], password: PASSWORT, passwordConfirm: PASSWORT,
    });
  }
  const urls = await vorschauen(titel, bilder.length);
  const liste = bilder.map((ps, i) => ({ image: urls[i], price: ps.map((p) => (Array.isArray(p) ? posten(...p) : posten(p))) }));
  const col = erledigt ? "finishedOrders" : "orders";
  const bestand = await pb.collection(col).getFullList({ filter: `userId="${id}"` });
  if (bestand.length) continue;
  await pb.collection(col).create(erledigt
    ? { orderId: id, userId: id, shootingId: album.id, imagePriceObjectList: JSON.stringify(liste), userEmail: email, shootingTitle: titel, totalPrice: summe(liste), finished: true }
    : { userId: id, shootingId: album.id, imagePriceObjectList: liste });
}

// Buchung: ein Termintyp, werktags 10–18 Uhr frei
await pb.collection("settings").update("appsettings0001", { bookingEnabled: true });
try { await pb.collection("appointmentTypes").getOne("shotportrait001"); } catch {
  await pb.collection("appointmentTypes").create({
    id: "shotportrait001", name: "Portrait-Shooting im Studio", slug: "portrait", durationMin: 60, startIntervalMin: 60,
    description: "Eine Stunde im Studio, inklusive Vorgespräch und Bildauswahl.", location: "Studio Mara Licht, Köln",
    price: 149, phoneMode: "optional", active: true, sort: 1,
  });
  for (const weekday of [1, 2, 3, 4, 5]) {
    await pb.collection("availabilityRules").create({ weekday, startMinute: 600, endMinute: 1080, allowedTypes: ["shotportrait001"], active: true });
  }
}

// --- 4. Aufnahmen -------------------------------------------------------------
// Jede Aufnahme zweimal: Desktop (NAME.webp) und Handy (NAME-mobil.webp). Die
// Website zeigt auf schmalen Bildschirmen die Handy-Fassung (Shot.astro).
const GERAETE = [
  { endung: "", breite: 1600, kontext: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } }, // 16:10 wie die Bildfelder
  { endung: "-mobil", breite: 780, kontext: devices["iPhone 13"] }, // 390×664, Safari ohne Leisten
];
const browser = await chromium.launch();

async function kontext(geraet) {
  const ctx = await browser.newContext({ ...geraet.kontext, locale: "de-DE", timezoneId: "Europe/Berlin" });
  await ctx.route(STUDIO + "/**", async (route) => {
    const res = await route.fetch({ url: route.request().url().replace(STUDIO, URL) });
    // /embed verbietet fremde Rahmen; für die Buchungs-Aufnahme hier entfernt,
    // statt eine Domain in der Instanz freizugeben
    const headers = { ...res.headers() };
    delete headers["content-security-policy"];
    delete headers["x-frame-options"];
    await route.fulfill({ response: res, headers });
  });
  // nach dem Durchreichen registriert, damit es zuerst greift
  await ctx.route(STUDIO + "/api/realtime**", (route) => route.abort());
  return ctx;
}

async function sitzung(geraet, email) {
  const page = await (await kontext(geraet)).newPage();
  await page.goto(STUDIO + "/");
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", PASSWORT);
  await page.click("button[type=submit]");
  await page.waitForURL("**/album");
  return page;
}

// Bilder und Webfonts fertig laden lassen, dann aufnehmen
async function aufnehmen(geraet, page, name) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  // Lazy-Bilder im sichtbaren Bereich laden erst nach dem Scrollen/Öffnen
  await page.waitForFunction(() => [...document.images].every((i) => {
    const r = i.getBoundingClientRect();
    return i.complete || r.bottom < 0 || r.top > innerHeight;
  }));
  await page.waitForTimeout(600);
  const png = await page.screenshot();
  await mkdir(ZIEL, { recursive: true });
  const datei = name + geraet.endung + ".webp";
  await sharp(png).resize({ width: geraet.breite }).webp({ quality: 82 }).toFile(join(ZIEL, datei));
  console.log("  " + datei);
}

const GALERIE = 'img[src*="/api/files/images/"]';
const albumOeffnen = async (page, titel) => {
  await page.goto(STUDIO + "/album");
  await page.getByText(titel).first().click();
  await page.locator(GALERIE).nth(7).waitFor();
};

// Auf der eigenen Website steht das Bild ohne Wasserzeichen
const hero = await sharp(join(root, "demo-fotos", "Portrait Outdoor-Tag", "01.jpg")).resize({ width: 1000 }).jpeg({ quality: 80 }).toBuffer();
const heroBild = "data:image/jpeg;base64," + hero.toString("base64");

for (const geraet of GERAETE) {
  const kunde = await sitzung(geraet, KUNDE);

  // 01 Kundengalerie mit Wasserzeichen-Vorschauen
  await albumOeffnen(kunde, "Hochzeit Lena & Jonas");
  await aufnehmen(geraet, kunde, "01-galerie");

  // 03 Auswahl mit Paket-Fortschritt; nach dem Klicken zurück nach oben, damit
  // Titel, Haken und die Leiste unten zusammen im Bild sind
  await albumOeffnen(kunde, "Hochzeit Sophie & Max");
  await kunde.getByRole("button", { name: "Bilder auswählen" }).click();
  for (const i of [0, 2, 3, 5, 8, 9]) await kunde.locator(GALERIE).nth(i).click();
  await kunde.evaluate(() => window.scrollTo(0, 0));
  await aufnehmen(geraet, kunde, "03-auswahl");

  const admin = await sitzung(geraet, ADMIN);

  // 02 Teilen-Dialog mit QR-Code
  await albumOeffnen(admin, "Hochzeit Lena & Jonas");
  await admin.getByRole("button", { name: "Teilen" }).click();
  await admin.locator("#share-qr-code").waitFor();
  await aufnehmen(geraet, admin, "02-teilen");
  await admin.keyboard.press("Escape");

  // 04 Preise
  await admin.goto(STUDIO + "/pricing");
  await admin.getByText("Leinwand 40x60").click();
  await aufnehmen(geraet, admin, "04-preise");

  // 05 Zahlungen: Felder nur im Browser mit Platzhaltern füllen, nie speichern.
  // Auf dem Handy steht PayPal unter Stripe — hinscrollen.
  await admin.goto(STUDIO + "/payments");
  await admin.getByLabel("PayPal Client-ID").fill("AZdemo-7Hq2pX9vL4mN8kR3tW6yB1cF5gJ0sD");
  await admin.getByLabel("PayPal-Geschäftskonto (E-Mail)").fill("zahlungen@demo-fotostudio.de");
  await admin.getByLabel("PayPal-Geschäftskonto (E-Mail)").blur();
  if (geraet.endung) await admin.getByText("Kunden zahlen mit ihrem PayPal").evaluate((el) => {
    window.scrollBy(0, el.getBoundingClientRect().top - 110);
  });
  await aufnehmen(geraet, admin, "05-zahlungen");

  // 06 Bestellungen mit geöffneter Bestellung
  await admin.goto(STUDIO + "/orders");
  await admin.getByText("lena.berg@example.de").first().click();
  await aufnehmen(geraet, admin, "06-bestellungen");

  // 07 Branding mit Live-Vorschau
  await admin.goto(STUDIO + "/branding");
  await aufnehmen(geraet, admin, "07-branding");

  // 08 Buchungsformular in einer (erfundenen) Fotografen-Website, die
  // Playwright selbst ausliefert. Schmal: einspaltig, ohne Bild, Formular
  // direkt unter dem Text — so wie es auf einer echten Seite stehen würde.
  const seite = await (await kontext(geraet)).newPage();
  await seite.route("https://mara-licht-fotografie.de/", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html>
<html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{margin:0;font:17px/1.6 Georgia,serif;color:#2b2723;background:#f6f1ea}
  header{display:flex;justify-content:space-between;align-items:center;padding:26px 64px;border-bottom:1px solid #e2d8cb}
  header b{font-size:22px;letter-spacing:.04em} nav a{margin-left:28px;color:#2b2723;text-decoration:none;font:15px system-ui}
  main{display:grid;grid-template-columns:1fr 1.25fr;gap:56px;padding:48px 64px}
  h1{font-size:44px;line-height:1.15;margin:0 0 18px;font-weight:normal} p{color:#5c534a;max-width:30em}
  .bild{margin-top:28px;height:300px;background:url(${heroBild}) center/cover}
  iframe{width:100%;height:700px;border:0;background:#fff;box-shadow:0 1px 0 #e2d8cb}
  @media (max-width:600px){
    header{padding:16px 20px} header b{font-size:14px} nav a{white-space:nowrap;font-size:14px} nav a:not(:last-child){display:none}
    main{grid-template-columns:1fr;gap:20px;padding:24px 20px} h1{font-size:30px} .bild{display:none}
  }
</style>
<header><b>MARA LICHT · FOTOGRAFIE</b><nav><a>Portfolio</a><a>Preise</a><a>Über mich</a><a style="border-bottom:1px solid">Termin buchen</a></nav></header>
<main><div><h1>Dein Portraittermin im Studio</h1>
<p>Eine Stunde, ganz entspannt, mit Kaffee und Musik. Such dir direkt hier einen freien Termin aus – die Bestätigung kommt per E-Mail.</p>
<div class="bild"></div></div>
<iframe src="${STUDIO}/embed/?type=portrait" title="Termin buchen"></iframe></main></html>` }));
  await seite.goto("https://mara-licht-fotografie.de/");
  await seite.frameLocator("iframe").getByText("Portrait-Shooting im Studio").waitFor();
  await aufnehmen(geraet, seite, "08-buchung");
}

await browser.close();

// --- 5. Aufräumen -------------------------------------------------------------
if (!process.env.SHOTS_KEEP) docker("rm", "-f", NAME);
console.log("Fertig: " + ZIEL);
