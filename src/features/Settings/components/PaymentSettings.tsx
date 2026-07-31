import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Switch } from "@astryxdesign/core/Switch";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { CreditCard, ChevronDown as ExpandMore, CircleHelp as HelpOutline } from "lucide-react";
import { ReactElement, useEffect, useState } from "react";
import { toast } from "react-toastify";

import HelpHint from "../../../components/widgets/HelpHint";
import { pb } from "../../../config/pocketbase";
import { SETTINGS_RECORD_ID } from "../../../config/settings";
import { useSettings } from "../../../context/SettingsContext";

const s = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 1000px)": "1fr 1fr" },
    gap: 24,
    alignItems: "start",
  },
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottom: "1px solid var(--color-border)",
  },
  headText: { flex: 1, minWidth: 0 },
  titleRow: { display: "flex", alignItems: "center", gap: 4 },
  headAction: { flexShrink: 0 },
  body: { padding: 16, display: "flex", flexDirection: "column", gap: 16 },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
  avatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "var(--radius-full)",
    backgroundColor: "var(--color-background-muted)",
    fontWeight: 800,
    fontStyle: "italic",
  },
  guide: {
    marginTop: 8,
    borderRadius: "var(--radius-element)",
    border: "1px solid var(--color-border)",
    padding: "8px 12px",
  },
  guideSummary: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 },
  ol: { paddingLeft: 20, margin: "12px 0", display: "flex", flexDirection: "column", gap: 10 },
  span: { display: "flex", flexDirection: "column", gap: 8 },
});

function StatusChip({ active }: { active: boolean }) {
  return (
    <Badge
      variant={active ? "success" : "neutral"}
      label={active ? "Aktiv" : "Nicht eingerichtet"}
    />
  );
}

// Step-by-step guides are written for photographers without technical
// background — plain language, one action per step.
function Guide({ title, steps, hint }: { title: string; steps: string[]; hint?: string }) {
  return (
    <details {...stylex.props(s.guide)}>
      <summary {...stylex.props(s.guideSummary)}>
        <HelpOutline />
        <Text type="body" weight="semibold">{title}</Text>
        <ExpandMore />
      </summary>
      <ol {...stylex.props(s.ol)}>
        {steps.map((step) => (
          <li key={step}>
            <Text type="body">{step}</Text>
          </li>
        ))}
      </ol>
      {hint && <Banner status="info" title={hint} />}
    </details>
  );
}

