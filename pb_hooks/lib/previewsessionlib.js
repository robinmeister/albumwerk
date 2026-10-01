// Reine Helfer für die Kundenansicht-Vorschau (docs/kundenansicht-vorschau.md).
// Bewusst ohne PocketBase-Abhängigkeiten, damit tests/previewSession.test.ts sie
// per createRequire direkt einbinden kann — derselbe Code läuft im Hook.

const TTL_MINUTES = 15;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// Der Zufall wird hereingereicht, nicht erzeugt: der Hook uebergibt
// $security.randomStringWithAlphabet (CSPRNG), der Test einen abzaehlbaren
// Ersatz. So bleibt die Datei frei von PocketBase-Globals UND das Passwort,
// das echten Lesezugriff bewacht, stammt nicht aus Math.random().
function requireZufall(zufall) {
  if (typeof zufall !== "function") {
    throw new Error("buildShadowUser braucht eine Zufallsfunktion (len, alphabet) => string");
  }
  return zufall;
}

// Der Bauplan eines Schattenkontos. Es traegt nur die shootingIds — daran
// haengen die Zugriffsregeln fuer Galerie und Bilder, und mehr braucht die
// Vorschau nicht. Name und sonstige Daten der echten Kundschaft werden
// bewusst NICHT kopiert.
function buildShadowUser(shootingId, nowMs, ttlMinutes, zufall) {
  const ttl = typeof ttlMinutes === "number" ? ttlMinutes : TTL_MINUTES;
  const rnd = requireZufall(zufall);
  const handle = rnd(12, ALPHABET);
  return {
    // die users-ID hat kein Autogenerate-Muster (Firebase-Altlast)
    id: rnd(15, ALPHABET),
    email: "vorschau-" + handle + "@albumwerk.invalid",
    password: rnd(42, ALPHABET),
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

// Die Vorschau ist nur zum Ansehen da. Lesen ist GET/HEAD; dazu zwei POSTs,
// die nichts veraendern: authRefresh (main.tsx laedt damit das Konto nach)
// und /api/realtime (setzt nur Abos). Alles andere wird abgewiesen.
// src/config/pocketbase.ts spiegelt diese Regel im Browser.
const LESENDE_POSTS = ["/api/collections/users/auth-refresh", "/api/realtime"];

function istLesend(method, path) {
  const m = String(method || "").toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  return m === "POST" && LESENDE_POSTS.indexOf(String(path || "")) !== -1;
}

module.exports = {
  TTL_MINUTES: TTL_MINUTES,
  istLesend: istLesend,
  buildShadowUser: buildShadowUser,
  isExpired: isExpired,
};
