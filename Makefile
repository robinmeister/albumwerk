# Albumwerk — die wichtigsten Befehle.
# Übersicht:  make  (oder: make help)

COMPOSE     := docker compose
DEV_COMPOSE := $(COMPOSE) -p albumwerk-dev -f docker-compose.dev.yml

# Versioniertes Release-Image (Registry: Gitea-Packages des Repos)
REGISTRY := gitea.robinhm.de
IMAGE    := $(REGISTRY)/robinmeister/albumwerk
VERSION  := $(shell node -p "require('./package.json').version" 2>/dev/null || echo dev)

# Die E2E-Suite braucht Node >= 20 (.nvmrc). Ist nvm installiert, wird die
# passende Version geladen; im CI-Image bringt der Runner sie schon mit.
USE_NODE20 := if [ -s "$$HOME/.nvm/nvm.sh" ]; then . "$$HOME/.nvm/nvm.sh" && nvm use >/dev/null; fi

.DEFAULT_GOAL := help
.PHONY: help hooks dev dev-reset dev-stop dev-logs prod stop logs update backup restore release e2e e2e-clean help-shots

hooks: ## Secret-Scan-Hook aktivieren (detect-secrets vor jedem Commit)
	@command -v detect-secrets >/dev/null 2>&1 || pip3 install --user detect-secrets || pip3 install --user --break-system-packages detect-secrets
	git config core.hooksPath .githooks
	@echo "  Pre-Commit Secret-Scan aktiv (Hook: .githooks/pre-commit)."

help: ## Diese Übersicht anzeigen
	@echo "Verfügbare Befehle:"
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36mmake %-11s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Entwicklung / Demo (eigenes Docker-Volume, getrennt von der Produktion)
# ---------------------------------------------------------------------------

dev: ## Dev-Instanz mit Demo-Daten starten (App: 8091, Mails: 8025)
	$(DEV_COMPOSE) up -d --build
	@echo ""
	@echo "  Dev-Instanz läuft (der erste Start braucht ein paar Sekunden für die Demo-Daten):"
	@echo "  App:                http://localhost:$${APP_PORT:-8091}"
	@echo "  PocketBase-Backend: http://localhost:$${APP_PORT:-8091}/_/"
	@echo "  Mailpit (E-Mails):  http://localhost:$${MAILPIT_PORT:-8025}"
	@echo ""
	@echo "  Demo-Logins (Passwort jeweils: demo123456)"
	@echo "  Fotograf/Admin: admin@demo.test   (auch fürs PocketBase-Backend)"
	@echo "  Kunde:          kunde@demo.test"

dev-reset: ## Dev-Instanz löschen und frisch mit Demo-Daten starten
	$(DEV_COMPOSE) down -v
	$(MAKE) dev

dev-stop: ## Dev-Instanz stoppen (Daten bleiben erhalten)
	$(DEV_COMPOSE) down

dev-logs: ## Logs der Dev-Instanz anzeigen
	$(DEV_COMPOSE) logs -f app

# ---------------------------------------------------------------------------
# End-to-End-Tests (laufen gegen die Dev-Instanz auf :8091)
# ---------------------------------------------------------------------------

e2e: ## E2E-Tests gegen die laufende Dev-Instanz ausführen
	@$(USE_NODE20); npx playwright test $(ARGS)

e2e-clean: ## Reste eines abgebrochenen E2E-Laufs entfernen (Testdaten, Branding)
	@$(USE_NODE20); npx tsx e2e/clean.ts

help-shots: ## Doku-Screenshots neu aufnehmen und nach public/help schreiben
	@$(USE_NODE20); E2E_SHOTS=1 npx playwright test && node e2e/help-shots.mjs
	@echo ""
	@echo "  Bilder liegen in public/help/ — vor dem Commit einmal ansehen."

# ---------------------------------------------------------------------------
# Produktion (Daten liegen im Ordner ./pb_data)
# ---------------------------------------------------------------------------

prod: ## Produktions-Instanz starten (braucht .env mit Superuser-Zugangsdaten)
	@if [ -f .env ]; then set -a; . ./.env; set +a; fi; \
	if [ -z "$$PB_SUPERUSER_EMAIL" ] || [ -z "$$PB_SUPERUSER_PASSWORD" ]; then \
		echo ""; \
		echo "  Es fehlen die Zugangsdaten für das Administrations-Backend."; \
		echo "  Bitte einmalig einrichten:"; \
		echo ""; \
		echo "    cp .env.example .env"; \
		echo "    (dann .env öffnen und E-Mail + Passwort eintragen)"; \
		echo ""; \
		exit 1; \
	fi; \
	$(COMPOSE) up -d --build
	@echo ""
	@echo "  Produktions-Instanz läuft:"
	@echo "  App:                http://localhost:$${APP_PORT:-8090}"
	@echo "  PocketBase-Backend: http://localhost:$${APP_PORT:-8090}/_/"
	@echo ""
	@echo "  Nächste Schritte: siehe README.md → \"Erste Schritte nach dem Start\""

stop: ## Produktions-Instanz stoppen (Daten bleiben erhalten)
	$(COMPOSE) down

logs: ## Logs der Produktions-Instanz anzeigen
	$(COMPOSE) logs -f app

update: ## Neue Version einspielen (git pull + neu bauen, Daten bleiben erhalten)
	git pull
	$(COMPOSE) up -d --build

