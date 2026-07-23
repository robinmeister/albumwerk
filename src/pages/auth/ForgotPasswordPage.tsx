import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FormEvent, ReactElement, useState } from "react";

import { pb } from "../../config/pocketbase";
import AuthHero from "../../components/layout/AuthHero";

const s = stylex.create({
  head: { textAlign: "center", display: "flex", flexDirection: "column", gap: 8 },
  form: { display: "flex", flexDirection: "column", gap: 16, marginTop: 16 },
  center: { display: "flex", justifyContent: "center" },
  link: { fontSize: "0.875rem", color: "var(--color-text-accent)", textDecoration: "none" },
});

export default function ForgotPasswordPage(): ReactElement {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await pb.collection("users").requestPasswordReset(email);
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
      <div {...stylex.props(s.head)}>
        <Heading level={6} accessibilityLevel={2}>
          Passwort vergessen?
        </Heading>
        <Text type="body" color="secondary">
          Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum
          Zurücksetzen deines Passworts.
        </Text>
      </div>
      <form noValidate onSubmit={handleForgotPassword} {...stylex.props(s.form)}>
        <TextInput
          isRequired
          width="100%"
          label="E-Mail-Adresse"
          type="email"
          hasAutoFocus
          value={email}
          onChange={(v) => setEmail(v)}
        />
        <Button
          type="submit"
          width="100%"
          size="lg"
          variant="primary"
          isLoading={loading}
          label="Link anfordern"
        />
        <div {...stylex.props(s.center)}>
          <Link to="/login" {...stylex.props(s.link)}>
            Zurück zum Login
          </Link>
        </div>
      </form>
    </AuthHero>
  );
}
