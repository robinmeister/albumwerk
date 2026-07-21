// Shared preview/watermark generation, require()d from the isolated JSVM
// handlers in previews.pb.js. Uses ImageMagick (`magick`, installed in the
// Docker image) via $os.cmd. Works with PocketBase's local file storage.
//
// generatePreview(app, originalRecord) -> true when a preview was created.
module.exports = function generatePreview(app, original) {
  if (original.getString("type") !== "original") return false;

  const shootingId = original.getString("shootingId");
  // originals live in the protected `originalFile` field (see migration
  // 1784600007); `file` is kept as a fallback for not-yet-migrated records
  const storedFile =
    original.getString("originalFile") || original.getString("file");
  const name = original.getString("name") || storedFile;

  // skip when this original already has a preview
  const existing = app.findRecordsByFilter(
    "images",
    'shootingId={:sid} && type="preview" && name={:name}',
    "",
    1,
    0,
    { sid: shootingId, name: name },
  );
  if (existing.length > 0) return false;

  let settings = null;
  try {
    settings = app.findRecordById("settings", "appsettings0001");
  } catch (_) {
    // not seeded yet — neutral defaults below
  }
  const maxSize = (settings && settings.getInt("previewMaxSize")) || 1200;
  const opacityRaw = (settings && settings.getInt("watermarkOpacity")) || 40;
  const opacity = Math.min(Math.max(opacityRaw, 5), 100) / 100.0;
  const text =
    (settings &&
      (settings.getString("watermarkText") || settings.getString("businessName"))) ||
    "VORSCHAU";
  const wmLogo = settings ? settings.getString("watermarkLogo") : "";

  const srcPath = [
    app.dataDir(), "storage", original.collection().id, original.id,
    storedFile,
  ].join("/");
  const tmpResized = $os.tempDir() + "/pb_preview_" + original.id + ".jpg";
  const tmpOut = $os.tempDir() + "/pb_preview_wm_" + original.id + ".jpg";

  try {
    // 1) downscale (never upscale) and normalize orientation
    $os.cmd(
      "magick", srcPath, "-auto-orient",
      "-resize", maxSize + "x" + maxSize + ">",
      "-quality", "82", tmpResized,
    ).output();

    // 2) actual preview width for scaling the watermark
    const dims = toString(
      $os.cmd("magick", "identify", "-format", "%w %h", tmpResized).output(),
    ).trim().split(" ");
    const width = parseInt(dims[0], 10) || maxSize;

    // 3) apply watermark: uploaded logo wins over text
    if (wmLogo && settings) {
      const logoPath = [
        app.dataDir(), "storage", settings.collection().id, settings.id, wmLogo,
      ].join("/");
      $os.cmd(
        "magick", tmpResized,
        "(", logoPath, "-resize", Math.round(width * 0.5) + "x",
        "-alpha", "set", "-channel", "A",
        "-evaluate", "multiply", String(opacity), "+channel", ")",
        "-gravity", "center", "-composite", tmpOut,
      ).output();
    } else {
      const pointsize = Math.max(
        24,
        Math.round(width / Math.max(6, text.length)),
      );
      $os.cmd(
        "magick", tmpResized,
        // alpine's ImageMagick has no default font — DejaVu ships in the image
        "-font", "DejaVu-Sans",
        "-gravity", "center",
        "-fill", "rgba(255,255,255," + opacity + ")",
        "-stroke", "rgba(0,0,0," + opacity * 0.35 + ")", "-strokewidth", "1",
        "-pointsize", String(pointsize),
        "-annotate", "0", text,
        tmpOut,
      ).output();
    }

    const collection = app.findCollectionByNameOrId("images");
    const preview = new Record(collection);
    preview.set("shootingId", shootingId);
    preview.set("type", "preview");
    preview.set("name", name);
    preview.set("file", $filesystem.fileFromPath(tmpOut));
    app.save(preview);
    return true;
  } finally {
    try { $os.remove(tmpResized); } catch (_) { /* best effort */ }
    try { $os.remove(tmpOut); } catch (_) { /* best effort */ }
  }
};
