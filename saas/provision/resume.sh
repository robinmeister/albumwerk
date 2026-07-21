#!/usr/bin/env bash
# Pausierte Kunden-Instanz wieder starten.
# Aufruf: resume.sh <app-uuid>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

UUID="${1:?App-UUID fehlt}"
coolify_api POST "/applications/$UUID/start" > /dev/null
echo "Instanz $UUID gestartet."
