// Termin-Interview: Antworten ⇄ Plan ⇄ Änderungen
// (docs/superpowers/specs/2026-09-30-termin-interview-design.md).
//
// Reine Logik, kein React, kein PocketBase. Der Assistent hält nur `Answers`
// im State; Plan und Änderungsliste werden bei jedem Klick neu abgeleitet.
//
// Ein „Plan" ist die Konfiguration in einer Form, die sich vergleichen lässt:
// Fenster verweisen über Slugs statt IDs auf Arten, weil neue Arten noch
// keine ID haben. Der Server übersetzt beim Speichern zurück.

import type { AppointmentType, AvailabilityRule } from "./api";
import { slugify } from "../../utils/slug";
import { formatWindow } from "../Booking/time";

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

/** „Abends" beginnt um 17 Uhr. */
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
// „all" angezeigt; wirksam wird es erst, wenn die Zeitfragen angefasst werden.
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
    const label = `„${type.name}"`;
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
      changes.push({ field: "service", kind: "geändert", text: `„${before.name}" heißt jetzt ${label}` });
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

  // Namen für „(nur …)": neue Namen vor alten, damit Umbenennungen stimmen
  const names = new Map([...old.types, ...next.types].map((type) => [type.slug, type.name]));
  const key = (rule: PlanRule) =>
    `${rule.weekday}|${rule.startMinute}|${rule.endMinute}|${rule.allowedSlugs.join(",")}`;
  const describe = (rule: PlanRule) => {
    const only = rule.allowedSlugs.map((slug) => `„${names.get(slug) ?? slug}"`).join(", ");
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
