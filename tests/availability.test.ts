import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

// pb_hooks/ ist CommonJS (die PocketBase-JSVM kennt nichts anderes), das
// Wurzel-package.json setzt aber "type": "module". createRequire lädt die
// Module deshalb explizit als CJS — siehe pb_hooks/package.json.
const require = createRequire(import.meta.url)
const availability = require('../pb_hooks/lib/availabilitylib.js')
const tz = require('../pb_hooks/lib/tzlib.js')

const TZ = 'Europe/Berlin'

// Alle Erwartungswerte stehen als UTC-Zeitpunkte da, damit die
// Sommerzeit-Verschiebung sichtbar bleibt statt sich in einer Hilfsfunktion zu
// verstecken: 09:00 Berliner Zeit ist im Sommer 07:00 UTC und im Winter 08:00 UTC.
const utc = (
  year: number, month: number, day: number, hour = 0, minute = 0,
) => Date.UTC(year, month - 1, day, hour, minute)

const date = (year: number, month: number, day: number) => ({ year, month, day })

const startsOf = (slots: Array<{ startMs: number }>) => slots.map((slot) => slot.startMs)

// Ein Samstag im Sommer (2026-08-15, ISO-Wochentag 6).
const SATURDAY = date(2026, 8, 15)

type Options = {
  rules?: unknown[]
  exceptions?: unknown[]
  bookings?: unknown[]
  type?: Record<string, unknown>
  from?: { year: number; month: number; day: number }
  to?: { year: number; month: number; day: number }
  nowMs?: number
  horizonDays?: number
  maxPerDay?: number
}

// Ein Termin von 60 Minuten ohne Puffer in einem Fenster Sa 9–12 Uhr, sofern
// der jeweilige Test nichts anderes setzt.
function slots(options: Options = {}) {
  return availability.computeSlots({
    timezone: TZ,
    type: { id: 't1', durationMin: 60, bufferMin: 0, leadTimeMin: 0, ...(options.type || {}) },
    rules: options.rules ?? [{ weekday: 6, startMinute: 540, endMinute: 720, active: true }],
    exceptions: options.exceptions ?? [],
    bookings: options.bookings ?? [],
    fromDate: options.from ?? SATURDAY,
    toDate: options.to ?? SATURDAY,
    // weit vor allen Testterminen, damit der Mindestvorlauf nur dort greift,
    // wo ein Test ihn ausdrücklich prüft
    nowMs: options.nowMs ?? utc(2026, 1, 1),
    horizonDays: options.horizonDays ?? 3650,
    maxPerDay: options.maxPerDay ?? 0,
  })
}

describe('Raster', () => {
  it('reiht Termine ab Fensterbeginn aneinander', () => {
    expect(startsOf(slots())).toEqual([
      utc(2026, 8, 15, 7), // 09:00 Berlin
      utc(2026, 8, 15, 8), // 10:00
      utc(2026, 8, 15, 9), // 11:00
    ])
  })

  it('nimmt das konfigurierte Startintervall statt Dauer + Puffer', () => {
    expect(startsOf(slots({ type: { startIntervalMin: 30 } }))).toEqual([
      utc(2026, 8, 15, 7),
      utc(2026, 8, 15, 7, 30),
      utc(2026, 8, 15, 8),
      utc(2026, 8, 15, 8, 30),
      utc(2026, 8, 15, 9),
    ])
  })

  it('zählt den Puffer zum Startabstand', () => {
    // 60 + 30 = 90 Minuten Abstand, Fenster 9–12 Uhr
    expect(startsOf(slots({ type: { bufferMin: 30 } }))).toEqual([
      utc(2026, 8, 15, 7),
      utc(2026, 8, 15, 8, 30),
    ])
  })

  it('lässt den Puffer über das Fensterende hinausragen, den Termin aber nicht', () => {
    // Fenster 9–11 Uhr, 60 Minuten Termin + 30 Minuten Puffer, Raster 60.
    // 10:00 endet um 11:00 (passt), der Puffer läuft bis 11:30 (darf überhängen).
    const result = slots({
      rules: [{ weekday: 6, startMinute: 540, endMinute: 660, active: true }],
      type: { bufferMin: 30, startIntervalMin: 60 },
    })
    expect(startsOf(result)).toEqual([utc(2026, 8, 15, 7), utc(2026, 8, 15, 8)])
  })

  it('erzeugt nichts, wenn der Termin nicht ins Fenster passt', () => {
    const result = slots({
      rules: [{ weekday: 6, startMinute: 540, endMinute: 570, active: true }], // 30 Minuten
    })
    expect(result).toEqual([])
  })

  it('überspringt Regeln anderer Wochentage und inaktive Regeln', () => {
    expect(slots({ rules: [{ weekday: 2, startMinute: 540, endMinute: 720, active: true }] })).toEqual([])
    expect(slots({ rules: [{ weekday: 6, startMinute: 540, endMinute: 720, active: false }] })).toEqual([])
  })
})

