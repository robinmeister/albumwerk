import { ReactElement, useMemo } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  IconButton,
  LinearProgress,
  Modal,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useDropzone } from "react-dropzone";
import { CheckCircle, Close, ErrorOutline, HourglassEmpty, Replay } from "@mui/icons-material";
import { toast } from "react-toastify";

import useMobileService from "../../../hooks/useMobileService";
import { useAlbumContext } from "../utils/context";
import { useImageUpload } from "../hooks/useImageUpload";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadComponent(): ReactElement {
  const theme = useTheme();
  const isMobile = useMobileService();
  const {
    openUploadModal,
    setOpenUploadModal,
    selectedShooting,
    reload,
    setReload,
  } = useAlbumContext();

  const {
    items,
    phase,
    previewProgress,
    duplicatePrompt,
    isBusy,
    addFiles,
    resolveDuplicates,
    retryItem,
    cancelAll,
    reset,
  } = useImageUpload(selectedShooting?.id, () => setReload(reload + 1));

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: (accepted, rejections) => {
      if (rejections.length > 0) {
        toast.warn(
          rejections.length === 1
            ? "1 Datei wurde übersprungen — nur JPG und PNG werden unterstützt"
            : `${rejections.length} Dateien wurden übersprungen — nur JPG und PNG werden unterstützt`
        );
      }
      void addFiles(accepted);
    },
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpeg", ".jpg"],
    },
    disabled: isBusy || duplicatePrompt !== null,
  });

  const totals = useMemo(() => {
    const active = items.filter((it) => it.status !== "error");
    const totalBytes = active.reduce((sum, it) => sum + it.file.size, 0);
    const doneBytes = active.reduce((sum, it) => sum + (it.file.size * it.progress) / 100, 0);
    const doneCount = items.filter((it) => it.status === "done").length;
    return { totalBytes, doneBytes, doneCount, activeCount: active.length };
  }, [items]);

  const closeModal = () => {
    if (isBusy) {
      const confirmed = window.confirm(
        "Der Upload läuft noch. Wirklich schließen? Noch nicht hochgeladene Bilder gehen verloren."
      );
      if (!confirmed) return;
    }
    reset();
    setOpenUploadModal(false);
    setReload(reload + 1);
  };

  const dropzoneBorder = isDragReject
    ? theme.palette.error.main
    : isDragActive
      ? theme.palette.primary.main
      : theme.palette.divider;

  const content = (
    <Stack spacing={2} sx={{ width: "100%" }}>
      <Box
        {...getRootProps()}
        sx={{
          minHeight: 130,
          border: `2px dashed ${dropzoneBorder}`,
          borderRadius: 1,
          p: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          cursor: isBusy || duplicatePrompt ? "default" : "pointer",
          opacity: isBusy || duplicatePrompt ? 0.5 : 1,
          "&:hover": {
            borderColor: isBusy || duplicatePrompt ? undefined : theme.palette.text.secondary,
          },
        }}
      >
        <input {...getInputProps()} />
        <Typography color={isDragReject ? "error" : "text.secondary"} align="center">
          {isDragReject
            ? "Dieses Dateiformat wird nicht unterstützt"
            : isDragActive
              ? "Bilder hier ablegen …"
              : "Bilder hierher ziehen oder klicken, um Dateien auszuwählen"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          JPG oder PNG
        </Typography>
      </Box>

      {duplicatePrompt && (
        <Alert severity="warning">
          <Typography variant="body2">
            {duplicatePrompt.duplicateNames.length === 1
              ? `„${duplicatePrompt.duplicateNames[0]}“ existiert bereits in diesem Shooting.`
              : `${duplicatePrompt.duplicateNames.length} Dateien existieren bereits in diesem Shooting.`}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" variant="contained" onClick={() => void resolveDuplicates("replace")}>
              Ersetzen
            </Button>
            <Button size="small" onClick={() => void resolveDuplicates("skip")}>
              Überspringen
            </Button>
            <Button size="small" color="inherit" onClick={() => void resolveDuplicates("cancel")}>
              Abbrechen
            </Button>
          </Stack>
        </Alert>
      )}

      {phase === "uploading" && totals.activeCount > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            {totals.doneCount} von {totals.activeCount} Dateien hochgeladen
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(totals.doneBytes)} von {formatBytes(totals.totalBytes)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={totals.totalBytes > 0 ? (totals.doneBytes / totals.totalBytes) * 100 : 0}
            sx={{ mt: 1, borderRadius: 1 }}
          />
        </Paper>
      )}

      {phase === "processing" && previewProgress && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <HourglassEmpty color="action" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                Vorschauen mit Wasserzeichen werden erstellt …
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {previewProgress.done} von {previewProgress.total} fertig
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(previewProgress.done / previewProgress.total) * 100}
                sx={{ mt: 1, borderRadius: 1 }}
              />
            </Box>
          </Stack>
        </Paper>
      )}

      {phase === "done" && previewProgress && (
        previewProgress.done >= previewProgress.total ? (
          <Alert severity="success">
            {previewProgress.total === 1
              ? "1 Bild hochgeladen — die Vorschau wurde erstellt."
              : `${previewProgress.total} Bilder hochgeladen — alle Vorschauen wurden erstellt.`}
          </Alert>
        ) : (
          <Alert severity="warning">
            Bilder hochgeladen — einige Vorschauen werden noch erstellt und erscheinen in Kürze
            im Album.
          </Alert>
        )
      )}

      {items.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "40vh" }}>
          <Table size="small" stickyHeader aria-label="Upload-Fortschritt">
            <TableHead>
              <TableRow>
                <TableCell>Datei</TableCell>
                <TableCell align="right" sx={{ width: "40%" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        variant="rounded"
                        src={item.thumbUrl}
                        imgProps={{ loading: "lazy" }}
                        sx={{ width: 40, height: 40 }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                          {item.file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(item.file.size)}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    {item.status === "queued" && (
                      <Typography variant="caption" color="text.secondary">
                        Wartet …
                      </Typography>
                    )}
                    {item.status === "uploading" && (
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={item.progress}
                          sx={{ borderRadius: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {item.progress} %
                        </Typography>
                      </Box>
                    )}
                    {item.status === "done" && (
                      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                        <CheckCircle color="success" fontSize="small" />
                        <Typography variant="caption" color="text.secondary">
                          Hochgeladen
                        </Typography>
                      </Stack>
                    )}
                    {item.status === "error" && (
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <Tooltip title={item.error ?? "Upload fehlgeschlagen"}>
                          <ErrorOutline color="error" fontSize="small" />
                        </Tooltip>
                        <Typography variant="caption" color="error">
                          Fehlgeschlagen
                        </Typography>
                        <Tooltip title="Erneut versuchen">
                          <span>
                            <IconButton
                              size="small"
                              aria-label="Erneut versuchen"
                              disabled={isBusy}
                              onClick={() => retryItem(item.id)}
                            >
                              <Replay fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box>
          {phase === "uploading" && (
            <Button color="error" onClick={cancelAll}>
              Upload abbrechen
            </Button>
          )}
        </Box>
        <Button variant="contained" onClick={closeModal}>
          {isBusy ? "Schließen" : "Fertig"}
        </Button>
      </Box>
    </Stack>
  );

  const desktopUploadModal = (
    <Modal
      open={openUploadModal}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") closeModal();
      }}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Card sx={{ width: "min(680px, 92vw)", maxHeight: "90vh", overflow: "auto" }}>
        <CardHeader
          title="Bilder hochladen"
          subheader={selectedShooting?.title}
          action={
            <IconButton aria-label="Schließen" onClick={closeModal}>
              <Close />
            </IconButton>
          }
        />
        <CardContent>{content}</CardContent>
      </Card>
    </Modal>
  );

  const mobileUploadDialog = (
    <Dialog
      fullScreen
      open={openUploadModal}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") closeModal();
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Bilder hochladen</Typography>
          <IconButton aria-label="Schließen" onClick={closeModal}>
            <Close />
          </IconButton>
        </Stack>
        {content}
      </Box>
    </Dialog>
  );

  return isMobile ? mobileUploadDialog : desktopUploadModal;
}
