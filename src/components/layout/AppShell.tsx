import { ReactElement, useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { LogOut as Logout, Menu as MenuIcon } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { pb } from "../../config/pocketbase";
import { settingsFileUrl } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import { NavGroup, NavItem } from "../../utils/routes";
import StorageMeter from "./StorageMeter";

export const SIDEBAR_WIDTH = 240;

// Content max-widths: admins get wide tables (xl), customers the tighter
// reading width (lg). Mirrors MUI's old Container breakpoints.
const CONTENT_MAX_WIDTH = { lg: 1200, xl: 1536 } as const;

type Props = {
  navItems: NavItem[];
  navGroups?: NavGroup[];
  menuItems: NavItem[];
  maxWidth: "lg" | "xl";
};

function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? item.path === pathname : pathname.startsWith(item.path);
}

const GRUPPEN_KEY = "sidebar_groups_v1";

// Zugeklappte Gruppen, nicht offene: eine unbekannte Gruppe ist damit offen.
function leseZugeklappt(): string[] {
  try {
    const raw = window.localStorage.getItem(GRUPPEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    // private mode / kaputter Wert — eine offene Gruppe ist harmlos
    return [];
  }
}

const DESKTOP = "@media (min-width: 900px)";

const s = stylex.create({
  root: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "var(--color-background-body)",
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--color-background-surface)",
  },
  sidebarDesktop: {
    display: { default: "none", [DESKTOP]: "flex" },
    position: "sticky",
    top: 0,
    height: "100vh",
    flexShrink: 0,
    borderRight: "1px solid var(--color-border)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    padding: "20px",
    background: "none",
    border: "none",
    textAlign: "left",
    width: "100%",
    color: "inherit",
  },
  logo: { height: 32, width: 32, objectFit: "contain" },
  navList: { display: "flex", flexDirection: "column", gap: 4, padding: "0 12px" },
  gruppe: { display: "flex", flexDirection: "column" },
  gruppeKopf: {
    cursor: "pointer",
    padding: "10px 12px",
  },
  navListBottom: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "8px 12px",
    borderTop: "1px solid var(--color-border)",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "10px 12px",
    borderRadius: "var(--radius-element)",
    border: "none",
    background: {
      default: "none",
      ":hover": "var(--color-overlay-hover)",
    },
    color: "var(--color-text-primary)",
    cursor: "pointer",
    font: "inherit",
    textAlign: "left",
  },
  navItemActive: {
    backgroundColor: "var(--color-background-muted)",
    color: "var(--color-text-accent)",
  },
  navIcon: {
    display: "inline-flex",
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    marginInlineStart: "auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 20,
    padding: "0 6px",
    borderRadius: "var(--radius-full)",
    backgroundColor: "var(--color-background-muted)",
  },
  spacer: { flexGrow: 1 },
  footer: {
    padding: "12px 20px",
    borderTop: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  // Die Trenner lagen als "·" im Textfluss — beim Umbruch stand die zweite
  // Zeile dann mit einem führenden Mittelpunkt da. Jetzt trennt der Abstand.
  footerLinks: { display: "flex", flexWrap: "wrap", columnGap: 12, rowGap: 2 },
  footerLink: { color: "inherit", textDecoration: "none" },
  main: {
    flexGrow: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  topbar: {
    display: { default: "flex", [DESKTOP]: "none" },
    position: "sticky",
    top: 0,
    zIndex: 10,
    alignItems: "center",
    gap: 8,
    minHeight: 56,
    padding: "0 12px",
    backgroundColor: "var(--color-background-surface)",
    borderBottom: "1px solid var(--color-border)",
    backdropFilter: "blur(12px)",
  },
  iconButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    border: "none",
    borderRadius: "var(--radius-full)",
    background: { default: "none", ":hover": "var(--color-overlay-hover)" },
    color: "inherit",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    width: "100%",
    margin: "0 auto",
    padding: "16px",
  },
  // mobile overlay drawer
  backdrop: {
    display: { default: "block", [DESKTOP]: "none" },
    position: "fixed",
    inset: 0,
    zIndex: 20,
    backgroundColor: "var(--color-overlay)",
  },
  drawer: {
    position: "fixed",
    insetBlock: 0,
    left: 0,
    zIndex: 21,
    display: { default: "flex", [DESKTOP]: "none" },
    flexDirection: "column",
    width: SIDEBAR_WIDTH,
    backgroundColor: "var(--color-background-surface)",
    boxShadow: "var(--shadow-overlay, 0 8px 32px rgba(0,0,0,0.24))",
  },
});

