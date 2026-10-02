import { ComponentType } from "react";
import { CalendarClock, CircleHelp as HelpIcon, Download, Globe, Image, Image as ImageIcon, ListChecks, Mail, Palette, Printer, Scale, Wallet as Payments, Users as People, User as Person, Tag as PriceChange, ReceiptText as ReceiptLong, Headset as SupportAgent } from "lucide-react";

// Single source for navigation: Header (desktop), TabBar (mobile) and the
// user menu all render from these arrays — labels are no longer coupled to
// routing via switch statements.
export interface NavItem {
  key: string;
  label: string;
  path: string;
  exact?: boolean;
  Icon: ComponentType;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export const userNavItems: NavItem[] = [
  { key: "album", label: "Album", path: "/album", exact: true, Icon: Image },
  { key: "downloads", label: "Downloads", path: "/downloads", Icon: Download },
  { key: "prints", label: "Drucke", path: "/prints", Icon: Printer },
];

// Ungruppiert und immer sichtbar: der Alltag.
export const adminNavItems: NavItem[] = [
  { key: "album", label: "Album", path: "/album", exact: true, Icon: Image },
];

export const adminNavGroups: NavGroup[] = [
  {
    key: "verkauf",
    label: "Verkauf",
    items: [
      { key: "pricing", label: "Preise", path: "/pricing", Icon: PriceChange },
      { key: "orders", label: "Bestellungen", path: "/orders", Icon: ReceiptLong },
      { key: "print", label: "Druckaufträge", path: "/print", Icon: Printer },
      { key: "payments", label: "Zahlungen", path: "/payments", Icon: Payments },
    ],
  },
  {
    key: "kunden",
    label: "Kunden",
    items: [
      { key: "users", label: "Nutzer", path: "/users", Icon: People },
      // Ein einziger Eintrag für den ganzen Termin-Bereich; die Unterseiten
      // (Arten, Verfügbarkeit) hängen als Reiter darunter — siehe
      // AppointmentsTabs.tsx.
      { key: "appointments", label: "Termine", path: "/appointments", Icon: CalendarClock },
      { key: "support", label: "Support", path: "/support", Icon: SupportAgent },
    ],
  },
  {
    key: "einstellungen",
    label: "Einstellungen",
    items: [
      { key: "einrichtung", label: "Einrichtung", path: "/einrichtung", Icon: ListChecks },
      { key: "branding", label: "Branding", path: "/branding", Icon: Palette },
      { key: "domain", label: "Domain", path: "/domain", Icon: Globe },
      { key: "kontakt", label: "Kontakt & E-Mails", path: "/kontakt", Icon: Mail },
      { key: "bilder", label: "Bilder & Wasserzeichen", path: "/bilder", Icon: ImageIcon },
      { key: "legal", label: "Rechtliches", path: "/legal", Icon: Scale },
    ],
  },
];

// user menu (avatar/settings menu in the header); "logout" is handled
// specially by the consumer
export const userMenuItems: NavItem[] = [
  { key: "profile", label: "Profil", path: "/profile", Icon: Person },
  { key: "help", label: "Hilfe", path: "/help", Icon: HelpIcon },
  { key: "support", label: "Support", path: "/support", Icon: SupportAgent },
];

export const adminMenuItems: NavItem[] = [
  { key: "profile", label: "Profil", path: "/profile", Icon: Person },
  { key: "help", label: "Hilfe", path: "/help", Icon: HelpIcon },
];

// Ziel eines abgefangenen Deep-Links (?next=) nach dem Login. Nur eigene
// Pfade: "//fremde.example" ist protokoll-relativ und fuehrt aus der App
// heraus, "https://..." erst recht — beides waere eine offene Weiterleitung,
// und der Link steht in einer Mail, die jeder verschicken kann.
export function sicheresZiel(wert: string | null | undefined): string | null {
  if (!wert || !wert.startsWith("/") || wert.startsWith("//")) return null;
  // Ein "\\" wird von manchen Browsern wie "/" gelesen.
  if (wert.startsWith("/\\")) return null;
  return wert;
}
