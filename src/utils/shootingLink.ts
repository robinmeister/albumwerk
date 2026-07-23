// Everything the "share an album / add an album" flow needs to turn a shooting
// into a link (QR code) and a scanned/pasted value back into a shooting id.
//
// The QR code a customer scans with the phone camera points at /addAlbum/<id>,
// which links the album to their account and opens it — see AddShootingPage.

// PocketBase autogenerates shooting ids as 15 lowercase alphanumerics.
const SHOOTING_ID_RE = /^[a-z0-9]{15}$/;

export function isShootingId(value: string): boolean {
  return SHOOTING_ID_RE.test(value);
}

/** Path a customer is sent to by a shared link / QR code. */
export function addAlbumPath(shootingId: string): string {
  return `/addAlbum/${shootingId}`;
}

/** Absolute link for sharing: public albums stay open, everything else is linked to an account. */
export function shootingShareLink(shooting: { id: string; type?: string }): string {
  const origin = window.location.origin;
  return shooting.type === "public"
    ? `${origin}/publicAlbum/${shooting.id}`
    : `${origin}${addAlbumPath(shooting.id)}`;
}

// Accepts what customers realistically enter or scan: the bare code, a full
// share link (/addAlbum/<id>, /publicAlbum/<id>, ?shootingId=<id>), or one of
// those with stray whitespace. Returns "" when nothing usable was found.
export function parseShootingId(input: string): string {
  const value = (input ?? "").trim();
  if (!value) return "";
  if (isShootingId(value)) return value;

  // a link (or anything else with a query string / path we can mine)
  try {
    const url = new URL(value, window.location.origin);
    const fromQuery = url.searchParams.get("shootingId");
    if (fromQuery && isShootingId(fromQuery.trim())) return fromQuery.trim();
    const segments = url.pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      if (isShootingId(segments[i])) return segments[i];
    }
  } catch {
    /* not a URL — fall through */
  }

  // last resort: a code embedded in free text ("Dein Album: abc123…")
  const match = value.match(/[a-z0-9]{15}/);
  return match ? match[0] : "";
}
