import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, ReactNode, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import BrandLogo from "../widgets/BrandLogo";
import { useSettings } from "../../context/SettingsContext";
import { loadImage } from "../../utils/functions";

type Props = {
  children: ReactNode;
  maxWidth?: number;
};

const SM = "@media (min-width: 600px)";

const s = stylex.create({
  root: {
    minHeight: "100vh",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "linear-gradient(160deg, var(--color-accent) 0%, #111 85%)",
  },
  bg: (loaded: boolean) => ({
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: loaded ? 1 : 0,
    transition: "opacity 0.6s ease",
  }),
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" },
  card: {
    position: "relative",
    width: "100%",
    paddingInline: { default: 24, [SM]: 40 },
    paddingBlock: { default: 32, [SM]: 40 },
    borderRadius: "var(--radius-container)",
    backgroundColor:
      "color-mix(in srgb, var(--color-background-surface) 92%, transparent)",
    backdropFilter: "blur(10px)",
  },
  head: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    textAlign: "center",
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
  },
  footerLink: {
    color: "var(--color-text-secondary)",
    textDecoration: "none",
  },
});

// Shared hero layout for the auth pages: fullscreen background image (one of
// the loginImages, faded in once loaded) with a dark overlay and a floating
// glass card. Renders instantly — no image, no spinner, just the gradient.
export default function AuthHero({ children, maxWidth = 420 }: Props): ReactElement {
  const { settings } = useSettings();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const url = await loadImage();
      if (url) setImageUrl(url);
    })();
  }, []);

  return (
    <div {...stylex.props(s.root)}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onLoad={() => setImageLoaded(true)}
          {...stylex.props(s.bg(imageLoaded))}
        />
      )}
      <div {...stylex.props(s.overlay)} />

      <div {...stylex.props(s.card)} style={{ maxWidth }}>
        <div {...stylex.props(s.head)}>
          <BrandLogo platz="seitenkopf" />
          <Heading level={4} accessibilityLevel={1}>
            {settings.businessName}
          </Heading>
          {settings.tagline && (
            <Text type="supporting" color="secondary">
              {settings.tagline}
            </Text>
          )}
        </div>
        {children}

        {/* the auth pages are the one place a visitor without an account can
            reach the legal pages and the help articles */}
        <div {...stylex.props(s.footer)}>
          <Link to="/imprint" {...stylex.props(s.footerLink)}>
            <Text type="supporting" color="secondary">
              Impressum
            </Text>
          </Link>
          <Link to="/privacy" {...stylex.props(s.footerLink)}>
            <Text type="supporting" color="secondary">
              Datenschutz
            </Text>
          </Link>
          <Link to="/help" {...stylex.props(s.footerLink)}>
            <Text type="supporting" color="secondary">
              Hilfe
            </Text>
          </Link>
        </div>
      </div>
    </div>
  );
}
