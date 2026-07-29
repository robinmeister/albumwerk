/// <reference path="../pb_data/types.d.ts" />
// Operator-authored help articles, shown alongside the documentation that ships
// with the build (src/content/help). Reusing a shipped slug replaces that
// article — that is the supported way to rewrite a built-in text without
// breaking the links that point at the slug.
//
// The read rule mirrors src/content/help/index.ts (VISIBLE_TO): visitors see
// "public", signed-in customers additionally "customer", admins everything.
// Admins also read drafts because they have to edit them — the help page keeps
// drafts out with an explicit `published = true` filter instead.

migrate((app) => {
  const articles = new Collection({
    name: "helpArticles",
    type: "base",
    system: false,
    listRule:
      "@request.auth.isAdmin = true || (published = true && (audience ~ \"public\" || (@request.auth.id != \"\" && audience ~ \"customer\")))",
    viewRule:
      "@request.auth.isAdmin = true || (published = true && (audience ~ \"public\" || (@request.auth.id != \"\" && audience ~ \"customer\")))",
    createRule: "@request.auth.isAdmin = true",
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: "@request.auth.isAdmin = true",
    indexes: [
      "CREATE UNIQUE INDEX idx_ha_slug ON helpArticles (slug)",
      "CREATE INDEX idx_ha_sort ON helpArticles (category, sort)",
    ],
    fields: [
      // part of the public URL (/help/<slug>) — kept in sync with the client's
      // slugify(), so lowercase ascii plus dashes
      { name: "slug", id: "txt_ha_slug", type: "text", max: 60, min: 1, pattern: "^[a-z0-9-]+$", required: true, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "title", id: "txt_ha_title", type: "text", max: 120, min: 1, pattern: "", required: true, hidden: false, presentable: true, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "summary", id: "txt_ha_summary", type: "text", max: 300, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // multi-select: an article may address several groups at once
      { name: "audience", id: "sel_ha_aud", type: "select", maxSelect: 3, values: ["admin", "customer", "public"], required: true, hidden: false, presentable: false, system: false },
      { name: "category", id: "sel_ha_cat", type: "select", maxSelect: 1, values: ["basics", "setup", "albums", "selling", "customers", "operations"], required: true, hidden: false, presentable: false, system: false },
      // same editor type as settings.imprintHtml; sanitized client-side before render
      { name: "bodyHtml", id: "edit_ha_body", type: "editor", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      { name: "sort", id: "num_ha_sort", type: "number", min: null, max: null, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      { name: "published", id: "bool_ha_pub", type: "bool", required: false, hidden: false, presentable: false, system: false },
      { name: "created", id: "autodate_ha_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_ha_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(articles);
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("helpArticles"));
  } catch (_) {
    // already gone
  }
});