// Shared PayPal + Stripe configuration form. Secrets are validated and stored
// server-side via /api/custom/{paypal,stripe}/config and never touch the
// public settings collection. Used both on the standalone payments admin page
// and inline in the setup wizard (compact hides the closing summary alert).
export default function PaymentSettings({ compact = false }: { compact?: boolean }): ReactElement {
  const { settings, refresh } = useSettings();

  const [paypalClientId, setPaypalClientId] = useState(settings.paypalClientId);
  const [paypalSecret, setPaypalSecret] = useState("");
  const [paypalBusinessEmail, setPaypalBusinessEmail] = useState(settings.paypalBusinessEmail);
  const [paypalLive, setPaypalLive] = useState(Boolean(settings.paypalLiveMode));
  const [stripeKey, setStripeKey] = useState("");
  const [savingPaypal, setSavingPaypal] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);

  useEffect(() => {
    setPaypalClientId(settings.paypalClientId);
    setPaypalBusinessEmail(settings.paypalBusinessEmail);
    setPaypalLive(Boolean(settings.paypalLiveMode));
  }, [settings.paypalClientId, settings.paypalBusinessEmail, settings.paypalLiveMode]);

  const savePaypal = async () => {
    setSavingPaypal(true);
    try {
      const clientId = paypalClientId.trim();
      const secret = paypalSecret.trim();
      // (re)configure credentials when a secret is entered, or disable when the
      // client id is cleared. The secret is validated against PayPal server-side.
      if (clientId === "") {
        await pb.send("/api/custom/paypal/config", {
          method: "POST",
          body: { clientId: "", secret: "", live: paypalLive },
        });
      } else if (secret !== "") {
        await pb.send("/api/custom/paypal/config", {
          method: "POST",
          body: { clientId, secret, live: paypalLive },
        });
      }
      // the business email is informational only (public setting)
      await pb.collection("settings").update(SETTINGS_RECORD_ID, {
        paypalBusinessEmail: paypalBusinessEmail.trim(),
      });
      await refresh();
      setPaypalSecret("");
      toast.success(
        clientId === ""
          ? "PayPal wurde deaktiviert"
          : paypalLive
            ? "PayPal gespeichert (Live-Modus)"
            : "PayPal gespeichert (Testmodus — es fließt kein echtes Geld)"
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.message ?? "Speichern fehlgeschlagen");
    } finally {
      setSavingPaypal(false);
    }
  };

  const saveStripe = async (secretKey: string) => {
    setSavingStripe(true);
    try {
      const res = await pb.send("/api/custom/stripe/config", {
        method: "POST",
        body: { secretKey },
      });
      await refresh();
      setStripeKey("");
      if (res.enabled) {
        toast.success(
          res.liveMode
            ? "Stripe ist eingerichtet (Live-Modus)"
            : "Stripe ist eingerichtet (Testmodus — es fließt kein echtes Geld)"
        );
      } else {
        toast.success("Kartenzahlung wurde deaktiviert");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.message ?? "Der Schlüssel konnte nicht gespeichert werden");
    } finally {
      setSavingStripe(false);
    }
  };

  return (
    <div {...stylex.props(s.grid)}>
      {/* ── Stripe ── */}
      {/* data-testid: Ankerpunkt für die E2E-Suite (Screenshot-Zuschnitt). */}
      <div data-testid="zahlungsart:stripe" {...stylex.props(s.card)}>
        <div {...stylex.props(s.header)}>
          <span {...stylex.props(s.avatar)}><CreditCard /></span>
          <div {...stylex.props(s.headText)}>
            <div {...stylex.props(s.titleRow)}>
              <Heading level={6}>Kreditkarte, Apple Pay & Google Pay (Stripe)</Heading>
              <HelpHint slug="zahlungen-stripe" />
            </div>
            <Text type="supporting" color="secondary">Kunden zahlen auf einer sicheren Stripe-Bezahlseite</Text>
          </div>
          <span {...stylex.props(s.headAction)}><StatusChip active={settings.stripeEnabled} /></span>
        </div>
        <div {...stylex.props(s.body)}>
          <Text type="body" color="secondary">
            Füge hier deinen geheimen Stripe-Schlüssel ein. Er wird sicher auf
            deinem Server gespeichert und nie im Browser angezeigt.
          </Text>
          <TextInput
            width="100%"
            type="password"
            label="Geheimer Stripe-Schlüssel"
            placeholder="sk_live_…"
            value={stripeKey}
            onChange={(v) => setStripeKey(v)}
            description={
              settings.stripeEnabled
                ? "Ein Schlüssel ist hinterlegt. Zum Ersetzen einfach den neuen einfügen und speichern."
                : "Wo du den Schlüssel findest, steht in der Anleitung unten."
            }
          />
          <div {...stylex.props(s.row)}>
            <Button
              variant="primary"
              label="Speichern & prüfen"
              isDisabled={savingStripe || stripeKey.trim() === ""}
              isLoading={savingStripe}
              onClick={() => void saveStripe(stripeKey.trim())}
            />
            {settings.stripeEnabled && (
              <Button
                variant="destructive"
                label="Kartenzahlung deaktivieren"
                isDisabled={savingStripe}
                onClick={() => void saveStripe("")}
              />
            )}
          </div>

          <Guide
            title="Anleitung: Stripe in 5 Schritten einrichten"
            steps={[
              "Öffne stripe.com und klicke auf „Jetzt starten“. Erstelle ein kostenloses Konto mit deiner E-Mail-Adresse und bestätige sie.",
              "Stripe fragt nach Angaben zu deinem Unternehmen und deinem Bankkonto — dorthin überweist Stripe später das Geld deiner Kunden. Fülle das einmalig aus.",
              "Melde dich im Stripe-Dashboard (dashboard.stripe.com) an und öffne links unten „Entwickler“ und dann „API-Schlüssel“.",
              "Suche die Zeile „Geheimschlüssel“ (beginnt mit sk_live_), klicke auf „Anzeigen“ und kopiere den Schlüssel.",
              "Füge den Schlüssel oben in das Feld ein und klicke auf „Speichern & prüfen“. Die App testet den Schlüssel automatisch — danach können deine Kunden mit Karte, Apple Pay und Google Pay bezahlen.",
            ]}
            hint={
              "Zum gefahrlosen Ausprobieren: Aktiviere im Stripe-Dashboard oben rechts den „Testmodus“ und verwende den Test-Geheimschlüssel (sk_test_…). " +
              "Beim Bezahlen kannst du dann die Testkarte 4242 4242 4242 4242 mit beliebigem Datum und Prüfziffer nutzen — es fließt kein echtes Geld. " +
              "Für echte Zahlungen anschließend den sk_live_-Schlüssel eintragen."
            }
          />
        </div>
      </div>

      {/* ── PayPal ── */}
      <div data-testid="zahlungsart:paypal" {...stylex.props(s.card)}>
        <div {...stylex.props(s.header)}>
          <span {...stylex.props(s.avatar)}>P</span>
          <div {...stylex.props(s.headText)}>
            <div {...stylex.props(s.titleRow)}>
              <Heading level={6}>PayPal</Heading>
              <HelpHint slug="zahlungen-paypal" />
            </div>
            <Text type="supporting" color="secondary">Kunden zahlen mit ihrem PayPal-Konto direkt auf der Seite</Text>
          </div>
          <span {...stylex.props(s.headAction)}><StatusChip active={Boolean(settings.paypalEnabled)} /></span>
        </div>
        <div {...stylex.props(s.body)}>
          <Text type="body" color="secondary">
            Client-ID und Secret werden sicher auf deinem Server gespeichert und
            gegen PayPal geprüft. Das Secret wird nie im Browser angezeigt.
          </Text>
          <TextInput
            width="100%"
            label="PayPal Client-ID"
            value={paypalClientId}
            onChange={(v) => setPaypalClientId(v)}
            description="Leer lassen und speichern, um PayPal zu deaktivieren."
          />
          <TextInput
            width="100%"
            type="password"
            label="PayPal Secret"
            placeholder="••••••••"
            value={paypalSecret}
            onChange={(v) => setPaypalSecret(v)}
            description={
              settings.paypalEnabled
                ? "Ein Secret ist hinterlegt. Zum Ersetzen neu eingeben."
                : "Das Secret steht in der PayPal-App direkt neben der Client-ID."
            }
          />
          <TextInput
            width="100%"
            type="email"
            label="PayPal-Geschäftskonto (E-Mail)"
            value={paypalBusinessEmail}
            onChange={(v) => setPaypalBusinessEmail(v)}
          />
          <Switch
            label={paypalLive ? "Live-Modus (echte Zahlungen)" : "Testmodus (Sandbox — kein echtes Geld)"}
            value={paypalLive}
            onChange={(checked) => setPaypalLive(checked)}
          />
          <div {...stylex.props(s.row)}>
            <Button
              variant="primary"
              label="Speichern & prüfen"
              isDisabled={savingPaypal}
              isLoading={savingPaypal}
              onClick={() => void savePaypal()}
            />
          </div>

          <Guide
            title="Anleitung: PayPal in 5 Schritten einrichten"
            steps={[
              "Du brauchst ein PayPal-Geschäftskonto (kostenlos). Falls du nur ein privates Konto hast: Auf paypal.de anmelden und unter „Konto-Einstellungen“ in ein Geschäftskonto umwandeln.",
              "Öffne developer.paypal.com und melde dich dort mit demselben PayPal-Konto an.",
              "Oben auf der Seite gibt es einen Schalter „Sandbox / Live“ — stelle ihn auf „Live“.",
              "Klicke im Menü auf „Apps & Credentials“ und dann auf „Create App“. Gib einen beliebigen Namen ein (z. B. „Fotogalerie“) und bestätige.",
              "Auf der nächsten Seite wird die „Client ID“ angezeigt. Kopiere sie, füge sie oben in das Feld ein und klicke auf „Speichern“. Zahlungen landen direkt auf deinem PayPal-Konto.",
            ]}
            hint={
              "Zum Ausprobieren ohne echtes Geld: Lass den Schalter auf „Sandbox“, erstelle die App dort und nutze die Sandbox-Client-ID. " +
              "Denk daran, sie vor dem echten Betrieb gegen die Live-Client-ID zu tauschen."
            }
          />
        </div>
      </div>

      {!compact && (
        <div style={{ gridColumn: "1 / -1" }}>
          <Banner
            status="info"
            title="Sind beide Anbieter eingerichtet, kann der Kunde beim Bezahlen frei wählen. Ist keiner eingerichtet, sehen Kunden den Hinweis, dich direkt zu kontaktieren."
          />
        </div>
      )}
    </div>
  );
}
