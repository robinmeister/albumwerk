import PocketBase from 'pocketbase';

// In production PocketBase serves the built SPA itself (pb_public), so the API
// lives on the same origin. For local dev point VITE_PB_URL at your instance.
const baseUrl: string =
  import.meta.env.VITE_PB_URL || window.location.origin;

export const pb = new PocketBase(baseUrl);

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

export async function loginWithPocketBase(identity: string, password: string) {
  return pb.collection('users').authWithPassword(identity, password);
}

export async function clearPocketBaseClientAuth() {
  try {
    pb.authStore.clear();
  } catch (error) {
    console.warn('PocketBase clear auth failed', error);
  }
}
