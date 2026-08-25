// Abnahmeskript für die Terminbuchungs-Endpunkte, gegen die laufende
// Dev-Instanz (`make dev`).
//
//   node scripts/verify-booking.mjs
//
// Prüft Verfügbarkeit, Doppelbuchungssperre, Feldkontrolle, Storno/Umbuchung,
// Freigabe, manuelle Termine, alle Mails (über die Mailpit-API, inklusive
// .ics-Anhang) und den Wartungsjob.
//
// ACHTUNG: Das Skript LÖSCHT vorhandene Termine, Regeln und Termin-Arten und
// leert Mailpit. Nur gegen die Dev-Instanz laufen lassen, nie gegen Produktion.
//
// Übergangsweise: In Etappe 6 wandern diese Strecken in die Playwright-Suite
// (docs/terminbuchung.md §14). Danach kann diese Datei entfallen.
const APP = 'http://localhost:8091'
const MAILPIT = 'http://localhost:8025'

let ok = 0
let failed = 0
function check(label, condition, detail) {
  if (condition) { ok++; console.log('  ✓', label) }
  else { failed++; console.log('  ✗', label, detail === undefined ? '' : '→ ' + JSON.stringify(detail)) }
}
const section = (t) => console.log('\n### ' + t)

const api = async (path, options = {}) => {
  const res = await fetch(APP + path, options)
  let body = null
  try { body = await res.json() } catch { body = null }
  return { status: res.status, body }
}

// --- Anmeldung -------------------------------------------------------------
const auth = await api('/api/collections/users/auth-with-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: 'admin@demo.test', password: 'demo123456' }),
})
const TOKEN = auth.body.token
const admin = (extra = {}) => ({ Authorization: TOKEN, 'Content-Type': 'application/json', ...extra })

// --- Aufräumen von früheren Läufen ----------------------------------------
for (const collection of ['appointments', 'availabilityRules', 'appointmentTypes']) {
  const list = await api(`/api/collections/${collection}/records?perPage=200`, { headers: admin() })
  for (const item of list.body?.items || []) {
    await fetch(`${APP}/api/collections/${collection}/records/${item.id}`, { method: 'DELETE', headers: admin() })
  }
}
await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE' })

// --- Einrichtung -----------------------------------------------------------
section('Einrichtung')
const settings = await api('/api/collections/settings/records/appsettings0001', {
  method: 'PATCH',
  headers: admin(),
  body: JSON.stringify({
    bookingEnabled: true,
    timezone: 'Europe/Berlin',
    bookingHorizonDays: 90,
    bookingPendingExpiryHours: 48,
    bookingCancelDeadlineHours: 24,
    bookingReminderHours: 24,
    bookingNotificationEmail: 'fotografin@demo.test',
    businessName: 'Studio Demo',
  }),
})
check('Einstellungen gespeichert', settings.status === 200, settings.body?.message)

const mkType = async (data) => (await api('/api/collections/appointmentTypes/records', {
  method: 'POST', headers: admin(), body: JSON.stringify(data),
})).body

const portrait = await mkType({
  name: 'Portraitshooting', slug: 'portrait', durationMin: 60, bufferMin: 0,
  leadTimeMin: 0, phoneMode: 'optional', price: 149, active: true, sort: 1,
  location: 'Studio, Musterstraße 1',
})
const intro = await mkType({
  name: 'Kennenlerngespräch', slug: 'intro', durationMin: 30, bufferMin: 0,
  leadTimeMin: 0, phoneMode: 'required', price: 0, active: true, sort: 2,
  requiresApproval: true,
})
check('Termin-Arten angelegt', !!portrait?.id && !!intro?.id)

// Ein Wochentag weit in der Zukunft, damit Mindestvorlauf/Horizont nicht stören.
const target = new Date(Date.now() + 21 * 86400000)
const weekday = target.getUTCDay() === 0 ? 7 : target.getUTCDay()
const DATE = target.toISOString().slice(0, 10)

const rule = await api('/api/collections/availabilityRules/records', {
  method: 'POST', headers: admin(),
  body: JSON.stringify({ weekday, startMinute: 540, endMinute: 720, active: true }),
})
check('Verfügbarkeitsregel angelegt (9–12 Uhr)', rule.status === 200, rule.body?.message)

