import { Box, Card, CardContent, Container, Typography } from "@mui/material";
import DOMPurify from "dompurify";
import { ReactElement, useMemo } from "react";
import { Link } from "react-router-dom";

import { useSettings } from "../../context/SettingsContext";

type Props = {
  kind: "imprint" | "privacy";
};

// Public legal pages fed from the settings collection (admin-maintained HTML,
// sanitized before rendering).
export default function LegalPage({ kind }: Props): ReactElement {
  const { settings } = useSettings();
  const title = kind === "imprint" ? "Impressum" : "Datenschutzerklärung";
  const raw = kind === "imprint" ? settings.imprintHtml : settings.privacyHtml;

  const html = useMemo(() => DOMPurify.sanitize(raw || ""), [raw]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            {title}
          </Typography>
          {html ? (
            <Box
              sx={{ "& a": { color: "primary.main" } }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <Typography color="text.secondary">
              Diese Seite wurde noch nicht ausgefüllt.
            </Typography>
          )}
          <Box sx={{ mt: 3 }}>
            <Link to="/login">Zurück zur Anmeldung</Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
