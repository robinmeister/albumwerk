# Albumwerk

Eine selbst gehostete Album- und Bestellplattform für Fotografen:
Kunden sehen ihre Shootings mit wasserzeichengeschützten Vorschauen, wählen
Bilder aus, bezahlen per PayPal oder Stripe und laden ihre Fotos herunter.
Design, Logo, Farben und Texte passen Sie ohne technisches Wissen direkt in
der Anwendung an.

**Alles läuft auf Ihrem eigenen Server in einem einzigen Docker-Container** —
Ihre Fotos und Kundendaten bleiben bei Ihnen.

> **Ausführliche Anleitung:** [docs/selfhosting.md](docs/selfhosting.md) —
> Installation (auch ohne dieses Repo, per fertigem Image),
> Update, Backup und Fehlerbehebung Schritt für Schritt.

---

## Was Sie brauchen

- **Einen Server oder Rechner mit [Docker](https://docs.docker.com/engine/install/)**
  (inklusive Docker Compose). Ein kleiner Mietserver (VPS mit 1 CPU und
  1–2 GB RAM, ca. 5 €/Monat) reicht völlig aus.
- **`make`** — auf den meisten Linux-Servern schon vorhanden. Falls nicht:
  `sudo apt install make`. (Alle Befehle gehen zur Not auch ohne `make`,
  siehe [unten](#ohne-make).)
- Optional: eine **eigene Domain** (z. B. `fotos.ihre-domain.de`) — für HTTPS
  empfohlen.
- Ein **E-Mail-Postfach mit SMTP-Zugang** (haben Sie bei Ihrem Mail-Anbieter
  automatisch) für Bestell- und Verifizierungsmails.

---

## Eigene Instanz aufsetzen (ca. 5 Minuten)

### Schritt 1: Projekt auf den Server holen

```bash
git clone <URL-DIESES-REPOSITORYS>
cd kathis_platform
```

(Alternativ den Projektordner z. B. per SFTP auf den Server kopieren und
hineinwechseln.)

### Schritt 2: Zugangsdaten festlegen

```bash
cp .env.example .env
nano .env
```

In der Datei tragen Sie Ihre E-Mail-Adresse und ein **selbst gewähltes,
sicheres Passwort** (mindestens 10 Zeichen) ein. Damit melden Sie sich später
am Administrations-Backend an. Speichern mit `Strg+O`, schließen mit `Strg+X`.

### Schritt 3: Starten

```bash
make prod
```

Der erste Start baut die Anwendung und dauert ein paar Minuten. Danach ist
die App unter `http://IHRE-SERVER-ADRESSE:8090` erreichbar.

### Schritt 4: Erste Schritte nach dem Start

1. **Eigenen Benutzer anlegen:** Öffnen Sie das PocketBase-Backend unter
   `http://IHRE-SERVER-ADRESSE:8090/_/` und melden Sie sich mit den
   Zugangsdaten aus Schritt 2 an. Legen Sie unter *Collections → users* Ihren
   persönlichen Benutzer an und setzen Sie den Haken bei `isAdmin` (und bei
   `verified`). Alternativ: über die App registrieren und den Haken danach im
   Backend setzen.

2. **Einrichtungs-Checkliste:** Melden Sie sich in der App
   (`http://IHRE-SERVER-ADRESSE:8090`) mit diesem Benutzer an — Sie landen
   auf **Einrichtung**. Die Checkliste zeigt jederzeit, was bis zum Verkauf
   der Fotos noch fehlt:
   - Zahlungsanbieter, Preise, Impressum und Datenschutz, Bestell-E-Mail
     sind Pflicht — ohne sie ist der Bilderkauf gesperrt
   - Name, Logo, Kontakt-E-Mail, eigene Domain und Wasserzeichen sind
     empfohlen, aber keine Voraussetzung

   Alben hochladen können Sie sofort. Die Checkliste ist jederzeit unter
   **Einrichtung** erreichbar, jeder Punkt verlinkt auf die passende Seite.

3. Danach: [E-Mail-Versand](#e-mail-versand-einrichten-smtp) und
   [Zahlungen](#zahlungen-einrichten-paypal-undoder-stripe) einrichten —
   und für den echten Betrieb [HTTPS](#https-mit-eigener-domain-empfohlen).

---

## Demo ausprobieren / Entwickeln

Zum Ausprobieren (oder Weiterentwickeln) gibt es eine **Dev-Instanz mit
fertigen Demo-Daten** — Demo-Fotograf, Demo-Kunde, ein Beispiel-Shooting mit
Bildern samt Wasserzeichen-Vorschauen und eine offene Bestellung:

```bash
make dev
```

| Was | Adresse | Anmeldung |
| --- | --- | --- |
| App (Fotograf/Admin) | http://localhost:8091 | `admin@demo.test` / `demo123456` |
| App (Kundensicht) | http://localhost:8091 | `kunde@demo.test` / `demo123456` |
| PocketBase-Backend | http://localhost:8091/_/ | `admin@demo.test` / `demo123456` |
| Mailpit (fängt alle E-Mails ab) | http://localhost:8025 | — |

Es werden **keine echten E-Mails verschickt**: Mailpit fängt alles ab und
zeigt es im Browser an. Der E-Mail-Versand ist automatisch darauf eingestellt.

Die Dev-Instanz benutzt ein eigenes Docker-Volume und ist komplett von einer
Produktions-Instanz (Ordner `pb_data`) getrennt. Weitere Befehle:

```bash
make dev-reset   # alles löschen und frisch mit Demo-Daten starten
make dev-stop    # stoppen (Daten bleiben erhalten)
make dev-logs    # Logs ansehen
```

---

## E-Mail-Versand einrichten (SMTP)

Bestellbestätigungen und Verifizierungsmails werden über Ihr eigenes
E-Mail-Postfach verschickt:

1. PocketBase-Backend öffnen: `http://IHRE-SERVER-ADRESSE:8090/_/`
2. **Settings → Mail settings**:
   - *Sender address*: z. B. `info@ihre-domain.de`
   - *SMTP*: aktivieren und Host, Port, Benutzername, Passwort Ihres
     Mail-Anbieters eintragen (finden Sie in dessen Hilfe unter „SMTP“).
   - Mit *Send test email* prüfen.
3. **Settings → Application**: bei *Application URL* die Adresse eintragen,
   unter der Ihr Album erreichbar ist (z. B. `https://fotos.ihre-domain.de`).
   Diese Adresse wird in den E-Mail-Links verwendet.

## Zahlungen einrichten (PayPal und/oder Stripe)

Die komplette Einrichtung passiert in der App unter **Zahlungen** — dort
finden Sie zu beiden Anbietern eine Schritt-für-Schritt-Anleitung.
Kurzfassung:

- **PayPal:** Auf [developer.paypal.com](https://developer.paypal.com) mit dem
  PayPal-Geschäftskonto anmelden, unter *Apps & Credentials* eine App anlegen
  und die **Client ID** (Live) in der App unter **Zahlungen** eintragen.
- **Stripe (Kreditkarte, Apple Pay, Google Pay):** Auf
  [stripe.com](https://stripe.com) ein Konto erstellen, im Dashboard unter
  *Entwickler → API-Schlüssel* den **Geheimschlüssel** (`sk_live_…`) kopieren
  und in der App unter **Zahlungen** speichern. Der Schlüssel bleibt auf dem
  Server und wird nie im Browser angezeigt.

Beide Anbieter können parallel aktiv sein — die Kunden wählen dann beim
Bezahlen. Zum Testen ohne echtes Geld: Stripe-Testschlüssel (`sk_test_…`)
bzw. PayPal-Sandbox verwenden.

## HTTPS mit eigener Domain (empfohlen)

Die Domain wird in der App unter **Einstellungen → Domain** eingetragen — die
`Caddyfile` muss dafür *nicht* mehr editiert werden. Caddy holt das Zertifikat
automatisch nur für die dort hinterlegte Domain (On-Demand-TLS).

1. Eine Subdomain (z. B. `fotos.ihre-domain.de`) per DNS-A-Record (optional
   zusätzlich AAAA für IPv6) auf die IP Ihres Servers zeigen lassen.
2. Ports **80** und **443** in der Firewall öffnen. Der `caddy`-Dienst ist in
   `docker-compose.yml` bereits aktiv.
3. `make prod` starten und die Instanz einmalig über die IP/Port `:8090`
   öffnen — unter **Einstellungen → Domain** die Domain eintragen und
   speichern.
4. Das Album ist nun unter `https://fotos.ihre-domain.de` erreichbar; das
   Zertifikat (Let's Encrypt) wird beim ersten Aufruf automatisch besorgt und
   erneuert. Danach kann die Zeile `"8090:8090"` unter `ports` des
   `app`-Services entfernt werden, damit die App nur noch über HTTPS läuft.

> Wer die Domain lieber fest verdrahten möchte, findet in der `Caddyfile` einen
> auskommentierten Block für eine statisch konfigurierte Domain.

---

## Betrieb

### Update auf eine neue Version

```bash
make update
```

Das holt die neue Version, baut sie und startet die App neu.
Datenbank-Migrationen laufen automatisch, **Ihre Daten bleiben erhalten** —
sie liegen im Ordner `pb_data`.

### Backup

Das komplette System (Datenbank, alle Bilder, Einstellungen) liegt im
Ordner `./pb_data`.

**Automatisch:** Die App erstellt von sich aus **jede Nacht um 3:00 Uhr** ein
Backup und behält die letzten **7** davon. Die Dateien liegen in
`./pb_data/backups/`. Zeitplan und Anzahl lassen sich im PocketBase-Backend
unter **Settings → Backups** ändern.

**Manuell** (z. B. direkt vor einem Update):

```bash
make backup   # konsistentes Backup, landet in ./pb_data/backups/
```

Das funktioniert im laufenden Betrieb — das Backup wird von PocketBase selbst
erstellt und ist daher immer konsistent. Ist die App gestoppt, legt der Befehl
stattdessen ein `backup-JJJJ-MM-TT.tar.gz` im Projektordner an.

#### Off-Site: Backups an einen zweiten Ort (wichtig!)

Die automatischen Backups liegen **auf derselben Festplatte** wie die Daten.
Gegen Festplattenausfall, Serververlust oder versehentliches Löschen braucht
es eine Kopie an einem zweiten Ort. Zwei Wege:

**Weg 1 — regelmäßig herunterkopieren** (einfachster Start), z. B. von einem
anderen Rechner aus:

```bash
scp "server:pfad/zum/projekt/pb_data/backups/*.zip" ./meine-backups/
# oder mit rclone in einen beliebigen Cloud-Speicher:
rclone copy server:pfad/zum/projekt/pb_data/backups remote:albumwerk-backups
```

**Weg 2 — automatisch auf S3-Speicher** (empfohlen): PocketBase kann jedes
Backup direkt zusätzlich in einen S3-kompatiblen Speicher hochladen, z. B.
**Hetzner Object Storage** (Server in Deutschland) oder jeden anderen
S3-kompatiblen Anbieter.

1. Beim Anbieter einen **Bucket** anlegen (z. B. `albumwerk-backups`)
   und ein Zugangs-Schlüsselpaar erzeugen (*Access Key* + *Secret Key*).
2. PocketBase-Backend öffnen (`…/_/`) → **Settings → Backups** →
   **Store backups on S3** aktivieren.
3. Felder ausfüllen — am Beispiel Hetzner:
   - *Endpoint*: `https://fsn1.your-objectstorage.com` (je nach Standort)
   - *Bucket*: `albumwerk-backups`
   - *Region*: `fsn1`
   - *Access key* / *Secret*: das erzeugte Schlüsselpaar
4. Mit **Save changes** speichern — ab jetzt landet jedes Backup (auch die
   nächtlichen) zusätzlich im Bucket.

> **Hinweis:** Falls Sie irgendwann den S3-**Dateispeicher** für die Bilder
> selbst aktivieren (Settings → Files storage), liegen die Bilder nicht mehr
> in `pb_data` und sind damit auch nicht mehr im Backup enthalten — der
> S3-Speicher braucht dann eine eigene Sicherung.

#### Wiederherstellen

**Normalfall** (App läuft noch): PocketBase-Backend → **Settings → Backups** →
beim gewünschten Backup auf das ⟳-Symbol (*Restore*) klicken. Die App startet
danach automatisch mit dem alten Stand neu.

**Notfall** (Server neu aufgesetzt, App startet nicht mehr): Backup-Datei auf
den Server kopieren und einspielen:

```bash
make restore FILE=pb_data/backups/DATEINAME.zip
```

Der Befehl stoppt die App, verschiebt die aktuellen Daten in eine
Sicherheitskopie (`pb_data.vor-restore-…/`), entpackt das Backup und startet
die App neu. Wenn danach alles passt, kann die Sicherheitskopie gelöscht
werden.

### Typischer Arbeitsablauf

1. **Shooting anlegen**: App → Album (Admin) → neues Shooting, Bilder
   hochladen. Wasserzeichen-Vorschauen werden automatisch erzeugt.
2. **Kunden einladen**: im Album auf *Teilen* — dort gibt es Link und
   QR-Code (`/addAlbum/SHOOTING-ID`, öffentliche Alben:
   `/publicAlbum/SHOOTING-ID`). Der QR-Code lässt sich herunterladen und
   z. B. auf eine Karte drucken: Kunden scannen ihn mit der Handykamera,
   registrieren sich einmalig und haben das Album danach automatisch in
   ihrer Übersicht. Wer nicht scannen kann, gibt in *Album hinzufügen* den
   Album-Code ein, der im Teilen-Dialog steht.
3. **Bestellungen**: gehen per E-Mail an Ihre Bestell-Adresse und erscheinen
   unter *Bestellungen*.

---

## Alle Befehle im Überblick

`make` (ohne Argument) zeigt diese Liste ebenfalls an.

| Befehl | Was er tut |
| --- | --- |
| `make prod` | Eigene Instanz bauen und starten |
| `make stop` | Instanz stoppen (Daten bleiben erhalten) |
| `make logs` | Logs der Instanz ansehen (Beenden: `Strg+C`) |
| `make update` | Neue Version einspielen |
| `make release` | Versioniertes Image bauen und in die Registry pushen |
| `make backup` | Konsistentes Backup erstellen (in `./pb_data/backups/`) |
| `make restore FILE=…` | Backup einspielen (mit Sicherheitsabfrage) |
| `make dev` | Dev-/Demo-Instanz mit Demo-Daten starten |
| `make dev-reset` | Dev-Instanz löschen und frisch starten |
| `make dev-stop` | Dev-Instanz stoppen |
| `make dev-logs` | Logs der Dev-Instanz ansehen |

<a id="ohne-make"></a>

### Ohne `make`

Die `make`-Befehle sind nur Abkürzungen für Docker Compose:

```bash
# Produktion (vorher .env anlegen, siehe oben)
docker compose up -d --build                              # = make prod
docker compose down                                       # = make stop
docker compose logs -f app                                # = make logs

# Dev/Demo
docker compose -p albumwerk-dev -f docker-compose.dev.yml up -d --build   # = make dev
docker compose -p albumwerk-dev -f docker-compose.dev.yml down -v         # Dev-Daten löschen
```

---

## Fehlerbehebung

- **Logs ansehen:** `make logs` (bzw. `make dev-logs`)
- **Port schon belegt?** In der `.env` einen anderen `APP_PORT` eintragen und
  `make prod` erneut ausführen.
- **Keine E-Mails?** SMTP-Einstellungen im PocketBase-Backend testen
  (*Send test email*); Spam-Ordner prüfen.
- **Keine Vorschaubilder?** Unter **Einstellungen → Bilder & Wasserzeichen** auf
  „Vorschauen neu erzeugen“ klicken; Logs prüfen.
- **Was fehlt noch bis zum Verkauf?** App unter `/einrichtung` öffnen — die
  Checkliste nennt jeden offenen Punkt.
- **Superuser-Passwort vergessen?** Neues Passwort in die `.env` schreiben
  und `make prod` ausführen — es wird beim Start aktualisiert.

Mehr Fälle: [docs/selfhosting.md → Fehlerbehebung](docs/selfhosting.md#fehlerbehebung-troubleshooting)

---

## Mitwirken

Fehlerberichte und Patches sind willkommen: [CONTRIBUTING.md](CONTRIBUTING.md)
erklärt Entwicklungsumgebung, Tests und die Lizenzzusage für Beiträge. Im
Umgang miteinander gilt der [Verhaltenskodex](CODE_OF_CONDUCT.md).
Sicherheitslücken bitte nicht als Issue, sondern per Mail an
hamm.robin162@gmail.com.

---

## Lizenz

Source-available, dual lizenziert: **kostenlos für nicht-kommerzielle
Nutzung** (privat, Ausprobieren, Forschung) unter der PolyForm Noncommercial
License 1.0.0 — **kommerzielle Nutzung** (z. B. Betrieb für ein
Fotografie-Geschäft) erfordert eine gekaufte Lizenz. Details: [LICENSE.md](LICENSE.md)
