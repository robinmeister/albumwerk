import { ReactElement } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";

import { Package } from "../../../../utils/types";

type Props = {
  packages: Package[];
  setPackages: (packages: Package[]) => void;
  selectedPackages: Package[];
  setSelectedPackages: (packages: Package[]) => void;
};

const s = stylex.create({
  container: { maxWidth: 900, margin: "0 auto" },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@media (min-width: 600px)": "1fr 1fr",
      "@media (min-width: 900px)": "repeat(3, 1fr)",
    },
    gap: 24,
    alignItems: "flex-end",
  },
  card: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    overflow: "hidden",
    backgroundColor: "var(--color-background-card)",
  },
  head: {
    padding: 16,
    textAlign: "center",
    backgroundColor: "var(--color-background-muted)",
  },
  body: { padding: 16 },
});

export default function PackagesPreview(props: Props): ReactElement {
  const { packages } = props;

  return (
    <div {...stylex.props(s.container)}>
      <div {...stylex.props(s.grid)}>
        {packages
          .sort((a: Package, b: Package) => a?.title.localeCompare(b?.title))
          .map((pkg: Package) => (
            <div key={pkg?.title} {...stylex.props(s.card)}>
              <div {...stylex.props(s.head)}>
                <Heading level={6}>{pkg?.title}</Heading>
                <Text type="body" color="secondary">{`${pkg.totalPrice} €`}</Text>
              </div>
              <div {...stylex.props(s.body)}>
                <Text type="body">
                  {pkg.numberOfImages} Bilder sind in dem Paket enthalten. Jedes
                  weitere Bild kostet {pkg.singlePrice} €
                </Text>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
