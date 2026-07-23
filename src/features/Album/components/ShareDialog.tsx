import { Dialog } from "@astryxdesign/core/Dialog";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Copy as ContentCopy, Download, Share as IosShare } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { ReactElement, useState } from "react";
import { toast } from "react-toastify";

import { Shooting } from "../../../utils/types";
import { shootingShareLink } from "../../../utils/shootingLink";

type Props = {
  shooting: Shooting;
};

const s = stylex.create({
  body: { display: "flex", flexDirection: "column", gap: 16, padding: 8 },
  linkRow: { display: "flex", alignItems: "center", gap: 8 },
  linkInput: {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-muted)",
    color: "var(--color-text-primary)",
    fontSize: 14,
  },
  qrWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 12 },
  qrBox: { padding: 12, backgroundColor: "#fff", borderRadius: "var(--radius-element)" },
  offscreen: { position: "absolute", left: -9999, top: -9999, pointerEvents: "none" },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: 12,
    borderRadius: "var(--radius-element)",
    backgroundColor: "var(--color-background-muted)",
  },
  code: { fontFamily: "monospace", letterSpacing: "0.05em" },
});

// "Teilen" button + dialog: share link, copy to clipboard, QR code download.
// Public shootings link straight to the album, everything else to /addAlbum,
// which adds the album to the customer's account (or sends them to signup
// first) — scanning the code is all a customer has to do.
export default function ShareDialog({ shooting }: Props): ReactElement {
  const [open, setOpen] = useState(false);

  const link = shootingShareLink(shooting);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shooting.id);
      toast.success("Album-Code kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  // the visible code is only 168px — download the offscreen print-size one
  const downloadQRCode = () => {
    const canvas = document.getElementById("share-qr-code-print") as HTMLCanvasElement;
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
        variant="secondary"
        size="sm"
        icon={<IosShare />}
        label="Teilen"
        onClick={() => setOpen(true)}
      />

      <Dialog isOpen={open} onOpenChange={setOpen} width={380}>
        <div {...stylex.props(s.body)}>
          <Heading level={5}>Album teilen</Heading>
          <Text type="body" color="secondary">
            {shooting.type === "public"
              ? "Jeder mit diesem Link oder QR-Code kann das Album ansehen — ohne Konto."
              : "Der QR-Code führt direkt zum Album: Kunden scannen ihn mit der Handykamera, melden sich an bzw. registrieren sich einmalig — das Album liegt danach automatisch in ihrer Übersicht."}
          </Text>
          <div {...stylex.props(s.linkRow)}>
            <input readOnly value={link} {...stylex.props(s.linkInput)} />
            <IconButton
              icon={<ContentCopy />}
              label="Link kopieren"
              tooltip="Link kopieren"
              variant="secondary"
              onClick={() => void copyLink()}
            />
          </div>
          <div {...stylex.props(s.qrWrap)}>
            <div {...stylex.props(s.qrBox)}>
              <QRCodeCanvas id="share-qr-code" value={link} size={168} level="M" marginSize={2} />
            </div>
            <Button
              variant="secondary"
              icon={<Download />}
              label="QR-Code herunterladen"
              onClick={downloadQRCode}
            />
          </div>

          {shooting.type !== "public" && (
            <div {...stylex.props(s.steps)}>
              <Text type="supporting" weight="semibold">
                Falls das Scannen nicht klappt
              </Text>
              <Text type="supporting" color="secondary">
                Kunden können das Album auch von Hand hinzufügen: „Meine Alben“ →
                „Album hinzufügen“ → diesen Album-Code eingeben.
              </Text>
              <div {...stylex.props(s.linkRow)}>
                <span {...stylex.props(s.code)}>
                  <Text type="body">{shooting.id}</Text>
                </span>
                <IconButton
                  icon={<ContentCopy />}
                  label="Album-Code kopieren"
                  tooltip="Album-Code kopieren"
                  variant="ghost"
                  onClick={() => void copyCode()}
                />
              </div>
            </div>
          )}

          {/* print-resolution copy of the same code, used by the download button */}
          <div {...stylex.props(s.offscreen)} aria-hidden>
            <QRCodeCanvas id="share-qr-code-print" value={link} size={1024} level="M" marginSize={2} />
          </div>
        </div>
      </Dialog>
    </>
  );
}
