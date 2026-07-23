import { ComponentType } from "react";
import { Download, Image, Palette, Scale, Wallet as Payments, Users as People, User as Person, Tag as PriceChange, ReceiptText as ReceiptLong, Headset as SupportAgent } from "lucide-react";

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

export const userNavItems: NavItem[] = [
  { key: "album", label: "Album", path: "/album", exact: true, Icon: Image },
  { key: "downloads", label: "Downloads", path: "/downloads", Icon: Download },
];

export const adminNavItems: NavItem[] = [
  { key: "album", label: "Album", path: "/album", exact: true, Icon: Image },
  { key: "pricing", label: "Preise", path: "/pricing", Icon: PriceChange },
  { key: "orders", label: "Bestellungen", path: "/orders", Icon: ReceiptLong },
  { key: "users", label: "Nutzer", path: "/users", Icon: People },
  { key: "payments", label: "Zahlungen", path: "/payments", Icon: Payments },
  { key: "branding", label: "Branding", path: "/branding", Icon: Palette },
  { key: "legal", label: "Rechtliches", path: "/legal", Icon: Scale },
];

// user menu (avatar/settings menu in the header); "logout" is handled
// specially by the consumer
export const userMenuItems: NavItem[] = [
  { key: "profile", label: "Profil", path: "/profile", Icon: Person },
  { key: "support", label: "Support", path: "/support", Icon: SupportAgent },
];

export const adminMenuItems: NavItem[] = [
  { key: "profile", label: "Profil", path: "/profile", Icon: Person },
];
