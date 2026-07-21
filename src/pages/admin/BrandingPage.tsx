import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  MenuItem,
  Slider,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import {
  AppSettings,
  FontKey,
  SETTINGS_RECORD_ID,
  ThemeMode,
  settingsFileUrl,
} from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import { buildTheme } from "../../utils/theme";
import PaymentSettings from "../../features/Settings/components/PaymentSettings";

const FONT_OPTIONS: { value: FontKey; label: string }[] = [
  { value: "inter", label: "Inter (modern, serifenlos)" },
  { value: "lora", label: "Lora (klassisch, Serifen)" },
  { value: "playfair", label: "Playfair Display (elegant, Serifen)" },
  { value: "montserrat", label: "Montserrat (geometrisch, serifenlos)" },
];

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
  { value: "auto", label: "Automatisch (Systemeinstellung)" },
];

type FileFields = {
  logo: File | null;
  favicon: File | null;
  watermarkLogo: File | null;
};

function ImageDrop(props: {
  label: string;
  currentUrl: string;
  file: File | null;
  onFile: (file: File | null) => void;
}): ReactElement {
  const { label, currentUrl, file, onFile } = props;
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: { "image/*": [] },
    onDrop: (accepted) => accepted[0] && onFile(accepted[0]),
  });
  const previewUrl = file ? URL.createObjectURL(file) : currentUrl;

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: "2px dashed",
        borderColor: isDragActive ? "primary.main" : "grey.400",
        borderRadius: 1,
        p: 2,
        textAlign: "center",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 2,
        minHeight: 72,
      }}
    >
      <input {...getInputProps()} />
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={label}
          style={{ height: 48, width: 48, objectFit: "contain" }}
        />
      ) : (
        <Box sx={{ height: 48, width: 48, bgcolor: "grey.200", borderRadius: 1 }} />
      )}
      <Typography variant="body2" color="text.secondary">
        {label} — Bild hierher ziehen oder klicken
      </Typography>
    </Box>
  );
}

