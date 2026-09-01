import { ReactElement, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";

// Sends a freshly installed instance's admin to the setup checklist until it
// has been opened once.
export default function SetupRedirect(): ReactElement | null {
  const { settings, loaded } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (
      loaded &&
      !settings.setupCompleted &&
      !location.pathname.startsWith("/einrichtung")
    ) {
      navigate("/einrichtung", { replace: true });
    }
  }, [loaded, settings.setupCompleted, location.pathname, navigate]);

  return null;
}
