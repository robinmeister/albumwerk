// Realtime-style access for the two paths this app uses, backed by PB.
//   userSelection/{shootingId}  → PB `userSelection` collection (one row per shooting)
//   uploads/{shootingId}        → no-op (was the preview-generation progress feed;
//                                  there is no preview generator without generatePreview)
// No firebase dependency.
//
// ponytail: uploads/* is a no-op. Upgrade path: if a PB preview hook is added, surface
//   its progress via a realtime subscribe on an "uploads" collection here.
import { pb } from "./pocketbase";

type PBRef = { kind: "userSelection" | "uploads" | "other"; shootingId: string; path: string };

function snap(value: any) {
  return {
    exists: () => value != null,
    val: () => value,
  };
}

export function ref(path: string): PBRef {
  const parts = path.replace(/^\/+|\/+$/g, "").split("/");
  const head = parts[0];
  const kind = head === "userSelection" ? "userSelection" : head === "uploads" ? "uploads" : "other";
  return { kind, shootingId: parts[1] ?? "", path };
}

async function fetchSelection(shootingId: string) {
  try {
    return await pb.collection("userSelection").getFirstListItem(`shootingId="${shootingId}"`, { requestKey: null });
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}

// onValue(ref, cb) → call cb once with current value, then keep it live via subscribe.
// Returns an unsubscribe function.
export function onValue(r: PBRef, cb: (snapshot: any) => void): () => void {
  if (r.kind === "uploads") {
    cb(snap(null));
    return () => undefined;
  }

  if (r.kind === "userSelection") {
    void fetchSelection(r.shootingId).then((rec) => {
      cb(snap(rec ? { selectedImages: (rec as any).selectedImages, status: (rec as any).status } : null));
    });
    let unsub: (() => void) | undefined;
    pb.collection("userSelection")
      .subscribe("*", (e: any) => {
        if (e.record?.shootingId === r.shootingId) {
          cb(snap({ selectedImages: e.record.selectedImages, status: e.record.status }));
        }
      })
      .then((u: any) => { unsub = u; })
      .catch(() => undefined);
    return () => { if (unsub) unsub(); };
  }

  cb(snap(null));
  return () => undefined;
}

// set(ref, value) → upsert (userSelection) or no-op (uploads).
export async function set(r: PBRef, value: any): Promise<any> {
  if (r.kind === "uploads") return; // no-op

  if (r.kind === "userSelection") {
    if (value == null) {
      const existing = await fetchSelection(r.shootingId);
      if (existing) await pb.collection("userSelection").delete((existing as any).id);
      return;
    }
    const existing = await fetchSelection(r.shootingId);
    const data = {
      shootingId: r.shootingId,
      // the API rules gate reads/writes on the owner — without userId the
      // create is rejected for customers and the record stays invisible
      userId: (existing as any)?.userId || (pb.authStore.model as any)?.id || "",
      selectedImages: value.selectedImages ?? [],
      status: value.status ?? "pending",
    };
    if (existing) return pb.collection("userSelection").update((existing as any).id, data);
    return pb.collection("userSelection").create(data);
  }
}
