// Firestore-style data access backed entirely by PocketBase.
// Keeps the firestore call shape (collection/doc/getDoc/...) so the data pages
// read naturally, but there is no firebase dependency anymore.
// ponytail: covers exactly the surface this app uses. Add more only if a page needs it.
import { pb } from "./pocketbase";

type PBColl = { __pbCollection: string };
type PBDoc = { __pbCollection: string; __id: string };

export function collection(name: string): PBColl {
  return { __pbCollection: name };
}

export function doc(name: string, id?: string): PBDoc {
  return { __pbCollection: name, __id: id ?? "" };
}

// Firestore DocumentSnapshot-compatible wrapper around a PB record (or null).
function docSnap(id: string, record: any) {
  return {
    id: record?.id ?? id,
    exists: () => record != null,
    data: () => record ?? undefined,
  };
}

export async function getDoc(ref: PBDoc): Promise<any> {
  const { __pbCollection: name, __id: id } = ref;
  try {
    const record = await pb.collection(name).getOne(id, { requestKey: null });
    return docSnap(id, record);
  } catch (e: any) {
    if (e?.status === 404) return docSnap(id, null);
    throw e;
  }
}

export async function getDocs(ref: PBColl): Promise<any> {
  const { __pbCollection: name } = ref;
  const records = await pb.collection(name).getFullList({ requestKey: null });
  const docs = records.map((r: any) => ({
    id: r.id,
    exists: () => true,
    data: () => r,
  }));
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb: (d: any) => void) => docs.forEach(cb),
  };
}

export async function addDoc(ref: PBColl, data: any): Promise<any> {
  const { __pbCollection: name } = ref;
  const { id, ...rest } = data ?? {};
  const record = await pb.collection(name).create(rest);
  return { id: record.id };
}

export async function updateDoc(ref: PBDoc, data: any): Promise<any> {
  const { __pbCollection: name, __id: id } = ref;
  const { id: _omit, ...rest } = data ?? {};
  return pb.collection(name).update(id, rest);
}

export async function deleteDoc(ref: PBDoc): Promise<any> {
  const { __pbCollection: name, __id: id } = ref;
  return pb.collection(name).delete(id);
}

// setDoc(ref, data, {merge}) → PB create-or-update by explicit id.
export async function setDoc(ref: PBDoc, data: any, _options?: any): Promise<any> {
  const { __pbCollection: name, __id: id } = ref;
  const { id: _omit, ...rest } = data ?? {};
  try {
    return await pb.collection(name).update(id, rest);
  } catch (e: any) {
    if (e?.status === 404) return pb.collection(name).create({ id, ...rest });
    throw e;
  }
}

// Firestore type shims (kept as `any` so type-only imports in pages still resolve).
export type DocumentData<T = any> = any;
export type DocumentSnapshot<T = any> = any;
export type QuerySnapshot<T = any> = any;
export type CollectionReference<T = any> = any;
export type QueryDocumentSnapshot<T = any> = any;
