import { ReactElement, useState } from "react";
import {
  AppBar,
  Box,
  Container,
  Divider,
  Drawer,
  IconButton,
  Link as MuiLink,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { Logout, Menu as MenuIcon } from "@mui/icons-material";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { pb } from "../../config/pocketbase";
import { settingsFileUrl } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import { NavItem } from "../../utils/routes";

export const SIDEBAR_WIDTH = 240;

type Props = {
  navItems: NavItem[];
  menuItems: NavItem[];
  // admins get wide tables (xl), customers the tighter reading width (lg)
  maxWidth: "lg" | "xl";
};

function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? item.path === pathname : pathname.startsWith(item.path);
}

// App shell for all signed-in users: permanent sidebar on desktop, overlay
// drawer + slim top bar with hamburger on mobile.
export default function AppShell(props: Props): ReactElement {
  const { navItems, menuItems, maxWidth } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const logoUrl = settingsFileUrl(settings, "logo");
  const allItems = [...navItems, ...menuItems];
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

  const sidebar = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        onClick={() => go("/album")}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
          px: 2.5,
          py: 2.5,
        }}
      >
        {logoUrl && (
          <img
            src={logoUrl}
            alt={settings.businessName}
            style={{ height: 32, width: 32, objectFit: "contain" }}
          />
        )}
        <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
          {settings.businessName}
        </Typography>
      </Box>

      <List sx={{ px: 1.5 }}>
        {navItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              selected={isActive(item, location.pathname)}
              onClick={() => go(item.path)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <item.Icon />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Divider />
      <List sx={{ px: 1.5, py: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              selected={isActive(item, location.pathname)}
              onClick={() => go(item.path)}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <item.Icon />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleSignOut} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Ausloggen" />
          </ListItemButton>
        </ListItem>
      </List>

      <Divider />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 2.5, py: 1.5 }}
      >
        © {new Date().getFullYear()} {settings.businessName}
        {" · "}
        <MuiLink component={Link} to="/imprint" color="inherit" underline="hover">
          Impressum
        </MuiLink>
        {" · "}
        <MuiLink component={Link} to="/privacy" color="inherit" underline="hover">
          Datenschutz
        </MuiLink>
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box
        component="nav"
        sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* mobile: overlay drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH },
          }}
        >
          {sidebar}
        </Drawer>
        {/* desktop: permanent sidebar */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: SIDEBAR_WIDTH,
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {sidebar}
        </Drawer>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* mobile-only top bar; on desktop the page header carries the title */}
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ display: { md: "none" } }}
        >
          <Toolbar sx={{ minHeight: 56, gap: 1 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Menü öffnen"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
              {sectionLabel}
            </Typography>
          </Toolbar>
        </AppBar>

        <Container component="main" maxWidth={maxWidth} sx={{ flex: 1, py: 2 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
