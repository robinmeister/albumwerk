/// <reference path="../pb_data/types.d.ts" />
// Enable PocketBase's native automatic backups out of the box: nightly at
// 03:00, keeping the last 7. Backups are created transaction-safe inside the
// running process and land in pb_data/backups/ (rotated automatically) —
// unlike an external `tar` of the live SQLite database.
//
// Guarded: if the photographer already configured a backup cron in the admin
// UI (Settings > Backups), a later update must not overwrite it.
migrate((app) => {
  const settings = app.settings();
  if (!settings.backups.cron) {
    settings.backups.cron = "0 3 * * *";
    settings.backups.cronMaxKeep = 7;
    app.save(settings);
  }
}, (app) => {
  return null;
});
