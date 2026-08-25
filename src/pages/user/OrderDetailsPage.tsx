import { ReactElement, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ArrowLeft as ArrowBack, Check, Send } from "lucide-react";
import { toast } from "react-toastify";
import { pb } from "../../config/pocketbase";

import Page from "../../components/layout/Page";
import { ImagePriceObject, PriceWithQuantity, TableOrder } from "../../utils/types";

function parseIPOL(val: unknown): ImagePriceObject[] {
  if (typeof val === "string") return JSON.parse(val);
  return (val as ImagePriceObject[]) ?? [];
}

const s = stylex.create({
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summary: { marginBottom: 24 },
  summaryRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  price: { display: "flex", alignItems: "center", gap: 12 },
  grid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr" },
    gap: 16,
  },
  card: {
    overflow: "hidden",
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  thumb: { height: 200, overflow: "hidden", backgroundColor: "var(--color-background-muted)" },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardBody: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4 },
  line: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  lineLeft: { display: "flex", alignItems: "center", gap: 6 },
  divider: { marginBottom: 24 },
});

export default function OrderDetailsPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [order] = useState<TableOrder>(location.state?.order);
  const [items, setItems] = useState<ImagePriceObject[]>([]);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (order?.imagePriceObjectList) {
      setItems(parseIPOL(order.imagePriceObjectList));
    }
  }, [order]);

  async function handleFinishOrder() {
    setFinishing(true);
    try {
      await pb.collection("finishedOrders").create({
        // orderId verknüpft den Archiveintrag mit der offenen Bestellung —
        // OrdersPage blendet darüber erledigte Aufträge aus. Die eigene `id`
        // des Archiveintrags vergibt PocketBase und taugt dafür nicht.
        orderId:              order.id,
        userId:               order.userId,
        shootingId:           order.shootingId,
        userEmail:            order.userEmail,
        shootingTitle:        order.shootingTitle,
        totalPrice:           order.totalPrice,
        finished:             true,
        imagePriceObjectList: order.imagePriceObjectList,
      });
      toast.success("Bestellung erfolgreich abgeschickt");
      navigate("/orders");
    } catch (error) {
      toast.error("Fehler beim Abschicken der Bestellung");
      console.error(error);
    }
    setFinishing(false);
  }

  if (!order) {
    return (
      <Page title="Bestelldetails">
        <Text type="body" color="secondary">Bestellung nicht gefunden.</Text>
        <Button
          variant="secondary"
          icon={<ArrowBack />}
          label="Zurück zu Bestellungen"
          onClick={() => navigate("/orders")}
        />
      </Page>
    );
  }

  return (
    <Page title="Bestelldetails">
      {/* Top action bar */}
      <div {...stylex.props(s.bar)}>
        <Button
          variant="secondary"
          icon={<ArrowBack />}
          label="Zurück"
          onClick={() => navigate(-1)}
        />
        <Button
          variant={order.finished ? "secondary" : "primary"}
          isDisabled={order.finished || finishing}
          isLoading={finishing}
          icon={order.finished ? <Check /> : <Send />}
          label={order.finished ? "Erledigt" : "Abschicken"}
          onClick={() => void handleFinishOrder()}
        />
      </div>

      {/* Order summary */}
      <div {...stylex.props(s.summary)}>
        <div {...stylex.props(s.summaryRow)}>
          <div>
            <Heading level={6}>{order.userEmail}</Heading>
            <Text type="body" color="secondary">{order.shootingTitle}</Text>
          </div>
          <div {...stylex.props(s.price)}>
            <Heading level={6}>{order.totalPrice.toFixed(2)}€</Heading>
            {order.finished ? (
              <Badge variant="success" label="Erledigt" />
            ) : (
              <Badge variant="warning" label="Ausstehend" />
            )}
          </div>
        </div>
      </div>

      <div {...stylex.props(s.divider)}>
        <Divider />
      </div>

      {/* Image grid */}
      {items.length === 0 ? (
        <Text type="body" color="secondary">Keine Bilddetails verfügbar.</Text>
      ) : (
        <div {...stylex.props(s.grid)}>
          {items.map((item, idx) => (
            <div key={idx} {...stylex.props(s.card)}>
              {item.image && (
                <div {...stylex.props(s.thumb)}>
                  <img
                    src={item.image}
                    alt={`Bild ${idx + 1}`}
                    {...stylex.props(s.thumbImg)}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <div {...stylex.props(s.cardBody)}>
                {item.price.map((p: PriceWithQuantity) => (
                  <div key={p.id} {...stylex.props(s.line)}>
                    <div {...stylex.props(s.lineLeft)}>
                      <Text type="body">
                        {p.quantity}× {p.title}
                      </Text>
                      {p.isDownloadable && <Badge variant="info" label="DL" />}
                    </div>
                    <Text type="body" weight="semibold">
                      {(parseFloat(p.amount) * p.quantity).toFixed(2)}€
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
