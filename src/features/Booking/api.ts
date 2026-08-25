// Datenzugriff der Buchungsoberfläche (docs/terminbuchung.md §4.2).
//
// ====================== BINDENDE EINSCHRÄNKUNGEN ======================
// Wird vom Embed-Bundle geladen, das im iframe auf fremden Websites läuft:
//
//   1. KEIN PocketBase-SDK. Es legt einen Auth-Store in `localStorage` an und
//      schleppt Realtime, Datei-Helfer und Filter-Bau mit — beides ungewollt.
//      Hier reicht `fetch` gegen vier Endpunkte.
//   2. KEIN localStorage, KEINE Cookies. Damit stimmt die Aussage „für dieses
//      Formular braucht es keinen Cookie-Banner-Eintrag“ — das ist ein
//      Verkaufsargument gegenüber Calendly und nur so lange wahr, wie sich
//      niemand einen Zwischenspeicher hierher schreibt.
//   3. KEIN App-Kontext (Auth, Router, Settings-Provider).
//
// Die Basis-URL ist normalerweise leer (gleiche Herkunft, weil der iframe von
// der Instanz ausgeliefert wird). Sie ist nur konfigurierbar, damit die
// Oberfläche auch im Dev-Server gegen eine andere Instanz laufen kann.

let baseUrl = "";

export function setApiBase(url: string): void {
  baseUrl = url.replace(/\/+$/, "");
}

export interface BookingType {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  durationMin: number;
  price: number;
  phoneMode: "off" | "optional" | "required";
  requiresApproval: boolean;
}

export interface BookingBranding {
  businessName: string;
  primaryColor: string;
  currency: string;
  timezone: string;
  contactEmail: string;
  bookingEnabled: boolean;
}

export interface Slot {
  start: string;
  end: string;
  startMs: number;
}

export interface BookingError extends Error {
  code?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(baseUrl + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    // Kein `credentials: "include"` — die Buchung ist bewusst anonym, und im
    // iframe würden Cookies von Safari und Firefox ohnehin blockiert.
    credentials: "omit",
  });

  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (!response.ok) {
    const error: BookingError = new Error(
      String(body.message ?? "Das hat leider nicht geklappt. Bitte versuche es noch einmal."),
    );
    if (typeof body.code === "string") error.code = body.code;
    throw error;
  }
  return body as T;
}

// --- Stammdaten ------------------------------------------------------------

/**
 * Die buchbaren Leistungen. Kommen über die Collection-API, weil aktive
 * Termin-Arten öffentlich lesbar sind (Name, Dauer und Preis stehen ohnehin im
 * Formular). Regeln und Sperrzeiten sind es ausdrücklich NICHT — die gibt es
 * nur als fertig gerechnete Slot-Liste.
 */
export async function fetchTypes(): Promise<BookingType[]> {
  const data = await request<{ items?: Record<string, unknown>[] }>(
    "/api/collections/appointmentTypes/records?perPage=100&sort=sort,name&filter=" +
      encodeURIComponent("active=true"),
  );
  return (data.items ?? []).map((item) => ({
    id: String(item.id ?? ""),
    slug: String(item.slug ?? ""),
    name: String(item.name ?? ""),
    description: String(item.description ?? ""),
    location: String(item.location ?? ""),
    durationMin: Number(item.durationMin) || 0,
    price: Number(item.price) || 0,
    phoneMode: (item.phoneMode || "optional") as BookingType["phoneMode"],
    requiresApproval: Boolean(item.requiresApproval),
  }));
}

export async function fetchBranding(): Promise<BookingBranding> {
  const item = await request<Record<string, unknown>>(
    "/api/collections/settings/records/appsettings0001",
  );
  return {
    businessName: String(item.businessName ?? "") || "Termin buchen",
    primaryColor: String(item.primaryColor ?? "") || "#3d4a3d",
    currency: String(item.currency ?? "") || "EUR",
    timezone: String(item.timezone ?? "") || "Europe/Berlin",
    contactEmail: String(item.contactEmail ?? ""),
    bookingEnabled: Boolean(item.bookingEnabled),
  };
}

