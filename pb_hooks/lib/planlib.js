// Prüfung eines Plans aus dem Termin-Interview, bevor er irgendetwas
// überschreibt (docs/superpowers/specs/2026-09-30-termin-interview-design.md).
//
// Die Feldregeln der Collections (Slug-Muster, Mindestdauer) greifen beim
// Speichern ohnehin. Hier wird vorher geprüft, damit die Fotograf:in eine
// verständliche Meldung bekommt statt „Failed to save record“ — und damit
// Fehler, die keine Feldregel kennt (doppelter Slug im selben Plan, Verweis auf
// eine unbekannte Leistung), gar nicht erst in die Transaktion kommen.

function validatePlan(body) {
  const types = body && Array.isArray(body.types) ? body.types : null;
  const rules = body && Array.isArray(body.rules) ? body.rules : null;
  if (!types || !rules) return "Der Plan ist unvollständig.";

  const slugs = {};
  for (let i = 0; i < types.length; i++) {
    const type = types[i] || {};
    const slug = String(type.slug || "");
    if (!/^[a-z0-9-]{1,60}$/.test(slug)) return "Ungültiger Kurz-Link „" + slug + "“.";
    if (slugs[slug]) return "Der Kurz-Link „" + slug + "“ kommt doppelt vor.";
    slugs[slug] = true;
    if (!(Number(type.durationMin) >= 5)) {
      return "„" + type.name + "“: Die Dauer muss mindestens 5 Minuten betragen.";
    }
  }
  if (!types.some((type) => type && type.active)) return "Mindestens eine Leistung muss buchbar sein.";

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i] || {};
    const weekday = Number(rule.weekday);
    if (!(weekday >= 1 && weekday <= 7)) return "Ungültiger Wochentag.";
    const length = Number(rule.endMinute) - Number(rule.startMinute);
    if (!(length > 0 && length <= 1440)) {
      return "Ein Zeitfenster muss zwischen 1 Minute und 24 Stunden lang sein.";
    }
    const allowed = Array.isArray(rule.allowedSlugs) ? rule.allowedSlugs : [];
    for (let j = 0; j < allowed.length; j++) {
      if (!slugs[allowed[j]]) {
        return "Ein Zeitfenster verweist auf die unbekannte Leistung „" + allowed[j] + "“.";
      }
    }
  }
  return null;
}

module.exports = { validatePlan: validatePlan };
