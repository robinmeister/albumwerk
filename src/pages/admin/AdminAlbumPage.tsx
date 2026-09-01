import { ReactElement, useEffect, useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Plus as Add, ArrowLeft as ArrowBack, Trash2 as Delete, Pencil as Edit, Camera as PhotoCamera, Search, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import { Package, Price, Shooting, User } from "../../utils/types";
import { AlbumContext } from "../../features/Album/utils/context";
import { emptyShooting } from "../../features/Album/utils/functions";
import useMobileService from "../../hooks/useMobileService";
import Album from "../../features/Album/components/Album";
import UploadComponent from "../../features/Album/components/UploadComponent";
import EditShootingModal from "../../features/Album/components/ShootingModal";
import DeleteModal from "../../components/widgets/DeleteModal";
import HelpBanner from "../../components/feedback/HelpBanner";
import HelpHint from "../../components/widgets/HelpHint";
import { useSettings } from "../../context/SettingsContext";
import { getUsersSnapshot } from "../../utils/functions";
import { getRecord, pb } from "../../config/pocketbase";
import { getShootingCoverUrl } from "../../config/images";
import CustomerPreview from "../../features/Preview/CustomerPreview";

type BadgeVariant = "neutral" | "info" | "success";
const TYPE_LABELS: Record<string, { label: string; color: BadgeVariant }> = {
  paid:   { label: "Bezahlt",    color: "neutral" },
  sale:   { label: "Verkauf",    color: "info" },
  public: { label: "Öffentlich", color: "success" },
};

const MD = "@media (min-width: 900px)";

const s = stylex.create({
  loading: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" },
  root: { paddingTop: 8 },
  pageTitle: { marginBottom: 12, display: { default: "none", [MD]: "flex" }, alignItems: "center", gap: 4 },
  panels: {
    display: "flex",
    flexDirection: { default: "column", [MD]: "row" },
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-container)",
    overflow: { default: "visible", [MD]: "hidden" },
    height: { [MD]: "calc(100vh - 160px)" },
    minHeight: { [MD]: 500 },
    backgroundColor: "var(--color-background-card)",
  },
  left: {
    width: { [MD]: 280 },
    flexShrink: 0,
    borderRight: { [MD]: "1px solid var(--color-border)" },
    borderBottom: { default: "1px solid var(--color-border)", [MD]: "none" },
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  right: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  // hide on mobile, always show from md up
  hideOnMobile: { display: { default: "none", [MD]: "flex" } },
  leftHead: { padding: 12, borderBottom: "1px solid var(--color-border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 },
  list: { flex: 1, overflowY: "auto" },
  listEmpty: { padding: 16, textAlign: "center", paddingTop: 32 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    cursor: "pointer",
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    transition: "background-color 0.15s",
    backgroundColor: { default: "transparent", ":hover": "var(--color-overlay-hover)" },
    borderLeftColor: "transparent",
  },
  itemSelected: {
    borderLeftColor: "var(--color-accent)",
    backgroundColor: "var(--color-background-muted)",
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: "var(--radius-element)",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "var(--color-background-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  placeholderIcon: { color: "var(--color-icon-disabled)", fontSize: 18 },
  itemMain: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" },
  // alignItems: flex-start gibt den Kindern Inhaltsbreite — ohne diese Grenze
  // wächst die Textbox über die Liste hinaus und maxLines kürzt nichts.
  itemTitle: { maxWidth: "100%" },
  rightEmpty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8 },
  emptyIcon: { fontSize: 56, color: "var(--color-icon-disabled)", opacity: 0.5 },
  rightScroll: { flex: 1, overflowY: "auto", padding: { default: 16, [MD]: 24 } },
  cover: {
    width: "100%",
    height: 200,
    backgroundColor: "var(--color-background-muted)",
    borderRadius: "var(--radius-container)",
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
  },
  coverPlaceholder: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%" },
  coverIcon: { fontSize: 48, color: "var(--color-icon-disabled)" },
  overlayActions: { position: "absolute", top: 8, right: 8, display: "flex", gap: 4 },
  overlayBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    border: "none",
    borderRadius: "var(--radius-full)",
    cursor: "pointer",
    color: "#111",
    backgroundColor: { default: "rgba(255,255,255,0.92)", ":hover": "#fff" },
  },
  overlayBtnDanger: { color: "var(--color-error)" },
  detailHead: { marginBottom: 24 },
  titleRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  titleMain: { flex: 1, minWidth: 0 },
  chips: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 },
  previewRow: { marginBottom: 12 },
  divider: { marginTop: 12, borderTop: "1px solid var(--color-border)" },
  backBtn: { marginBottom: 16 },
  verkaufBanner: { marginBottom: 16 },
});

