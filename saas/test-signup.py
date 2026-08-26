#!/usr/bin/env python3
"""End-to-End-Prüfung des Self-Service-Signups gegen die laufende Control-Plane.

Läuft auf dem VPS (braucht saas/.env für die Superuser-Zugangsdaten) und geht
den Weg, den ein echter Kunde nimmt: Formular abschicken, Bestätigungslink
klicken, warten bis die Instanz steht, mit dem übergebenen Token einloggen.

    ./test-signup.py <subdomain> <email>
    ./test-signup.py --cleanup <subdomain>     # Instanz + Datensatz entfernen

Der Bestätigungslink wird nicht aus dem Postfach geholt, sondern als Superuser
aus dem Datensatz gelesen — geprüft wird die Kette, nicht der Mailversand.
Dass die Mail rausging, steht im Fall eines Fehlers in /api/logs.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT_S = 900          # Provisionierung dauert regulär 3-5 Minuten
POLL_S = 10


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


E = load_env()
BASE = E.get("CONTROL_URL") or "https://control." + E["SAAS_DOMAIN"]


def call(path, body=None, token=None, method=None, follow=True):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data,
                                 method=method or ("POST" if data else "GET"))
    req.add_header("Accept", "application/json")
    if data:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", token)

    opener = urllib.request.build_opener()
    if not follow:
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **k):
                return None
        opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=30) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip().startswith(("{", "[")) else raw), dict(r.headers)
    except urllib.error.HTTPError as err:
        raw = err.read().decode()
        try:
            parsed = json.loads(raw)
        except ValueError:
            parsed = raw[:300]
        return err.code, parsed, dict(err.headers)


def superuser():
    st, res, _ = call("/api/collections/_superusers/auth-with-password",
                      {"identity": E["CONTROL_SUPERUSER_EMAIL"],
                       "password": E["CONTROL_SUPERUSER_PASSWORD"]})
    assert st == 200, f"Superuser-Login fehlgeschlagen: {st} {res}"
    return res["token"]


def find(sub, token):
    st, res, _ = call("/api/collections/customers/records?filter=" +
                      urllib.parse.quote(f"(subdomain='{sub}')"), token=token)
    assert st == 200, f"Datensatz-Abfrage fehlgeschlagen: {st} {res}"
    return res["items"][0] if res["items"] else None


def cleanup(sub):
    tok = superuser()
    rec = find(sub, tok)
    if not rec:
        print(f"kein Datensatz für '{sub}'")
        return 0
    if rec.get("coolifyAppUuid"):
        script = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "provision", "deprovision.sh")
        print(f"Instanz {rec['coolifyAppUuid']} löschen …")
        os.system(f"echo j | bash {script} {rec['coolifyAppUuid']}")
    call(f"/api/collections/customers/records/{rec['id']}", token=tok, method="DELETE")
    print(f"Datensatz '{sub}' entfernt.")
    return 0


def main(sub, email):
    tok = superuser()
    assert find(sub, tok) is None, f"'{sub}' existiert schon — erst --cleanup {sub}"

    print(f"1) Formular abschicken ({sub}, {email})")
    st, res, _ = call("/api/saas/signup",
                      {"name": "Prüflauf", "email": email, "subdomain": sub})
    assert st == 200, f"   FEHLER: HTTP {st} {res}"
    assert res["status"] == "pending", f"   FEHLER: erwartet 'pending', bekam {res['status']}"
    print(f"   ok — {res['message']}")

    rec = find(sub, tok)
    assert rec["status"] == "pending", f"   FEHLER: Status {rec['status']}"
    assert not rec["coolifyAppUuid"], "   FEHLER: vor der Bestätigung wurde schon provisioniert!"
    print("   ok — nichts provisioniert, wie es sein soll")

    # Der Token ist versteckt (hidden), taucht in der Liste also nicht auf
    st, full, _ = call(f"/api/collections/customers/records/{rec['id']}?fields=confirmToken",
                       token=tok)
    ctoken = full.get("confirmToken") if isinstance(full, dict) else None
    assert ctoken, f"   FEHLER: kein confirmToken im Datensatz ({full})"

    print("2) Bestätigungslink aufrufen")
    st, _res, hdr = call("/api/saas/confirm?token=" + urllib.parse.quote(ctoken), follow=False)
    assert st == 302, f"   FEHLER: erwartet 302, bekam {st}"
    assert "warten.html" in hdr.get("Location", ""), f"   FEHLER: Ziel {hdr.get('Location')}"
    print(f"   ok — Weiterleitung auf {hdr['Location'].split('?')[0]}")

    rec = find(sub, tok)
    assert rec["status"] == "provisioning", f"   FEHLER: Status {rec['status']}"
    assert rec["trialEndsAt"], "   FEHLER: trialEndsAt nicht gesetzt"
    print(f"   ok — Trial läuft bis {rec['trialEndsAt'][:10]}")

    print("3) Warteseite pollt bis die Instanz steht")
    deadline, last = time.time() + TIMEOUT_S, None
    while time.time() < deadline:
        st, res, _ = call("/api/saas/status?token=" + urllib.parse.quote(ctoken))
        assert st == 200, f"   FEHLER: Statusabfrage {st} {res}"
        if res["status"] != last:
            print(f"   [{int(time.time() - deadline + TIMEOUT_S):>4}s] {res['status']}")
            last = res["status"]
        if res["status"] == "error":
            print(f"   FEHLER: {find(sub, tok)['lastError']}")
            return 1
        if res["status"] in ("trial", "active"):
            break
        time.sleep(POLL_S)
    else:
        print(f"   FEHLER: nach {TIMEOUT_S}s immer noch '{last}'")
        return 1

    assert res.get("loginToken"), "   FEHLER: kein loginToken für den Direkteinstieg"
    print("   ok — Instanz läuft, Login-Token ausgestellt")

    print("4) Login-Token gegen die Instanz prüfen")
    req = urllib.request.Request(res["url"] + "/api/collections/users/auth-refresh",
                                 data=b"{}", method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", res["loginToken"])
    with urllib.request.urlopen(req, timeout=30) as r:
        who = json.loads(r.read().decode())
    assert who["record"]["email"] == email, f"   FEHLER: eingeloggt als {who['record']['email']}"
    assert who["record"].get("isAdmin"), "   FEHLER: Account ist nicht Admin der Instanz"
    print(f"   ok — eingeloggt als {who['record']['email']} (Admin)")

    print(f"\nBestanden. {res['url']} ist nutzbar.")
    print(f"Aufräumen mit: {sys.argv[0]} --cleanup {sub}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--cleanup":
        sys.exit(cleanup(sys.argv[2]))
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
