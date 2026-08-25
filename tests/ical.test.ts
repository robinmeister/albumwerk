import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

// Siehe tests/availability.test.ts zur Ladeweise (CJS aus pb_hooks/).
const require = createRequire(import.meta.url)
const ical = require('../pb_hooks/lib/icallib.js')

const utc = (
  year: number, month: number, day: number, hour = 0, minute = 0,
) => Date.UTC(year, month - 1, day, hour, minute)

const byteLength = (text: string) => Buffer.byteLength(text, 'utf8')

describe('Escaping', () => {
  it('maskiert die Zeichen mit Sonderbedeutung', () => {
    expect(ical.escapeText('a;b,c\\d')).toBe('a\\;b\\,c\\\\d')
  })

  it('macht aus Zeilenumbrüchen ein \\n', () => {
    expect(ical.escapeText('Zeile 1\r\nZeile 2\nZeile 3')).toBe('Zeile 1\\nZeile 2\\nZeile 3')
  })
})

describe('Zeitformat', () => {
  it('schreibt UTC-Zeitpunkte in der Grundform', () => {
    expect(ical.toIcalDate(utc(2026, 8, 15, 7, 30))).toBe('20260815T073000Z')
  })

  it('füllt einstellige Werte auf', () => {
    expect(ical.toIcalDate(utc(2026, 1, 5, 9, 7))).toBe('20260105T090700Z')
  })
})

describe('Zeilenumbruch', () => {
  it('lässt kurze Zeilen unangetastet', () => {
    expect(ical.foldLine('SUMMARY:Portraitshooting')).toBe('SUMMARY:Portraitshooting')
  })

  it('bricht lange Zeilen auf höchstens 75 Oktette um', () => {
    const long = 'DESCRIPTION:' + 'x'.repeat(300)
    const folded: string = ical.foldLine(long)
    expect(folded).toContain('\r\n ')
    for (const line of folded.split('\r\n')) {
      expect(byteLength(line)).toBeLessThanOrEqual(75)
    }
    // der Inhalt bleibt vollständig erhalten
    expect(folded.split('\r\n ').join('')).toBe(long)
  })

  it('zählt Umlaute als zwei Oktette', () => {
    const long = 'DESCRIPTION:' + 'ä'.repeat(200)
    const folded: string = ical.foldLine(long)
    for (const line of folded.split('\r\n')) {
      expect(byteLength(line)).toBeLessThanOrEqual(75)
    }
    expect(folded.split('\r\n ').join('')).toBe(long)
  })

  it('bricht nicht innerhalb eines Ersatzzeichenpaars um', () => {
    // Emoji liegen als Paar aus zwei JS-Zeichen vor; ein Umbruch dazwischen
    // erzeugt ein kaputtes Zeichen und damit eine unlesbare Datei.
    const long = 'DESCRIPTION:' + '😀'.repeat(60)
    const folded: string = ical.foldLine(long)
    expect(folded.split('\r\n ').join('')).toBe(long)
    for (const line of folded.split('\r\n')) {
      expect(byteLength(line)).toBeLessThanOrEqual(75)
      // ein einzelnes halbes Paar wäre ein Ersatzzeichen im Round-Trip
      expect(Buffer.from(line, 'utf8').toString('utf8')).toBe(line)
    }
  })
})

describe('Kalenderdatei', () => {
  const build = () => ical.calendar([{
    uid: 'abc123@fotos.example',
    startMs: utc(2026, 8, 15, 7),
    endMs: utc(2026, 8, 15, 8, 30),
    summary: 'Portraitshooting – Studio Beispiel',
    description: 'Termin absagen: https://fotos.example/termin/xyz',
    location: 'Musterstraße 1, Musterstadt',
    status: 'CONFIRMED',
    sequence: 0,
    organizer: { name: 'Studio Beispiel', email: 'hallo@example.de' },
    stampMs: utc(2026, 7, 31, 12),
  }], { name: 'Studio Beispiel' })

  it('umschließt den Termin mit einem gültigen Rahmen', () => {
    const text: string = build()
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(text).toContain('VERSION:2.0')
    expect(text).toContain('BEGIN:VEVENT')
    expect(text).toContain('END:VEVENT')
  })

  it('benutzt METHOD:PUBLISH statt REQUEST', () => {
    // REQUEST macht daraus eine Einladung mit Zu-/Absage-Logik; manche
    // Programme schicken darauf automatisch eine Antwortmail.
    expect(build()).toContain('METHOD:PUBLISH')
    expect(build()).not.toContain('METHOD:REQUEST')
  })

  it('trägt Zeiten, Kennung und Status', () => {
    const text: string = build()
    expect(text).toContain('UID:abc123@fotos.example')
    expect(text).toContain('DTSTART:20260815T070000Z')
    expect(text).toContain('DTEND:20260815T083000Z')
    expect(text).toContain('DTSTAMP:20260731T120000Z')
    expect(text).toContain('STATUS:CONFIRMED')
  })

  it('nutzt durchgängig CRLF', () => {
    const text: string = build()
    expect(text.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('hält jede Zeile innerhalb der Oktettgrenze', () => {
    for (const line of (build() as string).split('\r\n')) {
      expect(byteLength(line)).toBeLessThanOrEqual(75)
    }
  })
})

describe('uidFor', () => {
  it('hängt den Host der Instanz an', () => {
    expect(ical.uidFor('abc', 'https://fotos.example.de/')).toBe('abc@fotos.example.de')
  })

  it('fällt ohne App-URL auf einen Platzhalter zurück', () => {
    expect(ical.uidFor('abc', '')).toBe('abc@albumwerk.local')
  })
})
