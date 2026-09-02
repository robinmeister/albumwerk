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
   `release.yml`) und dort das **buildx-Plugin** — `release.yml` baut ein
   Multi-Arch-Manifest (amd64 + arm64), damit das Image unabhängig von der
   Architektur des Runners auf allen Kundeninstanzen läuft. Prüfen mit
   `docker buildx version`; fehlt es, das Paket `docker-buildx` (bzw.
   `docker-buildx-plugin`) nachinstallieren. Die QEMU-Emulation für die jeweils
   fremde Architektur richtet der Workflow selbst ein, dafür muss
   `docker run --privileged` erlaubt sein.

2. **Actions im Repo aktivieren**: Repo → Settings → Actions → Enable.

3. **Secrets anlegen** (Repo → Settings → Actions → Secrets):
   - `REGISTRY_USER` — Gitea-Benutzername (`robinmeister`)
   - `REGISTRY_TOKEN` — Personal Access Token mit `package:write`
     (Gitea → Settings → Applications → Generate Token)
   - `COOLIFY_URL`, `COOLIFY_TOKEN` — nur für `rollout.yml` (wie der `.env` im Repo `albumwerk-saas`)

   `ci.yml` und `e2e.yml` brauchen keine Secrets.

   Fehlen `REGISTRY_*`, scheitert `release.yml` mit `username is empty` —
   und zwar **still**, was den Betrieb angeht: es wird schlicht kein neues
   Image gebaut, während alle Instanzen weiter auf dem letzten laufen.

   `COOLIFY_URL` muss **vom Runner aus** erreichbar sein, nicht vom
   Coolify-Server aus. Der Runner steht woanders, `http://coolify:8080` aus
   dem internen Docker-Netz hilft ihm nicht — dort gehört die Adresse hin,
   unter der die Coolify-Oberfläche von außen antwortet. Solange Coolify
   keine eigene Domain hat, ist das `http://<server-ip>:8000`; dann geht der
   Token allerdings unverschlüsselt über die Leitung. Besser vorher unter
   Coolify → Settings → Instance Domain eine Domain setzen und https nehmen.

## Release-Ablauf

1. Version in `package.json` erhöhen, committen.
2. `git tag vX.Y.Z && git push origin vX.Y.Z`
3. `release.yml` baut und pusht das Image automatisch.

Manueller Fallback ohne CI: `make release` (macht dasselbe lokal).

## Rollout-Ablauf (SaaS-Instanzen aktualisieren)

**Gestaffelt ausrollen:**

1. Gitea → Actions → „Rollout" → Run workflow: neues Tag + **nur 1–2
   Test-Instanz-UUIDs** (aus `provision/list.sh` in `albumwerk-saas`).
2. Instanzen prüfen (Login, Album, Logs in Coolify).
3. Workflow erneut mit den restlichen UUIDs ausführen.
4. `APP_TAG` in der `.env` im Repo `albumwerk-saas` nachziehen, damit neue Kunden direkt die neue
   Version bekommen.
