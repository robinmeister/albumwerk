import { Check, Circle as RadioButtonUnchecked } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useState } from "react";

type Props = {
  image: string;
  selectMode: boolean;
  isSelected: boolean;
  // selection that was already submitted by the customer
  isInUserSelection: boolean;
  onClick: () => void;
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
  const { image, selectMode, isSelected, isInUserSelection, onClick } = props;
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="album-tile" onClick={onClick} {...stylex.props(s.tile)}>
      <img
        src={thumbUrl(image)}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        {...stylex.props(s.img(loaded, isSelected))}
      />

      {/* select bubble: always in select mode, on hover otherwise */}
      <div
        className="album-tile-check"
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
