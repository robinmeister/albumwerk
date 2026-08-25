# Selbst hosten — Installation, Update, Backup, Fehlerbehebung

Diese Anleitung führt durch den kompletten Betrieb von Albumwerk auf einem
eigenen Server. Vorkenntnisse: ein Server mit Docker genügt — alles Weitere
wird hier erklärt.

## Voraussetzungen

- Ein Linux-Server (z. B. Hetzner Cloud CX22, ~4 €/Monat) mit
  **Docker + Docker Compose** (`docker compose version` muss funktionieren).
- Ca. 2 GB RAM und genug Festplatte für Ihre Fotos (Faustregel:
  Fotobestand × 1,3 — Originale + Vorschauen + Backups).
- Optional, empfohlen: eine **eigene (Sub-)Domain**, z. B. `fotos.ihre-domain.de`.

## Installation

### Weg A — fertiges Image (empfohlen, kein Quellcode nötig)

1. Einen Ordner anlegen und die drei Dateien aus dem Repo-Stamm
   hineinlegen: `docker-compose.yml`, `Caddyfile`, `.env.example`.
   (Quellcode wird nicht gebraucht — `docker compose up -d` zieht das
   fertige Image aus der Registry.)
2. `.env` erstellen und ausfüllen:

   ```bash
   cp .env.example .env
   nano .env   # E-Mail + sicheres Passwort für das Admin-Backend eintragen
   ```

3. Starten:

   ```bash
   docker compose up -d
   ```

4. `http://SERVER-IP:8090` im Browser öffnen, mit den Zugangsdaten aus der
   `.env` im Admin-Backend (`/_/`) anmelden bzw. sich in der App registrieren
   und dem **Einrichtungs-Assistenten** folgen (Branding, Domain, Zahlung,
   Rechtliches — unter 10 Minuten).

### Weg B — aus dem Quellcode (Repo geklont)

```bash
cp .env.example .env    # ausfüllen
make prod               # baut das Image lokal und startet alles
```

### Eigene Domain & HTTPS

1. Beim Domain-Anbieter einen **A-Record** (optional AAAA) der Subdomain auf
   die Server-IP zeigen lassen.
