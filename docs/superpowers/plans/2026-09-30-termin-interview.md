# Termin-Interview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein geführter Assistent unter `/appointments/setup` befragt Fotograf:innen zu ihrem Arbeitsalltag und ersetzt daraus Termin-Arten, Wochenfenster und Grenzen. Jede Antwort zeigt dabei sofort an, was sich am bisherigen Plan ändert.

**Architecture:** Reine Logik in `src/features/Appointments/interview.ts` (Antworten ⇄ Plan ⇄ Änderungen). Eine Seite `AppointmentSetupPage.tsx` hält nur die Antworten im State. Gespeichert wird über den Endpunkt `POST /api/custom/booking/apply-plan`, der alles in einer Transaktion schreibt.

**Tech Stack:** React 18 + TypeScript, StyleX, `@astryxdesign/core`, PocketBase JSVM (pb_hooks, CommonJS), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-termin-interview-design.md`

## Global Constraints

- Keine Schemaänderung. Keine neue Abhängigkeit.
- Termin-Arten werden über `slug` zugeordnet und **nie gelöscht**, nur `active = false`.
- Inaktive Wochenfenster (`active = false`) bleiben beim Übernehmen unangetastet. Ersetzt werden nur die aktiven.
- Ausnahmen (`availabilityExceptions`) werden nicht angefasst.
- Nicht im Interview und unverändert: `phoneMode`, `startIntervalMin`, `description`, `bookingPendingExpiryHours`, `bookingCancelDeadlineHours`, `bookingReminderHours`, `bookingNotificationEmail`.
- Beim Übernehmen wird `bookingEnabled = true` gesetzt.
- Sichtbare Texte auf Deutsch, Anrede „du“, Gender-Doppelpunkt („Fotograf:in“) wie im restlichen Code.
- `interview.ts` importiert nur Typen aus `./api` (`import type`) und reine Funktionen aus `../Booking/time`.

## Review Focus

1. Assistent auf einer Instanz öffnen, die schon Fenster **mit Einschränkung** (`allowedTypes`) hat, und nur die Dauer ändern: Die alten Fenster müssen exakt erhalten bleiben (`scheduleTouched` bleibt false). Test: Task 1, „Rundreise mit eingeschränkten Fenstern“.
2. Eine Leistung abwählen, auf die bestehende Termine verweisen: Sie muss deaktiviert werden, nicht gelöscht, und die Zusammenfassung sagt das. Tests: Task 2 „abgewählte Art“ und Task 3 (Server deaktiviert, was nicht im Payload steht).
3. Eine eigene Leistung, deren Name einen schon vergebenen Kurz-Link ergibt (z. B. „Portrait“ ein zweites Mal): Sie darf nicht doppelt angelegt werden. Test: Task 1 „addCustomService ignoriert vorhandenen Slug“.
4. Arbeitszeit über Mitternacht (20:00–01:00) mit „Nur abends“: Das Fenster bleibt ganz erhalten und wird nicht bei 17 Uhr geschnitten. Test: Task 1 „über Mitternacht“.
5. Speichern schlägt serverseitig fehl: Der alte Plan bleibt, und die Antworten im Assistenten bleiben ebenfalls. Test: Task 3 `validatePlan`. Das UI-Verhalten deckt Task 4 ab (Fehler-Banner, kein Navigieren).

---

## File Structure

| Datei | Aufgabe |
|---|---|
| Create `src/features/Appointments/interview.ts` | Katalog, Typen, `currentPlan`, `answersFromPlan`, `planFromAnswers`, `rulesFromAnswers`, `diffPlans` |
| Create `tests/interview.test.ts` | Vitest für interview.ts |
| Create `pb_hooks/lib/planlib.js` | `validatePlan(body)` → Fehlermeldung oder `null` |
| Create `tests/planlib.test.ts` | Vitest für planlib.js |
| Modify `pb_hooks/booking.pb.js` (ans Ende) | Endpunkt `apply-plan` |
| Modify `src/features/Appointments/api.ts` (ans Ende) | `applyPlan(plan)` |
| Create `src/pages/admin/AppointmentSetupPage.tsx` | Der Assistent |
| Modify `src/App.tsx:177` | Route `appointments/setup` |
| Modify `src/pages/admin/AppointmentTypesPage.tsx`, `AvailabilityPage.tsx` | Einstieg „Geführt einrichten“ |
| Modify `docs/terminbuchung.md` §11.1 | Ein Absatz zum Assistenten |
| Create `e2e/tests/einstellungen/termin-interview.spec.ts` | Durchlauf im Browser |

---

### Task 1: Plan ⇄ Antworten (`interview.ts`, ohne Diff)

**Files:**
- Create: `src/features/Appointments/interview.ts`
- Test: `tests/interview.test.ts`

**Interfaces:**
- Consumes: `AppointmentType`, `AvailabilityRule` aus `src/features/Appointments/api.ts` (nur Typen); `slugify` aus `src/utils/slug.ts`.
- Produces (von Task 2 und 4 benutzt):
  - `type Restriction = "all" | "weekdays" | "weekend" | "evening"`
  - `interface TimeWindow { startMinute: number; endMinute: number }`
  - `interface Service { slug; name; durationMin; bufferMin; leadTimeMin; requiresApproval; location; price; restriction }`
  - `interface Answers { services: Service[]; days: number[]; windows: Record<number, TimeWindow[]>; restrict: boolean; scheduleTouched: boolean; maxPerDay: number; horizonDays: number }`
  - `interface PlanType { id?: string; slug; name; durationMin; bufferMin; leadTimeMin; requiresApproval; location; price; active: boolean; sort: number }`
  - `interface PlanRule extends TimeWindow { weekday: number; allowedSlugs: string[] }`
  - `interface Plan { types: PlanType[]; rules: PlanRule[]; maxPerDay: number; horizonDays: number; enabled: boolean }`
  - `interface BookingSettings { bookingEnabled: boolean; bookingMaxPerDay: number; bookingHorizonDays: number }`
  - `const EVENING = 1020`, `const CATALOG: Service[]`
  - `currentPlan(types: AppointmentType[], rules: AvailabilityRule[], settings: BookingSettings): Plan`
  - `answersFromPlan(plan: Plan): Answers`
  - `planFromAnswers(answers: Answers, current: Plan): Plan`
  - `rulesFromAnswers(answers: Answers): PlanRule[]`
  - `serviceFor(slug: string, current: Plan): Service`: aus bestehender Art, sonst aus dem Katalog
  - `addCustomService(answers: Answers, name: string): Answers`
  - `hasEvening(answers: Answers): boolean`

- [ ] **Step 1: Failing Tests schreiben**

`tests/interview.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  Answers,
  Plan,
  addCustomService,
  answersFromPlan,
  currentPlan,
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

  it('„nur abends“ teilt das Fenster bei 17 Uhr', () => {
    expect(rulesFromAnswers(answers({
      services: [portrait, { ...talk, restriction: 'evening' }], days: [3], restrict: true,
      windows: { 3: [{ startMinute: 540, endMinute: 1260 }] },
    }))).toEqual([
      { weekday: 3, startMinute: 540, endMinute: 1020, allowedSlugs: ['portrait'] },
      { weekday: 3, startMinute: 1020, endMinute: 1260, allowedSlugs: [] },
    ])
  })

  it('„nur am Wochenende“ nimmt die Leistung werktags heraus', () => {
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

  it('Einschränkung ohne Wirkung, solange Frage 9 mit „Nein“ beantwortet ist', () => {
    expect(rulesFromAnswers(answers({
      services: [{ ...portrait, restriction: 'weekend' }], days: [2], restrict: false,
      windows: { 2: [{ startMinute: 540, endMinute: 780 }] },
    }))).toEqual([{ weekday: 2, startMinute: 540, endMinute: 780, allowedSlugs: [] }])
  })
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/interview.test.ts`
Expected: FAIL, weil `../src/features/Appointments/interview` nicht existiert.

- [ ] **Step 3: Implementierung**

`src/features/Appointments/interview.ts`:

```ts
// Termin-Interview: Antworten ⇄ Plan ⇄ Änderungen
// (docs/superpowers/specs/2026-09-30-termin-interview-design.md).
//
// Reine Logik, kein React, kein PocketBase. Der Assistent hält nur `Answers`
// im State; Plan und Änderungsliste werden bei jedem Klick neu abgeleitet.
//
// Ein „Plan“ ist die Konfiguration in einer Form, die sich vergleichen lässt:
// Fenster verweisen über Slugs statt IDs auf Arten, weil neue Arten noch
// keine ID haben. Der Server übersetzt beim Speichern zurück.

import type { AppointmentType, AvailabilityRule } from "./api";
import { slugify } from "../../utils/slug";

export type Restriction = "all" | "weekdays" | "weekend" | "evening";

export interface TimeWindow {
  startMinute: number;
  endMinute: number;
}

export interface Service {
  slug: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  leadTimeMin: number;
  requiresApproval: boolean;
  location: string;
  price: number;
  restriction: Restriction;
}

export interface Answers {
  services: Service[];
  days: number[];
  // je ISO-Wochentag; eine Pause sind zwei Fenster
  windows: Record<number, TimeWindow[]>;
  restrict: boolean;
  // Solange die Fragen 7–9 unberührt sind, gelten die alten Fenster
  // unverändert. Sonst würde schon das Öffnen des Assistenten eine
  // Einschränkung verwerfen, die sich nicht in die Kacheln übersetzen lässt.
  scheduleTouched: boolean;
  maxPerDay: number;
  horizonDays: number;
}

export interface PlanType {
  id?: string;
  slug: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  leadTimeMin: number;
  requiresApproval: boolean;
  location: string;
  price: number;
  active: boolean;
  sort: number;
}

export interface PlanRule extends TimeWindow {
  weekday: number;
  // leer = alle Arten, sonst sortiert
  allowedSlugs: string[];
}

export interface Plan {
  types: PlanType[];
  rules: PlanRule[];
  maxPerDay: number;
  horizonDays: number;
  enabled: boolean;
}

export interface BookingSettings {
  bookingEnabled: boolean;
  bookingMaxPerDay: number;
  bookingHorizonDays: number;
}

/** „Abends“ beginnt um 17 Uhr. */
export const EVENING = 17 * 60;

const base = { location: "", price: 0, requiresApproval: false, restriction: "all" as const };

export const CATALOG: Service[] = [
  { ...base, slug: "kennenlernen", name: "Kennenlerngespräch", durationMin: 30, bufferMin: 0, leadTimeMin: 120 },
  { ...base, slug: "portrait", name: "Portrait", durationMin: 60, bufferMin: 30, leadTimeMin: 1440 },
  { ...base, slug: "paare", name: "Paare", durationMin: 90, bufferMin: 30, leadTimeMin: 1440 },
  { ...base, slug: "familie", name: "Familie", durationMin: 90, bufferMin: 30, leadTimeMin: 4320 },
  { ...base, slug: "hochzeit", name: "Hochzeit (Vorgespräch)", durationMin: 60, bufferMin: 0, leadTimeMin: 1440 },
  { ...base, slug: "business", name: "Business/Bewerbung", durationMin: 60, bufferMin: 15, leadTimeMin: 1440 },
];

const sameList = (a: string[], b: string[]) => a.join(",") === b.join(",");

export function currentPlan(
  types: AppointmentType[],
  rules: AvailabilityRule[],
  settings: BookingSettings,
): Plan {
  const slugById = new Map(types.map((type) => [type.id, type.slug]));
  return {
    types: types.map((type) => ({
      id: type.id,
      slug: type.slug,
      name: type.name,
      durationMin: type.durationMin,
      bufferMin: type.bufferMin,
      leadTimeMin: type.leadTimeMin,
      requiresApproval: type.requiresApproval,
      location: type.location,
      price: type.price,
      active: type.active,
      sort: type.sort,
    })),
    // Inaktive Fenster sind geparkte Handarbeit aus dem Formular. Der Server
    // lässt sie stehen, also tauchen sie hier gar nicht erst auf.
    rules: rules
      .filter((rule) => rule.active)
      .map((rule) => ({
        weekday: rule.weekday,
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
        allowedSlugs: rule.allowedTypes
          .map((id) => slugById.get(id))
          .filter((slug): slug is string => Boolean(slug))
          .sort(),
      })),
    maxPerDay: settings.bookingMaxPerDay,
    horizonDays: settings.bookingHorizonDays,
    enabled: settings.bookingEnabled,
  };
}

function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  const merged: TimeWindow[] = [];
  for (const w of [...windows].sort((a, b) => a.startMinute - b.startMinute)) {
    const last = merged[merged.length - 1];
    if (last && w.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, w.endMinute);
    } else {
      merged.push({ startMinute: w.startMinute, endMinute: w.endMinute });
    }
  }
  return merged;
}

