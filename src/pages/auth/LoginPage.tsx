import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ReactElement, useState } from "react";

import { loginWithPocketBase } from "../../config/pocketbase";
import AuthHero from "../../components/layout/AuthHero";

export default function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const shootingId = searchParams.get("shootingId");

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithPocketBase(email, password);
      navigate(shootingId ? `/album?shootingId=${shootingId}` : "/album");
    } catch (err: any) {
      // status 0 = network/unreachable; anything else from authWithPassword is
      // effectively "wrong credentials"
      if (err?.status === 0) {
        setError("Verbindung fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.");
      } else {
        setError("E-Mail-Adresse oder Passwort ist falsch.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthHero>
      <Box component="form" onSubmit={handleSignIn} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          label="E-Mail-Adresse"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Passwort"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Box display="flex" justifyContent="flex-end" sx={{ mt: 0.5 }}>
          <Link to="/forgotPassword" style={{ fontSize: "0.875rem" }}>
            Passwort vergessen?
          </Link>
        </Box>
        {error && (
          <Typography color="error" sx={{ mt: 1 }} variant="body2">
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Anmelden"}
        </Button>
        <Box display="flex" justifyContent="center">
          <Link
            to={shootingId ? `/signUp?shootingId=${shootingId}` : "/signUp"}
            style={{ fontSize: "0.875rem" }}
          >
            Noch kein Konto? Jetzt registrieren
          </Link>
        </Box>
      </Box>
    </AuthHero>
  );
}
