import { FormEvent, ReactElement, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { pb } from "../../config/pocketbase";
import AuthHero from "../../components/layout/AuthHero";

export default function ResetPasswordPage(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  // token comes from the email link (?token=...); location.state is the
  // legacy in-app fallback
  const resetToken = searchParams.get("token") ?? (location.state as string | null);

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { password, passwordRepeated } = (event.target as HTMLFormElement)
      .elements as any;
    if (password.value.length < 8) {
      toast.error("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password.value !== passwordRepeated.value) {
      toast.error("Die Passwörter stimmen nicht überein.");
      return;
    }
    if (!resetToken) {
      toast.error("Ungültiger oder fehlender Link. Bitte fordere einen neuen an.");
      return;
    }
    setLoading(true);
    try {
      await pb
        .collection("users")
        .confirmPasswordReset(resetToken, password.value, passwordRepeated.value);
      toast.success("Passwort erfolgreich zurückgesetzt.");
      navigate("/login");
    } catch (error) {
      toast.error("Fehler beim Zurücksetzen des Passworts. Der Link ist möglicherweise abgelaufen.");
      console.error("Error on resetting password: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthHero>
      <Typography variant="h6" component="h2" align="center">
        Passwort zurücksetzen
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
        Gib ein neues Passwort ein (mindestens 8 Zeichen).
      </Typography>
      <Box component="form" noValidate onSubmit={handleResetPassword} sx={{ mt: 1 }}>
        <TextField
          type="password"
          margin="normal"
          required
          fullWidth
          id="password"
          label="Neues Passwort"
          name="password"
          autoComplete="new-password"
          /* eslint-disable-next-line jsx-a11y/no-autofocus */
          autoFocus
        />
        <TextField
          type="password"
          margin="normal"
          required
          fullWidth
          id="passwordRepeated"
          label="Passwort wiederholen"
          name="passwordRepeated"
          autoComplete="new-password"
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Passwort zurücksetzen"}
        </Button>
      </Box>
    </AuthHero>
  );
}
