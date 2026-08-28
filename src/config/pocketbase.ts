import PocketBase, { BaseAuthStore, type AuthModel } from 'pocketbase';

// In production PocketBase serves the built SPA itself (pb_public), so the API
// lives on the same origin. For local dev point VITE_PB_URL at your instance.
const baseUrl: string =
  import.meta.env.VITE_PB_URL || (typeof window !== 'undefined' ? window.location.origin : '');

/*
  Sitzungstrennung fuer die Kundenansicht-Vorschau
  (docs/kundenansicht-vorschau.md).

  Die Vorschau laeuft in einem iframe auf derselben Herkunft. Mit dem
  Standard-LocalAuthStore wuerde ihre Anmeldung die Admin-Sitzung im
  Elternfenster ueberschreiben — derselbe localStorage. Deshalb bekommt der
  Client im Vorschaumodus einen reinen Speicher-Store: er faellt mit dem
  iframe weg und fasst localStorage nie an.

  Die Erkennung ist bewusst nur privilegienmindernd. Wer den Parameter
  faelscht, bekommt eine Sitzung ohne Persistenz und sonst nichts.
*/
export function istVorschauUrl(search: string): boolean {
  return new URLSearchParams(search).has('vorschau');
}

// Speicher-only Auth Store fuer Vorschaumodus: beruehrt localStorage nie
class MemoryAuthStore extends BaseAuthStore {
  save(token: string, model?: AuthModel): void {
    this.baseToken = token;
    this.baseModel = model ?? {};
  }

  clear(): void {
    this.baseToken = '';
    this.baseModel = {};
  }
}

export const IST_VORSCHAU: boolean =
  typeof window !== 'undefined' && istVorschauUrl(window.location.search);

export const pb = IST_VORSCHAU
  ? new PocketBase(baseUrl, new MemoryAuthStore())
  : new PocketBase(baseUrl);

// `getOne` that yields null instead of throwing when the record is not there.
// A missing record is an ordinary outcome for most reads here (a customer
// without a profile row, a shooting that was deleted while the page was open),
// so the callers branch on null rather than wrap every read in try/catch.
export async function getRecord<T = any>(
  collection: string,
  id: string | undefined | null,
): Promise<T | null> {
  if (!id) return null;
  try {
    return (await pb.collection(collection).getOne(id, { requestKey: null })) as T;
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
}

export async function signUpWithPocketBase(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  shootingId?: string;
}): Promise<{ id: string }> {
  return pb.send('/api/custom/signup', {
    method: 'POST',
    body: {
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      shootingId: payload.shootingId ?? '',
    },
  });
}

type LinkShootingResult = {
  status: string;
  alreadyLinked: boolean;
  id: string;
  title: string;
  type: string;
};

// Links an existing album to the logged-in account (QR code / album code).
// Server-side because customers cannot write shootings.userIds themselves.
// Throws with `error.response.code === 'unknown-shooting'` for a wrong code.
export async function linkShootingToCurrentUser(
  shootingId: string,
): Promise<LinkShootingResult> {
  return pb.send('/api/custom/link-shooting', {
    method: 'POST',
    body: { shootingId },
  });
}

export async function loginWithPocketBase(identity: string, password: string) {
  return pb.collection('users').authWithPassword(identity, password);
}

