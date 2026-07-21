import { Box, Button, Grid, TextField, Typography } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ReactElement, useState } from "react";

import { loginWithPocketBase, pb, signUpWithPocketBase } from "../../config/pocketbase";
import AuthHero from "../../components/layout/AuthHero";

interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export default function SignUpPage(): ReactElement {
  const navigate = useNavigate();
  const [signUpData, setSignUpData] = useState<SignUpData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const shootingId = searchParams.get("shootingId");

  const isSignUpDataValid = () => {
    const emailRegex = /\S+@\S+\.\S+/;
    if (signUpData.firstName === "") return false;
    if (signUpData.lastName === "") return false;
    if (signUpData.email === "" || !emailRegex.test(signUpData.email)) return false;
    return signUpData.password.length >= 8;
  };

  const handleSignUp = async (event: any) => {
    event.preventDefault();
    void signUp();
  };

  const signUp = async () => {
    if (signUpData.email === "") return;
    if (signUpData.password.length < 8) {
      toast.error("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    try {
      // Server-side route creates the user and links the shooting
      // (users.shootingIds / shootings.userIds) without admin rights.
      await signUpWithPocketBase({
        email: signUpData.email,
        password: signUpData.password,
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        shootingId: shootingId ?? "",
      });
      await loginWithPocketBase(signUpData.email, signUpData.password);
      // fire-and-forget: verification link goes out via the instance's SMTP
      pb.collection("users").requestVerification(signUpData.email).catch(console.error);

      navigate("/verifyEmail");
      toast.success(
        "Erfolgreich registriert! Bitte prüfe deinen Posteingang für die Verifizierungsmail.",
      );
    } catch (error: any) {
      const code = error?.response?.code ?? error?.data?.code;
      if (code === "email-in-use") {
        toast.error("Email Adresse wird bereits verwendet");
      } else if (code === "weak-password") {
        toast.error("Das Passwort muss mindestens 8 Zeichen lang sein.");
      } else {
        toast.error("Fehler bei der Registrierung");
      }
      console.error("PocketBase signup error:", error);
    }
  };

  return (
    <AuthHero maxWidth={520}>
      <Typography variant="h6" component="h2" align="center">
        Registrieren
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, mb: 2 }}>
        {shootingId
          ? "Erstelle ein Konto, um dein Album zu sehen. Du hast schon eines? Unten anmelden — das Album wird automatisch verknüpft."
          : "Bitte gib deinen Namen, deine E-Mail-Adresse und ein Passwort ein."}
      </Typography>
      <form onKeyDown={(e) => e.key === "Enter" && handleSignUp(e)}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              id="first_name"
              label="Vorname"
              name="first_name"
              autoComplete="given-name"
              value={signUpData.firstName}
              onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              id="last_name"
              label="Nachname"
              name="last_name"
              autoComplete="family-name"
              value={signUpData.lastName}
              onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="email"
              label="E-Mail-Adresse"
              name="email"
              autoComplete="email"
              value={signUpData.email}
              onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
              error={!!(signUpData.email && !/\S+@\S+\.\S+/.test(signUpData.email))}
              helperText={
                signUpData.email &&
                !/\S+@\S+\.\S+/.test(signUpData.email) &&
                "Bitte gib eine gültige E-Mail-Adresse ein."
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              name="password"
              label="Passwort"
              type="password"
              id="password"
              autoComplete="new-password"
              value={signUpData.password}
              onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
              error={!!(signUpData.password && signUpData.password.length < 8)}
              helperText={
                !!(signUpData.password && signUpData.password.length < 8) &&
                "Mindestens 8 Zeichen."
              }
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              onClick={handleSignUp}
              variant="contained"
              size="large"
              sx={{ mt: 1, mb: 2 }}
              disabled={!isSignUpDataValid()}
            >
              Registrieren
            </Button>
          </Grid>
        </Grid>
      </form>
      <Box display="flex" justifyContent="center">
        <Link
          to={shootingId ? `/login?shootingId=${shootingId}` : "/login"}
          style={{ fontSize: "0.875rem" }}
        >
          Du hast bereits einen Account? Hier anmelden
        </Link>
      </Box>
    </AuthHero>
  );
}