// Nur für die Vorbelegung von Frage 9. Was sich nicht einordnen lässt, wird
// „all“ angezeigt; wirksam wird es erst, wenn die Zeitfragen angefasst werden.
function inferRestriction(slug: string, rules: PlanRule[]): Restriction {
  const open = rules.filter((r) => r.allowedSlugs.length === 0 || r.allowedSlugs.includes(slug));
  if (open.length === rules.length || open.length === 0) return "all";
  if (open.every((r) => r.startMinute >= EVENING)) return "evening";
  if (open.every((r) => r.weekday <= 5)) return "weekdays";
  if (open.every((r) => r.weekday >= 6)) return "weekend";
  return "all";
}

function toService(type: PlanType, rules: PlanRule[]): Service {
  return {
    slug: type.slug,
    name: type.name,
    durationMin: type.durationMin,
    bufferMin: type.bufferMin,
    leadTimeMin: type.leadTimeMin,
    requiresApproval: type.requiresApproval,
    location: type.location,
    price: type.price,
    restriction: inferRestriction(type.slug, rules),
  };
}

export function answersFromPlan(plan: Plan): Answers {
  const services = plan.types
    .filter((type) => type.active)
    .sort((a, b) => a.sort - b.sort)
    .map((type) => toService(type, plan.rules));
  const days = [...new Set(plan.rules.map((rule) => rule.weekday))].sort((a, b) => a - b);
  const windows: Record<number, TimeWindow[]> = {};
  for (const day of days) {
    windows[day] = mergeWindows(plan.rules.filter((rule) => rule.weekday === day));
  }
  return {
    services,
    days,
    windows,
    restrict: services.some((service) => service.restriction !== "all"),
    scheduleTouched: false,
    maxPerDay: plan.maxPerDay,
    horizonDays: plan.horizonDays,
  };
}

/** Leistung für eine Kachel in Frage 1: bestehende Art vor Katalogwerten. */
export function serviceFor(slug: string, current: Plan): Service {
  const existing = current.types.find((type) => type.slug === slug);
  if (existing) return toService(existing, current.rules);
  return { ...CATALOG.find((service) => service.slug === slug)! };
}

export function addCustomService(answers: Answers, name: string): Answers {
  const slug = slugify(name);
  if (!slug || answers.services.some((service) => service.slug === slug)) return answers;
  const service: Service = { ...base, slug, name: name.trim(), durationMin: 60, bufferMin: 0, leadTimeMin: 1440 };
  return { ...answers, services: [...answers.services, service] };
}

export function hasEvening(answers: Answers): boolean {
  return answers.days.some((day) =>
    (answers.windows[day] ?? []).some((w) => w.endMinute > EVENING),
  );
}

function opens(restriction: Restriction, weekday: number, segment: TimeWindow): boolean {
  switch (restriction) {
    case "weekdays":
      return weekday <= 5;
    case "weekend":
      return weekday >= 6;
    case "evening":
      return segment.startMinute >= EVENING;
    default:
      return true;
  }
}

