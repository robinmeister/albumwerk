import { pb } from "../config/pocketbase";

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
