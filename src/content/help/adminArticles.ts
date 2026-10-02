// Help articles for the instance operator (photographer). Shipped with the
// build, so they always match the running version.
//
// Body markup is plain HTML — same pipeline as the legal texts: written here,
// sanitized in the renderer, styled by the `.rich-text` rules in index.css.
// Keep it to the tags that block covers: h2/h3, p, ul/ol/li, strong, em, code,
// blockquote, a, hr.
//
// Slugs are referenced by <HelpHint slug=… /> and <HelpBanner slug=… /> across
// the admin pages — renaming one breaks those call sites, so don't.

import { HelpArticle } from "./types";

export const adminArticles: HelpArticle[] = [
  // --- Einrichtung ---------------------------------------------------------
  {
    slug: "erste-schritte-admin",
    title: "Erste Schritte als Fotograf",
    summary:
      "Was da sein muss, damit du deine Fotos verkaufen kannst — und was nur empfohlen ist.",
    audience: ["admin"],
    category: "setup",
    keywords: ["einrichtung", "setup", "start", "installation", "onboarding"],
    relatedPath: "/einrichtung",
    bodyHtml: `
<p>Unter <strong>Einrichtung</strong> findest du jederzeit eine Checkliste, die dir sagt, was bis zum Verkauf deiner Fotos noch fehlt. Alben hochladen und Kunden einladen kannst du sofort — die Liste hält dich nicht auf, sie hält dich nur auf dem Laufenden.</p>
<p>Vier Punkte sind <strong>Pflicht</strong>. Solange einer davon offen ist, können deine Kunden keine Bilder kaufen:</p>
<ol>
  <li><strong>Zahlungsanbieter</strong> — PayPal oder Stripe muss aktiv und eingerichtet sein.</li>
  <li><strong>Preise</strong> — mindestens ein Preis oder Paket, sonst gibt es nichts zu kaufen.</li>
  <li><strong>Impressum und Datenschutz</strong> — sobald Kunden Zugriff haben, sind die Pflicht.</li>
  <li><strong>Bestell-E-Mail</strong> — ohne sie erfährst du von einer Bestellung nichts.</li>
</ol>
<p>Fünf weitere Punkte sind <strong>empfohlen</strong>: Name, Logo, Kontakt-E-Mail, eigene Domain und Wasserzeichen. Ohne sie funktioniert alles, es sieht nur weniger nach dir aus. Eine eigene Domain kannst du jederzeit später nachrüsten — alle Links funktionieren weiter.</p>
<p>Jede Zeile der Checkliste verlinkt direkt auf die Seite, auf der du den Punkt erledigst.</p>
`,
  },
  {
    slug: "branding-einrichten",
    title: "Branding einrichten",
    summary:
      "Name, Logo, Favicon, Farben, Schriftart und Eckenradius — so bekommt die App dein Aussehen.",
    audience: ["admin"],
    category: "setup",
    keywords: ["logo", "farben", "schrift", "design", "aussehen", "favicon", "corporate"],
    relatedPath: "/branding",
    bodyHtml: `
<p>Unter <strong>Branding</strong> stellst du ein, wie die App für deine Kunden aussieht. Die Vorschau rechts (bzw. unter den Feldern auf dem Handy) aktualisiert sich sofort, gespeichert wird erst mit dem Button.</p>
<figure>
  <img src="/help/branding-einrichten/01-name.webp" alt="Der Abschnitt „Branding“ mit den Feldern für Name, Logo und Farben, daneben die Live-Vorschau" loading="lazy" />
  <figcaption>Links die Felder, rechts die Vorschau: was du tippst, ist sofort zu sehen — gespeichert ist es damit noch nicht.</figcaption>
</figure>
<h2>Die Felder im Einzelnen</h2>
<ul>
  <li><strong>Name des Geschäfts</strong> — steht in der Seitenleiste, im Footer und in allen E-Mails an deine Kunden.</li>
  <li><strong>Kurzname (App)</strong> — der Name unter dem Icon, wenn jemand die App auf den Homescreen legt. Kurz halten, sonst wird er abgeschnitten.</li>
  <li><strong>Slogan / Untertitel</strong> — erscheint auf der öffentlichen Album-Seite unter deinem Namen.</li>
  <li><strong>Logo</strong> — wird in der Seitenleiste und auf öffentlichen Album-Seiten angezeigt. Ein freigestelltes PNG sieht in beiden Farbmodi am besten aus.</li>
  <li><strong>Favicon</strong> — optional, das kleine Icon im Browser-Tab. Ohne eigenes Favicon wird das Logo verwendet.</li>
  <li><strong>Primär- und Sekundärfarbe</strong> — Primär färbt Buttons und Links, Sekundär ist der Akzent für Hervorhebungen.</li>
  <li><strong>Schriftart</strong> — vier mitgelieferte Schriften. <em>Inter</em> und <em>Montserrat</em> wirken sachlich-modern, <em>Lora</em> und <em>Playfair Display</em> klassisch-elegant.</li>
  <li><strong>Erscheinungsbild</strong> — hell, dunkel oder automatisch nach der Systemeinstellung deiner Kunden.</li>
  <li><strong>Eckenradius</strong> — von kantig (0) bis stark abgerundet (24). Wirkt auf Karten, Buttons und Bilder gleichzeitig.</li>
</ul>
<h2>Tipp zum Kontrast</h2>
<p>Prüfe deine Primärfarbe einmal im hellen <em>und</em> im dunklen Modus. Sehr helle Farben werden auf weißem Hintergrund schnell unleserlich — die Vorschau zeigt dir das direkt.</p>
`,
  },
  {
    slug: "kontakt-benachrichtigungen",
    title: "Kontaktdaten und Benachrichtigungen",
    summary:
      "Wohin Support-Anfragen und Bestellbenachrichtigungen gehen und wo deine Währung eingestellt wird.",
    audience: ["admin"],
    category: "setup",
    keywords: ["email", "e-mail", "benachrichtigung", "währung", "eur", "kontakt", "website"],
    relatedPath: "/kontakt",
    bodyHtml: `
<p>Der Abschnitt <strong>Kontakt &amp; Geschäft</strong> auf der Branding-Seite steuert, wo dich Nachrichten erreichen:</p>
<ul>
  <li><strong>Kontakt-E-Mail (Support)</strong> — die Adresse, die deine Kunden sehen, wenn sie dich erreichen wollen. Wird auch in den generierten Rechtstexten verwendet.</li>
  <li><strong>Bestell-Benachrichtigungen an</strong> — hierhin geht eine Mail, sobald jemand bestellt. Darf eine andere Adresse sein als die Support-Adresse, zum Beispiel deine Buchhaltung.</li>
  <li><strong>Website (optional)</strong> — verlinkt auf deine Hauptseite.</li>
  <li><strong>Währung</strong> — ISO-Code, in Deutschland <code>EUR</code>. Bestimmt, in welcher Währung Beträge angezeigt und abgerechnet werden.</li>
</ul>
<blockquote>Damit überhaupt Mails rausgehen, muss in deiner Installation ein SMTP-Server hinterlegt sein. Das passiert nicht hier, sondern in der PocketBase-Administration deiner Instanz.</blockquote>
`,
  },
  {
    slug: "custom-domain",
    title: "Eigene Domain einrichten",
    summary:
      "Selbst gehostet trägst du sie selbst ein, bei uns gehostet fragst du sie an — das HTTPS-Zertifikat kommt in beiden Fällen automatisch.",
    audience: ["admin"],
    category: "setup",
    keywords: ["domain", "dns", "https", "ssl", "zertifikat", "a-record", "let's encrypt", "url"],
    relatedPath: "/domain",
    bodyHtml: `
<p>Standardmäßig ist deine Instanz unter der Adresse erreichbar, unter der du sie installiert hast. Mit einer eigenen Domain — etwa <code>fotos.deine-domain.de</code> — wirkt das Ganze deutlich professioneller.</p>
<p>Welcher der beiden Wege für dich gilt, siehst du unter <strong>Einstellungen → Domain</strong>: dort steht entweder eine Anleitung zum Selbst-Eintragen oder ein Knopf „Domain anfragen“.</p>
<h2>Wenn du selbst hostest</h2>
<ol>
  <li>Lege bei deinem Domain-Anbieter einen <strong>A-Record</strong> an, der auf die <strong>IP-Adresse deines Servers</strong> zeigt. Wenn dein Server auch über IPv6 erreichbar ist, zusätzlich einen <strong>AAAA-Record</strong>.</li>
  <li>Trage die Domain unter <strong>Einstellungen → Domain</strong> ein und speichere.</li>
  <li>Das HTTPS-Zertifikat wird beim ersten Aufruf <strong>automatisch</strong> von Let's Encrypt geholt. Du musst nichts weiter konfigurieren.</li>
  <li>Mit <strong>Domain prüfen</strong> siehst du, ob die Adresse schon erreichbar und gesichert ist.</li>
</ol>
<h2>Wenn deine Instanz bei uns läuft</h2>
<p>Dann gehört der Server nicht dir, und es gibt keine IP, auf die du zeigen könntest. Die Domain schalten wir für dich frei. Die Einrichtung kostet einmalig <strong>39 €</strong> — Hilfe beim DNS-Eintrag inklusive. Danach fallen keine weiteren Kosten an: das Zertifikat ist kostenlos und erneuert sich selbst.</p>
<ol>
  <li>Lege bei deinem Domain-Anbieter einen <strong>CNAME</strong> an, der auf die Adresse deiner Instanz zeigt. Welche das ist, steht auf der Seite <strong>Einstellungen → Domain</strong>.</li>
  <li>Trage die gewünschte Domain dort ein und klick auf <strong>Domain anfragen</strong>.</li>
  <li>Wir melden uns mit den Details und schalten sie frei. Sobald das erledigt ist und dein CNAME aktiv ist, zeigt die Seite deine Domain als aktiv an — auch hier ohne dass du dich um das Zertifikat kümmern musst.</li>
</ol>
<h2>„Noch nicht erreichbar“ — was nun?</h2>
<p>Das ist direkt nach dem Anlegen des DNS-Eintrags normal. DNS-Änderungen brauchen je nach Anbieter einige Minuten bis mehrere Stunden, bis sie überall aktiv sind. Prüfe später einfach noch einmal.</p>
<p>Wenn es nach einem Tag immer noch nicht klappt, sind das die üblichen Ursachen:</p>
<ul>
  <li>Der A-Record zeigt auf die falsche IP — etwa auf die deines Routers statt auf die des Servers.</li>
  <li>Ein Proxy des DNS-Anbieters ist aktiv (bei Cloudflare der orange Wolken-Schalter). Der muss für die automatische Zertifikatsausstellung zunächst aus sein.</li>
  <li>Port 80 und 443 sind von außen nicht erreichbar. Let's Encrypt braucht beide.</li>
</ul>
`,
  },
  {
    slug: "rechtstexte",
    title: "Impressum und Datenschutzerklärung",
    summary:
      "Betreiberdaten eintragen, Texte automatisch erzeugen lassen und anschließend nachbearbeiten.",
    audience: ["admin"],
    category: "setup",
    keywords: ["impressum", "datenschutz", "dsgvo", "recht", "agb", "pflichtangaben"],
    relatedPath: "/legal",
    bodyHtml: `
<p>Sobald Kunden Zugriff auf deine Instanz haben, brauchst du in Deutschland ein <strong>Impressum</strong> und eine <strong>Datenschutzerklärung</strong>. Beide sind über den Footer von jeder Seite aus erreichbar.</p>
<h2>So erzeugst du die Texte</h2>
<ol>
  <li>Trage unter <strong>Rechtliches</strong> deine Betreiberdaten ein: Name, Anschrift, Kontakt, gegebenenfalls Umsatzsteuer-ID.</li>
<figure>
  <img src="/help/rechtstexte/01-betriebsdaten.webp" alt="Der Abschnitt „Angaben zum Betrieb“ mit ausgefüllten Feldern für Firma, Straße, Ort und E-Mail" loading="lazy" />
  <figcaption>Erst wenn Name, Anschrift und E-Mail stehen, werden die Erzeugen-Knöpfe darunter aktiv.</figcaption>
</figure>
  <li>Lass dir daraus die Textvorlagen erzeugen. Aktive Zahlungsanbieter werden dabei berücksichtigt — die Datenschutzerklärung bekommt automatisch die passenden Abschnitte zu PayPal beziehungsweise Stripe.</li>
  <li>Geh die Texte im Editor durch. Alle Stellen, die als <code>[bitte ergänzen: …]</code> markiert sind, musst du selbst ausfüllen — die kann die Vorlage nicht kennen.</li>
<figure>
  <img src="/help/rechtstexte/02-erzeugtes-impressum.webp" alt="Der Abschnitt „Impressum“ mit dem erzeugten Text im Editor" loading="lazy" />
  <figcaption>Das erzeugte Impressum steht im Editor und lässt sich dort direkt weiterbearbeiten.</figcaption>
</figure>
  <li>Speichern. Die Seiten <strong>Impressum</strong> und <strong>Datenschutz</strong> sind sofort öffentlich abrufbar.</li>
</ol>
<h2>Wichtiger Hinweis</h2>
<blockquote>Die Vorlagen sind ein Startpunkt, keine Rechtsberatung. Sie decken den typischen Fall einer selbst gehosteten Foto-Instanz ab. Ob sie für deine Situation vollständig sind, kann dir nur jemand sagen, der deinen konkreten Fall kennt. Im Zweifel lass die Texte einmal anwaltlich prüfen — das ist einmalig Aufwand und danach erledigt.</blockquote>
<p>Wenn du die Texte lieber komplett selbst schreibst: der Editor erlaubt auch das Einfügen von fertigem HTML über die Quelltext-Ansicht.</p>
`,
  },

  // --- Alben & Bilder ------------------------------------------------------
  {
    slug: "album-anlegen",
    title: "Ein Album anlegen",
    summary:
      "Titel, Kunden und Album-Typ festlegen — der Typ entscheidet, ob gekauft oder direkt heruntergeladen wird.",
    audience: ["admin"],
    category: "albums",
    keywords: ["shooting", "album", "anlegen", "neu", "erstellen", "typ"],
    relatedPath: "/album",
    bodyHtml: `
<p>Jedes Shooting bekommt bei dir ein eigenes Album. Über <strong>Album → Neues Album</strong> legst du eins an.</p>
<h2>Schritt für Schritt</h2>
<ol>
  <li>Links über der Albumliste auf <strong>Neues Album</strong> klicken.</li>
</ol>
<figure>
  <img src="/help/album-anlegen/01-neues-shooting.webp" alt="Der Button „Neues Album“" loading="lazy" />
  <figcaption>Der Einstieg liegt links über der Liste deiner Alben.</figcaption>
</figure>
<ol start="2">
  <li>Titel, Beschreibung, Kunden und Album-Typ ausfüllen.</li>
</ol>
<figure>
  <img src="/help/album-anlegen/02-formular.webp" alt="Das Formular für ein neues Album mit den Feldern Titel, Beschreibung, Kunden und Typ" loading="lazy" />
  <figcaption>Der Album-Typ steht ganz unten — er entscheidet, was der Kunde später im Album tun kann.</figcaption>
</figure>
<ol start="3">
  <li>Speichern. Das Album erscheint in der Liste, ist ausgewählt und wartet auf Bilder — der Button <strong>Bilder hochladen</strong> steht mitten im leeren Album.</li>
</ol>
<figure>
  <img src="/help/album-anlegen/03-angelegt.webp" alt="Das neu angelegte Album in der Detailansicht, noch ohne Bilder" loading="lazy" />
  <figcaption>Direkt nach dem Anlegen ist das Album leer — weiter geht es über „Bilder hochladen“.</figcaption>
</figure>
<h2>Die Felder</h2>
<ul>
  <li><strong>Titel</strong> — sieht der Kunde. Etwas Konkretes wie „Hochzeit Meyer, Juli 2026“ ist besser als „Album 1“.</li>
  <li><strong>Beschreibung</strong> — optionaler Text über dem Album, zum Beispiel ein Hinweis auf die Auswahlfrist.</li>
  <li><strong>Kunde(n)</strong> — welche Konten Zugriff bekommen. Du kannst das auch leer lassen und den Zugang später über Link oder QR-Code herstellen.</li>
</ul>
<h2>Der Album-Typ</h2>
<p>Das ist die wichtigste Entscheidung, denn sie legt fest, was der Kunde im Album tun kann:</p>
<ul>
  <li><strong>Bezahlt</strong> — der Kunde hat bereits bezahlt, zum Beispiel direkt bei dir. Es gibt keinen Kaufvorgang; er markiert Bilder und lädt sie über <em>Download</em> direkt herunter.</li>
  <li><strong>Öffentlich</strong> — für alle mit dem Link zugänglich, ebenfalls ohne Kaufvorgang. Passt für Vereins-, Event- oder Familienalben. Der Kunde sieht hier zusätzlich selbst den Teilen-Dialog und kann den Link weitergeben.</li>
  <li><strong>Verkauf</strong> — der Kunde wählt Bilder aus und durchläuft die Kasse. Nur bei diesem Typ ordnest du <strong>Preise</strong> und optional ein <strong>Paket</strong> zu.</li>
</ul>
<h2>Vorabauswahl</h2>
<p>Bei den Typen <em>Bezahlt</em> und <em>Verkauf</em> kannst du <strong>„Kunden können eine Vorabauswahl treffen“</strong> aktivieren. Der Kunde markiert dann Bilder und schickt dir die Auswahl, ohne schon etwas zu kaufen — praktisch, wenn du danach noch retuschierst.</p>
`,
  },
  {
    slug: "bilder-hochladen",
    title: "Bilder hochladen",
    summary:
      "Originale hochladen — Vorschaubilder mit Wasserzeichen erzeugt die App automatisch im Hintergrund.",
    audience: ["admin"],
    category: "albums",
    keywords: ["upload", "hochladen", "bilder", "fotos", "vorschau", "original", "raw"],
    relatedPath: "/album",
    bodyHtml: `
<p>Öffne ein Album und zieh die Bilder in den Upload-Bereich oder wähle sie über den Dateidialog aus. Mehrere Bilder auf einmal sind kein Problem.</p>
<h2>Schritt für Schritt</h2>
<ol>
  <li>Das Album öffnen und oben rechts auf <strong>Bilder hochladen</strong> gehen.</li>
</ol>
<figure>
  <img src="/help/bilder-hochladen/01-album-oeffnen.webp" alt="Die Detailansicht eines Albums mit dem Button „Bilder hochladen“" loading="lazy" />
  <figcaption>Der Upload-Button sitzt in der Kopfzeile des geöffneten Albums.</figcaption>
</figure>
<ol start="2">
  <li>Bilder in die Fläche ziehen oder über den Dateidialog auswählen.</li>
</ol>
<figure>
  <img src="/help/bilder-hochladen/02-dialog.webp" alt="Der Upload-Dialog mit der Ablagefläche für Dateien" loading="lazy" />
  <figcaption>Der Dialog nimmt beliebig viele Bilder auf einmal an und zeigt den Fortschritt je Datei.</figcaption>
</figure>
<ol start="3">
  <li>Fertig klicken. Die Bilder stehen im Album, die Vorschauen entstehen im Hintergrund.</li>
</ol>
<figure>
  <img src="/help/bilder-hochladen/03-im-album.webp" alt="Das Bildraster des Albums mit den hochgeladenen Bildern" loading="lazy" />
  <figcaption>Im Raster siehst du die Vorschauen mit Wasserzeichen — genau so sieht sie auch dein Kunde.</figcaption>
</figure>
<h2>Was dabei passiert</h2>
<p>Du lädst immer die <strong>Originale</strong> hoch. Daraus erzeugt die App automatisch:</p>
<ul>
  <li>ein <strong>Vorschaubild</strong> in reduzierter Größe und mit Wasserzeichen — das bekommen Kunden im Album zu sehen,</li>
  <li>ein <strong>Thumbnail</strong> für die Rasteransicht.</li>
</ul>
<p>Das Original bleibt geschützt und wird erst herausgegeben, wenn der Kunde es gekauft hat beziehungsweise das Album als bezahlt oder öffentlich markiert ist.</p>
<h2>Verarbeitung im Hintergrund</h2>
<p>Die Vorschauen werden nach dem Upload in einer Warteschlange erzeugt. Bei vielen oder sehr großen Bildern kann das einen Moment dauern — du kannst die Seite in der Zwischenzeit verlassen, die Verarbeitung läuft weiter. Bilder, deren Vorschau noch nicht fertig ist, sind entsprechend markiert.</p>
<h2>Wenn etwas hakt</h2>
<ul>
  <li>Sehr große Dateien brauchen länger und können bei knappem Speicher auf dem Server scheitern. Lade in dem Fall in kleineren Gruppen hoch.</li>
  <li>Fehlt bei einzelnen Bildern dauerhaft die Vorschau, kannst du sie unter <strong>Branding → Wasserzeichen &amp; Vorschau</strong> mit <em>Vorschauen neu erzeugen</em> noch einmal anstoßen.</li>
</ul>
`,
  },
  {
    slug: "wasserzeichen-vorschau",
    title: "Wasserzeichen und Vorschaubilder",
    summary:
      "Text oder Logo als Wasserzeichen, Deckkraft und maximale Vorschaugröße einstellen.",
    audience: ["admin"],
    category: "albums",
    keywords: ["wasserzeichen", "watermark", "vorschau", "preview", "deckkraft", "schutz", "kopierschutz"],
    relatedPath: "/bilder",
    bodyHtml: `
<p>Vorschaubilder sind die Version, die Kunden vor dem Kauf sehen. Sie sind verkleinert und tragen dein Wasserzeichen. Eingestellt wird das unter <strong>Branding → Wasserzeichen &amp; Vorschau</strong>.</p>
<h2>Die Einstellungen</h2>
<ul>
  <li><strong>Wasserzeichen-Text</strong> — meist dein Name oder deine Domain.</li>
  <li><strong>Wasserzeichen-Logo</strong> — optional statt des Textes. Ein weißes PNG mit transparentem Hintergrund funktioniert auf den meisten Bildern am besten.</li>
  <li><strong>Deckkraft</strong> — zwischen 5 % und 100 %. Ein guter Startwert liegt bei etwa 30 %: deutlich sichtbar, aber das Bild bleibt beurteilbar.</li>
  <li><strong>Max. Vorschaugröße (px)</strong> — die längere Kante des Vorschaubilds. Kleiner heißt schnelleres Laden und weniger Missbrauchspotenzial, größer heißt, dass Kunden Details besser einschätzen können.</li>
</ul>
<h2>Änderungen auf bestehende Bilder anwenden</h2>
<p>Wasserzeichen werden beim Erzeugen der Vorschau fest ins Bild gerechnet. Änderst du also Text, Logo, Deckkraft oder Größe, gilt das zunächst nur für neue Uploads. Für die bereits vorhandenen Bilder klickst du auf <strong>Vorschauen neu erzeugen</strong> — je nach Anzahl läuft das eine Weile im Hintergrund.</p>
<blockquote>Ein Wasserzeichen schützt vor der beiläufigen Weiterverwendung, nicht vor jemandem, der es unbedingt entfernen will. Der eigentliche Schutz liegt darin, dass das Original den Server bis zum Kauf nicht verlässt.</blockquote>
`,
  },
  {
    slug: "album-teilen-qr",
    title: "Album teilen: Link, QR-Code und Album-Code",
    summary:
      "Drei Wege, wie ein Kunde an sein Album kommt — mit oder ohne bestehendes Konto.",
    audience: ["admin"],
    category: "albums",
    keywords: ["teilen", "share", "qr", "qr-code", "link", "code", "einladung", "zugang"],
    relatedPath: "/album",
    bodyHtml: `
<p>Über den Button <strong>Teilen</strong> im Album bekommst du drei Varianten:</p>
<ul>
  <li><strong>Link kopieren</strong> — der direkte Weg. Wer den Link öffnet und angemeldet ist, bekommt das Album sofort in seiner Übersicht. Wer noch kein Konto hat, wird durch die Registrierung geführt und das Album wird danach automatisch verknüpft.</li>
  <li><strong>QR-Code herunterladen</strong> — dasselbe als Bild. Praktisch für Visitenkarten, Übergabemappen oder eine Karte, die du dem Kunden mitgibst.</li>
  <li><strong>Album-Code kopieren</strong> — der reine Code zum Abtippen, falls jemand weder Link noch QR-Code nutzen kann.</li>
</ul>
<figure>
  <img src="/help/album-teilen-qr/01-dialog.webp" alt="Der Teilen-Dialog mit Link, QR-Code und Album-Code" loading="lazy" />
  <figcaption>Alle drei Wege liegen im selben Dialog — Link zum Verschicken, QR-Code zum Ausdrucken, Code zum Abtippen.</figcaption>
</figure>
<h2>Wer sieht was?</h2>
<figure>
  <img src="/help/album-teilen-qr/02-oeffentliche-ansicht.webp" alt="Ein öffentliches Album, geöffnet ohne Anmeldung" loading="lazy" />
  <figcaption>So sieht ein öffentliches Album aus, wenn es jemand ohne Konto über den Link öffnet.</figcaption>
</figure>
<p>Bei <strong>öffentlichen</strong> Alben kann jeder mit dem Link das Album ansehen und die Bilder herunterladen — auch ohne Konto. Bei den Typen <strong>Bezahlt</strong> und <strong>Verkauf</strong> dient der Link dazu, das Album mit einem Konto zu verknüpfen; danach ist es nur noch für dieses Konto sichtbar.</p>
<blockquote>Behandle den Link entsprechend wie ein Passwort und schick ihn nur an den tatsächlichen Kunden.</blockquote>
`,
  },
  {
    slug: "bild-sichtbarkeit",
    title: "Sichtbarkeit einzelner Bilder",
    summary:
      "Welche Bilder ein Kunde sieht, wann Originale herausgegeben werden und wie du Bilder wieder entfernst.",
    audience: ["admin"],
    category: "albums",
    keywords: ["sichtbarkeit", "öffentlich", "privat", "löschen", "verstecken", "freigabe"],
    relatedPath: "/album",
    bodyHtml: `
<p>Alle Bilder eines Albums sind für die zugeordneten Kunden sichtbar — allerdings immer nur als Vorschau mit Wasserzeichen.</p>
<h2>Wann bekommt jemand das Original?</h2>
<ul>
  <li>Bei <strong>Bezahlt</strong> und <strong>Öffentlich</strong>: sofort, über den Download-Button im Album.</li>
  <li>Bei <strong>Verkauf</strong>: erst nach abgeschlossener Bestellung. Die gekauften Bilder erscheinen dann unter <em>Downloads</em> im Konto des Kunden.</li>
</ul>
<h2>Bilder entfernen</h2>
<figure>
  <img src="/help/bild-sichtbarkeit/01-auswahl.webp" alt="Ein Bildraster, in dem das erste Bild mit einem Haken markiert ist" loading="lazy" />
  <figcaption>Im Auswahlmodus markierst du die Bilder, die weg sollen.</figcaption>
</figure>
<figure>
  <img src="/help/bild-sichtbarkeit/02-bestaetigen.webp" alt="Der Bestätigungsdialog vor dem Löschen von Bildern" loading="lazy" />
  <figcaption>Vor dem Löschen fragt die App noch einmal nach — der Schritt lässt sich danach nicht rückgängig machen.</figcaption>
</figure>
<p>Über die Auswahl im Album kannst du Bilder markieren und löschen. Bereits gekaufte Bilder solltest du nicht löschen — der Kunde verliert damit seinen Download. Willst du ein Bild nur vorübergehend aus dem Album nehmen, ist es sicherer, es lokal zu sichern und später wieder hochzuladen.</p>
`,
  },

  // --- Verkauf & Zahlungen -------------------------------------------------
  {
    slug: "preise-pakete",
    title: "Preise und Pakete anlegen",
    summary:
      "Einzelprodukte (Abzüge, Downloads, Leinwand) und Pakete mit Inklusiv-Bildern — und wie beides zusammenspielt.",
    audience: ["admin"],
    category: "selling",
    keywords: ["preis", "preise", "paket", "produkt", "abzug", "print", "leinwand", "download", "katalog"],
    relatedPath: "/pricing",
    bodyHtml: `
<p>Unter <strong>Preise</strong> pflegst du zwei getrennte Dinge: einzelne <strong>Produkte</strong> und <strong>Pakete</strong>.</p>
<h2>Produkte</h2>
<p>Ein Produkt ist alles, was der Kunde je Bild kaufen kann:</p>
<ul>
  <li><strong>Produktart</strong> — digital, Abzug, Leinwand, Poster oder sonstiges.</li>
  <li><strong>Größe</strong> — bei physischen Produkten, etwa <code>13×18 cm</code>. Gängige Formate stehen zur Auswahl, eigene tippst du einfach ein.</li>
  <li><strong>Preis</strong> — der Betrag je Stück.</li>
  <li><strong>Beschreibung</strong> — hier gehören Papierart, Rahmung oder Lieferzeit hin. Der Kunde sieht das beim Auswählen.</li>
  <li><strong>Digitaler Download</strong> — anschalten für Dateien statt Ware. Für solche Positionen fragt die Kasse keine Lieferadresse ab.</li>
</ul>
<figure>
  <img src="/help/preise-pakete/01-neues-produkt.webp" alt="Das Formular für ein neues Produkt mit Produktart, Größe, Preis und Beschreibung" loading="lazy" />
  <figcaption>Ein Produkt anlegen: Produktart und Größe ergeben zusammen den Titel, wenn du keinen eigenen eingibst.</figcaption>
</figure>
<figure>
  <img src="/help/preise-pakete/02-katalog.webp" alt="Die Preisliste mit den angelegten Produkten, nach Produktart gruppiert" loading="lazy" />
  <figcaption>Der fertige Katalog links, gruppiert nach Produktart. Über „Standard-Katalog einfügen“ bekommst du typische Produkte auf einen Schlag.</figcaption>
</figure>
<h2>Pakete</h2>
<p>Ein Paket bündelt eine feste Anzahl Bilder zu einem Gesamtpreis:</p>
<ul>
  <li><strong>Inklusiv-Bilder</strong> — so viele Bilder darf der Kunde zum Paketpreis auswählen.</li>
  <li><strong>Paketpreis</strong> — der Betrag für genau diese Anzahl.</li>
  <li><strong>Preis je weiterem Bild</strong> — gilt für jedes Bild über die Inklusiv-Anzahl hinaus.</li>
</ul>
<p>Hängt ein Paket an einem Album, muss der Kunde mindestens die Inklusiv-Anzahl auswählen, bevor er zur Kasse kommt. Die App zeigt ihm dabei laufend an, wie viele Bilder ihm noch fehlen.</p>
<h2>Zuordnung zum Album</h2>
<p>Angelegte Produkte und Pakete gelten nicht automatisch überall. Du ordnest sie beim Bearbeiten eines Albums vom Typ <strong>Verkauf</strong> zu. So kann eine Hochzeit andere Preise haben als ein Bewerbungsfoto-Termin.</p>
`,
  },
  {
    slug: "zahlungen-paypal",
    title: "PayPal einrichten",
    summary:
      "Client-ID, Secret und Geschäftskonto hinterlegen — inklusive Testmodus vor dem Scharfschalten.",
    audience: ["admin"],
    category: "selling",
    keywords: ["paypal", "zahlung", "bezahlen", "client-id", "secret", "sandbox", "live"],
    relatedPath: "/payments",
    bodyHtml: `
<p>Unter <strong>Zahlungen</strong> trägst du deine PayPal-Zugangsdaten ein. Die Kurzanleitung direkt auf der Seite führt dich durch die fünf Schritte im PayPal-Entwicklerportal; hier die Punkte, an denen es erfahrungsgemäß hakt.</p>
<h2>Die drei Felder</h2>
<ul>
  <li><strong>Client-ID</strong> — öffentlicher Teil der Zugangsdaten deiner PayPal-App.</li>
  <li><strong>Secret</strong> — der geheime Teil. Er wird verschlüsselt gespeichert und dir danach nie wieder im Klartext angezeigt.</li>
  <li><strong>PayPal-Geschäftskonto (E-Mail)</strong> — das Konto, auf dem das Geld landet.</li>
</ul>
<figure>
  <img src="/help/zahlungen-paypal/01-zugangsdaten.webp" alt="Der PayPal-Abschnitt mit den Feldern für Client-ID, Secret und Geschäftskonto" loading="lazy" />
  <figcaption>Alle drei Felder liegen untereinander, darunter der Schalter für Test- oder Live-Modus.</figcaption>
</figure>
<h2>Test- und Live-Modus</h2>
<p>PayPal vergibt für Test (Sandbox) und Echtbetrieb (Live) <strong>unterschiedliche</strong> Zugangsdaten. Die häufigste Fehlerquelle ist, Sandbox-Daten im Live-Modus zu hinterlegen oder umgekehrt. Teste erst mit Sandbox-Daten einen kompletten Kauf und wechsle danach auf Live.</p>
<p>Mit <strong>Speichern &amp; prüfen</strong> testet die App die Zugangsdaten sofort gegen PayPal — du merkst also direkt, ob etwas nicht stimmt, und nicht erst beim ersten echten Kunden.</p>
<h2>PayPal wieder abschalten</h2>
<p>Client-ID leeren und speichern. Danach taucht PayPal an der Kasse nicht mehr auf.</p>
`,
  },
  {
    slug: "zahlungen-stripe",
    title: "Kartenzahlung mit Stripe einrichten",
    summary:
      "Kreditkarte, Apple Pay und Google Pay über einen einzigen geheimen Stripe-Schlüssel.",
    audience: ["admin"],
    category: "selling",
    keywords: ["stripe", "kreditkarte", "karte", "apple pay", "google pay", "sk_live", "zahlung"],
    relatedPath: "/payments",
    bodyHtml: `
<p>Stripe deckt Kreditkarte, Apple Pay und Google Pay in einem ab. Du brauchst dafür nur den <strong>geheimen Stripe-Schlüssel</strong> aus deinem Stripe-Dashboard.</p>
<figure>
  <img src="/help/zahlungen-stripe/01-schluesselfeld.webp" alt="Der Stripe-Abschnitt mit dem Eingabefeld für den geheimen Schlüssel" loading="lazy" />
  <figcaption>Ein einziges Feld — der Knopf daneben wird erst aktiv, wenn etwas darin steht.</figcaption>
</figure>
<h2>Worauf du achten musst</h2>
<ul>
  <li>Der Schlüssel beginnt mit <code>sk_live_…</code> für den Echtbetrieb und mit <code>sk_test_…</code> für Tests. Beide funktionieren, aber nur mit dem Live-Schlüssel fließt echtes Geld.</li>
  <li>Verwechsle den geheimen Schlüssel nicht mit dem veröffentlichbaren (<code>pk_…</code>) — der gehört nicht hierher.</li>
  <li>Der Schlüssel wird verschlüsselt abgelegt und nicht mehr im Klartext angezeigt.</li>
</ul>
<p><strong>Speichern &amp; prüfen</strong> testet den Schlüssel direkt gegen Stripe. Zum Abschalten nutzt du <em>Kartenzahlung deaktivieren</em>.</p>
<figure>
  <img src="/help/zahlungen-stripe/02-anleitung.webp" alt="Die aufgeklappte Anleitung „Stripe in 5 Schritten einrichten“" loading="lazy" />
  <figcaption>Die vollständige Anleitung steht direkt auf der Seite — inklusive Testkarte zum gefahrlosen Ausprobieren.</figcaption>
</figure>
<h2>Beide Anbieter gleichzeitig</h2>
<p>Sind PayPal und Stripe eingerichtet, kann der Kunde an der Kasse frei wählen. Ist keiner von beiden eingerichtet, bekommt er stattdessen den Hinweis, dich direkt zu kontaktieren — Alben vom Typ <em>Verkauf</em> sind dann also faktisch nicht abschließbar.</p>
`,
  },
  {
    slug: "bestellungen-bearbeiten",
    title: "Bestellungen bearbeiten",
    summary:
      "Eingegangene Bestellungen ansehen, Details prüfen und als erledigt markieren.",
    audience: ["admin"],
    category: "selling",
    keywords: ["bestellung", "auftrag", "order", "erledigt", "abwickeln", "versand"],
    relatedPath: "/orders",
    bodyHtml: `
<figure>
  <img src="/help/bestellungen-bearbeiten/01-eingegangen.webp" alt="Eine Bestellzeile in der Übersicht der eingegangenen Bestellungen" loading="lazy" />
  <figcaption>Jede eingegangene Bestellung steht als eigene Zeile in der Liste.</figcaption>
</figure>
<p>Unter <strong>Bestellungen</strong> siehst du alles, was deine Kunden gekauft haben. Über die Detailansicht kommst du an die einzelnen Positionen: welches Bild, welches Produkt, welche Menge, welcher Betrag — und bei physischen Produkten die Lieferadresse.</p>
<h2>Ablauf</h2>
<ol>
  <li>Du bekommst eine Mail an die Adresse, die unter <em>Bestell-Benachrichtigungen</em> hinterlegt ist.</li>
  <li>Digitale Positionen stehen dem Kunden sofort unter <em>Downloads</em> zur Verfügung — da musst du nichts tun.</li>
  <li>Physische Positionen (Abzüge, Leinwand, Poster) gibst du wie gewohnt bei deinem Labor in Auftrag und verschickst sie.</li>
<figure>
  <img src="/help/bestellungen-bearbeiten/02-details.webp" alt="Die Detailansicht einer Bestellung mit den einzelnen Positionen" loading="lazy" />
  <figcaption>In den Details steht, welches Bild in welchem Produkt und welcher Menge bestellt wurde.</figcaption>
</figure>
  <li>Ist alles raus, markierst du die Bestellung als erledigt. So bleibt die Liste der offenen Aufträge übersichtlich.</li>
</ol>
`,
  },

  // --- Kunden & Konten -----------------------------------------------------
  {
    slug: "nutzer-verwalten",
    title: "Kundenkonten verwalten",
    summary:
      "Wer hat Zugriff auf welches Album, wie kommen Kunden zu einem Konto und wie hilfst du beim Login.",
    audience: ["admin"],
    category: "customers",
    keywords: ["nutzer", "kunde", "konto", "account", "zugriff", "passwort", "registrierung"],
    relatedPath: "/users",
    bodyHtml: `
<p>Unter <strong>Nutzer</strong> siehst du alle registrierten Konten mit ihren Kontaktdaten und den zugeordneten Alben.</p>
<figure>
  <img src="/help/nutzer-verwalten/01-suchen.webp" alt="Die Nutzertabelle mit den Spalten Name, E-Mail, Ort, Alben, Verifiziert und Rolle" loading="lazy" />
  <figcaption>Die Suche oben grenzt die Liste auf einen Namen oder eine E-Mail-Adresse ein. Ein Klick auf die Zeile öffnet die Details, dort vergibst du auch Adminrechte.</figcaption>
</figure>
<h2>Wie Kunden zu einem Konto kommen</h2>
<p>In aller Regel gar nicht durch dich: Du gibst den Album-Link oder QR-Code weiter, der Kunde registriert sich selbst und das Album wird dabei automatisch mit seinem neuen Konto verknüpft. Das ist der bequemste Weg für beide Seiten.</p>
<h2>Typische Fälle</h2>
<ul>
  <li><strong>„Ich sehe mein Album nicht.“</strong> — Meist wurde mit einer anderen E-Mail-Adresse registriert als erwartet, oder der Link wurde nie geöffnet. Prüfe unter <em>Nutzer</em>, welchem Konto das Album zugeordnet ist, und schick den Link gegebenenfalls erneut.</li>
  <li><strong>„Ich habe mein Passwort vergessen.“</strong> — Der Kunde kann sich auf der Anmeldeseite über <em>Passwort vergessen</em> selbst eine Zurücksetzen-Mail schicken. Du musst und kannst kein Passwort für ihn setzen.</li>
  <li><strong>„Die Bestätigungsmail kommt nicht an.“</strong> — Zuerst den Spam-Ordner prüfen lassen. Kommt bei mehreren Kunden nichts an, liegt es an der SMTP-Konfiguration deiner Instanz.</li>
</ul>
`,
  },
  {
    slug: "support-postfach",
    title: "Support-Anfragen beantworten",
    summary:
      "Das Postfach für Kundenanfragen — antworten, Status setzen und technische Probleme weiterleiten.",
    audience: ["admin"],
    category: "customers",
    keywords: ["support", "anfrage", "ticket", "hilfe", "hersteller", "weiterleiten", "fehler"],
    relatedPath: "/support",
    bodyHtml: `
<p>Kunden können dir aus der App heraus Anfragen schicken. Die laufen unter <strong>Support</strong> auf, mit Suche und Filter nach Status.</p>
<figure>
  <img src="/help/support-postfach/01-postfach.webp" alt="Das Support-Postfach mit Suchfeld, Statusfilter und einer neuen Anfrage" loading="lazy" />
  <figcaption>Neue Anfragen sind gekennzeichnet; über den Filter blendest du erledigte aus.</figcaption>
</figure>
<h2>Der Ablauf</h2>
<ol>
  <li>Neue Anfragen tragen ein <strong>Neu</strong>-Kennzeichen. Du bekommst zusätzlich eine E-Mail.</li>
  <li>Du antwortest direkt im Verlauf. Der Kunde bekommt deine Antwort per Mail und sieht sie in der App.</li>
  <li>Ist die Sache erledigt, markierst du die Anfrage entsprechend.</li>
</ol>
<h2>Technische Probleme weiterleiten</h2>
<p>Anfragen der Kategorie <em>technisch</em> betreffen oft nicht dich, sondern die Software selbst. Solche Tickets kannst du mit einer eigenen Notiz an den Hersteller weiterleiten — vorausgesetzt, deine Instanz ist dafür konfiguriert und der Kunde hat der Weitergabe zugestimmt.</p>
<p>Weitergeleitet werden dabei der Verlauf und der technische Kontext (Fehlermeldung, Version, Browser), den die App beim Auftreten des Problems mitgeschnitten hat. Der Kunde sieht vor dem Absenden genau, was das ist. Schlägt eine Weiterleitung fehl, wird das am Ticket angezeigt und du kannst es erneut versuchen.</p>
<blockquote>Ist keine Weiterleitung eingerichtet, verlässt keine dieser Daten deine Instanz — alle Anfragen bleiben dann bei dir.</blockquote>
`,
  },

  // --- Betrieb -------------------------------------------------------------
  {
    slug: "eigene-hilfeartikel",
    title: "Eigene Hilfe-Artikel schreiben",
    summary:
      "Eigene Anleitungen für deine Kunden anlegen — und mitgelieferte Artikel bei Bedarf überschreiben.",
    audience: ["admin"],
    category: "operations",
    keywords: ["hilfe", "artikel", "anleitung", "dokumentation", "eigene", "texte", "faq"],
    relatedPath: "/help/manage",
    bodyHtml: `
<p>Die Artikel, die du gerade liest, werden mit der Software ausgeliefert und passen damit immer zur laufenden Version. Alles, was nur bei dir gilt — Abholzeiten, Lieferfristen, deine Preisabsprachen —, kannst du zusätzlich selbst schreiben. Der Einstieg liegt auf der Hilfeseite oben rechts unter <strong>Artikel verwalten</strong>.</p>
<h2>Schritt für Schritt</h2>
<ol>
  <li>Auf <strong>Neuer Artikel</strong> klicken.</li>
</ol>
<figure>
  <img src="/help/eigene-hilfeartikel/01-neuer-artikel.webp" alt="Der Button „Neuer Artikel“" loading="lazy" />
  <figcaption>Der Einstieg liegt über der Liste deiner eigenen Artikel.</figcaption>
</figure>
<ol start="2">
  <li>Titel, Kategorie, Zielgruppe und Kurzbeschreibung ausfüllen, den Text im Editor schreiben und speichern.</li>
</ol>
<figure>
  <img src="/help/eigene-hilfeartikel/02-formular.webp" alt="Das Formular für einen neuen Hilfe-Artikel mit Titel, Kurz-Link, Kategorie, Sichtbarkeit und Editor" loading="lazy" />
  <figcaption>Der Kurz-Link entsteht automatisch aus dem Titel — er ist Teil der Adresse und sollte danach nicht mehr geändert werden.</figcaption>
</figure>
<h2>Die Felder</h2>
<ul>
  <li><strong>Kurz-Link</strong> — der letzte Teil der Adresse, also <code>/help/&lt;Kurz-Link&gt;</code>. Er wird beim Tippen aus dem Titel gebildet, solange der Artikel noch nicht existiert. Danach solltest du ihn stehen lassen: Links, die du schon verschickt hast, zeigen sonst ins Leere.</li>
  <li><strong>Sichtbar für</strong> — <em>Admin</em> sieht nur du, <em>Kunden</em> sehen angemeldete Kunden, <em>Öffentlich</em> ist auch ohne Konto lesbar. Mehrfachauswahl ist möglich.</li>
  <li><strong>Kurzbeschreibung</strong> — ein Satz. Er steht in der Übersicht unter dem Titel und erscheint in den (?)-Hinweisen an den Feldern.</li>
  <li><strong>Veröffentlicht</strong> — ausgeschaltet bleibt der Artikel ein Entwurf und ist für niemanden sichtbar.</li>
</ul>
<h2>Einen mitgelieferten Artikel überschreiben</h2>
<p>Vergibst du für deinen Artikel denselben Kurz-Link wie ein mitgelieferter, ersetzt deiner ihn vollständig. Das ist der Weg, wenn ein Standardtext für deinen Betrieb nicht stimmt — etwa weil du Abzüge selbst druckst statt über ein Labor. Zum Zurücksetzen löschst du deinen Artikel einfach wieder, dann erscheint der mitgelieferte erneut.</p>
<blockquote>Die mitgelieferten Artikel werden mit jedem Update aktualisiert. Deine eigenen bleiben unverändert stehen — schau bei überschriebenen Artikeln nach einem größeren Update also kurz nach, ob dein Text noch passt.</blockquote>
`,
  },
  {
    slug: "backups-updates",
    title: "Backups und Updates",
    summary:
      "Was automatisch gesichert wird, was du zusätzlich brauchst und worauf du beim Aktualisieren achtest.",
    audience: ["admin"],
    category: "operations",
    keywords: ["backup", "sicherung", "update", "aktualisieren", "wiederherstellen", "wartung", "server"],
    bodyHtml: `
<p>Deine Instanz läuft auf deinem eigenen Server. Damit liegt die Verantwortung für Sicherungen und Aktualisierungen bei dir — beides ist überschaubar, sollte aber nicht liegen bleiben.</p>
<h2>Automatische Backups</h2>
<p>Die Instanz legt <strong>jede Nacht</strong> ein Backup an und behält die letzten sieben. Das deckt den häufigsten Fall ab: versehentlich gelöschte Daten, die dir am nächsten Tag auffallen.</p>
<h2>Was das nicht abdeckt</h2>
<p>Diese Backups liegen auf demselben Server wie die Daten. Bei einem Ausfall der Festplatte oder einem Totalverlust des Servers sind sie mit weg. Für echte Sicherheit brauchst du eine <strong>Kopie an einem anderen Ort</strong> — etwa per automatischer Übertragung auf einen S3-Speicher oder ein anderes Ziel deiner Wahl. Wie das für deine Installation eingerichtet wird, steht in der Installationsdokumentation deines Setups.</p>
<blockquote>Ein Backup, das nie zurückgespielt wurde, ist eine Vermutung. Probier die Wiederherstellung einmal aus, solange nichts kaputt ist.</blockquote>
<h2>Updates</h2>
<ol>
  <li>Vor dem Update ein aktuelles Backup ziehen und sichern.</li>
  <li>Die neue Version einspielen. Nötige Datenbankänderungen laufen beim Start automatisch mit.</li>
  <li>Danach kurz durchklicken: Album öffnen, ein Bild ansehen, eine Testbestellung durchspielen.</li>
</ol>
<p>Welche Version gerade läuft, steht unten auf dieser Hilfeseite unter <em>Zusätzliche Informationen</em>. Diese Angabe hilft auch beim Melden von Problemen.</p>
`,
  },
];
