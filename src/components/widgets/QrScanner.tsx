import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ImageUp, ScanLine } from "lucide-react";

// Live QR scanner for phones: streams the back camera into a <video> and reads
// frames off a canvas. Uses the native BarcodeDetector where available
// (Android/Chrome) and lazy-loads jsQR everywhere else, so the decoder is only
// downloaded when someone actually opens the scanner.
//
// Falls back to picking a photo of the QR code when the camera is unavailable
// (denied permission, no camera, or an in-app browser without getUserMedia).

type Props = {
  // called with the raw decoded text; the parent decides what to do with it
  onResult: (value: string) => void;
  onCancel?: () => void;
};

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

const SCAN_INTERVAL_MS = 120;

const s = stylex.create({
  root: { display: "flex", flexDirection: "column", gap: 12 },
  stage: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: "var(--radius-container)",
    overflow: "hidden",
    backgroundColor: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  // viewfinder: dimmed surround plus a bright frame the user aims with
  frame: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  frameBox: {
    width: "62%",
    aspectRatio: "1 / 1",
    // longhands: stylex drops the `border` shorthand
    borderWidth: 3,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    boxShadow: "0 0 0 100vmax rgba(0,0,0,0.35)",
  },
  starting: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  // Text carries its own colour token, so white has to be passed as xstyle
  onDark: { color: "#fff" },
  errorBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: 24,
    textAlign: "center",
  },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  hidden: { display: "none" },
});

async function decodeFrame(
  canvas: HTMLCanvasElement,
  detector: BarcodeDetectorLike | null,
): Promise<string> {
  if (detector) {
    const codes = await detector.detect(canvas);
    return codes[0]?.rawValue ?? "";
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { default: jsQR } = await import("jsqr");
  return jsQR(data, width, height, { inversionAttempts: "dontInvert" })?.data ?? "";
}

export default function QrScanner({ onResult, onCancel }: Props): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // report a hit exactly once, then release the camera
  const finish = useCallback(
    (value: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      stopCamera();
      onResult(value);
    },
    [onResult, stopCamera],
  );

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const start = async () => {
      if (!window.isSecureContext) {
        setError(
          "Der Browser gibt die Kamera nur auf gesicherten Seiten frei (Adresse mit " +
            "https://). Fotografiere den QR-Code und wähle das Foto unten aus — oder " +
            "gib den Album-Code von Hand ein.",
        );
        setStarting(false);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Dieser Browser gibt keinen Zugriff auf die Kamera. Öffne die Seite in Safari " +
            "oder Chrome, wähle unten ein Foto des QR-Codes aus — oder gib den " +
            "Album-Code von Hand ein.",
        );
        setStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStarting(false);
      } catch (err: any) {
        setStarting(false);
        setError(
          err?.name === "NotAllowedError"
            ? "Kein Zugriff auf die Kamera. Erlaube den Kamerazugriff in den Browser-Einstellungen oder gib den Album-Code von Hand ein."
            : "Die Kamera konnte nicht gestartet werden. Gib den Album-Code bitte von Hand ein.",
        );
        return;
      }

      let detector: BarcodeDetectorLike | null = null;
      const Detector = (window as any).BarcodeDetector;
      if (Detector) {
        try {
          const formats: string[] = await Detector.getSupportedFormats?.();
          if (!formats || formats.includes("qr_code")) {
            detector = new Detector({ formats: ["qr_code"] });
          }
        } catch {
          detector = null;
        }
      }

      const tick = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (cancelled || doneRef.current || !video || !canvas) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            const value = await decodeFrame(canvas, detector);
            if (value) {
              finish(value);
              return;
            }
          } catch {
            /* a single unreadable frame is not an error — keep scanning */
          }
        }
        if (!cancelled && !doneRef.current) {
          timer = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS);
        }
      };
      void tick();
    };

    void start();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stopCamera();
    };
  }, [finish, stopCamera]);

  // fallback path: decode a photo/screenshot of the QR code
  const scanFile = async (file: File) => {
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      const value = await decodeFrame(canvas, null);
      bitmap.close?.();
      if (value) {
        finish(value);
      } else {
        setError("Auf diesem Bild wurde kein QR-Code gefunden. Versuche es mit einem schärferen Foto.");
      }
    } catch {
      setError("Das Bild konnte nicht gelesen werden.");
    }
  };

  return (
    <div {...stylex.props(s.root)}>
      <div {...stylex.props(s.stage)}>
        {error ? (
          <div {...stylex.props(s.errorBox)}>
            <ScanLine size={32} color="#fff" />
            <Text type="body" xstyle={s.onDark}>
              {error}
            </Text>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              aria-label="Kamerabild zum Scannen des QR-Codes"
              {...stylex.props(s.video)}
            />
            <div {...stylex.props(s.frame)}>
              <div {...stylex.props(s.frameBox)} />
            </div>
            {starting && (
              <div {...stylex.props(s.frame, s.starting)}>
                <Spinner size="lg" />
                <Text type="body" xstyle={s.onDark}>
                  Kamera wird gestartet…
                </Text>
              </div>
            )}
          </>
        )}
      </div>

      {!error && (
        <Text type="supporting" color="secondary">
          Halte den QR-Code deines Fotografen in den Rahmen — der Rest passiert automatisch.
        </Text>
      )}

      <div {...stylex.props(s.actions)}>
        <Button
          variant="secondary"
          size="sm"
          icon={<ImageUp />}
          label="Foto des QR-Codes auswählen"
          onClick={() => fileRef.current?.click()}
        />
        {onCancel && (
          <Button variant="ghost" size="sm" label="Code von Hand eingeben" onClick={onCancel} />
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        {...stylex.props(s.hidden)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void scanFile(file);
        }}
      />
      <canvas ref={canvasRef} {...stylex.props(s.hidden)} />
    </div>
  );
}
