// Unter-Navigation des Termin-Bereichs.
//
// Der Entwurf (§11.1) sah eine Gruppe „Termine“ in der Seitenleiste vor. Die
// Seitenleiste (components/layout/AppShell.tsx) kennt aber nur flache
// Einträge, und vier weitere davon würden das Menü sprengen. Deshalb hier
// die kleinere Lösung: EIN Eintrag „Termine“ in der Seitenleiste, darunter
// Reiter für die drei Bereiche. Das trennt zugleich sauber, was täglich
// gebraucht wird (Kalender) von dem, was dreimal im Jahr angefasst wird
// (Arten, Verfügbarkeit).

import { ReactElement } from "react";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
  { value: "/appointments", label: "Kalender" },
  { value: "/appointments/types", label: "Termin-Arten" },
  { value: "/appointments/availability", label: "Verfügbarkeit" },
  { value: "/appointments/embed", label: "Einbetten" },
];

export default function AppointmentsTabs(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();

  // Der längste passende Pfad gewinnt, damit /appointments nicht auch für
  // /appointments/types als aktiv gilt.
  const active = TABS.map((tab) => tab.value)
    .filter((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0] ?? TABS[0].value;

  return (
    <TabList value={active} onChange={(value) => navigate(value)} hasDivider>
      {TABS.map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} />
      ))}
    </TabList>
  );
}
