import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useState } from "react";

import Page from "../../components/layout/Page";
import { SectionCard, sf } from "../../features/Settings/components/SettingsSection";
import { useSettingsDraft } from "../../features/Settings/useSettingsDraft";

export default function DomainPage(): ReactElement {
  const { draft, set, save, saving } = useSettingsDraft();
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState<"idle" | "ok" | "fail">("idle");

  const checkDomain = async () => {
    const domain = draft.customDomain.trim().toLowerCase();
    if (!domain) return;
    setCheckingDomain(true);
    setDomainStatus("idle");
    try {
      await save();
      await fetch(`https://${domain}/api/health`, { mode: "no-cors", cache: "no-store" });
      setDomainStatus("ok");
    } catch (_) {
      setDomainStatus("fail");
    } finally {
      setCheckingDomain(false);
    }
  };

  const domainSection = (
    <SectionCard title="Eigene Domain" subtitle="Unter welcher Adresse soll dein Album erreichbar sein?" helpSlug="custom-domain">
      <div {...stylex.props(sf.grid1)}>
        <TextInput width="100%" label="Domain" placeholder="fotos.deine-domain.de"
          description="Ohne https:// — z. B. fotos.deine-domain.de. Leer lassen, wenn (noch) keine eigene Domain."
          value={draft.customDomain}
          onChange={(v) => { setDomainStatus("idle"); set({ customDomain: v.trim().toLowerCase() }); }} />
        <Banner status="info" title="So richtest du deine Domain ein:">
          <ol {...stylex.props(sf.ol)}>
            <li><Text type="body">Lege bei deinem Domain-Anbieter einen <strong>A-Record</strong> (und optional AAAA für IPv6) an, der auf die <strong>IP-Adresse deines Servers</strong> zeigt.</Text></li>
            <li><Text type="body">Trage die Domain oben ein und speichere.</Text></li>
            <li><Text type="body">Das HTTPS-Zertifikat wird beim ersten Aufruf <strong>automatisch</strong> von Let's Encrypt geholt — du musst nichts weiter konfigurieren.</Text></li>
          </ol>
        </Banner>
        <div {...stylex.props(sf.regenRow)}>
          <Button variant="secondary" label="Domain prüfen" isLoading={checkingDomain}
            isDisabled={checkingDomain || !draft.customDomain.trim()} onClick={() => void checkDomain()} />
          {domainStatus === "ok" && (
            <Banner status="success" title="Deine Domain ist erreichbar und per HTTPS gesichert." />
          )}
          {domainStatus === "fail" && (
            <Banner status="warning" title="Noch nicht erreichbar. Das ist direkt nach dem Anlegen des DNS-Eintrags normal — es kann einige Minuten bis Stunden dauern, bis die Änderung überall aktiv ist. Später erneut prüfen." />
          )}
        </div>
      </div>
    </SectionCard>
  );

  return (
    <Page title="Eigene Domain" showTitleOnMobile>
      <div {...stylex.props(sf.sections)}>
        {domainSection}
        <div {...stylex.props(sf.saveRow)}>
          <Button variant="primary" size="lg" label="Speichern"
            isDisabled={saving} isLoading={saving} onClick={() => void save()} />
        </div>
      </div>
    </Page>
  );
}
