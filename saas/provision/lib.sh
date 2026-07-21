#!/usr/bin/env bash
# Gemeinsame Helfer für die Provisioning-Skripte (Coolify-API).
# Wird per `source` eingebunden, nicht direkt ausgeführt.
set -euo pipefail

# .env aus dem saas/-Verzeichnis laden (relativ zu diesem Skript)
SAAS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SAAS_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$SAAS_DIR/.env"
  set +a
fi

: "${COOLIFY_URL:?COOLIFY_URL fehlt — saas/.env aus .env.example erstellen}"
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN fehlt}"
: "${SAAS_DOMAIN:?SAAS_DOMAIN fehlt}"

DRY_RUN="${DRY_RUN:-0}"

# coolify_api METHOD PATH [JSON_BODY]  → Antwort-Body auf stdout, Fehler → exit 1
coolify_api() {
  local method="$1" path="$2" body="${3:-}"
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY-RUN: $method $COOLIFY_URL/api/v1$path ${body:+body=$body}" >&2
    # Plausible Antworten für den Trockenlauf
    case "$method $path" in
      "POST /applications/dockerimage") echo '{"uuid":"dry-run-uuid"}';;
      *) echo '{}';;
    esac
    return 0
  fi
  local args=(-sS --max-time 60 -X "$method"
    -H "Authorization: Bearer $COOLIFY_TOKEN"
    -H "Content-Type: application/json"
    -H "Accept: application/json")
  [ -n "$body" ] && args+=(-d "$body")
  local out http
  out=$(curl "${args[@]}" -w $'\n%{http_code}' "$COOLIFY_URL/api/v1$path")
  http="${out##*$'\n'}"
  out="${out%$'\n'*}"
  if [ "${http:0:1}" != "2" ]; then
    echo "Coolify-API-Fehler ($method $path): HTTP $http" >&2
    echo "$out" >&2
    return 1
  fi
  echo "$out"
}

# json_get JSON KEY → Wert (leer wenn nicht vorhanden)
json_get() {
  python3 -c "import sys,json;d=json.loads(sys.argv[1]);print(d.get(sys.argv[2],''))" "$1" "$2"
}

# Subdomain prüfen: klein, 3-31 Zeichen, beginnt alphanumerisch, keine reservierten Namen
validate_subdomain() {
  local sub="$1"
  local blocklist=" www api admin status mail smtp app coolify kuma control signup demo test "
  if ! [[ "$sub" =~ ^[a-z0-9][a-z0-9-]{2,30}$ ]]; then
    echo "Ungültige Subdomain '$sub' (erlaubt: a-z, 0-9, '-', 3-31 Zeichen, Start alphanumerisch)" >&2
    return 1
  fi
  if [[ "$blocklist" == *" $sub "* ]]; then
    echo "Subdomain '$sub' ist reserviert" >&2
    return 1
  fi
}

# Zufallspasswort (urlsicher, 24 Zeichen)
random_password() {
  python3 -c "import secrets;print(secrets.token_urlsafe(18))"
}
