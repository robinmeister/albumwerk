import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement } from "react";

import Page from "../../components/layout/Page";
import { useSettings } from "../../context/SettingsContext";

const s = stylex.create({
  root: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 },
});

export default function SupportPage(): ReactElement {
  const { settings } = useSettings();
  const email = settings.contactEmail;

  return (
    <Page title="Support">
      <div {...stylex.props(s.root)}>
        <Text type="body">
          Bei Feedback, inhaltlichen oder terminlichen Fragen erreichst du uns
          unter folgender E-Mail-Adresse:
        </Text>
        {email ? (
          <Link href={`mailto:${email}`}>{email}</Link>
        ) : (
          <Text type="body" color="secondary">
            Es wurde noch keine Kontaktadresse hinterlegt.
          </Text>
        )}
      </div>
    </Page>
  );
}
