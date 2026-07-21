// Unified "current user" accessor backed by PocketBase authStore.
// PB authStore.model uses `id`; we expose it as `uid` to match the shape the pages rely on.
import { pb } from "./pocketbase";
import { AuthUser } from "./authUser";

export function currentUser(): AuthUser | null {
  const m: any = pb.authStore.model;
  return m ? { ...m, uid: m.id, email: m.email ?? null } : null;
}