// --- Verfügbarkeit ---------------------------------------------------------
section('Verfügbarkeit')
const avail = await api(`/api/custom/booking/availability?type=portrait&from=${DATE}&to=${DATE}`)
check('Endpunkt antwortet', avail.status === 200, avail.body)
check('drei Slots (9, 10, 11 Uhr)', avail.body?.slots?.length === 3, avail.body?.slots)
check('Zeitzone wird mitgeliefert', avail.body?.timezone === 'Europe/Berlin')
check('Preis und Dauer der Art', avail.body?.type?.durationMin === 60 && avail.body?.type?.price === 149)

// PocketBase weist eine nicht-leere listRule nicht ab, sondern wendet sie als
// Filter an: Gäste bekommen 200 mit leerer Liste. Entscheidend ist, dass keine
// Regel durchsickert.
const rules = await api('/api/collections/availabilityRules/records')
check('Regeln sickern nicht an Gäste durch', (rules.body?.totalItems ?? -1) === 0, rules.body)
const rulesAdmin = await api('/api/collections/availabilityRules/records', { headers: admin() })
check('Admin sieht die Regeln sehr wohl', (rulesAdmin.body?.totalItems ?? 0) > 0)

const firstSlot = avail.body?.slots?.[0]?.start

// --- Buchen ----------------------------------------------------------------
section('Buchen')
const bookBody = (extra = {}) => JSON.stringify({
  type: 'portrait', start: firstSlot, name: 'Erika Musterfrau',
  email: 'erika@example.test', phone: '0170 1234567',
  message: 'Bewerbungsfotos', consent: true, ...extra,
})

const booked = await api('/api/custom/booking', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bookBody(),
})
check('Buchung angenommen', booked.status === 200, booked.body)
check('Token ausgegeben', (booked.body?.token || '').length > 20)
check('sofort bestätigt (keine Freigabe nötig)', booked.body?.requiresApproval === false)

const dup = await api('/api/custom/booking', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: bookBody({ email: 'zweite@example.test' }),
})
check('Doppelbuchung wird abgelehnt', dup.status === 409 && dup.body?.code === 'slot_taken', dup.body)

const after = await api(`/api/custom/booking/availability?type=portrait&from=${DATE}&to=${DATE}`)
check('gebuchter Slot verschwindet aus der Liste', after.body?.slots?.length === 2, after.body?.slots)

// --- Feldkontrolle ---------------------------------------------------------
section('Feldkontrolle und Missbrauchsabwehr')
const direct = await api('/api/collections/appointments/records', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: portrait.id, start: firstSlot, status: 'confirmed', durationMin: 5 }),
})
check('direktes Anlegen auf der Collection ist gesperrt', direct.status === 400 || direct.status === 403, direct.status)

const third = avail.body?.slots?.[2]?.start
const spoofed = await api('/api/custom/booking', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'portrait', start: third, name: 'Trick', email: 'trick@example.test',
    consent: true, status: 'confirmed', durationMin: 5, price: 0, token: 'selbstgewählt',
  }),
})
check('Buchung mit untergeschobenen Feldern geht durch, ohne sie zu übernehmen', spoofed.status === 200, spoofed.body)
const spoofCheck = await api(
  `/api/collections/appointments/records?filter=${encodeURIComponent('customerEmail="trick@example.test"')}`,
  { headers: admin() })
const spoofRecord = spoofCheck.body?.items?.[0]
check('Dauer kommt vom Server (60), nicht vom Client (5)', spoofRecord?.durationMin === 60, spoofRecord?.durationMin)
check('Preis kommt vom Server (149), nicht vom Client (0)', spoofRecord?.price === 149, spoofRecord?.price)

const honeypot = await api('/api/custom/booking', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: bookBody({ start: avail.body?.slots?.[1]?.start, email: 'bot@example.test', website: 'http://spam' }),
})
const botCheck = await api(
  `/api/collections/appointments/records?filter=${encodeURIComponent('customerEmail="bot@example.test"')}`,
  { headers: admin() })
check('Honeypot: Antwort sieht nach Erfolg aus', honeypot.status === 200)
check('Honeypot: nichts gespeichert', (botCheck.body?.items || []).length === 0)

const noConsent = await api('/api/custom/booking', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: bookBody({ start: avail.body?.slots?.[1]?.start, email: 'x@example.test', consent: false }),
})
check('ohne Einwilligung wird abgelehnt', noConsent.status === 400, noConsent.body?.message)

// --- Storno-Link -----------------------------------------------------------
section('Storno und Umbuchung')
const token = booked.body.token
const manage = await api('/api/custom/booking/manage?token=' + token)
check('Termin über den Token abrufbar (ohne Login)', manage.status === 200, manage.body)
check('als änderbar markiert', manage.body?.changeable === true)

const badToken = await api('/api/custom/booking/manage?token=' + 'x'.repeat(42))
check('unbekannter Token wird abgewiesen', badToken.status === 404)

