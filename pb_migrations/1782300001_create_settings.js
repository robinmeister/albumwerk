/// <reference path="../pb_data/types.d.ts" />
// Runtime branding/configuration for the instance (white-label).
// Singleton record with a fixed id, seeded below. Public read (everything in
// here is client-visible anyway — a PayPal client id is public by design),
// update restricted to admins, create/delete restricted to superusers.
// SMTP credentials do NOT live here; they belong in PocketBase's own mail
// settings (dashboard > Settings > Mail).

const SETTINGS_ID = "appsettings0001";

migrate((app) => {
  const collection = new Collection({
    name: "settings",
    type: "base",
    system: false,
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: "@request.auth.isAdmin = true",
    deleteRule: null,
    indexes: [],
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}", hidden: false, id: "text_set_id",
        max: 15, min: 15, name: "id", pattern: "^[a-z0-9]+$", presentable: false,
        primaryKey: true, required: true, system: true, type: "text",
      },
      // --- Branding ---
      { name: "businessName", id: "txt_set_bizname", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: true, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "shortName", id: "txt_set_short", type: "text", max: 12, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "tagline", id: "txt_set_tagline", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "logo", id: "file_set_logo", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"], thumbs: ["192x192", "512x512"], protected: false, required: false, hidden: false, presentable: false, system: false },
      { name: "favicon", id: "file_set_favic", type: "file", maxSelect: 1, maxSize: 1048576, mimeTypes: ["image/png", "image/x-icon", "image/svg+xml", "image/vnd.microsoft.icon"], thumbs: null, protected: false, required: false, hidden: false, presentable: false, system: false },
      { name: "primaryColor", id: "txt_set_primary", type: "text", max: 9, min: 0, pattern: "^#([0-9a-fA-F]{3,8})?$", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "secondaryColor", id: "txt_set_second", type: "text", max: 9, min: 0, pattern: "^#([0-9a-fA-F]{3,8})?$", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "fontFamily", id: "sel_set_font", type: "select", maxSelect: 1, values: ["inter", "lora", "playfair", "montserrat"], required: false, hidden: false, presentable: false, system: false },
      { name: "borderRadius", id: "num_set_radius", type: "number", min: 0, max: 32, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      // --- Business ---
      { name: "contactEmail", id: "txt_set_contact", type: "email", exceptDomains: null, onlyDomains: null, required: false, hidden: false, presentable: false, system: false },
      { name: "orderNotificationEmail", id: "txt_set_ordmail", type: "email", exceptDomains: null, onlyDomains: null, required: false, hidden: false, presentable: false, system: false },
      { name: "websiteUrl", id: "txt_set_website", type: "url", exceptDomains: null, onlyDomains: null, required: false, hidden: false, presentable: false, system: false },
      { name: "paypalClientId", id: "txt_set_ppcid", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "paypalBusinessEmail", id: "txt_set_ppmail", type: "email", exceptDomains: null, onlyDomains: null, required: false, hidden: false, presentable: false, system: false },
      { name: "currency", id: "txt_set_curr", type: "text", max: 3, min: 0, pattern: "^[A-Z]*$", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      // --- Legal (rendered on /imprint and /privacy, sanitized client-side) ---
      { name: "imprintHtml", id: "edit_set_imprint", type: "editor", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      { name: "privacyHtml", id: "edit_set_privacy", type: "editor", maxSize: 0, required: false, hidden: false, presentable: false, system: false },
      // --- Watermark / previews (used by pb_hooks/previews.pb.js) ---
      { name: "watermarkText", id: "txt_set_wmtext", type: "text", max: 0, min: 0, pattern: "", required: false, hidden: false, presentable: false, primaryKey: false, system: false, autogeneratePattern: "" },
      { name: "watermarkLogo", id: "file_set_wmlogo", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/png", "image/jpeg", "image/webp"], thumbs: null, protected: false, required: false, hidden: false, presentable: false, system: false },
      { name: "watermarkOpacity", id: "num_set_wmopac", type: "number", min: 0, max: 100, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      { name: "previewMaxSize", id: "num_set_prevsz", type: "number", min: 200, max: 4000, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      // --- Meta ---
      { name: "setupCompleted", id: "bool_set_setup", type: "bool", required: false, hidden: false, presentable: false, system: false },
      { name: "created", id: "autodate_set_c", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { name: "updated", id: "autodate_set_u", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
  });
  app.save(collection);

  // seed the singleton with neutral defaults; the in-app setup wizard
  // (setupCompleted=false) walks the photographer through personalization
  const record = new Record(collection);
  record.set("id", SETTINGS_ID);
  record.set("businessName", "Fotogalerie");
  record.set("shortName", "Album");
  record.set("primaryColor", "#3d4a3d");
  record.set("secondaryColor", "#b08d57");
  record.set("fontFamily", "inter");
  record.set("borderRadius", 8);
  record.set("currency", "EUR");
  record.set("watermarkOpacity", 40);
  record.set("previewMaxSize", 1200);
  record.set("setupCompleted", false);
  app.save(record);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("settings");
    app.delete(collection);
  } catch (_) {
    // already gone
  }
});
