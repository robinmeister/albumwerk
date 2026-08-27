/// <reference path="../pb_data/types.d.ts" />
// Serves the PWA manifest generated from the instance settings, so name,
// colors and icons follow the branding without rebuilding the SPA.
// index.html references it via <link rel="manifest" href="/api/custom/manifest.webmanifest">.
routerAdd("GET", "/api/custom/manifest.webmanifest", (e) => {
  let name = "Fotogalerie";
  let shortName = "Album";
  let description = "";
  let themeColor = "#3d4a3d";
  let icons = [
    { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];

  try {
    const settings = e.app.findRecordById("settings", "appsettings0001");
    name = settings.getString("businessName") || name;
    shortName = settings.getString("shortName") || name;
    description = settings.getString("tagline") || name;
    // secondaryColor is the register's ink, not its mark color — theme_color
    // (Android status bar / splash background) wants the neutral ink, not a
    // saturated accent (docs/design-presets.md, "Was pb_hooks mit
    // primaryColor macht").
    themeColor = settings.getString("secondaryColor") || themeColor;

    const logo = settings.getString("logo");
    if (logo) {
      // svg logos cannot be thumbed by PB — serve the original for both sizes
      const base = "/api/files/settings/appsettings0001/" + logo;
      const isSvg = logo.toLowerCase().endsWith(".svg");
      icons = isSvg
        ? [{ src: base, sizes: "any", type: "image/svg+xml", purpose: "any" }]
        : [
            { src: base + "?thumb=192x192", sizes: "192x192", type: "image/png" },
            { src: base + "?thumb=512x512", sizes: "512x512", type: "image/png" },
            { src: base + "?thumb=512x512", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ];
    }
  } catch (_) {
    // settings not seeded yet — fall back to the static defaults above
  }

  return e.json(200, {
    name: name,
    short_name: shortName,
    description: description,
    theme_color: themeColor,
    background_color: "#ffffff",
    display: "standalone",
    scope: "/",
    start_url: "/",
    icons: icons,
  });
});
