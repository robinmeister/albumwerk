import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  ArrowBack,
  ArrowForward,
  Close,
  DoneAll,
  Download,
  Remove,
} from "@mui/icons-material";
import { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { ImagePriceObject, Price } from "../../../../utils/types";
import { thumbUrl } from "../../../Album/components/AlbumImage";
import { calculateTotalPrice } from "../../utils/functions";
import { CATEGORY_LABELS, groupPrices } from "../../utils/catalog";
import { SIDEBAR_WIDTH } from "../../../../components/layout/AppShell";

type Props = {
  prices: Price[];
  selectedImages: string[];
  setSelectedImages: (images: string[]) => void;
  imagePriceObjectList: ImagePriceObject[];
  setImagePriceObjectList: (list: ImagePriceObject[]) => void;
  onContinue: () => void;
};

export default function PricingForm(props: Props): ReactElement {
  const {
    prices,
    selectedImages,
    setSelectedImages,
    imagePriceObjectList,
    setImagePriceObjectList,
    onContinue,
  } = props;
  const navigate = useNavigate();

  const [currentImage, setCurrentImage] = useState<string>(selectedImages[0]);

  // keep exactly one entry per selected image, preserving existing picks
  useEffect(() => {
    const list = selectedImages.map(
      (image) =>
        imagePriceObjectList.find((x) => x.image === image) ?? { image, price: [] }
    );
    if (
      list.length !== imagePriceObjectList.length ||
      list.some((entry, i) => entry !== imagePriceObjectList[i])
    ) {
      setImagePriceObjectList(list);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImages]);

  const currentEntry = imagePriceObjectList.find((x) => x.image === currentImage);
  const currentIndex = selectedImages.indexOf(currentImage);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === selectedImages.length - 1;

  const pricedCount = imagePriceObjectList.filter((o) => o.price.length > 0).length;
  const allPriced = pricedCount === selectedImages.length && selectedImages.length > 0;

  const quantityOf = (priceId: string): number =>
    currentEntry?.price.find((p) => p.id === priceId)?.quantity ?? 0;

  function setQuantity(price: Price, quantity: number) {
    setImagePriceObjectList(
      imagePriceObjectList.map((obj) => {
        if (obj.image !== currentImage) return obj;
        const rest = obj.price.filter((p) => p.id !== price.id);
        return {
          ...obj,
          price: quantity > 0 ? [...rest, { ...price, quantity }] : rest,
        };
      })
    );
  }

  function applyToAll() {
    const template = currentEntry?.price ?? [];
    if (template.length === 0) return;
    setImagePriceObjectList(
      imagePriceObjectList.map((obj) => ({
        ...obj,
        price: template.map((p) => ({ ...p })),
      }))
    );
    toast.success("Auswahl für alle Bilder übernommen");
  }

  function jumpToNextUnpriced() {
    const next = imagePriceObjectList.find((o) => o.price.length === 0);
    if (next) setCurrentImage(next.image);
  }

  function handleDeselect() {
    const idx = selectedImages.indexOf(currentImage);
    const next =
      idx < selectedImages.length - 1
        ? selectedImages[idx + 1]
        : selectedImages[idx - 1];
    setSelectedImages(selectedImages.filter((img) => img !== currentImage));
    if (next) setCurrentImage(next);
  }

  /* ── No images selected ── */
  if (selectedImages.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" gutterBottom>
          Keine Bilder ausgewählt
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Wähle zuerst im Album die Bilder aus, die du kaufen möchtest.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/album")}>
          Zum Album
        </Button>
      </Box>
    );
  }

  /* ── Sticky summary bar ── */
  const summaryBar = (
    <Paper
      elevation={8}
      square
      sx={{
        position: "fixed",
        left: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
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
      <Box>
        <Typography fontWeight={700} variant="body1">
          {calculateTotalPrice(imagePriceObjectList)} €
        </Typography>
        <Typography
          variant="caption"
          color={allPriced ? "success.main" : "text.secondary"}
          sx={{ cursor: allPriced ? "default" : "pointer" }}
          onClick={allPriced ? undefined : jumpToNextUnpriced}
        >
          {allPriced
            ? "Alle Bilder bepreist"
            : `${pricedCount} von ${selectedImages.length} Bildern bepreist — zum nächsten offenen Bild`}
        </Typography>
      </Box>
      <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
        <Tooltip
          title={allPriced ? "" : "Bitte wähle für jedes Bild mindestens ein Produkt"}
        >
          <span>
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              disabled={!allPriced}
              onClick={onContinue}
            >
              Weiter zur Bezahlung
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );

  /* ── Main: image + price selection ── */
  return (
    <Box sx={{ pb: 10 }}>
      <Grid container spacing={3}>
        {/* ── Left column: image preview + thumbnail strip ── */}
        <Grid item xs={12} md={5}>
          <Box
            sx={{
              position: "relative",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: "action.hover",
              aspectRatio: "4 / 3",
            }}
          >
            <img
              src={currentImage}
              alt={`Bild ${currentIndex + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <Tooltip title="Bild abwählen">
              <span style={{ position: "absolute", top: 8, right: 8 }}>
                <IconButton
                  size="small"
                  onClick={handleDeselect}
                  disabled={selectedImages.length === 1}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.9)",
                    "&:hover": { bgcolor: "rgba(255,255,255,1)" },
                    "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.5)" },
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* Image navigation */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mt={1} px={0.5}>
            <IconButton
              size="small"
              onClick={() => setCurrentImage(selectedImages[currentIndex - 1])}
              disabled={isFirst}
            >
              <ArrowBack fontSize="small" />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              Bild {currentIndex + 1} von {selectedImages.length}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setCurrentImage(selectedImages[currentIndex + 1])}
              disabled={isLast}
            >
              <ArrowForward fontSize="small" />
            </IconButton>
          </Box>

          {/* Thumbnail strip */}
          <Box display="flex" gap={0.75} flexWrap="wrap" mt={1}>
            {selectedImages.map((img, idx) => {
              const hasPrices =
                (imagePriceObjectList.find((x) => x.image === img)?.price?.length ?? 0) > 0;
              const isCurrent = img === currentImage;
              return (
                <Box
                  key={img}
                  onClick={() => setCurrentImage(img)}
                  sx={{
                    width: 48,
                    height: 48,
                    cursor: "pointer",
                    borderRadius: 0.75,
                    overflow: "hidden",
                    border: "2px solid",
                    borderColor: isCurrent
                      ? "primary.main"
                      : hasPrices
                      ? "success.main"
                      : "divider",
                    opacity: isCurrent ? 1 : 0.65,
                    "&:hover": { opacity: 1 },
                    transition: "opacity 0.15s, border-color 0.15s",
                  }}
                >
                  <img
                    src={thumbUrl(img)}
                    alt={`Bild ${idx + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
              );
            })}
          </Box>
        </Grid>

        {/* ── Right column: product selection for the current image ── */}
        <Grid item xs={12} md={7}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1.5}>
            <Typography variant="subtitle1" fontWeight={600}>
              Produkte für Bild {currentIndex + 1}
            </Typography>
            <Tooltip title="Überträgt die Produktauswahl dieses Bildes auf alle ausgewählten Bilder">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DoneAll />}
                  disabled={(currentEntry?.price.length ?? 0) === 0}
                  onClick={applyToAll}
                >
                  Für alle Bilder übernehmen
                </Button>
              </span>
            </Tooltip>
          </Box>

          {groupPrices(prices).map((group) => (
            <Box key={group.category} sx={{ mb: 1.5 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: "0.08em", fontSize: "0.68rem" }}
              >
                {CATEGORY_LABELS[group.category]}
              </Typography>
              {group.items.map((price) => {
            const quantity = quantityOf(price.id);
            const selected = quantity > 0;
            // a digital download makes no sense more than once per image
            const maxReached = price.isDownloadable && quantity >= 1;
            return (
              <Paper
                key={price.id}
                variant="outlined"
                onClick={() => {
                  if (!selected) setQuantity(price, 1);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  mb: 1,
                  cursor: selected ? "default" : "pointer",
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "action.selected" : "transparent",
                  transition: "border-color 0.15s, background-color 0.15s",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Box flex={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <Typography variant="body1" fontWeight={600} noWrap>
                      {price.title}
                    </Typography>
                    {price.isDownloadable && (
                      <Chip
                        icon={<Download sx={{ fontSize: 14 }} />}
                        label="Download"
                        size="small"
                        sx={{ height: 20, fontSize: "0.68rem" }}
                      />
                    )}
                  </Box>
                  {price.description && (
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {price.description}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body1" fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
                  {price.amount} €
                </Typography>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    size="small"
                    aria-label="Weniger"
                    disabled={quantity === 0}
                    onClick={() => setQuantity(price, quantity - 1)}
                  >
                    <Remove fontSize="small" />
                  </IconButton>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ minWidth: 20, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                  >
                    {quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Mehr"
                    disabled={maxReached}
                    onClick={() => setQuantity(price, quantity + 1)}
                  >
                    <Add fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            );
          })}
            </Box>
          ))}

          {/* secondary navigation below the product list */}
          <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
            {!isLast && (
              <Button
                variant="outlined"
                endIcon={<ArrowForward />}
                disabled={(currentEntry?.price.length ?? 0) === 0}
                onClick={() => setCurrentImage(selectedImages[currentIndex + 1])}
              >
                Nächstes Bild
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
      {summaryBar}
    </Box>
  );
}