function ShootingListItem({
  shooting, isSelected, thumbnail, onClick,
}: { shooting: Shooting; isSelected: boolean; thumbnail?: string; onClick: () => void }) {
  const typeInfo = TYPE_LABELS[shooting.type] ?? { label: shooting.type, color: "neutral" as const };
  return (
    <div onClick={onClick} {...stylex.props(s.item, isSelected && s.itemSelected)}>
      <div {...stylex.props(s.thumb)}>
        {thumbnail ? (
          <img src={thumbnail} alt={shooting.title} {...stylex.props(s.thumbImg)} />
        ) : (
          <PhotoCamera {...stylex.props(s.placeholderIcon)} />
        )}
      </div>
      <div {...stylex.props(s.itemMain)}>
        <Text
          type="body"
          weight={isSelected ? "semibold" : "normal"}
          maxLines={1}
          xstyle={s.itemTitle}
        >
          {shooting.title}
        </Text>
        <Badge variant={typeInfo.color} label={typeInfo.label} />
      </div>
    </div>
  );
}

function ShootingDetailHeader({
  shooting, thumbnail, users, prices, packages, onEdit, onUpload, onDelete, onPreview,
}: {
  shooting: Shooting; thumbnail?: string; users: User[]; prices: Price[]; packages: Package[];
  onEdit: () => void; onUpload: () => void; onDelete: () => void; onPreview: () => void;
}) {
  const typeInfo = TYPE_LABELS[shooting.type] ?? { label: shooting.type, color: "neutral" as const };
  const assignedUsers   = users.filter(u => (shooting.userIds  ?? []).includes(u.uid));
  const assignedPrices  = prices.filter(p => (shooting.priceIds ?? []).includes(p.id));
  const assignedPackage = packages.find(pk => pk.id === shooting.packageId);

  // data-testid: Ankerpunkt für die E2E-Suite. Sie schneidet daraus die
  // Screenshots der Hilfe-Artikel zu — ohne stabilen Anker hinge jeder
  // Bildausschnitt an einer Kette generierter StyleX-Klassen.
  return (
    <div data-testid="shooting-detail" {...stylex.props(s.detailHead)}>
      <div {...stylex.props(s.cover)}>
        {thumbnail ? (
          <img src={thumbnail} alt={shooting.title} {...stylex.props(s.thumbImg)} />
        ) : (
          <div {...stylex.props(s.coverPlaceholder)}>
            <PhotoCamera {...stylex.props(s.coverIcon)} />
          </div>
        )}
        <div {...stylex.props(s.overlayActions)}>
          <button aria-label="Bearbeiten" title="Bearbeiten" onClick={onEdit} {...stylex.props(s.overlayBtn)}>
            <Edit />
          </button>
          <button aria-label="Bilder hochladen" title="Bilder hochladen" onClick={onUpload} {...stylex.props(s.overlayBtn)}>
            <Upload />
          </button>
          <button aria-label="Shooting löschen" title="Shooting löschen" onClick={onDelete} {...stylex.props(s.overlayBtn, s.overlayBtnDanger)}>
            <Delete />
          </button>
        </div>
      </div>

      <div {...stylex.props(s.titleRow)}>
        <div {...stylex.props(s.titleMain)}>
          <Heading level={6} maxLines={1}>{shooting.title}</Heading>
          {shooting.description && (
            <Text type="body" color="secondary">{shooting.description}</Text>
          )}
        </div>
        <Badge variant={typeInfo.color} label={typeInfo.label} />
      </div>

      <div {...stylex.props(s.previewRow)}>
        <Button
          variant="secondary"
          label="Kundenansicht"
          onClick={onPreview}
          data-testid="kundenansicht-oeffnen"
        />
      </div>

      {assignedUsers.length > 0 && (
        <div {...stylex.props(s.chips)}>
          {assignedUsers.map(u => (
            <Badge key={u.uid} variant="neutral" label={`${u.firstName} ${u.lastName}`} />
          ))}
        </div>
      )}
      {assignedPrices.length > 0 && (
        <div {...stylex.props(s.chips)}>
          {assignedPrices.map(p => (
            <Badge key={p.id} variant="neutral" label={`${p.title} – ${p.amount}€`} />
          ))}
        </div>
      )}
      {assignedPackage && (
        <div {...stylex.props(s.chips)}>
          <Badge
            variant="neutral"
            label={`${assignedPackage.title} – ${assignedPackage.numberOfImages} Stk. – ${assignedPackage.totalPrice}€`}
          />
        </div>
      )}

      <div {...stylex.props(s.divider)} />
    </div>
  );
}

