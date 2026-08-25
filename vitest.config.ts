import { defineConfig } from 'vitest/config'

// Unit-Tests für die reine Rechenlogik unter pb_hooks/lib (Verfügbarkeits-
// rechner, später der ICS-Parser). Bewusst NICHT über vite.config.ts, weil
// diese Module nichts mit dem Browser-Build zu tun haben — kein StyleX, kein
// React, kein PWA-Plugin.
//
// Warum überhaupt eine zweite Testschicht neben Playwright: E2E deckt vom
// Rechner nur den Hauptpfad ab. Die teuren Fehler liegen in den Randfällen
// (Sommerzeitumstellung, Fenster über Mitternacht, überlappende Ausnahmen) und
// führen zu Doppelbuchungen, die erst auffallen, wenn zwei Kund:innen
// gleichzeitig vor der Tür stehen.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
