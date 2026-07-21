import { ReactElement, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBack,
  ArrowDownward,
  ArrowUpward,
  Assignment,
  CheckCircle,
  Close,
  CloudDownload,
  Print,
  Search,
  Send,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { addDoc, collection, getDocs } from "../../config/firestore-compat";

import {
  FinishedOrder,
  ImagePriceObject,
  Order,
  PriceWithQuantity,
  Shooting,
  TableOrder,
  UserOrder,
} from "../../utils/types";
import { calculateTotalPrice } from "../../features/Pricing/utils/functions";
import { getUsersSnapshot } from "../../utils/functions";
import useMobileService from "../../hooks/useMobileService";

/* ---- Extended types ---- */

type TableOrderExtended = TableOrder & { createdAt?: string };
type FinishedOrderLocal = FinishedOrder & { createdAt?: string };

type SortKey = "email" | "price";
type SortDir = "asc" | "desc";

/* ---- Helpers ---- */

function parseIPOL(val: unknown): ImagePriceObject[] {
  if (typeof val === "string") return JSON.parse(val);
  return (val as ImagePriceObject[]) ?? [];
}

function isAllDownloadable(order: TableOrder): boolean {
  if (!order.imagePriceObjectList) return false;
  const items = parseIPOL(order.imagePriceObjectList);
  const flags = items.flatMap(item => item.price.map(p => p.isDownloadable));
  return flags.length > 0 && !flags.includes(false);
}

function getDateGroup(dateStr?: string): "Heute" | "Diese Woche" | "Älter" {
  if (!dateStr) return "Älter";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "Heute";
  if (diffDays < 7) return "Diese Woche";
  return "Älter";
}

/* ---- Stat card ---- */

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mb: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.68rem" }}
        >
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} lineHeight={1.1}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

/* ---- Order list item ---- */

const listItemSx = (isSelected: boolean) =>
  ({
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    px: 1.5,
    py: 1.25,
    cursor: "pointer",
    borderLeft: "3px solid",
    borderLeftColor: isSelected ? "primary.main" : "transparent",
    bgcolor: isSelected ? "action.selected" : "transparent",
    "&:hover": { bgcolor: isSelected ? "action.selected" : "action.hover" },
    transition: "background-color 0.15s",
  } as const);

function OrderListItem({
  order,
  isSelected,
  onClick,
}: {
  order: TableOrderExtended;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Box onClick={onClick} sx={listItemSx(isSelected)}>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={isSelected ? 600 : 400} noWrap title={order.userEmail}>
          {order.userEmail ?? "–"}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {order.shootingTitle ?? "–"}
        </Typography>
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0 }}>
        {order.totalPrice.toFixed(2)}€
      </Typography>
    </Box>
  );
}

/* ---- Order detail panel ---- */

