// Shape of a help article. Articles ship with the build (src/content/help/*)
// and can additionally come from the `helpArticles` collection, so this type is
// the common denominator both sources are normalised to (see src/utils/help.ts).

import { ComponentType } from "react";

export type HelpAudience = "admin" | "customer" | "public";

export type HelpCategoryKey =
  | "basics"
  | "setup"
  | "albums"
  | "selling"
  | "customers"
  | "operations";

export interface HelpCategory {
  key: HelpCategoryKey;
  label: string;
  description: string;
  Icon: ComponentType;
}

export interface HelpArticle {
  /** Stable id — target of /help/:slug and <HelpHint slug=… />. Never rename. */
  slug: string;
  title: string;
  /** One-liner for search hits, cards and the HelpHint popover. */
  summary: string;
  audience: HelpAudience[];
  category: HelpCategoryKey;
  /** Extra search terms (synonyms, wording customers actually use). */
  keywords?: string[];
  /** In-app route the article talks about, rendered as a "go there" button. */
  relatedPath?: string;
  /** Sanitized before rendering; styled by the `.rich-text` rules in index.css. */
  bodyHtml: string;
  /** Optional outbound links. Reserved for real external guides. */
  links?: { label: string; href: string }[];
  /** Set for articles loaded from the helpArticles collection. */
  isCustom?: boolean;
  /** Record id, only present on custom articles. */
  id?: string;
  /** Manual ordering within a category; lower comes first. */
  sort?: number;
  /** Custom articles only — drafts are visible to admins but not on the help page. */
  published?: boolean;
}
