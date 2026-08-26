# Roadmap — Albumwerk

> Ziel: **Albumwerk** als source-available Produkt für Fotograf:innen (Amateur → Profi) — self-hostbar **und** als SaaS, Zielmarkt zuerst **DACH / DSGVO-Nische**.
> Kernversprechen: **0 % Kommission · Server in Deutschland · kein Lock-in.**
>
> Abarbeiten von oben nach unten. `[ ]` offen · `[~]` in Arbeit · `[x]` erledigt.
> Die drei Spuren (Entwicklung / Marketing / Business) laufen parallel — aber **Phase 0 blockiert alles andere.**

---

## ⏭️ Als Nächstes (Stand 2026-08-26)

1. Phase 0 abschließen — die drei offenen Punkte sind reine Dashboard-Arbeit (SendGrid, Passwörter).
2. Terminbuchung fertigstellen: Etappe 5 (Kalender-Import) + Etappe 6 (Abschluss) — siehe Phase 5.
3. Business-Block starten: Gewerbe + Steuerberatung entscheiden die Abrechnung mit.

Die SaaS-Abnahme auf dem VPS ist seit 2026-08-26 durch (Phase 3).

---

## 🚦 Phase 0 — Launch-Blocker (zuerst, nichts geht ohne)

- [ ] **SendGrid-Key revoken** im SendGrid-Dashboard + neuen Key erzeugen (der alte liegt in der Git-Historie / potenziell in Scannern) ← *nur noch Nutzer-Aktion im SendGrid-Dashboard*
- [x] **Git-Historie bereinigen** (Key aus allen Branches purgen, force-push) — erledigt 2026-07-20 (`git-filter-repo`, alle Branches)
- [ ] Neuen SendGrid-Key **nur noch über ENV/Secret** laden, nie im Code (`.env` in `.gitignore` prüfen) ← *hängt am Revoke; `.env` ist gitignored*
- [x] `docs/pocketbase-migration.md` bereinigen (Superuser-Mail + interne IP raus) — erledigt 2026-07-20
- [x] **Secret-Scan-Hook** einrichten — `detect-secrets` als pre-commit (`make hooks`); gitleaks war mangels Registry-Zugriff nicht nutzbar
- [ ] Alle produktiven Passwörter rotieren (PB-Superuser, PayPal-App-Secrets) ← *Nutzer-Aktion*

---

## 🛠️ Entwicklung

### Phase 1 — Produkt-Härtung (MVP verkaufsfertig)
- [x] PayPal-**Server-Verifizierung** — serverseitige Capture-Verifizierung gegen die Orders-API existiert (`pb_hooks/paypal.pb.js`, `paymentIntents`); Secrets als hidden fields statt eigener Collection
- [x] Onboarding-/Setup-Wizard finalisiert: Branding → **Domain** (On-Demand-TLS) → Kontakt → **Zahlung inline** → Rechtliches, pro Schritt gespeichert
- [x] Fehler-/Leerzustände & E-Mail-Templates — gebrandete Mails (`emaillib`), durchgängig „du", globale ErrorBoundary, gemeinsame Feedback-Bausteine
- [x] Backup-Strategie für `pb_data` — nächtliche Auto-Backups + `make backup`/`make restore` + README-Doku inkl. Off-Site/S3
- [x] Datei-URLs gehärtet: Originale im protected `originalFile`-Feld, Zugriff nur mit File-Token (Download erfordert Login)
- [x] **Support-System**: Kundenformular + Admin-Postfach (`pb_hooks/lib/supportlib.js`), Weiterleitung an den Hersteller über die Control-Plane
- [x] **Hilfe-Center**: Artikel für Admin und Kund:innen (`src/content/help/`), bebildert; `scripts/check-help-images.mjs` hält Bild und Artikel in der CI zusammen
- [x] **E2E-Suite** (Playwright): 23 Strecken für Admin-, Kunden- und Einstellungs-Workflows, eigener CI-Job (`.gitea/workflows/e2e.yml`); Screenshots der Hilfe entstehen aus derselben Suite (`make help-shots`)
- [x] Rechtstexte im Admin pflegbar (`AdminLegalPage`) statt hartkodiert
- [x] **Ponytail-Audit** durchgeführt (2026-08-25): Firestore-/RTDB-Kompatibilitätsschichten, toter Code und das Abnahmeskript `verify-booking.mjs` entfernt

### Phase 2 — Distribution (Self-Hosting sauber ausliefern)
- [x] Versioniertes **Docker-Image** + Tags in der Gitea-Registry (`make release` bzw. CI auf Tag-Push)
- [x] Bundle für Endkunden: `docker-compose.yml` + `Caddyfile` + `.env.example` im Repo-Stamm ziehen ohne Quellcode das fertige Image (das doppelte `deploy/`-Verzeichnis ist beim Audit entfallen)
- [x] Self-Host-**Doku** (deutsch): `docs/selfhosting.md` — Installation, Update, Backup, Troubleshooting
- [x] Update-Mechanismus getestet: fresh + echtes Upgrade (altes Image → neues Image auf demselben Volume, alle Migrationen sauber)
- [x] Lizenzmodell entschieden: **PolyForm Noncommercial 1.0.0 + kommerzielle Dual-Lizenz** (`LICENSE.md`) — source-available statt Open-Core

