// Datenzugriff für das Termin-Admin-UI (docs/terminbuchung.md §11.1).
//
// Zwei Wege, bewusst getrennt:
//
//   - Stammdaten (Arten, Regeln, Ausnahmen) laufen über die
//     Collection-API. Sie sind admin-only lesbar und schreibbar, die
//     API-Regeln der Migration erledigen die Zugriffskontrolle.
//   - Alles, was den Zustand einer Buchung ändert, läuft über die eigenen
//     Endpunkte aus pb_hooks/booking.pb.js. Dort hängen Kollisionsprüfung,
//     Statuslogik und Mailversand dran — eine direkte Änderung am Datensatz
//     würde sie umgehen.
//
// Die einzige Ausnahme ist das Verknüpfen mit einem Kundenkonto: Das berührt
// weder Zeit noch Status und ist ein reines Schreiben eines Feldes.

import { pb } from "../../config/pocketbase";
import type { Plan } from "./interview";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "declined"
  | "expired";

export type PhoneMode = "off" | "optional" | "required";

export interface AppointmentType {
  id: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  durationMin: number;
  bufferMin: number;
  startIntervalMin: number;
  leadTimeMin: number;
  requiresApproval: boolean;
  phoneMode: PhoneMode;
  price: number;
  active: boolean;
  sort: number;
}

export interface Appointment {
  id: string;
  type: string;
  typeName: string;
  start: string;
  end: string;
  startMs: number;
  endMs: number;
  durationMin: number;
  status: AppointmentStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  user: string;
  source: string;
  expiresAt: string;
  cancelReason: string;
}

export interface AvailabilityRule {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  allowedTypes: string[];
  active: boolean;
}

export interface AvailabilityException {
  id: string;
  kind: "block" | "open";
  start: string;
  end: string;
  startMs: number;
  endMs: number;
  note: string;
  allowedTypes: string[];
  source: string;
  feedRef: string;
}

// PocketBase liefert Datumsfelder als "2026-08-15 07:00:00.000Z".
function toMs(value: string): number {
  if (!value) return 0;
  const parsed = new Date(String(value).replace(" ", "T"));
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** Millisekunden → das Format, das die Collection-API erwartet. */
function toPbDate(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ");
}

// --- Termin-Arten ----------------------------------------------------------

export async function fetchTypes(includeInactive = true): Promise<AppointmentType[]> {
  const records = await pb.collection("appointmentTypes").getFullList({
    sort: "sort,name",
    requestKey: null,
  });
  return records
    .map((record) => ({
      id: record.id,
      name: record.name ?? "",
      slug: record.slug ?? "",
      description: record.description ?? "",
      location: record.location ?? "",
      durationMin: Number(record.durationMin) || 0,
      bufferMin: Number(record.bufferMin) || 0,
      startIntervalMin: Number(record.startIntervalMin) || 0,
      leadTimeMin: Number(record.leadTimeMin) || 0,
      requiresApproval: Boolean(record.requiresApproval),
      phoneMode: (record.phoneMode || "optional") as PhoneMode,
      price: Number(record.price) || 0,
      active: Boolean(record.active),
      sort: Number(record.sort) || 0,
    }))
    .filter((type) => includeInactive || type.active);
}

export type AppointmentTypeInput = Omit<AppointmentType, "id"> & { id?: string };

export async function saveType(input: AppointmentTypeInput): Promise<void> {
  const data = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    location: input.location,
    durationMin: input.durationMin,
    bufferMin: input.bufferMin,
    // leer speichern statt 0: der Server liest "leer" als "Dauer + Puffer"
    startIntervalMin: input.startIntervalMin || null,
    leadTimeMin: input.leadTimeMin,
    requiresApproval: input.requiresApproval,
    phoneMode: input.phoneMode,
    price: input.price,
    active: input.active,
    sort: input.sort,
  };
  if (input.id) {
    await pb.collection("appointmentTypes").update(input.id, data);
  } else {
    await pb.collection("appointmentTypes").create(data);
  }
}

export async function deleteType(id: string): Promise<void> {
  await pb.collection("appointmentTypes").delete(id);
}

// --- Regeln ----------------------------------------------------------------

