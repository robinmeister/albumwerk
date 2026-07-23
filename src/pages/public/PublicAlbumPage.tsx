import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Album from "../../features/Album/components/Album";
import BrandLogo from "../../components/widgets/BrandLogo";
import { useSettings } from "../../context/SettingsContext";
import { pb } from "../../config/pocketbase";

const MD = "@media (min-width: 900px)";

const s = stylex.create({
  root: { minHeight: "100vh", backgroundColor: "var(--color-background-body)" },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    paddingInline: 16,
    paddingTop: { default: 40, [MD]: 64 },
    paddingBottom: 48,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 8,
    marginBottom: 32,
  },
  logoRing: {
    borderRadius: "50%",
    overflow: "hidden",
    width: { default: 88, [MD]: 120 },
    height: { default: 88, [MD]: 120 },
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-surface)",
    marginBottom: 8,
  },
  overline: { letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 8 },
  divider: { marginBottom: 8 },
  footer: {
    marginTop: 48,
    display: "flex",
    justifyContent: "center",
    gap: 16,
    color: "var(--color-text-secondary)",
    fontSize: "0.8rem",
  },
  link: { color: "inherit", textDecoration: "none" },
});

// The share-link page — styled like a photographer's profile: round logo,
// name and tagline on top, the image grid below.
export default function PublicAlbumPage(): ReactElement {
  const { shootingId } = useParams();
  const { settings } = useSettings();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [shootingTitle, setShootingTitle] = useState("");

  useEffect(() => {
    if (!shootingId) return;
    pb.collection("shootings")
      .getOne(shootingId, { requestKey: null })
      .then((record) => setShootingTitle((record as any).title ?? ""))
      .catch(() => setShootingTitle(""));
  }, [shootingId]);

  return (
    <div {...stylex.props(s.root)}>
      <div {...stylex.props(s.container)}>
        {/* profile header */}
        <div {...stylex.props(s.header)}>
          <div {...stylex.props(s.logoRing)}>
            <BrandLogo size={120} />
          </div>
          <Heading level={3} accessibilityLevel={1}>
            {settings.businessName}
          </Heading>
          {settings.tagline && (
            <Text type="body" color="secondary">
              {settings.tagline}
            </Text>
          )}
          {shootingTitle && (
            <span {...stylex.props(s.overline)}>
              <Text type="supporting" color="secondary">{shootingTitle}</Text>
            </span>
          )}
        </div>

        <div {...stylex.props(s.divider)}><Divider /></div>

        {shootingId && shootingId !== "" && (
          <Album
            isPublicAlbum={true}
            isAdminAlbum={false}
            shootingId={shootingId}
            selected={selected}
            setSelected={setSelected}
            selectMode={selectMode}
            setSelectMode={setSelectMode}
          />
        )}

        {/* mini footer for the standalone page */}
        <div {...stylex.props(s.footer)}>
          <span>© {new Date().getFullYear()} {settings.businessName}</span>
          <Link to="/imprint" {...stylex.props(s.link)}>Impressum</Link>
          <Link to="/privacy" {...stylex.props(s.link)}>Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}
