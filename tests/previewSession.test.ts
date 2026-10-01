import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { istLesend, istVorschauUrl } from "../src/config/pocketbase";

// Wie tests/time.test.ts: der Hook-Helfer ist CommonJS und wird direkt
// eingebunden, damit Test und Server denselben Code benutzen.
const require = createRequire(import.meta.url);
const preview = require("../pb_hooks/lib/previewsessionlib.js");

describe("Schattenkonto-Bauplan", () => {
  const NOW = Date.parse("2026-08-28T10:00:00.000Z");

  // Deterministische Zufallsfunktion für Tests: gibt Strings aus einer
  // endlichen Sequenz zurück, sodass die Ausgaben vorhersehbar sind.
  // Die Länge wird ignoriert; die Sequenz hängt nur vom Alphabet ab.
  const sequences: Record<string, string[]> = {
    "abcdefghijklmnopqrstuvwxyz0123456789": [
      "aaaaaaaaaaaa", // handle
      "aaaaaaaaaaaaaaa", // id
      "aaaaaaaaaaaaaaaaaaaaaaaa", // password
      "bbbbbbbbbbbb", // handle (2. call)
      "bbbbbbbbbbbbbbb", // id (2. call)
      "bbbbbbbbbbbbbbbbbbbbbbbb", // password (2. call)
    ],
  };
  let seqIndex = 0;
  const deterministicRandom = (len: number, alphabet: string) => {
    const seq = sequences[alphabet];
    if (!seq) throw new Error(`Unknown alphabet: ${alphabet}`);
    if (seqIndex >= seq.length) {
      throw new Error(`Exhausted deterministic sequence (${seq.length} items)`);
    }
    return seq[seqIndex++];
  };
  const resetSeq = () => { seqIndex = 0; };

  it("traegt genau die shootingIds der gezeigten Galerie", () => {
    resetSeq();
    const u = preview.buildShadowUser("shoot123", NOW, 15, deterministicRandom);
    expect(u.shootingIds).toEqual(["shoot123"]);
  });

  it("ist kein Admin und als Vorschau markiert", () => {
    resetSeq();
    const u = preview.buildShadowUser("shoot123", NOW, 15, deterministicRandom);
    expect(u.isAdmin).toBe(false);
    expect(u.isPreview).toBe(true);
  });

  it("bekommt eine nicht zustellbare Adresse", () => {
    resetSeq();
    const u = preview.buildShadowUser("shoot123", NOW, 15, deterministicRandom);
    // .invalid ist per RFC 2606 reserviert und aufloest nie
    expect(u.email.endsWith(".invalid")).toBe(true);
  });

  it("vergibt bei jedem Aufruf eine andere Kennung und Adresse", () => {
    resetSeq();
    const a = preview.buildShadowUser("shoot123", NOW, 15, deterministicRandom);
    const b = preview.buildShadowUser("shoot123", NOW, 15, deterministicRandom);
    expect(a.id).not.toBe(b.id);
    expect(a.email).not.toBe(b.email);
    expect(a.password).not.toBe(b.password);
  });

  it("erzeugt eine ID im Format der users-Sammlung", () => {
    resetSeq();
    const u = preview.buildShadowUser("shoot123", NOW, 15, deterministicRandom);
    expect(u.id).toMatch(/^[a-z0-9]{15}$/);
  });

  it("setzt den Ablauf ttlMinutes in die Zukunft", () => {
    resetSeq();
    const u = preview.buildShadowUser("shoot123", NOW, 15, deterministicRandom);
    expect(Date.parse(u.previewExpiresAt) - NOW).toBe(15 * 60 * 1000);
  });

  it("erkennt abgelaufen und noch gueltig", () => {
    resetSeq();
    const u = preview.buildShadowUser("shoot123", NOW, 15, deterministicRandom);
    expect(preview.isExpired(u.previewExpiresAt, NOW)).toBe(false);
    expect(preview.isExpired(u.previewExpiresAt, NOW + 14 * 60 * 1000)).toBe(false);
    expect(preview.isExpired(u.previewExpiresAt, NOW + 16 * 60 * 1000)).toBe(true);
  });

  it("behandelt einen leeren Ablauf als abgelaufen", () => {
    // ein Datensatz ohne previewExpiresAt darf nicht ewig leben
    expect(preview.isExpired("", NOW)).toBe(true);
    expect(preview.isExpired("kaputt", NOW)).toBe(true);
  });

  it("erzeugt echte Zufallspasswoerter mit echter Randomness", () => {
    // Mit echter Zufallsfunktion: zwei Aufrufe sollten unterschiedliche
    // Passwörter, IDs und E-Mail-Adressen produzieren. Das beweist, dass
    // die Randomness tatsächlich wirkt, nicht nur im deterministischen Test.
    const realRandom = (len: number, alphabet: string) => {
      let out = "";
      for (let i = 0; i < len; i++) {
        out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
      return out;
    };

    const a = preview.buildShadowUser("shoot123", NOW, 15, realRandom);
    const b = preview.buildShadowUser("shoot123", NOW, 15, realRandom);
    expect(a.id).not.toBe(b.id);
    expect(a.email).not.toBe(b.email);
    expect(a.password).not.toBe(b.password);
  });
});

describe("Erkennung des Vorschaumodus", () => {
  it("erkennt den Parameter", () => {
    expect(istVorschauUrl("?vorschau=1")).toBe(true);
    expect(istVorschauUrl("?a=b&vorschau=1")).toBe(true);
  });

  it("bleibt sonst aus", () => {
    expect(istVorschauUrl("")).toBe(false);
    expect(istVorschauUrl("?a=b")).toBe(false);
    expect(istVorschauUrl("?vorschauen=1")).toBe(false);
  });
});

describe("Vorschau ist schreibgeschützt", () => {
  const faelle: [string, string, boolean][] = [
    ["GET", "/api/collections/images/records", true],
    ["POST", "/api/collections/users/auth-refresh", true],
    ["POST", "/api/realtime", true],
    ["POST", "/api/collections/userSelection/records", false],
    ["PATCH", "/api/collections/users/records/abc", false],
    ["DELETE", "/api/collections/users/records/abc", false],
    ["POST", "/api/custom/stripe/create-checkout-session", false],
    ["POST", "/api/batch", false],
  ];

  it("Server und Browser wenden dieselbe Regel an", () => {
    for (const [method, path, lesend] of faelle) {
      expect(preview.istLesend(method, path), `${method} ${path}`).toBe(lesend);
      expect(istLesend(method, path), `${method} ${path}`).toBe(lesend);
    }
  });
});
