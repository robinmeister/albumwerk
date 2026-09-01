import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { ableiten, type Punkt } from "../src/utils/verkauf";

// Wie tests/previewSession.test.ts: der Hook-Helfer ist CommonJS und wird
// direkt eingebunden, damit Test und Server denselben Code benutzen.
const require = createRequire(import.meta.url);
const verkauf = require("../pb_hooks/lib/verkaufslib.js");

// Eine Instanz, bei der alles eingerichtet ist. Jeder Test nimmt genau eine
// Bedingung weg — so steht in der Fehlermeldung immer, welche gemeint war.
const VOLLSTAENDIG = {
  paypalEnabled: true,
  stripeEnabled: false,
  katalogGefuellt: true,
  imprintHtml: "<p>Impressum</p>",
  privacyHtml: "<p>Datenschutz</p>",
  orderNotificationEmail: "bestellungen@example.test",
  businessName: "Atelier Lichtblick",
  logo: "logo.png",
  contactEmail: "hallo@example.test",
  customDomain: "fotos.example.test",
  watermarkText: "© Atelier",
  watermarkLogo: "",
};

const punktMit = (werte: Record<string, unknown>, key: string) =>
  verkauf.pruefeVerkaufsbereitschaft(werte).find((p: any) => p.key === key);

describe("Verkaufsbereitschaft — harte Punkte", () => {
  it("ist bei vollstaendiger Einrichtung nicht gesperrt", () => {
    const punkte = verkauf.pruefeVerkaufsbereitschaft(VOLLSTAENDIG);
    expect(verkauf.offeneHarte(punkte)).toEqual([]);
  });

  it("zaehlt zahlung als erfuellt, wenn nur Stripe aktiv ist", () => {
    const werte = { ...VOLLSTAENDIG, paypalEnabled: false, stripeEnabled: true };
    expect(punktMit(werte, "zahlung").erfuellt).toBe(true);
  });

  it("sperrt, wenn kein Zahlungsanbieter aktiv ist", () => {
    const werte = { ...VOLLSTAENDIG, paypalEnabled: false, stripeEnabled: false };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte))).toEqual(["zahlung"]);
  });

  it("sperrt bei leerem Katalog", () => {
    const werte = { ...VOLLSTAENDIG, katalogGefuellt: false };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte))).toEqual(["katalog"]);
  });

  it("verlangt beide Rechtstexte, nicht nur einen", () => {
    expect(punktMit({ ...VOLLSTAENDIG, privacyHtml: "" }, "recht").erfuellt).toBe(false);
    expect(punktMit({ ...VOLLSTAENDIG, imprintHtml: "" }, "recht").erfuellt).toBe(false);
  });

  it("wertet reinen Leerraum nicht als Rechtstext", () => {
    expect(punktMit({ ...VOLLSTAENDIG, imprintHtml: "   \n  " }, "recht").erfuellt).toBe(false);
  });

  it("sperrt ohne Bestell-Benachrichtigungsadresse", () => {
    const werte = { ...VOLLSTAENDIG, orderNotificationEmail: "" };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte))).toEqual(["bestellmail"]);
  });

  it("meldet mehrere offene Punkte in fester Reihenfolge", () => {
    const werte = { ...VOLLSTAENDIG, paypalEnabled: false, imprintHtml: "", orderNotificationEmail: "" };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte)))
      .toEqual(["zahlung", "recht", "bestellmail"]);
  });

  it("sperrt eine voellig leere Instanz mit allen vier harten Punkten", () => {
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft({})))
      .toEqual(["zahlung", "katalog", "recht", "bestellmail"]);
  });
});

describe("Verkaufsbereitschaft — weiche Punkte", () => {
  it("liefert neun Punkte, vier davon hart", () => {
    const punkte = verkauf.pruefeVerkaufsbereitschaft(VOLLSTAENDIG);
    expect(punkte).toHaveLength(9);
    expect(punkte.filter((p: any) => p.hart)).toHaveLength(4);
  });

  it("sperrt nie wegen eines weichen Punktes", () => {
    const werte = {
      ...VOLLSTAENDIG,
      businessName: "", logo: "", contactEmail: "",
      customDomain: "", watermarkText: "", watermarkLogo: "",
    };
    expect(verkauf.offeneHarte(verkauf.pruefeVerkaufsbereitschaft(werte))).toEqual([]);
  });

  it("zaehlt den unveraenderten Vorgabenamen nicht als gesetzt", () => {
    expect(punktMit({ ...VOLLSTAENDIG, businessName: "Fotogalerie" }, "name").erfuellt).toBe(false);
  });

  it("akzeptiert ein Wasserzeichen-Logo statt eines Textes", () => {
    const werte = { ...VOLLSTAENDIG, watermarkText: "", watermarkLogo: "wm.png" };
    expect(punktMit(werte, "wasserzeichen").erfuellt).toBe(true);
  });
});

describe("Verkaufsbereitschaft — Ableitung fuer die Oberflaeche", () => {
  const punkte = (overrides: Partial<Record<string, boolean>> = {}): Punkt[] =>
    verkauf.pruefeVerkaufsbereitschaft({ ...VOLLSTAENDIG, ...overrides });

  it("zaehlt nur harte Punkte in offeneHarte", () => {
    const abgeleitet = ableiten(punkte({ logo: "", customDomain: "" }));
    expect(abgeleitet.offeneHarte).toEqual([]);
    expect(abgeleitet.gesperrt).toBe(false);
  });

  it("ist gesperrt, sobald ein harter Punkt offen ist", () => {
    const abgeleitet = ableiten(punkte({ paypalEnabled: false, stripeEnabled: false }));
    expect(abgeleitet.gesperrt).toBe(true);
    expect(abgeleitet.offeneHarte).toEqual(["zahlung"]);
  });

  it("zaehlt fuer den Balken alle Punkte, auch die weichen", () => {
    const abgeleitet = ableiten(punkte({ logo: "", customDomain: "" }));
    expect(abgeleitet.gesamt).toBe(9);
    expect(abgeleitet.erledigt).toBe(7);
  });

  it("meldet eine leere Antwort als nicht gesperrt", () => {
    // Der Endpunkt war nicht erreichbar. Eine Sperre zu behaupten, die
    // niemand geprueft hat, waere schlimmer als sie zu verpassen.
    const abgeleitet = ableiten([]);
    expect(abgeleitet.gesperrt).toBe(false);
    expect(abgeleitet.gesamt).toBe(0);
  });
});
