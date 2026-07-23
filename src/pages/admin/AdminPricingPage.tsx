import { ReactElement, useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Switch } from "@astryxdesign/core/Switch";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Plus as Add, ArrowLeft as ArrowBack, Sparkles as AutoAwesome, Trash2 as Delete, Euro, Tag as LocalOffer, Search } from "lucide-react";
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

type PriceForm = {
  title: string;
  amount: string;
  description: string;
  isDownloadable: boolean;
  category: PriceCategory;
  size: string;
};

type PackageFormType = {
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
const EMPTY_PKG_FORM: PackageFormType = { title: "", numberOfImages: "", totalPrice: "", singlePrice: "", description: "" };

const MD = "@media (min-width: 900px)";

const s = stylex.create({
  loading: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" },
  root: { paddingTop: 8 },
  pageTitle: { marginBottom: 12, display: { default: "none", [MD]: "block" } },
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
  right: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  hideOnMobile: { display: { default: "none", [MD]: "flex" } },
  tabs: { display: "flex", borderBottom: "1px solid var(--color-border)", flexShrink: 0 },
  tab: {
    flex: 1,
    padding: "12px 8px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
  },
  tabActive: { color: "var(--color-text-accent)", borderBottomColor: "var(--color-accent)" },
  leftHead: { padding: 12, borderBottom: "1px solid var(--color-border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 },
  list: { flex: 1, overflowY: "auto" },
  listEmpty: { padding: 16, textAlign: "center", paddingTop: 32 },
  groupLabel: { display: "block", padding: "12px 12px 2px", fontSize: "0.65rem", letterSpacing: "0.08em" },
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
  itemIcon: (selected: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: "var(--radius-element)",
    backgroundColor: selected ? "var(--color-accent)" : "var(--color-background-muted)",
    color: selected ? "var(--color-on-accent)" : "var(--color-icon-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }),
  itemMain: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" },
  itemSub: { display: "flex", gap: 4, alignItems: "center" },
  rightEmpty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8 },
  emptyIcon: { fontSize: 56, color: "var(--color-icon-disabled)", opacity: 0.4 },
  rightScroll: { flex: 1, overflowY: "auto", padding: { default: 16, [MD]: 32 } },
  formHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  formActions: { display: "flex", gap: 8, justifyContent: "flex-end" },
  backBtn: { marginBottom: 16 },
});

function ListItem({
  icon, title, subtitle, badge, isSelected, onClick,
}: { icon: ReactElement; title: string; subtitle: ReactElement; badge?: ReactElement; isSelected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} {...stylex.props(s.item, isSelected && s.itemSelected)}>
      <div {...stylex.props(s.itemIcon(isSelected))}>{icon}</div>
      <div {...stylex.props(s.itemMain)}>
        <Text type="body" weight={isSelected ? "semibold" : "normal"} maxLines={1}>{title}</Text>
        <div {...stylex.props(s.itemSub)}>{subtitle}{badge}</div>
      </div>
    </div>
  );
}

export default function AdminPricingPage(): ReactElement {
  const isMobile = useMobileService();

  const [prices,   setPrices]   = useState<Price[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [activeTab, setActiveTab] = useState(0); // 0 = prices, 1 = packages
  const [search,    setSearch]    = useState("");

  const [selectedPriceId,   setSelectedPriceId]   = useState<string | undefined>();
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>();

  const [priceForm,   setPriceForm]   = useState<PriceForm>(EMPTY_PRICE_FORM);
  const [packageForm, setPackageForm] = useState<PackageFormType>(EMPTY_PKG_FORM);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const hasSelection = activeTab === 0 ? selectedPriceId !== undefined : selectedPackageId !== undefined;

  useEffect(() => {
    setLoading(true);
    void Promise.all([fetchPrices(), fetchPackages()]).finally(() => setLoading(false));
  }, []);

  async function fetchPrices() {
    const snap = await getDocs(collection("prices"));
    setPrices(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Price)));
  }

  async function fetchPackages() {
    const snap = await getDocs(collection("packages"));
    setPackages(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Package)));
  }

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

  function setPriceCategory(category: PriceCategory) {
    setPriceForm(f => ({
      ...f,
      category,
      isDownloadable: category === "digital",
      size: category === "digital" ? "" : f.size,
    }));
  }

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

  async function insertStandardPackages() {
    setSaving(true);
    try {
      const missing = STANDARD_PACKAGES.filter(
        e => !packages.some(p => Number(p.numberOfImages) === e.numberOfImages)
      );
      for (const entry of missing) {
        await addDoc(collection("packages"), {
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

  const filteredPrices = [...prices]
    .filter(p => (p.title ?? "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

  const filteredPackages = [...packages]
    .filter(p => (p.title ?? "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(a.numberOfImages) - Number(b.numberOfImages));

  const deleteLabel =
    activeTab === 0
      ? (prices.find(p => p.id === selectedPriceId)?.title ?? "Preis")
      : (packages.find(p => p.id === selectedPackageId)?.title ?? "Paket");

  const handleDeleteConfirm = activeTab === 0 ? deletePrice : deletePackage;

  if (loading) {
    return (
      <div {...stylex.props(s.loading)}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div {...stylex.props(s.root)}>
        <div {...stylex.props(s.pageTitle)}>
          <Heading level={5}>Preise</Heading>
        </div>

        <div {...stylex.props(s.panels)}>
          {/* ===== LEFT PANEL ===== */}
          <div {...stylex.props(s.left, hasSelection && s.hideOnMobile)}>
            <div {...stylex.props(s.tabs)}>
              {["Einzelpreise", "Pakete"].map((label, i) => (
                <button
                  key={label}
                  {...stylex.props(s.tab, activeTab === i && s.tabActive)}
                  onClick={() => {
                    setActiveTab(i);
                    setSearch("");
                    setSelectedPriceId(undefined);
                    setSelectedPackageId(undefined);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div {...stylex.props(s.leftHead)}>
              <Button
                variant="primary"
                width="100%"
                size="sm"
                icon={<Add />}
                label={activeTab === 0 ? "Neues Produkt" : "Neues Paket"}
                onClick={() => (activeTab === 0 ? startNewPrice() : startNewPackage())}
              />
              <Button
                variant="secondary"
                width="100%"
                size="sm"
                icon={<AutoAwesome />}
                isDisabled={saving}
                tooltip={
                  activeTab === 0
                    ? "Fügt typische Produkte (Abzüge, Leinwand, Poster, Download) mit üblichen Preisen ein — alles bleibt anpassbar"
                    : "Fügt typische Bilderpakete (5 bis 40 Bilder) mit üblichen Preisen ein — alles bleibt anpassbar"
                }
                label={activeTab === 0 ? "Standard-Katalog einfügen" : "Standard-Pakete einfügen"}
                onClick={() => void (activeTab === 0 ? insertStandardCatalog() : insertStandardPackages())}
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
              {activeTab === 0 ? (
                filteredPrices.length === 0 ? (
                  <div {...stylex.props(s.listEmpty)}>
                    <Text type="body" color="secondary">{search ? "Keine Ergebnisse" : "Keine Preise vorhanden"}</Text>
                  </div>
                ) : (
                  groupPrices(filteredPrices).map(group => (
                    <div key={group.category}>
                      <span {...stylex.props(s.groupLabel)}>
                        <Text type="supporting" color="secondary">{CATEGORY_LABELS[group.category]}</Text>
                      </span>
                      {group.items.map(p => (
                        <ListItem
                          key={p.id}
                          isSelected={selectedPriceId === p.id}
                          onClick={() => selectPrice(p)}
                          icon={<Euro style={{ fontSize: 18 }} />}
                          title={p.title || "Unbenannt"}
                          subtitle={<Text type="supporting" color={selectedPriceId === p.id ? "accent" : "secondary"}>{p.amount}€{p.size ? ` · ${p.size}` : ""}</Text>}
                          badge={p.isDownloadable ? <Badge variant="info" label="Download" /> : undefined}
                        />
                      ))}
                    </div>
                  ))
                )
              ) : (
                filteredPackages.length === 0 ? (
                  <div {...stylex.props(s.listEmpty)}>
                    <Text type="body" color="secondary">{search ? "Keine Ergebnisse" : "Keine Pakete vorhanden"}</Text>
                  </div>
                ) : (
                  filteredPackages.map(p => (
                    <ListItem
                      key={p.id}
                      isSelected={selectedPackageId === p.id}
                      onClick={() => selectPackage(p)}
                      icon={<LocalOffer style={{ fontSize: 18 }} />}
                      title={p.title || "Unbenannt"}
                      subtitle={<Text type="supporting" color={selectedPackageId === p.id ? "accent" : "secondary"}>{p.numberOfImages} Bilder · {p.totalPrice}€ · +{p.singlePrice}€/Bild</Text>}
                    />
                  ))
                )
              )}
            </div>
          </div>

          {/* ===== RIGHT PANEL ===== */}
          <div {...stylex.props(s.right, !hasSelection && s.hideOnMobile)}>
            {!hasSelection ? (
              <div {...stylex.props(s.rightEmpty)}>
                {activeTab === 0
                  ? <Euro {...stylex.props(s.emptyIcon)} />
                  : <LocalOffer {...stylex.props(s.emptyIcon)} />}
                <Text type="body" color="secondary">{activeTab === 0 ? "Preis auswählen" : "Paket auswählen"}</Text>
              </div>
            ) : (
              <div {...stylex.props(s.rightScroll)}>
                {isMobile && (
                  <div {...stylex.props(s.backBtn)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowBack />}
                      label={activeTab === 0 ? "Alle Preise" : "Alle Pakete"}
                      onClick={() => { setSelectedPriceId(undefined); setSelectedPackageId(undefined); }}
                    />
                  </div>
                )}

                {activeTab === 0 ? (
                  <>
                    <div {...stylex.props(s.formHead)}>
                      <Heading level={6}>{selectedPriceId === "" ? "Neues Produkt" : "Produkt bearbeiten"}</Heading>
                      {selectedPriceId !== "" && (
                        <IconButton variant="ghost" icon={<Delete />} label="Preis löschen" tooltip="Preis löschen" onClick={() => setOpenDeleteModal(true)} />
                      )}
                    </div>

                    <div {...stylex.props(s.form)}>
                      <Selector
                        width="100%"
                        label="Produktart"
                        options={CATEGORY_ORDER.map(c => ({ value: c, label: CATEGORY_LABELS[c] }))}
                        value={priceForm.category}
                        onChange={(v) => v && setPriceCategory(v as PriceCategory)}
                      />
                      {priceForm.category !== "digital" && (
                        <TextInput
                          width="100%"
                          label="Größe"
                          placeholder="z. B. 13×18 cm"
                          description="Übliche Formate zur Auswahl — eigene Größen einfach eintippen"
                          value={priceForm.size}
                          onChange={(v) => setPriceForm(f => ({ ...f, size: v }))}
                        />
                      )}
                      <TextInput
                        width="100%"
                        label="Preis (€)"
                       
                        value={priceForm.amount}
                        onChange={(v) => setPriceForm(f => ({ ...f, amount: v }))}
                      />
                      <TextInput
                        width="100%"
                        label="Titel (optional)"
                        placeholder={priceTitle(priceForm.category, priceForm.size)}
                        description={`Leer lassen für den automatischen Titel „${priceTitle(priceForm.category, priceForm.size)}“`}
                        value={priceForm.title}
                        onChange={(v) => setPriceForm(f => ({ ...f, title: v }))}
                      />
                      <TextArea
                        width="100%"
                        label="Beschreibung"
                        rows={3}
                        placeholder="z. B. Papierart, Rahmung, Lieferzeit"
                        value={priceForm.description}
                        onChange={(v) => setPriceForm(f => ({ ...f, description: v }))}
                      />
                      <Switch
                        label="Digitaler Download (keine Lieferadresse nötig)"
                        value={priceForm.isDownloadable}
                        onChange={(checked) => setPriceForm(f => ({ ...f, isDownloadable: checked }))}
                      />

                      <Divider />

                      <div {...stylex.props(s.formActions)}>
                        <Button variant="secondary" label="Abbrechen" onClick={() => setSelectedPriceId(undefined)} />
                        <Button
                          variant="primary"
                          label="Speichern"
                          isDisabled={saving || priceForm.amount.trim() === ""}
                          isLoading={saving}
                          onClick={() => void savePrice()}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div {...stylex.props(s.formHead)}>
                      <Heading level={6}>{selectedPackageId === "" ? "Neues Paket" : "Paket bearbeiten"}</Heading>
                      {selectedPackageId !== "" && (
                        <IconButton variant="ghost" icon={<Delete />} label="Paket löschen" tooltip="Paket löschen" onClick={() => setOpenDeleteModal(true)} />
                      )}
                    </div>

                    <div {...stylex.props(s.form)}>
                      <TextInput
                        width="100%"
                        label="Inklusiv-Bilder"
                       
                        description="So viele Bilder darf der Kunde zum Paketpreis auswählen"
                        value={packageForm.numberOfImages}
                        onChange={(v) => setPackageForm(f => ({ ...f, numberOfImages: v }))}
                      />
                      <TextInput
                        width="100%"
                        label="Paketpreis (€)"
                       
                        value={packageForm.totalPrice}
                        onChange={(v) => setPackageForm(f => ({ ...f, totalPrice: v }))}
                      />
                      <TextInput
                        width="100%"
                        label="Preis je weiterem Bild (€)"
                       
                        description="Gilt für jedes Bild über die Inklusiv-Anzahl hinaus"
                        value={packageForm.singlePrice}
                        onChange={(v) => setPackageForm(f => ({ ...f, singlePrice: v }))}
                      />
                      <TextInput
                        width="100%"
                        label="Titel (optional)"
                        placeholder={packageTitle(packageForm.numberOfImages || "…")}
                        description={`Leer lassen für den automatischen Titel „${packageTitle(packageForm.numberOfImages || "…")}“`}
                        value={packageForm.title}
                        onChange={(v) => setPackageForm(f => ({ ...f, title: v }))}
                      />
                      <TextArea
                        width="100%"
                        label="Beschreibung"
                        rows={2}
                        placeholder="z. B. 10 Bilder deiner Wahl in voller Auflösung"
                        value={packageForm.description}
                        onChange={(v) => setPackageForm(f => ({ ...f, description: v }))}
                      />

                      {packageForm.numberOfImages && packageForm.totalPrice && (
                        <Text type="body" color="secondary">
                          So sieht es der Kunde: <b>{packageForm.numberOfImages} Bilder für {packageForm.totalPrice} €</b>
                          {packageForm.singlePrice
                            ? <>, jedes weitere Bild <b>{packageForm.singlePrice} €</b></>
                            : null}
                        </Text>
                      )}

                      <Divider />

                      <div {...stylex.props(s.formActions)}>
                        <Button variant="secondary" label="Abbrechen" onClick={() => setSelectedPackageId(undefined)} />
                        <Button
                          variant="primary"
                          label="Speichern"
                          isDisabled={
                            saving ||
                            packageForm.numberOfImages.trim() === "" ||
                            packageForm.totalPrice.trim() === ""
                          }
                          isLoading={saving}
                          onClick={() => void savePackage()}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteModal
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        onDelete={() => void handleDeleteConfirm()}
        name={deleteLabel}
      />
    </>
  );
}
