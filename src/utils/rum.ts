// Real User Monitoring über Grafana Faro.
//
// Ergänzt src/utils/errorReport.ts, ersetzt es nicht: der Ringpuffer dort ist
// das, was ein Mensch an ein Support-Ticket hängt, Faro das, was ohne
// Zutun ankommt. Ein Fehler, den niemand meldet, war bisher unsichtbar.
//
// Empfänger ist die eigene Alloy-Instanz auf albumwerk-server, nicht ein
// fremder Dienst — die Daten verlassen das eigene Netz nicht. Deshalb steht
// hier auch kein API-Schlüssel: die Adresse kommt von der Instanz selbst
// (pb_hooks/betrieb.pb.js), und selbst gehostete Instanzen bekommen keine und
// senden folglich nichts.

import { APP_VERSION } from "./errorReport";

// Der Termin-Link ist der einzige Pfad, der selbst ein Geheimnis trägt: wer
// ihn hat, kann den Termin verschieben oder absagen.
const TERMIN_TOKEN = /\/termin\/[^/]+/;

/**
 * Entfernt aus einer URL alles, was ein Zugang ist.
 *
 * Query und Fragment fallen vollständig weg. Dort stehen die Zugangsdaten:
 * `?authToken=` aus dem Self-Service-Sprung, `?token=` aus Passwort-Reset und
 * E-Mail-Bestätigung, dazu die Parameter von `/__/auth/action`. Kein Feld
 * davon hilft bei der Fehlersuche genug, um zu rechtfertigen, dass gültige
 * Zugangslinks in der Logdatenbank landen.
 */
export function saubereUrl(roh: string): string {
  const schnitt = roh.search(/[?#]/);
  const pfad = schnitt === -1 ? roh : roh.slice(0, schnitt);
  return pfad.replace(TERMIN_TOKEN, "/termin/:token");
}

let gestartet = false;

/**
 * Startet Faro. Mehrfachaufrufe sind wirkungslos, Fehler bleiben folgenlos:
 * eine Überwachung, die die überwachte App mitreisst, ist ihr Geld nicht wert.
 *
 * @param url      Sammelpunkt, aus `/api/custom/betrieb`.
 * @param instanz  Host dieser Instanz, dient in Grafana als Unterscheidung
 *                 zwischen den Kundeninstanzen.
 */
export async function starteRum(url: string, instanz: string): Promise<void> {
  if (gestartet || !url) return;
  gestartet = true;

  try {
    // Dynamisch geladen, damit das SDK nicht im Hauptbündel liegt. Es wird auf
    // selbst gehosteten Instanzen nie gebraucht, und der Galerie-Besuch einer
    // Hochzeitsgesellschaft soll dafür nichts zahlen.
    const { initializeFaro, getWebInstrumentations } = await import("@grafana/faro-web-sdk");

    initializeFaro({
      url,
      app: {
        name: "albumwerk",
        version: APP_VERSION,
        environment: instanz || "unbekannt",
      },
      instrumentations: getWebInstrumentations({
        // Konsolenrauschen bleibt draussen. Echte Ausnahmen kommen ohnehin
        // über die Fehler-Instrumentierung; alles andere flutet nur Loki.
        captureConsole: false,
        // Resource-Timings enthalten die Bild-URLs, und die tragen bei
        // geschützten Dateien einen PocketBase-Token. Web Vitals kommen
        // aus einer eigenen Instrumentierung und bleiben erhalten.
        enablePerformanceInstrumentation: false,
      }),
      // sessionStorage statt localStorage, aus demselben Grund wie in
      // errorReport.ts: auf einem geteilten Gerät darf nichts liegen bleiben.
      sessionTracking: { enabled: true, persistent: false },
      beforeSend: (item) => {
        if (item.meta.page?.url) {
          item.meta.page.url = saubereUrl(item.meta.page.url);
        }
        if (item.meta.view?.name) {
          item.meta.view.name = saubereUrl(item.meta.view.name);
        }
        return item;
      },
    });
  } catch {
    // RUM ist Beiwerk. Fällt der Sammelpunkt aus oder blockt ein Adblocker,
    // läuft die App unverändert weiter.
  }
}
