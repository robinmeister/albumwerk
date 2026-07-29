import { ReactElement, useEffect, useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ArrowLeft as ArrowBack, ArrowDown as ArrowDownward, ArrowUp as ArrowUpward, ClipboardList as Assignment, CircleCheck as CheckCircle, X as Close, CloudDownload, Printer as Print, Search, Send } from "lucide-react";
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

type TableOrderExtended = TableOrder & { createdAt?: string };
type FinishedOrderLocal = FinishedOrder & { createdAt?: string };

type SortKey = "email" | "price";
type SortDir = "asc" | "desc";

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

const MD = "@media (min-width: 900px)";

const s = stylex.create({
  loading: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" },
  root: { paddingTop: 8 },
  pageTitle: { marginBottom: 12, display: { default: "none", [MD]: "block" } },
  statGrid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr 1fr", [MD]: "repeat(4, 1fr)" },
    gap: 12,
    marginBottom: 4,
  },
  statCard: {
    padding: "12px 16px",
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: { textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.68rem" },
  linkRow: { display: "flex", justifyContent: "flex-end", marginBottom: 12 },
  panels: {
    display: "flex",
    flexDirection: { default: "column", [MD]: "row" },
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-container)",
    overflow: { default: "visible", [MD]: "hidden" },
    height: { [MD]: "calc(100vh - 295px)" },
    minHeight: { [MD]: 400 },
    backgroundColor: "var(--color-background-card)",
  },
  left: {
    width: { [MD]: 300 },
    flexShrink: 0,
    borderRight: { [MD]: "1px solid var(--color-border)" },
    borderBottom: { default: "1px solid var(--color-border)", [MD]: "none" },
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  right: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  hideOnMobile: { display: { default: "none", [MD]: "flex" } },
  tabs: { display: "flex", borderBottom: "1px solid var(--color-border)", flexShrink: 0 },
  tab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "12px 4px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
  },
  tabActive: { color: "var(--color-text-accent)", borderBottomColor: "var(--color-accent)" },
  leftHead: { padding: 12, borderBottom: "1px solid var(--color-border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 },
  sortRow: { display: "flex", gap: 6 },
  sortBtn: { flex: 1 },
  list: { flex: 1, overflowY: "auto" },
  listEmpty: { padding: 16, textAlign: "center", paddingTop: 32 },
  groupLabel: { display: "block", padding: "6px 12px", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.62rem" },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    cursor: "pointer",
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: "transparent",
    transition: "background-color 0.15s",
    backgroundColor: { default: "transparent", ":hover": "var(--color-overlay-hover)" },
  },
  itemSelected: { borderLeftColor: "var(--color-accent)", backgroundColor: "var(--color-background-muted)" },
  itemMain: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" },
  itemPrice: { flexShrink: 0 },
  rightEmpty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8 },
  emptyIcon: { fontSize: 56, color: "var(--color-icon-disabled)", opacity: 0.4 },
  mobileBack: { padding: "12px 16px 0", flexShrink: 0 },
  detail: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  detailHead: {
    padding: { default: "16px", [MD]: "16px 24px" },
    borderBottom: "1px solid var(--color-border)",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  headRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 },
  headMain: { minWidth: 0, flex: 1 },
  headPrice: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  summaryChips: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  detailBody: { flex: 1, overflowY: "auto", padding: { default: 16, [MD]: 24 } },
  imgGrid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr" },
    gap: 16,
  },
  card: { overflow: "hidden", borderRadius: "var(--radius-container)", border: "1px solid var(--color-border)" },
  cardThumb: { height: 160, overflow: "hidden", backgroundColor: "var(--color-background-muted)" },
  cardImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardBody: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4 },
  cardLine: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardLineLeft: { display: "flex", alignItems: "center", gap: 6 },
  dialogBody: { display: "flex", flexDirection: "column", gap: 8, padding: 8 },
  dialogHead: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--color-border)", gap: 8 },
});

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div {...stylex.props(s.statCard)}>
      <span {...stylex.props(s.statLabel)}>
        <Text type="supporting" color="secondary">{label}</Text>
      </span>
      <Heading level={5}>{value}</Heading>
    </div>
  );
}

function OrderListItem({
  order, isSelected, onClick,
}: { order: TableOrderExtended; isSelected: boolean; onClick: () => void }) {
  return (
    // data-testid: Ankerpunkt für die E2E-Suite. Die Liste ist keine
    // semantische Tabelle, getByRole("row") greift hier nicht.
    <div data-testid="bestellzeile" onClick={onClick} {...stylex.props(s.item, isSelected && s.itemSelected)}>
      <div {...stylex.props(s.itemMain)}>
        <Text type="body" weight={isSelected ? "semibold" : "normal"} maxLines={1}>
          {order.userEmail ?? "–"}
        </Text>
        <Text type="supporting" color="secondary" maxLines={1}>
          {order.shootingTitle ?? "–"}
        </Text>
      </div>
      <span {...stylex.props(s.itemPrice)}>
        <Text type="body" weight="semibold">{order.totalPrice.toFixed(2)}€</Text>
      </span>
    </div>
  );
}

