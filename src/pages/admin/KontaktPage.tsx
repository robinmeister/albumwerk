import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ReactElement } from "react";

import Page from "../../components/layout/Page";
import { SectionCard, sf } from "../../features/Settings/components/SettingsSection";
import { useSettingsDraft } from "../../features/Settings/useSettingsDraft";

export default function KontaktPage(): ReactElement {
  const { draft, set, save, saving } = useSettingsDraft();

  return (
    <Page title="Kontakt & E-Mails" showTitleOnMobile>
      <div {...stylex.props(sf.sections)}>
        <SectionCard
          title="Kontakt & Geschäft"
          subtitle="E-Mail-Adressen und Website"
          helpSlug="kontakt-benachrichtigungen"
        >
          <div {...stylex.props(sf.grid2)}>
            <TextInput width="100%" type="email" label="Kontakt-E-Mail (Support)"
              value={draft.contactEmail} onChange={(v) => set({ contactEmail: v })} />
            <TextInput width="100%" type="email" label="Bestell-Benachrichtigungen an"
              description="Hier gehen neue Bestellungen ein"
              value={draft.orderNotificationEmail} onChange={(v) => set({ orderNotificationEmail: v })} />
            <TextInput width="100%" label="Website (optional)"
              value={draft.websiteUrl} onChange={(v) => set({ websiteUrl: v })} />
            <TextInput width="100%" label="Währung" description="ISO-Code, z. B. EUR"
              value={draft.currency} onChange={(v) => set({ currency: v.toUpperCase().slice(0, 3) })} />
          </div>
        </SectionCard>
        <div {...stylex.props(sf.saveRow)}>
          <Button variant="primary" size="lg" label="Speichern"
            isDisabled={saving} isLoading={saving} onClick={() => void save()} />
        </div>
      </div>
    </Page>
  );
}
