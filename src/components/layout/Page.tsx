import { ReactElement, ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import * as stylex from "@stylexjs/stylex";
import { Link } from "react-router-dom";

import useMobileService from "../../hooks/useMobileService";

import ErrorBoundary from "./ErrorBoundary";

type Props = {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  // right-aligned slot next to the title, e.g. a primary action button
  actions?: ReactNode;
  showTitleOnMobile?: boolean;
  breadcrumps?: { name: string; href?: string }[];
  className?: string;
  marginBottom?: string;
};

const s = stylex.create({
  root: { flex: 1, width: "100%" },
  crumbs: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  crumbSep: { color: "var(--color-text-secondary)" },
  crumbLink: { color: "var(--color-text-secondary)", textDecoration: "none" },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 24,
  },
  subtitle: { marginTop: 4 },
  actions: { flexShrink: 0 },
});

export default function Page(props: Props): ReactElement {
  const isMobile = useMobileService();
  const {
    children,
    title,
    subtitle,
    actions,
    breadcrumps,
    className,
    showTitleOnMobile,
  } = props;

  const showTitle = Boolean(title) && (showTitleOnMobile ?? !isMobile);

  return (
    <div className={className} {...stylex.props(s.root)}>
      {breadcrumps && (
        <nav aria-label="breadcrumb" {...stylex.props(s.crumbs)}>
          {breadcrumps.map(({ name, href }, index) => {
            const isLast = index >= breadcrumps.length - 1;
            return (
              <span key={name} {...stylex.props(s.crumbs)}>
                {isLast || !href ? (
                  <Text type="supporting">{name}</Text>
                ) : (
                  <>
                    <Link to={href} {...stylex.props(s.crumbLink)}>
                      <Text type="supporting" color="secondary">
                        {name}
                      </Text>
                    </Link>
                    <span {...stylex.props(s.crumbSep)}>/</span>
                  </>
                )}
              </span>
            );
          })}
        </nav>
      )}
      {(showTitle || actions) && (
        <div {...stylex.props(s.header)}>
          <div>
            {showTitle &&
              (typeof title === "string" ? (
                <Heading level={4} accessibilityLevel={1}>
                  {title}
                </Heading>
              ) : (
                title
              ))}
            {showTitle && subtitle && (
              <div {...stylex.props(s.subtitle)}>
                <Text type="body" color="secondary">
                  {subtitle}
                </Text>
              </div>
            )}
          </div>
          {actions && <div {...stylex.props(s.actions)}>{actions}</div>}
        </div>
      )}
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
