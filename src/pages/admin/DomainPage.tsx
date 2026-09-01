import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { SectionCard, sf } from "../../features/Settings/components/SettingsSection";
import { useSettingsDraft } from "../../features/Settings/useSettingsDraft";
import {
  BETRIEB_UNBEKANNT,
  DOMAIN_AUFPREIS,
  fetchBetrieb,
  meldeDomainWunsch,
  type Betrieb,
} from "../../utils/betrieb";
import { createTicket, forwardTicket } from "../../utils/support";

export default function DomainPage(): ReactElement {
  const { draft, set, save, saving, settings } = useSettingsDraft();
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [betrieb, setBetrieb] = useState<Betrieb>(BETRIEB_UNBEKANNT);
  const [anfragen, setAnfragen] = useState(false);

  useEffect(() => {
    void fetchBetrieb().then(setBetrieb);
  }, []);

  // Erreichbarkeitsprobe. Mehr als "antwortet da etwas unter HTTPS" ist von
  // hier aus nicht feststellbar: die Antwort ist bei no-cors undurchsichtig.
  // Genau das genuegt aber als Beleg, dass Zertifikat und Routing stehen.
  const pruefe = useCallback(async (domain: string): Promise<boolean> => {
    try {
      await fetch(`https://${domain}/api/health`, { mode: "no-cors", cache: "no-store" });
      return true;
    } catch (_) {
      return false;
    }
  }, []);

  const checkDomain = async () => {
    const domain = draft.customDomain.trim().toLowerCase();
    if (!domain) return;
    setCheckingDomain(true);
    setDomainStatus("idle");
    try {
      await save();
      setDomainStatus((await pruefe(domain)) ? "ok" : "fail");
    } finally {
      setCheckingDomain(false);
    }
  };

  // Auf einer verwalteten Instanz stellt sich der Zustand von selbst fest:
  // sobald der Anbieter die Domain eingetragen hat, wird die Probe gruen.
  // Deshalb prueft die Seite beim Oeffnen, ohne dass jemand klicken muss.
  const beantragteDomain = settings.customDomain.trim().toLowerCase();
  useEffect(() => {
    if (!betrieb.verwaltet || !beantragteDomain) return;
    let aktuell = true;
    void pruefe(beantragteDomain).then((erreichbar) => {
      if (aktuell) setDomainStatus(erreichbar ? "ok" : "fail");
    });
    return () => {
      aktuell = false;
    };
  }, [betrieb.verwaltet, beantragteDomain, pruefe]);

  // Die Anfrage nimmt den Weg, den Anfragen an den Anbieter hier immer nehmen:
  // ein Ticket mit target "vendor", weitergeleitet ueber support.pb.js. So
  // landet sie in demselben Posteingang wie alles andere und hat einen Faden
  // fuer Rueckfragen.
  const domaineAnfragen = async () => {
    const domain = draft.customDomain.trim().toLowerCase();
    if (!domain) return;
    setAnfragen(true);
    let ticketId = "";
    try {
      await save();
      const ticket = await createTicket({
        subject: `Eigene Domain: ${domain}`,
        category: "billing",
        body:
          `Bitte die Domain ${domain} für diese Instanz einrichten.\n\n` +
          `Instanz: ${betrieb.instanz || "unbekannt"}`,
        context: null,
        consentForward: true,
      });
      ticketId = ticket.id;
    } catch (error) {
      console.error("domain request failed", error);
      toast.error("Anfrage konnte nicht angelegt werden");
      setAnfragen(false);
      return;
    }

    // Getrennt vom Anlegen: schlaegt nur die Zustellung fehl (support.pb.js
    // antwortet dann mit 502), ist die Anfrage trotzdem als Ticket da. Ein
    // "konnte nicht gesendet werden" waere hier gelogen — der Fotograf soll
    // wissen, dass er sie im Support-Bereich erneut abschicken kann.
    try {
      await forwardTicket(ticketId, "Domain-Anfrage aus den Einstellungen");
      // Zusaetzlich strukturiert an die Control-Plane: das Ticket ist der
      // Faden fuer Rueckfragen, dieser Aufruf traegt die Domain dort ein, wo
      // die Freigabe stattfindet. Schlaegt er fehl, bleibt das Ticket — der
      // Weg ist doppelt, weil der Verlust einer bezahlten Anfrage teurer ist
      // als ein doppelter Eintrag.
      try {
        await meldeDomainWunsch(domain);
      } catch (error) {
        console.warn("Domain-Wunsch nicht an die Control-Plane gemeldet", error);
      }
      toast.success("Anfrage gesendet — wir melden uns mit den Details.");
    } catch (error) {
      console.error("domain request forward failed", error);
      toast.warning("Anfrage gespeichert, aber noch nicht bei uns angekommen. Bitte im Support-Bereich erneut senden.");
    } finally {
      setAnfragen(false);
    }
  };

  const selbstGehostet = (
    <>
      {/* defaultIsExpanded: der Inhalt ist die Anleitung selbst. Ohne das
          liegt sie hinter einem Aufklapp-Pfeil und wird nie gelesen. */}
      <Banner status="info" title="So richtest du deine Domain ein:" defaultIsExpanded>
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
    </>
  );

  const verwaltet = (
    <>
      <Banner status="info" title="Eine eigene Domain richten wir für dich ein." defaultIsExpanded>
        <div {...stylex.props(sf.grid1)}>
          <Text type="body">
            Deine Instanz läuft bei uns — die Domain schalten wir für dich frei. Die
            Einrichtung kostet einmalig {DOMAIN_AUFPREIS}, Hilfe beim DNS-Eintrag
            inklusive. Danach fallen keine weiteren Kosten an.
          </Text>
          <ol {...stylex.props(sf.ol)}>
            <li><Text type="body">Trage oben ein, unter welcher Adresse dein Album erreichbar sein soll.</Text></li>
            <li>
              <Text type="body">
                Lege bei deinem Domain-Anbieter einen <strong>CNAME</strong> an, der auf{" "}
                <strong>{betrieb.instanz || "deine Instanz-Adresse"}</strong> zeigt.
              </Text>
            </li>
            <li><Text type="body">Schick uns die Anfrage — den Rest erledigen wir. Das HTTPS-Zertifikat kommt automatisch.</Text></li>
          </ol>
        </div>
      </Banner>
      <div {...stylex.props(sf.regenRow)} data-testid="domain-anfrage">
        <Button variant="primary" label="Domain anfragen" isLoading={anfragen}
          isDisabled={anfragen || saving || !draft.customDomain.trim()}
          onClick={() => void domaineAnfragen()} />
        {beantragteDomain && domainStatus === "ok" && (
          <Banner status="success" title={`Deine Domain ist aktiv: ${beantragteDomain}`} />
        )}
        {beantragteDomain && domainStatus === "fail" && (
          <Banner status="info" title="Angefragt — sobald wir die Domain freigeschaltet haben und dein CNAME aktiv ist, steht sie hier als aktiv." />
        )}
      </div>
    </>
  );

  const domainSection = (
    <SectionCard title="Eigene Domain" subtitle="Unter welcher Adresse soll dein Album erreichbar sein?" helpSlug="custom-domain">
      <div {...stylex.props(sf.grid1)}>
        <TextInput width="100%" label="Domain" placeholder="fotos.deine-domain.de"
          description="Ohne https:// — z. B. fotos.deine-domain.de. Leer lassen, wenn (noch) keine eigene Domain."
          value={draft.customDomain}
          onChange={(v) => { setDomainStatus("idle"); set({ customDomain: v.trim().toLowerCase() }); }} />
        {betrieb.verwaltet ? verwaltet : selbstGehostet}
      </div>
    </SectionCard>
  );

  return (
    <Page title="Eigene Domain" showTitleOnMobile>
      <div {...stylex.props(sf.sections)}>
        {domainSection}
        {/* Auf einer verwalteten Instanz ist "Domain anfragen" der Knopf, der
            zaehlt — er speichert selbst. Ein zweiter Speichern-Knopf daneben
            waere die Einladung, den falschen zu druecken. */}
        {!betrieb.verwaltet && (
          <div {...stylex.props(sf.saveRow)}>
            <Button variant="primary" size="lg" label="Speichern"
              isDisabled={saving} isLoading={saving} onClick={() => void save()} />
          </div>
        )}
      </div>
    </Page>
  );
}