describe('Ausnahmen', () => {
  it('entfernt gesperrte Slots, ohne das Raster zu verschieben', () => {
    const result = slots({
      exceptions: [{
        kind: 'block',
        startMs: utc(2026, 8, 15, 8),     // 10:00 Berlin
        endMs: utc(2026, 8, 15, 8, 30),   // 10:30
      }],
    })
    // 10:00 fällt weg, 9:00 und 11:00 bleiben an ihrer Stelle — kein Nachrutschen
    expect(startsOf(result)).toEqual([utc(2026, 8, 15, 7), utc(2026, 8, 15, 9)])
  })

  it('sperrt unabhängig von allowedTypes', () => {
    const result = slots({
      exceptions: [{
        kind: 'block',
        startMs: utc(2026, 8, 15, 7),
        endMs: utc(2026, 8, 15, 10),
        allowedTypes: ['eine-andere-art'],
      }],
    })
    expect(result).toEqual([])
  })

  it('öffnet Zeiten ohne passende Regel', () => {
    const result = slots({
      rules: [],
      exceptions: [{
        kind: 'open',
        startMs: utc(2026, 8, 15, 8),   // 10:00 Berlin
        endMs: utc(2026, 8, 15, 10),    // 12:00
      }],
    })
    expect(startsOf(result)).toEqual([utc(2026, 8, 15, 8), utc(2026, 8, 15, 9)])
  })

  it('beachtet allowedTypes bei open-Ausnahmen', () => {
    const exception = {
      kind: 'open',
      startMs: utc(2026, 8, 15, 8),
      endMs: utc(2026, 8, 15, 10),
      allowedTypes: ['eine-andere-art'],
    }
    expect(slots({ rules: [], exceptions: [exception] })).toEqual([])
  })

  it('verschmilzt überlappende Fenster und verankert das Raster am Beginn', () => {
    // Regel 9–13 Uhr plus open-Ausnahme 12:15–15:00 Uhr ergibt EIN Fenster
    // 9:00–15:00. Bei zwei getrennten Rastern stünde hier 12:15 statt 12:00.
    const result = slots({
      rules: [{ weekday: 6, startMinute: 540, endMinute: 780, active: true }],
      exceptions: [{
        kind: 'open',
        startMs: utc(2026, 8, 15, 10, 15), // 12:15 Berlin
        endMs: utc(2026, 8, 15, 13),       // 15:00
      }],
      type: { startIntervalMin: 90 },
    })
    expect(startsOf(result)).toEqual([
      utc(2026, 8, 15, 7),      // 09:00
      utc(2026, 8, 15, 8, 30),  // 10:30
      utc(2026, 8, 15, 10),     // 12:00
      utc(2026, 8, 15, 11, 30), // 13:30
    ])
  })
})

describe('Buchungen', () => {
  it('blockiert überlappende Zeiten inklusive des Puffers der Buchung', () => {
    const result = slots({
      bookings: [{
        startMs: utc(2026, 8, 15, 8),  // 10:00 Berlin
        endMs: utc(2026, 8, 15, 9),    // 11:00
        bufferMin: 30,                 // belegt bis 11:30
      }],
    })
    // 10:00 kollidiert direkt, 11:00 mit dem Puffer — nur 9:00 bleibt
    expect(startsOf(result)).toEqual([utc(2026, 8, 15, 7)])
  })

  it('lässt direkt anschließende Termine zu', () => {
    const result = slots({
      bookings: [{ startMs: utc(2026, 8, 15, 8), endMs: utc(2026, 8, 15, 9), bufferMin: 0 }],
    })
    expect(startsOf(result)).toEqual([utc(2026, 8, 15, 7), utc(2026, 8, 15, 9)])
  })
})

