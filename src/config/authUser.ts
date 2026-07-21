// Local auth user type — replaces firebase/auth `User`.
// Mirrors the PB users record fields the app reads. `uid` aliases PB `id`.
export interface AuthUser {
  uid: string;
  id?: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  verified?: boolean;
  [key: string]: any;
}
