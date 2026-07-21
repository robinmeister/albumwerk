import {
  Box,
  Button,
  Grid,
  ImageList,
  ImageListItem,
  LinearProgress,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { ChangeEvent, ReactElement, ReactNode, useEffect, useState } from "react";
import { doc, getDoc } from "../../../config/firestore-compat";
import { getDownloadURL, listAll, ref } from "../../../config/storage-compat";
import { onValue, ref as refRT, set } from "../../../config/rtdb-compat";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Check, PhotoLibrary } from "@mui/icons-material";
import EmptyState from "../../../components/feedback/EmptyState";

import { fetchShootingPackage, getOriginalImages } from "../../../utils/functions";
import { handleDelete } from "../utils/functions";
import useMobileService from "../../../hooks/useMobileService";
import { Package, Shooting } from "../../../utils/types";
import { calculateTotalPackagePrice } from "../../Pricing/utils/functions";
import { pb } from "../../../config/pocketbase";
import { SIDEBAR_WIDTH } from "../../../components/layout/AppShell";

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
    const realtimeUpload = async () => {
      const uploadsRef = refRT(`userSelection/${shooting?.id}`);
      onValue(uploadsRef, (snapshot) => {
        if(snapshot.exists()) {
          const data = snapshot.val();
          setUserSelection(data.selectedImages);
        }
      })
      if(shooting?.packageId && shooting?.packageId !== "") {
        const pkg: Package | undefined = await fetchShootingPackage(shooting.packageId)
        setShootingPackage(pkg)
      }
    }
    void realtimeUpload();
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
    const docRef = doc("shootings", shootingId);
    getDoc(docRef)
      .then((doc) => {
        if (doc.exists() && doc.data()) {
          const data = doc.data();
          const shooting : Shooting = {
            id: doc.id,
            type: data.type,
            title: data.title,
            description: data.description,
            packageId: data.packageId,
            priceIds: data.priceIds,
            userIds: data.userIds,
            withUserSelection: data.withUserSelection,
          };
          setShooting(shooting);
        }
      }).catch((error) => {
        console.error("Error getting document:", error);
      });
  }

  const handleLoadingPreviewImages = async (shootingId: string) => {
    setLoadingPreview(true);
    try {
      const imagesRef = ref(`shootings/${shootingId}/preview`);
      const listResult = await listAll(imagesRef);
      const numberOfImages = listResult.items.length;
      setNumPages(Math.ceil(numberOfImages / 18));

      // Sort by original filename before fetching URLs — items carry the name directly
      function stemOf(filename: string): string {
        return (filename.split(".")[0].split("/").pop() ?? "").toLowerCase();
      }
      listResult.items.sort((a: any, b: any) => {
        const stemA = stemOf(a.name ?? "");
        const stemB = stemOf(b.name ?? "");
        const numA = stemA.match(/\d+/)?.[0];
        const numB = stemB.match(/\d+/)?.[0];
        if (numA && numB && parseInt(numA) !== parseInt(numB)) {
          return parseInt(numA) - parseInt(numB);
        }
        return stemA.localeCompare(stemB);
      });

      const imageUrls: string[] = [];
      for (const item of listResult.items) {
        const url = await getDownloadURL(item);
        imageUrls.push(url);
      }
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
    const selectedImagesRef = refRT(`userSelection/${shootingId}`);
    await set(selectedImagesRef, { selectedImages: selected }).then(() => {
      setSelected([]);
      setSelectMode(false);
      setUserSelection(selected);
      toast.success("Auswahl erfolgreich abgeschickt");
    }).catch((error) => {
      console.error("Error sending selected images to database: ", error);
      setSelected([]);
      setSelectMode(false);
      toast.error("Fehler beim Abschicken der Auswahl");
    })
  }

  async function downloadImagesAsZip() {
    if (!shooting?.id) return;
    try {
      setShowPlaceholder(true);
      const originalImageNames = await getOriginalImages(userSelection, shooting.id);
      const promises = originalImageNames.map((name) => {
        const imageRef = ref(`/shootings/${ shootingId }/original/${ name}`
        );
        return getDownloadURL(imageRef);
      });
      const urls = await Promise.all(promises);
      const zip = new JSZip();

      setProgress(0);
      let totalCompleted = 0; // Verfolgt die insgesamt abgeschlossenen Downloads
      const updateProgress = (loaded : number) => {
        totalCompleted += loaded;
        let progress = totalCompleted / originalImageNames.length;
        if(progress > 1) { progress = 1; }
        setProgress(progress);
      };

      const downloadFile = (url : string) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.responseType = 'blob';
          xhr.onload = function() {
            if (this.status === 200) {
              resolve(this.response);
            } else {
              reject(new Error(`Download-Fehler: ${ this.statusText}`));
            }
          };
          xhr.onerror = function() {
            reject(new Error('Netzwerkfehler'));
          };
          xhr.onprogress = function(event) {
            if (event.lengthComputable) {
              updateProgress(event.loaded / event.total);
            }
          };
          xhr.send();
        });
      };

      const downloadedFiles = await Promise.all(urls.map(downloadFile));

      downloadedFiles.forEach((file: any, index : number) => {
        zip.file(originalImageNames[index] ?? `bild-${index + 1}.jpg`, file);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const zipName = (shooting?.title || "fotos").replace(/[\\/:*?"<>|]/g, "-");
      saveAs(content, `${zipName}.zip`);
    } catch (error) {
      console.error("Fehler beim Herunterladen der Bilder als ZIP: ", error);
    }
  }

  const handlePageChange = (event: ChangeEvent<unknown>, value: number) => {
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

  // paid and public shootings have no checkout — the customer downloads directly
  const isFreeDownload = shooting?.type === "paid" || shooting?.type === "public";
  const primaryLabel = isAdminAlbum
    ? "Löschen"
    : isFreeDownload
      ? "Download"
      : "Kaufen";
  const primaryDisabled = shootingPackage && !isAdminAlbum && !isFreeDownload
    ? !(selected.length >= shootingPackage.numberOfImages)
    : selected.length === 0;
  const packageRemaining = shootingPackage
    ? Math.max(shootingPackage.numberOfImages - selected.length, 0)
    : 0;

  const topBar : ReactNode = (
    <Stack sx={{ pt: 3 }} direction="row" spacing={2} justifyContent="center">
      <Button variant="contained" onClick={() => setSelectMode(true)}>
        Bilder auswählen
      </Button>
    </Stack>
  );

  // sticky bar while selecting: count, package progress and all actions in
  // one place that stays visible while scrolling through the grid
  const actionBar : ReactNode = (
    <Paper
      elevation={8}
      square
      sx={{
        // clear the sidebar on desktop; the public album has no shell
        position: "fixed",
        left: { xs: 0, md: isPublicAlbum ? 0 : `${SIDEBAR_WIDTH}px` },
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        px: { xs: 1.5, md: 3 },
        py: 1.25,
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, md: 2 },
        flexWrap: "wrap",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ minWidth: 110 }}>
        <Typography fontWeight={600} variant="body2">
          {selected.length} ausgewählt
        </Typography>
        {shootingPackage && !isAdminAlbum && (
          <Typography
            variant="caption"
            color={packageRemaining > 0 ? "text.secondary" : "success.main"}
          >
            {packageRemaining > 0
              ? `noch ${packageRemaining} von ${shootingPackage.numberOfImages} inklusive wählen`
              : `Gesamt: ${calculateTotalPackagePrice(shootingPackage, selected.length)} €`}
          </Typography>
        )}
      </Box>
      <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          size="small"
          onClick={() => {
            discardSelection();
            setSelectMode(false);
          }}
        >
          Abbrechen
        </Button>
        <Button size="small" variant="outlined" onClick={() => selectAllPhotos()}>
          Alle
        </Button>
        {shooting?.withUserSelection && (
          <Button
            size="small"
            variant="outlined"
            disabled={selected.length === 0}
            onClick={() => {
              if (isAdminAlbum) {
                void downloadImagesAsZip();
              } else {
                void sendSelectedImages(selected);
              }
            }}
          >
            {isAdminAlbum ? "Auswahl herunterladen" : "Auswahl abschicken"}
          </Button>
        )}
        <Tooltip
          title={
            primaryDisabled && shootingPackage && !isAdminAlbum
              ? `Bitte mindestens ${shootingPackage.numberOfImages} Bilder auswählen`
              : primaryDisabled
                ? "Bitte zuerst Bilder auswählen"
                : ""
          }
        >
          <span>
            <Button
              size="small"
              variant="contained"
              color={isAdminAlbum ? "error" : "primary"}
              disabled={primaryDisabled}
              onClick={() => void primaryAction()}
            >
              {primaryLabel}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );

  if(loadingPreview) { return (
    <Grid container spacing={2}>
      {Array.from(new Array(9)).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Skeleton variant="rectangular" width="100%" height={200} />
        </Grid>
      ))}
    </Grid>
  ) }

  return (
    <div style={{ paddingBottom: selectMode ? 88 : 0 }}>
      {!isAdminAlbum && shooting?.withUserSelection && (
        <Grid container spacing={2}>
          <Grid item xs={12} sx={{ mx: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {shooting?.type === "paid"
                ? "Markiere Bilder und klicke auf „Auswahl abschicken“, um eine Vorauswahl zu treffen, oder lade sie direkt über „Download“ herunter."
                : "Markiere Bilder und klicke auf „Auswahl abschicken“, um eine Vorauswahl zu treffen, oder kaufe direkt über „Kaufen“."}
            </Typography>
          </Grid>
        </Grid>
      )}
      {shooting && (isAdminAlbum || shooting.type === "public") && (
        <Stack
          direction="column"
          alignItems="center"
          spacing={1}
          sx={{ mt: 1 }}
        >
          {shooting.type === "public" && !isAdminAlbum && (
            <Typography variant="body2" align="center" color="text.secondary">
              Dieses Shooting ist öffentlich. Teile den Link mit Freunden und Familie.
            </Typography>
          )}
          <ShareDialog shooting={shooting} />
        </Stack>
      )}
      {selectMode && (
        <Typography
          variant="h5"
          align="left"
          color="text.secondary"
          paragraph
        >
          {selected.length} ausgewählt
        </Typography>
      )}
      {showPlaceholder && progress > 0 && (
        <Grid container sx={{ display: 'flex', alignItems: 'center' }}>
          <Grid item xs={12} sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" {...props} value={progress * 100}/>
          </Grid>
          <Grid item xs={4} sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">{`${Math.round(
              progress * 100
            )}%`}</Typography>
          </Grid>
          {progress === 1 && (
            <Grid item xs={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">Download abgeschlossen</Typography>
              <Check />
            </Grid>
          )}
        </Grid>
      )}
      {(!isAdminAlbum && shootingPackage) && (
        <>
          <Typography
            variant="body1"
            align="left"
            paragraph
          >
            Aus den vorhandenen Bildern können {shootingPackage.numberOfImages} Stk. für den Preis {shootingPackage.totalPrice} € ausgewählt werden. <br />
            Jedes zusätzliche Bild kostet {shootingPackage.singlePrice} €. <br />
            Gesamtpreis für alle Bilder: {" "}
            <b>
              {calculateTotalPackagePrice(shootingPackage, selected.length)} €
            </b>
          </Typography>
        </>
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
        />
      ) : (
        <ImageList
          variant="masonry"
          cols={isMobile ? 2 : 4}
          gap={4}
          sx={{ flexDirection: "column", mt: 3 }}
        >
          {previewImages.map((image : string) => (
            <ImageListItem key={image}>
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
              />
            </ImageListItem>
          ))}
        </ImageList>
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
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Stack spacing={2}>
            <Pagination
              count={numPages}
              color="primary"
              page={page}
              onChange={(event: ChangeEvent<unknown>, value: number) => handlePageChange(event, value)}
            />
          </Stack>
        </div>
      )}
    </div>
  );
}
