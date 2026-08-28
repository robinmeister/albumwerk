import { useCallback, useEffect, useRef, useState } from "react";

import { pb } from "../../config/pocketbase";

export interface PreviewSitzung {
  token: string;
  userId: string;
  expiresAt: string;
  spiegelt: { anzahl: number; name: string };
  /** Welche Galerie diese Sitzung spiegelt — erkennt einen Wechsel, waehrend die Vorschau offen ist. */
  fuerShooting: string;
}

/*
  Stellt eine Vorschau-Sitzung aus und raeumt sie wieder ab.

  Die Laufzeit haengt am Datensatz, nicht am Token: erst das Loeschen des
  Schattenkontos macht das Token wertlos. Deshalb wird hier in jedem Ausgang
  geloescht — beim Schliessen, beim Verlassen der Seite und beim Ablauf.
*/
export function usePreviewSession() {
  const [sitzung, setSitzung] = useState<PreviewSitzung | null>(null);
  const [fehler, setFehler] = useState<string>("");
  const laufendeId = useRef<string>("");
  // Deckt eine echte Race ab (beobachtet unter React.StrictMode in main.tsx):
  // der Aufrufer stoesst starten() an, solange `sitzung` noch null ist, weil
  // die erste Anfrage noch unterwegs ist — ohne diese Sperre entstuende ein
  // zweites Schattenkonto, das nur laufendeId.current ueberschreibt und beim
  // Schliessen nie geloescht wird.
  const anfrageLaeuft = useRef(false);

  const beenden = useCallback(async () => {
    const userId = laufendeId.current;
    laufendeId.current = "";
    setSitzung(null);
    if (!userId) return;
    try {
      await pb.send("/api/custom/preview/session", {
        method: "DELETE",
        body: { userId },
      });
    } catch (error) {
      // Der Sweep raeumt es spaetestens nach Ablauf ab.
      console.error("preview session cleanup failed", error);
    }
  }, []);

  const starten = useCallback(async (shootingId: string) => {
    if (anfrageLaeuft.current || laufendeId.current) return;
    anfrageLaeuft.current = true;
    setFehler("");
    try {
      const antwort = (await pb.send("/api/custom/preview/session", {
        method: "POST",
        body: { shootingId },
      })) as Omit<PreviewSitzung, "fuerShooting">;
      laufendeId.current = antwort.userId;
      setSitzung({ ...antwort, fuerShooting: shootingId });
    } catch (error) {
      console.error("preview session failed", error);
      setFehler("Vorschau konnte nicht gestartet werden.");
    } finally {
      anfrageLaeuft.current = false;
    }
  }, []);

  // Ein geschlossener Tab darf kein Konto zuruecklassen. sendBeacon waere
  // zuverlaessiger, kann aber keine Authorization-Kopfzeile setzen — deshalb
  // der beste Versuch hier, mit dem Sweep als Netz.
  useEffect(() => {
    const abbauen = () => {
      if (laufendeId.current) void beenden();
    };
    window.addEventListener("pagehide", abbauen);
    return () => {
      window.removeEventListener("pagehide", abbauen);
      abbauen();
    };
  }, [beenden]);

  return { sitzung, starten, beenden, fehler };
}