function ThemePreview({ draft }: { draft: AppSettings }): ReactElement {
  const previewTheme = useMemo(() => buildTheme(draft), [draft]);
  return (
    <ThemeProvider theme={previewTheme}>
      <Card sx={{ bgcolor: "background.default", overflow: "hidden" }}>
        <AppBar position="static" color="default">
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
              {draft.businessName || "Fotogalerie"}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Album
            </Typography>
          </Toolbar>
        </AppBar>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            {draft.tagline || "So sieht dein Album aus"}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Überschriften, Schrift, Farben und Hell/Dunkel folgen deinen
            Einstellungen.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Button variant="contained" color="primary">Primär</Button>
            <Button variant="outlined" color="secondary">Sekundär</Button>
          </Box>
          <Grid container spacing={0.5}>
            {[0.9, 0.75, 0.6].map((op) => (
              <Grid item xs={4} key={op}>
                <Box sx={{
                  paddingTop: "100%",
                  bgcolor: "primary.main",
                  opacity: op * 0.35,
                  borderRadius: 0.5,
                }} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </ThemeProvider>
  );
}

export default function BrandingPage(): ReactElement {
  const { settings, loaded, refresh } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setupMode = searchParams.get("setup") === "1";

  const [draft, setDraft] = useState<AppSettings>(settings);
  const [files, setFiles] = useState<FileFields>({
    logo: null,
    favicon: null,
    watermarkLogo: null,
  });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    if (loaded) setDraft(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const set = (patch: Partial<AppSettings>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const save = async (markCompleted = false) => {
    setSaving(true);
    try {
      const fd = new FormData();
      const textFields: (keyof AppSettings)[] = [
        "businessName", "shortName", "tagline", "primaryColor", "secondaryColor",
        "fontFamily", "themeMode", "contactEmail", "orderNotificationEmail",
        "websiteUrl", "customDomain", "currency",
        "imprintHtml", "privacyHtml", "watermarkText",
      ];
      textFields.forEach((f) => fd.append(f, String(draft[f] ?? "")));
      fd.append("borderRadius", String(draft.borderRadius ?? 8));
      fd.append("watermarkOpacity", String(draft.watermarkOpacity ?? 40));
      fd.append("previewMaxSize", String(draft.previewMaxSize ?? 1200));
      if (markCompleted || draft.setupCompleted) fd.append("setupCompleted", "true");
      if (files.logo) fd.append("logo", files.logo);
      if (files.favicon) fd.append("favicon", files.favicon);
      if (files.watermarkLogo) fd.append("watermarkLogo", files.watermarkLogo);

      await pb.collection("settings").update(SETTINGS_RECORD_ID, fd);
      await refresh();
      setFiles({ logo: null, favicon: null, watermarkLogo: null });
      toast.success("Einstellungen gespeichert");
      if (markCompleted) navigate("/album");
    } catch (error) {
      console.error("settings save failed", error);
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const regeneratePreviews = async () => {
    setRegenerating(true);
    try {
      const result = await pb.send("/api/custom/regenerate-previews", {
        method: "POST",
        body: {},
      });
      toast.success(
        `Vorschauen neu erzeugt: ${result.generated ?? 0}` +
          (result.failed ? `, fehlgeschlagen: ${result.failed}` : ""),
      );
    } catch (error) {
      console.error("preview regeneration failed", error);
      toast.error("Neu-Erzeugen fehlgeschlagen");
    } finally {
      setRegenerating(false);
    }
  };

  // Persist the current draft (without marking setup complete) before moving to
  // the next wizard step, so progress survives a reload or abort mid-setup.
  const goNext = async () => {
    await save(false);
    setActiveStep((s) => s + 1);
  };

  // Client-side reachability check: if the browser can reach the domain over
  // HTTPS, DNS resolves and Caddy has a valid certificate for it. no-cors keeps
  // the request from failing on the cross-origin response (we only care whether
  // it resolves at all).
  const checkDomain = async () => {
    const domain = draft.customDomain.trim().toLowerCase();
    if (!domain) return;
    setCheckingDomain(true);
    setDomainStatus("idle");
    try {
      await save(false); // make sure the ask-endpoint knows this domain
      await fetch(`https://${domain}/api/health`, {
        mode: "no-cors",
        cache: "no-store",
      });
      setDomainStatus("ok");
    } catch (_) {
      setDomainStatus("fail");
    } finally {
      setCheckingDomain(false);
    }
  };

  const brandingSection = (
    <Card>
      <CardHeader title="Branding" subheader="Name, Logo, Farben und Schrift" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Name des Geschäfts" value={draft.businessName}
              onChange={(e) => set({ businessName: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth label="Kurzname (App)" inputProps={{ maxLength: 12 }}
              value={draft.shortName} onChange={(e) => set({ shortName: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth select label="Schriftart" value={draft.fontFamily}
              onChange={(e) => set({ fontFamily: e.target.value as FontKey })}>
              {FONT_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Erscheinungsbild" value={draft.themeMode}
              onChange={(e) => set({ themeMode: e.target.value as ThemeMode })}>
              {MODE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Slogan / Untertitel" value={draft.tagline}
              onChange={(e) => set({ tagline: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <ImageDrop label="Logo" file={files.logo}
              currentUrl={settingsFileUrl(settings, "logo")}
              onFile={(f) => setFiles((s) => ({ ...s, logo: f }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <ImageDrop label="Favicon (optional)" file={files.favicon}
              currentUrl={settingsFileUrl(settings, "favicon")}
              onFile={(f) => setFiles((s) => ({ ...s, favicon: f }))} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth type="color" label="Primärfarbe" value={draft.primaryColor}
              onChange={(e) => set({ primaryColor: e.target.value })}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth type="color" label="Sekundärfarbe" value={draft.secondaryColor}
              onChange={(e) => set({ secondaryColor: e.target.value })}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Eckenradius: {draft.borderRadius}px
            </Typography>
            <Slider size="small" min={0} max={24} value={draft.borderRadius}
              onChange={(_, v) => set({ borderRadius: v as number })} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const contactSection = (
    <Card>
      <CardHeader title="Kontakt & Geschäft" subheader="E-Mail-Adressen und Website" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Kontakt-E-Mail (Support)" type="email"
              value={draft.contactEmail}
              onChange={(e) => set({ contactEmail: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Bestell-Benachrichtigungen an" type="email"
              helperText="Hier gehen neue Bestellungen ein"
              value={draft.orderNotificationEmail}
              onChange={(e) => set({ orderNotificationEmail: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField fullWidth label="Website (optional)" type="url"
              value={draft.websiteUrl}
              onChange={(e) => set({ websiteUrl: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Währung" inputProps={{ maxLength: 3 }}
              helperText="ISO-Code, z. B. EUR"
              value={draft.currency}
              onChange={(e) => set({ currency: e.target.value.toUpperCase() })} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const domainSection = (
    <Card>
      <CardHeader title="Eigene Domain"
        subheader="Unter welcher Adresse soll dein Album erreichbar sein?" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Domain" placeholder="fotos.deine-domain.de"
              value={draft.customDomain}
              onChange={(e) => {
                setDomainStatus("idle");
                set({ customDomain: e.target.value.trim().toLowerCase() });
              }}
              helperText="Ohne https:// — z. B. fotos.deine-domain.de. Leer lassen, wenn (noch) keine eigene Domain." />
          </Grid>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>So richtest du deine Domain ein:</strong>
              </Typography>
              <Box component="ol" sx={{ pl: 2.5, m: 0, "& li": { mb: 0.75 } }}>
                <Typography component="li" variant="body2">
                  Lege bei deinem Domain-Anbieter einen <strong>A-Record</strong> (und
                  optional AAAA für IPv6) an, der auf die <strong>IP-Adresse deines
                  Servers</strong> zeigt.
                </Typography>
                <Typography component="li" variant="body2">
                  Trage die Domain oben ein und speichere.
                </Typography>
                <Typography component="li" variant="body2">
                  Das HTTPS-Zertifikat wird beim ersten Aufruf <strong>automatisch</strong>
                  {" "}von Let's Encrypt geholt — du musst nichts weiter konfigurieren.
                </Typography>
              </Box>
            </Alert>
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" disabled={checkingDomain || !draft.customDomain.trim()}
              onClick={() => void checkDomain()}>
              Domain prüfen
            </Button>
            {domainStatus === "ok" && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Deine Domain ist erreichbar und per HTTPS gesichert.
              </Alert>
            )}
            {domainStatus === "fail" && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Noch nicht erreichbar. Das ist direkt nach dem Anlegen des
                DNS-Eintrags normal — es kann einige Minuten bis Stunden dauern,
                bis die Änderung überall aktiv ist. Später erneut prüfen.
              </Alert>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const paymentSection = (
    <Card>
      <CardHeader title="Zahlung"
        subheader="PayPal und Kartenzahlung (Stripe) — optional, jederzeit änderbar" />
      <CardContent>
        <PaymentSettings compact />
      </CardContent>
    </Card>
  );

  const legalSection = (
    <Card>
      <CardHeader title="Rechtliches"
        subheader="Wird öffentlich unter /imprint und /privacy angezeigt (HTML erlaubt)" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={6} label="Impressum"
              value={draft.imprintHtml}
              onChange={(e) => set({ imprintHtml: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={6} label="Datenschutzerklärung"
              value={draft.privacyHtml}
              onChange={(e) => set({ privacyHtml: e.target.value })} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const watermarkSection = (
    <Card>
      <CardHeader title="Wasserzeichen & Vorschau"
        subheader="Für die automatisch erzeugten Vorschaubilder in Alben" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Wasserzeichen-Text"
              helperText="Leer lassen, um den Geschäftsnamen zu verwenden"
              value={draft.watermarkText}
              onChange={(e) => set({ watermarkText: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <ImageDrop label="Wasserzeichen-Logo (optional, statt Text)"
              file={files.watermarkLogo}
              currentUrl={settingsFileUrl(settings, "watermarkLogo")}
              onFile={(f) => setFiles((s) => ({ ...s, watermarkLogo: f }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Deckkraft: {draft.watermarkOpacity}%
            </Typography>
            <Slider size="small" min={5} max={100} value={draft.watermarkOpacity}
              onChange={(_, v) => set({ watermarkOpacity: v as number })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Max. Vorschaugröße (px)"
              inputProps={{ min: 200, max: 4000 }}
              value={draft.previewMaxSize}
              onChange={(e) => set({ previewMaxSize: Number(e.target.value) })} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" disabled={regenerating}
              onClick={() => void regeneratePreviews()}>
              Vorschauen neu erzeugen
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              Nach Änderungen am Wasserzeichen für alle Alben neu generieren
              (kann einige Minuten dauern).
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const steps: { label: string; content: ReactNode }[] = [
    { label: "Branding", content: brandingSection },
    { label: "Domain", content: domainSection },
    { label: "Kontakt", content: contactSection },
    { label: "Zahlung", content: paymentSection },
    { label: "Rechtliches", content: legalSection },
  ];

  return (
    <Page title={setupMode ? "Einrichtung" : "Branding & Einstellungen"}>
      {setupMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Willkommen! Richte dein Album in wenigen Schritten ein. Alles
          lässt sich später unter „Branding“ ändern.
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7} lg={8}>
          {setupMode ? (
            <Box>
              <Stepper activeStep={activeStep} sx={{ mb: 2 }} alternativeLabel>
                {steps.map((s) => (
                  <Step key={s.label}>
                    <StepLabel>{s.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              {steps[activeStep].content}
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                <Button disabled={activeStep === 0}
                  onClick={() => setActiveStep((s) => s - 1)}>
                  Zurück
                </Button>
                {activeStep < steps.length - 1 ? (
                  <Button variant="contained" disabled={saving}
                    onClick={() => void goNext()}>
                    Weiter
                  </Button>
                ) : (
                  <Button variant="contained" disabled={saving}
                    onClick={() => void save(true)}>
                    Einrichtung abschließen
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {brandingSection}
              {domainSection}
              {contactSection}
              {paymentSection}
              {watermarkSection}
              {legalSection}
              <Divider />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" size="large" disabled={saving}
                  onClick={() => void save(false)}>
                  Speichern
                </Button>
              </Box>
            </Box>
          )}
        </Grid>
        <Grid item xs={12} md={5} lg={4}>
          <Box sx={{ position: { md: "sticky" }, top: { md: 16 } }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Live-Vorschau
            </Typography>
            <ThemePreview draft={draft} />
          </Box>
        </Grid>
      </Grid>
    </Page>
  );
}
