import { Button } from "@astryxdesign/core/Button";
import { Pagination } from "@astryxdesign/core/Pagination";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, ReactNode, useEffect, useState } from "react";
import { imageFileUrl, listPreviews, originalFileUrl } from "../../../config/images";
import { saveSelection, watchSelection } from "../utils/userSelection";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { Check, Images as PhotoLibrary } from "lucide-react";
import EmptyState from "../../../components/feedback/EmptyState";

import { downloadFile, fetchShootingPackage, getOriginalImages, saveBlob } from "../../../utils/functions";
import { handleDelete } from "../utils/functions";
import useMobileService from "../../../hooks/useMobileService";
import { Package, Shooting } from "../../../utils/types";
import { calculateTotalPackagePrice } from "../../Pricing/utils/functions";
import { getRecord, pb } from "../../../config/pocketbase";
import { useSettings } from "../../../context/SettingsContext";

import DeleteModal from "../../../components/widgets/DeleteModal";
import ImagePreview from "./ImagePreview";
import AlbumImage from "./AlbumImage";
import ShareDialog from "./ShareDialog";

type Props = {
  isPublicAlbum?: boolean;
  isAdminAlbum: boolean;
  shootingId: string;
  /** bump to force a refetch of the images, e.g. after an upload */
  reloadKey?: number;
  selected: string[];
  setSelected: (selected: string[]) => void;
  selectMode: boolean;
  setSelectMode: (selectMode: boolean) => void;
};

const DESKTOP = "@media (min-width: 900px)";

const s = stylex.create({
  skeletonGrid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr 1fr", [DESKTOP]: "repeat(4, 1fr)" },
    gap: 8,
  },
  masonry: {
    columnCount: { default: 2, [DESKTOP]: 4 },
    columnGap: 4,
    marginTop: 24,
  },
  tile: { breakInside: "avoid", marginBottom: 4 },
  center: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8 },
  topBar: { display: "flex", justifyContent: "center", gap: 16, paddingTop: 24 },
  intro: { margin: "8px 16px" },
  progressRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 8 },
  progressDone: { display: "flex", alignItems: "center", gap: 4, color: "var(--color-success)" },
  pager: { display: "flex", justifyContent: "center", marginTop: 16 },
  countRow: { marginBottom: 16 },
  actionBar: {
    position: "fixed",
    left: { default: 0 },
    right: 0,
    bottom: 0,
    zIndex: 1100,
    paddingInline: { default: 12, [DESKTOP]: 24 },
    paddingBlock: 10,
    display: "flex",
    alignItems: "center",
    gap: { default: 8, [DESKTOP]: 16 },
    flexWrap: "wrap",
    borderTop: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-surface)",
    boxShadow: "0 -4px 16px rgba(0,0,0,0.12)",
  },
  // 240 = AppShell SIDEBAR_WIDTH (must be a literal for the StyleX compiler)
  actionBarShifted: { left: { default: 0, [DESKTOP]: 240 } },
  barCount: { minWidth: 110 },
  barActions: { marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" },
});

