import { ReactElement } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ArrowRight as ArrowForward } from "lucide-react";

import { Package } from "../../../../utils/types";
import { calculateTotalPackagePrice } from "../../utils/functions";

type Props = {
  selectedImages: string[];
  shootingPackage: Package;
  activeStep: number;
  setActiveStep: (step: number) => void;
};

const s = stylex.create({
  summary: {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-container)",
    padding: 20,
    marginBottom: 24,
    backgroundColor: "var(--color-background-card)",
  },
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 600px)": "1fr 1fr 1fr" },
    gap: 8,
    marginTop: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr 1fr",
      "@media (min-width: 600px)": "repeat(3, 1fr)",
      "@media (min-width: 900px)": "repeat(4, 1fr)",
    },
    gap: 8,
    marginBottom: 24,
  },
  thumb: {
    aspectRatio: "1",
    borderRadius: "var(--radius-element)",
    overflow: "hidden",
    backgroundColor: "var(--color-background-muted)",
    border: "1px solid var(--color-border)",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  actions: { display: "flex", justifyContent: "flex-end" },
  sectionLabel: { marginBottom: 8 },
});

export default function PackageForm(props: Props): ReactElement {
  const { selectedImages, shootingPackage, activeStep, setActiveStep } = props;
  const total = calculateTotalPackagePrice(shootingPackage, selectedImages.length);

  return (
    <div>
      {/* ── Package summary ── */}
      <div {...stylex.props(s.summary)}>
        <div {...stylex.props(s.head)}>
          <div>
            <Heading level={6}>{shootingPackage.title}</Heading>
            {shootingPackage.description && (
              <Text type="body" color="secondary">{shootingPackage.description}</Text>
            )}
            <Text type="body" color="secondary">
              {selectedImages.length} Bilder ausgewählt
            </Text>
          </div>
          <Badge variant="info" label={`${total} €`} />
        </div>

        <Divider />

        <div {...stylex.props(s.stats)}>
          <div>
            <Text type="supporting" color="secondary">Paketpreis</Text>
            <Text type="body" weight="semibold">{shootingPackage.totalPrice} €</Text>
          </div>
          <div>
            <Text type="supporting" color="secondary">Einzelbild</Text>
            <Text type="body" weight="semibold">{shootingPackage.singlePrice} € / Bild</Text>
          </div>
          <div>
            <Text type="supporting" color="secondary">Anzahl</Text>
            <Text type="body" weight="semibold">{selectedImages.length} Bilder</Text>
          </div>
        </div>
      </div>

      {/* ── Image grid ── */}
      <div {...stylex.props(s.sectionLabel)}>
        <Text type="label" weight="semibold" color="secondary">
          Ausgewählte Bilder ({selectedImages.length})
        </Text>
      </div>
      <div {...stylex.props(s.grid)}>
        {selectedImages.map((img, idx) => (
          <div key={img} {...stylex.props(s.thumb)}>
            <img src={img} alt={`Bild ${idx + 1}`} {...stylex.props(s.thumbImg)} />
          </div>
        ))}
      </div>

      {/* ── Action ── */}
      <div {...stylex.props(s.actions)}>
        <Button
          variant="primary"
          endContent={<ArrowForward />}
          label="Weiter zur Bezahlung"
          onClick={() => setActiveStep(activeStep + 1)}
        />
      </div>
    </div>
  );
}
