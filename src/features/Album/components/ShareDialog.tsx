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
});

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
              ? "Jeder mit diesem Link kann das Album ansehen."
              : "Kunden registrieren sich über diesen Link und werden automatisch mit dem Album verknüpft."}
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
              <QRCodeCanvas id="share-qr-code" value={link} size={168} />
            </div>
            <Button
              variant="secondary"
              icon={<Download />}
              label="QR-Code herunterladen"
              onClick={downloadQRCode}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
