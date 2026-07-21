import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { CreditCard, ExpandMore, HelpOutline } from "@mui/icons-material";
import { ReactElement, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { pb } from "../../../config/pocketbase";
import { SETTINGS_RECORD_ID } from "../../../config/settings";
import { useSettings } from "../../../context/SettingsContext";

function StatusChip({ active }: { active: boolean }) {
  return (
    <Chip
      label={active ? "Aktiv" : "Nicht eingerichtet"}
      color={active ? "success" : "default"}
      size="small"
    />
  );
}

// Step-by-step guides are written for photographers without technical
// background — plain language, one action per step.
function Guide({ title, steps, hint }: { title: string; steps: string[]; hint?: string }) {
  return (
    <Accordion variant="outlined" sx={{ mt: 2, "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box display="flex" alignItems="center" gap={1}>
          <HelpOutline fontSize="small" color="action" />
          <Typography fontWeight={600}>{title}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box component="ol" sx={{ pl: 2.5, m: 0, "& li": { mb: 1.25 } }}>
          {steps.map((step) => (
            <Typography component="li" variant="body2" key={step}>
              {step}
            </Typography>
          ))}
        </Box>
        {hint && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {hint}
          </Alert>
        )}
      </AccordionDetails>
    </Accordion>
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
    <Grid container spacing={3}>
      {/* ── Stripe ── */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardHeader
            avatar={<CreditCard />}
            title="Kreditkarte, Apple Pay & Google Pay (Stripe)"
            subheader="Kunden zahlen auf einer sicheren Stripe-Bezahlseite"
            action={<StatusChip active={settings.stripeEnabled} />}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Füge hier deinen geheimen Stripe-Schlüssel ein. Er wird sicher auf
              deinem Server gespeichert und nie im Browser angezeigt.
            </Typography>
            <TextField
              fullWidth
              type="password"
              label="Geheimer Stripe-Schlüssel"
              placeholder="sk_live_…"
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              helperText={
                settings.stripeEnabled
                  ? "Ein Schlüssel ist hinterlegt. Zum Ersetzen einfach den neuen einfügen und speichern."
                  : "Wo du den Schlüssel findest, steht in der Anleitung unten."
              }
            />
            <Box display="flex" gap={1} mt={2}>
              <Button
                variant="contained"
                disabled={savingStripe || stripeKey.trim() === ""}
                onClick={() => void saveStripe(stripeKey.trim())}
              >
                Speichern & prüfen
              </Button>
              {settings.stripeEnabled && (
                <Button
                  color="error"
                  disabled={savingStripe}
                  onClick={() => void saveStripe("")}
                >
                  Kartenzahlung deaktivieren
                </Button>
              )}
            </Box>

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
          </CardContent>
        </Card>
      </Grid>

      {/* ── PayPal ── */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardHeader
            avatar={
              <Box component="span" sx={{ fontWeight: 800, fontStyle: "italic" }}>
                P
              </Box>
            }
            title="PayPal"
            subheader="Kunden zahlen mit ihrem PayPal-Konto direkt auf der Seite"
            action={<StatusChip active={Boolean(settings.paypalEnabled)} />}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Client-ID und Secret werden sicher auf deinem Server gespeichert und
              gegen PayPal geprüft. Das Secret wird nie im Browser angezeigt.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="PayPal Client-ID"
                  value={paypalClientId}
                  onChange={(e) => setPaypalClientId(e.target.value)}
                  helperText="Leer lassen und speichern, um PayPal zu deaktivieren."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="PayPal Secret"
                  placeholder="••••••••"
                  value={paypalSecret}
                  onChange={(e) => setPaypalSecret(e.target.value)}
                  helperText={
                    settings.paypalEnabled
                      ? "Ein Secret ist hinterlegt. Zum Ersetzen neu eingeben."
                      : "Das Secret steht in der PayPal-App direkt neben der Client-ID."
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="email"
                  label="PayPal-Geschäftskonto (E-Mail)"
                  value={paypalBusinessEmail}
                  onChange={(e) => setPaypalBusinessEmail(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={paypalLive}
                      onChange={(e) => setPaypalLive(e.target.checked)}
                    />
                  }
                  label={paypalLive ? "Live-Modus (echte Zahlungen)" : "Testmodus (Sandbox — kein echtes Geld)"}
                />
              </Grid>
            </Grid>
            <Box mt={2}>
              <Button
                variant="contained"
                disabled={savingPaypal}
                onClick={() => void savePaypal()}
              >
                Speichern & prüfen
              </Button>
            </Box>

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
          </CardContent>
        </Card>
      </Grid>

      {!compact && (
        <Grid item xs={12}>
          <Alert severity="info">
            Sind beide Anbieter eingerichtet, kann der Kunde beim Bezahlen frei
            wählen. Ist keiner eingerichtet, sehen Kunden den Hinweis, dich
            direkt zu kontaktieren.
          </Alert>
        </Grid>
      )}
    </Grid>
  );
}
