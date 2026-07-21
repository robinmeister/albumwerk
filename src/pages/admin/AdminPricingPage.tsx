import { ReactElement, useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, ArrowBack, AutoAwesome, Delete, Euro, LocalOffer, Search } from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "../../config/firestore-compat";

import { Package, Price } from "../../utils/types";
import DeleteModal from "../../components/widgets/DeleteModal";
import useMobileService from "../../hooks/useMobileService";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PriceCategory,
  SIZE_SUGGESTIONS,
  STANDARD_CATALOG,
  STANDARD_PACKAGES,
  categoryOf,
  groupPrices,
  packageTitle,
  priceTitle,
} from "../../features/Pricing/utils/catalog";

/* ---- Types ---- */

type PriceForm = {
  title: string;
  amount: string;
  description: string;
  isDownloadable: boolean;
  category: PriceCategory;
  size: string;
};

type PackageForm = {
  title: string;
  numberOfImages: string;
  totalPrice: string;
  singlePrice: string;
  description: string;
};

const EMPTY_PRICE_FORM: PriceForm = {
  title: "", amount: "", description: "", isDownloadable: false,
  category: "print", size: "",
};
const EMPTY_PKG_FORM: PackageForm  = { title: "", numberOfImages: "", totalPrice: "", singlePrice: "", description: "" };

/* ---- Shared sx helpers (module-level to avoid re-creation) ---- */

