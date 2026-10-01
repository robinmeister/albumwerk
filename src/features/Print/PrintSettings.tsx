import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { pb } from "../../config/pocketbase";
import { SETTINGS_RECORD_ID, StudioAddress } from "../../config/settings";
import { useSettings } from "../../context/SettingsContext";
import { SectionCard, sf } from "../Settings/components/SettingsSection";
import { saveProdigiKey } from "./api";

// studioAddress kann aus PocketBase als null kommen
const withDefaults = (a: Partial<StudioAddress> | null | undefined): StudioAddress =>
  ({ name: "", line1: "", zip: "", city: "", country: "DE", ...a });

export default function PrintSettings(): ReactElement {
  const { settings, loaded, refresh } = useSettings();
  const [apiKey, setApiKey] = useState("");
  const [live, setLive] = useState(settings.prodigiLive);
  const [route, setRoute] = useState(settings.printDefaultRoute || "customer");
  const [studio, setStudio] = useState<StudioAddress>(withDefaults(settings.studioAddress));
  const [flat, setFlat] = useState(String(settings.shippingFlat || ""));
  const [freeFrom, setFreeFrom] = useState(String(settings.freeShippingFrom || ""));
  const [savingKey, setSavingKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive(settings.prodigiLive);
    setRoute(settings.printDefaultRoute || "customer");
    setStudio(withDefaults(settings.studioAddress));
    setFlat(String(settings.shippingFlat || ""));
    setFreeFrom(String(settings.freeShippingFrom || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  async function saveKey(key: string) {
    setSavingKey(true);
    try {
      const res = await saveProdigiKey(key, live);
      await refresh();
      setApiKey("");
      toast.success(res.enabled
        ? (res.live ? "Prodigi ist verbunden (Live)" : "Prodigi ist verbunden (Testmodus — es wird nichts gedruckt)")
        : "Prodigi wurde getrennt");
    } catch (e: any) {
      toast.error(e?.response?.message ?? "Der Schlüssel konnte nicht gespeichert werden");
    } finally {
      setSavingKey(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await pb.collection("settings").update(SETTINGS_RECORD_ID, {
        printDefaultRoute: route,
        studioAddress: studio,
        shippingFlat: parseFloat(flat.replace(",", ".")) || 0,
        freeShippingFrom: parseFloat(freeFrom.replace(",", ".")) || 0,
      });
      await refresh();
      toast.success("Gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const setAddr = (patch: Partial<StudioAddress>) => setStudio((a) => ({ ...a, ...patch }));

  return (
    <div {...stylex.props(sf.sections)}>
      <SectionCard
        title="Prodigi verbinden"
        subtitle={settings.prodigiEnabled
          ? (settings.prodigiLive ? "Verbunden (Live)" : "Verbunden (Testmodus)")
          : "Noch nicht verbunden"}
      >
        <div {...stylex.props(sf.grid1)}>
          <Text type="body" color="secondary">
            Prodigi druckt und versendet in deinem Namen und rechnet direkt mit dir ab.
            Den API-Schlüssel findest du im Prodigi-Dashboard unter „Settings“.
            Name und Adresse deiner Kund:innen gehen dabei an Prodigi — schließe
            dort den Auftragsverarbeitungsvertrag (AV-Vertrag) ab.
          </Text>
          <TextInput width="100%" type="password" label="Prodigi-API-Schlüssel"
            value={apiKey} onChange={setApiKey}
            description={settings.prodigiEnabled ? "Ein Schlüssel ist hinterlegt. Zum Ersetzen den neuen einfügen." : undefined} />
          <Switch label={live ? "Live (echte Drucke)" : "Testmodus (Sandbox — es wird nichts gedruckt)"}
            value={live} onChange={setLive} />
          <div {...stylex.props(sf.saveRow)}>
            {settings.prodigiEnabled && (
              <Button variant="destructive" label="Trennen" isDisabled={savingKey} onClick={() => void saveKey("")} />
            )}
            <Button variant="primary" label="Speichern & prüfen" isLoading={savingKey}
              isDisabled={savingKey || apiKey.trim() === ""} onClick={() => void saveKey(apiKey.trim())} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Lieferung & Versand" subtitle="Gilt für jede neue Druckbestellung">
        <div {...stylex.props(sf.grid2)}>
          <div {...stylex.props(sf.full)}>
            <Selector width="100%" label="Wohin schickt das Labor?"
              options={[
                { value: "customer", label: "Direkt an die Kund:in" },
                { value: "studio", label: "An mich — ich versende selbst weiter" },
              ]}
              value={route} onChange={(v) => v && setRoute(v as "customer" | "studio")}
              description="Lässt sich bei jedem Auftrag vor der Freigabe ändern." />
          </div>
          <TextInput width="100%" label="Versandpauschale (€)" value={flat} onChange={setFlat}
            description="Wird einmal pro Bestellung mit Drucken berechnet." />
          <TextInput width="100%" label="Versandkostenfrei ab (€)" value={freeFrom} onChange={setFreeFrom}
            description="Leer lassen, wenn es keine Grenze gibt." />
          <div {...stylex.props(sf.full)}>
            <Text type="body" weight="semibold">Deine Adresse für „An mich“</Text>
          </div>
          <TextInput width="100%" label="Name / Studio" value={studio.name} onChange={(v) => setAddr({ name: v })} />
          <TextInput width="100%" label="Straße & Hausnummer" value={studio.line1} onChange={(v) => setAddr({ line1: v })} />
          <TextInput width="100%" label="PLZ" value={studio.zip} onChange={(v) => setAddr({ zip: v })} />
          <TextInput width="100%" label="Stadt" value={studio.city} onChange={(v) => setAddr({ city: v })} />
          <TextInput width="100%" label="Land (Kürzel)" value={studio.country}
            onChange={(v) => setAddr({ country: v.toUpperCase().slice(0, 2) })} description="z. B. DE" />
        </div>
        <div {...stylex.props(sf.saveRow)}>
          <Button variant="primary" label="Speichern" isLoading={saving} isDisabled={saving} onClick={() => void save()} />
        </div>
      </SectionCard>
    </div>
  );
}
