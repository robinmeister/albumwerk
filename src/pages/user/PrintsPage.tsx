import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Printer } from "lucide-react";
import { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import EmptyState from "../../components/feedback/EmptyState";
import PageLoader from "../../components/feedback/PageLoader";
import Page from "../../components/layout/Page";
import { pb } from "../../config/pocketbase";
import { thumbUrl } from "../../features/Album/components/AlbumImage";

// Antwort von GET /api/custom/drucke (pb_hooks/lib/druckelib.js ordersView)
type DruckStatus = "processing" | "printing" | "shipped" | "cancelled";
type DruckGruppe = {
  kind: "lab" | "manual";
  status: DruckStatus;
  trackingUrl: string;
  trackingNumber: string;
  items: { image: string; title: string; quantity: number }[];
};
type DruckBestellung = { id: string; created: string; groups: DruckGruppe[] };

const STATUS: Record<DruckStatus, { label: string; variant: "info" | "neutral" | "success" | "warning" }> = {
  processing: { label: "In Bearbeitung", variant: "warning" },
  printing: { label: "Wird gedruckt", variant: "info" },
  shipped: { label: "Versendet", variant: "success" },
  cancelled: { label: "Storniert", variant: "neutral" },
};

const s = stylex.create({
  stack: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  group: { display: "flex", flexDirection: "column", gap: 12 },
  groupHead: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  items: { display: "flex", gap: 12, flexWrap: "wrap" },
  item: { display: "flex", flexDirection: "column", gap: 4, width: 120 },
  thumb: { width: 120, borderRadius: "var(--radius-element)" },
});

function datum(created: string): string {
  if (!created) return "";
  const d = new Date(created.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("de-DE");
}

function Gruppe({ g, caption }: { g: DruckGruppe; caption?: string }): ReactElement {
  const st = STATUS[g.status] ?? STATUS.processing;
  return (
    <div {...stylex.props(s.group)}>
      {caption && <Text type="supporting" color="secondary">{caption}</Text>}
      <div {...stylex.props(s.groupHead)}>
        <Badge variant={st.variant} label={st.label} />
        {g.trackingUrl ? (
          <a href={g.trackingUrl} target="_blank" rel="noopener noreferrer">
            Sendung verfolgen{g.trackingNumber ? ` (${g.trackingNumber})` : ""}
          </a>
        ) : g.trackingNumber ? (
          <Text type="body">Sendungsnummer: {g.trackingNumber}</Text>
        ) : null}
      </div>
      <div {...stylex.props(s.items)}>
        {g.items.map((it, i) => (
          <div key={i} {...stylex.props(s.item)}>
            <img alt={it.title} src={thumbUrl(it.image)} {...stylex.props(s.thumb)} />
            <Text type="supporting">{it.quantity}× {it.title}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintsPage(): ReactElement {
  const [orders, setOrders] = useState<DruckBestellung[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // requestKey: null — StrictMode mountet zweimal (Muster utils/verkauf.ts)
    pb.send("/api/custom/drucke", { method: "GET", requestKey: null })
      .then((res: { orders?: DruckBestellung[] }) => setOrders(res.orders ?? []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  if (failed) {
    return (
      <Page title="Drucke">
        <Banner status="error" title="Deine Drucke konnten nicht geladen werden." />
      </Page>
    );
  }

  if (orders.length === 0) {
    return (
      <Page title="Drucke">
        <EmptyState
          icon={<Printer />}
          title="Du hast noch keine Drucke bestellt."
          description="Sobald du Abzüge oder andere Drucke bestellst, siehst du hier, wann sie unterwegs sind."
          action={{ label: "Zum Album", onClick: () => navigate("/album") }}
        />
      </Page>
    );
  }

  return (
    <Page title="Drucke">
      <div {...stylex.props(s.stack)}>
        {orders.map((o) => (
          <div key={o.id} {...stylex.props(s.card)}>
            <Heading level={6}>{datum(o.created) ? `Bestellung vom ${datum(o.created)}` : "Bestellung"}</Heading>
            {o.groups.map((g, i) => (
              <Gruppe key={g.kind} g={g} caption={o.groups.length > 1 ? `Lieferung ${i + 1} von ${o.groups.length}` : undefined} />
            ))}
          </div>
        ))}
      </div>
    </Page>
  );
}
