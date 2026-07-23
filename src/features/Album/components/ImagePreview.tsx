import { Check, ChevronLeft, ChevronRight, X as CloseOutlined, Circle as RadioButtonUnchecked, Image as Wallpaper } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
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

const SM = "@media (min-width: 600px)";

const s = stylex.create({
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 1300,
    backgroundColor: "#000",
  },
  topbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "linear-gradient(rgba(0,0,0,0.55), transparent)",
  },
  counter: { color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" },
  topActions: { display: "flex", gap: 8 },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    border: "none",
    borderRadius: "var(--radius-full)",
    color: "#fff",
    cursor: "pointer",
    backdropFilter: "blur(4px)",
    backgroundColor: {
      default: "rgba(255,255,255,0.08)",
      ":hover": "rgba(255,255,255,0.2)",
    },
  },
  btnActive: {
    backgroundColor: { default: "var(--color-accent)", ":hover": "var(--color-accent)" },
  },
  stage: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  img: (loaded: boolean) => ({
    maxWidth: "100vw",
    maxHeight: "100vh",
    objectFit: "contain",
    userSelect: "none",
    opacity: loaded ? 1 : 0,
    transition: "opacity 0.25s ease",
  }),
  arrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
    display: { default: "none", [SM]: "inline-flex" },
  },
  arrowLeft: { left: 12 },
  arrowRight: { right: 12 },
});

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

  if (!open || !previewImage) return null;

  const isSelected = selected.includes(previewImage);

  return (
    <div {...stylex.props(s.root)}>
      {/* top bar */}
      <div {...stylex.props(s.topbar)}>
        <span {...stylex.props(s.counter)}>
          {index + 1} / {images.length}
        </span>
        <div {...stylex.props(s.topActions)}>
          {onSetCover && (
            <button
              aria-label="Als Cover setzen"
              onClick={() => onSetCover(previewImage)}
              {...stylex.props(s.btn)}
            >
              <Wallpaper />
            </button>
          )}
          <button
            aria-label="Auswählen"
            onClick={toggleSelected}
            {...stylex.props(s.btn, isSelected && s.btnActive)}
          >
            {isSelected ? <Check /> : <RadioButtonUnchecked />}
          </button>
          <button aria-label="Schließen" onClick={close} {...stylex.props(s.btn)}>
            <CloseOutlined />
          </button>
        </div>
      </div>

      {/* image */}
      <div {...handlers} onClick={close} {...stylex.props(s.stage)}>
        <img
          src={previewImage}
          alt="Vorschau"
          onLoad={() => setImageLoaded(true)}
          onClick={(e) => e.stopPropagation()}
          {...stylex.props(s.img(imageLoaded))}
        />
      </div>

      {/* desktop arrows */}
      {index > 0 && (
        <button
          aria-label="Vorheriges Bild"
          onClick={() => goTo(index - 1)}
          {...stylex.props(s.btn, s.arrow, s.arrowLeft)}
        >
          <ChevronLeft />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          aria-label="Nächstes Bild"
          onClick={() => goTo(index + 1)}
          {...stylex.props(s.btn, s.arrow, s.arrowRight)}
        >
          <ChevronRight />
        </button>
      )}
    </div>
  );
}
