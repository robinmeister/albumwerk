import { Camera as PhotoCamera } from "lucide-react";
import { ReactElement } from "react";

import { LOGO_PLAETZE, LogoPlatz, logoScale, settingsFileUrl } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";

// Instance logo (uploaded on the branding page); neutral camera avatar as
// long as none is configured.
//
// `platz` bestimmt die Grundhöhe (LOGO_PLAETZE), die im Branding eingestellte
// Größe dieses Orts skaliert sie. Nur die Höhe ist fest — ein breites Logo
// darf breit werden, statt in einem quadratischen Kasten zu schrumpfen.
// `scale`/`src` überschreiben die gespeicherten Werte (Live-Vorschau auf
// /branding), `fallback={false}` zeigt ohne Logo nichts statt der Kamera.
export default function BrandLogo({
  platz,
  scale,
  src,
  fallback = true,
}: {
  platz: LogoPlatz;
  scale?: number;
  src?: string;
  fallback?: boolean;
}): ReactElement | null {
  const { settings } = useSettings();
  const url = src ?? settingsFileUrl(settings, "logo");
  const size = LOGO_PLAETZE[platz].size;
  const prozent = scale ?? logoScale(settings.logoScales, platz);
  const hoehe = Math.round((size * prozent) / 100);

  if (url) {
    return (
      <img
        src={url}
        alt={settings.businessName}
        style={{ height: hoehe, width: "auto", maxWidth: "100%", objectFit: "contain" }}
      />
    );
  }
  if (!fallback) return null;
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
