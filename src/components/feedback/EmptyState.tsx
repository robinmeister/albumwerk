import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";

import { getArticle } from "../../content/help";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  /** Vertical padding; smaller when embedded in a panel. */
  dense?: boolean;
  /** Slug of the help article explaining how to get out of this empty state. */
  helpSlug?: string;
}

const s = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: "0 16px",
    textAlign: "center",
  },
  pad: (dense: boolean) => ({
    paddingBlock: dense ? 48 : 80,
  }),
  icon: {
    color: "var(--color-icon-disabled)",
    fontSize: 72,
    lineHeight: 0,
  },
  desc: { maxWidth: 420 },
  helpLink: { color: "var(--color-text-secondary)", textDecoration: "underline" },
});

// Shared empty-state block (icon + heading + text + optional CTA). Replaces the
// hand-rolled variants that were duplicated across album, orders, pricing etc.
export default function EmptyState({
  icon,
  title,
  description,
  action,
  dense = false,
  helpSlug,
}: EmptyStateProps): ReactElement {
  const article = helpSlug ? getArticle(helpSlug) : undefined;

  return (
    <div {...stylex.props(s.root, s.pad(dense))}>
      {icon && <div {...stylex.props(s.icon)}>{icon}</div>}
      <Text type="large" weight="semibold" color="secondary">
        {title}
      </Text>
      {description && (
        <div {...stylex.props(s.desc)}>
          {/*
            "secondary", nicht "disabled": das hier ist ein Beschreibungstext,
            kein abgeschaltetes Bedienelement. Gemessen kam "disabled" auf
            rgb(159, 141, 136) auf Weiss = 3,16:1 und lag damit unter den
            geforderten 4,5:1 — auf allen dreizehn Seiten, die EmptyState
            benutzen, nicht nur auf /publicDownloads, wo die Kontrastprobe es
            gefunden hat.
          */}
          <Text type="body" color="secondary">
            {description}
          </Text>
        </div>
      )}
      {action && (
        <Button
          variant="primary"
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
        />
      )}
      {article && (
        <Link to={`/help/${article.slug}`} {...stylex.props(s.helpLink)}>
          <Text type="supporting" color="secondary">
            Wie das geht: {article.title}
          </Text>
        </Link>
      )}
    </div>
  );
}
