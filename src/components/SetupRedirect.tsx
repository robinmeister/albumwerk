import { ReactElement, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";

// Sends a freshly installed instance's admin to the setup wizard until the
// initial configuration has been completed once.
export default function SetupRedirect(): ReactElement | null {
  const { settings, loaded } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (
      loaded &&
      !settings.setupCompleted &&
      !location.pathname.startsWith("/branding")
    ) {
      navigate("/branding?setup=1", { replace: true });
    }
  }, [loaded, settings.setupCompleted, location.pathname, navigate]);

  return null;
}
