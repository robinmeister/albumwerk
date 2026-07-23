import { ReactElement, useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { Plus as Add, QrCode } from "lucide-react";
import { toast } from "react-toastify";

import QrScanner from "../../../components/widgets/QrScanner";
import { linkShootingToCurrentUser } from "../../../config/pocketbase";
import { parseShootingId } from "../../../utils/shootingLink";

// "Album hinzufügen" for customers. Two ways in, both ending in the same
// server call: scan the photographer's QR code with the phone camera, or type
// the album code printed next to it.

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // fired after the album was linked to the account; carries the shooting id
  onAdded: (shootingId: string) => void;
};

const s = stylex.create({
  body: { display: "flex", flexDirection: "column", gap: 16, padding: 8 },
  intro: { display: "flex", flexDirection: "column", gap: 8 },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    margin: 0,
    paddingLeft: 22,
    listStyleType: "decimal",
  },
  step: { color: "var(--color-text-secondary)" },
  divider: { display: "flex", alignItems: "center", gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: "var(--color-border)" },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  linking: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingBlock: 48,
    textAlign: "center",
  },
});

export default function AddShootingDialog({
  isOpen,
  onOpenChange,
  onAdded,
}: Props): ReactElement {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setScanning(false);
      setBusy(false);
      setError("");
    }
  }, [isOpen]);

  const close = () => onOpenChange(false);

  // single path for both entry methods: normalise → link → hand back to parent
  const submit = async (rawValue: string) => {
    const shootingId = parseShootingId(rawValue);
    if (!shootingId) {
      setError(
        "Das sieht nicht nach einem Album-Code aus. Er besteht aus 15 Zeichen (Buchstaben und Zahlen).",
      );
      setScanning(false);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await linkShootingToCurrentUser(shootingId);
      toast.success(
        result.alreadyLinked
          ? "Dieses Album ist bereits in deiner Übersicht."
          : `Album „${result.title || "Ohne Titel"}“ wurde hinzugefügt.`,
      );
      close();
      onAdded(shootingId);
    } catch (err: any) {
      const status = err?.status;
      const errorCode = err?.response?.code ?? err?.data?.code;
      setScanning(false);
      setError(
        errorCode === "unknown-shooting" || status === 404
          ? "Zu diesem Code gibt es kein Album. Bitte prüfe die Eingabe oder frag deinen Fotografen."
          : "Das Album konnte nicht hinzugefügt werden. Bitte versuche es später noch einmal.",
      );
    }
    setBusy(false);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={420} purpose="form">
      <div {...stylex.props(s.body)}>
        <Heading level={5}>Album hinzufügen</Heading>

        {scanning && busy ? (
          <div {...stylex.props(s.linking)}>
            <Spinner size="lg" />
            <Text type="body" color="secondary">
              QR-Code erkannt — Album wird hinzugefügt…
            </Text>
          </div>
        ) : scanning ? (
          <QrScanner
            onResult={(value) => void submit(value)}
            onCancel={() => setScanning(false)}
          />
        ) : (
          <>
            <div {...stylex.props(s.intro)}>
              <Text type="body" color="secondary">
                Von deinem Fotografen hast du einen QR-Code bekommen — auf einer Karte,
                per E-Mail oder als Nachricht. So kommst du an deine Fotos:
              </Text>
              <ol {...stylex.props(s.steps)}>
                <li {...stylex.props(s.step)}>
                  <Text type="body" color="secondary">
                    QR-Code scannen — mit dem Knopf unten oder direkt mit der Kamera-App
                    deines Handys.
                  </Text>
                </li>
                <li {...stylex.props(s.step)}>
                  <Text type="body" color="secondary">
                    Kein QR-Code zur Hand? Gib stattdessen den 15-stelligen Album-Code ein,
                    der daneben steht.
                  </Text>
                </li>
              </ol>
            </div>

            {/* Always offered, even where the browser blocks the camera (a page
                served over plain http:// is not a secure context): the scanner
                view then says why and offers a photo of the QR code instead —
                far more helpful than a button that quietly disappears. */}
            <Button
              variant="primary"
              width="100%"
              size="lg"
              icon={<QrCode />}
              label="QR-Code scannen"
              isDisabled={busy}
              onClick={() => {
                setError("");
                setScanning(true);
              }}
            />
            <div {...stylex.props(s.divider)}>
              <span {...stylex.props(s.rule)} />
              <Text type="supporting" color="secondary">
                oder
              </Text>
              <span {...stylex.props(s.rule)} />
            </div>

            <TextInput
              width="100%"
              label="Album-Code"
              description="15 Zeichen, z. B. a7f3k9d2m5p8q1w — ein Link funktioniert auch."
              hasClear
              value={code}
              onChange={(value) => {
                setCode(value);
                if (error) setError("");
              }}
              onEnter={() => void submit(code)}
              status={error ? { type: "error", message: error } : undefined}
            />

            <div {...stylex.props(s.actions)}>
              <Button variant="secondary" label="Abbrechen" onClick={close} />
              <Button
                variant="primary"
                icon={<Add />}
                label="Hinzufügen"
                isDisabled={!code.trim() || busy}
                isLoading={busy}
                onClick={() => void submit(code)}
              />
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
