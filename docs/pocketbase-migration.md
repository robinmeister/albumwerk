# PocketBase Migration (Phase 1)

Ziel: Firebase-Features Schritt für Schritt nach PocketBase
überführen, ohne die produktive Firebase-Instanz sofort
abzuschalten.

## Laufende Instanz
- PocketBase läuft auf dem Server (interne Adresse, siehe Deployment-Config)
- Admin-Dashboard unter `/_/` auf derselben Instanz
- Superuser-Zugang: siehe sicherer Passwort-Manager / ENV, nicht im Repo

## Aktuelle PocketBase-Config
Datei: `src/config/pocketbase.ts`
Exporte:
- `pb` – Basis-Client für PocketBase
- `pbAdminAuth.login()` – Admin-Login-Helper

## Migrations-Checkliste
- [x] PocketBase-Instanz bereitstellen
- [x] `shootings`, `packages`, `userSelection` anlegen
- [ ] Auth-Logik umstellen
- [ ] Storage-Uploads umstellen
- [ ] Realtime-Updates umstellen
- [ ] Bildverarbeitung (Sharp) in Migration einbinden
- [ ] Firebase-Importe Schritt für Schritt ersetzen
