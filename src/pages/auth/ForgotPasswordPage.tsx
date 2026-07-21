import { Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FormEvent, ReactElement, useState } from "react";

import { pb } from "../../config/pocketbase";
import AuthHero from "../../components/layout/AuthHero";

export default function ForgotPasswordPage(): ReactElement {
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { email } = (event.target as HTMLFormElement).elements as any;
    setLoading(true);
    try {
      await pb.collection("users").requestPasswordReset(email.value);
      toast.success(
        "Schau in dein E-Mail-Postfach nach weiteren Anweisungen — gegebenenfalls auch im Spam-Ordner.",
      );
    } catch (error: any) {
      toast.error("Anfrage fehlgeschlagen. Bitte versuche es später erneut.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthHero>
      <Typography variant="h6" component="h2" align="center">
        Passwort vergessen?
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
        Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum
        Zurücksetzen deines Passworts.
      </Typography>
      <Box component="form" noValidate onSubmit={handleForgotPassword} sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="E-Mail-Adresse"
          name="email"
          type="email"
          autoComplete="email"
          /* eslint-disable-next-line jsx-a11y/no-autofocus */
          autoFocus
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Link anfordern"}
        </Button>
        <Box display="flex" justifyContent="center">
          <Link to="/login" style={{ fontSize: "0.875rem" }}>
            Zurück zum Login
          </Link>
        </Box>
      </Box>
    </AuthHero>
  );
}
