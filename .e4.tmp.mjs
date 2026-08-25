// Etappe 4: im iframe auf fremder Domain buchen, dann per Token-Link handeln.
import { createServer } from 'node:http'
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const APP = 'http://localhost:8091'
const MAILPIT = 'http://localhost:8025'
const HOST_PORT = 3999
const OUT = '/tmp/claude-1000/-data-albumwerk/1eebdcba-fae4-4179-a2da-6cd30c4e3731/scratchpad/shots'
mkdirSync(OUT, { recursive: true })

let ok = 0, failed = 0
const check = (l, c, d) => { if (c) { ok++; console.log('  ✓', l) } else { failed++; console.log('  ✗', l, d ?? '') } }
const section = (t) => console.log('\n### ' + t)

const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Fotografin Musterfrau</title>
<style>body{font-family:system-ui;margin:0} header{padding:24px;background:#222;color:#fff} main{max-width:680px;margin:24px auto;padding:0 16px}</style>
</head><body><header><h1>Fotografin Musterfrau</h1></header>
<main><h2>Termin vereinbaren</h2>
<script src="${APP}/embed.js"></script>
</main></body></html>`

const server = createServer((_q, res) => { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(html) })
await new Promise((r) => server.listen(HOST_PORT, r))

await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE' })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
const jsErrors = []
page.on('pageerror', (e) => jsErrors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') jsErrors.push(m.text()) })
const requests = []
page.on('request', (r) => requests.push(r.url()))

section('Einbettung auf fremder Domain')
await page.goto(`http://localhost:${HOST_PORT}/`)
const frame = page.frameLocator('iframe')
await frame.locator('[data-testid="buchung"]').waitFor({ timeout: 20000 })
check('iframe lädt auf fremder Domain', true)
await page.screenshot({ path: `${OUT}/10-embed-auf-fremder-seite.png`, fullPage: true })

// Keine externen Ressourcen
const external = requests.filter((u) => !u.startsWith(APP) && !u.startsWith(`http://localhost:${HOST_PORT}`))
check('keine Anfragen an Dritte', external.length === 0, external)

// Keine Cookies / kein Storage
const cookies = await page.context().cookies()
check('keine Cookies gesetzt', cookies.length === 0, cookies.map((c) => c.name))
const storage = await frame.locator('body').evaluate(() => ({
  local: Object.keys(localStorage).length, session: Object.keys(sessionStorage).length,
}))
check('kein localStorage/sessionStorage im iframe', storage.local === 0 && storage.session === 0, storage)

section('Buchen')
const artCount = await frame.locator('[data-testid="art"]').count()
check('Leistungen werden angeboten', artCount >= 2, artCount)
await frame.locator('[data-testid="art"]').first().click()
await frame.locator('[data-testid="slot-auswahl"]').waitFor({ timeout: 15000 })

// ggf. in den Folgemonat blättern
for (let i = 0; i < 3; i++) {
  if (await frame.locator('[data-testid="slot"]').count() > 0) break
  await frame.getByRole('button', { name: 'Nächster Monat' }).click()
  await page.waitForTimeout(1500)
}
const slots = await frame.locator('[data-testid="slot"]').count()
check('freie Zeiten werden angezeigt', slots > 0, slots)
await page.screenshot({ path: `${OUT}/11-slot-auswahl.png`, fullPage: true })

const heightBefore = (await page.locator('iframe').boundingBox())?.height ?? 0
await frame.locator('[data-testid="slot"]').first().click()
await frame.locator('[data-testid="buchungsformular"]').waitFor({ timeout: 10000 })
await page.waitForTimeout(800)
const heightAfter = (await page.locator('iframe').boundingBox())?.height ?? 0
check('iframe wächst beim Wechsel zum Formular', heightAfter !== heightBefore, `${heightBefore} → ${heightAfter}`)

const innerScroll = await frame.locator('body').evaluate((b) => b.scrollHeight > b.clientHeight + 2)
check('kein Scrollbalken im Rahmen', !innerScroll)

await frame.locator('#booking-name').fill('Iframe Kundin')
await frame.locator('#booking-email').fill('iframe@example.test')
await frame.locator('#booking-message').fill('Über die Website gebucht')
await page.screenshot({ path: `${OUT}/12-formular.png`, fullPage: true })

// Ohne Einwilligung darf nichts passieren
await frame.locator('[data-testid="buchen"]').click()
await page.waitForTimeout(600)
check('ohne Einwilligung wird nicht gebucht',
  await frame.locator('[data-testid="bestaetigung"]').count() === 0)

await frame.locator('#booking-consent').check()
await frame.locator('[data-testid="buchen"]').click()
await frame.locator('[data-testid="bestaetigung"]').waitFor({ timeout: 15000 })
check('Buchung bestätigt', true)
await page.screenshot({ path: `${OUT}/13-bestaetigung.png`, fullPage: true })

section('Datenschutz-Link')
const target = await frame.locator('a', { hasText: 'Datenschutzerklärung' }).count()
check('Datenschutz-Link vorhanden', target >= 0)

section('Token-Link aus der Mail')
await page.waitForTimeout(1500)
const box = await (await fetch(`${MAILPIT}/api/v1/messages?limit=50`)).json()
const mail = (box.messages || []).find((m) => /Terminbestätigung/.test(m.Subject) &&
  (m.To || []).some((t) => t.Address === 'iframe@example.test'))
check('Bestätigungsmail an die Kundin', !!mail)

let manageUrl = ''
if (mail) {
  const full = await (await fetch(`${MAILPIT}/api/v1/message/${mail.ID}`)).json()
  manageUrl = (full.HTML.match(/https?:\/\/[^"']*\/termin\/[A-Za-z0-9]+/) || [])[0] || ''
  check('Storno-Link in der Mail', !!manageUrl, manageUrl)
}

if (manageUrl) {
  const page2 = await browser.newPage({ viewport: { width: 900, height: 900 } })
  page2.on('pageerror', (e) => jsErrors.push(String(e)))
  await page2.goto(manageUrl.replace('http://localhost:8090', APP))
  await page2.locator('[data-testid="termin-verwalten"]').waitFor({ timeout: 15000 })
  check('Verwaltungsseite ohne Login erreichbar', true)
  await page2.screenshot({ path: `${OUT}/14-termin-verwalten.png`, fullPage: true })

  // Verschieben
  await page2.locator('[data-testid="verschieben"]').click()
  await page2.locator('[data-testid="slot-auswahl"]').waitFor({ timeout: 15000 })
  for (let i = 0; i < 3; i++) {
    if (await page2.locator('[data-testid="slot"]').count() > 0) break
    await page2.getByRole('button', { name: 'Nächster Monat' }).click()
    await page2.waitForTimeout(1500)
  }
  await page2.locator('[data-testid="slot"]').first().click()
  await page2.locator('[data-testid="verschieben-bestaetigen"]').click()
  await page2.getByText('Termin verschoben').waitFor({ timeout: 15000 })
  check('Verschieben über den Token-Link', true)

  // Absagen
  await page2.goto(manageUrl.replace('http://localhost:8090', APP))
  await page2.locator('[data-testid="absagen"]').click()
  await page2.locator('[data-testid="absage-bestaetigen"]').click()
  await page2.getByText('Termin abgesagt').waitFor({ timeout: 15000 })
  check('Absagen über den Token-Link', true)
  await page2.screenshot({ path: `${OUT}/15-abgesagt.png`, fullPage: true })

  // Ein zweites Mal darf nicht gehen
  await page2.goto(manageUrl.replace('http://localhost:8090', APP))
  await page2.locator('[data-testid="termin-verwalten"]').waitFor({ timeout: 15000 })
  const gone = await page2.getByText('besteht nicht mehr').count()
  check('abgesagter Termin ist als solcher erkennbar', gone > 0)
}

section('Eigenständige Buchungsseite')
const page3 = await browser.newPage({ viewport: { width: 900, height: 900 } })
page3.on('pageerror', (e) => jsErrors.push(String(e)))
await page3.goto(`${APP}/buchen`)
await page3.locator('[data-testid="buchung"]').waitFor({ timeout: 15000 })
check('/buchen funktioniert ohne Login', true)
await page3.screenshot({ path: `${OUT}/16-buchungsseite.png`, fullPage: true })

console.log('\nJS-Fehler:', jsErrors.length ? jsErrors.slice(0, 5) : 'keine')
console.log(`${ok} bestanden, ${failed} fehlgeschlagen`)
await browser.close(); server.close()
process.exit(failed || jsErrors.length ? 1 : 0)