export default function Album(props: Props): ReactElement {
  const {
    isPublicAlbum = false,
    isAdminAlbum,
    shootingId,
    reloadKey,
    selected,
    setSelected,
    selectMode,
    setSelectMode
  } = props;
  const isMobile = useMobileService();
  const navigate = useNavigate();
  const { verkauf } = useSettings();
  const [open, setOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [progress, setProgress] = useState<number>(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [page, setPage] = useState(1);
  const [shooting, setShooting] = useState<Shooting | undefined>(undefined);
  const [shootingPackage, setShootingPackage] = useState<Package>();
  const [userSelection, setUserSelection] = useState<string[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  useEffect(() => {
    if(shootingId) {
      void fetchShooting(shootingId);
      void handleLoadingPreviewImages(shootingId);
    }
  }, [shootingId, reloadKey]);

  useEffect(() => {
    if (!shooting) return;
    const unwatch = watchSelection(shooting.id, setUserSelection);
    if (shooting.packageId) {
      void fetchShootingPackage(shooting.packageId).then(setShootingPackage);
    }
    return unwatch;
  }, [shooting]);

  useEffect(() => {
    if(progress === 1) {
      const timer = setTimeout(() => {
        setShowPlaceholder(false);
        setProgress(0);
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [progress]);

  // admin: use the current lightbox preview as album cover
  const setCoverFromPreview = async (image: string) => {
    if (!shooting?.id) return;
    try {
      const res = await fetch(image);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const fd = new FormData();
      fd.append(
        "coverImage",
        new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" })
      );
      await pb.collection("shootings").update(shooting.id, fd);
      toast.success("Cover aktualisiert");
    } catch (error) {
      console.error("Fehler beim Setzen des Covers:", error);
      toast.error("Cover konnte nicht gesetzt werden");
    }
  };

  const fetchShooting = async (shootingId: string) => {
    try {
      const data = await getRecord("shootings", shootingId);
      if (!data) return;
      setShooting({
        id: data.id,
        type: data.type,
        title: data.title,
        description: data.description,
        packageId: data.packageId,
        priceIds: data.priceIds,
        userIds: data.userIds,
        withUserSelection: data.withUserSelection,
      });
    } catch (error) {
      console.error("Error getting document:", error);
    }
  }

  const handleLoadingPreviewImages = async (shootingId: string) => {
    setLoadingPreview(true);
    try {
      const previews = await listPreviews(shootingId);
      setNumPages(Math.ceil(previews.length / 18));

      const imageUrls = await Promise.all(previews.map(imageFileUrl));
      setPage(1);
      setImages(imageUrls);
      setPreviewImages(imageUrls.slice(0, 18));
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Fehler beim Laden der Bilder")
    }
    setLoadingPreview(false);
  }

  const sendSelectedImages = async (selected: string[]) => {
    try {
      await saveSelection(shootingId, selected);
      setUserSelection(selected);
      toast.success("Auswahl erfolgreich abgeschickt");
    } catch (error) {
      console.error("Error sending selected images to database: ", error);
      toast.error("Fehler beim Abschicken der Auswahl");
    }
    setSelected([]);
    setSelectMode(false);
  }

  async function downloadImagesAsZip() {
    if (!shooting?.id) return;
    try {
      setShowPlaceholder(true);
      const originalImageNames = await getOriginalImages(userSelection, shooting.id);
      const urls = await Promise.all(
        originalImageNames.map((name) => originalFileUrl(shootingId, name))
      );
      const zip = new JSZip();

      setProgress(0);
      let completed = 0;
      const downloadedFiles = await Promise.all(
        urls.map(async (url) => {
          const blob = await downloadFile(url);
          completed += 1;
          setProgress(completed / urls.length);
          return blob;
        })
      );

      downloadedFiles.forEach((file, index) => {
        zip.file(originalImageNames[index] ?? `bild-${index + 1}.jpg`, file);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const zipName = (shooting?.title || "fotos").replace(/[\\/:*?"<>|]/g, "-");
      saveBlob(content, `${zipName}.zip`);
    } catch (error) {
      console.error("Fehler beim Herunterladen der Bilder als ZIP: ", error);
    }
  }

  const handlePageChange = (value: number) => {
    setPage(value);
    const start = (value - 1) * 18;
    const end = value * 18;
    setPreviewImages(images.slice(start, end));
  }

  const discardSelection = () => {
    setSelected([]);
  }

  const selectAllPhotos = () => {
    setSelected(images);
  }

  const toggleSelected = (image: string) => {
    if (selected.includes(image)) {
      setSelected(selected.filter((selectedImage) => selectedImage !== image));
    } else {
      setSelected([...selected, image]);
    }
  }

  const deleteSelected = async () => {
    if (!shootingId) return;
    await handleDelete(
      selected,
      shootingId,
      () => {
        const remaining = images.filter((image) => !selected.includes(image));
        setImages(remaining);
        setNumPages(Math.ceil(remaining.length / 18));
        setPreviewImages(previewImages.filter((image) => !selected.includes(image)));
        setSelected([]);
      },
      (error) => {
        console.error(error);
        toast.error("Fehler beim Löschen der Bilder");
      }
    );
  };

  // paid and public shootings have no checkout — the customer downloads directly
  const isFreeDownload = shooting?.type === "paid" || shooting?.type === "public";

  // Nur der Kauf-Weg ist betroffen: Shootings vom Typ "paid" oder "public"
  // gehen ohne Zahlung direkt auf die Download-Seite und laufen weiter.
  const kaufGesperrt = !isAdminAlbum && !isFreeDownload && verkauf.gesperrt;

  const primaryAction = async () => {
    if (isAdminAlbum) {
      setOpenDeleteModal(true);
    } else if (isPublicAlbum) {
      navigate("/publicDownloads", { state: { selectedImages: selected, shootingId } });
    } else if (isFreeDownload) {
      // paid offline or public: no checkout, straight to the download page
      navigate("/shootingDownloads", { state: { selectedImages: selected, shootingId } });
    } else {
      navigate("/pricing", { state: { selectedImages: selected, shootingId } });
    }
  };

  const primaryLabel = isAdminAlbum
    ? "Löschen"
    : isFreeDownload
      ? "Download"
      : "Kaufen";
  const primaryDisabled = kaufGesperrt
    ? true
    : shootingPackage && !isAdminAlbum && !isFreeDownload
      ? !(selected.length >= shootingPackage.numberOfImages)
      : selected.length === 0;
  const packageRemaining = shootingPackage
    ? Math.max(shootingPackage.numberOfImages - selected.length, 0)
    : 0;

  const topBar : ReactNode = (
    <div {...stylex.props(s.topBar)}>
      <Button variant="primary" label="Bilder auswählen" onClick={() => setSelectMode(true)} />
    </div>
  );

  // sticky bar while selecting: count, package progress and all actions in
  // one place that stays visible while scrolling through the grid
  const actionBar : ReactNode = (
    <div {...stylex.props(s.actionBar, !isPublicAlbum && s.actionBarShifted)}>
      <div {...stylex.props(s.barCount)}>
        <Text type="body" weight="semibold">
          {selected.length} ausgewählt
        </Text>
        {shootingPackage && !isAdminAlbum && (
          <Text type="supporting" color={packageRemaining > 0 ? "secondary" : "accent"}>
            {packageRemaining > 0
              ? `noch ${packageRemaining} von ${shootingPackage.numberOfImages} inklusive wählen`
              : `Gesamt: ${calculateTotalPackagePrice(shootingPackage, selected.length)} €`}
          </Text>
        )}
      </div>
      <div {...stylex.props(s.barActions)}>
        <Button
          size="sm"
          variant="ghost"
          label="Abbrechen"
          onClick={() => {
            discardSelection();
            setSelectMode(false);
          }}
        />
        <Button size="sm" variant="secondary" label="Alle" onClick={() => selectAllPhotos()} />
        {shooting?.withUserSelection && (
          <Button
            size="sm"
            variant="secondary"
            isDisabled={selected.length === 0}
            label={isAdminAlbum ? "Auswahl herunterladen" : "Auswahl abschicken"}
            onClick={() => {
              if (isAdminAlbum) {
                void downloadImagesAsZip();
              } else {
                void sendSelectedImages(selected);
              }
            }}
          />
        )}
        {kaufGesperrt && (
          <Text type="supporting" color="secondary">
            Der Bilderkauf ist gerade nicht möglich. Bitte später erneut versuchen.
          </Text>
        )}
        <Button
          size="sm"
          variant={isAdminAlbum ? "destructive" : "primary"}
          isDisabled={primaryDisabled}
          label={primaryLabel}
          tooltip={
            kaufGesperrt
              ? undefined
              : primaryDisabled && shootingPackage && !isAdminAlbum
                ? `Bitte mindestens ${shootingPackage.numberOfImages} Bilder auswählen`
                : primaryDisabled
                  ? "Bitte zuerst Bilder auswählen"
                  : undefined
          }
          onClick={() => void primaryAction()}
        />
      </div>
    </div>
  );

  if(loadingPreview) { return (
    <div {...stylex.props(s.skeletonGrid)}>
      {Array.from(new Array(8)).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Skeleton key={index} width="100%" height={200} />
      ))}
    </div>
  ) }

  return (
    <div style={{ paddingBottom: selectMode ? 88 : 0 }}>
      {!isAdminAlbum && shooting?.withUserSelection && (
        <div {...stylex.props(s.intro)}>
          <Text type="body" color="secondary">
            {shooting?.type === "paid"
              ? "Markiere Bilder und klicke auf „Auswahl abschicken“, um eine Vorauswahl zu treffen, oder lade sie direkt über „Download“ herunter."
              : "Markiere Bilder und klicke auf „Auswahl abschicken“, um eine Vorauswahl zu treffen, oder kaufe direkt über „Kaufen“."}
          </Text>
        </div>
      )}
      {shooting && (isAdminAlbum || shooting.type === "public") && (
        <div {...stylex.props(s.center)}>
          {shooting.type === "public" && !isAdminAlbum && (
            <Text type="body" color="secondary">
              Dieses Shooting ist öffentlich. Teile den Link mit Freunden und Familie.
            </Text>
          )}
          <ShareDialog shooting={shooting} />
        </div>
      )}
      {selectMode && (
        <div {...stylex.props(s.countRow)}>
          <Heading level={5} color="secondary">
            {selected.length} ausgewählt
          </Heading>
        </div>
      )}
      {showPlaceholder && progress > 0 && (
        <div {...stylex.props(s.progressRow)}>
          <div style={{ flex: 1 }}>
            <ProgressBar label="Download" value={progress * 100} max={100} />
          </div>
          <Text type="body" color="secondary">{`${Math.round(progress * 100)}%`}</Text>
          {progress === 1 && (
            <span {...stylex.props(s.progressDone)}>
              <Text type="body" color="secondary">Download abgeschlossen</Text>
              <Check />
            </span>
          )}
        </div>
      )}
      {(!isAdminAlbum && shootingPackage) && (
        <Text type="body">
          Aus den vorhandenen Bildern können {shootingPackage.numberOfImages} Stk. für den Preis {shootingPackage.totalPrice} € ausgewählt werden. Jedes zusätzliche Bild kostet {shootingPackage.singlePrice} €. Gesamtpreis für alle Bilder:{" "}
          <b>{calculateTotalPackagePrice(shootingPackage, selected.length)} €</b>
        </Text>
      )}
      {!selectMode && topBar}
      {images.length === 0 ? (
        <EmptyState
          icon={<PhotoLibrary />}
          title={isAdminAlbum ? "Noch keine Bilder in diesem Shooting" : "Dieses Album ist noch leer"}
          description={
            isAdminAlbum
              ? "Sobald du Bilder hochlädst, erscheinen sie hier."
              : "Sobald Bilder hinzugefügt wurden, erscheinen sie hier. Schau später noch einmal vorbei."
          }
          helpSlug={isAdminAlbum ? "bilder-hochladen" : undefined}
        />
      ) : (
        // data-testid: Ankerpunkt für die E2E-Suite, die daraus die
        // Screenshots der Hilfe-Artikel zuschneidet.
        <div data-testid="bildraster" {...stylex.props(s.masonry)}>
          {previewImages.map((image : string) => (
            <div key={image} {...stylex.props(s.tile)}>
              <AlbumImage
                image={image}
                selectMode={selectMode}
                isSelected={selected.includes(image)}
                isInUserSelection={userSelection.includes(image)}
                onClick={() => {
                  if (selectMode) {
                    toggleSelected(image);
                  } else {
                    setPreviewImage(image);
                    setOpen(true);
                  }
                }}
                onToggleSelect={() => {
                  // the bubble is also reachable on hover outside select mode
                  if (!selectMode) setSelectMode(true);
                  toggleSelected(image);
                }}
              />
            </div>
          ))}
        </div>
      )}
      {selectMode && actionBar}
      <DeleteModal
        name={selected.length === 1 ? "1 Bild" : `${selected.length} Bilder`}
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        onDelete={() => {
          setOpenDeleteModal(false);
          void deleteSelected();
        }}
      />
      <ImagePreview
        setSelectMode={setSelectMode}
        selected={selected}
        setSelected={setSelected}
        images={images}
        open={open}
        setOpen={setOpen}
        setPreviewImage={setPreviewImage}
        previewImage={previewImage}
        onSetCover={isAdminAlbum ? setCoverFromPreview : undefined}
      />
      {images.length > 0 && numPages > 1 && (
        <div {...stylex.props(s.pager)}>
          <Pagination page={page} totalPages={numPages} onChange={(value) => handlePageChange(value)} />
        </div>
      )}
    </div>
  );
}
