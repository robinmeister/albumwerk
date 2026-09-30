import { describe, expect, it } from 'vitest'

import {
  Answers,
  Plan,
  addCustomService,
  answersFromPlan,
  currentPlan,
  diffPlans,
  formatSpan,
  planFromAnswers,
  rulesFromAnswers,
} from '../src/features/Appointments/interview'
import type { AppointmentType, AvailabilityRule } from '../src/features/Appointments/api'

const type = (patch: Partial<AppointmentType>): AppointmentType => ({
  id: 'id-portrait', name: 'Portraitshooting', slug: 'portrait', description: '',
  location: '', durationMin: 90, bufferMin: 30, startIntervalMin: 0,
  leadTimeMin: 1440, requiresApproval: false, phoneMode: 'optional',
  price: 0, active: true, sort: 1, ...patch,
})

const rule = (patch: Partial<AvailabilityRule>): AvailabilityRule => ({
  id: 'r', weekday: 6, startMinute: 540, endMinute: 780, allowedTypes: [], active: true, ...patch,
})

const SETTINGS = { bookingEnabled: true, bookingMaxPerDay: 2, bookingHorizonDays: 90 }

const answers = (patch: Partial<Answers>): Answers => ({
  services: [], days: [], windows: {}, restrict: false, scheduleTouched: true,
  maxPerDay: 0, horizonDays: 90, ...patch,
})

describe('currentPlan', () => {
  it('übersetzt allowedTypes-IDs in Slugs und lässt inaktive Fenster weg', () => {
    const plan = currentPlan(
      [type({}), type({ id: 'id-k', slug: 'kennenlernen', name: 'Kennenlernen' })],
      [rule({ allowedTypes: ['id-portrait', 'id-k'] }), rule({ active: false })],
      SETTINGS,
    )
    expect(plan.rules).toEqual([
      { weekday: 6, startMinute: 540, endMinute: 780, allowedSlugs: ['kennenlernen', 'portrait'] },
    ])
  })
})

describe('Rundreise', () => {
  const roundTrip = (plan: Plan) => planFromAnswers(answersFromPlan(plan), plan)

  it('ergibt denselben Plan', () => {
    const plan = currentPlan([type({})], [rule({})], SETTINGS)
    expect(roundTrip(plan)).toEqual(plan)
  })

  it('mit eingeschränkten Fenstern: Fenster bleiben exakt erhalten', () => {
    const plan = currentPlan(
      [type({}), type({ id: 'id-k', slug: 'kennenlernen', name: 'Kennenlernen' })],
      [rule({ weekday: 2, startMinute: 600, endMinute: 660, allowedTypes: ['id-k'] }), rule({})],
      SETTINGS,
    )
    const a = answersFromPlan(plan)
    expect(a.scheduleTouched).toBe(false)
    expect(roundTrip(plan).rules).toEqual(plan.rules)
  })

  it('Pausen bleiben als zwei Fenster erhalten', () => {
    const plan = currentPlan(
      [type({})],
      [rule({ startMinute: 540, endMinute: 720 }), rule({ startMinute: 840, endMinute: 1080 })],
      SETTINGS,
    )
    expect(answersFromPlan(plan).windows[6]).toEqual([
      { startMinute: 540, endMinute: 720 },
      { startMinute: 840, endMinute: 1080 },
    ])
  })
})

describe('planFromAnswers', () => {
  it('ordnet über den Slug zu und behält die id', () => {
    const plan = currentPlan([type({})], [], SETTINGS)
    const a = answersFromPlan(plan)
    a.services[0].durationMin = 60
    const next = planFromAnswers(a, plan)
    expect(next.types).toEqual([{ ...plan.types[0], durationMin: 60 }])
  })

  it('abgewählte Art wird deaktiviert, nicht entfernt', () => {
    const plan = currentPlan([type({})], [], SETTINGS)
    const next = planFromAnswers({ ...answersFromPlan(plan), services: [] }, plan)
    expect(next.types).toEqual([{ ...plan.types[0], active: false }])
  })

  it('neue Art bekommt eine Sortierung hinter den bestehenden', () => {
    const plan = currentPlan([type({ sort: 4 })], [], SETTINGS)
    const a = addCustomService(answersFromPlan(plan), 'Newborn')
    const neu = planFromAnswers(a, plan).types.find((t) => t.slug === 'newborn')
    expect(neu).toMatchObject({ id: undefined, active: true, sort: 5, durationMin: 60 })
  })

  it('schaltet die Buchung ein', () => {
    const plan = currentPlan([type({})], [], { ...SETTINGS, bookingEnabled: false })
    expect(planFromAnswers(answersFromPlan(plan), plan).enabled).toBe(true)
  })
})

describe('addCustomService', () => {
  it('ignoriert vorhandenen Slug und leeren Namen', () => {
    const a = addCustomService(answers({}), 'Portrait')
    expect(addCustomService(a, 'portrait').services).toHaveLength(1)
    expect(addCustomService(a, '  ').services).toHaveLength(1)
  })
})

