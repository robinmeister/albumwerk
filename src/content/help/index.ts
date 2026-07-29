// Public entry point for the shipped help content. Everything that renders help
// (HelpPage, HelpArticlePage, HelpHint, HelpBanner) reads from here.

import { adminArticles } from "./adminArticles";
import { customerArticles } from "./customerArticles";
import { helpCategories, helpCategoryKeys } from "./categories";
import { HelpArticle, HelpAudience, HelpCategoryKey } from "./types";

export * from "./types";
export { helpCategories, helpCategoryKeys, getCategory } from "./categories";

export const helpArticles: HelpArticle[] = [...adminArticles, ...customerArticles];

// Content is hand-maintained, so shout early about the two mistakes that are
// easy to make and silent at runtime: a duplicate slug (one article becomes
// unreachable) and a category typo (the article never shows up in any group).
if (import.meta.env.DEV) {
  const seen = new Set<string>();
  for (const article of helpArticles) {
    if (seen.has(article.slug)) {
      console.warn(`[help] doppelter Slug: "${article.slug}"`);
    }
    seen.add(article.slug);
    if (!helpCategoryKeys.includes(article.category)) {
      console.warn(
        `[help] unbekannte Kategorie "${article.category}" in Artikel "${article.slug}"`,
      );
    }
  }
}

export function getArticle(
  slug: string | undefined,
  articles: HelpArticle[] = helpArticles,
): HelpArticle | undefined {
  if (!slug) return undefined;
  return articles.find((a) => a.slug === slug);
}

// Which audience tags a viewer may read. Mirrors the API rule on the
// helpArticles collection exactly, so shipped and custom articles are filtered
// the same way: admins see everything, customers additionally see public
// articles, visitors only public ones.
const VISIBLE_TO: Record<HelpAudience, HelpAudience[]> = {
  admin: ["admin", "customer", "public"],
  customer: ["customer", "public"],
  public: ["public"],
};

export function articlesFor(
  audience: HelpAudience,
  articles: HelpArticle[] = helpArticles,
): HelpArticle[] {
  const visible = VISIBLE_TO[audience];
  return articles.filter((a) => a.audience.some((tag) => visible.includes(tag)));
}

/** Strips tags so the body text is searchable without matching markup. */
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

// Same lowercase-includes approach the album/user/order lists use — the corpus
// is a few dozen articles, so there is nothing to gain from a fuzzy matcher.
export function searchArticles(
  query: string,
  audience: HelpAudience,
  articles: HelpArticle[] = helpArticles,
): HelpArticle[] {
  const pool = articlesFor(audience, articles);
  const q = query.trim().toLowerCase();
  if (!q) return pool;

  return pool.filter((a) => {
    const haystack = [
      a.title,
      a.summary,
      ...(a.keywords ?? []),
      plainText(a.bodyHtml),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Articles grouped into the category order from categories.ts, empty groups dropped. */
export function groupByCategory(
  articles: HelpArticle[],
): { category: (typeof helpCategories)[number]; articles: HelpArticle[] }[] {
  return helpCategories
    .map((category) => ({
      category,
      articles: articles
        .filter((a) => a.category === category.key)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    }))
    .filter((group) => group.articles.length > 0);
}

export function relatedArticles(
  article: HelpArticle,
  audience: HelpAudience,
  articles: HelpArticle[] = helpArticles,
  limit = 4,
): HelpArticle[] {
  return articlesFor(audience, articles)
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .slice(0, limit);
}


/** Role of the current viewer, used to pick which articles they may see. */
export function audienceFor(isSignedIn: boolean, isAdmin: boolean): HelpAudience {
  if (isSignedIn && isAdmin) return "admin";
  if (isSignedIn) return "customer";
  return "public";
}
