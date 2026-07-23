import { Check, Circle as RadioButtonUnchecked } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, TouchEvent, useEffect, useRef, useState } from "react";

// how long a touch has to rest on a tile before it starts the selection
const LONG_PRESS_MS = 450;
// finger wobble that still counts as holding still rather than scrolling
const LONG_PRESS_TOLERANCE_PX = 10;

type Props = {
  image: string;
  selectMode: boolean;
  isSelected: boolean;
  // selection that was already submitted by the customer
  isInUserSelection: boolean;
  onClick: () => void;
  onToggleSelect: () => void;
};

// Grid tiles load the small server-side thumb instead of the full preview —
// the sizes are declared on the images.file field (pb_migrations).
export function thumbUrl(image: string, size = "400x0"): string {
  return image + (image.includes("?") ? "&" : "?") + "thumb=" + size;
}

const s = stylex.create({
  tile: {
    position: "relative",
    overflow: "hidden",
    cursor: "pointer",
    backgroundColor: "var(--color-background-muted)",
    borderRadius: "var(--radius-element)",
  },
  img: (loaded: boolean, selected: boolean) => ({
    display: "block",
    width: "100%",
    opacity: loaded ? (selected ? 0.75 : 1) : 0,
    transition: "opacity 0.3s ease, transform 0.35s ease",
  }),
  check: (visible: boolean, selected: boolean) => ({
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s ease",
    opacity: visible ? 1 : 0,
    cursor: "pointer",
    color: "#fff",
    backgroundColor: selected ? "var(--color-accent)" : "rgba(0,0,0,0.35)",
    border: selected ? "none" : "1.5px solid rgba(255,255,255,0.9)",
  }),
  badge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  smallIcon: { fontSize: 18 },
  tinyIcon: { fontSize: 13 },
});

// One tile of the album grid: fades in on load, zooms slightly on hover,
// shows an instagram-like check bubble in select mode.
export default function AlbumImage(props: Props): ReactElement {
  const { image, selectMode, isSelected, isInUserSelection, onClick, onToggleSelect } = props;
  const [loaded, setLoaded] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // set once the press fired, so the tap that follows doesn't open the preview
  const longPressFired = useRef(false);

  const cancelLongPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressStart.current = null;
  };

  // a pending press must not survive the tile (pagination swaps the grid)
  useEffect(() => cancelLongPress, []);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    longPressFired.current = false;
    // in select mode a plain tap already toggles, no need for the press
    if (selectMode || event.touches.length !== 1) return;
    const touch = event.touches[0];
    pressStart.current = { x: touch.clientX, y: touch.clientY };
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      longPressFired.current = true;
      onToggleSelect();
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = pressStart.current;
    if (!start) return;
    const touch = event.touches[0];
    const moved =
      Math.abs(touch.clientX - start.x) > LONG_PRESS_TOLERANCE_PX ||
      Math.abs(touch.clientY - start.y) > LONG_PRESS_TOLERANCE_PX;
    // the finger is scrolling the grid, not holding a tile
    if (moved) cancelLongPress();
  };

  return (
    <div
      className="album-tile"
      onClick={() => {
        if (longPressFired.current) {
          longPressFired.current = false;
          return;
        }
        onClick();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onContextMenu={(event) => {
        // Android raises this mid-press; suppress it only for touch
        if (pressStart.current || longPressFired.current) event.preventDefault();
      }}
      {...stylex.props(s.tile)}
    >
      <img
        src={thumbUrl(image)}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        {...stylex.props(s.img(loaded, isSelected))}
      />

      {/* select bubble: always in select mode, on hover otherwise.
          Its own handler keeps the click off the tile, which would open the preview. */}
      <div
        className="album-tile-check"
        role="checkbox"
        aria-checked={isSelected}
        aria-label={isSelected ? "Bild abwählen" : "Bild auswählen"}
        onClick={(event) => {
          event.stopPropagation();
          // a press that started on the bubble already toggled it
          if (longPressFired.current) {
            longPressFired.current = false;
            return;
          }
          onToggleSelect();
        }}
        {...stylex.props(s.check(selectMode || isSelected, isSelected))}
      >
        {isSelected ? (
          <Check {...stylex.props(s.smallIcon)} />
        ) : (
          <RadioButtonUnchecked style={{ fontSize: 18, opacity: 0.01 }} />
        )}
      </div>

      {/* customer's submitted selection */}
      {isInUserSelection && (
        <div {...stylex.props(s.badge)}>
          <Check {...stylex.props(s.tinyIcon)} /> AUSGEWÄHLT
        </div>
      )}
    </div>
  );
}