### Phase 3 — SaaS-Automatisierung (Instanz-pro-Kunde)
- [x] **Provisioning-Wrapper**: `saas/provision/` gegen die Coolify-API (App + Volume + Subdomain + Instanz-Bootstrap)
- [x] Reverse-Proxy mit automatischem Let's-Encrypt (Traefik via Coolify)
- [x] Zentrale Backups (`saas/backup-sync.sh` + rclone) + Uptime-Kuma-Monitoring/Statusseite **gebaut** (Abnahme im Live-Betrieb siehe unten)
- [x] Self-Service Signup + Trial (14 Tage, ohne Kreditkarte) — Control-Plane `saas/control/`, auf dem VPS end-to-end bis Status `trial` abgenommen
- [x] **VPS-Abnahme (2026-08-26)**: Checkliste in `saas/README.md` §5 komplett durchlaufen — Provisioning, Kuma-Monitore + öffentliche Statusseite, Suspend/Resume, Self-Service-Signup, Backup-Sync inkl. Restore-Stichprobe, Trial-Erinnerung + -Ablauf, Deprovision. Vier dabei gefundene Fehler behoben (Coolify-URL aus Container-Sicht, Deploy-Timeout ab `updated`, SMTP der Control-Plane, `kuma-sync.py`)
- [~] Abrechnung: vorbereitet (manueller Status-Schalter + Webhook-Stub); Anbieterwahl Stripe/Paddle **weiterhin offen**, hängt an der Steuerberatung

### Phase 5 — Terminbuchung (aktive Baustelle)

Entwurf, Begründungen und Etappenergebnisse: `docs/terminbuchung.md`. Etappen 1–4 sind
seit 2026-08-25 im `main` (`pb_hooks/booking*.pb.js`, `src/features/Booking/`, `src/features/Appointments/`, Embed unter `/embed/`).

- [x] **Etappe 1** — Datenmodell, Verfügbarkeitsrechner, Vitest-Setup, Embed-Vorab-Test (CSP + Höhenmeldung im echten iframe bewiesen)
- [x] **Etappe 2** — Endpunkte (Verfügbarkeit, Buchen, Storno, Umbuchen, Zusagen/Ablehnen, manuelle Termine), Rate-Limits, Honeypot, Token, Mails mit `.ics`-Anhang, stündlicher Wartungsjob
- [x] **Etappe 3** — Admin-UI: Monatsraster mit Tagesdetail, Termin-Arten, Verfügbarkeit, Leitplanken
- [x] **Etappe 4** — Buchungs-UI + Embed: `/embed/`-Entry (~218 KB), Snippet-Generator mit Vorschau, Domain-Allowlist, `frame-ancestors 'none'` für den Rest der App
- [ ] **Etappe 5 — Kalender-Export + -Import**
  - [x] iCal-Generator für Mail-Anhänge (`pb_hooks/lib/icallib.js`, `tests/ical.test.ts`)
  - [ ] Abonnierbarer **Token-Feed** (`GET /api/custom/booking/feed/:token`) — alle Termine im eigenen Kalender-Programm
  - [ ] **ICS-Import**: Parser inkl. Wiederholungsregeln, Abruf-Job, Fehlerverhalten; schreibt `availabilityExceptions` mit `source="imported"` + `feedRef` (Felder und Index liegen schon)
  - [ ] Unit-Tests des Parsers mit echten Beispieldateien aus Google, Apple und Outlook
- [ ] **Etappe 6 — Abschluss** (Fertig-Definition §14)
  - [ ] **„Meine Termine"** für eingeloggte Kund:innen (fehlt komplett; `userNavItems` in `src/utils/routes.ts` hat noch keinen Eintrag)
  - [ ] Hilfe-Artikel Admin: buchbare Zeiten · Termin-Arten · **Buchung einbetten** (der wichtigste) · eigenen Kalender verbinden
  - [ ] Hilfe-Artikel Kunde: „Termin absagen oder verschieben", als **öffentlich** markiert (sonst Loginwand hinter dem Storno-Link)
  - [ ] E2E-Strecken: buchen im Embed · Doppelbuchung abgelehnt · Anfrage bestätigen · Storno per Token · Sperrzeit wirkt · **Header-Test** (`/embed` einbettbar, Rest nicht)
- [ ] Astryx-Update prüfen: `Tab` rendert `<button>` ohne `role="tab"` — Reiterstreifen wird Screenreadern nicht angekündigt (Lücke der Bibliothek, siehe §13c)

*Bewusst nicht im Umfang:* Anzahlungen · OAuth-Kalendersync · Gruppentermine/Mini-Sessions · Warteliste · SMS. Begründungen in `docs/terminbuchung.md` §15.

