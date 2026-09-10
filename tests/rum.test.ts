import { describe, expect, it } from "vitest";

import { saubereUrl } from "../src/utils/rum";

// Diese Funktion ist der einzige Schutz davor, dass gueltige Zugangslinks in
// der Logdatenbank landen. Faellt sie aus, faellt es sonst niemandem auf.
describe("saubereUrl", () => {
  it("wirft die Query weg, in der die Zugangsdaten stehen", () => {
    expect(saubereUrl("https://kunde.albumwerk.de/album?authToken=abc.def.ghi")).toBe(
      "https://kunde.albumwerk.de/album",
    );
    expect(saubereUrl("https://kunde.albumwerk.de/resetPassword?token=geheim")).toBe(
      "https://kunde.albumwerk.de/resetPassword",
    );
    expect(saubereUrl("https://kunde.albumwerk.de/__/auth/action?oobCode=xy&mode=z")).toBe(
      "https://kunde.albumwerk.de/__/auth/action",
    );
  });

  it("maskiert den Termin-Token, der im Pfad selbst steht", () => {
    expect(saubereUrl("https://kunde.albumwerk.de/termin/9evi9j6la5pcbck")).toBe(
      "https://kunde.albumwerk.de/termin/:token",
    );
    // Auch mit angehaengter Query, denn die Mail verlinkt beides.
    expect(saubereUrl("https://kunde.albumwerk.de/termin/9evi9j6la5pcbck?ab=1")).toBe(
      "https://kunde.albumwerk.de/termin/:token",
    );
  });

  it("entfernt das Fragment", () => {
    expect(saubereUrl("https://kunde.albumwerk.de/album#bild-4")).toBe(
      "https://kunde.albumwerk.de/album",
    );
  });

  it("laesst harmlose Pfade unveraendert", () => {
    expect(saubereUrl("https://kunde.albumwerk.de/publicAlbum/9evi9j6la5pcbck")).toBe(
      "https://kunde.albumwerk.de/publicAlbum/9evi9j6la5pcbck",
    );
    expect(saubereUrl("https://kunde.albumwerk.de/einrichtung")).toBe(
      "https://kunde.albumwerk.de/einrichtung",
    );
  });
});