const freeSlot = after.body?.slots?.find((s) => s.start !== third)?.start
const moved = await api('/api/custom/booking/cancel', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, action: 'reschedule', start: freeSlot }),
})
check('Umbuchung angenommen', moved.status === 200 && moved.body?.action === 'rescheduled', moved.body)

const cancelled = await api('/api/custom/booking/cancel', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, action: 'cancel', reason: 'Krank geworden' }),
})
check('Absage angenommen', cancelled.status === 200, cancelled.body)

const again = await api('/api/custom/booking/cancel', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, action: 'cancel' }),
})
check('zweite Absage wird abgewiesen', again.status === 409)

const afterCancel = await api(`/api/custom/booking/availability?type=portrait&from=${DATE}&to=${DATE}`)
check('abgesagte Zeit ist wieder buchbar', afterCancel.body?.slots?.length === 2, afterCancel.body?.slots)

const cancelledRecord = await api(
  `/api/collections/appointments/records?filter=${encodeURIComponent('customerEmail="erika@example.test"')}`,
  { headers: admin() })
check('Storniertes bleibt als Datensatz erhalten', (cancelledRecord.body?.items || []).length === 1)
check('Status ist cancelled', cancelledRecord.body?.items?.[0]?.status === 'cancelled')

// --- Freigabepflichtige Art ------------------------------------------------
section('Anfrage mit Freigabe')
const introAvail = await api(`/api/custom/booking/availability?type=intro&from=${DATE}&to=${DATE}`)
const introSlot = introAvail.body?.slots?.[0]?.start
const request = await api('/api/custom/booking', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'intro', start: introSlot, name: 'Max Muster', email: 'max@example.test',
    phone: '0170 999', consent: true,
  }),
})
check('Anfrage angenommen', request.status === 200, request.body)
check('als freigabepflichtig gekennzeichnet', request.body?.requiresApproval === true)

const pendingRecord = await api(
  `/api/collections/appointments/records?filter=${encodeURIComponent('customerEmail="max@example.test"')}`,
  { headers: admin() })
const pending = pendingRecord.body?.items?.[0]
check('Status pending', pending?.status === 'pending')
check('Verfallszeitpunkt gesetzt', !!pending?.expiresAt)

const introAfter = await api(`/api/custom/booking/availability?type=intro&from=${DATE}&to=${DATE}`)
check('offene Anfrage blockiert den Slot',
  !introAfter.body?.slots?.some((s) => s.start === introSlot), introSlot)

const missingPhone = await api('/api/custom/booking', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'intro', start: introAvail.body?.slots?.[1]?.start, name: 'Ohne Telefon',
    email: 'ohne@example.test', consent: true,
  }),
})
check('Pflichtfeld Telefon greift', missingPhone.status === 400, missingPhone.body?.message)

if (!pending) { console.log('\n  ! Keine offene Anfrage — Folgeprüfungen entfallen'); }
const decided = !pending ? { status: 0 } : await api('/api/custom/booking/decide', {
  method: 'POST', headers: admin(),
  body: JSON.stringify({ id: pending?.id, approve: true }),
})
check('Freigabe durch Admin', decided.status === 200, decided.body)

const decidedAnon = await api('/api/custom/booking/decide', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: pending?.id, approve: true }),
})
check('Freigabe ohne Adminrechte wird abgewiesen', decidedAnon.status === 403)

// --- Admin trägt selbst ein ------------------------------------------------
section('Manueller Termin')
const manual = await api('/api/custom/booking/manual', {
  method: 'POST', headers: admin(),
  body: JSON.stringify({
    type: 'portrait', start: `${DATE}T05:30:00.000Z`, // 07:30 Berlin — außerhalb der Regel
    name: 'Telefonkundin', email: 'telefon@example.test',
  }),
})
check('Termin außerhalb der Regeln möglich', manual.status === 200, manual.body)

const overlap = await api('/api/custom/booking/manual', {
  method: 'POST', headers: admin(),
  body: JSON.stringify({ type: 'portrait', start: `${DATE}T05:45:00.000Z`, name: 'Kollision' }),
})
check('Überschneidung wird gemeldet', overlap.status === 409 && overlap.body?.code === 'overlap', overlap.body)

const forced = await api('/api/custom/booking/manual', {
  method: 'POST', headers: admin(),
  body: JSON.stringify({ type: 'portrait', start: `${DATE}T05:45:00.000Z`, name: 'Kollision', force: true }),
})
check('Überschneidung lässt sich bewusst übergehen', forced.status === 200, forced.body)

