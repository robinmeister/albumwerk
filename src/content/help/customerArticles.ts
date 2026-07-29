// Help articles for customers and for visitors without an account. Articles
// tagged "public" are readable while logged out — keep them free of anything
// instance-specific beyond what the settings already expose publicly.
//
// See adminArticles.ts for the markup conventions.

import { HelpArticle } from "./types";

export const customerArticles: HelpArticle[] = [
  {
    slug: "was-ist-albumwerk",
    title: "Was ist das hier?",
    summary:
      "Die Galerie deines Fotografen: Bilder ansehen, auswählen, herunterladen oder bestellen.",
    audience: ["public", "customer"],
    category: "basics",
    keywords: ["was ist", "albumwerk", "galerie", "überblick", "hilfe"],
    bodyHtml: `
<p>Diese Seite ist die private Bildergalerie deines Fotografen. Hier siehst du die Bilder deines Termins, kannst dir welche aussuchen und sie — je nach Absprache — direkt herunterladen oder als Abzug bestellen.</p>
<h2>Wie es abläuft</h2>
<ol>
  <li>Du bekommst von deinem Fotografen einen <strong>Link</strong> oder einen <strong>QR-Code</strong>.</li>
  <li>Du öffnest ihn und legst dir — falls nötig — ein Konto an. Dein Album wird dabei automatisch zugeordnet.</li>
  <li>Du siehst deine Bilder als Vorschau. Die Vorschauen tragen ein Wasserzeichen; die Bilder, die du bekommst, natürlich nicht.</li>
  <li>Du wählst Bilder aus und lädst sie herunter oder bestellst sie.</li>
</ol>
<p>Deine Bilder sind nur für dich sichtbar. Andere Kunden sehen dein Album nicht.</p>
`,
  },
  {
    slug: "album-oeffnen",
    title: "Wie komme ich an mein Album?",
    summary:
      "Über den Link oder QR-Code deines Fotografen — mit oder ohne bestehendes Konto.",
    audience: ["public", "customer"],
    category: "basics",
    keywords: ["link", "qr", "qr-code", "code", "album", "öffnen", "zugang", "registrieren", "anmelden"],
    bodyHtml: `
<h2>Du hast einen Link oder QR-Code</h2>
<p>Öffne ihn einfach. Was dann passiert, hängt davon ab, ob du schon ein Konto hast:</p>
<ul>
  <li><strong>Mit Konto:</strong> Du meldest dich an, das Album landet in deiner Übersicht und öffnet sich direkt.</li>
  <li><strong>Ohne Konto:</strong> Du wirst durch die Registrierung geführt. Sobald sie abgeschlossen ist, ist das Album automatisch mit deinem Konto verknüpft — du musst den Link kein zweites Mal öffnen.</li>
</ul>
<h2>Du hast nur einen Album-Code</h2>
<p>Melde dich an und öffne den Link zum Hinzufügen eines Albums, den dir dein Fotograf geschickt hat. Dort kannst du den Code eintragen.</p>
<h2>Das Album fehlt in meiner Übersicht</h2>
<ul>
  <li>Prüfe, ob du mit <strong>derselben E-Mail-Adresse</strong> angemeldet bist, die du bei der Registrierung angegeben hast. Bei zwei Konten liegt das Album nur in einem davon.</li>
  <li>Öffne den Link deines Fotografen noch einmal — die Zuordnung passiert genau dabei.</li>
  <li>Hilft beides nicht, melde dich bei deinem Fotografen. Er sieht, welchem Konto das Album zugeordnet ist.</li>
</ul>
`,
  },
  {
    slug: "bilder-auswaehlen",
    title: "Bilder auswählen",
    summary:
      "Bilder markieren, die Auswahl an deinen Fotografen schicken oder direkt weitergehen.",
    audience: ["customer"],
    category: "basics",
    keywords: ["auswählen", "auswahl", "markieren", "favoriten", "vorauswahl", "abschicken"],
    relatedPath: "/album",
    bodyHtml: `
<p>Tippe oder klicke ein Bild an, um es zu markieren. Markierte Bilder sind mit einem Haken gekennzeichnet, unten siehst du laufend, wie viele es sind. Ein erneuter Klick nimmt die Markierung wieder weg.</p>
<h2>Was du mit der Auswahl machen kannst</h2>
<p>Welche Möglichkeiten du hast, legt dein Fotograf für das jeweilige Album fest:</p>
<ul>
  <li><strong>Download</strong> — die markierten Bilder direkt herunterladen. Das gibt es, wenn das Album bereits bezahlt oder öffentlich ist.</li>
  <li><strong>Kaufen</strong> — mit den markierten Bildern zur Kasse gehen und Abzüge oder Downloads bestellen.</li>
  <li><strong>Auswahl abschicken</strong> — deinem Fotografen mitteilen, welche Bilder dir am besten gefallen, ohne schon etwas zu kaufen. Typisch, wenn er die ausgewählten Bilder danach noch bearbeitet.</li>
</ul>
<h2>Wenn ein Paket hinterlegt ist</h2>
<p>Bei manchen Alben ist eine feste Anzahl Bilder im Preis enthalten. Dann musst du mindestens so viele auswählen, bevor es weitergeht — die App zeigt dir an, wie viele dir noch fehlen. Jedes weitere Bild kostet den Aufpreis, den dein Fotograf festgelegt hat.</p>
<h2>Warum haben die Bilder ein Wasserzeichen?</h2>
<p>Was du im Album siehst, ist eine verkleinerte Vorschau mit Wasserzeichen. Die Bilder, die du herunterlädst oder bestellst, sind in voller Auflösung und ohne Wasserzeichen.</p>
`,
  },
  {
    slug: "bestellen-bezahlen",
    title: "Bestellen und bezahlen",
    summary:
      "Von der Auswahl über Produkte und Lieferadresse bis zur Zahlung mit PayPal oder Karte.",
    audience: ["customer"],
    category: "basics",
    keywords: ["bestellen", "kaufen", "bezahlen", "paypal", "kreditkarte", "warenkorb", "kasse", "lieferung"],
    relatedPath: "/pricing",
    bodyHtml: `
<p>Wenn du im Album auf <strong>Kaufen</strong> gehst, landest du bei der Zusammenstellung deiner Bestellung.</p>
<h2>Schritt für Schritt</h2>
<ol>
  <li><strong>Produkt je Bild wählen</strong> — für jedes ausgewählte Bild entscheidest du, was du haben möchtest: einen digitalen Download, einen Abzug in einer bestimmten Größe, eine Leinwand und so weiter. Die Beschreibung nennt dir Papierart, Rahmung oder Lieferzeit, sofern dein Fotograf das hinterlegt hat.</li>
  <li><strong>Menge festlegen</strong> — von einem Abzug kannst du auch mehrere bestellen.</li>
  <li><strong>Adresse angeben</strong> — nur nötig, wenn etwas Physisches dabei ist. Bei reinen Downloads entfällt der Schritt.</li>
  <li><strong>Bezahlen</strong> — je nachdem, was dein Fotograf eingerichtet hat, per PayPal oder per Karte (inklusive Apple Pay und Google Pay). Sind beide verfügbar, kannst du frei wählen.</li>
</ol>
<h2>Nach der Bestellung</h2>
<p>Digitale Bilder stehen dir sofort unter <strong>Downloads</strong> zur Verfügung. Abzüge und andere physische Produkte werden von deinem Fotografen in Auftrag gegeben und dir zugeschickt — bei Fragen zur Lieferzeit wendest du dich direkt an ihn.</p>
<h2>Deine Zwischenauswahl bleibt erhalten</h2>
<p>Wenn du die Zusammenstellung zwischendurch verlässt, ist sie beim nächsten Öffnen im selben Browser noch da. Wechselst du das Gerät, fängst du allerdings neu an.</p>
<h2>Es wird keine Zahlungsart angeboten</h2>
<p>Dann hat dein Fotograf die Bezahlung in der App nicht eingerichtet. Sprich ihn direkt an — er kann die Abwicklung auch außerhalb der App vornehmen.</p>
`,
  },
  {
    slug: "downloads-nutzen",
    title: "Bilder herunterladen",
    summary:
      "Wo deine gekauften und freigegebenen Bilder liegen und wie du sie einzeln oder als ZIP bekommst.",
    audience: ["customer"],
    category: "basics",
    keywords: ["download", "herunterladen", "zip", "speichern", "handy", "auflösung"],
    relatedPath: "/downloads",
    bodyHtml: `
<p>Unter <strong>Downloads</strong> findest du alle Bilder, die für dich freigegeben sind — gekaufte ebenso wie solche aus bereits bezahlten oder öffentlichen Alben.</p>
<h2>Einzeln oder alle auf einmal</h2>
<p>Du kannst jedes Bild einzeln herunterladen oder dir alle zusammen als <strong>ZIP-Archiv</strong> geben lassen. Das ZIP ist bei vielen Bildern der bequemere Weg; die Datei wird dabei im Browser zusammengestellt, was je nach Menge einen Moment dauern kann.</p>
<h2>Auf dem Handy</h2>
<ul>
  <li><strong>iPhone:</strong> Einzelne Bilder landen in der Dateien-App. Von dort kannst du sie über <em>Teilen</em> in die Fotos-App sichern. ZIP-Archive lassen sich in der Dateien-App durch Antippen entpacken.</li>
  <li><strong>Android:</strong> Downloads landen im Ordner <em>Downloads</em> und tauchen je nach Gerät automatisch in der Galerie auf.</li>
</ul>
<p>Bei vielen Bildern ist der Download am Computer meist entspannter als am Handy.</p>
<h2>Die Bilder sind kleiner als erwartet</h2>
<p>Achte darauf, dass du wirklich aus <em>Downloads</em> heruntergeladen hast und nicht das Vorschaubild aus dem Album gespeichert hast. Vorschauen sind absichtlich verkleinert und tragen ein Wasserzeichen.</p>
<h2>Wie lange sind die Bilder verfügbar?</h2>
<p>Das legt dein Fotograf fest. Lade dir deine Bilder am besten zeitnah herunter und sichere sie zusätzlich woanders.</p>
`,
  },
  {
    slug: "konto-passwort",
    title: "Konto und Passwort",
    summary:
      "Profildaten ändern, Passwort zurücksetzen und was bei ausbleibenden E-Mails hilft.",
    audience: ["customer", "public"],
    category: "basics",
    keywords: ["passwort", "vergessen", "zurücksetzen", "konto", "profil", "e-mail", "bestätigung", "anmelden", "login"],
    relatedPath: "/profile",
    bodyHtml: `
<h2>Profildaten ändern</h2>
<p>Unter <strong>Profil</strong> passt du Name, Kontaktdaten und Anschrift an. Die Adresse wird beim Bestellen von Abzügen als Lieferadresse vorgeschlagen.</p>
<h2>Passwort vergessen</h2>
<p>Auf der Anmeldeseite gibt es <strong>Passwort vergessen</strong>. Du trägst deine E-Mail-Adresse ein und bekommst eine Mail mit einem Link, über den du ein neues Passwort setzt. Der Link ist nur begrenzt gültig — fordere im Zweifel einfach einen neuen an.</p>
<h2>Es kommt keine E-Mail an</h2>
<ul>
  <li>Sieh im <strong>Spam-Ordner</strong> nach.</li>
  <li>Prüfe, ob du dich wirklich mit dieser Adresse registriert hast — Tippfehler bei der Registrierung sind der häufigste Grund.</li>
  <li>Warte ein paar Minuten, manche Anbieter stellen verzögert zu.</li>
  <li>Kommt weiterhin nichts an, wende dich an deinen Fotografen.</li>
</ul>
<h2>E-Mail-Adresse bestätigen</h2>
<p>Nach der Registrierung bekommst du eine Bestätigungsmail. Falls du sie nicht mehr findest, kannst du sie dir erneut zuschicken lassen.</p>
`,
  },
  {
    slug: "hilfe-anfordern",
    title: "Hilfe bei deinem Fotografen anfordern",
    summary:
      "Wie du eine Anfrage stellst und welche technischen Angaben dabei optional mitgeschickt werden.",
    audience: ["customer"],
    category: "basics",
    keywords: ["support", "hilfe", "kontakt", "problem", "fehler", "melden", "anfrage"],
    relatedPath: "/support",
    bodyHtml: `
<p>Findest du hier keine Antwort, kannst du deinem Fotografen unter <strong>Support</strong> direkt schreiben. Du siehst deine Anfragen und alle Antworten im Verlauf und wirst per E-Mail informiert, sobald es etwas Neues gibt.</p>
<h2>Eine gute Anfrage</h2>
<ul>
  <li>Wähle die passende <strong>Kategorie</strong> — technisches Problem, Album, Bestellung, Bezahlung oder sonstiges.</li>
  <li>Schreib, <strong>was du gemacht hast</strong> und <strong>was stattdessen passiert ist</strong>. „Beim Klick auf Kaufen passiert nichts“ hilft mehr als „geht nicht“.</li>
  <li>Nenn das Album und, falls es um eine Bestellung geht, die Bestellung.</li>
</ul>
<h2>Technischer Kontext</h2>
<p>Bei technischen Problemen kann die App zusätzlich mitschicken, was im Hintergrund schiefgelaufen ist: die Fehlermeldung, die Programmversion und dein Browser. Du siehst vor dem Absenden ausklappbar genau, was das ist, und entscheidest selbst, ob es mitgeht.</p>
<p>Dein Fotograf kann solche Anfragen an den Hersteller der Software weiterleiten, wenn das Problem nicht bei ihm liegt. Auch dafür wirst du vorher um Zustimmung gebeten.</p>
`,
  },
];