function OrderDetailPanel({
  order, finishing, onFinish,
}: { order: TableOrderExtended; finishing: boolean; onFinish: () => void }) {
  const items = useMemo(() => parseIPOL(order.imagePriceObjectList), [order.imagePriceObjectList]);
  const allPrices: PriceWithQuantity[] = items.flatMap(i => i.price);
  const printCount = allPrices.filter(p => !p.isDownloadable).reduce((s, p) => s + p.quantity, 0);
  const dlCount    = allPrices.filter(p => p.isDownloadable).reduce((s, p) => s + p.quantity, 0);

  return (
    <div {...stylex.props(s.detail)}>
      <div {...stylex.props(s.detailHead)}>
        <div {...stylex.props(s.headRow)}>
          <div {...stylex.props(s.headMain)}>
            <Heading level={6} maxLines={1}>{order.userEmail}</Heading>
            <Text type="body" color="secondary">{order.shootingTitle}</Text>
          </div>
          <div {...stylex.props(s.headPrice)}>
            <Heading level={6}>{order.totalPrice.toFixed(2)}€</Heading>
            {order.finished
              ? <Badge variant="success" label="Erledigt" />
              : <Badge variant="warning" label="Ausstehend" />}
          </div>
        </div>

        <div {...stylex.props(s.summaryChips)}>
          <Text type="supporting" color="secondary">
            {items.length} {items.length === 1 ? "Bild" : "Bilder"}
          </Text>
          {printCount > 0 && (
            <Badge variant="neutral" icon={<Print style={{ fontSize: 13 }} />} label={`${printCount} Druck`} />
          )}
          {dlCount > 0 && (
            <Badge variant="info" icon={<CloudDownload style={{ fontSize: 13 }} />} label={`${dlCount} Download`} />
          )}
        </div>

        {!order.finished && (
          <Button
            variant="primary"
            width="100%"
            icon={<Send />}
            isLoading={finishing}
            isDisabled={finishing}
            label="Bestellung abschicken"
            onClick={onFinish}
          />
        )}
      </div>

      <div {...stylex.props(s.detailBody)}>
        {items.length === 0 ? (
          <Text type="body" color="secondary">Keine Bilddetails verfügbar</Text>
        ) : (
          <div {...stylex.props(s.imgGrid)}>
            {items.map((item, idx) => (
              <div key={idx} {...stylex.props(s.card)}>
                {item.image && (
                  <div {...stylex.props(s.cardThumb)}>
                    <img
                      src={item.image}
                      alt={`Bild ${idx + 1}`}
                      {...stylex.props(s.cardImg)}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <div {...stylex.props(s.cardBody)}>
                  {item.price.map(p => (
                    <div key={p.id} {...stylex.props(s.cardLine)}>
                      <div {...stylex.props(s.cardLineLeft)}>
                        <Text type="body">{p.quantity}× {p.title}</Text>
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
      </div>
    </div>
  );
}

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
        // Rückfall auf `id` für Altbestände, die noch ohne orderId angelegt
        // wurden (siehe OrderDetailsPage.handleFinishOrder).
        orderId:              d.data().orderId || d.data().id,
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
        // orderId verknüpft den Archiveintrag mit der offenen Bestellung —
        // weiter unten blendet `pending` darüber die erledigten aus. Ohne das
        // Feld blieb eine abgeschickte Bestellung dauerhaft in der Liste der
        // offenen stehen: addDoc verwirft `id` (firestore-compat.ts:56), der
        // Archiveintrag bekam eine neue PocketBase-ID und passte zu nichts.
        orderId:              selectedOrder.id,
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
      <div {...stylex.props(s.loading)}>
        <Spinner size="lg" />
      </div>
    );
  }

  const SortIcon = sortDir === "asc" ? ArrowUpward : ArrowDownward;
  const TABS = [
    { icon: <Print style={{ fontSize: 15 }} />, label: `Druck (${tableOrders.length})` },
    { icon: <CloudDownload style={{ fontSize: 15 }} />, label: `DL (${downloadOrders.length})` },
    { icon: <CheckCircle style={{ fontSize: 15 }} />, label: `Erledigt (${finishedOrders.length})` },
  ];

  return (
    <>
      <div {...stylex.props(s.root)}>
        <div {...stylex.props(s.pageTitle)}>
          <Heading level={5}>Bestellungen</Heading>
        </div>

        <div {...stylex.props(s.statGrid)}>
          <StatCard label="Gesamtumsatz"     value={`${totalIncome.toFixed(2)}€`} />
          <StatCard label="Offen (Druck)"    value={tableOrders.length} />
          <StatCard label="Downloads bereit" value={downloadOrders.length} />
          <StatCard label="Abgeschlossen"    value={finishedOrders.length} />
        </div>

        <div {...stylex.props(s.linkRow)}>
          <Button variant="ghost" size="sm" label="Kundenumsätze anzeigen →" onClick={() => setSummaryOpen(true)} />
        </div>

        <div {...stylex.props(s.panels)}>
          {/* ===== LEFT PANEL ===== */}
          <div {...stylex.props(s.left, hasSelection && s.hideOnMobile)}>
            <div {...stylex.props(s.tabs)}>
              {TABS.map((t, i) => (
                <button
                  key={t.label}
                  {...stylex.props(s.tab, activeTab === i && s.tabActive)}
                  onClick={() => { setActiveTab(i); setSearch(""); setSelectedOrder(undefined); }}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            <div {...stylex.props(s.leftHead)}>
              <TextInput
                label="Suche"
                isLabelHidden
                width="100%"
                size="sm"
                startIcon={<Search />}
                placeholder="Kunde oder Shooting…"
                value={search}
                onChange={(v) => setSearch(v)}
              />
              <div {...stylex.props(s.sortRow)}>
                <Button
                  xstyle={s.sortBtn}
                  size="sm"
                  variant={sortKey === "email" ? "primary" : "secondary"}
                  endContent={sortKey === "email" ? <SortIcon style={{ fontSize: 14 }} /> : undefined}
                  label="Name"
                  onClick={() => toggleSort("email")}
                />
                <Button
                  xstyle={s.sortBtn}
                  size="sm"
                  variant={sortKey === "price" ? "primary" : "secondary"}
                  endContent={sortKey === "price" ? <SortIcon style={{ fontSize: 14 }} /> : undefined}
                  label="Preis"
                  onClick={() => toggleSort("price")}
                />
              </div>
            </div>

            <div {...stylex.props(s.list)}>
              {currentTabOrders.length === 0 ? (
                <div {...stylex.props(s.listEmpty)}>
                  <Text type="body" color="secondary">{search ? "Keine Ergebnisse" : "Keine Bestellungen"}</Text>
                </div>
              ) : activeTab === 2 && groupedFinished ? (
                (["Heute", "Diese Woche", "Älter"] as const).map(group => {
                  const items = groupedFinished[group];
                  if (!items.length) return null;
                  return (
                    <div key={group}>
                      <span {...stylex.props(s.groupLabel)}>
                        <Text type="supporting" color="disabled">{group}</Text>
                      </span>
                      {items.map(order => (
                        <OrderListItem
                          key={order.id}
                          order={order}
                          isSelected={selectedOrder?.id === order.id}
                          onClick={() => setSelectedOrder(order)}
                        />
                      ))}
                      <Divider />
                    </div>
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
            </div>
          </div>

          {/* ===== RIGHT PANEL ===== */}
          <div {...stylex.props(s.right, !hasSelection && s.hideOnMobile)}>
            {!selectedOrder ? (
              <div {...stylex.props(s.rightEmpty)}>
                <Assignment {...stylex.props(s.emptyIcon)} />
                <Text type="body" color="secondary">Bestellung auswählen</Text>
              </div>
            ) : (
              <div {...stylex.props(s.right)}>
                {isMobile && (
                  <div {...stylex.props(s.mobileBack)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowBack />}
                      label="Alle Bestellungen"
                      onClick={() => setSelectedOrder(undefined)}
                    />
                  </div>
                )}
                <OrderDetailPanel
                  order={selectedOrder}
                  finishing={finishing}
                  onFinish={() => void handleFinishOrder()}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kundenumsätze Dialog */}
      <Dialog isOpen={summaryOpen} onOpenChange={setSummaryOpen} width={520}>
        <div {...stylex.props(s.dialogBody)}>
          <div {...stylex.props(s.dialogHead)}>
            <Heading level={5}>Kundenumsätze</Heading>
            <IconButton variant="ghost" icon={<Close />} label="Schließen" onClick={() => setSummaryOpen(false)} />
          </div>
          <Text type="body" color="secondary">
            {userOrderList.filter(u => u.orderValue > 0).length} von {userOrderList.length} Kunden haben bestellt.
          </Text>
          {userOrderList.map(u => (
            <div key={u.user} {...stylex.props(s.summaryRow)}>
              <Text type="body" maxLines={1}>{u.user}</Text>
              <Text
                type="body"
                weight={u.orderValue > 0 ? "semibold" : "normal"}
                color={u.orderValue > 0 ? "primary" : "disabled"}
              >
                {u.orderValue.toFixed(2)}€
              </Text>
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
}