export default function AdminAlbumPage(): ReactElement {
  const isMobile = useMobileService();
  const { verkauf } = useSettings();
  const navigate = useNavigate();

  const [openDeleteModal, setOpenDeleteModal]   = useState(false);
  const [openEditModal,   setOpenEditModal]     = useState(false);
  const [reload,          setReload]            = useState(0);
  const [openUploadModal, setOpenUploadModal]   = useState(false);
  const [addPackage,      setAddPackage]        = useState(false);
  const [selectMode,      setSelectMode]        = useState(false);
  const [loading,         setLoading]           = useState(false);

  const [selected, setSelected] = useState<string[]>([]);

  const [shootings,       setShootings]       = useState<Shooting[]>([]);
  const [selectedShooting,setSelectedShooting]= useState<Shooting | undefined>();
  const [users,           setUsers]           = useState<User[]>([]);
  const [prices,          setPrices]          = useState<Price[]>([]);
  const [packages,        setPackages]        = useState<Package[]>([]);
  const [selectedUsers,   setSelectedUsers]   = useState<User[]>([]);
  const [selectedPrices,  setSelectedPrices]  = useState<Price[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | undefined>();

  const [search,     setSearch]     = useState("");
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [vorschauFuer, setVorschauFuer] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void Promise.all([fetchShootings(), fetchUsers(), fetchPrices(), fetchPackages()])
      .finally(() => setLoading(false));
  }, []);

  const filteredShootings = useMemo(() => {
    const q = search.toLowerCase();
    return [...shootings]
      .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""))
      .filter(s => (s.title ?? "").toLowerCase().includes(q));
  }, [shootings, search]);

  async function fetchShootings() {
    const records = await pb.collection("shootings").getFullList({ requestKey: null });
    const list: Shooting[] = [];
    const thumbs: Record<string, string> = {};
    await Promise.all(records.map(async (r: any) => {
      list.push({
        id: r.id,
        type: r.type ?? "",
        title: r.title ?? "",
        description: r.description ?? "",
        priceIds: r.priceIds ?? [],
        packageId: r.packageId ?? "",
        userIds: r.userIds ?? [],
        withUserSelection: r.withUserSelection ?? false,
      });
      try {
        const url = await getShootingCoverUrl(r,
          { coverThumb: "100x100", previewThumb: "400x0" });
        if (url) thumbs[r.id] = url;
      } catch { /* no thumbnail, placeholder is shown */ }
    }));
    setShootings(list);
    setThumbnails(thumbs);
  }

  async function fetchUsers() {
    setUsers(await getUsersSnapshot());
  }

  async function fetchPrices() {
    const records = await pb.collection("prices").getFullList({ requestKey: null });
    setPrices(records.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      amount: r.amount,
      isDownloadable: r.isDownloadable,
    })));
  }

  async function fetchPackages() {
    const records = await pb.collection("packages").getFullList({ requestKey: null });
    setPackages(records.map((r: any) => ({
      id: r.id,
      title: r.title,
      numberOfImages: r.numberOfImages,
      totalPrice: r.totalPrice,
      singlePrice: r.singlePrice,
    })));
  }

  const handleDeleteShooting = async (): Promise<void> => {
    if (!selectedShooting) return;
    setLoading(true);
    try {
      if (selectedShooting.userIds?.length) {
        await Promise.all(selectedShooting.userIds.map(async userId => {
          const u = await getRecord("users", userId);
          if (u) {
            await pb.collection("users").update(userId, {
              shootingIds: (u.shootingIds ?? []).filter((id: string) => id !== selectedShooting.id),
            });
          }
        }));
      }
      await pb.collection("shootings").delete(selectedShooting.id);
      setShootings(prev => prev.filter(s => s.id !== selectedShooting.id));
      setSelectedShooting(undefined);
      toast.success("Shooting erfolgreich gelöscht");
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Löschen des Shootings");
    }
    setLoading(false);
  };

  const openEditForShooting = (shooting: Shooting) => {
    setSelectedUsers(users.filter(u => (shooting.userIds ?? []).includes(u.uid)));
    setSelectedPrices(prices.filter(p => (shooting.priceIds ?? []).includes(p.id)));
    setSelectedPackage(packages.find(pk => pk.id === shooting.packageId));
    setSelectedShooting(shooting);
    setOpenEditModal(true);
  };

  if (loading && shootings.length === 0) {
    return (
      <div {...stylex.props(s.loading)}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AlbumContext.Provider value={{
      selectedShooting, setSelectedShooting, setSelectedUsers,
      selectedPrices, setSelectedPrices, selectedPackage, setSelectedPackage,
      shootings, setShootings, users, prices, packages,
      reload, setReload, openEditModal, setOpenEditModal,
      openUploadModal, setOpenUploadModal, addPackage, setAddPackage,
    }}>
      <div {...stylex.props(s.root)}>
        {verkauf.gesperrt && (
          // Nicht wegklickbar, anders als HelpBanner: der merkt sich
          // Ablehnungen pro Browser, und ein weggeklickter Hinweis auf
          // einen gesperrten Verkauf wäre ein stiller Ausfall.
          //
          // verkauf.gesperrt ist vor dem ersten Laden und nach einem
          // Fehlschlag false (siehe VERKAUF_UNBEKANNT in utils/verkauf.ts) —
          // der Banner blitzt beim Seitenaufruf also nicht kurz auf, er
          // erscheint erst, wenn der Server tatsächlich offene harte Punkte
          // meldet.
          <div data-testid="verkauf-gesperrt-banner" {...stylex.props(s.verkaufBanner)}>
            <Banner
              status="warning"
              title={
                verkauf.offeneHarte.length === 1
                  ? "Noch 1 Ding bis zum Verkauf der Fotos — solange kann niemand kaufen."
                  : `Noch ${verkauf.offeneHarte.length} Dinge bis zum Verkauf der Fotos — solange kann niemand kaufen.`
              }
              endContent={
                <Button variant="secondary" label="Jetzt erledigen" onClick={() => navigate("/einrichtung")} />
              }
            />
          </div>
        )}

        <div {...stylex.props(s.pageTitle)}>
          <Heading level={5}>Album</Heading>
          <HelpHint slug="album-anlegen" />
        </div>

        <HelpBanner
          slug="album-anlegen"
          title="Leg dein erstes Shooting an"
          isHidden={loading || shootings.length > 0}
        />

        {/* ===== Two-panel container ===== */}
        <div {...stylex.props(s.panels)}>
          {/* ===== LEFT PANEL ===== */}
          <div {...stylex.props(s.left, selectedShooting && s.hideOnMobile)}>
            <div {...stylex.props(s.leftHead)}>
              <Button
                variant="primary"
                width="100%"
                size="sm"
                icon={<Add />}
                label="Neues Shooting"
                onClick={() => {
                  setSelectedShooting(emptyShooting);
                  setSelectedUsers([]);
                  setSelectedPrices([]);
                  setSelectedPackage(undefined);
                  setOpenEditModal(true);
                }}
              />
              <TextInput
                label="Suche"
                isLabelHidden
                width="100%"
                size="sm"
                startIcon={<Search />}
                placeholder="Suche…"
                value={search}
                onChange={(v) => setSearch(v)}
              />
            </div>

            <div {...stylex.props(s.list)}>
              {filteredShootings.length === 0 ? (
                <div {...stylex.props(s.listEmpty)}>
                  <Text type="body" color="secondary">
                    {search ? "Keine Ergebnisse" : "Keine Shootings"}
                  </Text>
                </div>
              ) : (
                filteredShootings.map(sh => (
                  <ShootingListItem
                    key={sh.id}
                    shooting={sh}
                    isSelected={selectedShooting?.id === sh.id}
                    thumbnail={thumbnails[sh.id]}
                    onClick={() => setSelectedShooting(sh)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ===== RIGHT PANEL ===== */}
          <div {...stylex.props(s.right, !selectedShooting && s.hideOnMobile)}>
            {!selectedShooting ? (
              <div {...stylex.props(s.rightEmpty)}>
                <PhotoCamera {...stylex.props(s.emptyIcon)} />
                <Text type="body" color="secondary">Shooting auswählen</Text>
              </div>
            ) : (
              <div {...stylex.props(s.rightScroll)}>
                {isMobile && (
                  <div {...stylex.props(s.backBtn)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowBack />}
                      label="Alle Shootings"
                      onClick={() => setSelectedShooting(undefined)}
                    />
                  </div>
                )}

                <ShootingDetailHeader
                  shooting={selectedShooting}
                  thumbnail={thumbnails[selectedShooting.id]}
                  users={users}
                  prices={prices}
                  packages={packages}
                  onEdit={() => openEditForShooting(selectedShooting)}
                  onUpload={() => setOpenUploadModal(true)}
                  onDelete={() => setOpenDeleteModal(true)}
                  onPreview={() => setVorschauFuer(selectedShooting.id)}
                />

                <Album
                  isAdminAlbum={true}
                  shootingId={selectedShooting.id}
                  reloadKey={reload}
                  selected={selected}
                  setSelected={setSelected}
                  selectMode={selectMode}
                  setSelectMode={setSelectMode}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadComponent />
      <EditShootingModal />
      <DeleteModal
        name={selectedShooting?.title ?? ""}
        open={openDeleteModal}
        setOpen={() => setOpenDeleteModal(false)}
        onDelete={() => {
          void handleDeleteShooting();
          setOpenDeleteModal(false);
        }}
      />

      {vorschauFuer && (
        <CustomerPreview shootingId={vorschauFuer} onClose={() => setVorschauFuer(null)} />
      )}
    </AlbumContext.Provider>
  );
}
