// Storage-style access backed by the PB `images` collection.
// Path convention: `shootings/{shootingId}/{type}/{filename}`, type = "preview" | "original".
// One PB record per image (option 1b). No firebase dependency.
// Previews are generated server-side with a watermark (pb_hooks/previews.pb.js);
// originals are only readable by admins and users assigned to the shooting.
import { pb } from "./pocketbase";

type PBRef = {
  shootingId: string;
  type: string;      // "preview" | "original" | "" (folder root)
  name: string;      // filename, "" for folder
  recordId?: string; // set when ref came from a list result
  file?: string;     // stored filename, set when ref came from a list result
  protected?: boolean; // true when the file lives in the protected originalFile field
  fullPath: string;
};

// Originals live in the protected `originalFile` field (migration 1784600007):
// their bytes require a short-lived file token. Previews stay in the public
// `file` field. The token is cached and refreshed well before its 180s expiry.
let tokenCache: { token: string; fetchedAt: number } | null = null;
export async function fileAccessToken(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.fetchedAt < 120_000) {
    return tokenCache.token;
  }
  const token = await pb.files.getToken();
  tokenCache = { token, fetchedAt: Date.now() };
  return token;
}

// URL for a single image record; appends a file token when the record's bytes
// are in the protected originalFile field.
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

// shootings/{id}/{type}/{name}  — also handles trailing/leading slashes
function parsePath(path: string): { shootingId: string; type: string; name: string } {
  const parts = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const shootingId = parts[1] ?? "";
  const type = parts[2] ?? "";
  const name = parts.slice(3).join("/") ?? "";
  return { shootingId, type, name };
}

export function ref(path: string): PBRef {
  const { shootingId, type, name } = parsePath(path);
  return { shootingId, type, name, fullPath: path.replace(/^\/+/, "") };
}

function recordToRef(rec: any): PBRef {
  return {
    shootingId: rec.shootingId,
    type: rec.type,
    name: rec.name,
    recordId: rec.id,
    file: rec.originalFile || rec.file,
    protected: Boolean(rec.originalFile),
    fullPath: `shootings/${rec.shootingId}/${rec.type}/${rec.name}`,
  };
}

async function listRecords(shootingId: string, type: string) {
  return pb.collection("images").getFullList({
    requestKey: null,
    filter: pb.filter("shootingId={:sid} && type={:type}", { sid: shootingId, type }),
  });
}

export async function listAll(r: PBRef): Promise<any> {
  const recs = await listRecords(r.shootingId, r.type);
  return { items: recs.map(recordToRef), prefixes: [] };
}

export async function list(r: PBRef, _opts?: any): Promise<any> {
  const recs = await listRecords(r.shootingId, r.type);
  return { items: recs.map(recordToRef), prefixes: [], nextPageToken: undefined };
}

export async function getDownloadURL(r: PBRef): Promise<string> {
  if (r.recordId) {
    return imageFileUrl(
      r.protected
        ? { id: r.recordId, originalFile: r.file }
        : { id: r.recordId, file: r.file },
    );
  }
  const recs = await listRecords(r.shootingId, r.type);
  const match = recs.find((x: any) => x.name === r.name) ?? recs[0];
  if (!match) throw Object.assign(new Error("object-not-found"), { code: "storage/object-not-found" });
  return imageFileUrl(match as any);
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

export async function deleteObject(r: PBRef): Promise<void> {
  if (r.recordId) {
    await pb.collection("images").delete(r.recordId);
    return;
  }
  const recs = await pb.collection("images").getFullList({
    requestKey: null,
    filter: pb.filter("shootingId={:sid} && type={:type} && name={:name}", {
      sid: r.shootingId,
      type: r.type,
      name: r.name,
    }),
  });
  for (const rec of recs) {
    await pb.collection("images").delete(rec.id);
  }
}
