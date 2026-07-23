import { ReactElement, useEffect, useMemo, useState } from "react";
import { Theme } from "@astryxdesign/core";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthUser } from "./config/authUser";

import { buildAstryxTheme, themeModeProp } from "./utils/theme";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { useBranding } from "./hooks/useBranding";
import AddShootingPage from "./pages/user/AddShootingPage";
import AlbumPage from "./pages/user/AlbumPage";
import LoginPage from "./pages/auth/LoginPage";
import PricingPage from "./pages/user/PricingPage";
import ProfilePage from "./pages/user/ProfilePage";
import SignUpPage from "./pages/auth/SignUpPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import AdminAlbumPage from "./pages/admin/AdminAlbumPage";
import AdminPricingPage from "./pages/admin/AdminPricingPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import NoMatchPage from "./pages/NoMatchPage";

import "react-toastify/dist/ReactToastify.css";
import { EmptyLayout, Layout } from "./components/layout/Layout";
import DownloadsPage from "./pages/user/DownloadsPage";
import OrdersPage from "./pages/user/OrdersPage";
import OrderDetailsPage from "./pages/user/OrderDetailsPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import SupportPage from "./pages/user/SupportPage";
import PublicAlbumPage from "./pages/public/PublicAlbumPage";
import PublicDownloadsPage from "./pages/public/PublicDownloadsPage";
import LegalPage from "./pages/public/LegalPage";
import BrandingPage from "./pages/admin/BrandingPage";
import AdminLegalPage from "./pages/admin/AdminLegalPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
import SetupRedirect from "./components/SetupRedirect";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import PageLoader from "./components/feedback/PageLoader";

import { pb } from "./config/pocketbase";

import ActionPage from "./pages/auth/ActionPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Import AuthContext from the new file
import { AuthContext } from "./context/AuthContext";

export default function App(): ReactElement {
  return (
    <SettingsProvider>
      <ThemedApp />
    </SettingsProvider>
  );
}

function ThemedApp(): ReactElement {
  const { settings } = useSettings();
  const theme = useMemo(() => buildAstryxTheme(settings), [settings]);
  const mode = themeModeProp(settings);
  useBranding();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(true);

  useEffect(() => {
    setUser((pb.authStore.model as unknown as AuthUser) ?? null);
    const unsubscribe = pb.authStore.onChange(() => {
      setUser((pb.authStore.model as unknown as AuthUser) ?? null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    void checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    setIsAdminLoading(true);
    if (user) {
      setIsAdmin(Boolean((pb.authStore.model as any)?.isAdmin));
    }
    setLoading(false);
    setIsAdminLoading(false);
  };

  if (loading || isAdminLoading) {
    return <PageLoader />;
  }

  return (
    <Theme theme={theme} mode={mode}>
      <ToastContainer />
      <AuthContext.Provider value={{ user }}>
          <BrowserRouter>
          <ScrollToTop />
          <ErrorBoundary>
          <Routes>
              {/* QR code / share link target — must resolve the same way for
                  signed-in customers, admins and visitors without an account,
                  so it sits above the role-specific layouts. */}
              <Route path="addAlbum" element={<AddShootingPage />} />
              <Route path="addAlbum/:shootingId" element={<AddShootingPage />} />
              {!isAdmin && user && (
                <Route path="/" element={<Layout user={user} isAdmin={isAdmin} />}>
                  <Route index element={<Navigate to="/album" />} />
                  <Route path="album" element={<AlbumPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="downloads" element={<DownloadsPage />} />
                  {/* direct download of paid/public shootings, no checkout */}
                  <Route path="shootingDownloads" element={<PublicDownloadsPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="*" element={<NoMatchPage />} />
                </Route>
              )}
              {isAdmin && user && (
                <Route
                  path="/"
                  element={
                    <>
                      <SetupRedirect />
                      <Layout user={user} isAdmin={isAdmin} />
                    </>
                  }
                >
                  <Route index element={<Navigate to="/album" />} />
                  <Route path="album" element={<AdminAlbumPage />} />
                  <Route path="pricing" element={<AdminPricingPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="orders" element={<OrdersPage />}/>
                  <Route path="orderDetails/:orderId" element={<OrderDetailsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="payments" element={<AdminPaymentsPage />} />
                  <Route path="branding" element={<BrandingPage />} />
                  <Route path="legal" element={<AdminLegalPage />} />
                  <Route path="support" element={<AdminSupportPage />} />
                  <Route path="downloads" element={<DownloadsPage />} />
                  <Route path="*" element={<NoMatchPage />} />
                </Route>
              )}
              <Route path="/" element={<EmptyLayout />}>
                <Route index element={<Navigate to="/login" />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="signUp" element={<SignUpPage />}>
                  <Route path=":shootingId" element={<SignUpPage />} />
                </Route>
                <Route path="forgotPassword" element={<ForgotPasswordPage />} />
                <Route path="resetPassword" element={<ResetPasswordPage />} />
                <Route path="verifyEmail" element={<VerifyEmailPage />} />
                <Route path="publicAlbum" element={<PublicAlbumPage />}>
                  <Route path=":shootingId" element={<PublicAlbumPage />} />
                </Route>
                <Route path="publicDownloads" element={<PublicDownloadsPage />} />
                <Route path="imprint" element={<LegalPage kind="imprint" />} />
                <Route path="privacy" element={<LegalPage kind="privacy" />} />
                <Route path="__/auth/action" element={<ActionPage />} />
                <Route path="*" element={<NoMatchPage />} />
              </Route>
            </Routes>
          </ErrorBoundary>
          </BrowserRouter>
        </AuthContext.Provider>
    </Theme>
  );
}
