// Ordered categories for the help index. Same shape/idea as the nav arrays in
// src/utils/routes.ts: one place defines label + icon, every consumer renders
// from here.

import {
  BookOpen,
  Image,
  LifeBuoy,
  Server,
  Settings,
  Tag as PriceChange,
} from "lucide-react";

import { HelpCategory } from "./types";

export const helpCategories: HelpCategory[] = [
  {
    key: "basics",
    label: "Erste Schritte",
    description: "Wie albumwerk funktioniert und wie du an deine Bilder kommst.",
    Icon: BookOpen,
  },
  {
    key: "setup",
    label: "Einrichtung",
    description: "Branding, Domain, Zahlungen und Rechtstexte einrichten.",
    Icon: Settings,
  },
  {
    key: "albums",
    label: "Alben & Bilder",
    description: "Alben anlegen, Bilder hochladen, teilen und freigeben.",
    Icon: Image,
  },
  {
    key: "selling",
    label: "Verkauf & Zahlungen",
    description: "Preise, Pakete, Bestellungen und Auszahlungen.",
    Icon: PriceChange,
  },
  {
    key: "customers",
    label: "Kunden & Konten",
    description: "Nutzerkonten, Zugänge und Support-Anfragen.",
    Icon: LifeBuoy,
  },
  {
    key: "operations",
    label: "Betrieb & Wartung",
    description: "Backups, Updates und der laufende Betrieb deiner Instanz.",
    Icon: Server,
  },
];

export const helpCategoryKeys = helpCategories.map((c) => c.key);

export function getCategory(key: string): HelpCategory | undefined {
  return helpCategories.find((c) => c.key === key);
}
