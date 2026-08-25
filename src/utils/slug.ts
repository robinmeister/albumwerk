// Kurz-Links (Slugs) für URLs.
//
// Lag ursprünglich in utils/help.ts und wird inzwischen auch von den
// Termin-Arten gebraucht (der Slug wählt im eingebetteten Buchungsformular die
// Leistung vor: /embed/?type=<slug>). Eigene Datei statt Import aus dem
// Hilfe-Modul — die Funktion hat mit der Hilfe nichts zu tun, und die
// Terminverwaltung soll nicht an ihr hängen.
//
// Umlaute werden ausgeschrieben statt entfernt: aus "Familienshooting Für
// Zwei" wird "familienshooting-fuer-zwei" und nicht "familienshooting-f-r-zwei".
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
