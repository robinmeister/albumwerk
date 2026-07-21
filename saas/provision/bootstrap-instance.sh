#!/usr/bin/env bash
# Richtet eine frisch provisionierte Kunden-Instanz ein:
#   1. SMTP-Relay + Application-URL in den PocketBase-Settings
#   2. Fotografen-Account (isAdmin) anlegen
#   3. Passwort-Setzen-Mail (= Willkommensmail) auslösen
#
# Aufruf: bootstrap-instance.sh <instanz-url> <ops-email> <ops-passwort> <kunden-email> [kunden-name]
# Läuft auch standalone gegen eine lokale Instanz (Tests).
set -euo pipefail

SAAS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SAAS_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$SAAS_DIR/.env"
  set +a
fi

URL="${1:?Instanz-URL fehlt}"
OPS_EMAIL="${2:?Ops-Superuser-E-Mail fehlt}"
OPS_PASS="${3:?Ops-Superuser-Passwort fehlt}"
CUSTOMER_EMAIL="${4:?Kunden-E-Mail fehlt}"
CUSTOMER_NAME="${5:-}"

URL="${URL%/}"

# --- Superuser-Token holen ---------------------------------------------------
TOKEN=$(curl -sSf --max-time 30 -X POST "$URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$OPS_EMAIL\",\"password\":\"$OPS_PASS\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# --- 1) Settings: Application-URL + SMTP-Relay -------------------------------
SETTINGS=$(python3 - "$URL" <<'EOF'
import json, os, sys
url = sys.argv[1]
smtp_host = os.environ.get("SAAS_SMTP_HOST", "")
payload = {"meta": {"appURL": url}}
if smtp_host:
    payload["meta"]["senderAddress"] = os.environ.get("SAAS_SMTP_SENDER", "")
    payload["meta"]["senderName"] = os.environ.get("SAAS_SMTP_SENDER_NAME", "Albumwerk")
    payload["smtp"] = {
        "enabled": True,
        "host": smtp_host,
        "port": int(os.environ.get("SAAS_SMTP_PORT", "587")),
        "username": os.environ.get("SAAS_SMTP_USER", ""),
        "password": os.environ.get("SAAS_SMTP_PASS", ""),
    }
print(json.dumps(payload))
EOF
)
curl -sSf --max-time 30 -X PATCH "$URL/api/settings" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d "$SETTINGS" > /dev/null
echo "  Settings gesetzt (appURL$( [ -n "${SAAS_SMTP_HOST:-}" ] && echo ", SMTP" ))"

# --- 2) Fotografen-Account mit Admin-Rechten ---------------------------------
# users_guard erlaubt isAdmin nur mit Superuser-Token — genau dieser Pfad.
CUSTOMER_PASS=$(python3 -c "import secrets;print(secrets.token_urlsafe(18))")
FIRST="${CUSTOMER_NAME%% *}"
LAST="${CUSTOMER_NAME#* }"
[ "$LAST" = "$CUSTOMER_NAME" ] && LAST=""
CREATE=$(curl -sS --max-time 30 -X POST "$URL/api/collections/users/records" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d "{\"email\":\"$CUSTOMER_EMAIL\",\"password\":\"$CUSTOMER_PASS\",\"passwordConfirm\":\"$CUSTOMER_PASS\",\"firstName\":\"${FIRST:-}\",\"lastName\":\"${LAST:-}\",\"isAdmin\":true,\"verified\":true}" \
  -w $'\n%{http_code}')
HTTP="${CREATE##*$'\n'}"
if [ "${HTTP:0:1}" != "2" ]; then
  echo "  Fotografen-Account konnte nicht angelegt werden (HTTP $HTTP):" >&2
  echo "${CREATE%$'\n'*}" >&2
  exit 1
fi
echo "  Fotografen-Account angelegt: $CUSTOMER_EMAIL (isAdmin)"

# --- 3) Willkommens-/Passwort-Mail -------------------------------------------
curl -sSf --max-time 30 -X POST "$URL/api/collections/users/request-password-reset" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$CUSTOMER_EMAIL\"}" > /dev/null
echo "  Passwort-Setzen-Mail an $CUSTOMER_EMAIL ausgelöst"
