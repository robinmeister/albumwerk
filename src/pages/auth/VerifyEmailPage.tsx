import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";
import { MarkEmailRead } from "@mui/icons-material";
import { ReactElement, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { pb } from "../../config/pocketbase";

type Status = "checking" | "verified" | "pending" | "error" | "anonymous";

export default function VerifyEmailPage(): ReactElement {
  const [searchParams] = useSearchParams();
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
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: "center" }}>
          <MarkEmailRead color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            E-Mail-Verifizierung
          </Typography>

          {status === "checking" && <CircularProgress sx={{ my: 2 }} />}

          {status === "verified" && (
            <>
              <Alert severity="success" sx={{ my: 2 }}>
                Deine E-Mail-Adresse ist bestätigt.
              </Alert>
              <Button component={Link} to="/album" variant="contained">
                Zum Album
              </Button>
            </>
          )}

          {status === "pending" && (
            <>
              <Alert severity="info" sx={{ my: 2 }}>
                Wir haben dir eine E-Mail mit einem Bestätigungslink
                geschickt. Bitte prüfe auch den Spam-Ordner.
              </Alert>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                <Button onClick={() => void resend()} disabled={resending}>
                  Erneut senden
                </Button>
                <Button component={Link} to="/album" variant="contained">
                  Weiter zum Album
                </Button>
              </Box>
            </>
          )}

          {status === "error" && (
            <>
              <Alert severity="error" sx={{ my: 2 }}>
                Der Bestätigungslink ist ungültig oder abgelaufen.
              </Alert>
              <Button component={Link} to="/login" variant="contained">
                Zur Anmeldung
              </Button>
            </>
          )}

          {status === "anonymous" && (
            <>
              <Alert severity="info" sx={{ my: 2 }}>
                Bitte melde dich an, um den Status deiner Verifizierung zu
                sehen.
              </Alert>
              <Button component={Link} to="/login" variant="contained">
                Zur Anmeldung
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