const listItemSx = (isSelected: boolean) => ({
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

const listIconSx = (isSelected: boolean) => ({
  width: 36,
  height: 36,
  borderRadius: 1,
  bgcolor: isSelected ? "primary.main" : "grey.100",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
} as const);

/* ---- Left-panel list items ---- */

function PriceListItem({ price, isSelected, onClick }: { price: Price; isSelected: boolean; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={listItemSx(isSelected)}>
      <Box sx={listIconSx(isSelected)}>
        <Euro sx={{ fontSize: 18, color: isSelected ? "primary.contrastText" : "grey.500" }} />
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={isSelected ? 600 : 400} noWrap title={price.title}>
          {price.title || "Unbenannt"}
        </Typography>
        <Box display="flex" gap={0.5} alignItems="center" mt={0.25}>
          <Typography
            variant="caption"
            fontWeight={isSelected ? 600 : 400}
            color={isSelected ? "primary.main" : "text.secondary"}
          >
            {price.amount}€{price.size ? ` · ${price.size}` : ""}
          </Typography>
          {price.isDownloadable && (
            <Chip label="Download" size="small" color="info" sx={{ height: 16, fontSize: "0.6rem" }} />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function PackageListItem({ pkg, isSelected, onClick }: { pkg: Package; isSelected: boolean; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={listItemSx(isSelected)}>
      <Box sx={listIconSx(isSelected)}>
        <LocalOffer sx={{ fontSize: 18, color: isSelected ? "primary.contrastText" : "grey.500" }} />
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={isSelected ? 600 : 400} noWrap title={pkg.title}>
          {pkg.title || "Unbenannt"}
        </Typography>
        <Typography
          variant="caption"
          fontWeight={isSelected ? 600 : 400}
          color={isSelected ? "primary.main" : "text.secondary"}
        >
          {pkg.numberOfImages} Bilder · {pkg.totalPrice}€ · +{pkg.singlePrice}€/Bild
        </Typography>
      </Box>
    </Box>
  );
}

/* ---- Main page ---- */

export default function AdminPricingPage(): ReactElement {
  const isMobile = useMobileService();

  /* ---- data ---- */
  const [prices,   setPrices]   = useState<Price[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  /* ---- navigation ---- */
  const [activeTab, setActiveTab] = useState(0); // 0 = prices, 1 = packages
  const [search,    setSearch]    = useState("");

  /* ---- selection: undefined = nothing, "" = creating new, "<id>" = editing ---- */
  const [selectedPriceId,   setSelectedPriceId]   = useState<string | undefined>();
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>();

  /* ---- forms ---- */
  const [priceForm,   setPriceForm]   = useState<PriceForm>(EMPTY_PRICE_FORM);
  const [packageForm, setPackageForm] = useState<PackageForm>(EMPTY_PKG_FORM);

  /* ---- modals ---- */
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const hasSelection = activeTab === 0 ? selectedPriceId !== undefined : selectedPackageId !== undefined;

  useEffect(() => {
    setLoading(true);
    void Promise.all([fetchPrices(), fetchPackages()]).finally(() => setLoading(false));
  }, []);

  /* ---- data fetching ---- */

  async function fetchPrices() {
    const snap = await getDocs(collection("prices"));
    setPrices(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Price)));
  }

  async function fetchPackages() {
    const snap = await getDocs(collection("packages"));
    setPackages(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Package)));
  }

  /* ---- price actions ---- */

  function selectPrice(price: Price) {
    setSelectedPriceId(price.id);
    setPriceForm({
      title:          price.title ?? "",
      amount:         String(price.amount ?? ""),
      description:    price.description ?? "",
      isDownloadable: Boolean(price.isDownloadable),
      category:       categoryOf(price),
      size:           price.size ?? "",
    });
  }

  function startNewPrice() {
    setSelectedPriceId("");
    setPriceForm(EMPTY_PRICE_FORM);
  }

  // category drives the sensible defaults: digital ⇒ download, no size
  function setPriceCategory(category: PriceCategory) {
    setPriceForm(f => ({
      ...f,
      category,
      isDownloadable: category === "digital",
      size: category === "digital" ? "" : f.size,
    }));
  }

  // add every catalog entry that doesn't exist yet (matched on category+size)
  async function insertStandardCatalog() {
    setSaving(true);
    try {
      const exists = (category: PriceCategory, size: string) =>
        prices.some(p => categoryOf(p) === category && (p.size ?? "") === size);
      const missing = STANDARD_CATALOG.filter(e => !exists(e.category, e.size));
      for (const entry of missing) {
        await addDoc(collection("prices"), {
          title:          priceTitle(entry.category, entry.size),
          amount:         entry.amount,
          description:    entry.description,
          isDownloadable: entry.isDownloadable,
          category:       entry.category,
          size:           entry.size,
        });
      }
      await fetchPrices();
      toast.success(
        missing.length > 0
          ? `${missing.length} Katalog-Einträge hinzugefügt`
          : "Alle Katalog-Einträge sind bereits vorhanden"
      );
    } catch {
      toast.error("Fehler beim Einfügen des Katalogs");
    }
    setSaving(false);
  }

  async function savePrice() {
    setSaving(true);
    try {
      const data = {
        title:          priceForm.title.trim() || priceTitle(priceForm.category, priceForm.size),
        amount:         priceForm.amount,
        description:    priceForm.description,
        isDownloadable: priceForm.isDownloadable,
        category:       priceForm.category,
        size:           priceForm.size,
      };
      if (selectedPriceId === "") {
        const ref = await addDoc(collection("prices"), data);
        await fetchPrices();
        setSelectedPriceId(ref.id as string);
        toast.success("Preis erstellt");
      } else {
        await updateDoc(doc("prices", selectedPriceId!), data);
        await fetchPrices();
        toast.success("Preis gespeichert");
      }
    } catch {
      toast.error("Fehler beim Speichern");
    }
    setSaving(false);
  }

  async function deletePrice() {
    if (!selectedPriceId) return;
    setSaving(true);
    try {
      await deleteDoc(doc("prices", selectedPriceId));
      await fetchPrices();
      setSelectedPriceId(undefined);
      toast.success("Preis gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
    setSaving(false);
    setOpenDeleteModal(false);
  }

  /* ---- package actions ---- */

  function selectPackage(pkg: Package) {
    setSelectedPackageId(pkg.id);
    setPackageForm({
      title:          pkg.title ?? "",
      numberOfImages: String(pkg.numberOfImages ?? ""),
      totalPrice:     String(pkg.totalPrice ?? ""),
      singlePrice:    String(pkg.singlePrice ?? ""),
      description:    pkg.description ?? "",
    });
  }

  function startNewPackage() {
    setSelectedPackageId("");
    setPackageForm(EMPTY_PKG_FORM);
  }

  // add every standard package whose image count doesn't exist yet
  async function insertStandardPackages() {
    setSaving(true);
    try {
      const missing = STANDARD_PACKAGES.filter(
        e => !packages.some(p => Number(p.numberOfImages) === e.numberOfImages)
      );
      for (const entry of missing) {
        await addDoc(collection("packages"), {
          // `name` is a required legacy duplicate of title in the schema
          name:           entry.title,
          title:          entry.title,
          numberOfImages: entry.numberOfImages,
          totalPrice:     entry.totalPrice,
          singlePrice:    entry.singlePrice,
          description:    entry.description,
        });
      }
      await fetchPackages();
      toast.success(
        missing.length > 0
          ? `${missing.length} Pakete hinzugefügt`
          : "Alle Standard-Pakete sind bereits vorhanden"
      );
    } catch {
      toast.error("Fehler beim Einfügen der Pakete");
    }
    setSaving(false);
  }

  async function savePackage() {
    setSaving(true);
    try {
      const title = packageForm.title.trim() || packageTitle(packageForm.numberOfImages);
      const data = {
        // `name` is a required legacy duplicate of title in the schema —
        // without it, creating a package fails with "name: cannot be blank"
        name:           title,
        title:          title,
        numberOfImages: Number(packageForm.numberOfImages),
        totalPrice:     packageForm.totalPrice,
        singlePrice:    packageForm.singlePrice,
        description:    packageForm.description,
      };
      if (selectedPackageId === "") {
        const ref = await addDoc(collection("packages"), data);
        await fetchPackages();
        setSelectedPackageId(ref.id as string);
        toast.success("Paket erstellt");
      } else {
        await updateDoc(doc("packages", selectedPackageId!), data);
        await fetchPackages();
        toast.success("Paket gespeichert");
      }
    } catch {
      toast.error("Fehler beim Speichern");
    }
    setSaving(false);
  }

  async function deletePackage() {
    if (!selectedPackageId) return;
    setSaving(true);
    try {
      await deleteDoc(doc("packages", selectedPackageId));
      await fetchPackages();
      setSelectedPackageId(undefined);
      toast.success("Paket gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
    setSaving(false);
    setOpenDeleteModal(false);
  }

  /* ---- filtered lists ---- */

  const filteredPrices = [...prices]
    .filter(p => (p.title ?? "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

  const filteredPackages = [...packages]
    .filter(p => (p.title ?? "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(a.numberOfImages) - Number(b.numberOfImages));

  /* ---- delete modal helpers ---- */

  const deleteLabel =
    activeTab === 0
      ? (prices.find(p => p.id === selectedPriceId)?.title ?? "Preis")
      : (packages.find(p => p.id === selectedPackageId)?.title ?? "Paket");

  const handleDeleteConfirm = activeTab === 0 ? deletePrice : deletePackage;

  /* ---- loading ---- */

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  /* ---- render ---- */

  return (
    <>
      <Box sx={{ pt: 1 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1.5, display: { xs: "none", md: "block" } }}>
          Preise
        </Typography>

        {/* Two-panel container */}
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
              display: { xs: hasSelection ? "none" : "flex", md: "flex" },
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v as number);
                setSearch("");
                setSelectedPriceId(undefined);
                setSelectedPackageId(undefined);
              }}
              variant="fullWidth"
              sx={{ borderBottom: "1px solid", borderColor: "divider", flexShrink: 0, minHeight: 44 }}
            >
              <Tab label="Einzelpreise" sx={{ fontSize: "0.78rem", minHeight: 44 }} />
              <Tab label="Pakete"       sx={{ fontSize: "0.78rem", minHeight: 44 }} />
            </Tabs>

            {/* New button + Search */}
            <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={<Add />}
                onClick={() => (activeTab === 0 ? startNewPrice() : startNewPackage())}
              >
                {activeTab === 0 ? "Neues Produkt" : "Neues Paket"}
              </Button>
              <Tooltip
                title={
                  activeTab === 0
                    ? "Fügt typische Produkte (Abzüge, Leinwand, Poster, Download) mit üblichen Preisen ein — alles bleibt anpassbar"
                    : "Fügt typische Bilderpakete (5 bis 40 Bilder) mit üblichen Preisen ein — alles bleibt anpassbar"
                }
              >
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={<AutoAwesome />}
                  disabled={saving}
                  onClick={() =>
                    void (activeTab === 0 ? insertStandardCatalog() : insertStandardPackages())
                  }
                  sx={{ mt: 1 }}
                >
                  {activeTab === 0 ? "Standard-Katalog einfügen" : "Standard-Pakete einfügen"}
                </Button>
              </Tooltip>
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

            {/* List */}
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {activeTab === 0 ? (
                filteredPrices.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ p: 2, textAlign: "center", pt: 4 }}>
                    {search ? "Keine Ergebnisse" : "Keine Preise vorhanden"}
                  </Typography>
                ) : (
                  groupPrices(filteredPrices).map(group => (
                    <Box key={group.category}>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          px: 1.5,
                          pt: 1.5,
                          pb: 0.25,
                          fontSize: "0.65rem",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {CATEGORY_LABELS[group.category]}
                      </Typography>
                      {group.items.map(p => (
                        <PriceListItem
                          key={p.id}
                          price={p}
                          isSelected={selectedPriceId === p.id}
                          onClick={() => selectPrice(p)}
                        />
                      ))}
                    </Box>
                  ))
                )
              ) : (
                filteredPackages.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ p: 2, textAlign: "center", pt: 4 }}>
                    {search ? "Keine Ergebnisse" : "Keine Pakete vorhanden"}
                  </Typography>
                ) : (
                  filteredPackages.map(p => (
                    <PackageListItem
                      key={p.id}
                      pkg={p}
                      isSelected={selectedPackageId === p.id}
                      onClick={() => selectPackage(p)}
                    />
                  ))
                )
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
            {!hasSelection ? (
              /* Empty state (desktop) */
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                flex={1}
                gap={1}
              >
                {activeTab === 0 ? (
                  <Euro sx={{ fontSize: 56, color: "text.disabled", opacity: 0.4 }} />
                ) : (
                  <LocalOffer sx={{ fontSize: 56, color: "text.disabled", opacity: 0.4 }} />
                )}
                <Typography variant="body1" color="text.secondary">
                  {activeTab === 0 ? "Preis auswählen" : "Paket auswählen"}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 4 } }}>
                {/* Mobile back button */}
                {isMobile && (
                  <Button
                    startIcon={<ArrowBack />}
                    onClick={() => {
                      setSelectedPriceId(undefined);
                      setSelectedPackageId(undefined);
                    }}
                    sx={{ mb: 2 }}
                    size="small"
                  >
                    {activeTab === 0 ? "Alle Preise" : "Alle Pakete"}
                  </Button>
                )}

                {activeTab === 0 ? (
                  /* ---- Price form ---- */
                  <>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                      <Typography variant="h6" fontWeight={600}>
                        {selectedPriceId === "" ? "Neues Produkt" : "Produkt bearbeiten"}
                      </Typography>
                      {selectedPriceId !== "" && (
                        <Tooltip title="Preis löschen">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => setOpenDeleteModal(true)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2.5}>
                      <TextField
                        select
                        label="Produktart"
                        fullWidth
                        value={priceForm.category}
                        onChange={e => setPriceCategory(e.target.value as PriceCategory)}
                      >
                        {CATEGORY_ORDER.map(c => (
                          <MenuItem key={c} value={c}>{CATEGORY_LABELS[c]}</MenuItem>
                        ))}
                      </TextField>
                      {priceForm.category !== "digital" && (
                        <Autocomplete
                          freeSolo
                          options={SIZE_SUGGESTIONS[priceForm.category]}
                          value={priceForm.size}
                          onInputChange={(_, value) => setPriceForm(f => ({ ...f, size: value }))}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Größe"
                              placeholder="z. B. 13×18 cm"
                              helperText="Übliche Formate zur Auswahl — eigene Größen einfach eintippen"
                            />
                          )}
                        />
                      )}
                      <TextField
                        label="Preis"
                        fullWidth
                        type="number"
                        value={priceForm.amount}
                        onChange={e => setPriceForm(f => ({ ...f, amount: e.target.value }))}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">€</InputAdornment>,
                        }}
                      />
                      <TextField
                        label="Titel (optional)"
                        fullWidth
                        value={priceForm.title}
                        placeholder={priceTitle(priceForm.category, priceForm.size)}
                        helperText={`Leer lassen für den automatischen Titel „${priceTitle(priceForm.category, priceForm.size)}“`}
                        onChange={e => setPriceForm(f => ({ ...f, title: e.target.value }))}
                      />
                      <TextField
                        label="Beschreibung"
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="z. B. Papierart, Rahmung, Lieferzeit"
                        value={priceForm.description}
                        onChange={e => setPriceForm(f => ({ ...f, description: e.target.value }))}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={priceForm.isDownloadable}
                            onChange={e => setPriceForm(f => ({ ...f, isDownloadable: e.target.checked }))}
                          />
                        }
                        label="Digitaler Download (keine Lieferadresse nötig)"
                      />

                      <Divider />

                      <Box display="flex" gap={1} justifyContent="flex-end">
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={() => setSelectedPriceId(undefined)}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          variant="contained"
                          disabled={saving || priceForm.amount.trim() === ""}
                          onClick={() => void savePrice()}
                          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                        >
                          Speichern
                        </Button>
                      </Box>
                    </Box>
                  </>
                ) : (
                  /* ---- Package form ---- */
                  <>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                      <Typography variant="h6" fontWeight={600}>
                        {selectedPackageId === "" ? "Neues Paket" : "Paket bearbeiten"}
                      </Typography>
                      {selectedPackageId !== "" && (
                        <Tooltip title="Paket löschen">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => setOpenDeleteModal(true)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2.5}>
                      <TextField
                        label="Inklusiv-Bilder"
                        fullWidth
                        type="number"
                        inputProps={{ min: 1 }}
                        helperText="So viele Bilder darf der Kunde zum Paketpreis auswählen"
                        value={packageForm.numberOfImages}
                        onChange={e => setPackageForm(f => ({ ...f, numberOfImages: e.target.value }))}
                      />
                      <TextField
                        label="Paketpreis"
                        fullWidth
                        type="number"
                        value={packageForm.totalPrice}
                        onChange={e => setPackageForm(f => ({ ...f, totalPrice: e.target.value }))}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">€</InputAdornment>,
                        }}
                      />
                      <TextField
                        label="Preis je weiterem Bild"
                        fullWidth
                        type="number"
                        helperText="Gilt für jedes Bild über die Inklusiv-Anzahl hinaus"
                        value={packageForm.singlePrice}
                        onChange={e => setPackageForm(f => ({ ...f, singlePrice: e.target.value }))}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">€</InputAdornment>,
                        }}
                      />
                      <TextField
                        label="Titel (optional)"
                        fullWidth
                        value={packageForm.title}
                        placeholder={packageTitle(packageForm.numberOfImages || "…")}
                        helperText={`Leer lassen für den automatischen Titel „${packageTitle(packageForm.numberOfImages || "…")}“`}
                        onChange={e => setPackageForm(f => ({ ...f, title: e.target.value }))}
                      />
                      <TextField
                        label="Beschreibung"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="z. B. 10 Bilder deiner Wahl in voller Auflösung"
                        value={packageForm.description}
                        onChange={e => setPackageForm(f => ({ ...f, description: e.target.value }))}
                      />

                      {packageForm.numberOfImages && packageForm.totalPrice && (
                        <Typography variant="body2" color="text.secondary">
                          So sieht es der Kunde: <b>{packageForm.numberOfImages} Bilder
                          für {packageForm.totalPrice} €</b>
                          {packageForm.singlePrice
                            ? <>, jedes weitere Bild <b>{packageForm.singlePrice} €</b></>
                            : null}
                        </Typography>
                      )}

                      <Divider />

                      <Box display="flex" gap={1} justifyContent="flex-end">
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={() => setSelectedPackageId(undefined)}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          variant="contained"
                          disabled={
                            saving ||
                            packageForm.numberOfImages.trim() === "" ||
                            packageForm.totalPrice.trim() === ""
                          }
                          onClick={() => void savePackage()}
                          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                        >
                          Speichern
                        </Button>
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <DeleteModal
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        onDelete={() => void handleDeleteConfirm()}
        name={deleteLabel}
      />
    </>
  );
}
