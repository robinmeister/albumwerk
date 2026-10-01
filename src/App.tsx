import { ReactElement, useEffect, useMemo, useState } from "react";
import { Theme } from "@astryxdesign/core";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
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
import AppointmentsPage from "./pages/admin/AppointmentsPage";
import AppointmentSetupPage from "./pages/admin/AppointmentSetupPage";
import AppointmentTypesPage from "./pages/admin/AppointmentTypesPage";
import AvailabilityPage from "./pages/admin/AvailabilityPage";
import EmbedPage from "./pages/admin/EmbedPage";
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
import BookingPage from "./pages/public/BookingPage";
import ManageAppointmentPage from "./pages/public/ManageAppointmentPage";
import PublicDownloadsPage from "./pages/public/PublicDownloadsPage";
import LegalPage from "./pages/public/LegalPage";
import HelpPage from "./pages/help/HelpPage";
import HelpArticlePage from "./pages/help/HelpArticlePage";
import HelpAdminPage from "./pages/admin/HelpAdminPage";
import BrandingPage from "./pages/admin/BrandingPage";
import EinrichtungPage from "./pages/admin/EinrichtungPage";
import DomainPage from "./pages/admin/DomainPage";
import KontaktPage from "./pages/admin/KontaktPage";
import BilderPage from "./pages/admin/BilderPage";
import AdminLegalPage from "./pages/admin/AdminLegalPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
import SetupRedirect from "./components/SetupRedirect";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import PageLoader from "./components/feedback/PageLoader";

import { pb } from "./config/pocketbase";
import { currentUser } from "./config/currentUser";

import ActionPage from "./pages/auth/ActionPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Import AuthContext from the new file
import { AuthContext } from "./context/AuthContext";

// Ausgeloggt gibt es nur die oeffentlichen Routen, alles andere lief in den
// Catch-all und endete als 404 — auch die Deep-Links aus unseren eigenen
// Mails (/support?ticket=...). Statt der Sackgasse zum Login, mit dem Ziel
// im Gepaeck.
function LoginMitZiel(): ReactElement {
  const location = useLocation();
  const ziel = location.pathname + location.search;
  return <Navigate to={`/login?next=${encodeURIComponent(ziel)}`} replace />;
}

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

  // currentUser() statt eines Casts auf das rohe PocketBase-Model: das Model
  // heißt `id`, die App liest überall `uid`. Der Cast lieferte ein Objekt ohne
  // uid — ProfilePage schickte daraufhin PATCH auf /users/records/ ohne ID
  // (404, "Profil konnte nicht aktualisiert werden"), und PaymentForm lud die
  // gespeicherten Kontaktdaten nie. Genau dafür gibt es config/currentUser.ts.
  useEffect(() => {
    setUser(currentUser());
    const unsubscribe = pb.authStore.onChange(() => {
      setUser(currentUser());
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
              {/* Terminbuchung und der Storno-Link aus der Bestätigungsmail —
                  wie das QR-Ziel oben müssen sie für alle gleich aufgehen:
                  eingeloggte Kund:innen, Admins und Leute ohne Konto. Ein
                  Login davor wäre eine Sackgasse, denn die meisten, die einen
                  Termin buchen oder absagen, haben gar keins. */}
              <Route path="buchen" element={<BookingPage />} />
              <Route path="termin/:token" element={<ManageAppointmentPage />} />
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
                  <Route path="help" element={<HelpPage />} />
                  <Route path="help/:slug" element={<HelpArticlePage />} />
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
                  {/* Die statischen Unterseiten stehen vor der Übersicht, damit
                      /appointments/types nicht als Kalender aufgelöst wird. */}
                  <Route path="appointments/setup" element={<AppointmentSetupPage />} />
                  <Route path="appointments/types" element={<AppointmentTypesPage />} />
                  <Route path="appointments/availability" element={<AvailabilityPage />} />
                  <Route path="appointments/embed" element={<EmbedPage />} />
                  <Route path="appointments" element={<AppointmentsPage />} />
                  <Route path="pricing" element={<AdminPricingPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="orders" element={<OrdersPage />}/>
                  <Route path="orderDetails/:orderId" element={<OrderDetailsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="payments" element={<AdminPaymentsPage />} />
                  <Route path="einrichtung" element={<EinrichtungPage />} />
                  <Route path="branding" element={<BrandingPage />} />
                  {/* /branding?setup=1 war der alte Wizard-Link — Checklisten-Route
                      übernimmt, damit gespeicherte Links und Hilfeartikel nicht ins
                      Leere zeigen. */}
                  <Route path="branding/setup" element={<Navigate to="/einrichtung" replace />} />
                  <Route path="domain" element={<DomainPage />} />
                  <Route path="kontakt" element={<KontaktPage />} />
                  <Route path="bilder" element={<BilderPage />} />
                  <Route path="legal" element={<AdminLegalPage />} />
                  <Route path="support" element={<AdminSupportPage />} />
                  <Route path="downloads" element={<DownloadsPage />} />
                  {/* static segment outranks the dynamic one in react-router v6,
                      so /help/manage never resolves as an article slug */}
                  <Route path="help/manage" element={<HelpAdminPage />} />
                  <Route path="help" element={<HelpPage />} />
                  <Route path="help/:slug" element={<HelpArticlePage />} />
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
                {/* reachable without an account — only articles tagged
                    "public" are served here */}
                <Route path="help" element={<HelpPage standalone />} />
                <Route path="help/:slug" element={<HelpArticlePage standalone />} />
                <Route path="__/auth/action" element={<ActionPage />} />
                <Route path="*" element={<LoginMitZiel />} />
              </Route>
            </Routes>
          </ErrorBoundary>
          </BrowserRouter>
        </AuthContext.Provider>
    </Theme>
  );
}
