import { ReactElement, ReactNode } from "react";
import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from "@mui/material";
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
    <Box flex={1} width="100%" className={className}>
      {breadcrumps && (
        <Breadcrumbs maxItems={3} aria-label="breadcrumb" sx={{ mb: 1 }}>
          {breadcrumps.map(({ name, href }, index) =>
            index < breadcrumps.length - 1 && href ? (
              <MuiLink
                component={Link}
                to={href}
                key={name}
                color="inherit"
                underline="hover"
              >
                {name}
              </MuiLink>
            ) : (
              <Typography color="text.primary" key={name}>
                {name}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}
      {(showTitle || actions) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          flexWrap="wrap"
          sx={{ mb: 3, mt: 1 }}
        >
          <Box>
            {showTitle &&
              (typeof title === "string" ? (
                <Typography variant="h4" component="h1">
                  {title}
                </Typography>
              ) : (
                title
              ))}
            {showTitle && subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
        </Stack>
      )}
      <ErrorBoundary>{children}</ErrorBoundary>
    </Box>
  );
}
