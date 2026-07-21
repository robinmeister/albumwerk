/// <reference path="../pb_data/types.d.ts" />
// Custom domain support. The photographer enters the (sub)domain under which
// their album should be reachable in the setup wizard; it is stored here as a
// public field. The Caddy reverse proxy uses on-demand TLS gated by
// pb_hooks/domain.pb.js (GET /api/custom/domain/ask), which only approves a
// Let's Encrypt certificate when the requested host matches this value.
// Empty = no custom domain configured (default; the instance is reached via IP
// or the statically configured Caddyfile domain).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.add(new Field({
    name: "customDomain",
    id: "txt_set_domain",
    type: "text",
    required: false,
    hidden: false,
    presentable: false,
    system: false,
    max: 253,
    // hostname, lowercase, at least one dot; empty allowed
    pattern: "^(([a-z0-9]([a-z0-9-]*[a-z0-9])?)\\.)+[a-z]{2,}$",
  }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings");
  collection.fields.removeByName("customDomain");
  app.save(collection);
});
