/// <reference path="../pb_data/types.d.ts" />
// Keeps images.isPublic in sync with the owning shooting's type. The flag
// lets the API rules release originals of public shootings to anonymous
// visitors (see 1782300010_images_ispublic.js).

// new image (upload or generated preview): inherit the shooting's visibility
onRecordCreate((e) => {
  try {
    const shooting = e.app.findRecordById("shootings", e.record.getString("shootingId"));
    e.record.set("isPublic", shooting.getString("type") === "public");
  } catch (_) {
    e.record.set("isPublic", false);
  }
  e.next();
}, "images");

// shooting type changed: re-flag all of its images
onRecordAfterUpdateSuccess((e) => {
  const isPublic = e.record.getString("type") === "public";
  const images = e.app.findRecordsByFilter(
    "images",
    "shootingId={:sid}",
    "",
    0,
    0,
    { sid: e.record.id }
  );
  for (const image of images) {
    if (image.getBool("isPublic") !== isPublic) {
      image.set("isPublic", isPublic);
      e.app.save(image);
    }
  }
  e.next();
}, "shootings");
