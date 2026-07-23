import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Spinner } from "@astryxdesign/core/Spinner";
import * as stylex from "@stylexjs/stylex";
import { MailCheck as MarkEmailRead } from "lucide-react";
import { ReactElement, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { pb } from "../../config/pocketbase";

type Status = "checking" | "verified" | "pending" | "error" | "anonymous";

const s = stylex.create({
  container: { maxWidth: 560, margin: "64px auto", padding: "0 16px" },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    textAlign: "center",
    padding: 32,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  icon: { color: "var(--color-accent)", fontSize: 48 },
  actions: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  full: { width: "100%" },
});

export default function VerifyEmailPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("checking");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (token) {
        // arrived via the link in the verification email
        try {
          await pb.collection("users").confirmVerification(token);
          setStatus("verified");
        } catch (error) {
          console.error("verification failed", error);
          setStatus("error");
        }
        return;
      }

      const user: any = pb.authStore.model;
      if (!user) {
        setStatus("anonymous");
      } else if (user.verified) {
        setStatus("verified");
      } else {
        setStatus("pending");
      }
    };
    void run();
  }, [token]);

  const resend = async () => {
    const email = (pb.authStore.model as any)?.email;
    if (!email) return;
    setResending(true);
    try {
      await pb.collection("users").requestVerification(email);
      toast.success("Verifizierungsmail wurde erneut gesendet.");
    } catch (error) {
      console.error(error);
      toast.error("Senden fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div {...stylex.props(s.container)}>
      <div {...stylex.props(s.card)}>
        <MarkEmailRead {...stylex.props(s.icon)} />
        <Heading level={5} accessibilityLevel={1}>
          E-Mail-Verifizierung
        </Heading>

        {status === "checking" && <Spinner size="md" />}

        {status === "verified" && (
          <>
            <div {...stylex.props(s.full)}>
              <Banner status="success" title="Deine E-Mail-Adresse ist bestätigt." />
            </div>
            <Button variant="primary" label="Zum Album" onClick={() => navigate("/album")} />
          </>
        )}

        {status === "pending" && (
          <>
            <div {...stylex.props(s.full)}>
              <Banner
                status="info"
                title="Bitte bestätige deine E-Mail-Adresse"
                description="Wir haben dir eine E-Mail mit einem Bestätigungslink geschickt. Bitte prüfe auch den Spam-Ordner."
              />
            </div>
            <div {...stylex.props(s.actions)}>
              <Button
                variant="secondary"
                label="Erneut senden"
                isLoading={resending}
                onClick={() => void resend()}
              />
              <Button
                variant="primary"
                label="Weiter zum Album"
                onClick={() => navigate("/album")}
              />
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div {...stylex.props(s.full)}>
              <Banner
                status="error"
                title="Der Bestätigungslink ist ungültig oder abgelaufen."
              />
            </div>
            <Button variant="primary" label="Zur Anmeldung" onClick={() => navigate("/login")} />
          </>
        )}

        {status === "anonymous" && (
          <>
            <div {...stylex.props(s.full)}>
              <Banner
                status="info"
                title="Bitte melde dich an, um den Status deiner Verifizierung zu sehen."
              />
            </div>
            <Button variant="primary" label="Zur Anmeldung" onClick={() => navigate("/login")} />
          </>
        )}
      </div>
    </div>
  );
}
