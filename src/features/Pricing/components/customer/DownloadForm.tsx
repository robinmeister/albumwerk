import {
  Box,
  Button,
  LinearProgress,
  Typography,
} from "@mui/material";
import { CheckCircle, CloudDownload } from "@mui/icons-material";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ref, getDownloadURL } from "../../../../config/storage-compat";
import { ReactElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { getOriginalImages } from "../../../../utils/functions";
import { pb } from "../../../../config/pocketbase";

type Props = {
  imageList: string[];
  shootingIds: string[];
  inDownloadPage?: boolean;
  orderId?: string;
};

export default function DownloadForm(props: Props): ReactElement {
  const { imageList, shootingIds, inDownloadPage, orderId } = props;
  const hasDownloads = imageList.length > 0;
  const [loadingZip, setLoadingZip] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  async function downloadImagesAsZip() {
    try {
      setLoadingZip(true);
      const shootingsWithNames = await Promise.all(
        shootingIds.map(async (id) => {
          const names = await getOriginalImages(imageList, id);
          let title = "";
          try {
            const record = await pb.collection("shootings").getOne(id, { requestKey: null });
            title = (record as any).title ?? "";
          } catch { /* keep id as folder name */ }
          return { id, names, title };
        })
      );

      const zip = new JSZip();
      let filesDownloaded = 0;
      const totalFiles = shootingsWithNames.reduce((sum, s) => sum + s.names.length, 0);

      const sanitize = (name: string) => name.replace(/[\\/:*?"<>|]/g, "-");
      for (const { id, names, title } of shootingsWithNames) {
        const folder = zip.folder(sanitize(title || `Shooting-${id}`))!;
        await Promise.all(
          names.map(async (filename) => {
            const url = await getDownloadURL(ref(`/shootings/${id}/original/${filename}`));
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Download-Fehler (${res.status})`);
            const blob = await res.blob();
            filesDownloaded++;
            setProgress(filesDownloaded / totalFiles);
            folder.file(filename, blob);
          })
        );
      }
      const content = await zip.generateAsync({ type: "blob" });
      const single = shootingsWithNames.length === 1 ? shootingsWithNames[0].title : "";
      saveAs(content, `${sanitize(single || "fotos")}.zip`);
    } catch (error) {
      console.error("Fehler beim ZIP-Download:", error);
      toast.error("Der Download konnte nicht abgeschlossen werden. Bitte versuche es erneut.");
    } finally {
      setLoadingZip(false);
    }
  }

  /* ── Success state (after payment) ── */
  if (!inDownloadPage) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        py={6}
        gap={2}
      >
        <CheckCircle sx={{ fontSize: 72, color: "success.main" }} />
        <Typography variant="h5" fontWeight={700}>
          Zahlung erfolgreich!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
          Vielen Dank für deine Bestellung. Deine Zahlung wurde erfolgreich bearbeitet.
          Du erhältst in Kürze eine Bestätigung per E-Mail.
        </Typography>
        {orderId && (
          <Typography variant="body2" color="text.secondary">
            Bestellnummer: <b>{orderId}</b>
          </Typography>
        )}
        <Box display="flex" gap={1} sx={{ mt: 1 }}>
          {hasDownloads && (
            <Button variant="contained" onClick={() => navigate("/downloads")}>
              Zu meinen Downloads
            </Button>
          )}
          <Button
            variant={hasDownloads ? "text" : "contained"}
            onClick={() => navigate("/album")}
          >
            Zurück zum Album
          </Button>
        </Box>
      </Box>
    );
  }

  /* ── Download page state ── */
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      textAlign="center"
      py={4}
      gap={2}
    >
      <CloudDownload sx={{ fontSize: 56, color: "primary.main" }} />
      <Typography variant="h6" fontWeight={600}>
        Fotos herunterladen
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
        Alle deine Bilder werden als ZIP-Datei heruntergeladen.
      </Typography>

      {loadingZip && (
        <Box width="100%" maxWidth={380}>
          <LinearProgress variant="determinate" value={progress * 100} sx={{ mb: 1, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress * 100)} % abgeschlossen
          </Typography>
        </Box>
      )}

      <Button
        variant="contained"
        startIcon={loadingZip ? undefined : <CloudDownload />}
        onClick={downloadImagesAsZip}
        disabled={loadingZip}
        size="large"
      >
        {loadingZip ? "Wird vorbereitet…" : "Als ZIP herunterladen"}
      </Button>
    </Box>
  );
}