// --- Verfügbarkeit ---------------------------------------------------------

export interface AvailabilityResult {
  timezone: string;
  horizonDays: number;
  type: BookingType & { currency: string };
  slots: Slot[];
}

export async function fetchAvailability(
  type: string,
  from: string,
  to: string,
): Promise<AvailabilityResult> {
  const data = await request<{
    timezone: string;
    horizonDays: number;
    type: Record<string, unknown>;
    slots: { start: string; end: string }[];
  }>(
    `/api/custom/booking/availability?type=${encodeURIComponent(type)}` +
      `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return {
    timezone: data.timezone,
    horizonDays: data.horizonDays,
    type: {
      id: String(data.type.id ?? ""),
      slug: String(data.type.slug ?? ""),
      name: String(data.type.name ?? ""),
      description: String(data.type.description ?? ""),
      location: String(data.type.location ?? ""),
      durationMin: Number(data.type.durationMin) || 0,
      price: Number(data.type.price) || 0,
      phoneMode: (data.type.phoneMode || "optional") as BookingType["phoneMode"],
      requiresApproval: Boolean(data.type.requiresApproval),
      currency: String(data.type.currency ?? "EUR"),
    },
    slots: (data.slots ?? []).map((slot) => ({
      start: slot.start,
      end: slot.end,
      startMs: new Date(slot.start).getTime(),
    })),
  };
}

// --- Buchen ----------------------------------------------------------------

export interface BookingInput {
  type: string;
  start: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
  /** Honeypot: für Menschen unsichtbar. Gefüllt = Bot. */
  website: string;
  /** Zeitpunkt, zu dem das Formular erschien — gegen Sekundenschnell-Absender. */
  renderedAt: number;
}

export interface BookingResult {
  token: string;
  start: string;
  end: string;
  requiresApproval: boolean;
}

export async function book(input: BookingInput): Promise<BookingResult> {
  return request<BookingResult>("/api/custom/booking", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Termin verwalten (Token-Link aus der Mail) ----------------------------

export interface ManagedAppointment {
  start: string;
  end: string;
  startMs: number;
  durationMin: number;
  typeName: string;
  typeSlug: string;
  status: string;
  customerName: string;
}

export interface ManageResult {
  timezone: string;
  appointment: ManagedAppointment;
  changeable: boolean;
  cancelDeadlineHours: number;
  contactEmail: string;
}

export async function fetchAppointmentByToken(token: string): Promise<ManageResult> {
  const data = await request<{
    timezone: string;
    appointment: Record<string, unknown>;
    changeable: boolean;
    cancelDeadlineHours: number;
    contactEmail: string;
  }>(`/api/custom/booking/manage?token=${encodeURIComponent(token)}`);

  return {
    timezone: data.timezone,
    changeable: Boolean(data.changeable),
    cancelDeadlineHours: Number(data.cancelDeadlineHours) || 0,
    contactEmail: String(data.contactEmail ?? ""),
    appointment: {
      start: String(data.appointment.start ?? ""),
      end: String(data.appointment.end ?? ""),
      startMs: new Date(String(data.appointment.start ?? "")).getTime(),
      durationMin: Number(data.appointment.durationMin) || 0,
      typeName: String(data.appointment.typeName ?? ""),
      typeSlug: String(data.appointment.typeSlug ?? ""),
      status: String(data.appointment.status ?? ""),
      customerName: String(data.appointment.customerName ?? ""),
    },
  };
}

export async function cancelAppointment(token: string, reason: string): Promise<void> {
  await request("/api/custom/booking/cancel", {
    method: "POST",
    body: JSON.stringify({ token, action: "cancel", reason }),
  });
}

export async function rescheduleAppointment(token: string, start: string): Promise<void> {
  await request("/api/custom/booking/cancel", {
    method: "POST",
    body: JSON.stringify({ token, action: "reschedule", start }),
  });
}
