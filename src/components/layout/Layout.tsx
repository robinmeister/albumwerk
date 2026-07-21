import { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import { AuthUser } from "../../config/authUser";

import {
  adminMenuItems,
  adminNavItems,
  userMenuItems,
  userNavItems,
} from "../../utils/routes";

import AppShell from "./AppShell";

type LayoutProps = {
    user: AuthUser;
    isAdmin: boolean;
};

// All signed-in users get the sidebar shell; only the nav entries and the
// content width differ between customers and admins.
export const Layout = (props: LayoutProps): ReactElement => {
    const { isAdmin } = props;

    return (
      <AppShell
        navItems={isAdmin ? adminNavItems : userNavItems}
        menuItems={isAdmin ? adminMenuItems : userMenuItems}
        maxWidth={isAdmin ? "xl" : "lg"}
      />
    );
  };

export const EmptyLayout = (): ReactElement => {
    return (
      <Box minHeight="100vh" display="flex" flexDirection="column">
        <Outlet />
      </Box>
    );
  };
