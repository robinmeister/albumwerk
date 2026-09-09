# Mitwirken

Danke für dein Interesse an Albumwerk. Das Projekt ist source-available, nicht
klassisch Open Source — lies bitte den Abschnitt [Lizenz und
Beiträge](#lizenz-und-beiträge), bevor du Zeit in einen Patch steckst.

## Fehler melden

Ein gutes Issue enthält: was du getan hast, was du erwartet hast, was passiert
ist, und die Version aus dem Footer der App. Bei Zahlungs- oder Mailproblemen
bitte zusätzlich den relevanten Ausschnitt aus `make logs`.

**Sicherheitslücken bitte nicht als Issue melden**, sondern per Mail an
hamm.robin162@gmail.com.

## Entwicklungsumgebung

```bash
make hooks     # Secret-Scan-Hook aktivieren (einmalig, vor dem ersten Commit)
make dev       # App auf :8091, Mailpit auf :8025, Demo-Daten inklusive
```

Zugangsdaten der Demo-Instanz stehen im README. `make dev-reset` setzt die
Instanz zurück, `make dev-stop` hält sie an.

## Prüfen vor dem Push

```bash
npm run lint        # ESLint
npm run test        # Unit-Tests (Vitest)
npm run build       # tsc + Vite-Build
npm run e2e         # Playwright, braucht eine laufende Dev-Instanz
```

CI führt dasselbe aus (`.gitea/workflows/ci.yml`). Neue Logik mit Verzweigungen,
Preisberechnung oder Zugriffsprüfung braucht mindestens einen Test, der
fehlschlägt, wenn die Logik bricht.

## Änderungen einreichen

- Ein Thema pro Pull Request. Große Umbauten vorher als Issue besprechen.
- Commit-Betreff im Imperativ und in einer Zeile, wie in der bestehenden
  History (`git log --oneline`).
- Kommentare und Nutzertexte auf Deutsch, Code und Bezeichner auf Englisch —
  so hält es der bestehende Code.
- Keine neue Abhängigkeit ohne Begründung im Pull Request.

## Lizenz und Beiträge

Albumwerk wird doppelt lizenziert: kostenlos für nicht-kommerzielle Nutzung
unter der PolyForm Noncommercial License 1.0.0, kommerzielle Nutzung nur mit
gekaufter Lizenz (siehe [LICENSE.md](LICENSE.md)).

Damit dieses Modell funktioniert, gilt für jeden Beitrag: Du bestätigst, dass
du den Beitrag selbst verfasst hast und ihn einreichen darfst, und du erteilst
Robin Hamm ein unbefristetes, weltweites, unwiderrufliches Recht, deinen
Beitrag unter beiden Lizenzen zu verwenden — auch unter der kommerziellen. Ohne
diese Zusage kann ein Beitrag nicht übernommen werden. Du behältst dein
Urheberrecht am Beitrag.