describe('Leitplanken', () => {
  it('hält den Mindestvorlauf ein', () => {
    const result = slots({
      nowMs: utc(2026, 8, 15, 6),  // 08:00 Berlin
      type: { leadTimeMin: 120 },  // frühestens 10:00 Berlin
    })
    expect(startsOf(result)).toEqual([utc(2026, 8, 15, 8), utc(2026, 8, 15, 9)])
  })

  it('schneidet hinter dem Buchungshorizont ab', () => {
    const result = slots({
      from: date(2026, 8, 15),
      to: date(2026, 8, 22),      // der übernächste Samstag
      nowMs: utc(2026, 8, 14),
      horizonDays: 3,
    })
    // nur der erste Samstag liegt im Horizont
    expect(startsOf(result)).toEqual([
      utc(2026, 8, 15, 7),
      utc(2026, 8, 15, 8),
      utc(2026, 8, 15, 9),
    ])
  })

  it('sperrt einen Tag, dessen Limit erreicht ist', () => {
    const booking = { startMs: utc(2026, 8, 15, 7), endMs: utc(2026, 8, 15, 8), bufferMin: 0 }
    expect(slots({ bookings: [booking], maxPerDay: 1 })).toEqual([])
    // mit Limit 2 bleiben die Slots, die nicht mit der Buchung kollidieren
    expect(startsOf(slots({ bookings: [booking], maxPerDay: 2 }))).toEqual([
      utc(2026, 8, 15, 8),
      utc(2026, 8, 15, 9),
    ])
  })

  it('beachtet art-abhängige Regeln', () => {
    const restricted = [{ weekday: 6, startMinute: 540, endMinute: 720, active: true, allowedTypes: ['t2'] }]
    expect(slots({ rules: restricted })).toEqual([])
    const including = [{ weekday: 6, startMinute: 540, endMinute: 720, active: true, allowedTypes: ['t2', 't1'] }]
    expect(startsOf(slots({ rules: including }))).toHaveLength(3)
  })
})

describe('Sommerzeit', () => {
  // Die Umstellung 2026: 29.03. (02:00 → 03:00) und 25.10. (03:00 → 02:00).
  it('hält die Wanduhrzeit über die Umstellung hinweg', () => {
    const sundayRule = [{ weekday: 7, startMinute: 540, endMinute: 720, active: true }]

    const spring = slots({
      rules: sundayRule,
      from: date(2026, 3, 29),
      to: date(2026, 3, 29),
    })
    // 09:00 liegt hinter der Vorstellung, also Sommerzeit: 07:00 UTC
    expect(startsOf(spring)[0]).toBe(utc(2026, 3, 29, 7))

    const autumn = slots({
      rules: sundayRule,
      from: date(2026, 10, 25),
      to: date(2026, 10, 25),
    })
    // 09:00 liegt hinter der Rückstellung, also Winterzeit: 08:00 UTC
    expect(startsOf(autumn)[0]).toBe(utc(2026, 10, 25, 8))
  })

  it('rechnet ein Fenster über die Vorstellung als echte Dauer', () => {
    // Wanduhr 01:00–05:00 sind in dieser Nacht nur drei echte Stunden.
    const result = slots({
      rules: [{ weekday: 7, startMinute: 60, endMinute: 300, active: true }],
      from: date(2026, 3, 29),
      to: date(2026, 3, 29),
    })
    expect(startsOf(result)).toEqual([
      utc(2026, 3, 29, 0),
      utc(2026, 3, 29, 1),
      utc(2026, 3, 29, 2),
    ])
  })

  it('rechnet ein Fenster über die Rückstellung als echte Dauer', () => {
    // Wanduhr 01:00–05:00 sind in dieser Nacht fünf echte Stunden.
    const result = slots({
      rules: [{ weekday: 7, startMinute: 60, endMinute: 300, active: true }],
      from: date(2026, 10, 25),
      to: date(2026, 10, 25),
    })
    expect(startsOf(result)).toHaveLength(5)
    expect(startsOf(result)[0]).toBe(utc(2026, 10, 24, 23)) // 01:00 Berlin (noch Sommerzeit)
  })
})

describe('Fenster über Mitternacht', () => {
  it('führt das Fenster in den Folgetag weiter', () => {
    // Sa 22:00 bis So 01:00 Uhr: startMinute 1320, endMinute 1500
    const result = slots({
      rules: [{ weekday: 6, startMinute: 1320, endMinute: 1500, active: true }],
      from: date(2026, 8, 15),
      to: date(2026, 8, 16),
    })
    expect(startsOf(result)).toEqual([
      utc(2026, 8, 15, 20), // 22:00 Berlin
      utc(2026, 8, 15, 21), // 23:00
      utc(2026, 8, 15, 22), // 00:00 des Folgetags
    ])
  })

  it('rechnet den Slot nach Mitternacht auf das Limit des Folgetags an', () => {
    const result = slots({
      rules: [{ weekday: 6, startMinute: 1320, endMinute: 1500, active: true }],
      from: date(2026, 8, 15),
      to: date(2026, 8, 16),
      // eine Buchung am Sonntag füllt dessen Tageslimit
      bookings: [{ startMs: utc(2026, 8, 16, 12), endMs: utc(2026, 8, 16, 13), bufferMin: 0 }],
      maxPerDay: 1,
    })
    // der Samstag ist noch leer, der Sonntag voll — 00:00 Berlin fällt weg
    expect(startsOf(result)).toEqual([utc(2026, 8, 15, 20), utc(2026, 8, 15, 21)])
  })
})