export async function fetchRules(): Promise<AvailabilityRule[]> {
  const records = await pb.collection("availabilityRules").getFullList({
    sort: "weekday,startMinute",
    requestKey: null,
  });
  return records.map((record) => ({
    id: record.id,
    weekday: Number(record.weekday) || 1,
    startMinute: Number(record.startMinute) || 0,
    endMinute: Number(record.endMinute) || 0,
    allowedTypes: Array.isArray(record.allowedTypes) ? record.allowedTypes : [],
    active: Boolean(record.active),
  }));
}

export type AvailabilityRuleInput = Omit<AvailabilityRule, "id"> & { id?: string };

export async function saveRule(input: AvailabilityRuleInput): Promise<void> {
  const data = {
    weekday: input.weekday,
    startMinute: input.startMinute,
    endMinute: input.endMinute,
    allowedTypes: input.allowedTypes,
    active: input.active,
  };
  if (input.id) {
    await pb.collection("availabilityRules").update(input.id, data);
  } else {
    await pb.collection("availabilityRules").create(data);
  }
}

export async function deleteRule(id: string): Promise<void> {
  await pb.collection("availabilityRules").delete(id);
}

// --- Ausnahmen -------------------------------------------------------------

export async function fetchExceptions(
  fromMs: number,
  toMs_: number,
): Promise<AvailabilityException[]> {
  const records = await pb.collection("availabilityExceptions").getFullList({
    filter: pb.filter("end > {:from} && start < {:to}", {
      from: toPbDate(fromMs),
      to: toPbDate(toMs_),
    }),
    sort: "start",
    requestKey: null,
  });
  return records.map((record) => ({
    id: record.id,
    kind: record.kind === "open" ? "open" : "block",
    start: record.start ?? "",
    end: record.end ?? "",
    startMs: toMs(record.start),
    endMs: toMs(record.end),
    note: record.note ?? "",
    allowedTypes: Array.isArray(record.allowedTypes) ? record.allowedTypes : [],
    source: record.source ?? "manual",
    feedRef: record.feedRef ?? "",
  }));
}

export async function createException(input: {
  kind: "block" | "open";
  startMs: number;
  endMs: number;
  note?: string;
  allowedTypes?: string[];
}): Promise<void> {
  await pb.collection("availabilityExceptions").create({
    kind: input.kind,
    start: toPbDate(input.startMs),
    end: toPbDate(input.endMs),
    note: input.note ?? "",
    allowedTypes: input.allowedTypes ?? [],
    // handgepflegt — der spätere Kalender-Import (Etappe 5) fasst nur seine
    // eigenen Einträge an
    source: "manual",
  });
}

export async function deleteException(id: string): Promise<void> {
  await pb.collection("availabilityExceptions").delete(id);
}

// --- Termine ---------------------------------------------------------------

function toAppointment(record: Record<string, unknown>): Appointment {
  const start = String(record.start ?? "");
  const end = String(record.end ?? "");
  return {
    id: String(record.id ?? ""),
    type: String(record.type ?? ""),
    typeName: String(record.typeName ?? ""),
    start,
    end,
    startMs: toMs(start),
    endMs: toMs(end),
    durationMin: Number(record.durationMin) || 0,
    status: (record.status || "confirmed") as AppointmentStatus,
    customerName: String(record.customerName ?? ""),
    customerEmail: String(record.customerEmail ?? ""),
    customerPhone: String(record.customerPhone ?? ""),
    message: String(record.message ?? ""),
    user: String(record.user ?? ""),
    source: String(record.source ?? ""),
    expiresAt: String(record.expiresAt ?? ""),
    cancelReason: String(record.cancelReason ?? ""),
  };
}

export async function fetchAppointments(
  fromMs: number,
  toMs_: number,
): Promise<Appointment[]> {
  const records = await pb.collection("appointments").getFullList({
    filter: pb.filter("start >= {:from} && start < {:to}", {
      from: toPbDate(fromMs),
      to: toPbDate(toMs_),
    }),
    sort: "start",
    requestKey: null,
  });
  return records.map((record) => toAppointment(record as unknown as Record<string, unknown>));
}

