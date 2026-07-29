// Shared styling for the help index and the article view. Both render in two
// shells — inside the app layout for signed-in users, and standalone (no
// sidebar) for visitors — so the container styles live here too.
//
// The article body itself is not styled here: it is injected HTML, which
// StyleX cannot reach. Its typography is the `.help-article` block in
// index.css.

import * as stylex from "@stylexjs/stylex";

const MD = "@media (min-width: 720px)";

export const helpStyles = stylex.create({
  column: { display: "flex", flexDirection: "column", gap: 12 },

  // ---- content typography -------------------------------------------------
  // Astryx's Heading scale tops out around 17px — it is built for compact UI
  // labels, not for reading pages. Content headings are therefore sized here,
  // in the same scale as the `.help-article` body type in index.css.
  pageTitle: {
    fontSize: { default: "1.625rem", [MD]: "1.875rem" },
    lineHeight: 1.2,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "var(--color-text-primary)",
  },
  sectionTitle: {
    fontSize: "1.0625rem",
    lineHeight: 1.35,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    color: "var(--color-text-primary)",
  },

  // ---- shells -------------------------------------------------------------
  // signed-in: the page content is centred on a readable column rather than
  // stretched across the full admin width
  inner: { maxWidth: 900, marginInline: "auto", width: "100%" },
  standalone: { maxWidth: 900, margin: "0 auto", padding: "32px 16px 64px" },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  articleTitle: { marginBottom: 12 },
  standaloneHead: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    marginBottom: 32,
    textAlign: "center",
  },

  // ---- hero + search ------------------------------------------------------
  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: { default: "28px 20px", [MD]: "40px 32px" },
    marginBottom: 32,
    textAlign: "center",
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  heroSearch: { width: "100%", maxWidth: 520, marginTop: 16 },

  // ---- category sections --------------------------------------------------
  sections: { display: "flex", flexDirection: "column", gap: 16 },
  categoryCard: {
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    overflow: "hidden",
  },
  categoryHead: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderBottom: "1px solid var(--color-border)",
  },
  categoryIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 36,
    height: 36,
    fontSize: 18,
    borderRadius: "var(--radius-full)",
    color: "var(--color-text-accent)",
    backgroundColor: "var(--color-background-muted)",
  },
  categoryText: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },

  // ---- article rows -------------------------------------------------------
  articleList: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [MD]: "repeat(2, minmax(0, 1fr))" },
  },
  articleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 16px",
    color: "inherit",
    textDecoration: "none",
    borderTop: "1px solid var(--color-border)",
    backgroundColor: {
      default: "transparent",
      ":hover": "var(--color-overlay-hover)",
    },
  },
  articleRowText: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  chevron: {
    flexShrink: 0,
    fontSize: 16,
    color: "var(--color-icon-disabled)",
    lineHeight: 0,
  },

  // ---- search results -----------------------------------------------------
  resultCount: { marginBottom: 4 },
  resultList: {
    display: "flex",
    flexDirection: "column",
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
    overflow: "hidden",
  },
  resultRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    color: "inherit",
    textDecoration: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": "var(--color-overlay-hover)",
    },
  },
  resultRowDivided: { borderTop: "1px solid var(--color-border)" },
  resultCrumb: { marginBottom: 2 },

  // ---- article view -------------------------------------------------------
  article: { display: "flex", flexDirection: "column" },
  lead: { maxWidth: "62ch", marginBottom: 24 },
  relatedPathCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    maxWidth: "68ch",
    marginTop: 32,
    padding: 16,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-muted)",
  },
  externalLinks: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 },

  footerBlocks: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [MD]: "repeat(2, minmax(0, 1fr))" },
    gap: 16,
    marginTop: 48,
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  blockLinks: { display: "flex", flexDirection: "column", gap: 8 },
  blockLink: {
    color: "var(--color-text-accent)",
    textDecoration: "none",
    backgroundColor: { default: "transparent", ":hover": "transparent" },
  },

  // ---- contact + meta -----------------------------------------------------
  contactCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 32,
    padding: 20,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  contactText: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
    paddingTop: 20,
    borderTop: "1px solid var(--color-border)",
    textAlign: "center",
  },
  metaLink: { color: "var(--color-text-secondary)", textDecoration: "none" },
  inlineLink: { color: "var(--color-text-accent)", textDecoration: "underline" },
});
