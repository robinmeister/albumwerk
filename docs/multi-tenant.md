# Multi-Tenant-Evaluation (Momentaufnahme)

> **Stand: 2026-07-21, 0 zahlende Kunden.** Dieses Dokument ist die in der
> Roadmap (Phase 4) vorgesehene Evaluation — bewusst *vor* dem Bedarfsfall
> geschrieben. Die Zahlen und Einschätzungen bei Erreichen des Gates
> (~mehrere hundert Kunden) neu prüfen; bis dahin gilt: **nicht umbauen.**

## Ist-Architektur: eine Instanz pro Kunde

Bewusste Entscheidung vom 2026-07-08: jede Kundin bekommt einen eigenen
Container (eigene SQLite-DB, eigener Datei-Speicher, eigenes Branding über das
Settings-Singleton). Provisionierung, SSL, Monitoring und Backups sind seit
Phase 3 automatisiert (`saas/`, Coolify, Uptime Kuma, rclone-Sync).

**Reale Betriebskosten pro Kunde (Hetzner, Stand heute):**

| Posten | Wert |
|---|---|
| RAM pro Instanz (PocketBase + Vorschau-Generierung) | ~200–400 MB |
| Instanzen pro CX42 (16 GB RAM, ~17 €/Monat) | ~30–40 komfortabel |
| Hosting-Kosten pro Kunde | **~0,45–0,60 €/Monat** |
| SaaS-Preis pro Kunde | 9–29 €/Monat |

Die Marge lässt viel Raum: Hosting ist ~2–6 % vom Umsatz. **Kosten sind kein
Grund für Multi-Tenant** — auch nicht bei mehreren hundert Kunden.

## Was VOR Multi-Tenant kommt: horizontales Sharding

Das heutige Modell skaliert linear, ohne Code-Umbau:

1. **Mehr/größere VPS**: Coolify verwaltet mehrere Server; `provision.sh`
   übergibt `server_uuid` pro App — neue Kunden auf den am wenigsten
   ausgelasteten Server zu legen ist eine Kleinigkeit (Auswahl-Logik in
   `saas/provision/provision.sh` bzw. `provisionlib.js`).
2. **Updates in O(n)** sind durch `rollout.yml` (CI) bereits gestaffelt
   automatisiert; die Dauer wächst linear, bleibt aber unbeaufsichtigt.
3. Zentrale Backups/Monitoring skalieren mit (rclone-Sync iteriert Volumes,
   Kuma verkraftet hunderte Monitore).

Damit trägt die Architektur realistisch bis **~300–500 Kunden auf 10–15 VPS**,
bevor die Betriebslast (nicht die Kosten) unangenehm wird.

## Option „echtes Multi-Tenant" — ehrlicher Umbauumfang

Eine gemeinsame PocketBase-Instanz für alle Kunden würde bedeuten:

- **`tenantId` in jedem Schema und jeder API-Rule** (users, shootings, images,
  orders, prices, packages, paymentIntents, settings…) — jede Rule-Lücke ist
  ein **Datenleck zwischen Fotografen-Geschäften** (DSGVO-GAU, direkter
  Widerspruch zum Datenhoheits-USP).
- **Settings-Singleton weg**: Branding/Zahlungs-Secrets/SMTP pro Tenant —
  der komplette `SettingsContext`/Theming/Hooks-Unterbau ändert sich.
- **Datei-Layer**: File-Tokens & protected-Felder sind collection-weit; Pfade,
  Backups und Restore müssten tenant-scoped nachgebaut werden. Restore eines
  einzelnen Kunden aus einem Gesamt-Backup ist erheblich schwieriger.
- **Blast-Radius**: heute betrifft ein Absturz/eine Korruption genau einen
  Kunden; dann alle.
- **SQLite** ist bei hunderten aktiven Tenants in einer DB die falsche Basis →
  faktisch auch noch DB-Wechsel (Postgres) = PocketBase verlassen oder forken.

Aufwandsschätzung: **Monate**, quer durch jede Schicht, mit dauerhaftem
Sicherheits-Mehraufwand — gegen ~0,50 €/Kunde/Monat Ersparnis.

## Wann-Kriterien (Gate neu bewerten, wenn EINES reißt)

- [ ] Hosting-Kosten pro Kunde > ~10 % des Kunden-Umsatzes
- [ ] Rollout aller Instanzen dauert > 1 Arbeitstag oder schlägt regelmäßig fehl
- [ ] Betriebs-/Incident-Last der Instanz-Flotte > ~5 h/Woche trotz Automatisierung
- [ ] > ~500 Instanzen und Coolify/Server-Verwaltung wird selbst zum Engpass

## Empfehlung

**Beim Instanz-pro-Kunde-Modell bleiben.** Bei Wachstum zuerst Server-Sharding
(Punkt oben, trivial), dann ggf. Betriebs-Tooling verbessern. Echtes
Multi-Tenant nur, wenn die Wann-Kriterien reißen — und dann eher als separates
Produkt-Redesign denn als Umbau.
