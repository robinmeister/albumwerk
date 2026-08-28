import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Wie tests/time.test.ts: der Hook-Helfer ist CommonJS und wird direkt
// eingebunden, damit Test und Server denselben Code benutzen.
const require = createRequire(import.meta.url);
const preview = require("../pb_hooks/lib/previewlib.js");

describe("Schattenkonto-Bauplan", () => {
  const NOW = Date.parse("2026-08-28T10:00:00.000Z");

  it("traegt genau die shootingIds der gezeigten Galerie", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(u.shootingIds).toEqual(["shoot123"]);
  });

  it("ist kein Admin und als Vorschau markiert", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(u.isAdmin).toBe(false);
    expect(u.isPreview).toBe(true);
  });

  it("bekommt eine nicht zustellbare Adresse", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    // .invalid ist per RFC 2606 reserviert und aufloest nie
    expect(u.email.endsWith(".invalid")).toBe(true);
  });

  it("vergibt bei jedem Aufruf eine andere Kennung und Adresse", () => {
    const a = preview.buildShadowUser("shoot123", NOW, 15);
    const b = preview.buildShadowUser("shoot123", NOW, 15);
    expect(a.id).not.toBe(b.id);
    expect(a.email).not.toBe(b.email);
    expect(a.password).not.toBe(b.password);
  });

  it("erzeugt eine ID im Format der users-Sammlung", () => {
    // die users-ID hat kein Autogenerate-Muster, deshalb 15 Zeichen a-z0-9
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(u.id).toMatch(/^[a-z0-9]{15}$/);
  });

  it("setzt den Ablauf ttlMinutes in die Zukunft", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(Date.parse(u.previewExpiresAt) - NOW).toBe(15 * 60 * 1000);
  });

  it("erkennt abgelaufen und noch gueltig", () => {
    const u = preview.buildShadowUser("shoot123", NOW, 15);
    expect(preview.isExpired(u.previewExpiresAt, NOW)).toBe(false);
    expect(preview.isExpired(u.previewExpiresAt, NOW + 14 * 60 * 1000)).toBe(false);
    expect(preview.isExpired(u.previewExpiresAt, NOW + 16 * 60 * 1000)).toBe(true);
  });

  it("behandelt einen leeren Ablauf als abgelaufen", () => {
    // ein Datensatz ohne previewExpiresAt darf nicht ewig leben
    expect(preview.isExpired("", NOW)).toBe(true);
    expect(preview.isExpired("kaputt", NOW)).toBe(true);
  });
});
