import { pb } from "../config/pocketbase";

// Einmaliger Aufpreis fuer die Einrichtung einer eigenen Domain bei verwalteten
// Instanzen. Steht hier und nicht doppelt im Text: Seite und Hilfe-Artikel
// muessen dieselbe Zahl nennen.
export const DOMAIN_AUFPREIS = "39 €";

// Betriebsart der Instanz — siehe pb_hooks/betrieb.pb.js.
export interface Betrieb {
  /** Vom Anbieter verwaltet (SaaS). Falsch heisst: selbst gehostet. */
  verwaltet: boolean;
  /** Host dieser Instanz, Ziel fuer den CNAME einer eigenen Domain. */
  instanz: string;
}

// Im Zweifel selbst gehostet: das ist der Fall, in dem die Oberflaeche das
// vollstaendige Domain-Formular zeigt. Eine unerreichbare Auskunft darf einem
// Selbsthoster nicht seine Einstellung wegnehmen.
export const BETRIEB_UNBEKANNT: Betrieb = { verwaltet: false, instanz: "" };

export async function fetchBetrieb(): Promise<Betrieb> {
  try {
    // requestKey: null — StrictMode montiert zweimal, und das SDK bricht die
    // erste, identische Anfrage sonst selbst ab.
    const antwort = await pb.send("/api/custom/betrieb", { method: "GET", requestKey: null });
    const daten = antwort as Partial<Betrieb>;
    return {
      verwaltet: Boolean(daten.verwaltet),
      instanz: String(daten.instanz ?? ""),
    };
  } catch {
    return BETRIEB_UNBEKANNT;
  }
}

// Meldet den Domain-Wunsch an die Control-Plane des Anbieters. Auf einer selbst
// gehosteten Instanz antwortet der Endpunkt mit 204 und es passiert nichts —
// dort gibt es niemanden zu fragen.
//
// Wirft bei Fehlern, damit der Aufrufer zwischen "gemeldet" und "nur als Ticket
// hinterlegt" unterscheiden kann.
export async function meldeDomainWunsch(domain: string): Promise<void> {
  await pb.send("/api/custom/domain/request", {
    method: "POST",
    body: { domain },
    requestKey: null,
  });
}