export function rulesFromAnswers(answers: Answers): PlanRule[] {
  const rules: PlanRule[] = [];
  const count = answers.services.length;
  for (const weekday of [...answers.days].sort((a, b) => a - b)) {
    for (const w of answers.windows[weekday] ?? []) {
      const cuts = [w.startMinute, w.endMinute];
      if (answers.restrict && w.startMinute < EVENING && EVENING < w.endMinute) {
        cuts.splice(1, 0, EVENING);
      }
      for (let i = 0; i < cuts.length - 1; i++) {
        const segment = { startMinute: cuts[i], endMinute: cuts[i + 1] };
        const allowed = answers.services
          .filter((s) => !answers.restrict || opens(s.restriction, weekday, segment))
          .map((s) => s.slug)
          .sort();
        if (allowed.length === 0) continue;
        const allowedSlugs = allowed.length === count ? [] : allowed;
        const prev = rules[rules.length - 1];
        if (
          prev &&
          prev.weekday === weekday &&
          prev.endMinute === segment.startMinute &&
          sameList(prev.allowedSlugs, allowedSlugs)
        ) {
          prev.endMinute = segment.endMinute;
        } else {
          rules.push({ weekday, ...segment, allowedSlugs });
        }
      }
    }
  }
  return rules;
}

export function planFromAnswers(answers: Answers, current: Plan): Plan {
  const bySlug = new Map(current.types.map((type) => [type.slug, type]));
  const chosen = new Set(answers.services.map((service) => service.slug));
  let nextSort = Math.max(0, ...current.types.map((type) => type.sort)) + 1;

  const types: PlanType[] = answers.services.map((service) => {
    const old = bySlug.get(service.slug);
    return {
      id: old?.id,
      slug: service.slug,
      name: service.name,
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      leadTimeMin: service.leadTimeMin,
      requiresApproval: service.requiresApproval,
      location: service.location,
      price: service.price,
      active: true,
      sort: old ? old.sort : nextSort++,
    };
  });
  for (const old of current.types) {
    if (!chosen.has(old.slug)) types.push({ ...old, active: false });
  }

  return {
    types,
    rules: answers.scheduleTouched ? rulesFromAnswers(answers) : current.rules,
    maxPerDay: answers.maxPerDay,
    horizonDays: answers.horizonDays,
    enabled: true,
  };
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/interview.test.ts`
Expected: PASS. Achtung beim Test „ergibt denselben Plan“: `toEqual` vergleicht auch die Reihenfolge von `types`. Weicht sie ab, erst prüfen, ob `answersFromPlan` nach `sort` ordnet.

- [ ] **Step 5: Commit**

```bash
git add src/features/Appointments/interview.ts tests/interview.test.ts
git commit -m "Termin-Interview: Antworten und Plan ineinander übersetzen"
```

---

### Task 2: Änderungsliste (`diffPlans`)

**Files:**
- Modify: `src/features/Appointments/interview.ts` (ans Ende anhängen)
- Test: `tests/interview.test.ts` (neuer `describe`-Block)

**Interfaces:**
- Consumes: `Plan`, `PlanRule` aus Task 1; `formatWindow` aus `src/features/Booking/time.ts`.
- Produces (von Task 4 benutzt):
  - `type ChangeField = "service" | "durationMin" | "bufferMin" | "leadTimeMin" | "requiresApproval" | "location" | "price" | "rules" | "maxPerDay" | "horizonDays" | "enabled"`
  - `type ChangeKind = "neu" | "geändert" | "deaktiviert" | "entfällt"`
  - `interface Change { field: ChangeField; kind: ChangeKind; text: string }`
  - `diffPlans(old: Plan, next: Plan, currency?: string): Change[]`
  - `formatSpan(minutes: number): string`: „keine“, „30 Min“, „2 Std“, „1 Tag“, „3 Tage“, „1 Woche“

- [ ] **Step 1: Failing Tests anhängen**

Oben in `tests/interview.test.ts` den Import um `diffPlans, formatSpan` erweitern, dann anhängen:

```ts
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
      { field: 'durationMin', kind: 'geändert', text: '„Portraitshooting“: 90 Min → 60 Min' },
      { field: 'requiresApproval', kind: 'geändert', text: '„Portraitshooting“: sofort verbindlich → erst nach deiner Zusage' },
      { field: 'price', kind: 'geändert', text: '„Portraitshooting“: kostenlos → 150 EUR' },
    ])
  })

  it('abgewählte Art', () => {
    const next = planFromAnswers({ ...answersFromPlan(plan), services: [] }, plan)
    expect(diffPlans(plan, next)).toContainEqual({
      field: 'service', kind: 'deaktiviert',
      text: '„Portraitshooting“ ist nicht mehr buchbar – bestehende Termine bleiben',
    })
  })

  it('Fenster: entfällt und neu, mit Einschränkung im Text', () => {
    const next: Plan = { ...plan, rules: [{ weekday: 2, startMinute: 1020, endMinute: 1260, allowedSlugs: ['portrait'] }] }
    expect(diffPlans(plan, next)).toEqual([
      { field: 'rules', kind: 'entfällt', text: 'Sa 09:00 – 13:00 entfällt' },
      { field: 'rules', kind: 'neu', text: 'Di 17:00 – 21:00 (nur „Portraitshooting“)' },
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
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/interview.test.ts`
Expected: FAIL mit „diffPlans is not a function“ bzw. einem Importfehler.

- [ ] **Step 3: Implementierung anhängen**

Oben in `interview.ts` ergänzen: `import { formatWindow } from "../Booking/time";`. Dann ans Ende:

```ts
// --- Änderungen ------------------------------------------------------------

export type ChangeField =
  | "service"
  | "durationMin"
  | "bufferMin"
  | "leadTimeMin"
  | "requiresApproval"
  | "location"
  | "price"
  | "rules"
  | "maxPerDay"
  | "horizonDays"
  | "enabled";

export type ChangeKind = "neu" | "geändert" | "deaktiviert" | "entfällt";

export interface Change {
  field: ChangeField;
  kind: ChangeKind;
  text: string;
}

const WEEKDAY_SHORT = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function formatSpan(minutes: number): string {
  if (minutes === 0) return "keine";
  if (minutes % 10080 === 0) return minutes === 10080 ? "1 Woche" : `${minutes / 10080} Wochen`;
  if (minutes % 1440 === 0) return minutes === 1440 ? "1 Tag" : `${minutes / 1440} Tage`;
  if (minutes % 60 === 0) return `${minutes / 60} Std`;
  return `${minutes} Min`;
}

export function diffPlans(old: Plan, next: Plan, currency = "EUR"): Change[] {
  const changes: Change[] = [];
  const oldBySlug = new Map(old.types.map((type) => [type.slug, type]));
  const price = (value: number) => (value > 0 ? `${value} ${currency}` : "kostenlos");
  const approval = (value: boolean) => (value ? "erst nach deiner Zusage" : "sofort verbindlich");

  for (const type of next.types) {
    const label = `„${type.name}“`;
    const before = oldBySlug.get(type.slug);
    if (!before) {
      if (type.active) changes.push({ field: "service", kind: "neu", text: `${label} wird neu angelegt` });
      continue;
    }
    if (before.active && !type.active) {
      changes.push({
        field: "service",
        kind: "deaktiviert",
        text: `${label} ist nicht mehr buchbar – bestehende Termine bleiben`,
      });
      continue;
    }
    if (!type.active) continue;
    if (!before.active) changes.push({ field: "service", kind: "neu", text: `${label} wird wieder buchbar` });
    if (before.name !== type.name) {
      changes.push({ field: "service", kind: "geändert", text: `„${before.name}“ heißt jetzt ${label}` });
    }
    const field = (name: ChangeField, from: string, to: string) => {
      if (from !== to) changes.push({ field: name, kind: "geändert", text: `${label}: ${from} → ${to}` });
    };
    field("durationMin", `${before.durationMin} Min`, `${type.durationMin} Min`);
    field("bufferMin", `Puffer ${formatSpan(before.bufferMin)}`, `Puffer ${formatSpan(type.bufferMin)}`);
    field("leadTimeMin", `Vorlauf ${formatSpan(before.leadTimeMin)}`, `Vorlauf ${formatSpan(type.leadTimeMin)}`);
    field("requiresApproval", approval(before.requiresApproval), approval(type.requiresApproval));
    field("location", before.location || "kein Ort", type.location || "kein Ort");
    field("price", price(before.price), price(type.price));
  }

  // Namen für „(nur …)“: neue Namen vor alten, damit Umbenennungen stimmen
  const names = new Map([...old.types, ...next.types].map((type) => [type.slug, type.name]));
  const key = (rule: PlanRule) =>
    `${rule.weekday}|${rule.startMinute}|${rule.endMinute}|${rule.allowedSlugs.join(",")}`;
  const describe = (rule: PlanRule) => {
    const only = rule.allowedSlugs.map((slug) => `„${names.get(slug) ?? slug}“`).join(", ");
    return `${WEEKDAY_SHORT[rule.weekday]} ${formatWindow(rule.startMinute, rule.endMinute)}${only ? ` (nur ${only})` : ""}`;
  };
  const oldKeys = new Set(old.rules.map(key));
  const nextKeys = new Set(next.rules.map(key));
  for (const rule of old.rules) {
    if (!nextKeys.has(key(rule))) changes.push({ field: "rules", kind: "entfällt", text: `${describe(rule)} entfällt` });
  }
  for (const rule of next.rules) {
    if (!oldKeys.has(key(rule))) changes.push({ field: "rules", kind: "neu", text: describe(rule) });
  }

  const perDay = (value: number) => (value > 0 ? String(value) : "unbegrenzt");
  if (old.maxPerDay !== next.maxPerDay) {
    changes.push({
      field: "maxPerDay",
      kind: "geändert",
      text: `Höchstens pro Tag: ${perDay(old.maxPerDay)} → ${perDay(next.maxPerDay)}`,
    });
  }
  if (old.horizonDays !== next.horizonDays) {
    changes.push({
      field: "horizonDays",
      kind: "geändert",
      text: `Buchbar im Voraus: ${old.horizonDays} → ${next.horizonDays} Tage`,
    });
  }
  if (!old.enabled && next.enabled) {
    changes.push({ field: "enabled", kind: "neu", text: "Die Terminbuchung wird eingeschaltet" });
  }
  return changes;
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/interview.test.ts`
Expected: PASS. `formatWindow` gibt „09:00 – 13:00“ aus, mit Halbgeviertstrich und Leerzeichen. Die Testtexte oben verwenden dasselbe Zeichen.

- [ ] **Step 5: Commit**

```bash
git add src/features/Appointments/interview.ts tests/interview.test.ts
git commit -m "Termin-Interview: Änderungen gegenüber dem alten Plan benennen"
```

---

### Task 3: Speichern: Prüfung, Endpunkt, Client

**Files:**
- Create: `pb_hooks/lib/planlib.js`
- Test: `tests/planlib.test.ts`
- Modify: `pb_hooks/booking.pb.js` (ans Dateiende)
- Modify: `src/features/Appointments/api.ts` (ans Dateiende)

**Interfaces:**
- Consumes: `Plan` aus Task 1 (Payload-Form); `booking.guard`, `booking.cleanText` aus `pb_hooks/lib/bookinglib.js`; `apiError` aus `api.ts` (modulintern).
- Produces: `applyPlan(plan: Plan): Promise<void>` in `api.ts`. Wirft `BookingApiError` mit der deutschen Meldung des Servers.

- [ ] **Step 1: Failing Test schreiben**

`tests/planlib.test.ts`:

```ts
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
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/planlib.test.ts`
Expected: FAIL mit „Cannot find module '../pb_hooks/lib/planlib.js'“.

- [ ] **Step 3: `planlib.js` schreiben**

```js
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
```

- [ ] **Step 4: Test laufen lassen**

Run: `npx vitest run tests/planlib.test.ts`
Expected: PASS

- [ ] **Step 5: Endpunkt ans Ende von `pb_hooks/booking.pb.js` anhängen**

```js
// ---------------------------------------------------------------------------
// Admin: Plan aus dem Termin-Interview übernehmen
// ---------------------------------------------------------------------------
//
// Alles oder nichts: Arten, Fenster und Grenzen in EINER Transaktion. Bricht
// das nach dem Löschen der alten Fenster ab, wäre plötzlich nichts mehr
// buchbar — und das eingebettete Formular auf der Website der Fotograf:in
// zeigte „keine Termine“, ohne dass es jemand merkt.

routerAdd("POST", "/api/custom/booking/apply-plan", (e) => {
  const booking = require(__hooks + "/lib/bookinglib.js");
  const planlib = require(__hooks + "/lib/planlib.js");
  return booking.guard(e, "Plan übernehmen", () => {

    if (!e.hasSuperuserAuth() && !(e.auth && e.auth.getBool("isAdmin"))) {
      return e.json(403, { status: "error", message: "Nur für Administrator:innen." });
    }

    const body = e.requestInfo().body || {};
    const problem = planlib.validatePlan(body);
    if (problem) {
      return e.json(400, { status: "error", message: problem });
    }

    try {
      e.app.runInTransaction((txApp) => {
        const typeCol = txApp.findCollectionByNameOrId("appointmentTypes");
        const bySlug = {};
        txApp.findAllRecords("appointmentTypes").forEach((record) => {
          bySlug[record.getString("slug")] = record;
        });

        const idBySlug = {};
        body.types.forEach((type) => {
          let record = bySlug[type.slug];
          if (!record) {
            record = new Record(typeCol);
            record.set("slug", type.slug);
            record.set("phoneMode", "optional");
          }
          delete bySlug[type.slug];
          record.set("name", booking.cleanText(type.name, 80));
          record.set("location", booking.cleanText(type.location, 200));
          record.set("durationMin", Math.round(Number(type.durationMin)));
          record.set("bufferMin", Math.max(0, Math.round(Number(type.bufferMin) || 0)));
          record.set("leadTimeMin", Math.max(0, Math.round(Number(type.leadTimeMin) || 0)));
          record.set("price", Math.max(0, Number(type.price) || 0));
          record.set("sort", Math.round(Number(type.sort) || 0));
          record.set("requiresApproval", !!type.requiresApproval);
          record.set("active", !!type.active);
          txApp.save(record);
          idBySlug[type.slug] = record.id;
        });

        // Was der Client nicht mitgeschickt hat, wird nicht mehr angeboten —
        // gelöscht wird nie: bestehende Termine verweisen darauf.
        Object.keys(bySlug).forEach((slug) => {
          bySlug[slug].set("active", false);
          txApp.save(bySlug[slug]);
        });

        // Inaktive Fenster sind geparkte Handarbeit aus dem Formular und
        // bleiben stehen. Ersetzt werden nur die aktiven.
        txApp.findRecordsByFilter("availabilityRules", "active = true", "", 0, 0)
          .forEach((record) => txApp.delete(record));
        const ruleCol = txApp.findCollectionByNameOrId("availabilityRules");
        body.rules.forEach((rule) => {
          const record = new Record(ruleCol);
          record.set("weekday", Number(rule.weekday));
          record.set("startMinute", Number(rule.startMinute));
          record.set("endMinute", Number(rule.endMinute));
          record.set("allowedTypes", (rule.allowedSlugs || []).map((slug) => idBySlug[slug]));
          record.set("active", true);
          txApp.save(record);
        });

        const settings = txApp.findRecordById("settings", "appsettings0001");
        settings.set("bookingMaxPerDay", Math.max(0, Math.round(Number(body.maxPerDay) || 0)));
        settings.set("bookingHorizonDays", Math.max(1, Math.round(Number(body.horizonDays) || 90)));
        settings.set("bookingEnabled", true);
        txApp.save(settings);
      });
    } catch (err) {
      e.app.logger().warn("[booking] Plan abgelehnt", "error", String(err));
      return e.json(400, {
        status: "error",
        message: "Der Plan konnte nicht gespeichert werden. Es wurde nichts verändert.",
      });
    }

    return e.json(200, { status: "ok" });
  });
});
```

- [ ] **Step 6: Client-Funktion ans Ende von `src/features/Appointments/api.ts` anhängen**

Oben bei den Importen ergänzen: `import type { Plan } from "./interview";`

```ts
// --- Termin-Interview ------------------------------------------------------

/** Ersetzt Arten, aktive Fenster und Grenzen in einer Transaktion. */
export async function applyPlan(plan: Plan): Promise<void> {
  try {
    await pb.send("/api/custom/booking/apply-plan", { method: "POST", body: plan });
  } catch (error) {
    throw apiError(error);
  }
}
```

- [ ] **Step 7: Endpunkt gegen die Dev-Instanz prüfen**

Die Instanz lädt `pb_hooks` beim Neustart: `make dev` bzw. den Container neu starten. Danach:

```bash
curl -s -X POST localhost:8091/api/custom/booking/apply-plan -H 'Content-Type: application/json' -d '{}'
```
Expected: `{"message":"Nur für Administrator:innen.","status":"error"}` (403). Ein Aufruf mit Admin-Token prüft Task 5 im Browser.

- [ ] **Step 8: Typprüfung und Tests**

Run: `npx tsc --noEmit -p . && npx vitest run tests/planlib.test.ts tests/interview.test.ts`
Expected: keine Typfehler, alle Tests PASS.

- [ ] **Step 9: Commit**

```bash
git add pb_hooks/lib/planlib.js pb_hooks/booking.pb.js tests/planlib.test.ts src/features/Appointments/api.ts
git commit -m "Termin-Interview: Plan in einer Transaktion übernehmen"
```

---

### Task 4: Der Assistent

**Files:**
- Create: `src/pages/admin/AppointmentSetupPage.tsx`
- Modify: `src/App.tsx:177` (Route + Import)
- Modify: `src/pages/admin/AppointmentTypesPage.tsx` (Page-`actions`, `EmptyState`)
- Modify: `src/pages/admin/AvailabilityPage.tsx` (Page-`actions`)
- Modify: `docs/terminbuchung.md` §11.1

**Interfaces:**
- Consumes: alles aus Task 1 und 2; `applyPlan`, `fetchTypes`, `fetchRules` aus `api.ts`; `useSettings()` → `{ settings, refresh }`; `timeToMinutes`, `minutesToTime`, `formatWindow` aus `features/Booking/time.ts`.
- Produces: Route `/appointments/setup`. Die Test-IDs `interview-schritt` (Überschrift), `interview-aenderungen` (Hinweisliste) und `interview-weiter` / `interview-uebernehmen` (Buttons) nutzt Task 5.

- [ ] **Step 1: Seite schreiben**

`src/pages/admin/AppointmentSetupPage.tsx`:

```tsx
// Termin-Interview (docs/superpowers/specs/2026-09-30-termin-interview-design.md).
//
// Statt zweier großer Formulare eine Frage pro Bildschirm, mit Kacheln zum
// Anklicken. Vorausgefüllt aus dem aktuellen Plan; jede Abweichung davon
// steht sofort unter der Frage. Gespeichert wird erst im letzten Schritt —
// Abbrechen lässt alles, wie es war.

import { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import * as stylex from "@stylexjs/stylex";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Page from "../../components/layout/Page";
import { useSettings } from "../../context/SettingsContext";
import { applyPlan, fetchRules, fetchTypes } from "../../features/Appointments/api";
import {
  Answers,
  CATALOG,
  Change,
  ChangeField,
  Plan,
  Restriction,
  Service,
  TimeWindow,
  addCustomService,
  answersFromPlan,
  currentPlan,
  diffPlans,
  formatSpan,
  hasEvening,
  planFromAnswers,
  serviceFor,
} from "../../features/Appointments/interview";
import { formatWindow, timeToMinutes } from "../../features/Booking/time";

type Option<T> = { value: T; label: string; isDisabled?: boolean };

const STEPS: { title: string; fields: ChangeField[] }[] = [
  { title: "Was können Kund:innen bei dir buchen?", fields: ["service"] },
  { title: "Wie lange dauert ein Termin?", fields: ["durationMin"] },
  { title: "Wie viel Luft brauchst du danach?", fields: ["bufferMin"] },
  { title: "Wie kurzfristig darf man buchen?", fields: ["leadTimeMin"] },
  { title: "Sagst du jeden Termin selbst zu?", fields: ["requiresApproval"] },
  { title: "Wo findet es statt, und was kostet es?", fields: ["location", "price"] },
  { title: "An welchen Tagen arbeitest du?", fields: ["rules"] },
  { title: "Zu welchen Zeiten?", fields: ["rules"] },
  { title: "Sollen manche Leistungen nur zu bestimmten Zeiten buchbar sein?", fields: ["rules"] },
  { title: "Wie viele Termine schaffst du an einem Tag höchstens?", fields: ["maxPerDay"] },
  { title: "Wie weit im Voraus darf gebucht werden?", fields: ["horizonDays"] },
  { title: "Das ändert sich", fields: [] },
];
const SUMMARY = STEPS.length - 1;

const WEEKDAYS: Option<number>[] = [
  { value: 1, label: "Mo" }, { value: 2, label: "Di" }, { value: 3, label: "Mi" },
  { value: 4, label: "Do" }, { value: 5, label: "Fr" }, { value: 6, label: "Sa" },
  { value: 7, label: "So" },
];
const WEEKDAY_LONG = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

const DURATIONS = [15, 30, 60, 90, 120].map((v) => ({ value: v, label: `${v} Min` }));
const BUFFERS = [0, 15, 30, 60].map((v) => ({ value: v, label: formatSpan(v) }));
const LEADS: Option<number>[] = [
  { value: 120, label: "Gleicher Tag (2 Std vorher)" },
  { value: 1440, label: "Einen Tag vorher" },
  { value: 4320, label: "Drei Tage vorher" },
  { value: 10080, label: "Eine Woche vorher" },
];
const APPROVAL: Option<boolean>[] = [
  { value: false, label: "Sofort verbindlich" },
  { value: true, label: "Erst nach meiner Zusage" },
];
const HOURS: Option<TimeWindow[]>[] = [
  { value: [{ startMinute: 540, endMinute: 780 }], label: "Vormittags 9–13" },
  { value: [{ startMinute: 780, endMinute: 1080 }], label: "Nachmittags 13–18" },
  { value: [{ startMinute: 540, endMinute: 1080 }], label: "Ganztags 9–18" },
  { value: [{ startMinute: 1020, endMinute: 1260 }], label: "Abends 17–21" },
];
const MAX_PER_DAY = [1, 2, 3, 0].map((v) => ({ value: v, label: v ? String(v) : "Egal" }));
const HORIZON: Option<number>[] = [
  { value: 28, label: "4 Wochen" },
  { value: 90, label: "3 Monate" },
  { value: 180, label: "6 Monate" },
  { value: 365, label: "1 Jahr" },
];
const KIND_LABEL: Record<Change["kind"], string> = {
  neu: "Neu",
  geändert: "Geändert",
  deaktiviert: "Nicht mehr buchbar",
  entfällt: "Entfällt",
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const s = stylex.create({
  column: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 8,
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 16,
    borderRadius: "var(--radius-container)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-card)",
  },
  inline: { display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" },
  list: { margin: 0, paddingLeft: 20 },
  actions: { display: "flex", justifyContent: "space-between", gap: 8 },
  center: { display: "flex", justifyContent: "center", padding: 48 },
});

/**
 * Kacheln für eine Einfachauswahl. Passt der aktuelle Wert zu keiner Kachel,
 * kommt eine zusätzliche, gewählte Kachel „Eigene Einstellung“ dazu — so
 * überschreibt das Interview nichts, was im Formular feiner eingestellt war.
 */
function Tiles<T>({
  options,
  value,
  onChange,
  custom,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  custom?: (value: T) => string;
}): ReactElement {
  const known = options.some((option) => same(option.value, value));
  return (
    <div {...stylex.props(s.tiles)}>
      {options.map((option) => (
        <SelectableCard
          key={option.label}
          label={option.label}
          isSelected={same(option.value, value)}
          isDisabled={option.isDisabled}
          onChange={() => onChange(option.value)}
        />
      ))}
      {!known && custom && (
        <SelectableCard label={`Eigene Einstellung: ${custom(value)}`} isSelected onChange={() => undefined} />
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <div {...stylex.props(s.block)}>
      <Text type="body" weight="semibold">{title}</Text>
      {children}
    </div>
  );
}

/** Zeitkacheln plus freie Eingabe, für einen Tag oder für alle. */
function HoursPicker({
  value,
  onChange,
}: {
  value: TimeWindow[];
  onChange: (value: TimeWindow[]) => void;
}): ReactElement {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const setOwn = () => {
    const start = timeToMinutes(from);
    let end = timeToMinutes(to);
    if (start === null || end === null) {
      toast.error("Bitte Uhrzeiten als HH:MM angeben.");
      return;
    }
    // wie auf der Verfügbarkeitsseite: Ende vor Beginn heißt „über Mitternacht“
    if (end <= start) end += 1440;
    onChange([{ startMinute: start, endMinute: end }]);
  };
  return (
    <>
      <Tiles
        options={HOURS}
        value={value}
        onChange={onChange}
        custom={(windows) => windows.map((w) => formatWindow(w.startMinute, w.endMinute)).join(", ")}
      />
      <div {...stylex.props(s.inline)}>
        <TextInput label="Eigene Zeit von" placeholder="10:00" value={from} onChange={setFrom} />
        <TextInput label="bis" placeholder="16:00" value={to} onChange={setTo} />
        <Button variant="secondary" label="Übernehmen" onClick={setOwn} />
      </div>
    </>
  );
}

export default function AppointmentSetupPage(): ReactElement {
  const navigate = useNavigate();
  const { settings, loaded, refresh } = useSettings();
  const [current, setCurrent] = useState<Plan | null>(null);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [step, setStep] = useState(0);
  const [perDay, setPerDay] = useState(false);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    // Erst mit geladenen Settings: vorher stehen dort neutrale Vorgaben, und
    // der „alte Plan“ hätte z. B. eine ausgeschaltete Buchung.
    if (!loaded || current) return;
    Promise.all([fetchTypes(), fetchRules()])
      .then(([types, rules]) => {
        const plan = currentPlan(types, rules, settings);
        setCurrent(plan);
        setAnswers(answersFromPlan(plan));
        // Unterschiedliche Zeiten je Tag gleich aufgeklappt zeigen
        const first = plan.rules[0];
        setPerDay(
          plan.rules.some(
            (rule) => rule.startMinute !== first.startMinute || rule.endMinute !== first.endMinute,
          ),
        );
      })
      .catch(() => setUnavailable(true));
    // Nur einmal: ein späteres Nachladen der Settings würde die Antworten
    // zurücksetzen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const changes = useMemo(
    () => (current && answers ? diffPlans(current, planFromAnswers(answers, current), settings.currency || "EUR") : []),
    [current, answers, settings.currency],
  );

  if (unavailable) {
    return (
      <Page title="Geführt einrichten">
        <Banner status="warning" title="Die Terminbuchung ist auf dieser Instanz noch nicht eingerichtet.">
          <Text type="body">
            Starte deine Instanz einmal neu — die nötige Migration läuft dabei automatisch mit.
          </Text>
        </Banner>
      </Page>
    );
  }
  if (!current || !answers) {
    return (
      <Page title="Geführt einrichten">
        <div {...stylex.props(s.center)}>
          <Spinner />
        </div>
      </Page>
    );
  }

  const set = (patch: Partial<Answers>) => setAnswers({ ...answers, ...patch });
  const setSchedule = (patch: Partial<Answers>) => set({ ...patch, scheduleTouched: true });
  const setService = (slug: string, patch: Partial<Service>) =>
    set({ services: answers.services.map((sv) => (sv.slug === slug ? { ...sv, ...patch } : sv)) });
  const perService = (render: (service: Service) => ReactNode) =>
    answers.services.map((service) => (
      <Block key={service.slug} title={service.name}>
        {render(service)}
      </Block>
    ));

  // Frage 1: Katalog plus alle schon vorhandenen Arten, auch inaktive
  const serviceOptions = [
    ...CATALOG.map((c) => ({ slug: c.slug, name: current.types.find((t) => t.slug === c.slug)?.name ?? c.name })),
    ...current.types.filter((t) => !CATALOG.some((c) => c.slug === t.slug)).map((t) => ({ slug: t.slug, name: t.name })),
    ...answers.services
      .filter((sv) => !CATALOG.some((c) => c.slug === sv.slug) && !current.types.some((t) => t.slug === sv.slug))
      .map((sv) => ({ slug: sv.slug, name: sv.name })),
  ];
  const toggleService = (slug: string, on: boolean) =>
    set({
      services: on
        ? [...answers.services, serviceFor(slug, current)]
        : answers.services.filter((sv) => sv.slug !== slug),
    });

  const setDays = (days: number[]) => {
    const template = answers.windows[answers.days[0]] ?? [{ startMinute: 540, endMinute: 1080 }];
    const windows: Record<number, TimeWindow[]> = {};
    for (const day of days) windows[day] = answers.windows[day] ?? template;
    setSchedule({ days: [...days].sort((a, b) => a - b), windows });
  };
  const setAllHours = (value: TimeWindow[]) =>
    setSchedule({ windows: Object.fromEntries(answers.days.map((day) => [day, value])) });

  const restrictionOptions: Option<Restriction>[] = [
    { value: "all", label: "Wie meine Arbeitszeit" },
    { value: "weekdays", label: "Nur werktags" },
    { value: "weekend", label: "Nur am Wochenende" },
    { value: "evening", label: "Nur abends (ab 17 Uhr)", isDisabled: !hasEvening(answers) },
  ];

  const questions: ReactNode[] = [
    // 1
    <>
      <div {...stylex.props(s.tiles)}>
        {serviceOptions.map((option) => (
          <SelectableCard
            key={option.slug}
            label={option.name}
            isSelected={answers.services.some((sv) => sv.slug === option.slug)}
            onChange={(on) => toggleService(option.slug, on)}
          />
        ))}
      </div>
      <div {...stylex.props(s.inline)}>
        <TextInput label="Eigene Leistung" placeholder="z. B. Newborn" value={customName} onChange={setCustomName} />
        <Button
          variant="secondary"
          label="Hinzufügen"
          onClick={() => {
            setAnswers(addCustomService(answers, customName));
            setCustomName("");
          }}
        />
      </div>
    </>,
    // 2
    perService((service) => (
      <>
        <Tiles
          options={DURATIONS}
          value={service.durationMin}
          onChange={(v) => setService(service.slug, { durationMin: v })}
          custom={(v) => `${v} Min`}
        />
        <NumberInput
          label="Andere Dauer (Minuten)"
          value={service.durationMin}
          onChange={(v) => setService(service.slug, { durationMin: Number(v) || 0 })}
        />
      </>
    )),
    // 3
    perService((service) => (
      <Tiles
        options={BUFFERS}
        value={service.bufferMin}
        onChange={(v) => setService(service.slug, { bufferMin: v })}
        custom={formatSpan}
      />
    )),
    // 4
    perService((service) => (
      <Tiles
        options={LEADS}
        value={service.leadTimeMin}
        onChange={(v) => setService(service.slug, { leadTimeMin: v })}
        custom={formatSpan}
      />
    )),
    // 5
    perService((service) => (
      <Tiles
        options={APPROVAL}
        value={service.requiresApproval}
        onChange={(v) => setService(service.slug, { requiresApproval: v })}
      />
    )),
    // 6
    perService((service) => (
      <div {...stylex.props(s.inline)}>
        <TextInput
          label="Ort (optional)"
          value={service.location}
          onChange={(v) => setService(service.slug, { location: v })}
        />
        <NumberInput
          label={`Preis (${settings.currency || "EUR"}), 0 = kostenlos`}
          value={service.price}
          onChange={(v) => setService(service.slug, { price: Number(v) || 0 })}
        />
      </div>
    )),
    // 7
    <>
      <div {...stylex.props(s.tiles)}>
        {WEEKDAYS.map((day) => (
          <SelectableCard
            key={day.value}
            label={day.label}
            isSelected={answers.days.includes(day.value)}
            onChange={(on) =>
              setDays(on ? [...answers.days, day.value] : answers.days.filter((d) => d !== day.value))
            }
          />
        ))}
      </div>
      <div {...stylex.props(s.inline)}>
        <Button variant="secondary" label="Mo–Fr" onClick={() => setDays([1, 2, 3, 4, 5])} />
        <Button variant="secondary" label="Wochenende" onClick={() => setDays([6, 7])} />
      </div>
    </>,
    // 8
    <>
      <Switch label="Nicht jeden Tag gleich" value={perDay} onChange={setPerDay} />
      {perDay ? (
        answers.days.map((day) => (
          <Block key={day} title={WEEKDAY_LONG[day]}>
            <HoursPicker
              value={answers.windows[day] ?? []}
              onChange={(value) => setSchedule({ windows: { ...answers.windows, [day]: value } })}
            />
          </Block>
        ))
      ) : (
        <HoursPicker value={answers.windows[answers.days[0]] ?? []} onChange={setAllHours} />
      )}
    </>,
    // 9
    <>
      <Tiles
        options={[
          { value: false, label: "Nein, alles jederzeit" },
          { value: true, label: "Ja" },
        ]}
        value={answers.restrict}
        onChange={(v) => setSchedule({ restrict: v })}
      />
      {answers.restrict &&
        perService((service) => (
          <Tiles
            options={restrictionOptions}
            value={service.restriction}
            onChange={(v) => {
              setAnswers({
                ...answers,
                scheduleTouched: true,
                services: answers.services.map((sv) => (sv.slug === service.slug ? { ...sv, restriction: v } : sv)),
              });
            }}
          />
        ))}
    </>,
    // 10
    <Tiles options={MAX_PER_DAY} value={answers.maxPerDay} onChange={(v) => set({ maxPerDay: v })} custom={String} />,
    // 11
    <Tiles
      options={HORIZON}
      value={answers.horizonDays}
      onChange={(v) => set({ horizonDays: v })}
      custom={(v) => `${v} Tage`}
    />,
    // 12
    changes.length === 0 ? (
      <Text type="body">Dein Plan bleibt, wie er ist.</Text>
    ) : (
      (["neu", "geändert", "deaktiviert", "entfällt"] as const).map((kind) => {
        const group = changes.filter((c) => c.kind === kind);
        return (
          group.length > 0 && (
            <Block key={kind} title={KIND_LABEL[kind]}>
              <ul {...stylex.props(s.list)}>
                {group.map((c) => (
                  <li key={c.text}><Text type="body">{c.text}</Text></li>
                ))}
              </ul>
            </Block>
          )
        );
      })
    ),
  ];

  const hints = changes.filter((change) => STEPS[step].fields.includes(change.field));
  const blocked =
    (step === 0 && answers.services.length === 0) ||
    (step === 6 && answers.days.length === 0) ||
    (step === 1 && answers.services.some((sv) => sv.durationMin < 5));

  const handleApply = async () => {
    setSaving(true);
    setError("");
    try {
      await applyPlan(planFromAnswers(answers, current));
      await refresh();
      toast.success("Dein Terminplan ist übernommen");
      navigate("/appointments/availability");
    } catch (err) {
      // Antworten bleiben stehen — der Server hat nichts verändert
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Geführt einrichten" subtitle={`Frage ${step + 1} von ${STEPS.length}`}>
      <div {...stylex.props(s.column)}>
        <ProgressBar label="Fortschritt" isLabelHidden value={step + 1} max={STEPS.length} />
        <Heading level={5} data-testid="interview-schritt">{STEPS[step].title}</Heading>

        {questions[step]}

        {step === 1 && answers.services.some((sv) => sv.durationMin < 5) && (
          <Banner status="warning" title="Die Dauer muss mindestens 5 Minuten betragen." />
        )}

        {step !== SUMMARY && hints.length > 0 && (
          <div data-testid="interview-aenderungen">
            <Banner status="info" title="Das ändert sich an deinem Plan">
              <ul {...stylex.props(s.list)}>
                {hints.map((c) => (
                  <li key={c.text}><Text type="body">{c.text}</Text></li>
                ))}
              </ul>
            </Banner>
          </div>
        )}

        {error && <Banner status="error" title="Nicht übernommen" description={error} />}

        <div {...stylex.props(s.actions)}>
          <Button
            variant="ghost"
            label={step === 0 ? "Abbrechen" : "Zurück"}
            onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
          />
          {step === SUMMARY ? (
            <Button
              data-testid="interview-uebernehmen"
              label="Plan übernehmen"
              isLoading={saving}
              onClick={() => void handleApply()}
            />
          ) : (
            <Button
              data-testid="interview-weiter"
              label="Weiter"
              isDisabled={blocked}
              onClick={() => setStep(step + 1)}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
```

Falls `Heading` oder `Button` kein `data-testid` durchreichen, prüf das in `node_modules/@astryxdesign/core/src/<Komponente>/<Komponente>.tsx` (`...rest`/`data-testid` in den Props). Reichen sie es nicht durch, leg ein `<div data-testid=…>` darum.

- [ ] **Step 2: Route eintragen**

`src/App.tsx`: Import neben den anderen Admin-Seiten ergänzen, `import AppointmentSetupPage from "./pages/admin/AppointmentSetupPage";`. Dann vor Zeile 177 (`appointments/types`):

```tsx
                  <Route path="appointments/setup" element={<AppointmentSetupPage />} />
```

Wenn die anderen Admin-Seiten dort `lazy(() => import(...))` verwenden, das Muster übernehmen.

- [ ] **Step 3: Einstieg auf den Formularseiten**

`AppointmentTypesPage.tsx`: `import { useNavigate } from "react-router-dom";` und `import { Wand2 } from "lucide-react";` (in den bestehenden lucide-Import aufnehmen). Im Komponentenrumpf `const navigate = useNavigate();`. `actions` ersetzen durch:

```tsx
      actions={
        !draft && (
          <>
            <Button
              variant="secondary"
              icon={<Wand2 />}
              label="Geführt einrichten"
              onClick={() => navigate("/appointments/setup")}
            />
            <Button icon={<Plus />} label="Neue Art" onClick={() => setDraft({ ...EMPTY })} />
          </>
        )
      }
```

Im `EmptyState` der Arten ergänzen:

```tsx
            action={{ label: "Geführt einrichten", icon: <Wand2 />, onClick: () => navigate("/appointments/setup") }}
```

`AvailabilityPage.tsx`: dieselben Importe und `navigate`. Bei `<Page title="Verfügbarkeit" …>` ergänzen:

```tsx
      actions={
        <Button
          variant="secondary"
          icon={<Wand2 />}
          label="Geführt einrichten"
          onClick={() => navigate("/appointments/setup")}
        />
      }
```

Im `EmptyState` „Noch keine Zeitfenster“ dasselbe `action` wie oben.

- [ ] **Step 4: Doku**

In `docs/terminbuchung.md` am Ende von §11.1 anhängen:

```markdown
**Geführt einrichten** (`/appointments/setup`, seit 2026-09-30): ein Interview
mit einer Frage pro Bildschirm, das Arten, aktive Wochenfenster und die
Grenzen „pro Tag“ und „im Voraus“ **ersetzt**. Arten werden über den
Kurz-Link zugeordnet und nie gelöscht, nur deaktiviert; inaktive Fenster und
Ausnahmen bleiben unberührt. Gespeichert wird in einer Transaktion über
`POST /api/custom/booking/apply-plan`. Details:
`docs/superpowers/specs/2026-09-30-termin-interview-design.md`.
```

- [ ] **Step 5: Typprüfung, Lint, Unit-Tests**

Run: `npx tsc --noEmit -p . && npx eslint src/pages/admin/AppointmentSetupPage.tsx src/pages/admin/AppointmentTypesPage.tsx src/pages/admin/AvailabilityPage.tsx && npm test`
Expected: keine Fehler, alle Tests PASS.

- [ ] **Step 6: Im Browser ansehen**

`npm run dev` (Vite) gegen die Dev-Instanz, als Admin anmelden, `/appointments/setup` öffnen. Prüfen:
1. Frage 1 zeigt die bestehenden Arten gewählt.
2. Dauer einer Art ändern: Der Hinweis „… : 90 Min → 60 Min“ erscheint.
3. Bei Frage 7 Sonntag dazunehmen: Der Hinweis „So … “ erscheint als neu.
4. Die Zusammenfassung listet beides.
5. Bei 390 px Breite schiebt nichts die Seite seitlich auf.

Nicht übernehmen, das macht Task 5.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AppointmentSetupPage.tsx src/App.tsx src/pages/admin/AppointmentTypesPage.tsx src/pages/admin/AvailabilityPage.tsx docs/terminbuchung.md
git commit -m "Termin-Interview: Assistent unter /appointments/setup"
```

---

### Task 5: Durchlauf im Browser (Playwright)

**Files:**
- Create: `e2e/tests/einstellungen/termin-interview.spec.ts`

**Interfaces:**
- Consumes: Test-IDs aus Task 4; `test`, `expect`, `DEMO_ADMIN` aus `e2e/support/fixtures`; `PbAdmin`, `einstellungenSichern`/`einstellungenWiederherstellen`.

Warum im Projekt `einstellungen`: Der Test schreibt auf den Settings-Singleton und ersetzt alle aktiven Fenster, also globalen Zustand. Das Projekt läuft zuletzt und seriell (`e2e/README.md`). Arten und Fenster sichert der Test selbst und stellt sie danach wieder her.

- [ ] **Step 1: Test schreiben**

```ts
// Workflow: Fotograf richtet den Terminkalender im Interview ein.
//
// Ersetzt Fenster und schreibt auf den Settings-Record — deshalb im Projekt
// "einstellungen": zuletzt und seriell. Arten und Fenster werden vorher
// gesichert und danach zurückgeschrieben.

import { test, expect, DEMO_ADMIN } from "../../support/fixtures";
import { einstellungenSichern, einstellungenWiederherstellen } from "../../support/settings";
import { PbAdmin, PbRecord } from "../../support/pb";

test.describe.configure({ mode: "serial" });

let typesBefore: PbRecord[] = [];
let rulesBefore: PbRecord[] = [];

test.beforeAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenSichern(pb);
  typesBefore = await pb.list("appointmentTypes");
  rulesBefore = await pb.list("availabilityRules");
});

test.afterAll(async () => {
  const pb = new PbAdmin();
  await pb.login();
  await einstellungenWiederherstellen(pb);
  for (const rule of await pb.list("availabilityRules")) await pb.delete("availabilityRules", rule.id);
  for (const rule of rulesBefore) {
    const { id: _id, collectionId: _c, collectionName: _n, created: _cr, updated: _u, ...data } = rule;
    await pb.create("availabilityRules", data);
  }
  for (const type of await pb.list("appointmentTypes")) {
    const before = typesBefore.find((t) => t.id === type.id);
    if (before) {
      const { id: _id, collectionId: _c, collectionName: _n, created: _cr, updated: _u, ...data } = before;
      await pb.update("appointmentTypes", type.id, data);
    } else {
      await pb.delete("appointmentTypes", type.id);
    }
  }
});

test("Interview legt Leistung und Arbeitszeit an und zeigt Änderungen vorher an", async ({ page, pb, anmelden }) => {
  await anmelden(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.goto("/appointments/setup");
  const schritt = page.getByTestId("interview-schritt");
  const weiter = page.getByTestId("interview-weiter");

  // Frage 1: eine eigene Leistung dazu
  await expect(schritt).toHaveText("Was können Kund:innen bei dir buchen?");
  await page.getByLabel("Eigene Leistung").fill("E2E Newborn");
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(page.getByTestId("interview-aenderungen")).toContainText("„E2E Newborn“ wird neu angelegt");

  // Fragen 2–6 mit Vorbelegung durchklicken
  for (let i = 0; i < 6; i++) await weiter.click();

  // Frage 7: nur Samstag
  await expect(schritt).toHaveText("An welchen Tagen arbeitest du?");
  for (const tag of ["Mo", "Di", "Mi", "Do", "Fr", "So"]) {
    const kachel = page.getByRole("checkbox", { name: tag, exact: true });
    if (await kachel.isChecked()) await kachel.click({ force: true });
  }
  const samstag = page.getByRole("checkbox", { name: "Sa", exact: true });
  if (!(await samstag.isChecked())) await samstag.click({ force: true });
  await weiter.click();

  // Frage 8: vormittags
  await page.getByRole("checkbox", { name: "Vormittags 9–13" }).click({ force: true });
  await expect(page.getByTestId("interview-aenderungen")).toContainText("Sa 09:00 – 13:00");

  // bis zur Zusammenfassung
  for (let i = 0; i < 4; i++) await weiter.click();
  await expect(schritt).toHaveText("Das ändert sich");
  await expect(page.getByText("„E2E Newborn“ wird neu angelegt")).toBeVisible();

  await page.getByTestId("interview-uebernehmen").click();
  await expect(page).toHaveURL(/\/appointments\/availability$/);

  const newborn = await pb.list("appointmentTypes", 'slug = "e2e-newborn"');
  expect(newborn).toHaveLength(1);
  expect(newborn[0].active).toBe(true);
  const rules = await pb.list("availabilityRules", "active = true");
  expect(rules.map((r) => [r.weekday, r.startMinute, r.endMinute])).toEqual([[6, 540, 780]]);
});
```

Vorab prüfen, dass `PbAdmin` die Methoden `create(collection, data)` und `update(collection, id, data)` hat (`e2e/support/pb.ts`). `update` benutzt `einrichtung.spec.ts` bereits. Fehlt `create`, ergänze es neben `delete` nach demselben Muster:

```ts
  create(collection: string, data: Record<string, unknown>): Promise<PbRecord> {
    return this.request(`/api/collections/${collection}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }
```

Rendert `SelectableCard` keine `checkbox`-Rolle, im Browser mit `page.getByText("Sa", { exact: true })` arbeiten und die Rolle in `SelectableCard.tsx` nachsehen.

- [ ] **Step 2: Instanz neu bauen und Test laufen lassen**

```bash
docker compose -p albumwerk-dev -f docker-compose.dev.yml up -d --build
make e2e ARGS="--project=einstellungen termin-interview"
```
Expected: PASS. Danach bestätigen, dass der alte Zustand zurück ist: `/appointments/types` und `/appointments/availability` zeigen wieder dasselbe wie vor dem Lauf.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/einstellungen/termin-interview.spec.ts e2e/support/pb.ts
git commit -m "Termin-Interview: Durchlauf im Browser"
```
