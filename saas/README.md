# SaaS-Betrieb — Runbook

Automatisierter Betrieb von Kunden-Instanzen: **1 Kunde = 1 Container + Subdomain + SSL**,
verwaltet über [Coolify](https://coolify.io) (Traefik + automatisches Let's Encrypt),
mit zentralen Backups, Uptime-Kuma-Monitoring und Self-Service-Trial über die
Control-Plane in `control/`.

```
Signup (control.SAAS_DOMAIN/signup.html)
   └─> Control-Plane (PocketBase) — customers-Collection + Cron-Worker
         └─> Coolify-API: App (gepinntes Image) + Volume + Subdomain
               └─> kunde.SAAS_DOMAIN  (SSL: Traefik/Let's Encrypt)
                     └─> Bootstrap: SMTP, Fotografen-Account, Willkommensmail
```

---

## 1. Einmalige Einrichtung (VPS)

1. **VPS** mieten (z. B. Hetzner CX32/CX42 — Instanzen brauchen je ~200–400 MB RAM).
2. **Coolify installieren** (als root): Anleitung auf coolify.io/docs — Ein-Zeilen-Installer.
   Danach im Coolify-UI: Admin-Konto anlegen, unter *Keys & Tokens* ein
   **API-Token** erzeugen; ein **Projekt** anlegen (UUID aus der URL notieren)
   und die Server-UUID notieren.
3. **Registry-Zugang**: `docker login gitea.robinhm.de` auf dem VPS (damit
   Coolify das Produkt-Image ziehen kann); alternativ in Coolify unter
   *Registries* hinterlegen.
4. **Wildcard-DNS**: `*.SAAS_DOMAIN` als A-Record auf die VPS-IP. Zusätzlich
   `control.SAAS_DOMAIN` (Control-Plane) und `status.SAAS_DOMAIN` (Kuma).
5. **`saas/.env`** aus `.env.example` erstellen und komplett ausfüllen
   (Coolify-URL/-Token/-UUIDs, `SAAS_DOMAIN`, Image-Tag, SMTP-Relay, rclone).
6. **Uptime Kuma** als Coolify-Service deployen (Template in Coolify vorhanden),
   Domain `status.SAAS_DOMAIN`; im Kuma-UI Admin anlegen und eine öffentliche
   **Statusseite** erstellen. Zugangsdaten in `saas/.env` (`KUMA_*`) eintragen;
   auf dem VPS `pip install uptime-kuma-api` (für die automatische
   Monitor-Anlage durch `provision.sh`).
7. **Control-Plane deployen**: in Coolify eine App aus diesem Repo-Verzeichnis
   (`saas/control/`, Dockerfile-Build) mit Domain `control.SAAS_DOMAIN`
   anlegen; alle Variablen aus `saas/.env` als App-Envs setzen (inkl.
   `PB_SUPERUSER_*` für das Dashboard). SMTP der Control-Plane im
   PB-Dashboard (Settings → Mail) auf das Relay stellen.
8. **Zentrale Backups**: auf dem VPS `rclone` installieren, `rclone config`
   (Remote wie `RCLONE_REMOTE` in der .env, z. B. Hetzner Storage Box), dann
   als root-Cron:

   ```
   30 4 * * *  /pfad/zum/repo/saas/backup-sync.sh >> /var/log/fg-backup.log 2>&1
   ```

## 2. Täglicher Betrieb

- **Kunden anlegen** (manuell): `provision/provision.sh <subdomain> <email> [name]`
  — legt App+Volume+Domain an, wartet auf Gesundheit, richtet SMTP ein, legt den
  Fotografen-Account an und verschickt die Willkommensmail (= Passwort setzen).
- **Self-Service**: Kunden registrieren sich selbst unter
  `https://control.SAAS_DOMAIN/signup.html` → 14-Tage-Trial, vollautomatisch.
- **Kundenliste/Verwaltung**: PB-Dashboard der Control-Plane
  (`https://control.SAAS_DOMAIN/_/`, Collection `customers`) — oder
  `provision/list.sh` für die Coolify-Sicht.
- **Pausieren/Fortsetzen**: Status im Dashboard auf `suspended`/`active`
  setzen (stoppt/startet die Instanz automatisch) — oder
  `provision/suspend.sh|resume.sh <uuid>`.
- **Endgültig löschen**: `provision/deprovision.sh <uuid>` (mit Rückfrage;
  vorher letztes Backup auf dem rclone-Remote prüfen!).
- **Neue Produktversion ausrollen**: `make release` (Repo-Wurzel) → in
  `saas/.env` `APP_TAG` hochziehen → neue Instanzen nutzen sie sofort.
  Bestandsinstanzen: in Coolify das Image-Tag der App ändern + Redeploy
  (Migrationen laufen automatisch; erst bei 1–2 Kunden testen).

## 3. Trial-Lebenszyklus (automatisch)

| Zeitpunkt | Was passiert |
|---|---|
| Signup | Record `provisioning` → Worker legt Coolify-App an (`deploying`) |
| ~2–5 min | Instanz gesund → Bootstrap → `trial`, Kunde erhält Passwort-Mail |
| Tag 12 | Erinnerungs-Mail „endet in 2 Tagen" |
| Tag 14 | Instanz wird gestoppt, Status `suspended`, Info-Mail (Daten bleiben 30 Tage) |
| Kauf/Zusage | Admin setzt Status auf `active` → Instanz startet wieder |

Fehlerfälle landen mit `lastError` im Record (Status `error` bei
Deploy-Timeout) — sichtbar im Dashboard, Details in den PB-Logs.

## 3b. Support-Eingang (`supportReports`)

Technische Support-Anfragen aus den Kunden-Instanzen landen zentral in der
Control-Plane — Dashboard → Collection `supportReports`.

```
Nutzer meldet "Technisches Problem" in der Instanz
   └─> Instanz (pb_hooks/support.pb.js)
         ├─> POST control.SAAS_DOMAIN/api/saas/support-report   (Regelweg)
         └─> E-Mail an VENDOR_SUPPORT_EMAIL                     (Fallback)
```

- `provision.sh` setzt `SAAS_CONTROL_URL` (aus `CONTROL_URL`, sonst
  `https://control.$SAAS_DOMAIN`) und `VENDOR_SUPPORT_EMAIL`
  (aus `SUPPORT_NOTIFY_EMAIL`) an jeder neuen Instanz.
- Bestandsinstanzen: beide Envs in Coolify nachtragen + Redeploy.
- Bei jedem Eingang geht eine Mail an `SUPPORT_NOTIFY_EMAIL`. Der Report wird
  über `instanceUrl` automatisch einem `customers`-Record zugeordnet;
  Self-Host-Instanzen kommen mit `selfHosted = true` an.
- Der Endpoint ist unauthentifiziert (Instanzen haben keine
  Control-Plane-Credentials), aber auf 200 kB Payload und 20 Reports pro
  Instanz und Stunde begrenzt.
- **Antwort**: per E-Mail an `reporterEmail` (nur bei Einwilligung gefüllt),
  sonst an `adminEmail` der Instanz — es gibt bewusst keinen automatischen
  Rückkanal in den Ticket-Thread der Instanz.

## 4. Billing anbinden (nach der Steuerberatung)

Noch offen ist die Wahl **Stripe Billing vs. Paddle** (Merchant of Record —
übernimmt EU-USt, kostet ~5 %; Stripe ist billiger/flexibler, USt bleibt bei
dir). Bis dahin: manueller `active`-Schalter (Zahlung auf Rechnung).

Zum Anbinden sind genau drei Stellen zu füllen (`control/pb_hooks/billing.pb.js`):
1. Webhook-Signaturprüfung im Stub `/api/saas/billing-webhook`.
2. Event→Status-Mapping (bezahlt → `active`, gekündigt/fehlgeschlagen →
   `suspended` nach Kulanzfrist) — die Statuswechsel steuern die Instanz schon.
3. Checkout-Link erzeugen (customers-Record-ID als Referenz mitgeben) und in
   Erinnerungs-/Ablauf-Mails in `lifecycle.pb.js` einsetzen.

## 5. Abnahme-Checkliste auf dem VPS (nicht lokal testbar)

- [ ] `provision.sh testkunde <deine-mail>` → `https://testkunde.SAAS_DOMAIN`
      lädt mit gültigem Zertifikat; Willkommensmail kommt an; Login → Wizard.
- [ ] Kuma zeigt den neuen Monitor grün; Statusseite öffentlich erreichbar.
- [ ] `suspend.sh`/`resume.sh` stoppen/starten die Instanz sichtbar.
- [ ] Signup-Formular end-to-end (zweiter Testkunde, andere Mail-Adresse).
- [ ] `backup-sync.sh` von Hand laufen lassen → ZIPs liegen auf dem Remote
      (`rclone ls $RCLONE_REMOTE`); Restore einer Datei stichprobenartig.
- [ ] Trial-Ablauf: `trialEndsAt` eines Testkunden auf gestern setzen →
      nächster Cron-Lauf pausiert die Instanz + Mail kommt.
- [ ] `deprovision.sh` für die Testkunden.
