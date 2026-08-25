// Data access for operator-authored help articles.
// Schema: pb_migrations/1784600010_help_articles.js.
//
// The shipped articles in src/content/help are the base documentation; this
// collection lets an operator add their own ("So läuft es bei mir ab") or
// override a shipped article by reusing its slug.

import { pb } from "../config/pocketbase";
import {
  HelpArticle,
  HelpAudience,
  HelpCategoryKey,
  helpCategoryKeys,
} from "../content/help";

export interface CustomArticleInput {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  audience: HelpAudience[];
  category: HelpCategoryKey;
  bodyHtml: string;
  sort: number;
  published: boolean;
}

type HelpRecord = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  audience?: HelpAudience[];
  category?: string;
  bodyHtml?: string;
  sort?: number;
  published?: boolean;
};

function toArticle(record: HelpRecord): HelpArticle {
  const category = helpCategoryKeys.includes(record.category as HelpCategoryKey)
    ? (record.category as HelpCategoryKey)
    : "basics";

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    summary: record.summary ?? "",
    audience: record.audience?.length ? record.audience : ["customer"],
    category,
    bodyHtml: record.bodyHtml ?? "",
    sort: record.sort ?? 0,
    published: record.published ?? false,
    isCustom: true,
  };
}

// The API rule scopes the result by audience, so no audience filter is needed
// here. Drafts are excluded explicitly: the rule lets admins read them (they
// have to, to edit them), but nobody wants them on the help page itself.
export async function fetchCustomArticles(): Promise<HelpArticle[]> {
  const records = await pb.collection("helpArticles").getFullList({
    sort: "sort,title",
    filter: "published = true",
  });
  return (records as unknown as HelpRecord[]).map(toArticle);
}

/** Admin management view: every article, drafts included. */
export async function fetchAllCustomArticles(): Promise<HelpArticle[]> {
  const records = await pb.collection("helpArticles").getFullList({
    sort: "sort,title",
  });
  return (records as unknown as HelpRecord[]).map(toArticle);
}

export async function saveCustomArticle(
  input: CustomArticleInput,
): Promise<HelpArticle> {
  const data = {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    audience: input.audience,
    category: input.category,
    bodyHtml: input.bodyHtml,
    sort: input.sort,
    published: input.published,
  };

  const record = input.id
    ? await pb.collection("helpArticles").update(input.id, data)
    : await pb.collection("helpArticles").create(data);

  return toArticle(record as unknown as HelpRecord);
}

export async function deleteCustomArticle(id: string): Promise<void> {
  await pb.collection("helpArticles").delete(id);
}

/**
 * Shipped articles first, then the operator's own on top. A custom article
 * that reuses a shipped slug replaces it — that is the documented way to
 * rewrite a built-in text without losing the links that point at the slug.
 */
export function mergeArticles(
  shipped: HelpArticle[],
  custom: HelpArticle[],
): HelpArticle[] {
  if (custom.length === 0) return shipped;

  const overridden = new Set(custom.map((a) => a.slug));
  return [...shipped.filter((a) => !overridden.has(a.slug)), ...custom];
}

/** Slug suggestion for the admin form: lowercase, umlauts spelled out. */
// Wohnt jetzt in utils/slug.ts (auch von den Termin-Arten gebraucht); hier
// nur noch re-exportiert, damit bestehende Importe unverändert bleiben.
export { slugify } from "./slug";
