// Reine Helfer für die Kundenansicht-Vorschau (docs/kundenansicht-vorschau.md).
// Bewusst ohne PocketBase-Abhängigkeiten, damit tests/previewSession.test.ts sie
// per createRequire direkt einbinden kann — derselbe Code läuft im Hook.

const TTL_MINUTES = 15;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return out;
}

// Der Bauplan eines Schattenkontos. Es traegt nur die shootingIds — daran
// haengen die Zugriffsregeln fuer Galerie und Bilder, und mehr braucht die
// Vorschau nicht. Name und sonstige Daten der echten Kundschaft werden
// bewusst NICHT kopiert.
function buildShadowUser(shootingId, nowMs, ttlMinutes) {
  const ttl = typeof ttlMinutes === "number" ? ttlMinutes : TTL_MINUTES;
  const handle = randomString(12);
  return {
    // die users-ID hat kein Autogenerate-Muster (Firebase-Altlast)
    id: randomString(15),
    email: "vorschau-" + handle + "@albumwerk.invalid",
    password: randomString(24),
    shootingIds: [shootingId],
    isAdmin: false,
    isPreview: true,
    previewExpiresAt: new Date(nowMs + ttl * 60 * 1000).toISOString(),
  };
}

// Ein Datensatz ohne oder mit unlesbarem Ablauf gilt als abgelaufen — sonst
// haette ein halb angelegtes Konto unbegrenzt Bestand.
function isExpired(expiresAtIso, nowMs) {
  const ts = Date.parse(String(expiresAtIso || ""));
  if (!Number.isFinite(ts)) return true;
  return ts <= nowMs;
}

module.exports = {
  TTL_MINUTES: TTL_MINUTES,
  buildShadowUser: buildShadowUser,
  isExpired: isExpired,
};
