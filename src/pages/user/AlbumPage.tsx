import { ReactElement, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Add, ArrowBack, Collections, PhotoLibrary, Search } from "@mui/icons-material";
import { currentUser } from "../../config/currentUser";
import { doc, getDoc, updateDoc } from "../../config/firestore-compat";
import { pb } from "../../config/pocketbase";
import { getShootingCoverUrl } from "../../config/storage-compat";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import Album from "../../features/Album/components/Album";

type ShootingInfo = {
  id: string;
  title: string;
  type: string;
  description: string;
  coverUrl: string;
};

const typeLabel: Record<string, string> = {
  paid: "Bezahlt",
  public: "Öffentlich",
  sale: "Verkauf",
};

// Album card: full-bleed cover with the title in a gradient overlay.
function AlbumCard({
  shooting,
  onClick,
}: {
  shooting: ShootingInfo;
  onClick: () => void;
}): ReactElement {
  const [loaded, setLoaded] = useState(false);
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        borderRadius: 1,
        overflow: "hidden",
        cursor: "pointer",
        aspectRatio: "4 / 3",
        bgcolor: "action.hover",
        "&:hover img": { transform: "scale(1.04)" },
      }}
    >
      {shooting.coverUrl ? (
        <Box
          component="img"
          src={shooting.coverUrl}
          alt={shooting.title}
          onLoad={() => setLoaded(true)}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.3s ease, transform 0.35s ease",
          }}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Collections sx={{ fontSize: 48, color: "text.disabled" }} />
        </Box>
      )}

      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          px: 2,
          pt: 5,
          pb: 1.5,
          background: "linear-gradient(transparent, rgba(0,0,0,0.72))",
          color: "#fff",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
          {shooting.title || "Ohne Titel"}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
          {typeLabel[shooting.type] && (
            <Typography
              variant="caption"
              sx={{ letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.85 }}
            >
              {typeLabel[shooting.type]}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function AlbumPage(): ReactElement {
  const [shootings, setShootings] = useState<ShootingInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { void fetchShootings(); }, []);

  async function fetchShootings() {
    setLoading(true);
    const user = currentUser();
    if (!user) { setLoading(false); return; }
    try {
      const snap = await getDoc(doc("users", user.uid));
      if (!snap.exists()) { setLoading(false); return; }
      const ids: string[] = snap.data()?.shootingIds ?? [];
      const results: ShootingInfo[] = [];
      await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await pb.collection("shootings").getOne(id, { requestKey: null });
            results.push({
              id: r.id,
              title: r.title ?? "",
              type: r.type ?? "",
              description: r.description ?? "",
              coverUrl: await getShootingCoverUrl(r,
                { coverThumb: "800x600", previewThumb: "800x0" }),
            });
          } catch { /* shooting not found, skip */ }
        })
      );
      setShootings(results);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleAddShooting() {
    const trimmed = newId.trim();
    if (!trimmed) return;
    setAdding(true);
    const user = currentUser();
    if (!user) { setAdding(false); return; }
    try {
      const userDoc = doc("users", user.uid);
      const snap = await getDoc(userDoc);
      if (snap.exists()) {
        const existing: string[] = snap.data()?.shootingIds ?? [];
        if (!existing.includes(trimmed)) {
          await updateDoc(userDoc, { shootingIds: [...existing, trimmed] });
        }
      }
      toast.success("Album hinzugefügt");
      setAddOpen(false);
      setNewId("");
      await fetchShootings();
    } catch {
      toast.error("Fehler beim Hinzufügen des Albums");
    }
    setAdding(false);
  }

  const selectedShooting = useMemo(
    () => shootings.find((s) => s.id === selectedId),
    [shootings, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return shootings.filter((s) => s.title.toLowerCase().includes(q));
  }, [shootings, search]);

  if (loading) {
    return (
      <Page>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
        </Box>
      </Page>
    );
  }

  // ── album detail ──
  if (selectedId && selectedShooting) {
    return (
      <Page>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 2, pb: 1 }}>
          <IconButton
            onClick={() => {
              setSelectedId(undefined);
              setSelected([]);
              setSelectMode(false);
            }}
            aria-label="Zurück zur Übersicht"
          >
            <ArrowBack />
          </IconButton>
          <Box minWidth={0}>
            <Typography variant="h4" component="h1" noWrap>
              {selectedShooting.title || "Ohne Titel"}
            </Typography>
            {selectedShooting.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {selectedShooting.description}
              </Typography>
            )}
          </Box>
          {typeLabel[selectedShooting.type] && (
            <Chip label={typeLabel[selectedShooting.type]} size="small" sx={{ ml: "auto" }} />
          )}
        </Box>
        <Album
          isAdminAlbum={false}
          shootingId={selectedId}
          selected={selected}
          setSelected={setSelected}
          selectMode={selectMode}
          setSelectMode={setSelectMode}
        />
      </Page>
    );
  }

  // ── album overview ──
  return (
    <Page>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          pt: 3,
          pb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h3" component="h1">
          Meine Alben
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {shootings.length > 6 && (
            <TextField
              size="small"
              placeholder="Suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          )}
          <Button variant="outlined" startIcon={<Add />} onClick={() => setAddOpen(true)}>
            Hinzufügen
          </Button>
        </Box>
      </Box>

      {filtered.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={2}
          sx={{ py: 10 }}
        >
          <PhotoLibrary sx={{ fontSize: 72, color: "text.disabled" }} />
          <Typography variant="h6" color="text.secondary" align="center">
            {search ? "Keine Alben gefunden." : "Noch kein Album vorhanden."}
          </Typography>
          {!search && (
            <>
              <Typography variant="body2" color="text.disabled" align="center">
                Füge dein erstes Album mit der Shooting-ID hinzu, die du
                erhalten hast.
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)}>
                Album hinzufügen
              </Button>
            </>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <AlbumCard
                shooting={s}
                onClick={() => {
                  setSelectedId(s.id);
                  setSelected([]);
                  setSelectMode(false);
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── add shooting dialog ── */}
      <Dialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setNewId(""); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Album hinzufügen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Gib die Shooting-ID ein. Du findest sie auf der Karte, die du erhalten hast.
          </Typography>
          <TextField
            fullWidth
            label="Shooting-ID"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAddShooting(); }}
            autoFocus
          />
          <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
            <Button onClick={() => { setAddOpen(false); setNewId(""); }}>
              Abbrechen
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleAddShooting()}
              disabled={!newId.trim() || adding}
              startIcon={adding ? <CircularProgress size={16} color="inherit" /> : <Add />}
            >
              Hinzufügen
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
