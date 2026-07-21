/// <reference path="../pb_data/types.d.ts" />
// maxSize 0 lässt PocketBase auf den Default von 5 MB (5242880 Bytes)
// zurückfallen — zu klein für Fotos aus modernen Kameras. Hebt die Foto-Felder
// auf 50 MB an; die settings-Dateifelder (Logo/Favicon/Wasserzeichen) behalten
// bewusst ihre kleineren Limits.
migrate((app) => {
  const LIMIT = 52428800; // 50 MB
  for (const [collectionName, fieldName] of [
    ["images", "file"],
    ["shootings", "coverImage"],
    ["loginImages", "file"],
  ]) {
    const collection = app.findCollectionByNameOrId(collectionName);
    collection.fields.getByName(fieldName).maxSize = LIMIT;
    app.save(collection);
  }
}, (app) => {
  for (const [collectionName, fieldName] of [
    ["images", "file"],
    ["shootings", "coverImage"],
    ["loginImages", "file"],
  ]) {
    const collection = app.findCollectionByNameOrId(collectionName);
    collection.fields.getByName(fieldName).maxSize = 0;
    app.save(collection);
  }
});
