import { ReactElement, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  ArrowBack,
  Delete,
  Edit,
  PhotoCamera,
  Search,
  Upload,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  QuerySnapshot,
  updateDoc,
} from "../../config/firestore-compat";

import { Package, Price, Shooting, User } from "../../utils/types";
import { AlbumContext } from "../../features/Album/utils/context";
import { emptyShooting } from "../../features/Album/utils/functions";
import useMobileService from "../../hooks/useMobileService";
import Album from "../../features/Album/components/Album";
import UploadComponent from "../../features/Album/components/UploadComponent";
import EditShootingModal from "../../features/Album/components/ShootingModal";
import DeleteModal from "../../components/widgets/DeleteModal";
import { getUsersSnapshot } from "../../utils/functions";
import { pb } from "../../config/pocketbase";
import { getShootingCoverUrl } from "../../config/storage-compat";

const TYPE_LABELS: Record<string, { label: string; color: "default" | "primary" | "success" | "warning" | "info" | "error" | "secondary" }> = {
  paid:   { label: "Bezahlt",    color: "default" },
  sale:   { label: "Verkauf",    color: "primary" },
  public: { label: "Öffentlich", color: "success" },
};

/* ---- Left-panel list item (extracted to avoid re-mounting on every render) ---- */

type ShootingListItemProps = {
  shooting: Shooting;
  isSelected: boolean;
  thumbnail?: string;
  onClick: () => void;
};

function ShootingListItem({ shooting, isSelected, thumbnail, onClick }: ShootingListItemProps) {
  const typeInfo = TYPE_LABELS[shooting.type] ?? { label: shooting.type, color: "default" as const };
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        cursor: "pointer",
        borderLeft: "3px solid",
        borderLeftColor: isSelected ? "primary.main" : "transparent",
        bgcolor: isSelected ? "action.selected" : "transparent",
        "&:hover": { bgcolor: isSelected ? "action.selected" : "action.hover" },
        transition: "background-color 0.15s",
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 1,
          overflow: "hidden",
          flexShrink: 0,
          bgcolor: "grey.100",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {thumbnail ? (
          <img src={thumbnail} alt={shooting.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <PhotoCamera sx={{ color: "grey.400", fontSize: 18 }} />
        )}
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={isSelected ? 600 : 400} noWrap title={shooting.title}>
          {shooting.title}
        </Typography>
        <Chip
          label={typeInfo.label}
          color={typeInfo.color}
          size="small"
          sx={{ mt: 0.25, height: 18, fontSize: "0.65rem" }}
        />
      </Box>
    </Box>
  );
}

/* ---- Right-panel detail header ---- */

type ShootingDetailHeaderProps = {
  shooting: Shooting;
  thumbnail?: string;
  users: User[];
  prices: Price[];
  packages: Package[];
  onEdit: () => void;
  onUpload: () => void;
  onDelete: () => void;
};

