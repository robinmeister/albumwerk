import { Camera as PhotoCamera } from "lucide-react";
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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "var(--color-accent)",
        color: "var(--color-on-accent)",
      }}
    >
      <PhotoCamera style={{ fontSize: size * 0.55 }} />
    </span>
  );
}
