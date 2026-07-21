import { Box, Button, Typography } from "@mui/material";
import { ReactElement, ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  /** Vertical padding; smaller when embedded in a panel. */
  dense?: boolean;
}

// Shared empty-state block (icon + heading + text + optional CTA). Replaces the
// hand-rolled variants that were duplicated across album, orders, pricing etc.
export default function EmptyState({
  icon,
  title,
  description,
  action,
  dense = false,
}: EmptyStateProps): ReactElement {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      sx={{ py: dense ? 6 : 10, px: 2, textAlign: "center" }}
    >
      {icon && (
        <Box sx={{ color: "text.disabled", "& > *": { fontSize: 72 } }}>{icon}</Box>
      )}
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && (
        <Button variant="contained" startIcon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
