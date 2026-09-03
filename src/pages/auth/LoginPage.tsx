import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ReactElement, useState } from "react";

import { loginWithPocketBase } from "../../config/pocketbase";
import AuthHero from "../../components/layout/AuthHero";
import { sicheresZiel } from "../../utils/routes";

const s = stylex.create({
  form: { display: "flex", flexDirection: "column", gap: 16 },
  right: { display: "flex", justifyContent: "flex-end" },
  center: { display: "flex", justifyContent: "center" },
  link: { fontSize: "0.875rem", color: "var(--color-text-accent)", textDecoration: "none" },
  error: { color: "var(--color-error)" },
});

export default function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const shootingId = searchParams.get("shootingId");
  // Gesetzt, wenn jemand ausgeloggt auf einem Deep-Link gelandet ist.
  const ziel = sicheresZiel(searchParams.get("next"));

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithPocketBase(email, password);
      navigate(ziel ?? (shootingId ? `/album?shootingId=${shootingId}` : "/album"));
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
      <form onSubmit={handleSignIn} noValidate {...stylex.props(s.form)}>
        <TextInput
          isRequired
          width="100%"
          label="E-Mail-Adresse"
          type="email"
          value={email}
          onChange={(v) => setEmail(v)}
        />
        <TextInput
          isRequired
          width="100%"
          label="Passwort"
          type="password"
          value={password}
          onChange={(v) => setPassword(v)}
        />
        <div {...stylex.props(s.right)}>
          <Link to="/forgotPassword" {...stylex.props(s.link)}>
            Passwort vergessen?
          </Link>
        </div>
        {error && (
          <Text type="body" xstyle={s.error}>
            {error}
          </Text>
        )}
        <Button
          type="submit"
          width="100%"
          size="lg"
          variant="primary"
          isLoading={loading}
          label="Anmelden"
        />
        <div {...stylex.props(s.center)}>
          <Link
            to={shootingId ? `/signUp?shootingId=${shootingId}` : "/signUp"}
            {...stylex.props(s.link)}
          >
            Noch kein Konto? Jetzt registrieren
          </Link>
        </div>
      </form>
    </AuthHero>
  );
}
