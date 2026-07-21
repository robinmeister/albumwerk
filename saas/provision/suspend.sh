#!/usr/bin/env bash
# Kunden-Instanz pausieren (Container stoppen; Volume und Daten bleiben).
# Aufruf: suspend.sh <app-uuid>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

UUID="${1:?App-UUID fehlt}"
coolify_api POST "/applications/$UUID/stop" > /dev/null
echo "Instanz $UUID gestoppt."
