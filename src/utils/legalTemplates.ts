// Templates for the two public legal pages. They produce plain HTML that the
// admin edits further in the rich text editor (AdminLegalPage) and that
// LegalPage renders sanitized.

export interface LegalOperator {
  name: string;
  street: string;
  city: string;
  representative: string;
  phone: string;
  email: string;
  vatId: string;
  /** Who runs the server the instance is deployed on. */
  hostingProvider: string;
  /** Service used for transactional mail (SMTP), if not the host itself. */
  mailProvider: string;
}

export interface PrivacyContext {
  paypalEnabled: boolean;
  stripeEnabled: boolean;
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Marks spots the generator cannot fill from the settings — deliberately loud
// so they are not published by accident.
const todo = (hint: string) => `[bitte ergänzen: ${hint}]`;

const fill = (value: string, hint: string) => (value.trim() ? esc(value.trim()) : todo(hint));

// ponytail: static template string, no CMS — reicht für ein Standard-Impressum nach § 5 DDG
export function buildImprintHtml(g: LegalOperator): string {
  const address = `${esc(g.name)}<br/>${esc(g.street)}<br/>${esc(g.city)}`;
  return [
    "<h2>Impressum</h2>",
    "<h3>Angaben gemäß § 5 DDG</h3>",
    `<p>${address}</p>`,
    g.representative && `<p>Vertreten durch:<br/>${esc(g.representative)}</p>`,
    "<h3>Kontakt</h3>",
    `<p>${g.phone ? `Telefon: ${esc(g.phone)}<br/>` : ""}E-Mail: ${esc(g.email)}</p>`,
    g.vatId &&
      `<h3>Umsatzsteuer-ID</h3><p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br/>${esc(g.vatId)}</p>`,
    "<h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>",
    `<p>${address}</p>`,
    "<h3>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h3>",
    "<p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>",
  ]
    .filter(Boolean)
    .join("\n");
}

function paymentSection(ctx: PrivacyContext): string[] {
  const providers: string[] = [];

  if (ctx.paypalEnabled) {
    providers.push(
      "<p><strong>PayPal.</strong> Bei Zahlung über PayPal werden die Zahlungsdaten an die PayPal (Europe) S.à r.l. et Cie, S.C.A., 22-24 Boulevard Royal, L-2449 Luxemburg, übermittelt. Übermittelt werden insbesondere Bestell- und Betragsdaten sowie die zur Zahlungsabwicklung erforderlichen Angaben. PayPal ist für die Verarbeitung im Rahmen des Zahlungsvorgangs eigenständig verantwortlich; es gelten ergänzend die Datenschutzhinweise von PayPal unter <a href=\"https://www.paypal.com/de/webapps/mpp/ua/privacy-full\">paypal.com</a>.</p>",
    );
  }

  if (ctx.stripeEnabled) {
    providers.push(
      "<p><strong>Stripe.</strong> Bei Zahlung über Stripe werden die Zahlungsdaten an die Stripe Payments Europe, Limited, 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland, übermittelt. Die Eingabe der Zahlungsdaten erfolgt dabei unmittelbar bei Stripe; wir erhalten lediglich eine Rückmeldung über den Status der Zahlung. Es gelten ergänzend die Datenschutzhinweise von Stripe unter <a href=\"https://stripe.com/de/privacy\">stripe.com</a>.</p>",
    );
  }

  if (providers.length === 0) {
    providers.push(
      `<p>${todo(
        "eingesetzte Zahlungsart beschreiben, z. B. Rechnung oder Überweisung",
      )}</p>`,
    );
  }

  return [
    "<h3>7. Zahlungsabwicklung</h3>",
    "<p>Rechtsgrundlage für die Verarbeitung im Rahmen der Zahlungsabwicklung ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Kaufvertrags). Kreditkarten- oder Kontodaten werden von uns nicht gespeichert.</p>",
    ...providers,
  ];
}

function thirdCountrySection(ctx: PrivacyContext): string[] {
  if (!ctx.paypalEnabled && !ctx.stripeEnabled) return [];
  return [
    "<h3>13. Datenübermittlung in Drittländer</h3>",
    "<p>Die von uns eingesetzten Zahlungsdienstleister können Daten an Konzerngesellschaften in den USA übermitteln. Die Übermittlung erfolgt auf Grundlage von Standardvertragsklauseln der EU-Kommission gemäß Art. 46 Abs. 2 lit. c DSGVO bzw. – soweit das jeweilige Unternehmen zertifiziert ist – auf Grundlage eines Angemessenheitsbeschlusses nach Art. 45 DSGVO (EU-U.S. Data Privacy Framework).</p>",
  ];
}

// A conventional German privacy policy for this application: self-hosted
// gallery with customer accounts, photo delivery, selections and payments.
// It is a starting point that still needs a legal review before publishing.
export function buildPrivacyHtml(g: LegalOperator, ctx: PrivacyContext): string {
  const address = `${fill(g.name, "Name / Firma")}<br/>${fill(g.street, "Straße und Hausnummer")}<br/>${fill(g.city, "PLZ und Ort")}`;
  const contact = [
    g.phone.trim() && `Telefon: ${esc(g.phone.trim())}`,
    `E-Mail: ${fill(g.email, "Kontakt-E-Mail")}`,
  ]
    .filter(Boolean)
    .join("<br/>");

  const stand = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return [
    "<h2>Datenschutzerklärung</h2>",
    "<p>Wir freuen uns über Ihr Interesse an unserer Fotogalerie. Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Nachfolgend informieren wir Sie darüber, welche Daten wir bei der Nutzung dieser Anwendung verarbeiten, zu welchen Zwecken das geschieht und welche Rechte Ihnen zustehen.</p>",

    "<h3>1. Verantwortlicher</h3>",
    "<p>Verantwortlich für die Datenverarbeitung im Sinne von Art. 4 Nr. 7 DSGVO ist:</p>",
    `<p>${address}${g.representative.trim() ? `<br/>Vertreten durch: ${esc(g.representative.trim())}` : ""}</p>`,
    `<p>${contact}</p>`,
    "<p>Einen Datenschutzbeauftragten haben wir nicht bestellt, da die gesetzlichen Voraussetzungen hierfür nicht vorliegen.</p>",

    "<h3>2. Geltungsbereich</h3>",
    "<p>Diese Datenschutzerklärung gilt für die Nutzung dieser Web-Anwendung einschließlich der geschützten Kundengalerien, der Bildauswahl, des Downloadbereichs und der Bestellabwicklung.</p>",

    "<h3>3. Hosting und Server-Logfiles</h3>",
    `<p>Die Anwendung wird betrieben bei: ${fill(g.hostingProvider, "Hosting-Anbieter mit Anschrift")}. Mit dem Anbieter besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.</p>`,
    "<p>Bei jedem Aufruf werden automatisch Zugriffsdaten in Server-Logfiles gespeichert: IP-Adresse des anfragenden Geräts, Datum und Uhrzeit des Zugriffs, aufgerufene Adresse, übertragene Datenmenge, Statusmeldung, verweisende Seite sowie Browsertyp und Betriebssystem. Diese Verarbeitung ist zur Auslieferung der Anwendung technisch erforderlich und dient der Systemsicherheit sowie der Fehleranalyse. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt im sicheren und störungsfreien Betrieb.</p>",

    "<h3>4. Kundenkonto und Galeriezugang</h3>",
    "<p>Für den Zugang zu einer Galerie legen wir ein Nutzerkonto an bzw. Sie registrieren sich selbst. Dabei verarbeiten wir Ihre E-Mail-Adresse, Ihren Vor- und Nachnamen, ein von Ihnen gewähltes Passwort (ausschließlich als kryptografischer Hash gespeichert) sowie – soweit für die Auftragsabwicklung erforderlich – Ihre Anschrift und Telefonnummer.</p>",
    "<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, da die Verarbeitung zur Erfüllung des Vertrags über die Bereitstellung der Bilder erforderlich ist.</p>",

    "<h3>5. Bildmaterial aus Fotoshootings</h3>",
    "<p>Im Rahmen eines Fotoauftrags verarbeiten wir die aufgenommenen Fotografien. Diese sind personenbezogene Daten der abgebildeten Personen. Die Bilder werden in Ihrer geschützten Galerie bereitgestellt und sind nur nach Anmeldung abrufbar; Vorschaubilder können mit einem Wasserzeichen versehen sein.</p>",
    "<p>Rechtsgrundlage für die Verarbeitung im Rahmen des Auftrags ist Art. 6 Abs. 1 lit. b DSGVO. Soweit eine Galerie ausdrücklich öffentlich zugänglich geschaltet oder Bildmaterial darüber hinaus veröffentlicht wird, erfolgt dies ausschließlich auf Grundlage Ihrer Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO in Verbindung mit § 22 KunstUrhG. Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen.</p>",

    "<h3>6. Bildauswahl, Downloads und Bestellungen</h3>",
    "<p>Wenn Sie Bilder markieren, eine Auswahl abschicken oder Bilder herunterladen, speichern wir die getroffene Auswahl sowie den Bearbeitungsstand, um Ihren Auftrag ausführen zu können. Bei einer Bestellung verarbeiten wir zusätzlich die bestellten Positionen, den Bestellzeitpunkt, den Rechnungsbetrag und Ihre Rechnungsanschrift. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, für die Aufbewahrung der Rechnungsdaten zusätzlich Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit den handels- und steuerrechtlichen Aufbewahrungspflichten.</p>",

    ...paymentSection(ctx),

    "<h3>8. E-Mail-Versand</h3>",
    `<p>Wir versenden Nachrichten, die für die Nutzung erforderlich sind, etwa Einladungen zur Galerie, Bestätigungen einer Bestellung, Hinweise zur Auswahl sowie Nachrichten zum Zurücksetzen des Passworts. Hierfür setzen wir ein: ${fill(g.mailProvider, "E-Mail-Dienst / SMTP-Anbieter mit Anschrift")}. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Werbliche E-Mails versenden wir nur mit Ihrer Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO.</p>`,

    "<h3>9. Cookies, lokale Speicherung und App-Funktion</h3>",
    "<p>Die Anwendung setzt keine Cookies zu Analyse- oder Werbezwecken ein. Für die Anmeldung wird ein Sitzungs-Token im lokalen Speicher (localStorage) Ihres Browsers abgelegt; zusätzlich speichern wir dort Anzeigeeinstellungen der Instanz zwischen. Die Anwendung kann als Progressive Web App installiert werden und legt dabei über einen Service Worker Programmdateien im Browser-Cache ab, damit sie schneller lädt.</p>",
    "<p>Diese Speicherung ist unbedingt erforderlich, damit der von Ihnen angeforderte Dienst funktioniert; sie erfolgt daher nach § 25 Abs. 2 Nr. 2 TDDDG ohne Einwilligung. Sie können die gespeicherten Daten jederzeit über die Einstellungen Ihres Browsers löschen.</p>",

    "<h3>10. Kamerazugriff</h3>",
    "<p>Für das Einlesen eines QR-Codes kann die Anwendung auf die Kamera Ihres Geräts zugreifen. Der Zugriff erfolgt nur nach ausdrücklicher Freigabe durch Ihren Browser. Die Auswertung findet ausschließlich lokal auf Ihrem Gerät statt; es werden dabei keine Bilder an uns übertragen oder gespeichert.</p>",

    "<h3>11. Schriftarten und externe Inhalte</h3>",
    "<p>Schriftarten und sonstige Gestaltungsdateien werden von unserem eigenen Server ausgeliefert. Eine Verbindung zu Content-Delivery-Netzwerken oder Schriftarten-Diensten Dritter findet nicht statt. Analyse- oder Trackingdienste setzen wir nicht ein.</p>",

    "<h3>12. Empfänger der Daten</h3>",
    "<p>Ihre Daten geben wir nur weiter, soweit dies zur Vertragserfüllung erforderlich ist oder eine gesetzliche Verpflichtung besteht. Empfänger können sein: der Hosting-Anbieter, der E-Mail-Dienstleister, der Zahlungsdienstleister sowie – im Fall gedruckter Produkte – das beauftragte Fotolabor oder der Versanddienstleister. Soweit diese Empfänger weisungsgebunden für uns tätig werden, bestehen Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO.</p>",

    ...thirdCountrySection(ctx),

    "<h3>14. Speicherdauer</h3>",
    "<p>Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke erforderlich ist. Bilddaten und Galerien werden nach Abschluss des Auftrags und Ablauf der vereinbarten Bereitstellungsdauer gelöscht. Konto- und Bestelldaten löschen wir, sobald der Zweck entfällt, spätestens jedoch nach Ablauf der gesetzlichen Aufbewahrungsfristen von sechs bzw. zehn Jahren nach § 257 HGB und § 147 AO. Server-Logfiles werden nach kurzer Zeit automatisch überschrieben. Automatisch erstellte Sicherungskopien der Datenbank werden turnusmäßig überschrieben, sodass gelöschte Daten auch aus den Sicherungen entfallen.</p>",

    "<h3>15. Datensicherheit</h3>",
    "<p>Die Übertragung erfolgt verschlüsselt über HTTPS (TLS). Passwörter werden ausschließlich als Hash gespeichert. Der Zugang zu den Galerien ist durch Anmeldung geschützt; der Administrationsbereich ist gesondert abgesichert. Wir treffen darüber hinaus technische und organisatorische Maßnahmen nach Art. 32 DSGVO, um Ihre Daten gegen Verlust und unbefugten Zugriff zu schützen.</p>",

    "<h3>16. Ihre Rechte</h3>",
    "<p>Ihnen stehen als betroffener Person folgende Rechte zu:</p>",
    "<ul>",
    "<li>Auskunft über die zu Ihnen verarbeiteten Daten (Art. 15 DSGVO)</li>",
    "<li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>",
    "<li>Löschung (Art. 17 DSGVO)</li>",
    "<li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>",
    "<li>Datenübertragbarkeit (Art. 20 DSGVO)</li>",
    "<li>Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>",
    "</ul>",
    "<p>Zur Ausübung Ihrer Rechte genügt eine Nachricht an die oben genannten Kontaktdaten.</p>",

    "<h3>17. Widerspruchsrecht</h3>",
    "<p>Soweit wir Daten auf Grundlage berechtigter Interessen nach Art. 6 Abs. 1 lit. f DSGVO verarbeiten, haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit Widerspruch gegen diese Verarbeitung einzulegen (Art. 21 DSGVO).</p>",

    "<h3>18. Beschwerderecht</h3>",
    "<p>Sie haben nach Art. 77 DSGVO das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist insbesondere die Aufsichtsbehörde Ihres gewöhnlichen Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.</p>",

    "<h3>19. Keine automatisierte Entscheidungsfindung</h3>",
    "<p>Eine automatisierte Entscheidungsfindung einschließlich Profiling nach Art. 22 DSGVO findet nicht statt.</p>",

    "<h3>20. Erforderlichkeit der Bereitstellung</h3>",
    "<p>Die Bereitstellung Ihrer Daten ist weder gesetzlich noch vertraglich vorgeschrieben. Ohne die zur Anmeldung und Auftragsabwicklung erforderlichen Angaben können wir Ihnen die Galerie und die Bestellabwicklung jedoch nicht zur Verfügung stellen.</p>",

    "<h3>21. Änderungen dieser Datenschutzerklärung</h3>",
    `<p>Wir passen diese Datenschutzerklärung an, sobald Änderungen der Anwendung oder der Rechtslage dies erforderlich machen. Es gilt jeweils die hier veröffentlichte Fassung.</p><p>Stand: ${esc(stand)}</p>`,
  ].join("\n");
}
