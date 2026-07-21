import { Container, Link, Typography } from "@mui/material";
import { ReactElement } from "react";

import Page from "../../components/layout/Page";
import { useSettings } from "../../context/SettingsContext";

export default function SupportPage(): ReactElement {
  const { settings } = useSettings();
  const email = settings.contactEmail;

  return (
    <Page title="Support">
      <Container>
        <Typography variant="body1" gutterBottom>
          Bei Feedback, inhaltlichen oder terminlichen Fragen erreichst du uns
          unter folgender E-Mail-Adresse:
        </Typography>
        {email ? (
          <Typography variant="body1" gutterBottom>
            <Link href={`mailto:${email}`}>{email}</Link>
          </Typography>
        ) : (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Es wurde noch keine Kontaktadresse hinterlegt.
          </Typography>
        )}
      </Container>
    </Page>
  );
}
