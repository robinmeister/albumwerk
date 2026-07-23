import { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import * as stylex from "@stylexjs/stylex";
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

const empty = stylex.create({
  root: { minHeight: "100vh", display: "flex", flexDirection: "column" },
});

export const EmptyLayout = (): ReactElement => {
    return (
      <div {...stylex.props(empty.root)}>
        <Outlet />
      </div>
    );
  };