describe('rulesFromAnswers', () => {
  const portrait = { slug: 'portrait', name: 'P', durationMin: 60, bufferMin: 0, leadTimeMin: 0,
    requiresApproval: false, location: '', price: 0, restriction: 'all' as const }
  const talk = { ...portrait, slug: 'kennenlernen' }

  it('ohne Einschränkung: ein Fenster je Tag und Zeitraum, allowedSlugs leer', () => {
    expect(rulesFromAnswers(answers({
      services: [portrait], days: [2, 6],
      windows: { 2: [{ startMinute: 540, endMinute: 1080 }], 6: [{ startMinute: 540, endMinute: 780 }] },
    }))).toEqual([
      { weekday: 2, startMinute: 540, endMinute: 1080, allowedSlugs: [] },
      { weekday: 6, startMinute: 540, endMinute: 780, allowedSlugs: [] },
    ])
  })

  it('„nur abends" teilt das Fenster bei 17 Uhr', () => {
    expect(rulesFromAnswers(answers({
      services: [portrait, { ...talk, restriction: 'evening' }], days: [3], restrict: true,
      windows: { 3: [{ startMinute: 540, endMinute: 1260 }] },
    }))).toEqual([
      { weekday: 3, startMinute: 540, endMinute: 1020, allowedSlugs: ['portrait'] },
      { weekday: 3, startMinute: 1020, endMinute: 1260, allowedSlugs: [] },
    ])
  })

  it('„nur am Wochenende" nimmt die Leistung werktags heraus', () => {
    expect(rulesFromAnswers(answers({
      services: [{ ...portrait, restriction: 'weekend' }, talk], days: [2, 6], restrict: true,
      windows: { 2: [{ startMinute: 540, endMinute: 780 }], 6: [{ startMinute: 540, endMinute: 780 }] },
    }))).toEqual([
      { weekday: 2, startMinute: 540, endMinute: 780, allowedSlugs: ['kennenlernen'] },
      { weekday: 6, startMinute: 540, endMinute: 780, allowedSlugs: [] },
    ])
  })

  it('über Mitternacht: kein Schnitt, Fenster bleibt ganz', () => {
    expect(rulesFromAnswers(answers({
      services: [portrait, { ...talk, restriction: 'evening' }], days: [5], restrict: true,
      windows: { 5: [{ startMinute: 1200, endMinute: 1500 }] },
    }))).toEqual([{ weekday: 5, startMinute: 1200, endMinute: 1500, allowedSlugs: [] }])
  })

  it('Einschränkung ohne Wirkung, solange Frage 9 mit „Nein" beantwortet ist', () => {
    expect(rulesFromAnswers(answers({
      services: [{ ...portrait, restriction: 'weekend' }], days: [2], restrict: false,
      windows: { 2: [{ startMinute: 540, endMinute: 780 }] },
    }))).toEqual([{ weekday: 2, startMinute: 540, endMinute: 780, allowedSlugs: [] }])
  })
})

describe('formatSpan', () => {
  it('wählt die größte glatte Einheit', () => {
    expect([0, 30, 120, 1440, 4320, 10080].map(formatSpan))
      .toEqual(['keine', '30 Min', '2 Std', '1 Tag', '3 Tage', '1 Woche'])
  })
})

describe('diffPlans', () => {
  const plan = currentPlan([type({})], [rule({})], SETTINGS)

  it('Rundreise ohne Änderungen ergibt eine leere Liste', () => {
    expect(diffPlans(plan, planFromAnswers(answersFromPlan(plan), plan))).toEqual([])
  })

  it('benennt geänderte Felder mit alt → neu', () => {
    const a = answersFromPlan(plan)
    a.services[0] = { ...a.services[0], durationMin: 60, requiresApproval: true, price: 150 }
    expect(diffPlans(plan, planFromAnswers(a, plan))).toEqual([
      { field: 'durationMin', kind: 'geändert', text: '„Portraitshooting": 90 Min → 60 Min' },
      { field: 'requiresApproval', kind: 'geändert', text: '„Portraitshooting": sofort verbindlich → erst nach deiner Zusage' },
      { field: 'price', kind: 'geändert', text: '„Portraitshooting": kostenlos → 150 EUR' },
    ])
  })

  it('abgewählte Art', () => {
    const next = planFromAnswers({ ...answersFromPlan(plan), services: [] }, plan)
    expect(diffPlans(plan, next)).toContainEqual({
      field: 'service', kind: 'deaktiviert',
      text: '„Portraitshooting" ist nicht mehr buchbar – bestehende Termine bleiben',
    })
  })

  it('Fenster: entfällt und neu, mit Einschränkung im Text', () => {
    const next: Plan = { ...plan, rules: [{ weekday: 2, startMinute: 1020, endMinute: 1260, allowedSlugs: ['portrait'] }] }
    expect(diffPlans(plan, next)).toEqual([
      { field: 'rules', kind: 'entfällt', text: 'Sa 09:00 – 13:00 entfällt' },
      { field: 'rules', kind: 'neu', text: 'Di 17:00 – 21:00 (nur „Portraitshooting")' },
    ])
  })

  it('Grenzen und Einschalten', () => {
    const off = { ...plan, enabled: false, maxPerDay: 0 }
    expect(diffPlans(off, { ...off, enabled: true, maxPerDay: 2, horizonDays: 180 })).toEqual([
      { field: 'maxPerDay', kind: 'geändert', text: 'Höchstens pro Tag: unbegrenzt → 2' },
      { field: 'horizonDays', kind: 'geändert', text: 'Buchbar im Voraus: 90 → 180 Tage' },
      { field: 'enabled', kind: 'neu', text: 'Die Terminbuchung wird eingeschaltet' },
    ])
  })
})