function ShootingDetailHeader({ shooting, thumbnail, users, prices, packages, onEdit, onUpload, onDelete }: ShootingDetailHeaderProps) {
  const typeInfo = TYPE_LABELS[shooting.type] ?? { label: shooting.type, color: "default" as const };
  const assignedUsers   = users.filter(u => (shooting.userIds  ?? []).includes(u.uid));
  const assignedPrices  = prices.filter(p => (shooting.priceIds ?? []).includes(p.id));
  const assignedPackage = packages.find(pk => pk.id === shooting.packageId);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Cover image */}
      <Box
        sx={{
          width: "100%",
          height: 200,
          bgcolor: "grey.100",
          borderRadius: 2,
          overflow: "hidden",
          position: "relative",
          mb: 2,
        }}
      >
        {thumbnail ? (
          <img src={thumbnail} alt={shooting.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <PhotoCamera sx={{ fontSize: 48, color: "grey.400" }} />
          </Box>
        )}
        {/* Action buttons overlay */}
        <Box sx={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 0.5 }}>
          <Tooltip title="Bearbeiten">
            <IconButton
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.92)", "&:hover": { bgcolor: "white" } }}
              onClick={onEdit}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bilder hochladen">
            <IconButton
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.92)", "&:hover": { bgcolor: "white" } }}
              onClick={onUpload}
            >
              <Upload fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Shooting löschen">
            <IconButton
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.92)", "&:hover": { bgcolor: "white" }, color: "error.main" }}
              onClick={onDelete}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Title + type */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1} mb={1} flexWrap="wrap">
        <Box flex={1} minWidth={0}>
          <Typography variant="h6" fontWeight={600} noWrap title={shooting.title}>
            {shooting.title}
          </Typography>
          {shooting.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {shooting.description}
            </Typography>
          )}
        </Box>
        <Chip label={typeInfo.label} color={typeInfo.color} sx={{ flexShrink: 0 }} />
      </Box>

      {/* Assigned users */}
      {assignedUsers.length > 0 && (
        <Box display="flex" flexWrap="wrap" gap={0.5} mb={0.75}>
          {assignedUsers.map(u => (
            <Chip key={u.uid} label={`${u.firstName} ${u.lastName}`} size="small" variant="outlined" />
          ))}
        </Box>
      )}

      {/* Assigned prices */}
      {assignedPrices.length > 0 && (
        <Box display="flex" flexWrap="wrap" gap={0.5} mb={0.75}>
          {assignedPrices.map(p => (
            <Chip key={p.id} label={`${p.title} – ${p.amount}€`} size="small" variant="outlined" />
          ))}
        </Box>
      )}

      {/* Assigned package */}
      {assignedPackage && (
        <Box mb={0.75}>
          <Chip
            label={`${assignedPackage.title} – ${assignedPackage.numberOfImages} Stk. – ${assignedPackage.totalPrice}€`}
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      <Divider sx={{ mt: 1.5 }} />
    </Box>
  );
}

/* ---- Main page ---- */

