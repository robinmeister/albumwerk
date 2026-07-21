import { toast } from "react-toastify";
import { collection, doc, getDoc, getDocs } from "../config/firestore-compat";

import { pb } from "../config/pocketbase";
import { imageFileUrl } from "../config/storage-compat";
import { Package, User } from "./types";

// PB file URLs look like /api/files/{collection}/{recordId}/{storedFilename};
// the record id of the preview is the only reliable key in the URL (the
// stored filename carries a random suffix, the original name lives in the
// record's `name` field).
export function fileUrlRecordId(url: string): string | null {
  return url.match(/\/api\/files\/[^/]+\/([^/]+)\//)?.[1] ?? null;
}

// Resolve preview file URLs to the filenames of the matching originals
// (previews keep the original's `name`).
export async function getOriginalImages(urlList: string[], shootingId: string): Promise<string[]> {
  const ids = new Set(
    urlList.map(fileUrlRecordId).filter(Boolean) as string[]
  );
  const [previews, originals] = await Promise.all([
    pb.collection("images").getFullList({
      requestKey: null,
      fields: "id,name",
      filter: `shootingId="${shootingId}" && type="preview"`,
    }),
    pb.collection("images").getFullList({
      requestKey: null,
      fields: "id,name",
      filter: `shootingId="${shootingId}" && type="original"`,
    }),
  ]);
  const wantedNames = new Set(
    previews.filter((p: any) => ids.has(p.id)).map((p: any) => p.name as string)
  );
  return originals
    .map((o: any) => o.name as string)
    .filter((name) => wantedNames.has(name));
}

export const downloadFile = (url : string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(): void {
      if (this.status === 200) {
        const blob = new Blob([this.response], {type: 'image/jpeg'});
        resolve(blob);
      } else {
        reject(new Error(`Download-Fehler: ${ this.statusText}`));
      }
    };
    xhr.onerror = function(): void {
      reject(new Error('Netzwerkfehler'));
    };
    xhr.onprogress = function(event): void {
      if (event.lengthComputable) {
        console.info("event: ", event.loaded / event.total * 100)
      }
    };
    xhr.send();
  });
};

// Download the original belonging to a preview file URL: preview record id
// from the URL → preview record → original record with the same name.
export const downloadImageFromUrl = async (url: string): Promise<void> => {
  try {
    const recordId = fileUrlRecordId(url);
    if (!recordId) throw new Error(`unrecognized file url: ${url}`);
    const preview: any = await pb.collection("images").getOne(recordId, { requestKey: null });
    const name = String(preview.name).replace(/"/g, '\\"');
    const original: any = await pb
      .collection("images")
      .getFirstListItem(
        `shootingId="${preview.shootingId}" && type="original" && name="${name}"`,
        { requestKey: null }
      );
    // originals live in the protected originalFile field — needs a file token
    const downloadUrl = await imageFileUrl(original);
    const blob = (await downloadFile(downloadUrl)) as Blob;
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = original.name || "bild.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(objectUrl);
    toast.success("Download erfolgreich!");
  } catch (error) {
    console.error("Download fehlgeschlagen:", error);
    toast.error("Download fehlgeschlagen!");
  }
}

export async function loadImage(): Promise<string | null> {
  try {
    const data = await pb.collection('loginImages').getList(1, 50);
    const record = data.items?.[0];
    if (!record || !(record as any).file) {
      return ""; // fresh instance without login images — pages render a color fallback
    }
    // pb.files.getUrl resolves against the PB base URL (:8090), not the dev server origin.
    return pb.files.getUrl(record, (record as any).file);
  } catch (error: any) {
    if (error?.isAbort) {
      return null;
    }
    console.error('PocketBase image load error:', error);
    return null;
  }
}

export const getUsersSnapshot = async (): Promise<User[]> => {
  const records = await pb.collection("users").getFullList({ requestKey: null });
  return records.map((r: any) => ({
    uid: r.id,
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    isAdmin: r.isAdmin,
  }));
}

export const fetchShootingPackage = async (packageId: string): Promise<Package | undefined> => {
  try {
    const data: any = await pb.collection("packages").getOne(packageId, { requestKey: null });
    return {
      id: data.id,
      title: data.title,
      numberOfImages: data.numberOfImages,
      totalPrice: data.totalPrice,
      singlePrice: data.singlePrice,
    };
  } catch (error) {
    console.error("Error getting package:", error);
    return;
  }
};