/**
 * Offene Anfragen, unabhängig vom angezeigten Monat.
 *
 * Sie werden in der Oberfläche oben angepinnt: Eine Anfrage verfällt nach
 * Ablauf ihrer Frist, und das darf nicht passieren, nur weil gerade der
 * falsche Monat offen war (docs/terminbuchung.md §11.1).
 */
export async function fetchPending(): Promise<Appointment[]> {
  const records = await pb.collection("appointments").getFullList({
    filter: 'status = "pending"',
    sort: "start",
    requestKey: null,
  });
  return records.map((record) => toAppointment(record as unknown as Record<string, unknown>));
}

// --- Zustandsänderungen (immer über die eigenen Endpunkte) ------------------

export async function decideRequest(
  id: string,
  approve: boolean,
  note?: string,
): Promise<void> {
  await pb.send("/api/custom/booking/decide", {
    method: "POST",
    body: { id, approve, note: note ?? "" },
  });
}

export async function cancelAsOwner(id: string, note?: string): Promise<void> {
  await pb.send("/api/custom/booking/owner-cancel", {
    method: "POST",
    body: { id, note: note ?? "" },
  });
}

interface ManualBookingInput {
  type: string;
  startMs: number;
  durationMin?: number;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  notify?: boolean;
  force?: boolean;
}

/** Fehler mit Zusatzangaben aus der Antwort des Endpunkts. */
export interface BookingApiError extends Error {
  code?: string;
  conflictStart?: string;
}

function apiError(error: unknown): BookingApiError {
  // Der PocketBase-Client verpackt die Antwort in `response`.
  const response = (error as { response?: Record<string, unknown> })?.response ?? {};
  const wrapped: BookingApiError = new Error(
    String(response.message ?? "Die Aktion ist fehlgeschlagen."),
  );
  if (typeof response.code === "string") wrapped.code = response.code;
  const conflict = response.conflict as { start?: string } | undefined;
  if (conflict?.start) wrapped.conflictStart = conflict.start;
  return wrapped;
}

export async function createManualBooking(input: ManualBookingInput): Promise<void> {
  try {
    await pb.send("/api/custom/booking/manual", {
      method: "POST",
      body: {
        type: input.type,
        start: toPbDate(input.startMs),
        durationMin: input.durationMin,
        name: input.name ?? "",
        email: input.email ?? "",
        phone: input.phone ?? "",
        message: input.message ?? "",
        notify: input.notify !== false,
        force: Boolean(input.force),
      },
    });
  } catch (error) {
    throw apiError(error);
  }
}

// --- Kontoverknüpfung ------------------------------------------------------

/**
 * Sucht ein Kundenkonto zur E-Mail-Adresse einer Buchung.
 *
 * Das Ergebnis ist ausdrücklich nur ein VORSCHLAG. Die Adresse im
 * Buchungsformular ist unverifiziert — automatisch zu verknüpfen hieße, eine
 * fremde Buchung an ein echtes Konto zu hängen (docs/terminbuchung.md §1).
 * Verknüpft wird erst durch den bewussten Klick der Fotograf:in.
 */
export async function findAccountByEmail(
  email: string,
): Promise<{ id: string; name: string; email: string } | null> {
  if (!email) return null;
  try {
    const record = await pb.collection("users").getFirstListItem(
      pb.filter("email = {:email}", { email }),
      { requestKey: null },
    );
    const name = [record.firstName, record.lastName].filter(Boolean).join(" ");
    return { id: record.id, name: name || record.email, email: record.email };
  } catch {
    // kein Konto mit dieser Adresse — der Normalfall bei Laufkundschaft
    return null;
  }
}

export async function linkAccount(appointmentId: string, userId: string): Promise<void> {
  await pb.collection("appointments").update(appointmentId, { user: userId });
}

// --- Termin-Interview ------------------------------------------------------

/** Ersetzt Arten, aktive Fenster und Grenzen in einer Transaktion. */
export async function applyPlan(plan: Plan): Promise<void> {
  try {
    await pb.send("/api/custom/booking/apply-plan", { method: "POST", body: plan });
  } catch (error) {
    throw apiError(error);
  }
}