describe('Hilfsfunktionen', () => {
  it('startIntervalOf fällt auf Dauer + Puffer zurück', () => {
    expect(availability.startIntervalOf({ durationMin: 90, bufferMin: 30 })).toBe(120)
    expect(availability.startIntervalOf({ durationMin: 90, bufferMin: 30, startIntervalMin: 30 })).toBe(30)
  })

  it('isoWeekday liefert 1 für Montag und 7 für Sonntag', () => {
    expect(availability.isoWeekday(date(2026, 8, 17))).toBe(1)
    expect(availability.isoWeekday(date(2026, 8, 16))).toBe(7)
  })

  it('mergeWindows fasst überlappende und angrenzende Fenster zusammen', () => {
    expect(availability.mergeWindows([
      { startMs: 300, endMs: 400 },
      { startMs: 0, endMs: 100 },
      { startMs: 100, endMs: 200 }, // grenzt direkt an
      { startMs: 150, endMs: 250 }, // überlappt
    ])).toEqual([
      { startMs: 0, endMs: 250 },
      { startMs: 300, endMs: 400 },
    ])
  })

  it('isSlotBookable prüft einen konkreten Zeitpunkt', () => {
    const input = {
      timezone: TZ,
      type: { id: 't1', durationMin: 60, bufferMin: 0, leadTimeMin: 0 },
      rules: [{ weekday: 6, startMinute: 540, endMinute: 720, active: true }],
      exceptions: [],
      bookings: [],
      fromDate: SATURDAY,
      toDate: SATURDAY,
      nowMs: utc(2026, 1, 1),
      horizonDays: 3650,
      maxPerDay: 0,
    }
    expect(availability.isSlotBookable(input, utc(2026, 8, 15, 8))).toBe(true)
    // 10:15 Berlin liegt nicht auf dem Raster
    expect(availability.isSlotBookable(input, utc(2026, 8, 15, 8, 15))).toBe(false)
  })
})

describe('Zeitzonen-Adapter', () => {
  it('rechnet Wanduhrzeit in UTC um', () => {
    expect(tz.intlToUtcMs(2026, 8, 15, 9, 0, TZ)).toBe(utc(2026, 8, 15, 7))   // Sommerzeit
    expect(tz.intlToUtcMs(2026, 11, 15, 9, 0, TZ)).toBe(utc(2026, 11, 15, 8)) // Winterzeit
  })

  it('trifft die Umstellungszeitpunkte', () => {
    // letzte Minute der Winterzeit und der erste Zeitpunkt danach
    expect(tz.intlToUtcMs(2026, 3, 29, 1, 59, TZ)).toBe(utc(2026, 3, 29, 0, 59))
    expect(tz.intlToUtcMs(2026, 3, 29, 3, 0, TZ)).toBe(utc(2026, 3, 29, 1, 0))
  })

  it('liefert bei doppelter Wanduhrzeit einen der beiden gültigen Zeitpunkte', () => {
    // 02:30 gibt es am 25.10. zweimal: 00:30 UTC (noch Sommerzeit) und 01:30 UTC
    // (schon Winterzeit). Welches Vorkommen gewählt wird, ist bewusst offen —
    // Gos ParseInLocation garantiert es nicht (siehe pb_hooks/lib/tzlib.js).
    // Zugesichert ist nur, dass ein gültiger Zeitpunkt herauskommt, der auf
    // genau diese Wanduhrzeit zurückführt.
    const result = tz.intlToUtcMs(2026, 10, 25, 2, 30, TZ)
    expect([utc(2026, 10, 25, 0, 30), utc(2026, 10, 25, 1, 30)]).toContain(result)

    const backConverted = new Intl.DateTimeFormat('de-DE', {
      timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(result))
    expect(backConverted).toBe('02:30')
  })

  it('baut die Wanduhrzeichenkette mit führenden Nullen', () => {
    expect(tz.wallclockString(2026, 8, 5, 9, 7)).toBe('2026-08-05 09:07:00')
  })
})
