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

// Der Service Worker wird hier von Hand registriert statt vom PWA-Plugin in
// jede HTML-Datei injiziert (`injectRegister: null` in vite.config.ts).
// Grund: Seit es einen zweiten Einstiegspunkt für die eingebettete
// Terminbuchung gibt (embed/index.html), würde die automatische Injektion auch
// dort landen — und damit auf der Website fremder Fotograf:innen bei jedem
// Besucher einen Service Worker samt Precache installieren. Die Registrierung
// gehört ausschließlich in die App.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </React.StrictMode>
);
