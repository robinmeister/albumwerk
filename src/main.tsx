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
import "./index.css";

import { registerSW } from "virtual:pwa-register";

import App from "./App";
import { pb } from "./config/pocketbase";

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

adoptHandoffToken().finally(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
});
