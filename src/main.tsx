import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Suspense } from "react";

// Self-hosted fonts for the four selectable brand fonts (no external CDN).
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/600.css";
import "@fontsource/lora/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/familjen-grotesk/500.css";
import "@fontsource/familjen-grotesk/600.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/martian-mono/400.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/600.css";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

import App from "./App";
import { IST_VORSCHAU, pb } from "./config/pocketbase";

// Der Service Worker wird hier von Hand registriert statt vom PWA-Plugin in
// jede HTML-Datei injiziert (`injectRegister: null` in vite.config.ts).
// Grund: Seit es einen zweiten Einstiegspunkt für die eingebettete
// Terminbuchung gibt (embed/index.html), würde die automatische Injektion auch
// dort landen — und damit auf der Website fremder Fotograf:innen bei jedem
// Besucher einen Service Worker samt Precache installieren. Die Registrierung
// gehört ausschließlich in die App.
registerSW({ immediate: true });

// Direkteinstieg aus dem Self-Service-Signup: die Control-Plane übergibt ein
// kurzlebiges PocketBase-Token in der Adresszeile, damit der erste Login ohne
// Passwort und ohne zweite E-Mail auskommt (albumwerk-saas: control/pb_public/warten.html).
// Das Token wird sofort aus der URL entfernt, damit es nicht in Verlauf,
// Lesezeichen oder Referrer landet. Schlägt es fehl, startet die App ganz
// normal mit der Anmeldemaske.
async function adoptHandoffToken(): Promise<void> {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("authToken");
  if (!token) return;

  url.searchParams.delete("authToken");
  window.history.replaceState({}, "", url.toString());

  try {
    pb.authStore.save(token, null);
    await pb.collection("users").authRefresh();
  } catch {
    pb.authStore.clear();
  }
}

// Im Vorschaumodus kommt das Token per postMessage vom Elternfenster. Vorher
// zu rendern hiesse, unangemeldete Abfragen loszuschicken und ein falsches
// Bild zu zeigen — deshalb wird das Rendern bis dahin zurueckgehalten.
async function mitVorschauToken(rendern: () => void): Promise<void> {
  if (!IST_VORSCHAU) {
    rendern();
    return;
  }
  const hoeren = (ev: MessageEvent) => {
    if (ev.origin !== window.location.origin) return;
    if (ev.data?.typ !== "vorschau-token") return;
    window.removeEventListener("message", hoeren);
    // Genau das Muster, das adoptHandoffToken() weiter oben in dieser Datei
    // schon benutzt: save() legt nur das Token ab, erst authRefresh() laedt
    // den Datensatz nach. Ohne den zweiten Schritt bliebe authStore.model
    // leer und currentUser() (src/config/currentUser.ts) gaebe null zurueck —
    // AlbumPage zeigte dann eine leere Seite statt der Kundenansicht.
    pb.authStore.save(ev.data.token, null);
    pb.collection("users").authRefresh()
      .catch(() => pb.authStore.clear())
      .finally(rendern);
  };
  window.addEventListener("message", hoeren);
  window.parent?.postMessage({ typ: "vorschau-bereit" }, window.location.origin);
  // Die Link-Ansicht braucht kein Token — kommt keins, wird trotzdem
  // gerendert, dann eben anonym.
  window.setTimeout(() => {
    window.removeEventListener("message", hoeren);
    rendern();
  }, 1500);
}

adoptHandoffToken().finally(() => {
  void mitVorschauToken(() => {
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </React.StrictMode>
    );
  });
});