# Hinweis: der Tag-Push am Ende löst zusätzlich den CI-Release aus
# (.gitea/workflows/release.yml) — gleiche Tags werden idempotent überschrieben.
release: ## Versioniertes Image bauen, taggen und in die Registry pushen
	@if ! git diff --quiet || ! git diff --cached --quiet; then \
		echo "  Es gibt uncommittete Änderungen — bitte zuerst committen."; \
		exit 1; \
	fi
	docker build --build-arg APP_VERSION=$(VERSION) \
		-t $(IMAGE):v$(VERSION) -t $(IMAGE):latest .
	docker push $(IMAGE):v$(VERSION)
	docker push $(IMAGE):latest
	git tag -f v$(VERSION) && git push origin v$(VERSION)
	@echo ""
	@echo "  Release v$(VERSION) veröffentlicht:"
	@echo "  $(IMAGE):v$(VERSION)  (+ :latest)"
	@echo ""
	@echo "  Voraussetzung war ein einmaliges 'docker login $(REGISTRY)'."

backup: ## Konsistentes Backup erstellen (landet in ./pb_data/backups/)
	@if [ -f .env ]; then set -a; . ./.env; set +a; fi; \
	PORT=$${APP_PORT:-8090}; \
	NAME="ondemand-$$(date +%F-%H%M%S).zip"; \
	TOKEN=$$(curl -sf -X POST "http://localhost:$$PORT/api/collections/_superusers/auth-with-password" \
		-H "Content-Type: application/json" \
		-d "{\"identity\":\"$$PB_SUPERUSER_EMAIL\",\"password\":\"$$PB_SUPERUSER_PASSWORD\"}" \
		2>/dev/null | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'); \
	if [ -n "$$TOKEN" ] && curl -sf -X POST "http://localhost:$$PORT/api/backups" \
		-H "Authorization: $$TOKEN" -H "Content-Type: application/json" \
		-d "{\"name\":\"$$NAME\"}" >/dev/null; then \
		echo ""; \
		echo "  Backup erstellt: ./pb_data/backups/$$NAME"; \
		echo "  Wichtig: Kopiere die Datei zusätzlich an einen zweiten Ort"; \
		echo "  (anderer Rechner / Cloud-Speicher) — siehe README → Backup."; \
	elif ! docker compose ps --status running app 2>/dev/null | grep -q app; then \
		TARFILE="backup-$$(date +%F).tar.gz"; \
		tar czf "$$TARFILE" pb_data; \
		echo ""; \
		echo "  App läuft nicht — Offline-Backup als $$TARFILE erstellt."; \
		echo "  (Bei gestoppter App ist das tar-Backup konsistent.)"; \
	else \
		echo ""; \
		echo "  Backup fehlgeschlagen: App läuft, aber die API war nicht erreichbar"; \
		echo "  oder die Zugangsdaten in .env stimmen nicht (PB_SUPERUSER_EMAIL/-PASSWORD)."; \
		exit 1; \
	fi

restore: ## Backup einspielen: make restore FILE=pb_data/backups/xyz.zip
	@if [ -z "$(FILE)" ] || [ ! -f "$(FILE)" ]; then \
		echo ""; \
		echo "  Bitte ein vorhandenes Backup angeben:"; \
		echo "    make restore FILE=pb_data/backups/DATEINAME.zip"; \
		echo ""; \
		echo "  Vorhandene Backups:"; \
		if ls pb_data/backups/*.zip >/dev/null 2>&1; then \
			ls -1 pb_data/backups/*.zip | sed 's/^/    /'; \
		else \
			echo "    (keine gefunden)"; \
		fi; \
		exit 1; \
	fi
	@echo ""; \
	echo "  ACHTUNG: Alle aktuellen Daten in ./pb_data werden durch das Backup"; \
	echo "  '$(FILE)' ersetzt. Eine Sicherheitskopie wird angelegt."; \
	printf "  Fortfahren? [j/N] "; \
	read ANTWORT; \
	if [ "$$ANTWORT" != "j" ] && [ "$$ANTWORT" != "J" ]; then echo "  Abgebrochen."; exit 1; fi
	@set -e; \
	SAFE="pb_data.vor-restore-$$(date +%F-%H%M%S)"; \
	FILE_ABS="$$(cd "$$(dirname "$(FILE)")" && pwd)/$$(basename "$(FILE)")"; \
	docker compose stop app; \
	echo "  Sicherheitskopie: $$SAFE/"; \
	docker run --rm -e SAFE="$$SAFE" -v "$$(pwd)":/work -v "$$FILE_ABS":/backup.zip:ro alpine sh -ec ' \
		mkdir "/work/$$SAFE"; \
		for f in /work/pb_data/* /work/pb_data/.[!.]*; do \
			[ -e "$$f" ] || continue; \
			case "$$f" in */backups) ;; *) mv "$$f" "/work/$$SAFE/" ;; esac; \
		done; \
		unzip -q /backup.zip -d /work/pb_data'; \
	docker compose up -d; \
	echo ""; \
	echo "  Wiederherstellung abgeschlossen."; \
	echo "  Die vorherigen Daten liegen als Sicherheitskopie in $$SAFE/ —"; \
	echo "  wenn alles passt, kann der Ordner gelöscht werden."
