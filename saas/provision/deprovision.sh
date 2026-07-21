#!/usr/bin/env bash
# Kunden-Instanz ENDGÜLTIG löschen (Container + App; Volume-Löschung steuert
# Coolify beim App-Delete). Vorher unbedingt Backup prüfen!
# Aufruf: deprovision.sh <app-uuid>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

UUID="${1:?App-UUID fehlt}"

echo "ACHTUNG: Die App $UUID wird endgültig gelöscht (inkl. Volumes/Daten)."
echo "Letztes Backup liegt ggf. im zentralen Backup-Ziel ($RCLONE_REMOTE)."
printf "Wirklich löschen? [j/N] "
read -r ANTWORT
if [ "$ANTWORT" != "j" ] && [ "$ANTWORT" != "J" ]; then
  echo "Abgebrochen."
  exit 1
fi

coolify_api POST "/applications/$UUID/stop" > /dev/null || true
coolify_api DELETE "/applications/$UUID" > /dev/null
echo "Instanz $UUID gelöscht."
