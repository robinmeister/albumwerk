import { Avatar } from "@mui/material";
import { PhotoCamera } from "@mui/icons-material";
import { ReactElement } from "react";

import { settingsFileUrl } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";

// Instance logo (uploaded on the branding page); neutral camera avatar as
// long as none is configured.
export default function BrandLogo({ size = 64 }: { size?: number }): ReactElement {
  const { settings } = useSettings();
  const url = settingsFileUrl(settings, "logo");

  if (url) {
    return (
      <img
        src={url}
        alt={settings.businessName}
        style={{ height: size, width: size, objectFit: "contain" }}
      />
    );
  }
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: "primary.main" }}>
      <PhotoCamera sx={{ fontSize: size * 0.55 }} />
    </Avatar>
  );
}
