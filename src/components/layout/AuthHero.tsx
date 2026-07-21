import { Box, Card, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ReactElement, ReactNode, useEffect, useState } from "react";

import BrandLogo from "../widgets/BrandLogo";
import { useSettings } from "../../context/SettingsContext";
import { loadImage } from "../../utils/functions";

type Props = {
  children: ReactNode;
  maxWidth?: number;
};

// Shared hero layout for the auth pages: fullscreen background image (one of
// the loginImages, faded in once loaded) with a dark overlay and a floating
// glass card. Renders instantly — no image, no spinner, just the gradient.
export default function AuthHero({ children, maxWidth = 420 }: Props): ReactElement {
  const { settings } = useSettings();
  const theme = useTheme();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const url = await loadImage();
      if (url) setImageUrl(url);
    })();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background: `linear-gradient(160deg, ${theme.palette.primary.main} 0%, #111 85%)`,
      }}
    >
      {imageUrl && (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          onLoad={() => setImageLoaded(true)}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.6s ease",
          }}
        />
      )}
      <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.55)" }} />

      <Card
        elevation={0}
        sx={{
          position: "relative",
          width: "100%",
          maxWidth,
          px: { xs: 3, sm: 5 },
          py: { xs: 4, sm: 5 },
          bgcolor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "none",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
          <BrandLogo size={56} />
          <Typography variant="h4" component="h1" sx={{ mt: 2, textAlign: "center" }}>
            {settings.businessName}
          </Typography>
          {settings.tagline && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
              {settings.tagline}
            </Typography>
          )}
        </Box>
        {children}
      </Card>
    </Box>
  );
}
