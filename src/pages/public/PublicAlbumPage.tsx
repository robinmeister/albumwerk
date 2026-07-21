import { Box, Container, Divider, Typography } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Album from "../../features/Album/components/Album";
import BrandLogo from "../../components/widgets/BrandLogo";
import { useSettings } from "../../context/SettingsContext";
import { pb } from "../../config/pocketbase";

// The share-link page — styled like a photographer's profile: round logo,
// name and tagline on top, the image grid below.
export default function PublicAlbumPage(): ReactElement {
  const { shootingId } = useParams();
  const { settings } = useSettings();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [shootingTitle, setShootingTitle] = useState("");

  useEffect(() => {
    if (!shootingId) return;
    pb.collection("shootings")
      .getOne(shootingId, { requestKey: null })
      .then((record) => setShootingTitle((record as any).title ?? ""))
      .catch(() => setShootingTitle(""));
  }, [shootingId]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 8 }, pb: 6 }}>
        {/* profile header */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            mb: 4,
          }}
        >
          <Box
            sx={{
              borderRadius: "50%",
              overflow: "hidden",
              width: { xs: 88, md: 120 },
              height: { xs: 88, md: 120 },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              mb: 2,
            }}
          >
            <BrandLogo size={120} />
          </Box>
          <Typography variant="h3" component="h1">
            {settings.businessName}
          </Typography>
          {settings.tagline && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              {settings.tagline}
            </Typography>
          )}
          {shootingTitle && (
            <Typography variant="overline" color="text.secondary" sx={{ mt: 2 }}>
              {shootingTitle}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 1 }} />

        {shootingId && shootingId !== "" && (
          <Album
            isPublicAlbum={true}
            isAdminAlbum={false}
            shootingId={shootingId}
            selected={selected}
            setSelected={setSelected}
            selectMode={selectMode}
            setSelectMode={setSelectMode}
          />
        )}

        {/* mini footer for the standalone page */}
        <Box
          sx={{
            mt: 6,
            display: "flex",
            justifyContent: "center",
            gap: 2,
            color: "text.secondary",
            fontSize: "0.8rem",
          }}
        >
          <span>© {new Date().getFullYear()} {settings.businessName}</span>
          <Link to="/imprint" style={{ color: "inherit" }}>Impressum</Link>
          <Link to="/privacy" style={{ color: "inherit" }}>Datenschutz</Link>
        </Box>
      </Container>
    </Box>
  );
}
