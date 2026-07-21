import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ContentCopy, Download, IosShare } from "@mui/icons-material";
import QRCodeCanvas from "qrcode.react";
import { ReactElement, useState } from "react";
import { toast } from "react-toastify";

import { Shooting } from "../../../utils/types";

type Props = {
  shooting: Shooting;
};

// "Teilen" button + dialog: share link, copy to clipboard, QR code download.
// Public shootings link straight to the album, everything else to the
// signup page that auto-links the shooting.
export default function ShareDialog({ shooting }: Props): ReactElement {
  const [open, setOpen] = useState(false);

  const origin = window.location.origin;
  const link =
    shooting.type === "public"
      ? `${origin}/publicAlbum/${shooting.id}`
      : `${origin}/signUp?shootingId=${shooting.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("share-qr-code") as HTMLCanvasElement;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = shooting.title ? `${shooting.title}.png` : "qr-code.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<IosShare />}
        onClick={() => setOpen(true)}
      >
        Teilen
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Album teilen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {shooting.type === "public"
              ? "Jeder mit diesem Link kann das Album ansehen."
              : "Kunden registrieren sich über diesen Link und werden automatisch mit dem Album verknüpft."}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={link}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Link kopieren">
                    <IconButton onClick={() => void copyLink()} edge="end">
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              mt: 3,
            }}
          >
            <Box sx={{ p: 1.5, bgcolor: "#fff", borderRadius: 1 }}>
              <QRCodeCanvas id="share-qr-code" value={link} size={168} />
            </Box>
            <Button startIcon={<Download />} onClick={downloadQRCode}>
              QR-Code herunterladen
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
