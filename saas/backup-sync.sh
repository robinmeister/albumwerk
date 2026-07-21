#!/usr/bin/env bash
# Zentrale Backups: kopiert die nächtlichen PocketBase-Backups ALLER
# Kunden-Instanzen vom SaaS-VPS auf ein externes Ziel (rclone-Remote, z. B.
# Hetzner Storage Box). Jede Instanz sichert selbst nach pb_data/backups/
# (in der App eingebaut, 03:00 Uhr) — dieses Skript bringt die Dateien weg
# von der Maschine.
#
# Einrichtung auf dem VPS (als root, da Docker-Volumes root gehören):
#   1. rclone installieren + `rclone config` (Remote wie in saas/.env)
#   2. Cron:  30 4 * * *  /pfad/zu/saas/backup-sync.sh >> /var/log/fg-backup.log 2>&1
set -euo pipefail

SAAS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SAAS_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$SAAS_DIR/.env"
  set +a
fi

: "${RCLONE_REMOTE:?RCLONE_REMOTE fehlt (saas/.env)}"
VOLUME_ROOT="${VOLUME_ROOT:-/var/lib/docker/volumes}"
KEEP_DAYS="${KEEP_DAYS:-14}"

fail() {
  echo "FEHLER: $*" >&2
  if [ -n "${BACKUP_ALERT_EMAIL:-}" ] && command -v mail >/dev/null 2>&1; then
    echo "$*" | mail -s "Albumwerk: Backup-Sync fehlgeschlagen" "$BACKUP_ALERT_EMAIL"
  fi
  exit 1
}

command -v rclone >/dev/null 2>&1 || fail "rclone ist nicht installiert"

echo "== Backup-Sync $(date -Is) =="
found=0
errors=0
# Kunden-Volumes heißen pbdata-<subdomain> (siehe provision.sh)
for dir in "$VOLUME_ROOT"/*pbdata-*/_data/backups; do
  [ -d "$dir" ] || continue
  found=$((found + 1))
  # Kundenname aus dem Volume-Pfad ziehen (…/<volume>/_data/backups)
  vol="$(basename "$(dirname "$(dirname "$dir")")")"
  kunde="${vol#*pbdata-}"
  echo "-- $kunde ($dir)"
  if ! rclone copy --max-age "${KEEP_DAYS}d" --include "*.zip" \
       "$dir" "$RCLONE_REMOTE/$kunde/"; then
    echo "   Sync fehlgeschlagen: $kunde" >&2
    errors=$((errors + 1))
    continue
  fi
  # Remote-Aufbewahrung: alte Backups löschen
  rclone delete --min-age "${KEEP_DAYS}d" "$RCLONE_REMOTE/$kunde/" || true
done

echo "== Fertig: $found Instanz(en), $errors Fehler =="
if [ "$errors" -gt 0 ]; then
  fail "$errors von $found Instanz-Backups konnten nicht synchronisiert werden"
fi
if [ "$found" -eq 0 ]; then
  echo "Hinweis: keine Kunden-Volumes unter $VOLUME_ROOT gefunden."
fi
