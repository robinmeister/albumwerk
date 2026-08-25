// Zugriff auf die Bilddateien der PB-Collection `images` — ein Datensatz je
// Bild, `type` unterscheidet "preview" und "original".
// Vorschauen entstehen serverseitig mit Wasserzeichen (pb_hooks/previews.pb.js);
// Originale dürfen nur Admins und die dem Shooting zugeordneten Nutzer lesen.
import { pb } from "./pocketbase";

// Ein Bild-Datensatz, so wie ihn die Album-Ansichten brauchen.
export type ImageRef = { id: string; name: string; file?: string; originalFile?: string };

// Originale liegen im geschützten Feld `originalFile` (Migration 1784600007):
// ihre Bytes brauchen ein kurzlebiges Datei-Token. Vorschauen bleiben im
// öffentlichen Feld `file`. Das Token wird zwischengespeichert und lange vor
// seinem Ablauf (180 s) erneuert.
let tokenCache: { token: string; fetchedAt: number } | null = null;
async function fileAccessToken(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.fetchedAt < 120_000) {
    return tokenCache.token;
  }
  const token = await pb.files.getToken();
  tokenCache = { token, fetchedAt: Date.now() };
  return token;
}

// URL zu einem einzelnen Bild-Datensatz; hängt ein Datei-Token an, wenn die
// Bytes im geschützten Feld originalFile liegen.
export async function imageFileUrl(rec: {
  id: string;
  originalFile?: string;
  file?: string;
}): Promise<string> {
  const record = { ...rec, collectionId: "images", collectionName: "images" };
  if (rec.originalFile) {
    const token = await fileAccessToken();
    return pb.files.getUrl(record, rec.originalFile, { token } as any);
  }
  return pb.files.getUrl(record, rec.file as string);
}

async function listImages(shootingId: string, type: "preview" | "original"): Promise<ImageRef[]> {
  return (await pb.collection("images").getFullList({
    requestKey: null,
    filter: pb.filter("shootingId={:sid} && type={:type}", { sid: shootingId, type }),
  })) as unknown as ImageRef[];
}

/** Vorschaubilder eines Shootings, nach ursprünglichem Dateinamen sortiert. */
export async function listPreviews(shootingId: string): Promise<ImageRef[]> {
  const items = await listImages(shootingId, "preview");
  const stemOf = (filename: string) =>
    (filename.split(".")[0].split("/").pop() ?? "").toLowerCase();
  return items.sort((a, b) => {
    const stemA = stemOf(a.name ?? "");
    const stemB = stemOf(b.name ?? "");
    const numA = stemA.match(/\d+/)?.[0];
    const numB = stemB.match(/\d+/)?.[0];
    if (numA && numB && parseInt(numA) !== parseInt(numB)) {
      return parseInt(numA) - parseInt(numB);
    }
    return stemA.localeCompare(stemB);
  });
}

/** URL zum Original mit dem angegebenen Dateinamen. */
export async function originalFileUrl(shootingId: string, name: string): Promise<string> {
  const originals = await listImages(shootingId, "original");
  const match = originals.find((image) => image.name === name);
  if (!match) throw new Error(`Original nicht gefunden: ${name}`);
  return imageFileUrl(match);
}

// Create an images record with real upload progress. The PB SDK cannot report
// upload progress, so this goes through XMLHttpRequest directly.
export function uploadImage(opts: {
  shootingId: string;
  file: File;
  type?: "original" | "preview";
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new DOMException("Der Upload wurde abgebrochen", "AbortError"));
      return;
    }

    const fd = new FormData();
    const type = opts.type ?? "original";
    fd.append("shootingId", opts.shootingId);
    fd.append("type", type);
    fd.append("name", opts.file.name);
    // originals go into the protected field, previews stay public
    fd.append(type === "original" ? "originalFile" : "file", opts.file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", pb.buildUrl("/api/collections/images/records"));
    if (pb.authStore.token) xhr.setRequestHeader("Authorization", pb.authStore.token);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) opts.onProgress?.(ev.loaded / ev.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = `Upload fehlgeschlagen (HTTP ${xhr.status})`;
      try {
        message = JSON.parse(xhr.responseText)?.message || message;
      } catch {
        // keep the generic message
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Hochladen"));
    xhr.onabort = () => reject(new DOMException("Der Upload wurde abgebrochen", "AbortError"));

    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(fd);
  });
}

// Cover URL for album overviews: the shooting's own coverImage if set,
// otherwise the first preview image of the album. Returns "" when the
// album is empty. Thumb sizes must be declared on the file fields
// (coverImage: 100x100/800x600, images.file: 400x0/800x0).
export async function getShootingCoverUrl(
  shooting: any,
  opts?: { coverThumb?: string; previewThumb?: string }
): Promise<string> {
  if (shooting.coverImage) {
    return pb.files.getUrl(shooting, shooting.coverImage,
      opts?.coverThumb ? { thumb: opts.coverThumb } : undefined);
  }
  const res = await pb.collection("images").getList(1, 1, {
    requestKey: null,
    filter: pb.filter("shootingId={:sid} && type='preview'", { sid: shooting.id }),
    sort: "name",
  });
  const rec = res.items[0];
  if (!rec) return "";
  return pb.files.getUrl(rec, rec.file,
    opts?.previewThumb ? { thumb: opts.previewThumb } : undefined);
}

// Delete an image given its download URL ({base}/api/files/{collection}/{recordId}/{file}).
// Deleting the original suffices: the server hook (pb_hooks/previews.pb.js)
// removes the matching preview record automatically.
export async function deleteImageByUrl(url: string): Promise<void> {
  const match = url.match(/\/api\/files\/[^/]+\/([^/]+)\//);
  if (!match) throw new Error(`Keine PocketBase-Datei-URL: ${url}`);
  const rec = await pb.collection("images").getOne(match[1], { requestKey: null });
  if (rec.type === "preview") {
    const originals = await pb.collection("images").getFullList({
      requestKey: null,
      filter: pb.filter("shootingId={:sid} && type='original' && name={:name}", {
        sid: rec.shootingId,
        name: rec.name,
      }),
    });
    if (originals.length > 0) {
      for (const original of originals) {
        await pb.collection("images").delete(original.id);
      }
      return;
    }
  }
  await pb.collection("images").delete(rec.id);
}
