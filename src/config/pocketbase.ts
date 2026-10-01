import PocketBase, { BaseAuthStore, ClientResponseError } from 'pocketbase';

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

// BaseAuthStore is memory-only by design; LocalAuthStore adds localStorage.
// Concrete subclass to work around abstract base; inherits correct save/clear.
class MemoryAuthStore extends BaseAuthStore {}

export const IST_VORSCHAU: boolean =
  typeof window !== 'undefined' && istVorschauUrl(window.location.search);

export const pb = IST_VORSCHAU
  ? new PocketBase(baseUrl, new MemoryAuthStore())
  : new PocketBase(baseUrl);

/*
  Die Vorschau ist nur zum Ansehen da. Spiegelt istLesend() aus
  pb_hooks/lib/previewsessionlib.js — der Server sperrt fuer Schattenkonten
  ohnehin, das hier deckt zusaetzlich die anonyme Link-Ansicht ab, die er
  nicht von echter Kundschaft unterscheiden kann.
*/
const LESENDE_POSTS = ['/api/collections/users/auth-refresh', '/api/realtime'];

export function istLesend(method: string | undefined, path: string): boolean {
  const m = (method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return true;
  return m === 'POST' && LESENDE_POSTS.includes(path);
}

if (IST_VORSCHAU) {
  pb.beforeSend = (url, options) => {
    if (!istLesend(options.method, new URL(url, baseUrl).pathname)) {
      throw new ClientResponseError({
        url,
        status: 403,
        response: { code: 'preview-readonly', message: 'In der Kundenansicht kann nichts geändert werden.' },
      });
    }
    return { url, options };
  };
}

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

