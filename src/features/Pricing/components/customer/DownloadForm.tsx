import { Button } from "@astryxdesign/core/Button";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { CircleCheck as CheckCircle, CloudDownload } from "lucide-react";
import JSZip from "jszip";
import { originalFileUrl } from "../../../../config/images";
import { ReactElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { getOriginalImages, saveBlob } from "../../../../utils/functions";
import { pb } from "../../../../config/pocketbase";

type Props = {
  imageList: string[];
  shootingIds: string[];
  inDownloadPage?: boolean;
  orderId?: string;
};

const s = stylex.create({
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 16,
  },
  padSuccess: { paddingBlock: 48 },
  padDownload: { paddingBlock: 32 },
  successIcon: { fontSize: 72, color: "var(--color-success)" },
  dlIcon: { fontSize: 56, color: "var(--color-accent)" },
  maxText: { maxWidth: 420 },
  actions: { display: "flex", gap: 8, marginTop: 8 },
  progressWrap: { width: "100%", maxWidth: 380 },
});

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
            const url = await originalFileUrl(id, filename);
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
      saveBlob(content, `${sanitize(single || "fotos")}.zip`);
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
      <div {...stylex.props(s.center, s.padSuccess)}>
        <CheckCircle {...stylex.props(s.successIcon)} />
        <Heading level={5}>Zahlung erfolgreich!</Heading>
        <div {...stylex.props(s.maxText)}>
          <Text type="body" color="secondary">
            Vielen Dank für deine Bestellung. Deine Zahlung wurde erfolgreich bearbeitet.
            Du erhältst in Kürze eine Bestätigung per E-Mail.
          </Text>
        </div>
        {orderId && (
          <Text type="body" color="secondary">
            Bestellnummer: <b>{orderId}</b>
          </Text>
        )}
        <div {...stylex.props(s.actions)}>
          {hasDownloads && (
            <Button variant="primary" label="Zu meinen Downloads" onClick={() => navigate("/downloads")} />
          )}
          <Button
            variant={hasDownloads ? "ghost" : "primary"}
            label="Zurück zum Album"
            onClick={() => navigate("/album")}
          />
        </div>
      </div>
    );
  }

  /* ── Download page state ── */
  return (
    <div {...stylex.props(s.center, s.padDownload)}>
      <CloudDownload {...stylex.props(s.dlIcon)} />
      <Heading level={6}>Fotos herunterladen</Heading>
      <div {...stylex.props(s.maxText)}>
        <Text type="body" color="secondary">
          Alle deine Bilder werden als ZIP-Datei heruntergeladen.
        </Text>
      </div>

      {loadingZip && (
        <div {...stylex.props(s.progressWrap)}>
          <ProgressBar label="Download" isLabelHidden value={progress * 100} max={100} />
          <Text type="body" color="secondary">
            {Math.round(progress * 100)} % abgeschlossen
          </Text>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        icon={loadingZip ? undefined : <CloudDownload />}
        isLoading={loadingZip}
        isDisabled={loadingZip}
        label={loadingZip ? "Wird vorbereitet…" : "Als ZIP herunterladen"}
        onClick={downloadImagesAsZip}
      />
    </div>
  );
}