// App shell for all signed-in users: permanent sidebar on desktop, overlay
// drawer + slim top bar with hamburger on mobile.
export default function AppShell(props: Props): ReactElement {
  const { navItems, navGroups, menuItems, maxWidth } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [zugeklappt, setZugeklappt] = useState<string[]>(leseZugeklappt);
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, verkauf } = useSettings();

  const logoUrl = settingsFileUrl(settings, "logo");
  const groupedItems = navGroups?.flatMap((gruppe) => gruppe.items) ?? [];
  const allItems = [...navItems, ...groupedItems, ...menuItems];
  const sectionLabel =
    allItems.find((item) => isActive(item, location.pathname))?.label ??
    settings.businessName;

  const go = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const handleSignOut = () => {
    pb.authStore.clear();
    navigate("/login");
  };

  const merkeGruppe = (key: string, zu: boolean) => {
    setZugeklappt((bisher) => {
      const naechste = zu ? [...bisher, key] : bisher.filter((k) => k !== key);
      try {
        window.localStorage.setItem(GRUPPEN_KEY, JSON.stringify(naechste));
      } catch {
        // private mode / voller Speicher — der Zustand bleibt trotzdem im State
      }
      return naechste;
    });
  };

  const navButton = (item: NavItem) => (
    <button
      key={item.key}
      onClick={() => go(item.path)}
      {...stylex.props(
        s.navItem,
        isActive(item, location.pathname) && s.navItemActive,
      )}
    >
      <span {...stylex.props(s.navIcon)}>
        <item.Icon />
      </span>
      <Text type="body" weight="medium">
        {item.label}
      </Text>
      {/* Einziger Eintrag mit Zähler — ein `badge`-Feld an NavItem wäre eine
          Schnittstelle für genau einen Fall. */}
      {item.key === "einrichtung" && verkauf.offeneHarte.length > 0 && (
        <span
          {...stylex.props(s.badge)}
          data-testid="einrichtung-badge"
          aria-label={
            verkauf.offeneHarte.length === 1
              ? "1 offener Punkt bis zum Verkauf"
              : `${verkauf.offeneHarte.length} offene Punkte bis zum Verkauf`
          }
        >
          <Text type="supporting" weight="semibold">{verkauf.offeneHarte.length}</Text>
        </span>
      )}
    </button>
  );

  const sidebarContent = (
    <>
      <button onClick={() => go("/album")} {...stylex.props(s.brand)}>
        {logoUrl && (
          <img src={logoUrl} alt={settings.businessName} {...stylex.props(s.logo)} />
        )}
        <Text type="label" weight="semibold">
          {settings.businessName}
        </Text>
      </button>

      <nav {...stylex.props(s.navList)}>{navItems.map(navButton)}</nav>

      {navGroups?.map((gruppe) => {
        // Eine zugeklappte Gruppe, in der man gerade steht, wäre
        // Orientierungsverlust — die aktive Gruppe ist deshalb immer offen.
        const enthaeltAktive = gruppe.items.some((item) => isActive(item, location.pathname));
        return (
          <details
            key={gruppe.key}
            open={enthaeltAktive || !zugeklappt.includes(gruppe.key)}
            onToggle={(e) => merkeGruppe(gruppe.key, !(e.currentTarget as HTMLDetailsElement).open)}
            {...stylex.props(s.gruppe)}
          >
            <summary {...stylex.props(s.gruppeKopf)}>
              <Text type="supporting" weight="semibold" color="secondary">{gruppe.label}</Text>
            </summary>
            <nav {...stylex.props(s.navList)}>{gruppe.items.map(navButton)}</nav>
          </details>
        );
      })}

      <div {...stylex.props(s.spacer)} />

      <nav {...stylex.props(s.navListBottom)}>
        {menuItems.map(navButton)}
        <button onClick={handleSignOut} {...stylex.props(s.navItem)}>
          <span {...stylex.props(s.navIcon)}>
            <Logout />
          </span>
          <Text type="body" weight="medium">
            Ausloggen
          </Text>
        </button>
      </nav>

      <StorageMeter />

      <div {...stylex.props(s.footer)}>
        <Text type="supporting" color="secondary">
          © {new Date().getFullYear()} {settings.businessName}
        </Text>
        <nav {...stylex.props(s.footerLinks)}>
          {[
            { to: "/imprint", label: "Impressum" },
            { to: "/privacy", label: "Datenschutz" },
            { to: "/help", label: "Hilfe" },
          ].map((item) => (
            <Link key={item.to} to={item.to} {...stylex.props(s.footerLink)}>
              <Text type="supporting" color="secondary">
                {item.label}
              </Text>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );

  return (
    <div {...stylex.props(s.root)}>
      {/* desktop: permanent sidebar */}
      <aside {...stylex.props(s.sidebar, s.sidebarDesktop)}>{sidebarContent}</aside>

      {/* mobile: overlay drawer */}
      {mobileOpen && (
        <>
          <div
            {...stylex.props(s.backdrop)}
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside {...stylex.props(s.drawer)}>{sidebarContent}</aside>
        </>
      )}

      <div {...stylex.props(s.main)}>
        {/* mobile-only top bar; on desktop the page header carries the title */}
        <header {...stylex.props(s.topbar)}>
          <button
            aria-label="Menü öffnen"
            onClick={() => setMobileOpen(true)}
            {...stylex.props(s.iconButton)}
          >
            <MenuIcon />
          </button>
          <Text type="label" weight="semibold">
            {sectionLabel}
          </Text>
        </header>

        <main
          {...stylex.props(s.content)}
          style={{ maxWidth: CONTENT_MAX_WIDTH[maxWidth] }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
