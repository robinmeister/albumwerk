#!/usr/bin/env bash
# Legt eine komplette Kunden-Instanz an: Coolify-App (gepinntes Image) +
# persistentes Volume + Subdomain (SSL macht Traefik/Let's Encrypt) +
# Instanz-Bootstrap (SMTP, Fotografen-Account, Willkommensmail) + optional
# Uptime-Kuma-Monitor (über kuma-sync.py).
#
# Aufruf:  provision.sh <subdomain> <kunden-email> [kunden-name]
# Flags:   DRY_RUN=1 provision.sh …   (druckt API-Calls statt sie zu senden)
# Ausgabe: eine JSON-Zeile {"uuid":…,"url":…} auf stdout (für die Control-Plane).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

SUB="${1:?Subdomain fehlt — Aufruf: provision.sh <subdomain> <kunden-email> [name]}"
CUSTOMER_EMAIL="${2:?Kunden-E-Mail fehlt}"
CUSTOMER_NAME="${3:-}"

validate_subdomain "$SUB"
FQDN="$SUB.$SAAS_DOMAIN"
URL="https://$FQDN"
OPS_EMAIL="ops+$SUB@$SAAS_DOMAIN"
OPS_PASS=$(random_password)

echo "== Provisioniere $URL ==" >&2

# --- 1) App anlegen (noch nicht deployen: Volume/Envs müssen zuerst dran) ----
CREATE_BODY=$(python3 - "$SUB" "$URL" <<'EOF'
import json, os, sys
sub, url = sys.argv[1], sys.argv[2]
print(json.dumps({
    "project_uuid": os.environ["COOLIFY_PROJECT_UUID"],
    "server_uuid": os.environ["COOLIFY_SERVER_UUID"],
    "environment_name": os.environ.get("COOLIFY_ENVIRONMENT_NAME", "production"),
    "docker_registry_image_name": os.environ["APP_IMAGE"],
    "docker_registry_image_tag": os.environ.get("APP_TAG", "latest"),
    "name": f"kunde-{sub}",
    "description": f"Albumwerk-Instanz {url}",
    "domains": url,
    "ports_exposes": "8090",
    "health_check_enabled": True,
    "health_check_path": "/api/health",
    "instant_deploy": False,
}))
EOF
)
RES=$(coolify_api POST /applications/dockerimage "$CREATE_BODY")
UUID=$(json_get "$RES" uuid)
if [ -z "$UUID" ]; then
  echo "Keine App-UUID in der Coolify-Antwort: $RES" >&2
  exit 1
fi
echo "  App angelegt: $UUID" >&2

# --- 2) Persistentes Volume für pb_data ---------------------------------------
coolify_api POST "/applications/$UUID/storages" \
  "{\"type\":\"persistent\",\"name\":\"pbdata-$SUB\",\"mount_path\":\"/pb/pb_data\"}" > /dev/null
echo "  Volume pbdata-$SUB → /pb/pb_data" >&2

# --- 3) Ops-Superuser als Env (Instanz legt ihn beim Start an) -----------------
coolify_api POST "/applications/$UUID/envs" \
  "{\"key\":\"PB_SUPERUSER_EMAIL\",\"value\":\"$OPS_EMAIL\"}" > /dev/null
coolify_api POST "/applications/$UUID/envs" \
  "{\"key\":\"PB_SUPERUSER_PASSWORD\",\"value\":\"$OPS_PASS\",\"is_shown_once\":true}" > /dev/null
echo "  Ops-Zugang gesetzt ($OPS_EMAIL)" >&2

# --- 3b) Support-Weiterleitung an den Hersteller ------------------------------
# Technische Tickets der Instanz gehen an die Control-Plane; die E-Mail dient
# als Fallback, wenn die Control-Plane gerade nicht erreichbar ist.
SUPPORT_CONTROL_URL="${CONTROL_URL:-https://control.$SAAS_DOMAIN}"
coolify_api POST "/applications/$UUID/envs" \
  "{\"key\":\"SAAS_CONTROL_URL\",\"value\":\"$SUPPORT_CONTROL_URL\"}" > /dev/null
if [ -n "${SUPPORT_NOTIFY_EMAIL:-}" ]; then
  coolify_api POST "/applications/$UUID/envs" \
    "{\"key\":\"VENDOR_SUPPORT_EMAIL\",\"value\":\"$SUPPORT_NOTIFY_EMAIL\"}" > /dev/null
fi
echo "  Support-Weiterleitung: $SUPPORT_CONTROL_URL / ${SUPPORT_NOTIFY_EMAIL:-(keine E-Mail)}" >&2

# --- 4) Deploy + auf Gesundheit warten ----------------------------------------
coolify_api POST "/applications/$UUID/start" > /dev/null
echo "  Deployment gestartet, warte auf $URL/api/health …" >&2
if [ "$DRY_RUN" != "1" ]; then
  ok=0
  for _ in $(seq 1 60); do
    sleep 5
    if curl -sf --max-time 10 "$URL/api/health" -o /dev/null; then ok=1; break; fi
  done
  if [ "$ok" != "1" ]; then
    echo "  Instanz wurde nicht gesund (Timeout nach 5 min) — bitte in Coolify prüfen. UUID: $UUID" >&2
    exit 1
  fi
  echo "  Instanz ist erreichbar." >&2

  # --- 5) Instanz-Bootstrap (SMTP, Admin-Account, Willkommensmail) -----------
  "$SCRIPT_DIR/bootstrap-instance.sh" "$URL" "$OPS_EMAIL" "$OPS_PASS" "$CUSTOMER_EMAIL" "$CUSTOMER_NAME" >&2
fi

# --- 6) Uptime-Kuma-Monitor ----------------------------------------------------
# kuma-sync.py gleicht die Monitore mit allen laufenden Coolify-Apps ab und
# deckt damit auch den Self-Service-Weg über die Control-Plane ab.
if [ -n "${KUMA_URL:-}" ] && [ "$DRY_RUN" != "1" ]; then
  python3 "$SCRIPT_DIR/../kuma-sync.py" >&2 \
    || echo "  Warnung: Kuma-Monitor konnte nicht angelegt werden (Provisionierung ist trotzdem ok)." >&2
fi

echo "== Fertig: $URL ==" >&2
# Maschinen-lesbares Ergebnis (einzige stdout-Zeile)
echo "{\"uuid\":\"$UUID\",\"url\":\"$URL\",\"subdomain\":\"$SUB\"}"
