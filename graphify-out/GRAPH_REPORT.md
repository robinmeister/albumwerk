# Graph Report - albumwerk  (2026-09-16)

## Corpus Check
- 328 files · ~222,633 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 7, .example 1, .ico 1)

## Summary
- 1605 nodes · 3659 edges · 138 communities (77 shown, 61 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 209 edges (avg confidence: 0.84)
- Token cost: 447,038 input · 0 output

## Community Hubs (Navigation)
- E2E-Fixtures & Cleanup
- Rich-Text-Editor & Hilfe-Banner
- App-Shell & Frontend-Telemetrie
- Design-Presets & Settings
- iCal & Preview-Session-Hooks
- Zahlungsanbieter-Formulare
- Hilfeartikel- & Support-Formulare
- Routing & Layout-Shell
- Termin-Admin-API
- Bildspeicher & Album-Download
- Branding- & Settings-Context
- Profil & Album-Bilder
- Buchungs-Client-API
- Preiskatalog & Pakete
- Package-Manifest & Fonts
- Frontend-Dependencies
- Shooting anlegen (UI)
- Checkout & Bestellabschluss
- Slot-Berechnung
- Slot-Picker & Datums-Utils
- Bestell-Stepper-Screens
- Teilen-Dialog & Upload-UI
- Auswahlmodus (UI)
- Preisformular & Bestellungen
- Buchungs-Benachrichtigungsmails
- Support-Postfach-Screens
- Buchungs-Hook-Bibliothek
- Auth-Seiten & PocketBase-Login
- ErrorBoundary & Seitenrahmen
- Release & Coolify-Rollout
- Admin-Nutzer & Empty States
- TypeScript-Konfiguration
- Produktformular & Katalog (UI)
- Shooting-Seiten & Album-Karten
- Auth-Store & Lösch-Modal
- Verfügbarkeitsregeln
- Gitea-Actions CI/CD
- Terminarten & Embed-Seite
- AppShell-Navigation & Speicheranzeige
- Dev-Instanz Verify-Rezept
- Wasserzeichen-Vorschauen & Verhaltenskodex
- Dev-Dependencies
- NPM-Skripte
- Monatskalender-Raster
- Design-System-Regeln
- Akzentfarbe & Mail-Theming
- Preset-Wähler-Umsetzung
- Verkaufsbereitschaft-Plan
- Vorschau-Sitzungstrennung
- Buchungs-Leitplanken
- CI-Jobs & Hilfebild-Prüfung
- Schattenkonto-Handhabung
- Support-Weiterleitung
- Hilfebild-Prüfskript
- Bild-Upload-Hook
- Multi-Tenant-Grenze
- QR-Scanner
- Shooting- & Preis-Abrufe
- Preset-Migration & Overrides
- PWA-Manifest & Themefarbe
- Kundenansicht-Vorschau-Plan
- Selfhosting-Checkliste
- Embed-Auslieferung & CSP
- Vorschau-Warteschlange
- Node-TS-Konfiguration
- Selbstgehostete Fonts & Support-Opt-in
- JSVM-Laufzeitgrenzen
- Hilfe-Screenshot-Skript
- E-Mail-Template-Bibliothek
- Roadmap & Kernversprechen
- Verkaufssperre & Backups
- Abgeleitete Slots ohne Schemafeld
- Bildvorschau-Swiper
- Embed-Höhenmeldung
- Embed-Origin-Allowlist
- Design-Preset-Migration
- Seitenleiste mit nativen <details>-Grupp
- pre-commit
- docker-entrypoint.sh
- Laufzeit hängt am Datensatz, nicht am To
- Caddy + Let's Encrypt für eigene Domain
- Admin-UI: Monatsraster statt Zeitraster
- Gemeinsamer Slot-Pool, Konto nie Pflicht
- tests/time.test.ts gegen tzlib.js
- overrides
- emails_auth.pb.js
- pb_hooks/package.json
- support.pb.js
- users_guard.pb.js
- Manuelle Termine (Leitplanken übergehbar

## God Nodes (most connected - your core abstractions)
1. `react` - 95 edges
2. `@stylexjs/stylex` - 76 edges
3. `useSettings()` - 57 edges
4. `pb` - 50 edges
5. `lucide-react` - 42 edges
6. `react-router-dom` - 42 edges
7. `test` - 39 edges
8. `react-toastify` - 39 edges
9. `PbAdmin` - 28 edges
10. `Page()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Dev-app-Service (lokaler Build, Volume pb_data_dev)` --semantically_similar_to--> `app-Service (PocketBase-Container aus der Registry)`  [INFERRED] [semantically similar]
  docker-compose.dev.yml → docker-compose.yml
- `Manuelle UI-Steuerung per Playwright (gecachte Chromium-Binary)` --semantically_similar_to--> `E2E-Workflow (Playwright gegen frische Dev-Instanz)`  [INFERRED] [semantically similar]
  .claude/skills/verify/SKILL.md → .gitea/workflows/e2e.yml
- `HTTPS mit eigener Domain (Caddy, On-Demand-TLS)` --semantically_similar_to--> `Coolify-API: Image-Tag setzen und Neustart auslösen`  [INFERRED] [semantically similar]
  README.md → .gitea/workflows/rollout.yml
- `Sprachregel: Nutzertexte deutsch, Bezeichner englisch` --semantically_similar_to--> `Anti-Patterns (verbotene Mittel)`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → DESIGN.md
- `Kontaktbogen auf dem Leuchttisch (Atmosphäre)` --semantically_similar_to--> `Kernversprechen: 0 % Kommission, Server in Deutschland, kein Lock-in`  [INFERRED] [semantically similar]
  DESIGN.md → ROADMAP.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Auslieferungskette: CI, E2E, Release, Rollout** — _gitea_workflows_ci_ci, _gitea_workflows_e2e_e2e, _gitea_workflows_release_release, _gitea_workflows_rollout_rollout, roadmap_ci_cd [EXTRACTED 1.00]
- **Design-Sprache: Palette, Typografie, Layout, Bewegung** — design_albumwerk_design_system, design_farbpalette, design_typografie, design_layout_sektionsrhythmus, design_motion, design_anti_patterns [EXTRACTED 1.00]
- **Dual-Lizenz-Modell und Beitragszusage** — license_dual_lizenz, license_polyform_noncommercial, contributing_cla, roadmap_lizenzmodell [INFERRED 0.85]
- **Ein Quellcode, zwei Auslieferungen (App + Embed)** — embed_index_booking_page, index_app_shell, docs_terminbuchung_embed_entry, docs_terminbuchung_features_booking, docs_terminbuchung_globignores [EXTRACTED 1.00]
- **Verkaufssperre: eine Prüfung, drei Durchsetzungsorte** — docs_verkaufsbereitschaft_verkaufslib, docs_verkaufsbereitschaft_endpunkt, docs_verkaufsbereitschaft_guard_409, docs_verkaufsbereitschaft_kundenansicht_sperre, docs_verkaufsbereitschaft_einrichtungspage [EXTRACTED 1.00]
- **Vorschau-Sitzung über Schattenkonto** — docs_kundenansicht_vorschau_schattenkonto, docs_kundenansicht_vorschau_session_endpunkt, docs_kundenansicht_vorschau_sitzungstrennung, docs_kundenansicht_vorschau_sweep, docs_kundenansicht_vorschau_postmessage_token [EXTRACTED 1.00]
- **Flow: Shooting/Album anlegen (Button, Formular, Karte)** — public_help_album_anlegen_01_neues_shooting_screen, public_help_album_anlegen_02_formular_screen, public_help_album_anlegen_03_angelegt_screen, public_help_album_anlegen_02_formular_shooting_konzept [EXTRACTED 1.00]
- **Flow: Album oeffnen als Kunde (Uebersicht, Bilder, Registrierung)** — public_help_album_oeffnen_01_uebersicht_screen, public_help_album_oeffnen_02_bilder_screen, public_help_album_oeffnen_03_registrieren_screen, public_help_album_oeffnen_03_registrieren_kundenkonto [EXTRACTED 1.00]
- **Flow: Album per QR teilen bis oeffentliche Ansicht** — public_help_album_teilen_qr_01_dialog_screen, public_help_album_teilen_qr_01_dialog_qr_code, public_help_album_teilen_qr_01_dialog_album_code, public_help_album_teilen_qr_02_oeffentliche_ansicht_screen, public_help_album_oeffnen_03_registrieren_kundenkonto [EXTRACTED 1.00]
- **Kundenfluss: Preise auswaehlen, Bezahlen, Download** — public_help_bestellen_bezahlen_01_schritte_screen, public_help_bestellen_bezahlen_02_produkt_waehlen_screen, public_help_bestellen_bezahlen_03_bezahlseite_screen, public_help_bestellen_bezahlen_01_schritte_stepper, public_help_bestellen_bezahlen_02_produkt_waehlen_summenleiste, public_help_bestellen_bezahlen_03_bezahlseite_kontaktformular [EXTRACTED 1.00]
- **Studio-Fluss: Bestellung eingegangen, Details pruefen, abschicken** — public_help_bestellungen_bearbeiten_01_eingegangen_screen, public_help_bestellungen_bearbeiten_02_details_screen, public_help_bestellungen_bearbeiten_02_details_status_ausstehend, public_help_bestellungen_bearbeiten_02_details_bestellung_abschicken, public_help_bestellungen_bearbeiten_02_details_positionen [EXTRACTED 1.00]
- **Bildverwaltung: Mehrfachauswahl und Bestaetigung vor dem Loeschen** — public_help_bild_sichtbarkeit_01_auswahl_screen, public_help_bild_sichtbarkeit_02_bestaetigen_screen, public_help_bild_sichtbarkeit_01_auswahl_mehrfachauswahl, public_help_bild_sichtbarkeit_02_bestaetigen_destruktive_bestaetigung [EXTRACTED 1.00]
- **Flow: Bilder hochladen (Album öffnen → Dialog → im Album)** — public_help_bilder_hochladen_01_album_oeffnen_screen, public_help_bilder_hochladen_02_dialog_screen, public_help_bilder_hochladen_03_im_album_screen, public_help_bilder_hochladen_02_dialog_upload_dialog, public_help_bilder_hochladen_02_dialog_dropzone [EXTRACTED 1.00]
- **Flow: Bilder auswählen (Auswahlmodus starten → Bilder markieren)** — public_help_bilder_auswaehlen_01_modus_starten_screen, public_help_bilder_auswaehlen_02_markiert_screen, public_help_bilder_auswaehlen_01_modus_starten_auswahlmodus, public_help_bilder_auswaehlen_02_markiert_auswahl_checkbox [EXTRACTED 1.00]
- **Kundenreise: Upload → Auswahl → Kauf → Downloads** — public_help_bilder_hochladen_03_im_album_album_galerie, public_help_bilder_auswaehlen_01_modus_starten_auswahlmodus, public_help_bilder_hochladen_01_album_oeffnen_preis_tags, public_help_downloads_nutzen_01_noch_leer_downloads_bereich [INFERRED 0.75]
- **Flow: Eigenen Hilfeartikel anlegen und veröffentlichen** — public_help_eigene_hilfeartikel_01_neuer_artikel_screen, public_help_eigene_hilfeartikel_01_neuer_artikel_button, public_help_eigene_hilfeartikel_02_formular_screen, public_help_eigene_hilfeartikel_02_formular_veroeffentlicht_toggle, public_help_eigene_hilfeartikel_02_formular_speichern, public_help_eigene_hilfeartikel_02_formular_hilfeartikel [EXTRACTED 1.00]
- **Flow: Hilfe anfordern per Supportanfrage** — public_help_hilfe_anfordern_01_neue_anfrage_screen, public_help_hilfe_anfordern_01_neue_anfrage_button, public_help_hilfe_anfordern_02_formular_screen, public_help_hilfe_anfordern_02_formular_thema, public_help_hilfe_anfordern_02_formular_senden, public_help_hilfe_anfordern_02_formular_supportanfrage [EXTRACTED 1.00]
- **Flow: Anmelden und Konto-/Adressdaten pflegen** — public_help_konto_passwort_01_anmelden_screen, public_help_konto_passwort_01_anmelden_anmelden_button, public_help_konto_passwort_02_adresse_screen, public_help_konto_passwort_02_adresse_kontaktinformationen, public_help_konto_passwort_02_adresse_adressinformationen, public_help_konto_passwort_01_anmelden_kundenkonto [EXTRACTED 1.00]
- **Stripe in 5 Schritten einrichten (Schlüssel eingeben, prüfen, Testmodus)** — public_help_zahlungen_stripe_01_schluesselfeld_screen, public_help_zahlungen_stripe_02_anleitung_screen, public_help_zahlungen_stripe_01_schluesselfeld_stripe_geheimschluessel, public_help_zahlungen_stripe_02_anleitung_stripe_dashboard_api_schluessel, public_help_zahlungen_stripe_01_schluesselfeld_speichern_und_pruefen, public_help_zahlungen_stripe_02_anleitung_testmodus_testkarte [EXTRACTED 1.00]
- **Produkt anlegen und im Preiskatalog verwalten** — public_help_preise_pakete_01_neues_produkt_screen, public_help_preise_pakete_02_katalog_screen, public_help_preise_pakete_01_neues_produkt_produktformular, public_help_preise_pakete_02_katalog_produktkatalog, public_help_preise_pakete_02_katalog_standard_katalog_einfuegen [EXTRACTED 1.00]
- **Betriebsdaten eingeben und Rechtstexte erzeugen** — public_help_rechtstexte_01_betriebsdaten_screen, public_help_rechtstexte_02_erzeugtes_impressum_screen, public_help_rechtstexte_01_betriebsdaten_betriebsdaten, public_help_rechtstexte_01_betriebsdaten_impressum_generator, public_help_rechtstexte_02_erzeugtes_impressum_impressum, public_help_rechtstexte_02_erzeugtes_impressum_richtext_editor [EXTRACTED 1.00]

## Communities (138 total, 61 thin omitted)

### Community 0 - "E2E-Fixtures & Cleanup"
Cohesion: 0.07
Nodes (37): main(), globalSetup(), Aufraeumbilanz, fixturesEntfernen(), BEISPIEL_PASSWORT, BEISPIELFOTOS, DEMO_ADMIN, here (+29 more)

### Community 1 - "Rich-Text-Editor & Hilfe-Banner"
Cohesion: 0.05
Nodes (57): @tiptap/react, @tiptap/starter-kit, HelpBanner(), persistDismissed(), Props, readDismissed(), INACTIVE_TOOLBAR, Props (+49 more)

### Community 2 - "App-Shell & Frontend-Telemetrie"
Cohesion: 0.07
Nodes (56): @grafana/faro-web-sdk, App(), HelpHint(), Props, s, IST_VORSCHAU, useSupportUnread(), AdminSupportPage() (+48 more)

### Community 3 - "Design-Presets & Settings"
Cohesion: 0.07
Nodes (53): @astryxdesign/core, react-dropzone, DEFAULT_PRESET, DESIGN_PRESETS, DesignPreset, getPreset(), AppSettings, DEFAULT_SETTINGS (+45 more)

### Community 4 - "iCal & Preview-Session-Hooks"
Cohesion: 0.05
Nodes (33): RFC-2606, RFC-5545, calendar(), escapeText(), event(), foldLine(), pad2(), toIcalDate() (+25 more)

### Community 5 - "Zahlungsanbieter-Formulare"
Cohesion: 0.10
Nodes (29): lucide-react, react-toastify, PaymentUnavailable(), PackageForm(), Props, s, Props, s (+21 more)

### Community 6 - "Hilfeartikel- & Support-Formulare"
Cohesion: 0.07
Nodes (38): Aktion: Neuer Artikel (Plus-Button), Screen: Button Neuer Artikel, Rich-Text-Editor für Inhalt, Hilfeartikel, Auswahl: Kategorie (Erste Schritte), Feld: Kurz-Link (/help/<Kurz-Link>), Feld: Kurzbeschreibung für Übersicht und Hilfe-Hinweise, Screen: Artikelformular Neuer Artikel (+30 more)

### Community 7 - "Routing & Layout-Shell"
Cohesion: 0.10
Nodes (25): dompurify, react-router-dom, s, empty, EmptyLayout(), Layout(), LayoutProps, ScrollToTop() (+17 more)

### Community 8 - "Termin-Admin-API"
Cohesion: 0.13
Nodes (33): apiError(), Appointment, AppointmentStatus, AppointmentType, AppointmentTypeInput, AvailabilityException, BookingApiError, cancelAsOwner() (+25 more)

### Community 9 - "Bildspeicher & Album-Download"
Cohesion: 0.15
Nodes (28): jszip, deleteImageByUrl(), fileAccessToken(), imageFileUrl(), ImageRef, listImages(), listPreviews(), originalFileUrl() (+20 more)

### Community 10 - "Branding- & Settings-Context"
Cohesion: 0.12
Nodes (22): ThemedApp(), BrandLogo(), SETTINGS_RECORD_ID, settingsFileUrl(), SettingsContext, useSettings(), PaymentSettings(), s (+14 more)

### Community 11 - "Profil & Album-Bilder"
Cohesion: 0.10
Nodes (24): PageLoader(), s, currentUser(), getRecord(), AlbumImage(), Props, s, thumbUrl() (+16 more)

### Community 12 - "Buchungs-Client-API"
Cohesion: 0.14
Nodes (29): AvailabilityResult, book(), BookingBranding, BookingError, BookingInput, BookingResult, BookingType, cancelAppointment() (+21 more)

### Community 13 - "Preiskatalog & Pakete"
Cohesion: 0.11
Nodes (27): CATEGORY_LABELS, CATEGORY_ORDER, categoryOf(), groupPrices(), packageTitle(), PriceCategory, priceTitle(), SIZE_SUGGESTIONS (+19 more)

### Community 14 - "Package-Manifest & Fonts"
Cohesion: 0.07
Nodes (31): engines, node, name, private, type, version, @astryxdesign/theme-neutral, @fontsource/familjen-grotesk (+23 more)

### Community 15 - "Frontend-Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @astryxdesign/core, @astryxdesign/theme-neutral, dompurify, @fontsource/familjen-grotesk, @fontsource/instrument-serif, @fontsource/inter, @fontsource/lora (+23 more)

### Community 16 - "Shooting anlegen (UI)"
Cohesion: 0.10
Nodes (30): Button "+ Neues Shooting" (gruener Primaer-CTA), Hilfe-Screenshot: Neues Shooting (Schritt 1), Feld "Beschreibung" (Textarea), Modal-Dialog "Shooting erstellen", Auswahl "Kunde(n)" (Dropdown, Bitte waehlen), Hilfe-Screenshot: Formular "Shooting erstellen" (Schritt 2), Konzept: Shooting (Auftrag mit Kunde und Typ), Auswahl "Shooting Typ" (Dropdown) (+22 more)

### Community 17 - "Checkout & Bestellabschluss"
Cohesion: 0.10
Nodes (21): allImages(), authoritativeTotal(), base64(), clampQty(), downloadableImages(), finalizeOrder(), isPackageOrder(), itemsTotal() (+13 more)

### Community 18 - "Slot-Berechnung"
Cohesion: 0.11
Nodes (24): addDays(), allowsType(), compareDates(), computeSlots(), isoWeekday(), isSlotBookable(), mergeWindows(), occupiedMinutesOf() (+16 more)

### Community 19 - "Slot-Picker & Datums-Utils"
Cohesion: 0.17
Nodes (23): fetchAvailability(), Props, SlotPicker(), addMonths(), CalendarDate, calendarDateAsUtc(), dateOf(), daysInMonth() (+15 more)

### Community 20 - "Bestell-Stepper-Screens"
Cohesion: 0.11
Nodes (26): Schritt 3: Download der gekauften Bilder, Screen: Bestell-Schrittanzeige, Dreistufiger Bestell-Stepper (Preise auswaehlen, Bezahlen, Download), Digitale Datei mit Download-Badge (Einzelbild in voller Aufloesung), Aktion: Fuer alle Bilder uebernehmen (Bulk-Bepreisung), Mengen-Stepper pro Produkt (Plus/Minus), Produktkatalog (Digitale Datei, Abzug 13x18, Abzug 20x30, Leinwand 40x60), Screen: Produkte fuer Bild 1 waehlen (+18 more)

### Community 21 - "Teilen-Dialog & Upload-UI"
Cohesion: 0.13
Nodes (18): Props, s, ShareDialog(), s, ShootingModal(), TYP_HINWEIS, formatBytes(), s (+10 more)

### Community 22 - "Auswahlmodus (UI)"
Cohesion: 0.11
Nodes (25): Auswahlmodus, Button "Bilder auswählen", Screenshot: Auswahlmodus starten, Auswahl-Häkchen auf Bildkachel, Bildraster mit Wasserzeichen-Vorschau, Screenshot: Markiertes Bild im Auswahlmodus, Album-Kopfbereich (Titel, Beschreibung, Kunde, Preis-Tags), Produkt- und Preis-Tags (Digitales Bild, Abzüge, Leinwand) (+17 more)

### Community 23 - "Preisformular & Bestellungen"
Cohesion: 0.12
Nodes (16): PricingForm(), calculateTotalPrice(), fetchUsers(), FinishedOrderLocal, getDateGroup(), isAllDownloadable(), OrderDetailPanel(), OrdersPage() (+8 more)

### Community 24 - "Buchungs-Benachrichtigungsmails"
Cohesion: 0.28
Nodes (22): cancellation(), customerConfirmation(), customerDecision(), detailsTable(), detailsText(), formatLocal(), formatTimeOnly(), heading() (+14 more)

### Community 25 - "Support-Postfach-Screens"
Cohesion: 0.13
Nodes (22): Screen: Support-Postfach, Status-Badges (Neu, Offen) an Anfragen, Statusfilter „Offen & wartend“ und Suche nach Betreff/Kunde, Support-Postfach (Kundenanfragen als Liste), Hilfe-Suche über Anleitungen und Themen, Screen: Hilfeseite „Wie können wir helfen?“, Ausklappbare Anleitung: PayPal in 5 Schritten einrichten, PayPal-Zugangsdaten (Client-ID, Secret, Geschäftskonto) (+14 more)

### Community 26 - "Buchungs-Hook-Bibliothek"
Cohesion: 0.15
Nodes (10): availabilityInput(), collidingBooking(), loadBookings(), loadExceptions(), loadRules(), msToPbDate(), openBookingsForEmail(), pbDateToMs() (+2 more)

### Community 27 - "Auth-Seiten & PocketBase-Login"
Cohesion: 0.14
Nodes (16): AuthHero(), Props, s, loginWithPocketBase(), signUpWithPocketBase(), ForgotPasswordPage(), s, LoginPage() (+8 more)

### Community 28 - "ErrorBoundary & Seitenrahmen"
Cohesion: 0.14
Nodes (16): ErrorBoundary(), ErrorState, Props, s, Page(), Props, s, SectionCard() (+8 more)

### Community 29 - "Release & Coolify-Rollout"
Cohesion: 0.14
Nodes (20): Multi-Arch-Manifest über QEMU und buildx, Gitea-Registry gitea.robinhm.de/robinmeister/albumwerk, Release-Workflow (Image-Build auf Tag-Push), Coolify-API: Image-Tag setzen und Neustart auslösen, Rollout-Workflow (Coolify-Instanzen aktualisieren), Bewusst manueller, gestaffelter Rollout, app-Service (PocketBase-Container aus der Registry), caddy-Service (Let's Encrypt, Reverse Proxy) (+12 more)

### Community 30 - "Admin-Nutzer & Empty States"
Cohesion: 0.15
Nodes (14): @stylexjs/stylex, EmptyState(), EmptyStateProps, s, getCategory(), groupByCategory(), AdminUsersPage(), toggleAdmin() (+6 more)

### Community 31 - "TypeScript-Konfiguration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+11 more)

### Community 32 - "Produktformular & Katalog (UI)"
Cohesion: 0.15
Nodes (18): Automatischer Titel bei leerem Titelfeld, Toggle: Digitaler Download (keine Lieferadresse nötig), Produktformular (Produktart, Größe, Preis, Titel, Beschreibung), Screen: Neues Produkt anlegen, Aktion: Speichern / Abbrechen, Tabs: Einzelpreise / Pakete, Produkt bearbeiten (Master-Detail-Layout), Produktkatalog (gruppiert nach Produktart) (+10 more)

### Community 33 - "Shooting-Seiten & Album-Karten"
Cohesion: 0.18
Nodes (13): linkShootingToCurrentUser(), AddShootingDialog(), Props, s, AddShootingPage(), s, s, ShootingInfo (+5 more)

### Community 34 - "Auth-Store & Lösch-Modal"
Cohesion: 0.23
Nodes (9): DeleteModal(), Props, s, AuthUser, LinkShootingResult, MemoryAuthStore, pb, AuthContext (+1 more)

### Community 35 - "Verfügbarkeitsregeln"
Cohesion: 0.21
Nodes (14): AvailabilityRule, AvailabilityRuleInput, deleteRule(), fetchRules(), fetchTypes(), saveRule(), formatWindow(), minutesToTime() (+6 more)

### Community 36 - "Gitea-Actions CI/CD"
Cohesion: 0.15
Nodes (14): act_runner Registrierung, ci.yml — Typecheck, Build, Syntaxprüfung, Gestaffeltes Ausrollen, CI/CD über Gitea Actions, make release (manueller Fallback), Multi-Arch-Manifest (amd64 + arm64), REGISTRY_USER / REGISTRY_TOKEN / COOLIFY_*, release.yml — Image bauen und pushen (+6 more)

### Community 37 - "Terminarten & Embed-Seite"
Cohesion: 0.21
Nodes (11): react, deleteType(), saveType(), AppointmentsTabs(), s, TABS, AppointmentTypesPage(), EMPTY (+3 more)

### Community 38 - "AppShell-Navigation & Speicheranzeige"
Cohesion: 0.19
Nodes (12): AppShell(), CONTENT_MAX_WIDTH, isActive(), leseZugeklappt(), Props, s, SIDEBAR_WIDTH, formatGb() (+4 more)

### Community 39 - "Dev-Instanz Verify-Rezept"
Cohesion: 0.21
Nodes (13): Ins Image gebackene pb_hooks/pb_migrations/pb_public, Dev-Instanz albumwerk-dev (Port 8091, Mailpit 8025), MuiModal-Selektorfalle im Bestätigungsdialog, Manuelle UI-Steuerung per Playwright (gecachte Chromium-Binary), Verify-Rezept (React + PocketBase), Eigener Compose-Projektname albumwerk-e2e und eigener Port, E2E-Workflow (Playwright gegen frische Dev-Instanz), Erreichbarkeits-Probe mit Netz-Join und curl-Zeitlimit (+5 more)

### Community 40 - "Wasserzeichen-Vorschauen & Verhaltenskodex"
Cohesion: 0.18
Nodes (13): previews.pb.js — Wasserzeichen-Vorschauen und Kaskadenlöschung, Superuser-Token für API-Tests, Contributor Covenant 2.1, Durchsetzung per vertraulicher Meldung, Verhaltenskodex, Lizenzzusage für Beiträge (Dual-Lizenz-CLA), Mitwirken (Contributing-Leitfaden), Source-available Dual-Lizenz (+5 more)

### Community 41 - "Dev-Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @playwright/test, sharp, @stylexswc/unplugin, tsx, @types/node, @types/react, @types/react-dom (+5 more)

### Community 42 - "NPM-Skripte"
Cohesion: 0.18
Nodes (11): scripts, build, dev, e2e, e2e:check, e2e:clean, lint, preview (+3 more)

### Community 43 - "Monatskalender-Raster"
Cohesion: 0.25
Nodes (10): DaySummary, describe(), markers(), MonthGrid(), Props, s, WEEKDAY_LABELS, compareDates() (+2 more)

### Community 44 - "Design-System-Regeln"
Cohesion: 0.24
Nodes (10): Sprachregel: Nutzertexte deutsch, Bezeichner englisch, Albumwerk Design System, Anti-Patterns (verbotene Mittel), Farbpalette: Barytpapier, Filmträger, Ablage, Fettstift — genau ein Akzent, Farbe als Markierung, Referenzabzug kira-learning.com (Framer, 09/2026), Komponenten-Stilregeln (Buttons, Karten, Bildplatten, Inputs), Sektionsrhythmus und Container-Raster (+2 more)

### Community 45 - "Akzentfarbe & Mail-Theming"
Cohesion: 0.20
Nodes (10): Astryx normalisiert die Akzent-Helligkeit, lib/emaillib.js — Akzentbalken in Mails, Knopfregel — Füllung auf variant:primary, Design-Presets Implementierungsplan, primaryColor = Markierungsfarbe, secondaryColor = Tinte, SMTP-Versand über eigenes Postfach, Benachrichtigungen und Cron-Job, Missbrauchsabwehr ohne Captcha und Double-Opt-in (+2 more)

### Community 46 - "Preset-Wähler-Umsetzung"
Cohesion: 0.20
Nodes (10): BrandingPage mit Preset-Wähler, buildAstryxTheme(settings), DesignPreset (defaults + register), Preset passepartout, Importrichtung designPresets.ts → settings.ts, Task 2: Preset-Katalog, Task 5: Register in buildAstryxTheme, Preset riss (+2 more)

### Community 47 - "Verkaufsbereitschaft-Plan"
Cohesion: 0.20
Nodes (10): Task 7: End-to-End-Absicherung, Kein npm run lint (tote Toolchain), globIgnores braucht drei Muster, Hooks werden in dev nicht gemountet (make dev nötig), Verkaufsbereitschaft Implementierungsplan, Verkaufsbereitschaft als erstklassiger Zustand, help-shots.mjs — PNG nach WebP unter public/help, Screenshot-Regeln aus konkreten Fehlern (+2 more)

### Community 48 - "Vorschau-Sitzungstrennung"
Cohesion: 0.20
Nodes (10): Alphabetisch erste Galerie statt zuletzt angelegter, Task 3: Sitzungstrennung im Client, Task 4: Die Vorschau-Oberfläche, users-ID ohne Autogenerate-Muster (Firebase-Altlast), Token per postMessage, nie über die URL, Sitzungstrennung über BaseAuthStore-Weiche, Migrations-Checkliste, src/config/pocketbase.ts — pb und pbAdminAuth.login() (+2 more)

### Community 49 - "Buchungs-Leitplanken"
Cohesion: 0.20
Nodes (10): Ausnahmen sind Zeiträume, keine Slot-Referenzen, ICS-Import als Sperrzeiten (source: imported), Import niemals still öffnen (fail-closed), Keine Zahlung bei der Buchung, Leitplanken (Vorlauf, Puffer, Horizont, Tageslimit), Verworfen: OAuth-Kalendersynchronisation, Starres Raster am Fensterbeginn, slugify nach src/utils/slug.ts gezogen (+2 more)

### Community 50 - "CI-Jobs & Hilfebild-Prüfung"
Cohesion: 0.25
Nodes (9): CI-Job backend-syntax (node --check, bash -n), Hilfe-Bilder gegen Artikel prüfen (check-help-images.mjs), CI-Workflow (Typecheck, Build, Syntax), CI-Job frontend auf glibc statt Alpine, Unit-Tests des Verfügbarkeitsrechners (pb_hooks/lib), Prüfen vor dem Push (lint, test, build, e2e), E2E-Suite mit 23 Strecken, Hilfe-Center mit bebilderten Artikeln (+1 more)

### Community 51 - "Schattenkonto-Handhabung"
Cohesion: 0.22
Nodes (9): AdminUsersPage filtert Schattenkonten aus, Grenzen der Aussagekraft (keine Bestellhistorie), Kundenname wird nicht kopiert, Serverseitiges Admin-Check-Idiom, Task 2: Endpunkte und Sweep, Schattenkonto (kurzlebiges Spiegelkonto), POST/DELETE /api/custom/preview/session, Verworfene Vorschau-Alternativen (+1 more)

### Community 52 - "Support-Weiterleitung"
Cohesion: 0.44
Nodes (8): buildReport(), env(), escapeHtml(), forwardTicket(), instanceInfo(), mailReport(), ticketMessages(), vendorConfig()

### Community 53 - "Hilfebild-Prüfskript"
Cohesion: 0.22
Nodes (7): ARTIKEL_DIR, BILD_DIR, fehlend, ungenutzt, vorhanden, vorhandeneBilder(), wurzel

### Community 54 - "Bild-Upload-Hook"
Cohesion: 0.31
Nodes (8): uploadImage(), DuplicatePrompt, makeId(), sleep(), UploadItem, UploadItemStatus, UploadPhase, useImageUpload()

### Community 55 - "Multi-Tenant-Grenze"
Cohesion: 0.25
Nodes (8): Settings-Singleton als Tenant-Grenze, Echtes Multi-Tenant (tenantId in jeder Rule), Wann-Kriterien (Gate), GET /api/custom/verkaufsbereitschaft, Dateiübersicht neu/geändert, verkauf-Feld an SettingsContext statt neuem Provider, Projekt einstellungen läuft zuletzt und seriell (appsettings0001), Playwright-Projekte desktop, mobil, einstellungen

### Community 56 - "QR-Scanner"
Cohesion: 0.29
Nodes (6): jsqr, BarcodeDetectorLike, decodeFrame(), Props, QrScanner(), s

### Community 57 - "Shooting- & Preis-Abrufe"
Cohesion: 0.36
Nodes (6): getShootingCoverUrl(), AdminAlbumPage(), fetchShootings(), AlbumPage(), fetchShootings(), handleAdded()

### Community 58 - "Preset-Migration & Overrides"
Cohesion: 0.29
Nodes (7): Ansatz A — Spalten tragen den effektiven Wert, Preset kontaktbogen, Migration 1785600001_design_presets.js (Backfill + down), Task 3: Override-Logik, Task 4: Settings-Felder und Migration, themeOverrides — Liste bewusst gesetzter Felder, Verworfene Preset-Alternativen

### Community 59 - "PWA-Manifest & Themefarbe"
Cohesion: 0.33
Nodes (7): manifest.pb.js — PWA theme_color, Restpunkt: zwei widersprüchliche Themefarb-Kanäle, meta robots noindex für die Embed-Seite, index.html — App-Einstieg, Titel, Icons und theme-color als Laufzeit-Fallbacks, link rel=manifest auf /api/custom/manifest.webmanifest, robots.txt — alles erlaubt

### Community 60 - "Kundenansicht-Vorschau-Plan"
Cohesion: 0.29
Nodes (7): Kundenansicht-Vorschau Implementierungsplan, Kundenansicht-Vorschau (Beschlusslage), Zwei Kundenansichten: /publicAlbum und /album, /branding zerfällt in vier Seiten, SettingsSection — geteilte Bausteine der Einstellungsseiten, useSettingsDraft — gemeinsames Speichern, Der Einrichtungs-Wizard entfällt

### Community 61 - "Selfhosting-Checkliste"
Cohesion: 0.29
Nodes (7): Installation über docker compose (Image oder Quellcode), Einrichtungs-Checkliste unter /einrichtung, Eigene bookingNotificationEmail, /einrichtung — die Checkliste, Harte Punkte: zahlung, katalog, recht, bestellmail, setupCompleted = „Checkliste einmal gesehen“, src/utils/verkauf.ts (Beschriftungen, Zielrouten, Ableitungen)

### Community 62 - "Embed-Auslieferung & CSP"
Cohesion: 0.33
Nodes (7): Eigener schlanker Vite-Entry für das Embed, Etappenplan der Terminbuchung, src/features/Booking — ein Quellcode, zwei Auslieferungen, CSP frame-ancestors: Allowlist nur für /embed*, Snippet-Generator mit postMessage-Höhenanpassung, Terminbuchung (Beschlusslage), embed/index.html — eingebettete Terminbuchung

### Community 63 - "Vorschau-Warteschlange"
Cohesion: 0.38
Nodes (3): claim(), drain(), requeueFailed()

### Community 64 - "Node-TS-Konfiguration"
Cohesion: 0.29
Nodes (6): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, include

### Community 65 - "Selbstgehostete Fonts & Support-Opt-in"
Cohesion: 0.33
Nodes (6): FontKey vs. FontStackKey, Selbst gehostete @fontsource-Pakete (kein Font-CDN), Schriftregel (geerbtes Schriftpaar vs. eine Schrift), Support-Weiterleitung nur mit SAAS_CONTROL_URL / VENDOR_SUPPORT_EMAIL, Datenschutz: keine Cookies, kein localStorage, Anonymisieren, Bewusst kein Manifest, kein Service Worker, keine CDN-Ressourcen

### Community 66 - "JSVM-Laufzeitgrenzen"
Cohesion: 0.33
Nodes (6): JSON-Felder kommen im JSVM als rohe Bytes, Bestätigungsmodus pro Art, blockierende Anfragen, pb_hooks/lib/bookinglib.js (inkl. guard()), JSVM-Handler laufen in isolierten Runtimes, Schreibweg ausschließlich über eigene Endpunkte, JSVM-Grenzen: Goja, nur require(__hooks + …)

### Community 67 - "Hilfe-Screenshot-Skript"
Cohesion: 0.33
Nodes (5): pngDateien(), QUELLE, root, ZIEL, sharp

### Community 68 - "E-Mail-Template-Bibliothek"
Cohesion: 0.53
Nodes (4): brandShell(), button(), escapeHtml(), readBrand()

### Community 69 - "Roadmap & Kernversprechen"
Cohesion: 0.40
Nodes (5): Kontaktbogen auf dem Leuchttisch (Atmosphäre), Albumwerk Roadmap, Kernversprechen: 0 % Kommission, Server in Deutschland, kein Lock-in, Phase 0 — Launch-Blocker (Secrets, Rotation), Ponytail-Audit (toten Code und Kompatibilitätsschichten entfernt)

### Community 70 - "Verkaufssperre & Backups"
Cohesion: 0.40
Nodes (5): Backup & Wiederherstellung, Guard mit HTTP 409 in beiden Zahlungswegen, Sperre betrifft nur den Kauf-Weg, Kundentext nennt nie einen Grund, Nicht abgedeckt: Bezahlvorgänge, DNS, Backups

### Community 71 - "Abgeleitete Slots ohne Schemafeld"
Cohesion: 0.40
Nodes (5): Slots werden berechnet, nie materialisiert, Kein neues Schema-Feld (alles ableitbar), leseWerte(app) getrennt von der reinen Prüfung, pruefeVerkaufsbereitschaft in pb_hooks/lib/verkaufslib.js, Weiche Punkte (nur Hinweis)

### Community 72 - "Bildvorschau-Swiper"
Cohesion: 0.40
Nodes (4): react-swipeable, ImagePreview(), Props, s

### Community 73 - "Embed-Höhenmeldung"
Cohesion: 0.70
Nodes (3): reportHeight(), Embed(), readPreselectedType()

### Community 74 - "Embed-Origin-Allowlist"
Cohesion: 0.83
Nodes (3): embedAncestors(), hostOf(), originsFor()

### Community 75 - "Design-Preset-Migration"
Cohesion: 0.50
Nodes (3): ALT, ALT_FONTS, KONTAKTBOGEN

### Community 76 - "Seitenleiste mit nativen <details>-Grupp"
Cohesion: 0.67
Nodes (3): Abweichung: Reiter statt Navigationsgruppe, Wo der gesperrte Zustand sichtbar wird, Seitenleiste mit nativen <details>-Gruppen

## Ambiguous Edges - Review These
- `Kein npm run lint (tote Toolchain)` → `Verkaufsbereitschaft Implementierungsplan`  [AMBIGUOUS]
  docs/design-presets-plan.md · relation: conceptually_related_to
- `Konzept: Shooting (Auftrag mit Kunde und Typ)` → `Konzept: Album (Kundenansicht einer Bildersammlung)`  [AMBIGUOUS]
  public/help/album-anlegen/02-formular.webp · relation: conceptually_related_to
- `Karten-Aktionen: Bearbeiten, Hochladen/Teilen, Loeschen` → `Album-Code e2e19q7beiwpbvi als manueller Fallback`  [AMBIGUOUS]
  public/help/album-anlegen/03-angelegt.webp · relation: conceptually_related_to
- `Schritt 3: Download der gekauften Bilder` → `Zustand: Online-Zahlung nicht eingerichtet (Fallback Direktkontakt)`  [AMBIGUOUS]
  public/help/bestellen-bezahlen/03-bezahlseite.webp · relation: conceptually_related_to
- `Mehrfachauswahl von Bildern (Checkbox-Overlay)` → `Bildsichtbarkeit in der Galerie`  [AMBIGUOUS]
  public/help/bild-sichtbarkeit/01-auswahl.webp · relation: conceptually_related_to
- `Album-Kopfbereich (Titel, Beschreibung, Kunde, Preis-Tags)` → `CTA "Zum Album" + Hilfe-Link "Bilder herunterladen"`  [AMBIGUOUS]
  public/help/downloads-nutzen/01-noch-leer.webp · relation: references
- `Produkt- und Preis-Tags (Digitales Bild, Abzüge, Leinwand)` → `Downloads-Bereich (gekaufte/freigeschaltete Bilder)`  [AMBIGUOUS]
  public/help/downloads-nutzen/01-noch-leer.webp · relation: conceptually_related_to
- `Hilfeartikel` → `Feld: Beschreibung`  [AMBIGUOUS]
  public/help/hilfe-anfordern/02-formular.webp · relation: conceptually_related_to
- `Support-Postfach (Kundenanfragen als Liste)` → `Hilfe-Suche über Anleitungen und Themen`  [AMBIGUOUS]
  public/help/support-postfach/01-postfach.webp · relation: conceptually_related_to
- `Secret serverseitig gespeichert, nie im Browser angezeigt` → `Geheimer Stripe-Schlüssel (sk_live_…)`  [AMBIGUOUS]
  public/help/zahlungen-stripe/01-schluesselfeld.webp · relation: rationale_for

## Knowledge Gaps
- **405 isolated node(s):** `docker-entrypoint.sh script`, `root`, `QUELLE`, `ZIEL`, `Aufraeumbilanz` (+400 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 591 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **61 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Kein npm run lint (tote Toolchain)` and `Verkaufsbereitschaft Implementierungsplan`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Konzept: Shooting (Auftrag mit Kunde und Typ)` and `Konzept: Album (Kundenansicht einer Bildersammlung)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Karten-Aktionen: Bearbeiten, Hochladen/Teilen, Loeschen` and `Album-Code e2e19q7beiwpbvi als manueller Fallback`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Schritt 3: Download der gekauften Bilder` and `Zustand: Online-Zahlung nicht eingerichtet (Fallback Direktkontakt)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Mehrfachauswahl von Bildern (Checkbox-Overlay)` and `Bildsichtbarkeit in der Galerie`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Album-Kopfbereich (Titel, Beschreibung, Kunde, Preis-Tags)` and `CTA "Zum Album" + Hilfe-Link "Bilder herunterladen"`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Produkt- und Preis-Tags (Digitales Bild, Abzüge, Leinwand)` and `Downloads-Bereich (gekaufte/freigeschaltete Bilder)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._