# CI/CD (Gitea Actions)

Drei Workflows in `.gitea/workflows/`:

| Workflow | Auslöser | Was er tut |
|---|---|---|
| `ci.yml` | jeder Push/PR | TypeScript-Check, Produktions-Build, Syntax-Check aller Hooks/Migrationen/Skripte |
| `release.yml` | Tag-Push `v*` | Docker-Image bauen und in die Gitea-Registry pushen (`:vX.Y.Z` + `:latest`) |
| `rollout.yml` | manuell (Button) | SaaS-Kunden-Instanzen in Coolify auf ein neues Image-Tag heben |

## Einmalige Einrichtung

1. **Runner registrieren** (einmal pro Gitea-Instanz, z. B. auf dem SaaS-VPS):

   ```bash
   # act_runner installieren (Binary von gitea.com/gitea/act_runner)
   # Registrierungs-Token: Gitea → Site Administration → Actions → Runners
   act_runner register --instance https://gitea.robinhm.de --token <TOKEN> \
     --labels "ubuntu-latest:docker://catthehacker/ubuntu:act-22.04"
   act_runner daemon   # oder als systemd-Service
   ```

   Der Runner braucht Zugriff auf den Docker-Socket (Image-Builds in
   `release.yml`).

2. **Actions im Repo aktivieren**: Repo → Settings → Actions → Enable.

3. **Secrets anlegen** (Repo → Settings → Actions → Secrets):
   - `REGISTRY_USER` — Gitea-Benutzername
   - `REGISTRY_TOKEN` — Personal Access Token mit `package:write`
     (Gitea → Settings → Applications → Generate Token)
   - `COOLIFY_URL`, `COOLIFY_TOKEN` — nur für `rollout.yml` (wie `saas/.env`)

## Release-Ablauf

1. Version in `package.json` erhöhen, committen.
2. `git tag vX.Y.Z && git push origin vX.Y.Z`
3. `release.yml` baut und pusht das Image automatisch.

Manueller Fallback ohne CI: `make release` (macht dasselbe lokal).

## Rollout-Ablauf (SaaS-Instanzen aktualisieren)

**Gestaffelt ausrollen:**

1. Gitea → Actions → „Rollout" → Run workflow: neues Tag + **nur 1–2
   Test-Instanz-UUIDs** (aus `saas/provision/list.sh`).
2. Instanzen prüfen (Login, Album, Logs in Coolify).
3. Workflow erneut mit den restlichen UUIDs ausführen.
4. `APP_TAG` in `saas/.env` nachziehen, damit neue Kunden direkt die neue
   Version bekommen.
