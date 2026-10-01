import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import PageLoader from "../../components/feedback/PageLoader";
import Page from "../../components/layout/Page";
import PrintSettings from "../../features/Print/PrintSettings";
import {
  PrintJob, PrintRoute, STATUS_TEXTE, cancelJob, listJobs, markDelivered, setRoute, submitJob,
} from "../../features/Print/api";
import { SectionCard, sf } from "../../features/Settings/components/SettingsSection";

const s = stylex.create({
  row: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
});

function fehlertext(e: any): string {
  return e?.response?.message ?? "Das hat nicht geklappt";
}

function JobCard({ job, onChange }: { job: PrintJob; onChange: () => Promise<void> }): ReactElement {
  const [busy, setBusy] = useState(false);
  const [nr, setNr] = useState("");
  const [url, setUrl] = useState("");
  const st = STATUS_TEXTE[job.status];
  const editable = job.status === "awaiting_approval" || (job.status === "failed" && !job.labOrderId);
  const canSubmit = job.status === "awaiting_approval" || job.status === "failed";
  const canCancel = !["cancelled", "shipped", "delivered_to_customer"].includes(job.status);
  const r = job.recipient;
  const copies = job.items.reduce((n, it) => n + it.copies, 0);

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(fehlertext(e));
    } finally {
      await onChange();
      setBusy(false);
    }
  }

  return (
    <SectionCard
      title={`Bestellung ${job.orderId}`}
      subtitle={`${new Date(job.created).toLocaleString("de-DE")} · ${copies} ${copies === 1 ? "Druck" : "Drucke"}`}
    >
      <div {...stylex.props(sf.grid1)}>
        <div {...stylex.props(s.row)}>
          <Badge variant={st.variant} label={st.label} />
          {job.labCost && <Text type="supporting" color="secondary">Laborkosten: {job.labCost}</Text>}
        </div>
        <Text type="body">
          {r.name}, {r.line1}, {r.postalCode} {r.city}, {r.countryCode}
        </Text>
        <Selector
          width="100%"
          label="Lieferweg"
          isDisabled={!editable || busy}
          options={[
            { value: "customer", label: "Direkt an die Kund:in" },
            { value: "studio", label: "An mich" },
          ]}
          value={job.route}
          onChange={(v) => v && void run(() => setRoute(job.id, v as PrintRoute), "Lieferweg geändert")}
        />
        {job.error && <Banner status="error" title={job.error} />}
        {job.trackingNumber && (
          <Text type="body">
            Sendung: {job.trackingUrl
              ? <a href={job.trackingUrl} target="_blank" rel="noopener noreferrer">{job.trackingNumber}</a>
              : job.trackingNumber}
          </Text>
        )}
        {job.route === "studio" && job.status === "shipped" && (
          <div {...stylex.props(sf.grid2)}>
            <TextInput width="100%" label="Deine Sendungsnummer (optional)" value={nr} onChange={setNr} />
            <TextInput width="100%" label="Link zur Sendungsverfolgung (optional)" value={url} onChange={setUrl} />
          </div>
        )}
        <div {...stylex.props(s.row)}>
          {canSubmit && (
            <Button variant="primary" isLoading={busy} isDisabled={busy}
              label={job.status === "failed" ? "Erneut senden" : "An Labor senden"}
              onClick={() => void run(() => submitJob(job.id), "An Prodigi gesendet")} />
          )}
          {job.route === "studio" && job.status === "shipped" && (
            <Button variant="primary" isDisabled={busy} label="An Kund:in versendet"
              onClick={() => void run(() => markDelivered(job.id, nr, url), "Kund:in wurde benachrichtigt")} />
          )}
          {canCancel && (
            <Button variant="destructive" isDisabled={busy} label="Stornieren"
              onClick={() => void run(() => cancelJob(job.id), "Auftrag storniert")} />
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export default function PrintJobsPage(): ReactElement {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setJobs(await listJobs());
    } catch {
      toast.error("Druckaufträge konnten nicht geladen werden");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Page
      title="Druckaufträge"
      subtitle="Bestellte Drucke prüfen, freigeben und verfolgen. Erst nach deiner Freigabe geht ein Auftrag an Prodigi."
      showTitleOnMobile
    >
      <div {...stylex.props(sf.sections)}>
        <PrintSettings />
        {loading ? <PageLoader /> : jobs.length === 0 ? (
          <Text type="body" color="secondary">Noch keine Druckaufträge.</Text>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} onChange={load} />)
        )}
      </div>
    </Page>
  );
}