export default function AdminAlbumPage(): ReactElement {
  const isMobile = useMobileService();

  /* modal / flag states */
  const [openDeleteModal, setOpenDeleteModal]   = useState(false);
  const [openEditModal,   setOpenEditModal]     = useState(false);
  const [reload,          setReload]            = useState(0);
  const [openUploadModal, setOpenUploadModal]   = useState(false);
  const [addPackage,      setAddPackage]        = useState(false);
  const [selectMode,      setSelectMode]        = useState(false);
  const [loading,         setLoading]           = useState(false);

  /* image selection */
  const [selected, setSelected] = useState<string[]>([]);

  /* data */
  const [shootings,       setShootings]       = useState<Shooting[]>([]);
  const [selectedShooting,setSelectedShooting]= useState<Shooting | undefined>();
  const [users,           setUsers]           = useState<User[]>([]);
  const [prices,          setPrices]          = useState<Price[]>([]);
  const [packages,        setPackages]        = useState<Package[]>([]);
  const [selectedUsers,   setSelectedUsers]   = useState<User[]>([]);
  const [selectedPrices,  setSelectedPrices]  = useState<Price[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | undefined>();

  /* left panel */
  const [search,     setSearch]     = useState("");
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

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
    const snap: QuerySnapshot<DocumentData> = await getDocs(collection("shootings"));
    const list: Shooting[] = [];
    const thumbs: Record<string, string> = {};
    await Promise.all(snap.docs.map(async (d: any) => {
      const r = d.data();
      list.push({
        id: d.id,
        type: r.type ?? "",
        title: r.title ?? "",
        description: r.description ?? "",
        priceIds: r.priceIds ?? [],
        packageId: r.packageId ?? "",
        userIds: r.userIds ?? [],
        withUserSelection: r.withUserSelection ?? false,
      });
      try {
        const url = await getShootingCoverUrl({ ...r, id: d.id },
          { coverThumb: "100x100", previewThumb: "400x0" });
        if (url) thumbs[d.id] = url;
      } catch { /* no thumbnail, placeholder is shown */ }
    }));
    setShootings(list);
    setThumbnails(thumbs);
  }

  async function fetchUsers() {
    setUsers(await getUsersSnapshot());
  }

  async function fetchPrices() {
    const snap: QuerySnapshot<DocumentData> = await getDocs(collection("prices"));
    setPrices(snap.docs.map((d: any) => ({
      id: d.id,
      title: d.data().title,
      description: d.data().description,
      amount: d.data().amount,
      isDownloadable: d.data().isDownloadable,
    })));
  }

  async function fetchPackages() {
    const snap: QuerySnapshot<DocumentData> = await getDocs(collection("packages"));
    setPackages(snap.docs.map((d: any) => ({
      id: d.id,
      title: d.data().title,
      numberOfImages: d.data().numberOfImages,
      totalPrice: d.data().totalPrice,
      singlePrice: d.data().singlePrice,
    })));
  }

  const handleDeleteShooting = async (): Promise<void> => {
    if (!selectedShooting) return;
    setLoading(true);
    try {
      if (selectedShooting.userIds?.length) {
        await Promise.all(selectedShooting.userIds.map(async userId => {
          const userRef = doc("users", userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const u = userDoc.data();
            await updateDoc(userRef, {
              shootingIds: (u?.shootingIds ?? []).filter((id: string) => id !== selectedShooting.id),
            });
          }
        }));
      }
      await deleteDoc(doc("shootings", selectedShooting.id));
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AlbumContext.Provider value={{
      selectedShooting,
      setSelectedShooting,
      selectedUsers,
      setSelectedUsers,
      selectedPrices,
      setSelectedPrices,
      selectedPackage,
      setSelectedPackage,
      shootings,
      setShootings,
      users,
      setUsers,
      prices,
      setPrices,
      packages,
      setPackages,
      reload,
      setReload,
      openEditModal,
      setOpenEditModal,
      openDeleteModal,
      setOpenDeleteModal,
      selectMode,
      setSelectMode,
      selected,
      setSelected,
      openUploadModal,
      setOpenUploadModal,
      handleDeleteShooting,
      setShowShooting: () => {},
      addPackage,
      setAddPackage,
    }}>
      <Box sx={{ pt: 1 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1.5, display: { xs: "none", md: "block" } }}>
          Album
        </Typography>

        {/* ===== Two-panel container ===== */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: { xs: "visible", md: "hidden" },
            height: { md: "calc(100vh - 160px)" },
            minHeight: { md: 500 },
            bgcolor: "background.paper",
          }}
        >
          {/* ===== LEFT PANEL ===== */}
          <Box
            sx={{
              width: { md: 280 },
              flexShrink: 0,
              borderRight: { md: "1px solid" },
              borderBottom: { xs: "1px solid", md: "none" },
              borderColor: "divider",
              display: { xs: selectedShooting ? "none" : "flex", md: "flex" },
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Left header */}
            <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={<Add />}
                onClick={() => {
                  setSelectedShooting(emptyShooting);
                  setSelectedUsers([]);
                  setSelectedPrices([]);
                  setSelectedPackage(undefined);
                  setOpenEditModal(true);
                }}
              >
                Neues Shooting
              </Button>
              <TextField
                fullWidth
                size="small"
                placeholder="Suche…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ mt: 1.25 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Shooting list */}
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {filteredShootings.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ p: 2, textAlign: "center", pt: 4 }}>
                  {search ? "Keine Ergebnisse" : "Keine Shootings"}
                </Typography>
              ) : (
                filteredShootings.map(s => (
                  <ShootingListItem
                    key={s.id}
                    shooting={s}
                    isSelected={selectedShooting?.id === s.id}
                    thumbnail={thumbnails[s.id]}
                    onClick={() => setSelectedShooting(s)}
                  />
                ))
              )}
            </Box>
          </Box>

          {/* ===== RIGHT PANEL ===== */}
          <Box
            sx={{
              flex: 1,
              display: { xs: selectedShooting ? "flex" : "none", md: "flex" },
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {!selectedShooting ? (
              /* Desktop empty state */
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1} gap={1}>
                <PhotoCamera sx={{ fontSize: 56, color: "text.disabled", opacity: 0.5 }} />
                <Typography variant="body1" color="text.secondary">
                  Shooting auswählen
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 3 } }}>
                {/* Mobile: back to list */}
                {isMobile && (
                  <Button
                    startIcon={<ArrowBack />}
                    onClick={() => setSelectedShooting(undefined)}
                    sx={{ mb: 2 }}
                    size="small"
                  >
                    Alle Shootings
                  </Button>
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
              </Box>
            )}
          </Box>
        </Box>
      </Box>

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
    </AlbumContext.Provider>
  );
}
