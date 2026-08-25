import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import BookingFlow from "../features/Booking/BookingFlow";
import { reportHeight } from "./height";

// Einstiegspunkt der eingebetteten Terminbuchung (docs/terminbuchung.md §9.1).
//
// ===================== BINDENDE EINSCHRÄNKUNGEN =====================
//
// Dieses Bundle läuft im iframe auf der Website fremder Fotograf:innen. Was
// hier hereinkommt, wird bei jedem Besucher dieser Website geladen.
//
//   1. KEINE Imports aus dem App-Kontext. Kein AuthContext, kein
//      react-router-dom, kein SettingsProvider, kein react-toastify, kein
//      TipTap, kein Astryx. Ein einziges `import { useSettings } from
//      "../context/..."` zieht die halbe App mit herein und macht den eigenen
//      Einstiegspunkt sinnlos. Die gemeinsam genutzten Bausteine liegen in
//      src/features/Booking/ und halten sich an dieselbe Regel.
//
//   2. KEINE Cookies, kein localStorage, kein sessionStorage. Damit gilt für
//      die Fotograf:in: kein Eintrag im Cookie-Banner nötig — ein
//      Verkaufsargument gegenüber Calendly, aber nur solange es stimmt.
//
//   3. KEINE externen Ressourcen. Keine Google Fonts, kein Captcha, kein
//      Analytics. Passt weder zur Positionierung noch zur DSGVO-Zusage.
//
// Verstöße fallen nicht sofort auf — sie zeigen sich erst als gewachsenes
// Bundle oder als unangenehme Rückfrage einer Kundin.

function readPreselectedType(): string | undefined {
  try {
    const value = new URLSearchParams(window.location.search).get("type");
    return value ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

function Embed() {
  const container = useRef<HTMLDivElement>(null);

  // Meldet die Inhaltshöhe an das Loader-Script auf der Website der
  // Fotograf:in (public/embed.js). Ohne das entsteht beim Wechsel von der
  // Terminauswahl zum Formular ein Scrollbalken *innerhalb* des Rahmens.
  useEffect(() => {
    if (!container.current) return undefined;
    return reportHeight(container.current);
  }, []);

  return (
    <div ref={container}>
      <BookingFlow preselectedType={readPreselectedType()} />
    </div>
  );
}

createRoot(document.getElementById("booking") as HTMLElement).render(
  <StrictMode>
    <Embed />
  </StrictMode>,
);
