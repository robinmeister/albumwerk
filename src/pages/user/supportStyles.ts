// Shared styling for the two support views (SupportPage for customers,
// admin/AdminSupportPage for the operator) — same ticket list, same thread
// bubbles, so the styles live in one place.

import * as stylex from "@stylexjs/stylex";

import { SupportStatus } from "../../utils/types";

export const supportStyles = stylex.create({
  column: { display: "flex", flexDirection: "column", gap: 12 },
  center: { display: "flex", justifyContent: "center", padding: 48 },
  card: {
    borderRadius: "var(--radius-container)",
    // Einzeleigenschaften: StyleX verwirft die border-Kurzform ersatzlos.
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    textAlign: "left",
    color: "inherit",
    font: "inherit",
  },
  cardPad: { display: "flex", flexDirection: "column", gap: 16, padding: 16 },
  ticketRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    width: "100%",
    padding: 16,
    cursor: "pointer",
    backgroundColor: {
      default: "var(--color-background-card)",
      ":hover": "var(--color-overlay-hover)",
    },
  },
  ticketMain: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  badgeRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  rowEnd: { display: "flex", justifyContent: "flex-end" },
  // ghost "back" buttons would otherwise stretch across the flex column
  rowStart: { display: "flex", justifyContent: "flex-start" },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  bubble: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxWidth: 620,
    padding: 12,
    borderRadius: "var(--radius-container)",
    whiteSpace: "pre-wrap",
  },
  bubbleOwn: {
    alignSelf: "flex-end",
    backgroundColor: "var(--color-background-muted)",
  },
  bubbleOther: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  linkButton: {
    alignSelf: "flex-start",
    background: "none",
    border: "none",
    padding: 0,
    color: "var(--color-text-secondary)",
    textDecoration: "underline",
    cursor: "pointer",
    font: "inherit",
  },
  pre: {
    margin: 0,
    padding: 8,
    fontSize: 12,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: 320,
    overflowY: "auto",
    backgroundColor: "var(--color-background-muted)",
    borderRadius: "var(--radius-element)",
  },
});

export function statusVariant(
  status: SupportStatus,
): "neutral" | "info" | "success" | "warning" {
  switch (status) {
    case "open":
      return "warning";
    case "waiting":
      return "info";
    case "resolved":
      return "success";
    default:
      return "neutral";
  }
}
