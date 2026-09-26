// Legt aus Platzhalter-Fotos Demo-Alben an — für Screenshots der App.
//
//   node scripts/demo-fotos.mjs [ordner] [url]
//   (Standard: ./demo-fotos, http://localhost:8091 = make dev)
//
// Jeder Unterordner wird ein Album, der Ordnername ist der Titel:
//
//   demo-fotos/
//     Hochzeit Anna & Ben/
//       urls.txt      optional: eine Bild-URL pro Zeile, wird einmalig geladen
//       *.jpg         eigene Dateien gehen genauso
//
// Die Alben gehen an kunde@demo.test, das erste Bild wird das Cover. Alben,
// deren Titel es schon gibt, werden übersprungen — mehrfaches Ausführen ist
// also harmlos. Läuft über dieselbe API wie der Upload-Dialog
// (src/config/images.ts), Vorschauen macht der Server.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import PocketBase from "pocketbase";

const DIR = resolve(process.argv[2] ?? "demo-fotos");
const pb = new PocketBase(process.argv[3] ?? "http://localhost:8091");
pb.autoCancellation(false);
const BILD = /\.(jpe?g|png|webp)$/i;

// Erster Aufruf: Beispielordner anlegen, damit klar ist, wie es aussehen muss
if (!existsSync(DIR)) {
  const beispiel = join(DIR, "Portrait Beispiel");
  await mkdir(beispiel, { recursive: true });
  await writeFile(join(beispiel, "urls.txt"), [
    "# Eine Bild-URL pro Zeile. Ordnername = Albumtitel, erstes Wort = Typ.",
    "# Direkte Links von Unsplash/StockSnap/Pexels oder Lorem Picsum:",
    "https://picsum.photos/id/1011/2400/1600",
    "https://picsum.photos/id/1027/1600/2400",
    "https://picsum.photos/id/1005/2400/1600",
    "",
  ].join("\n"));
  console.log(`${DIR} angelegt, mit Beispiel-Album "Portrait Beispiel".`);
  console.log("Weitere Alben als Unterordner anlegen (urls.txt oder Bilddateien), dann erneut starten.");
  process.exit(0);
}

await pb.collection("users").authWithPassword(
  process.env.DEMO_ADMIN ?? "admin@demo.test",
  process.env.DEMO_PASSWORD ?? "demo123456",
);
// feste Id aus pb_hooks/lib/seeddemolib.js (die E-Mail ist für die API unsichtbar)
const kunde = await pb.collection("users").getOne("democustomer001");

// urls.txt -> 01.jpg, 02.jpg, … (vorhandene Dateien werden nicht neu geladen)
async function ladeUrls(ordner) {
  const liste = join(ordner, "urls.txt");
  if (!existsSync(liste)) return;
  const urls = (await readFile(liste, "utf8")).split("\n").map((z) => z.trim()).filter((z) => z && !z.startsWith("#"));
  for (const [i, url] of urls.entries()) {
    const ziel = join(ordner, String(i + 1).padStart(2, "0") + ".jpg");
    if (existsSync(ziel)) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    await writeFile(ziel, Buffer.from(await res.arrayBuffer()));
    console.log("  geladen", ziel);
  }
}

const datei = async (pfad, name) => new File([await readFile(pfad)], name, { type: "image/jpeg" });

for (const eintrag of await readdir(DIR, { withFileTypes: true })) {
  if (!eintrag.isDirectory()) continue;
  const titel = eintrag.name;
  const ordner = join(DIR, titel);
  console.log(titel);

  const vorhanden = await pb.collection("shootings").getList(1, 1, { filter: pb.filter("title = {:t}", { t: titel }) });
  if (vorhanden.totalItems) { console.log("  gibt es schon, übersprungen"); continue; }

  await ladeUrls(ordner);
  const bilder = (await readdir(ordner)).filter((n) => BILD.test(n)).sort();
  if (!bilder.length) { console.log("  keine Bilder, übersprungen"); continue; }

  const fd = new FormData();
  fd.append("title", titel);
  fd.append("description", "");
  fd.append("type", titel.split(" ")[0]); // "Hochzeit Anna & Ben" -> "Hochzeit"
  fd.append("priceIds", JSON.stringify(["defaultprice001", "defaultprice002", "defaultprice003", "defaultprice004"]));
  fd.append("userIds", JSON.stringify([kunde.id]));
  fd.append("withUserSelection", "false");
  fd.append("coverImage", await datei(join(ordner, bilder[0]), bilder[0]));
  const shooting = await pb.collection("shootings").create(fd);
  // wie ShootingModal.tsx: die Zuordnung steht auf beiden Seiten
  kunde.shootingIds = [...(kunde.shootingIds ?? []), shooting.id];
  await pb.collection("users").update(kunde.id, { shootingIds: kunde.shootingIds });

  for (const name of bilder) {
    const bild = new FormData();
    bild.append("shootingId", shooting.id);
    bild.append("type", "original");
    bild.append("name", name);
    bild.append("originalFile", await datei(join(ordner, name), name));
    await pb.collection("images").create(bild);
  }
  console.log(`  ${bilder.length} Bilder hochgeladen`);
}

// Vorschauen jetzt rendern statt auf den Minuten-Cron zu warten
for (;;) {
  const r = await pb.send("/api/custom/preview-worker", { method: "POST", body: {} });
  if (!r.pending) break;
  // nichts geschafft = ein anderer Worker (Cron) hält die Bilder, der macht sie fertig
  if (!r.generated && !r.failed) { console.log(`Vorschauen: ${r.pending} rendert der Server im Hintergrund`); break; }
  console.log(`Vorschauen: noch ${r.pending}`);
}
console.log("Fertig.");
