import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
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

const EMAIL_RE = /\S+@\S+\.\S+/;

const s = stylex.create({
  head: { textAlign: "center", display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  names: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr" },
    gap: 16,
  },
  center: { display: "flex", justifyContent: "center", marginTop: 16 },
  link: { fontSize: "0.875rem", color: "var(--color-text-accent)", textDecoration: "none" },
});

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
    if (signUpData.firstName === "") return false;
    if (signUpData.lastName === "") return false;
    if (signUpData.email === "" || !EMAIL_RE.test(signUpData.email)) return false;
    return signUpData.password.length >= 8;
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

  const emailInvalid = Boolean(signUpData.email && !EMAIL_RE.test(signUpData.email));
  const passwordInvalid = Boolean(signUpData.password && signUpData.password.length < 8);

  return (
    <AuthHero maxWidth={520}>
      <div {...stylex.props(s.head)}>
        <Heading level={6} accessibilityLevel={2}>
          Registrieren
        </Heading>
        <Text type="body" color="secondary">
          {shootingId
            ? "Erstelle ein Konto, um dein Album zu sehen. Du hast schon eines? Unten anmelden — das Album wird automatisch verknüpft."
            : "Bitte gib deinen Namen, deine E-Mail-Adresse und ein Passwort ein."}
        </Text>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void signUp();
        }}
        {...stylex.props(s.form)}
      >
        <div {...stylex.props(s.names)}>
          <TextInput
            isRequired
            width="100%"
            label="Vorname"
            value={signUpData.firstName}
            onChange={(v) => setSignUpData({ ...signUpData, firstName: v })}
          />
          <TextInput
            isRequired
            width="100%"
            label="Nachname"
            value={signUpData.lastName}
            onChange={(v) => setSignUpData({ ...signUpData, lastName: v })}
          />
        </div>
        <TextInput
          isRequired
          width="100%"
          label="E-Mail-Adresse"
          type="email"
          value={signUpData.email}
          onChange={(v) => setSignUpData({ ...signUpData, email: v })}
          status={
            emailInvalid
              ? { type: "error", message: "Bitte gib eine gültige E-Mail-Adresse ein." }
              : undefined
          }
        />
        <TextInput
          isRequired
          width="100%"
          label="Passwort"
          type="password"
          value={signUpData.password}
          onChange={(v) => setSignUpData({ ...signUpData, password: v })}
          status={
            passwordInvalid
              ? { type: "error", message: "Mindestens 8 Zeichen." }
              : undefined
          }
        />
        <Button
          type="submit"
          width="100%"
          size="lg"
          variant="primary"
          label="Registrieren"
          isDisabled={!isSignUpDataValid()}
        />
      </form>
      <div {...stylex.props(s.center)}>
        <Link
          to={shootingId ? `/login?shootingId=${shootingId}` : "/login"}
          {...stylex.props(s.link)}
        >
          Du hast bereits einen Account? Hier anmelden
        </Link>
      </div>
    </AuthHero>
  );
}
