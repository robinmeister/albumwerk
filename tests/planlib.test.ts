import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

// pb_hooks/ ist CommonJS — siehe tests/availability.test.ts
const require = createRequire(import.meta.url)
const { validatePlan } = require('../pb_hooks/lib/planlib.js')

const type = { slug: 'portrait', name: 'Portrait', durationMin: 60, active: true }
const rule = { weekday: 6, startMinute: 540, endMinute: 780, allowedSlugs: [] as string[] }

describe('validatePlan', () => {
  it('akzeptiert einen gültigen Plan', () => {
    expect(validatePlan({ types: [type], rules: [rule] })).toBeNull()
  })

  it('Slugs wie „constructor“ sind keine Duplikate', () => {
    expect(validatePlan({ types: [{ ...type, slug: 'constructor' }], rules: [] })).toBeNull()
  })

  it.each([
    [{}, 'Der Plan ist unvollständig.'],
    [{ types: [type, type], rules: [] }, 'Der Kurz-Link „portrait“ kommt doppelt vor.'],
    [{ types: [{ ...type, slug: 'Por trait' }], rules: [] }, 'Ungültiger Kurz-Link „Por trait“.'],
    [{ types: [{ ...type, durationMin: 3 }], rules: [] }, '„Portrait“: Die Dauer muss mindestens 5 Minuten betragen.'],
    [{ types: [{ ...type, active: false }], rules: [] }, 'Mindestens eine Leistung muss buchbar sein.'],
    [{ types: [type], rules: [{ ...rule, endMinute: 540 }] }, 'Ein Zeitfenster muss zwischen 1 Minute und 24 Stunden lang sein.'],
    [{ types: [type], rules: [{ ...rule, weekday: 8 }] }, 'Ungültiger Wochentag.'],
    [{ types: [type], rules: [{ ...rule, allowedSlugs: ['paare'] }] }, 'Ein Zeitfenster verweist auf die unbekannte Leistung „paare“.'],
  ])('lehnt %j ab', (body, message) => {
    expect(validatePlan(body)).toBe(message)
  })
})
