import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

import {
  addDays,
  addMonths,
  dateOf,
  daysInMonth,
  formatCalendarDateLong,
  formatMonth,
  formatTime,
  formatWindow,
  fromIsoDate,
  isoWeekday,
  minutesToTime,
  timeToMinutes,
  toIsoDate,
  zonedToMs,
} from '../src/features/Booking/time'

// Die serverseitige Umrechnung zum Abgleich: Beide Seiten müssen dieselbe
// Wanduhrzeit auf denselben Zeitpunkt abbilden, sonst zeigt das Admin-UI etwas
// anderes an, als der Rechner buchbar macht.
const require = createRequire(import.meta.url)
const tz = require('../pb_hooks/lib/tzlib.js')

const TZ = 'Europe/Berlin'
const utc = (
  year: number, month: number, day: number, hour = 0, minute = 0,
) => Date.UTC(year, month - 1, day, hour, minute)

describe('Kalenderarithmetik', () => {
  it('addiert Tage über Monats- und Jahresgrenzen', () => {
    expect(addDays({ year: 2026, month: 8, day: 31 }, 1)).toEqual({ year: 2026, month: 9, day: 1 })
    expect(addDays({ year: 2026, month: 1, day: 1 }, -1)).toEqual({ year: 2025, month: 12, day: 31 })
  })

  it('springt auf den Monatsersten', () => {
    expect(addMonths({ year: 2026, month: 12, day: 15 }, 1)).toEqual({ year: 2027, month: 1, day: 1 })
  })

  it('kennt Schaltjahre', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
  })

  it('liefert ISO-Wochentage mit 1 = Montag', () => {
    expect(isoWeekday({ year: 2026, month: 8, day: 17 })).toBe(1)
    expect(isoWeekday({ year: 2026, month: 8, day: 16 })).toBe(7)
  })

  it('wandelt zwischen Datum und ISO-Zeichenkette', () => {
    expect(toIsoDate({ year: 2026, month: 8, day: 5 })).toBe('2026-08-05')
    expect(fromIsoDate('2026-08-05')).toEqual({ year: 2026, month: 8, day: 5 })
    expect(fromIsoDate('kein Datum')).toBeNull()
  })
})

describe('Zeitzonen', () => {
  it('rechnet Wanduhrzeit in UTC um', () => {
    expect(zonedToMs({ year: 2026, month: 8, day: 15 }, 9, 0, TZ)).toBe(utc(2026, 8, 15, 7))
    expect(zonedToMs({ year: 2026, month: 11, day: 15 }, 9, 0, TZ)).toBe(utc(2026, 11, 15, 8))
  })

  it('trifft die Sommerzeit-Umstellungen', () => {
    expect(zonedToMs({ year: 2026, month: 3, day: 29 }, 1, 59, TZ)).toBe(utc(2026, 3, 29, 0, 59))
    expect(zonedToMs({ year: 2026, month: 3, day: 29 }, 3, 0, TZ)).toBe(utc(2026, 3, 29, 1, 0))
  })

  it('stimmt mit der serverseitigen Umrechnung überein', () => {
    // Der wichtigste Test dieser Datei: Browser und PocketBase-JSVM rechnen mit
    // verschiedenen Verfahren (Intl bzw. Gos Zeitzonendatenbank). Weichen sie
    // ab, zeigt das Admin-UI andere Zeiten an, als der Server buchbar macht.
    const probes: Array<[number, number, number, number, number]> = [
      [2026, 1, 15, 9, 0],
      [2026, 3, 28, 23, 30],
      [2026, 3, 29, 12, 0],
      [2026, 6, 21, 18, 45],
      [2026, 10, 24, 22, 15],
      [2026, 10, 26, 8, 0],
      [2026, 12, 31, 23, 59],
      [2027, 7, 4, 0, 0],
    ]
    for (const [year, month, day, hour, minute] of probes) {
      const browserSide = zonedToMs({ year, month, day }, hour, minute, TZ)
      const serverSide = tz.intlToUtcMs(year, month, day, hour, minute, TZ)
      expect(`${year}-${month}-${day} ${hour}:${minute} → ${browserSide}`).toBe(
        `${year}-${month}-${day} ${hour}:${minute} → ${serverSide}`,
      )
    }
  })

  it('ordnet einen Zeitpunkt dem richtigen lokalen Tag zu', () => {
    // 23:30 UTC am 14.8. ist in Berlin bereits der 15.8. (01:30 Sommerzeit)
    expect(dateOf(utc(2026, 8, 14, 23, 30), TZ)).toEqual({ year: 2026, month: 8, day: 15 })
  })
})

describe('Darstellung', () => {
  it('zeigt Uhrzeiten in der Zone der Instanz', () => {
    expect(formatTime(utc(2026, 8, 15, 7, 30), TZ)).toBe('09:30')
    expect(formatTime(utc(2026, 11, 15, 7, 30), TZ)).toBe('08:30')
  })

  it('schreibt Datum und Monat aus', () => {
    expect(formatCalendarDateLong({ year: 2026, month: 8, day: 15 })).toBe('Samstag, 15. August 2026')
    expect(formatMonth({ year: 2026, month: 12, day: 1 })).toBe('Dezember 2026')
  })

  it('wandelt zwischen Minuten und Uhrzeit', () => {
    expect(minutesToTime(540)).toBe('09:00')
    expect(minutesToTime(1500)).toBe('01:00') // Folgetag
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('25:00')).toBeNull()
    expect(timeToMinutes('Unfug')).toBeNull()
  })

  it('kennzeichnet Fenster über Mitternacht', () => {
    expect(formatWindow(540, 720)).toBe('09:00 – 12:00')
    expect(formatWindow(1320, 1500)).toBe('22:00 – 01:00 (Folgetag)')
  })
})
