#!/usr/bin/env bash
# Alle Apps des Coolify-Projekts tabellarisch anzeigen.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

coolify_api GET /applications | python3 -c "
import sys, json
apps = json.load(sys.stdin)
print(f'{\"UUID\":38} {\"NAME\":24} {\"STATUS\":12} FQDN')
for a in apps:
    print(f'{a.get(\"uuid\",\"\"):38} {str(a.get(\"name\",\"\")):24} {str(a.get(\"status\",\"\")):12} {a.get(\"fqdn\",\"\") or \"\"}')"