2. Ports **80** und **443** in der Firewall öffnen.
3. Die Domain im Einrichtungs-Assistenten (Schritt „Domain") eintragen —
   fertig. Das HTTPS-Zertifikat besorgt und erneuert Caddy automatisch
   (Let's Encrypt); es muss keine Datei editiert werden.

### E-Mail-Versand (SMTP)

Bestell- und Anmelde-Mails laufen über Ihr eigenes Postfach: Admin-Backend
(`…/_/`) → **Settings → Mail settings** → SMTP-Daten des Mail-Anbieters
eintragen und mit *Send test email* prüfen. Unter **Settings → Application**
die öffentliche Adresse des Albums als *Application URL* eintragen (steht in
den E-Mail-Links).

### Support-Anfragen

Angemeldete Nutzer können unter **Support** Anfragen stellen; Sie beantworten
sie als Admin direkt in der App (Menüpunkt *Support*). Der Kunde bekommt jede
Antwort zusätzlich per E-Mail — dafür muss SMTP eingerichtet sein (siehe oben)
und unter *Settings → Application* die Application URL stimmen.

Meldet jemand ein **technisches Problem der Software**, kann die Anfrage an den
Hersteller weitergeleitet werden. Das passiert **nur**, wenn Sie eine der beiden
Umgebungsvariablen setzen:

| Variable | Bedeutung |
|---|---|
| `SAAS_CONTROL_URL` | zentrale Support-Annahme des Herstellers (bevorzugt) |
| `VENDOR_SUPPORT_EMAIL` | E-Mail-Fallback, falls die erste Adresse fehlt/nicht erreichbar ist |

**Ohne diese Variablen verlässt keine Support-Anfrage Ihre Instanz** — alle
Tickets bleiben bei Ihnen, und die App weist die meldende Person darauf hin.
Wird weitergeleitet, sieht der Melder vor dem Absenden genau, welche Daten
übertragen werden, und muss ausdrücklich zustimmen; ohne Zustimmung werden Name
und E-Mail-Adresse nicht mitgesendet.

## Update

**Weg A (Image):**

```bash
docker compose pull && docker compose up -d
```

**Weg B (Quellcode):**

```bash
make update    # git pull + neu bauen + neu starten
```

In beiden Fällen: Datenbank-Migrationen laufen beim Start automatisch, alle
Daten bleiben erhalten (`./pb_data`). Vor größeren Updates empfiehlt sich ein
manuelles Backup: `make backup` (bzw. ein Blick in `./pb_data/backups/`).

Versionierte Images tragen Tags (`:v0.1.0`, `:latest`). Wer reproduzierbar
bleiben will, pinnt in der `docker-compose.yml` eine feste Version statt
`:latest`.

## Backup & Wiederherstellung

Kurzfassung — Details im README-Abschnitt „Backup":

- **Automatisch:** nächtlich um 3:00 Uhr nach `./pb_data/backups/`, die
  letzten 7 werden behalten (änderbar im Admin-Backend → Settings → Backups).
- **Wichtig:** Backups regelmäßig an einen zweiten Ort kopieren oder die
  S3-Anbindung aktivieren (Admin-Backend → Settings → Backups → S3).
- **Wiederherstellen:** Admin-Backend → Settings → Backups → ⟳ *Restore* —
  oder im Notfall `make restore FILE=pb_data/backups/DATEINAME.zip`.

## Fehlerbehebung (Troubleshooting)

**Die App startet nicht / Port 8090 ist belegt.**
Anderen Port wählen: `APP_PORT=8092 docker compose up -d` (bzw. `APP_PORT` in
der `.env` setzen).

**`https://meine-domain.de` ist nicht erreichbar.**
Der Reihe nach prüfen:
1. DNS: `ping fotos.ihre-domain.de` muss die Server-IP zeigen (DNS-Änderungen
   brauchen bis zu einige Stunden).
2. Firewall: Ports 80 und 443 müssen offen sein (Cloud-Anbieter haben oft
   eine zusätzliche Firewall im Web-Panel).
3. Die Domain muss im Einrichtungs-Assistenten bzw. unter „Branding →
   Domain" eingetragen und gespeichert sein — Caddy stellt Zertifikate nur
   für die dort hinterlegte Domain aus.
4. Caddy-Logs ansehen: `docker compose logs caddy | tail -50`.

**Es kommen keine E-Mails an.**
SMTP-Einstellungen im Admin-Backend prüfen (*Send test email*!). Häufig:
falscher Port (587 mit StartTLS bzw. 465 mit TLS), Absender-Adresse gehört
nicht zur Mail-Domain, oder der Anbieter verlangt ein App-Passwort. Auch den
Spam-Ordner prüfen.

**Admin-Passwort vergessen.**
Auf dem Server neu setzen:

```bash
docker compose exec app /pb/pocketbase superuser upsert admin@example.com NEUES-PASSWORT --dir /pb/pb_data
```

**Bilder-Upload schlägt fehl.**
Maximale Dateigröße ist 50 MB pro Bild. Bei vielen großen Dateien:
Festplattenplatz prüfen (`df -h`) — auch Vorschauen und Backups brauchen Platz.

**Vorschaubilder fehlen oder sind ohne Wasserzeichen.**
Unter „Branding → Wasserzeichen" die Einstellungen prüfen und **„Vorschauen
neu erzeugen"** klicken (kann einige Minuten dauern).

**Logs ansehen.**
- App: `docker compose logs -f app` (bzw. `make logs`)
- Detaillierte Anfrage-Logs: Admin-Backend → *Logs*

**Alles kaputt — von vorn anfangen.**
Container stoppen (`docker compose down`), Backup einspielen
(`make restore FILE=…`) oder — nur wenn die Daten egal sind — `./pb_data`
löschen und neu starten.

## Hilfe

Fragen und Probleme: [Issues im Repo](https://gitea.robinhm.de/robinmeister/kathis_platform/issues)
oder E-Mail an den Anbieter (siehe LICENSE.md).
