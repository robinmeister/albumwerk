import { pb } from "../config/pocketbase";

// Frontend-Hälfte der Verkaufsbereitschaft. Die Bedingungen selbst stehen in
// pb_hooks/lib/verkaufslib.js — hier liegen nur Beschriftungen, Zielrouten und
// die Zahlen, die die Oberfläche anzeigt.

export type PunktKey =
  | "zahlung" | "katalog" | "recht" | "bestellmail"
  | "name" | "logo" | "kontaktmail" | "domain" | "wasserzeichen";

export interface Punkt {
  key: PunktKey;
  hart: boolean;
  erfuellt: boolean;
}

export interface Verkaufsbereitschaft {
  punkte: Punkt[];
  offeneHarte: PunktKey[];
  gesperrt: boolean;
  erledigt: number;
  gesamt: number;
}

export const PUNKT_TEXTE: Record<PunktKey, { label: string; ziel: string }> = {
  zahlung: { label: "Zahlungsanbieter aktiv", ziel: "/payments" },
  katalog: { label: "Preise oder Pakete angelegt", ziel: "/pricing" },
  recht: { label: "Impressum & Datenschutz hinterlegt", ziel: "/legal" },
  bestellmail: { label: "Bestell-E-Mail hinterlegt", ziel: "/kontakt" },
  name: { label: "Name des Geschäfts gesetzt", ziel: "/branding" },
  logo: { label: "Logo hochgeladen", ziel: "/branding" },
  kontaktmail: { label: "Kontakt-E-Mail hinterlegt", ziel: "/kontakt" },
  domain: { label: "Eigene Domain eingerichtet", ziel: "/domain" },
  wasserzeichen: { label: "Wasserzeichen eingerichtet", ziel: "/bilder" },
};

// Vor dem ersten Laden und nach einem Fehlschlag: NICHT gesperrt. Ein kurzes
// "Verkauf gesperrt" auf jeder Seite, das eine Sekunde später verschwindet,
// wäre schlimmer als ein Hinweis, der eine Sekunde zu spät kommt — und die
// echte Sperre sitzt ohnehin im Server.
export const VERKAUF_UNBEKANNT: Verkaufsbereitschaft = {
  punkte: [],
  offeneHarte: [],
  gesperrt: false,
  erledigt: 0,
  gesamt: 0,
};

export function ableiten(punkte: Punkt[]): Verkaufsbereitschaft {
  const offeneHarte = punkte.filter((p) => p.hart && !p.erfuellt).map((p) => p.key);
  return {
    punkte,
    offeneHarte,
    gesperrt: offeneHarte.length > 0,
    erledigt: punkte.filter((p) => p.erfuellt).length,
    gesamt: punkte.length,
  };
}

export async function fetchVerkauf(): Promise<Verkaufsbereitschaft> {
  // requestKey: null — StrictMode mountet zweimal, und das SDK würde die
  // erste, identische Anfrage abbrechen. Muster wie in utils/support.ts:165.
  const antwort = await pb.send("/api/custom/verkaufsbereitschaft", {
    method: "GET",
    requestKey: null,
  });
  return ableiten((antwort as { punkte?: Punkt[] }).punkte ?? []);
}