function OrderDetailPanel({
  order,
  finishing,
  onFinish,
}: {
  order: TableOrderExtended;
  finishing: boolean;
  onFinish: () => void;
}) {
  const items = useMemo(() => parseIPOL(order.imagePriceObjectList), [order.imagePriceObjectList]);

  const allPrices: PriceWithQuantity[] = items.flatMap(i => i.price);
  const printCount = allPrices.filter(p => !p.isDownloadable).reduce((s, p) => s + p.quantity, 0);
  const dlCount    = allPrices.filter(p => p.isDownloadable).reduce((s, p) => s + p.quantity, 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Sticky action header */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: 2,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
          bgcolor: "background.paper",
        }}
      >
        {/* Email + price row */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          flexWrap="wrap"
          gap={1}
          mb={0.75}
        >
          <Box minWidth={0} flex={1}>
            <Typography variant="h6" fontWeight={600} noWrap>
              {order.userEmail}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.shootingTitle}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1.5} flexShrink={0}>
            <Typography variant="h6" fontWeight={700}>
              {order.totalPrice.toFixed(2)}€
            </Typography>
            {order.finished
              ? <Chip label="Erledigt"   color="success" size="small" />
              : <Chip label="Ausstehend" color="warning" size="small" />
            }
          </Box>
        </Box>

        {/* Summary chips */}
        <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap" mb={order.finished ? 0 : 1.5}>
          <Typography variant="caption" color="text.secondary">
            {items.length} {items.length === 1 ? "Bild" : "Bilder"}
          </Typography>
          {printCount > 0 && (
            <>
              <Typography variant="caption" color="text.disabled">·</Typography>
              <Chip
                icon={<Print sx={{ fontSize: "0.85rem !important" }} />}
                label={`${printCount} Druck`}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.68rem" }}
              />
            </>
          )}
          {dlCount > 0 && (
            <>
              <Typography variant="caption" color="text.disabled">·</Typography>
              <Chip
                icon={<CloudDownload sx={{ fontSize: "0.85rem !important" }} />}
                label={`${dlCount} Download`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.68rem" }}
              />
            </>
          )}
        </Box>

        {/* Action button — always visible at top */}
        {!order.finished && (
          <Button
            variant="contained"
            fullWidth
            startIcon={finishing ? <CircularProgress size={16} color="inherit" /> : <Send />}
            disabled={finishing}
            onClick={onFinish}
          >
            Bestellung abschicken
          </Button>
        )}
      </Box>

      {/* Scrollable image grid */}
      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 3 } }}>
        {items.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            Keine Bilddetails verfügbar
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {items.map((item, idx) => (
              <Grid item xs={12} sm={6} key={idx}>
                <Card variant="outlined">
                  {item.image && (
                    <Box sx={{ height: 160, overflow: "hidden", bgcolor: "grey.100" }}>
                      <img
                        src={item.image}
                        alt={`Bild ${idx + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </Box>
                  )}
                  <CardContent sx={{ py: 1.5 }}>
                    {item.price.map(p => (
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
                            <Chip label="DL" size="small" color="info" sx={{ height: 16, fontSize: "0.6rem" }} />
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
      </Box>
    </Box>
  );
}

/* ---- Main page ---- */

export default function OrdersPage(): ReactElement {
  const isMobile = useMobileService();

  const [tableOrders,    setTableOrders]    = useState<TableOrderExtended[]>([]);
  const [downloadOrders, setDownloadOrders] = useState<TableOrderExtended[]>([]);
  const [finishedOrders, setFinishedOrders] = useState<FinishedOrderLocal[]>([]);
  const [totalIncome,    setTotalIncome]    = useState(0);
  const [userOrderList,  setUserOrderList]  = useState<UserOrder[]>([]);

  const [loading,       setLoading]       = useState(true);
  const [finishing,     setFinishing]     = useState(false);
  const [activeTab,     setActiveTab]     = useState(0);
  const [search,        setSearch]        = useState("");
  const [selectedOrder, setSelectedOrder] = useState<TableOrderExtended | undefined>();
  const [summaryOpen,   setSummaryOpen]   = useState(false);
  const [sortKey,       setSortKey]       = useState<SortKey>("email");
  const [sortDir,       setSortDir]       = useState<SortDir>("asc");

  const hasSelection = selectedOrder !== undefined;

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [ordersSnap, finishedSnap, users, shootingsSnap] = await Promise.all([
        getDocs(collection("orders")),
        getDocs(collection("finishedOrders")),
        getUsersSnapshot(),
        getDocs(collection("shootings")),
      ]);

      const shootings: Shooting[] = shootingsSnap.docs.map((d: any) => ({
        id:                d.id,
        title:             d.data().title,
        type:              d.data().type,
        description:       d.data().description ?? "",
        packageId:         d.data().packageId ?? "",
        priceIds:          d.data().priceIds ?? [],
        userIds:           d.data().userIds ?? [],
        withUserSelection: d.data().withUserSelection ?? false,
      }));

      const rawFinished: FinishedOrderLocal[] = finishedSnap.docs.map((d: any) => ({
        id:                   d.id,
        orderId:              d.data().id,
        userId:               d.data().userId,
        shootingId:           d.data().shootingId,
        imagePriceObjectList: d.data().imagePriceObjectList,
        userEmail:            d.data().userEmail,
        shootingTitle:        d.data().shootingTitle,
        totalPrice:           d.data().totalPrice,
        finished:             true,
        createdAt:            d.data().created,
      }));
      setFinishedOrders(rawFinished);

      const rawOrders: (Order & { created?: string })[] = ordersSnap.docs.map((d: any) => ({
        id:                   d.id,
        userId:               d.data().userId,
        shootingId:           d.data().shootingId,
        imagePriceObjectList: d.data().imagePriceObjectList,
        created:              d.data().created,
      }));

      const allTable: TableOrderExtended[] = rawOrders.map(order => {
        const user     = users.find(u => u.uid === order.userId);
        const shooting = shootings.find(s => s.id === order.shootingId);
        return {
          id:                   order.id,
          userId:               order.userId,
          shootingId:           order.shootingId,
          userEmail:            user?.email,
          shootingTitle:        shooting?.title,
          totalPrice:           calculateTotalPrice(parseIPOL(order.imagePriceObjectList)),
          finished:             false,
          imagePriceObjectList: order.imagePriceObjectList,
          createdAt:            order.created,
        };
      });

      const pending = allTable.filter(o => !rawFinished.some(f => f.orderId === o.id));

      setTableOrders(pending.filter(o => !isAllDownloadable(o)));
      setDownloadOrders(pending.filter(o => isAllDownloadable(o)));

      const income = allTable.reduce((s, o) => s + o.totalPrice, 0);
      setTotalIncome(Math.round(income * 100) / 100);

      const userMap: Record<string, number> = {};
      users.forEach(u => { userMap[`${u.email} – ${u.firstName} ${u.lastName}`] = 0; });
      allTable.forEach(o => {
        const u = users.find(u => u.uid === o.userId);
        if (u) {
          const key = `${u.email} – ${u.firstName} ${u.lastName}`;
          userMap[key] = (userMap[key] ?? 0) + o.totalPrice;
        }
      });
      setUserOrderList(
        Object.entries(userMap)
          .map(([user, orderValue]) => ({ user, orderValue }))
          .sort((a, b) => b.orderValue - a.orderValue)
      );
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Laden der Bestellungen");
    }
    setLoading(false);
  }

  async function handleFinishOrder() {
    if (!selectedOrder) return;
    setFinishing(true);
    try {
      await addDoc(collection("finishedOrders"), {
        id:                   selectedOrder.id,
        userId:               selectedOrder.userId,
        shootingId:           selectedOrder.shootingId,
        userEmail:            selectedOrder.userEmail,
        shootingTitle:        selectedOrder.shootingTitle,
        totalPrice:           selectedOrder.totalPrice,
        finished:             true,
        imagePriceObjectList: selectedOrder.imagePriceObjectList,
      });
      toast.success("Bestellung abgeschickt");
      setSelectedOrder(undefined);
      await loadAll();
    } catch {
      toast.error("Fehler beim Abschicken");
    }
    setFinishing(false);
  }

  const finishedTableOrders: TableOrderExtended[] = useMemo(
    () =>
      finishedOrders.map(fo => ({
        id:                   fo.id,
        userId:               fo.userId,
        shootingId:           fo.shootingId,
        userEmail:            fo.userEmail,
        shootingTitle:        fo.shootingTitle,
        totalPrice:           fo.totalPrice,
        finished:             true,
        imagePriceObjectList: fo.imagePriceObjectList,
        createdAt:            fo.createdAt,
      })),
    [finishedOrders]
  );

  const currentTabOrders: TableOrderExtended[] = useMemo(() => {
    const base =
      activeTab === 0 ? tableOrders
      : activeTab === 1 ? downloadOrders
      : finishedTableOrders;

    const q = search.toLowerCase();
    const filtered = q
      ? base.filter(
          o =>
            (o.userEmail ?? "").toLowerCase().includes(q) ||
            (o.shootingTitle ?? "").toLowerCase().includes(q)
        )
      : base;

    return [...filtered].sort((a, b) => {
      const cmp =
        sortKey === "price"
          ? a.totalPrice - b.totalPrice
          : (a.userEmail ?? "").localeCompare(b.userEmail ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [activeTab, tableOrders, downloadOrders, finishedTableOrders, search, sortKey, sortDir]);

  /* Timeline groups for "Erledigt" tab */
  const groupedFinished = useMemo(() => {
    if (activeTab !== 2) return null;
    const groups: Record<"Heute" | "Diese Woche" | "Älter", TableOrderExtended[]> = {
      "Heute": [], "Diese Woche": [], "Älter": [],
    };
    currentTabOrders.forEach(o => { groups[getDateGroup(o.createdAt)].push(o); });
    return groups;
  }, [activeTab, currentTabOrders]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const SortIcon = sortDir === "asc" ? ArrowUpward : ArrowDownward;

  return (
    <>
      <Box sx={{ pt: 1 }}>
        {/* Title */}
        <Typography
          variant="h5"
          fontWeight={700}
          mb={1.5}
          sx={{ display: { xs: "none", md: "block" } }}
        >
          Bestellungen
        </Typography>

        {/* Metric cards */}
        <Grid container spacing={1.5} sx={{ mb: 0.5 }}>
          <Grid item xs={6} md={3}>
            <StatCard label="Gesamtumsatz"    value={`${totalIncome.toFixed(2)}€`} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label="Offen (Druck)"   value={tableOrders.length} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label="Downloads bereit" value={downloadOrders.length} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label="Abgeschlossen"   value={finishedOrders.length} />
          </Grid>
        </Grid>

        {/* Kundenumsätze — secondary link below cards */}
        <Box display="flex" justifyContent="flex-end" mb={1.5}>
          <Button variant="text" size="small" onClick={() => setSummaryOpen(true)}>
            Kundenumsätze anzeigen →
          </Button>
        </Box>

        {/* Two-panel container */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: { xs: "visible", md: "hidden" },
            height: { md: "calc(100vh - 295px)" },
            minHeight: { md: 400 },
            bgcolor: "background.paper",
          }}
        >
          {/* ===== LEFT PANEL ===== */}
          <Box
            sx={{
              width: { md: 300 },
              flexShrink: 0,
              borderRight: { md: "1px solid" },
              borderBottom: { xs: "1px solid", md: "none" },
              borderColor: "divider",
              display: { xs: hasSelection ? "none" : "flex", md: "flex" },
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Tabs with icons */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v as number);
                setSearch("");
                setSelectedOrder(undefined);
              }}
              variant="fullWidth"
              sx={{ borderBottom: "1px solid", borderColor: "divider", flexShrink: 0, minHeight: 48 }}
            >
              <Tab
                icon={<Print sx={{ fontSize: 15 }} />}
                iconPosition="start"
                label={`Druck (${tableOrders.length})`}
                sx={{ fontSize: "0.68rem", minHeight: 48 }}
              />
              <Tab
                icon={<CloudDownload sx={{ fontSize: 15 }} />}
                iconPosition="start"
                label={`DL (${downloadOrders.length})`}
                sx={{ fontSize: "0.68rem", minHeight: 48 }}
              />
              <Tab
                icon={<CheckCircle sx={{ fontSize: 15 }} />}
                iconPosition="start"
                label={`Erledigt (${finishedOrders.length})`}
                sx={{ fontSize: "0.68rem", minHeight: 48 }}
              />
            </Tabs>

            {/* Search + sort controls */}
            <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Kunde oder Shooting…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />
              <Box display="flex" gap={0.75}>
                <Tooltip title="Nach Name sortieren">
                  <Button
                    size="small"
                    variant={sortKey === "email" ? "contained" : "outlined"}
                    onClick={() => toggleSort("email")}
                    endIcon={sortKey === "email" ? <SortIcon sx={{ fontSize: "0.8rem !important" }} /> : undefined}
                    sx={{ flex: 1, fontSize: "0.7rem", py: 0.4 }}
                  >
                    Name
                  </Button>
                </Tooltip>
                <Tooltip title="Nach Preis sortieren">
                  <Button
                    size="small"
                    variant={sortKey === "price" ? "contained" : "outlined"}
                    onClick={() => toggleSort("price")}
                    endIcon={sortKey === "price" ? <SortIcon sx={{ fontSize: "0.8rem !important" }} /> : undefined}
                    sx={{ flex: 1, fontSize: "0.7rem", py: 0.4 }}
                  >
                    Preis
                  </Button>
                </Tooltip>
              </Box>
            </Box>

            {/* Order list */}
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {currentTabOrders.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ p: 2, textAlign: "center", pt: 4 }}>
                  {search ? "Keine Ergebnisse" : "Keine Bestellungen"}
                </Typography>
              ) : activeTab === 2 && groupedFinished ? (
                /* Timeline for finished orders */
                (["Heute", "Diese Woche", "Älter"] as const).map(group => {
                  const items = groupedFinished[group];
                  if (!items.length) return null;
                  return (
                    <Box key={group}>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{
                          px: 1.5,
                          py: 0.75,
                          display: "block",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          fontSize: "0.62rem",
                        }}
                      >
                        {group}
                      </Typography>
                      {items.map(order => (
                        <OrderListItem
                          key={order.id}
                          order={order}
                          isSelected={selectedOrder?.id === order.id}
                          onClick={() => setSelectedOrder(order)}
                        />
                      ))}
                      <Divider />
                    </Box>
                  );
                })
              ) : (
                currentTabOrders.map(order => (
                  <OrderListItem
                    key={order.id}
                    order={order}
                    isSelected={selectedOrder?.id === order.id}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))
              )}
            </Box>
          </Box>

          {/* ===== RIGHT PANEL ===== */}
          <Box
            sx={{
              flex: 1,
              display: { xs: hasSelection ? "flex" : "none", md: "flex" },
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {!selectedOrder ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                flex={1}
                gap={1}
              >
                <Assignment sx={{ fontSize: 56, color: "text.disabled", opacity: 0.4 }} />
                <Typography variant="body1" color="text.secondary">
                  Bestellung auswählen
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {isMobile && (
                  <Box sx={{ px: 2, pt: 1.5, pb: 0, flexShrink: 0 }}>
                    <Button
                      startIcon={<ArrowBack />}
                      onClick={() => setSelectedOrder(undefined)}
                      size="small"
                    >
                      Alle Bestellungen
                    </Button>
                  </Box>
                )}
                <OrderDetailPanel
                  order={selectedOrder}
                  finishing={finishing}
                  onFinish={() => void handleFinishOrder()}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Kundenumsätze Dialog */}
      <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Kundenumsätze
          <IconButton
            onClick={() => setSummaryOpen(false)}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {userOrderList.filter(u => u.orderValue > 0).length} von {userOrderList.length} Kunden
            haben bestellt.
          </Typography>
          {userOrderList.map(u => (
            <Box
              key={u.user}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              py={0.75}
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0, pr: 1 }} noWrap title={u.user}>
                {u.user}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={u.orderValue > 0 ? 600 : 400}
                color={u.orderValue > 0 ? "text.primary" : "text.disabled"}
              >
                {u.orderValue.toFixed(2)}€
              </Typography>
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
