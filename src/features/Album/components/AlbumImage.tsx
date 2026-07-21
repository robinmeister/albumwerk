import { Check, RadioButtonUnchecked } from "@mui/icons-material";
import { Box } from "@mui/material";
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

// One tile of the album grid: fades in on load, zooms slightly on hover,
// shows an instagram-like check bubble in select mode.
export default function AlbumImage(props: Props): ReactElement {
  const { image, selectMode, isSelected, isInUserSelection, onClick } = props;
  const [loaded, setLoaded] = useState(false);

  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        bgcolor: "action.hover",
        borderRadius: 0.5,
        "&:hover img": { transform: "scale(1.03)" },
        "&:hover .tileCheck": { opacity: 1 },
      }}
    >
      <Box
        component="img"
        src={thumbUrl(image)}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        sx={{
          display: "block",
          width: "100%",
          opacity: loaded ? (isSelected ? 0.75 : 1) : 0,
          transition: "opacity 0.3s ease, transform 0.35s ease",
        }}
      />

      {/* select bubble: always in select mode, on hover otherwise */}
      <Box
        className="tileCheck"
        sx={{
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
          opacity: selectMode || isSelected ? 1 : 0,
          color: "#fff",
          bgcolor: isSelected ? "primary.main" : "rgba(0,0,0,0.35)",
          border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.9)",
        }}
      >
        {isSelected ? (
          <Check sx={{ fontSize: 18 }} />
        ) : (
          <RadioButtonUnchecked sx={{ fontSize: 18, opacity: 0.01 }} />
        )}
      </Box>

      {/* customer's submitted selection */}
      {isInUserSelection && (
        <Box
          sx={{
            position: "absolute",
            left: 8,
            bottom: 8,
            px: 1,
            py: 0.25,
            borderRadius: 999,
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "#fff",
            bgcolor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Check sx={{ fontSize: 13 }} /> AUSGEWÄHLT
        </Box>
      )}
    </Box>
  );
}