// --- Mails -----------------------------------------------------------------
section('Mails')
await new Promise((r) => setTimeout(r, 1500))
const box = await (await fetch(`${MAILPIT}/api/v1/messages?limit=100`)).json()
const subjects = (box.messages || []).map((m) => m.Subject)
const to = (m) => (m.To || []).map((t) => t.Address).join(',')

check('Bestätigung an die Kundin', subjects.some((s) => /Terminbestätigung/.test(s)), subjects)
check('Benachrichtigung an die Fotografin', (box.messages || []).some(
  (m) => /Neuer Termin/.test(m.Subject) && to(m).includes('fotografin@demo.test')))
check('Anfrage-Eingang an die Kundin', subjects.some((s) => /Terminanfrage eingegangen/.test(s)))
check('Zusage nach Freigabe', subjects.some((s) => /Termin bestätigt/.test(s)))
check('Verschiebung gemeldet', subjects.some((s) => /Termin verschoben/.test(s)))
check('Absage gemeldet', subjects.some((s) => /Termin abgesagt/.test(s)))

const confirmation = (box.messages || []).find((m) => /Terminbestätigung/.test(m.Subject))
if (confirmation) {
  const full = await (await fetch(`${MAILPIT}/api/v1/message/${confirmation.ID}`)).json()
  const attachments = full.Attachments || []
  check('.ics hängt an der Bestätigung', attachments.some((a) => /\.ics$/.test(a.FileName)), attachments.map((a) => a.FileName))
  const html = full.HTML || ''
  check('Zeitzone wird in der Mail benannt', /Zeit in Berlin/.test(html))
  check('Storno-Link in der Mail', /\/termin\//.test(html))

  const ics = attachments.find((a) => /\.ics$/.test(a.FileName))
  if (ics) {
    const content = await (await fetch(`${MAILPIT}/api/v1/message/${confirmation.ID}/part/${ics.PartID}`)).text()
    check('.ics ist ein gültiger Kalender', /BEGIN:VCALENDAR/.test(content) && /END:VCALENDAR/.test(content))
    check('.ics enthält den Termin', /DTSTART:\d{8}T\d{6}Z/.test(content), content.slice(0, 200))
  }
}

// --- Cron ------------------------------------------------------------------
section('Wartungsjob')
// Die Crons-API ist Superusern vorbehalten — ein isAdmin-Konto reicht nicht.
const su = await api('/api/collections/_superusers/auth-with-password', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: 'admin@demo.test', password: 'demo123456' }),
})
const sudo = (extra = {}) => ({ Authorization: su.body.token, 'Content-Type': 'application/json', ...extra })
const crons = await api('/api/crons', { headers: sudo() })
const job = (crons.body || []).find?.((c) => c.id === 'bookingMaintenance')
check('Job ist registriert', !!job, crons.body)

if (job) {
  // Verfall erzwingen: Verfallszeitpunkt in die Vergangenheit setzen.
  const req2 = await api('/api/custom/booking', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'intro', start: introAvail.body?.slots?.[2]?.start, name: 'Verfall',
      email: 'verfall@example.test', phone: '0170 1', consent: true,
    }),
  })
  const list = await api(
    `/api/collections/appointments/records?filter=${encodeURIComponent('customerEmail="verfall@example.test"')}`,
    { headers: admin() })
  const rec = list.body?.items?.[0]
  await api(`/api/collections/appointments/records/${rec.id}`, {
    method: 'PATCH', headers: admin(),
    body: JSON.stringify({ expiresAt: new Date(Date.now() - 3600000).toISOString().replace('T', ' ') }),
  })
  const run = await fetch(`${APP}/api/crons/bookingMaintenance`, { method: 'POST', headers: sudo() })
  check('Job lässt sich auslösen', run.status === 204 || run.status === 200, run.status)
  await new Promise((r) => setTimeout(r, 1500))
  const afterRun = await api(`/api/collections/appointments/records/${rec.id}`, { headers: admin() })
  check('offene Anfrage ist verfallen', afterRun.body?.status === 'expired', afterRun.body?.status)

  const introFree = await api(`/api/custom/booking/availability?type=intro&from=${DATE}&to=${DATE}`)
  const freedSlot = introAvail.body?.slots?.[2]?.start
  check('verfallene Anfrage gibt die Zeit wieder frei',
    introFree.body?.slots?.some((s) => s.start === freedSlot), freedSlot)
}

console.log(`\n${ok} bestanden, ${failed} fehlgeschlagen`)
process.exit(failed ? 1 : 0)
