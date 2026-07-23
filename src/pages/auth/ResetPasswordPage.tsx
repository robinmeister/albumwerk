import { FormEvent, ReactElement, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { pb } from "../../config/pocketbase";
import AuthHero from "../../components/layout/AuthHero";

const s = stylex.create({
  head: { textAlign: "center", display: "flex", flexDirection: "column", gap: 8 },
  form: { display: "flex", flexDirection: "column", gap: 16, marginTop: 16 },
});

export default function ResetPasswordPage(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordRepeated, setPasswordRepeated] = useState("");
  // token comes from the email link (?token=...); location.state is the
  // legacy in-app fallback
  const resetToken = searchParams.get("token") ?? (location.state as string | null);

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== passwordRepeated) {
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
        .confirmPasswordReset(resetToken, password, passwordRepeated);
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
      <div {...stylex.props(s.head)}>
        <Heading level={6} accessibilityLevel={2}>
          Passwort zurücksetzen
        </Heading>
        <Text type="body" color="secondary">
          Gib ein neues Passwort ein (mindestens 8 Zeichen).
        </Text>
      </div>
      <form noValidate onSubmit={handleResetPassword} {...stylex.props(s.form)}>
        <TextInput
          type="password"
          isRequired
          width="100%"
          label="Neues Passwort"
          hasAutoFocus
          value={password}
          onChange={(v) => setPassword(v)}
        />
        <TextInput
          type="password"
          isRequired
          width="100%"
          label="Passwort wiederholen"
          value={passwordRepeated}
          onChange={(v) => setPasswordRepeated(v)}
        />
        <Button
          type="submit"
          width="100%"
          size="lg"
          variant="primary"
          isLoading={loading}
          label="Passwort zurücksetzen"
        />
      </form>
    </AuthHero>
  );
}
