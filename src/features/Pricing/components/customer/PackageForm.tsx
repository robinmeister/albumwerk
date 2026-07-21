import { ReactElement } from "react";
import { Box, Button, Chip, Divider, Grid, Typography } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";

import { Package } from "../../../../utils/types";
import { calculateTotalPackagePrice } from "../../utils/functions";

type Props = {
  selectedImages: string[];
  shootingPackage: Package;
  activeStep: number;
  setActiveStep: (step: number) => void;
};

export default function PackageForm(props: Props): ReactElement {
  const { selectedImages, shootingPackage, activeStep, setActiveStep } = props;
  const total = calculateTotalPackagePrice(shootingPackage, selectedImages.length);

  return (
    <Box>
      {/* ── Package summary ── */}
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          p: 2.5,
          mb: 3,
          bgcolor: "background.paper",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} mb={1.5}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {shootingPackage.title}
            </Typography>
            {shootingPackage.description && (
              <Typography variant="body2" color="text.secondary">
                {shootingPackage.description}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {selectedImages.length} Bilder ausgewählt
            </Typography>
          </Box>
          <Chip
            label={`${total} €`}
            color="primary"
            sx={{ fontWeight: 700, fontSize: "1rem", height: 32, px: 1 }}
          />
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Grid container spacing={1}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary" display="block">Paketpreis</Typography>
            <Typography variant="body2" fontWeight={600}>{shootingPackage.totalPrice} €</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary" display="block">Einzelbild</Typography>
            <Typography variant="body2" fontWeight={600}>{shootingPackage.singlePrice} € / Bild</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary" display="block">Anzahl</Typography>
            <Typography variant="body2" fontWeight={600}>{selectedImages.length} Bilder</Typography>
          </Grid>
        </Grid>
      </Box>

      {/* ── Image grid ── */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Ausgewählte Bilder ({selectedImages.length})
      </Typography>
      <Grid container spacing={1} sx={{ mb: 3 }}>
        {selectedImages.map((img, idx) => (
          <Grid item xs={6} sm={4} md={3} key={img}>
            <Box
              sx={{
                aspectRatio: "1",
                borderRadius: 1,
                overflow: "hidden",
                bgcolor: "grey.100",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <img
                src={img}
                alt={`Bild ${idx + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* ── Action ── */}
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={() => setActiveStep(activeStep + 1)}
        >
          Weiter zur Bezahlung
        </Button>
      </Box>
    </Box>
  );
}