### Phase 4 — Skalierung (erst bei Bedarf, nicht vorziehen!)
- [ ] Bei > ~einigen hundert Kunden: echtes Multi-Tenant evaluieren — Vor-Evaluation mit Wann-Kriterien liegt in `docs/multi-tenant.md` (Empfehlung: Sharding zuerst)
- [x] CI/CD: Gitea Actions (`.gitea/workflows/` — CI, Tag-Release, gestaffeltes Coolify-Rollout); Setup in `docs/ci.md`

---

## 📣 Marketing (DACH / DSGVO-first)

### Fundament
- [ ] Positionierung final: **„0 % Kommission · Fotos in Deutschland · kein Lock-in"**
- [ ] Terminbuchung als zweites Verkaufsargument aufnehmen: einbettbar, **ohne Cookie-Banner** (kein Storage, keine Drittanbieter) — Kontrast zu Calendly
- [ ] Landingpage (deutsch) mit Trial-CTA + Preisseite (Self-Host / SaaS Starter / Pro / Managed)
- [ ] Referenz-Case + Testimonial von der Schwester (Screenshots echter Galerien)
- [ ] Demo-Instanz öffentlich (nutzt vorhandenen `PB_SEED_DEMO`-Seed)

### Reichweite (kostenarm, Solo-tauglich)
- [ ] SEO-Content-Serie: „Fotos verkaufen ohne Kommission", „DSGVO-konforme Kundengalerie", „Pixieset-Alternative aus Deutschland"
- [ ] Präsenz in DE-Fotografie-Communities (Facebook-Gruppen, Foren, r/photography)
- [ ] Vergleichsseiten „vs. Pixieset / ShootProof / Pic-Time" (Kommission + Datenstandort betonen) — dazu „vs. Calendly" für die Terminbuchung
- [ ] Newsletter/Warteliste ab Landingpage sammeln
- [ ] (später) YouTube/Kurzvideo: Setup in 10 Minuten

### Conversion
- [ ] Trial-Onboarding-Mailstrecke (Tag 0/3/10)
- [ ] Öffentliche Roadmap/Changelog für Vertrauen

---

## 💼 Business & Recht

### Gründung
- [ ] **Nebengewerbe** anmelden (Gewerbeamt, ~20–60 €); < ~18 h/Woche für „nebenberuflich"
- [ ] Arbeitsvertrag auf Nebentätigkeits-Klausel prüfen
- [ ] **Kleinunternehmerregelung §19 UStG** wählen (bis 25.000 €/Jahr)
- [ ] Geschäftskonto trennen (privat/geschäftlich)
- [ ] Buchhaltung/Rechnungstool (z. B. lexoffice/sevdesk) einrichten

### Pflicht-Dokumente (Blocker für SaaS-Verkauf)
- [ ] **AVV / Auftragsverarbeitungsvertrag** zum Download (du bist Auftragsverarbeiter der Kundenfotos!) — seit der Terminbuchung zusätzlich: Kontaktdaten von Nicht-Kund:innen und, über den Kalender-Import, die Zeitlage des privaten Kalenders (`docs/terminbuchung.md` §10)
- [ ] Datenschutzerklärung + Impressum + AGB (idealerweise anwaltlich/Muster geprüft)
- [ ] Einmalige Steuerberatung zu SaaS-Verkauf in EU (Reverse Charge, USt bei Auslandskunden)
- [ ] Hosting bei **DE-Anbieter** (Hetzner) — zugleich USP und günstigste Marge

### Preis & Betrieb
- [ ] Preise fixieren: Self-Host 149 € einmalig + 49 €/Jahr · SaaS 9 € / 19–29 € · Managed Setup 149 €
- [ ] Support-Kanäle trennen: **Community (Discord/Forum)** für Self-Host, **E-Mail nur für zahlende SaaS**
- [ ] SLA/Erreichbarkeit realistisch definieren (Solo-Dev!)
- [ ] Kennzahlen tracken: Trials, Conversion, MRR, Churn

### Meilensteine
- [~] **M1:** Phase 0 + Produkt-Härtung → Produkt ist auslieferbar; **offen** nur noch Phase 0 (Nutzer-Aktionen) und Terminbuchung Etappe 5+6
- [ ] **M2 (Monat 3–4):** Gewerbe + Docs + 5–10 Beta-Kunden (Netzwerk)
- [ ] **M3 (Monat 5–8):** Public Launch, Landingpage, erste zahlende Kunden
- [ ] **M4 (Monat 9–12):** SaaS-Automatisierung, Ziel 30–50 zahlende Kunden (~1.000 € MRR)

---

## 🔐 Security-Notiz (Referenz für Phase 0)

Bereinigung der Git-Historie (SendGrid-Key aus allen Branches):
1. Backup-Bundle des Repos erstellen
2. `git-filter-repo --replace-text` über alle Refs laufen lassen (ersetzt Key durch `***REMOVED***`)
3. `git push --force --all` + `--tags` zum Gitea-Remote
4. **Zusätzlich:** Key bei SendGrid revoken (Rewrite macht geleakten Key NICHT ungültig!)
5. Andere lokale Klone neu klonen (alte Historie ist inkompatibel)
