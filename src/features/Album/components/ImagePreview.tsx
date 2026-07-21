import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloseOutlined,
  RadioButtonUnchecked,
  Wallpaper,
} from "@mui/icons-material";
import { Box, Dialog, Fade, IconButton, Tooltip, Typography } from "@mui/material";
import { ReactElement, useCallback, useEffect, useState } from "react";
import { useSwipeable } from "react-swipeable";

type Props = {
  setSelectMode: (selectMode: boolean) => void;
  selected: string[];
  setSelected: (selected: string[]) => void;
  images: string[];
  open: boolean;
  setOpen: (open: boolean) => void;
  setPreviewImage: (image: string | null) => void;
  previewImage: string | null;
  // admin only: use the currently shown image as album cover
  onSetCover?: (image: string) => void;
};

// Fullscreen lightbox on black: swipe on touch, arrow keys / hover arrows on
// desktop, image counter and a like-style select toggle in the top bar.
export default function ImagePreview(props: Props): ReactElement | null {
  const {
    setSelectMode, selected, setSelected, images, open, setOpen,
    setPreviewImage, previewImage, onSetCover,
  } = props;
  const [imageLoaded, setImageLoaded] = useState(false);

  const index = previewImage ? images.indexOf(previewImage) : -1;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex >= 0 && nextIndex < images.length) {
        setImageLoaded(false);
        setPreviewImage(images[nextIndex]);
      }
    },
    [images, setPreviewImage],
  );

  const close = () => {
    setOpen(false);
    setPreviewImage(null);
  };

  const toggleSelected = () => {
    if (!previewImage) return;
    setSelectMode(true);
    setSelected(
      selected.includes(previewImage)
        ? selected.filter((s) => s !== previewImage)
        : [...selected, previewImage],
    );
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => goTo(index + 1),
    onSwipedRight: () => goTo(index - 1),
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, goTo]);

  // preload the neighbours so swiping/arrowing feels instant
  useEffect(() => {
    if (!open) return;
    [images[index + 1], images[index - 1]].forEach((url) => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [open, index, images]);

  if (!previewImage) return null;

  const isSelected = selected.includes(previewImage);

  const overlayButton = {
    color: "#fff",
    bgcolor: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(4px)",
    "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
  } as const;

  return (
    <Dialog
      open={open}
      onClose={close}
      fullScreen
      PaperProps={{ sx: { bgcolor: "#000" } }}
    >
      {/* top bar */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          background: "linear-gradient(rgba(0,0,0,0.55), transparent)",
        }}
      >
        <Typography sx={{ color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>
          {index + 1} / {images.length}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {onSetCover && (
            <Tooltip title="Als Cover setzen">
              <IconButton onClick={() => onSetCover(previewImage)} sx={overlayButton}>
                <Wallpaper />
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={toggleSelected} sx={{
            ...overlayButton,
            ...(isSelected && {
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }),
          }}>
            {isSelected ? <Check /> : <RadioButtonUnchecked />}
          </IconButton>
          <IconButton onClick={close} sx={overlayButton}>
            <CloseOutlined />
          </IconButton>
        </Box>
      </Box>

      {/* image */}
      <Box
        {...handlers}
        onClick={close}
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Fade in={imageLoaded} timeout={250}>
          <Box
            component="img"
            src={previewImage}
            alt="Vorschau"
            onLoad={() => setImageLoaded(true)}
            onClick={(e) => e.stopPropagation()}
            sx={{
              maxWidth: "100vw",
              maxHeight: "100vh",
              objectFit: "contain",
              userSelect: "none",
            }}
          />
        </Fade>
      </Box>

      {/* desktop arrows */}
      {index > 0 && (
        <IconButton
          onClick={() => goTo(index - 1)}
          sx={{
            ...overlayButton,
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: { xs: "none", sm: "inline-flex" },
            zIndex: 2,
          }}
        >
          <ChevronLeft fontSize="large" />
        </IconButton>
      )}
      {index < images.length - 1 && (
        <IconButton
          onClick={() => goTo(index + 1)}
          sx={{
            ...overlayButton,
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: { xs: "none", sm: "inline-flex" },
            zIndex: 2,
          }}
        >
          <ChevronRight fontSize="large" />
        </IconButton>
      )}
    </Dialog>
  );
}
