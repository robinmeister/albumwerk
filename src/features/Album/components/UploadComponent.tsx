import { ReactElement, useMemo } from "react";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { useDropzone } from "react-dropzone";
import { CircleCheck as CheckCircle, X as Close, CircleAlert as ErrorOutline, Hourglass as HourglassEmpty, RotateCcw as Replay } from "lucide-react";
import { toast } from "react-toastify";

import useMobileService from "../../../hooks/useMobileService";
import { useAlbumContext } from "../utils/context";
import { useImageUpload } from "../hooks/useImageUpload";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const s = stylex.create({
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  content: { display: "flex", flexDirection: "column", gap: 16, width: "100%" },
  dropzone: {
    minHeight: 130,
    borderRadius: "var(--radius-element)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    textAlign: "center",
  },
  panel: {
    padding: 16,
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  panelRow: { display: "flex", gap: 12, alignItems: "center" },
  actionsRow: { display: "flex", gap: 8, marginTop: 8 },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  tableWrap: {
    maxHeight: "40vh",
    overflow: "auto",
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    position: "sticky",
    top: 0,
    textAlign: "left",
    padding: "8px 12px",
    backgroundColor: "var(--color-background-surface)",
    borderBottom: "1px solid var(--color-border)",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text-secondary)",
  },
  thRight: { textAlign: "right" },
  td: { padding: "8px 12px", borderBottom: "1px solid var(--color-border)", verticalAlign: "middle" },
  tdRight: { padding: "8px 12px", borderBottom: "1px solid var(--color-border)", textAlign: "right" },
  fileCell: { display: "flex", gap: 12, alignItems: "center" },
  thumb: { width: 40, height: 40, borderRadius: "var(--radius-element)", objectFit: "cover", backgroundColor: "var(--color-background-muted)" },
  fileName: { minWidth: 0, wordBreak: "break-all" },
  statusRow: { display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" },
  ok: { color: "var(--color-success)", display: "inline-flex" },
  err: { color: "var(--color-error)", display: "inline-flex" },
});

export default function UploadComponent(): ReactElement {
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
    ? "var(--color-error)"
    : isDragActive
      ? "var(--color-accent)"
      : "var(--color-border)";

  const content = (
    <div {...stylex.props(s.content)}>
      <div
        {...getRootProps()}
        {...stylex.props(s.dropzone)}
        style={{
          border: `2px dashed ${dropzoneBorder}`,
          cursor: isBusy || duplicatePrompt ? "default" : "pointer",
          opacity: isBusy || duplicatePrompt ? 0.5 : 1,
        }}
      >
        <input {...getInputProps()} />
        <Text type="body" color={isDragReject ? "primary" : "secondary"}>
          {isDragReject
            ? "Dieses Dateiformat wird nicht unterstützt"
            : isDragActive
              ? "Bilder hier ablegen …"
              : "Bilder hierher ziehen oder klicken, um Dateien auszuwählen"}
        </Text>
        <Text type="supporting" color="secondary">
          JPG oder PNG
        </Text>
      </div>

      {duplicatePrompt && (
        <Banner
          status="warning"
          title={
            duplicatePrompt.duplicateNames.length === 1
              ? `„${duplicatePrompt.duplicateNames[0]}“ existiert bereits in diesem Shooting.`
              : `${duplicatePrompt.duplicateNames.length} Dateien existieren bereits in diesem Shooting.`
          }
        >
          <div {...stylex.props(s.actionsRow)}>
            <Button size="sm" variant="primary" label="Ersetzen" onClick={() => void resolveDuplicates("replace")} />
            <Button size="sm" variant="secondary" label="Überspringen" onClick={() => void resolveDuplicates("skip")} />
            <Button size="sm" variant="ghost" label="Abbrechen" onClick={() => void resolveDuplicates("cancel")} />
          </div>
        </Banner>
      )}

      {phase === "uploading" && totals.activeCount > 0 && (
        <div {...stylex.props(s.panel)}>
          <Text type="body" weight="semibold">
            {totals.doneCount} von {totals.activeCount} Dateien hochgeladen
          </Text>
          <Text type="supporting" color="secondary">
            {formatBytes(totals.doneBytes)} von {formatBytes(totals.totalBytes)}
          </Text>
          <ProgressBar
            label="Upload"
            isLabelHidden
            value={totals.totalBytes > 0 ? (totals.doneBytes / totals.totalBytes) * 100 : 0}
            max={100}
          />
        </div>
      )}

      {phase === "processing" && previewProgress && (
        <div {...stylex.props(s.panel)}>
          <div {...stylex.props(s.panelRow)}>
            <HourglassEmpty />
            <div style={{ flex: 1 }}>
              <Text type="body" weight="semibold">
                Vorschauen mit Wasserzeichen werden erstellt …
              </Text>
              <Text type="supporting" color="secondary">
                {previewProgress.done} von {previewProgress.total} fertig
              </Text>
              <ProgressBar
                label="Vorschauen"
                isLabelHidden
                value={(previewProgress.done / previewProgress.total) * 100}
                max={100}
              />
            </div>
          </div>
        </div>
      )}

      {phase === "done" && previewProgress && (
        previewProgress.done >= previewProgress.total ? (
          <Banner
            status="success"
            title={
              previewProgress.total === 1
                ? "1 Bild hochgeladen — die Vorschau wurde erstellt."
                : `${previewProgress.total} Bilder hochgeladen — alle Vorschauen wurden erstellt.`
            }
          />
        ) : (
          <Banner
            status="warning"
            title="Bilder hochgeladen — einige Vorschauen werden noch erstellt und erscheinen in Kürze im Album."
          />
        )
      )}

      {items.length > 0 && (
        <div {...stylex.props(s.tableWrap)}>
          <table {...stylex.props(s.table)}>
            <thead>
              <tr>
                <th {...stylex.props(s.th)}>Datei</th>
                <th {...stylex.props(s.th, s.thRight)} style={{ width: "40%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td {...stylex.props(s.td)}>
                    <div {...stylex.props(s.fileCell)}>
                      <img src={item.thumbUrl} loading="lazy" alt="" {...stylex.props(s.thumb)} />
                      <div {...stylex.props(s.fileName)}>
                        <Text type="body">{item.file.name}</Text>
                        <Text type="supporting" color="secondary">{formatBytes(item.file.size)}</Text>
                      </div>
                    </div>
                  </td>
                  <td {...stylex.props(s.tdRight)}>
                    {item.status === "queued" && (
                      <Text type="supporting" color="secondary">Wartet …</Text>
                    )}
                    {item.status === "uploading" && (
                      <div>
                        <ProgressBar label="Fortschritt" isLabelHidden value={item.progress} max={100} />
                        <Text type="supporting" color="secondary">{item.progress} %</Text>
                      </div>
                    )}
                    {item.status === "done" && (
                      <div {...stylex.props(s.statusRow)}>
                        <span {...stylex.props(s.ok)}><CheckCircle /></span>
                        <Text type="supporting" color="secondary">Hochgeladen</Text>
                      </div>
                    )}
                    {item.status === "error" && (
                      <div {...stylex.props(s.statusRow)}>
                        <span {...stylex.props(s.err)} title={item.error ?? "Upload fehlgeschlagen"}>
                          <ErrorOutline />
                        </span>
                        <Text type="supporting" color="primary">Fehlgeschlagen</Text>
                        <IconButton
                          variant="ghost"
                          icon={<Replay />}
                          label="Erneut versuchen"
                          tooltip="Erneut versuchen"
                          isDisabled={isBusy}
                          onClick={() => retryItem(item.id)}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div {...stylex.props(s.footer)}>
        <div>
          {phase === "uploading" && (
            <Button variant="ghost" label="Upload abbrechen" onClick={cancelAll} />
          )}
        </div>
        <Button variant="primary" label={isBusy ? "Schließen" : "Fertig"} onClick={closeModal} />
      </div>
    </div>
  );

  return (
    <Dialog
      isOpen={openUploadModal}
      onOpenChange={(open) => { if (!open) closeModal(); }}
      width={isMobile ? undefined : 680}
    >
      <div {...stylex.props(s.header)}>
        <div>
          <Heading level={6}>Bilder hochladen</Heading>
          {selectedShooting?.title && (
            <Text type="supporting" color="secondary">{selectedShooting.title}</Text>
          )}
        </div>
        <IconButton variant="ghost" icon={<Close />} label="Schließen" onClick={closeModal} />
      </div>
      {content}
    </Dialog>
  );
}
