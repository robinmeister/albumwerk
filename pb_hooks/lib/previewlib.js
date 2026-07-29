// Shared preview/watermark generation, require()d from the isolated JSVM
// handlers in previews.pb.js. Uses ImageMagick (`magick`, installed in the
// Docker image) via $os.cmd. Works with PocketBase's local file storage.
//
// The whole preview is produced by a single `magick` invocation. Measured on a
// 4-core box, 8 images at 4 parallel, 24 MP source:
//   3 invocations + full decode (old)   ~8.9 s
//   1 invocation                        ~8.1 s
//   + jpeg:size decode hint             ~4.1 s
//   + MAGICK_THREAD_LIMIT=1 (Dockerfile) ~3.5 s
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
  const tmpOut = $os.tempDir() + "/pb_preview_wm_" + original.id + ".jpg";

  // 1) source dimensions from the header only (-ping decodes no pixels, ~0 ms).
  //    Needed twice: to size the watermark, and to decide whether the decode
  //    hint below is safe.
  let srcW = 0;
  let srcH = 0;
  try {
    const info = toString(
      $os.cmd("magick", "identify", "-ping", "-format", "%w %h %[orientation]", srcPath).output(),
    ).trim().split(" ");
    srcW = parseInt(info[0], 10) || 0;
    srcH = parseInt(info[1], 10) || 0;
    // EXIF orientations 5–8 rotate by 90°, so -auto-orient swaps the axes
    const ori = info[2] || "";
    if (ori === "LeftTop" || ori === "RightTop" || ori === "RightBottom" || ori === "LeftBottom") {
      const swap = srcW; srcW = srcH; srcH = swap;
    }
  } catch (_) {
    // fall back to assuming the preview ends up at maxSize
  }

  const longEdge = Math.max(srcW, srcH);
  // width of the finished preview — drives pointsize / logo width
  const width = longEdge > maxSize
    ? Math.round(srcW * (maxSize / longEdge))
    : (srcW || maxSize);

  const args = ["magick"];
  // libjpeg can downscale straight out of the DCT (1/2, 1/4, 1/8), which halves
  // the preview time on large originals. Only safe when the source is at least
  // twice maxSize: for smaller JPEGs libjpeg scales *up* to 2/1 instead — an
  // 800x600 original came out of the decoder as 1600x1200 and then produced a
  // 1200x900 upscaled "preview".
  if (longEdge >= maxSize * 2) {
    args.push("-define", "jpeg:size=" + (maxSize * 2) + "x" + (maxSize * 2));
  }
  // -resize (not -thumbnail): -thumbnail implies -strip and would drop the ICC
  // profile, shifting colours on AdobeRGB originals. Costs ~10 %.
  args.push(srcPath, "-auto-orient", "-resize", maxSize + "x" + maxSize + ">");

  // watermark: uploaded logo wins over text
  if (wmLogo && settings) {
    const logoPath = [
      app.dataDir(), "storage", settings.collection().id, settings.id, wmLogo,
    ].join("/");
    args.push(
      "(", logoPath, "-resize", Math.round(width * 0.5) + "x",
      "-alpha", "set", "-channel", "A",
      "-evaluate", "multiply", String(opacity), "+channel", ")",
      "-gravity", "center", "-composite",
    );
  } else {
    const pointsize = Math.max(
      24,
      Math.round(width / Math.max(6, text.length)),
    );
    args.push(
      // alpine's ImageMagick has no default font — DejaVu ships in the image
      "-font", "DejaVu-Sans",
      "-gravity", "center",
      "-fill", "rgba(255,255,255," + opacity + ")",
      "-stroke", "rgba(0,0,0," + opacity * 0.35 + ")", "-strokewidth", "1",
      "-pointsize", String(pointsize),
      "-annotate", "0", text,
    );
  }
  args.push("-quality", "82", tmpOut);

  try {
    $os.cmd.apply(null, args).output();

    const collection = app.findCollectionByNameOrId("images");
    const preview = new Record(collection);
    preview.set("shootingId", shootingId);
    preview.set("type", "preview");
    preview.set("name", name);
    preview.set("file", $filesystem.fileFromPath(tmpOut));
    app.save(preview);
    return true;
  } finally {
    try { $os.remove(tmpOut); } catch (_) { /* best effort */ }
  }
};
