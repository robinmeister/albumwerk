#!/usr/bin/env python3
"""Gleicht die Uptime-Kuma-Monitore mit den laufenden Coolify-Apps ab.

Quelle der Wahrheit ist Coolify: jede App namens ``kunde-<subdomain>`` sowie
die Control-Plane bekommen einen Monitor auf ``<fqdn>/api/health``.  Apps, die
gestoppt sind (Suspend, Trial abgelaufen) oder gar nicht mehr existieren,
verlieren ihren Monitor wieder -- sonst alarmiert Kuma für Instanzen, die
absichtlich aus sind.

Deckt beide Provisionierungswege ab (provision.sh und Self-Service über die
Control-Plane) und ist beliebig oft wiederholbar.  Läuft per Cron neben
backup-sync.sh.
"""
import json
import os
import re
import sys
import urllib.request

from uptime_kuma_api import UptimeKumaApi, MonitorType

STATUS_SLUG = "albumwerk"


def load_env(path=None):
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    env = {}
    for line in open(path).read().splitlines():
        m = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line)
        if not m:
            continue
        key, val = m.groups()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        env[key] = val
    return env


def coolify_apps(env):
    req = urllib.request.Request(env["COOLIFY_URL"].rstrip("/") + "/api/v1/applications")
    req.add_header("Authorization", "Bearer " + env["COOLIFY_TOKEN"])
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def main():
    env = load_env()
    if not env.get("KUMA_URL") or not env.get("KUMA_PASS"):
        print("KUMA_URL/KUMA_PASS nicht gesetzt — nichts zu tun.", file=sys.stderr)
        return 0

    want = {}
    for app in coolify_apps(env):
        name, fqdn = app.get("name") or "", app.get("fqdn") or ""
        if not fqdn or not (name.startswith("kunde-") or name == "control-plane"):
            continue
        if not str(app.get("status") or "").startswith("running"):
            continue
        want[name] = fqdn.split(",")[0].rstrip("/") + "/api/health"

    api = UptimeKumaApi(env["KUMA_URL"])
    api.login(env["KUMA_USER"], env["KUMA_PASS"])
    try:
        have = {m["name"]: m for m in api.get_monitors()}

        for name, url in want.items():
            if name in have:
                if have[name]["url"] != url:
                    api.edit_monitor(have[name]["id"], url=url)
                    print(f"aktualisiert: {name} -> {url}")
                continue
            api.add_monitor(type=MonitorType.HTTP, name=name, url=url,
                            interval=300, maxretries=2)
            print(f"angelegt: {name} -> {url}")

        for name, mon in have.items():
            if name not in want and (name.startswith("kunde-") or name == "control-plane"):
                api.delete_monitor(mon["id"])
                print(f"entfernt: {name}")

        # Öffentliche Statusseite mit allen aktuellen Monitoren
        ids = [m["id"] for m in api.get_monitors()]
        if STATUS_SLUG not in [p["slug"] for p in api.get_status_pages()]:
            api.add_status_page(STATUS_SLUG, "Albumwerk Status")
        api.save_status_page(
            STATUS_SLUG, title="Albumwerk Status", published=True,
            showTags=False, theme="light",
            publicGroupList=[{"name": "Albumwerk", "weight": 1,
                              "monitorList": [{"id": i} for i in ids]}])
        print(f"Statusseite: {env['KUMA_URL'].rstrip('/')}/status/{STATUS_SLUG} "
              f"({len(ids)} Monitore)")
    finally:
        api.disconnect()
    return 0


if __name__ == "__main__":
    sys.exit(main())
