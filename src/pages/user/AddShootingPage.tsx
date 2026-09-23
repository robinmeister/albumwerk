import { ReactElement, useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import AuthHero from "../../components/layout/AuthHero";
import { currentUser } from "../../config/currentUser";
import { linkShootingToCurrentUser } from "../../config/pocketbase";
import { parseShootingId } from "../../utils/shootingLink";

// Landing page for a scanned QR code / shared album link (/addAlbum/:shootingId).
// Signed in: the album is added to the account and opened right away.
// Signed out: straight on to registration, which links the album on signup.
// Nothing here needs a decision from the customer — scanning is the whole flow.

const s = stylex.create({
  box: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" },
  // Setzt die Aktion als eigenen, abgesetzten Abschnitt ab (Entwurf:
  // album-hinzufuegen-{desktop,mobil}.html trennt die Handlung von der
  // Meldung darueber durch eine eigene Flaeche/Trennlinie), statt sie im
  // gleichmaessigen gap:16-Fluss der Box mitlaufen zu lassen. Gleiches Muster
  // wie LegalPage.tsx (Commit cbf95192) und die Terminseiten (Commit 5900e639).
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid var(--color-border)",
  },
});

export default function AddShootingPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  const shootingId = parseShootingId(
    params.shootingId ?? new URLSearchParams(location.search).get("shootingId") ?? "",
  );

  useEffect(() => {
    // StrictMode mounts effects twice in dev — link only once
    if (startedRef.current) return;
    startedRef.current = true;

    if (!shootingId) {
      setError(
        "Dieser Link enthält keinen gültigen Album-Code. Bitte scanne den QR-Code deines Fotografen noch einmal.",
      );
      return;
    }

    const user = currentUser();
    if (!user) {
      // registration links the album for us (pb_hooks/signup.pb.js)
      navigate(`/signUp?shootingId=${shootingId}`, { replace: true });
      return;
    }
    if ((user as any).isAdmin) {
      toast.info("Als Fotograf siehst du bereits alle Alben.");
      navigate("/album", { replace: true });
      return;
    }

    void (async () => {
      try {
        const result = await linkShootingToCurrentUser(shootingId);
        toast.success(
          result.alreadyLinked
            ? "Dieses Album ist bereits in deiner Übersicht."
            : `Album „${result.title || "Ohne Titel"}“ wurde hinzugefügt.`,
        );
        navigate(`/album?shootingId=${shootingId}`, { replace: true });
      } catch (err: any) {
        const code = err?.response?.code ?? err?.data?.code;
        setError(
          code === "unknown-shooting"
            ? "Zu diesem Code gibt es kein Album. Möglicherweise wurde es gelöscht — frag am besten deinen Fotografen."
            : "Das Album konnte nicht hinzugefügt werden. Bitte versuche es später noch einmal.",
        );
      }
    })();
  }, [shootingId, navigate]);

  return (
    <AuthHero maxWidth={440}>
      <div {...stylex.props(s.box)}>
        {error ? (
          <>
            <Heading level={6} accessibilityLevel={1}>
              Album nicht gefunden
            </Heading>
            <Text type="body" color="secondary">
              {error}
            </Text>
            <div {...stylex.props(s.actions)}>
              <Button
                variant="primary"
                width="100%"
                label={currentUser() ? "Zu meinen Alben" : "Zur Anmeldung"}
                onClick={() => navigate(currentUser() ? "/album" : "/login", { replace: true })}
              />
            </div>
          </>
        ) : (
          <>
            <Spinner size="lg" />
            <Heading level={6} accessibilityLevel={1}>
              Album wird geöffnet…
            </Heading>
            <Text type="body" color="secondary">
              Einen Moment — dein Album wird deinem Konto hinzugefügt.
            </Text>
          </>
        )}
      </div>
    </AuthHero>
  );
}
