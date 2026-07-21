import { ReactElement, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Typography,
} from "@mui/material";
import { ArrowBack, Check, Send } from "@mui/icons-material";
import { toast } from "react-toastify";
import { addDoc, collection } from "../../config/firestore-compat";

import Page from "../../components/layout/Page";
import { ImagePriceObject, PriceWithQuantity, TableOrder } from "../../utils/types";

function parseIPOL(val: unknown): ImagePriceObject[] {
  if (typeof val === "string") return JSON.parse(val);
  return (val as ImagePriceObject[]) ?? [];
}

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
      await addDoc(collection("finishedOrders"), {
        id:                   order.id,
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
        <Typography color="text.secondary">Bestellung nicht gefunden.</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/orders")} sx={{ mt: 2 }}>
          Zurück zu Bestellungen
        </Button>
      </Page>
    );
  }

  return (
    <Page title="Bestelldetails">
      {/* Top action bar */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          variant="outlined"
          color="inherit"
          onClick={() => navigate(-1)}
        >
          Zurück
        </Button>
        <Button
          variant={order.finished ? "outlined" : "contained"}
          disabled={order.finished || finishing}
          startIcon={
            finishing ? (
              <CircularProgress size={16} color="inherit" />
            ) : order.finished ? (
              <Check />
            ) : (
              <Send />
            )
          }
          onClick={() => void handleFinishOrder()}
        >
          {order.finished ? "Erledigt" : "Abschicken"}
        </Button>
      </Box>

      {/* Order summary */}
      <Box mb={3}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {order.userEmail}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.shootingTitle}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h6" fontWeight={700}>
              {order.totalPrice.toFixed(2)}€
            </Typography>
            {order.finished ? (
              <Chip label="Erledigt" color="success" size="small" />
            ) : (
              <Chip label="Ausstehend" color="warning" size="small" />
            )}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Image grid */}
      {items.length === 0 ? (
        <Typography color="text.secondary">Keine Bilddetails verfügbar.</Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map((item, idx) => (
            <Grid item xs={12} sm={6} key={idx}>
              <Card variant="outlined">
                {item.image && (
                  <Box sx={{ height: 200, overflow: "hidden", bgcolor: "grey.100" }}>
                    <img
                      src={item.image}
                      alt={`Bild ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </Box>
                )}
                <CardContent sx={{ py: 1.5 }}>
                  {item.price.map((p: PriceWithQuantity) => (
                    <Box
                      key={p.id}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={0.5}
                    >
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="body2">
                          {p.quantity}× {p.title}
                        </Typography>
                        {p.isDownloadable && (
                          <Chip
                            label="DL"
                            size="small"
                            color="info"
                            sx={{ height: 16, fontSize: "0.6rem" }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight={600}>
                        {(parseFloat(p.amount) * p.quantity).toFixed(2)}€
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Page>
  );
}
