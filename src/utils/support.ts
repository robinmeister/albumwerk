// Shared labels and data access for the support pages
// (src/pages/user/SupportPage.tsx, src/pages/admin/AdminSupportPage.tsx).
// Backend: pb_hooks/support.pb.js, schema pb_migrations/1784600008_support.js.

import { pb } from "../config/pocketbase";
import { AppErrorEntry, APP_VERSION } from "./errorReport";
import {
  SupportCategory,
  SupportMessage,
  SupportStatus,
  SupportTicket,
} from "./types";

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  technical: "Technisches Problem mit der App",
  album: "Album / Bilder",
  order: "Bestellung",
  billing: "Zahlung",
  other: "Sonstiges",
};

export const STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Offen",
  waiting: "Wartet auf dich",
  resolved: "Erledigt",
  closed: "Geschlossen",
};

export const CATEGORY_OPTIONS = (
  Object.keys(CATEGORY_LABELS) as SupportCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));

// The exact payload attached to a ticket — shown to the reporter before they
// consent, so "was wird übertragen" is never a black box.
export interface SupportContext {
  errorMessage: string;
  errorStack: string;
  componentStack: string;
  route: string;
  occurredAt: string;
  userAgent: string;
  viewport: string;
  appVersion: string;
}

export function buildSupportContext(entry: AppErrorEntry): SupportContext {
  return {
    errorMessage: entry.message,
    errorStack: entry.stack,
    componentStack: entry.componentStack,
    route: entry.route,
    occurredAt: entry.at,
    userAgent: entry.userAgent,
    viewport: entry.viewport,
    appVersion: entry.appVersion,
  };
}

// Environment only — used when someone reports a technical problem that did not
// crash the app, so the report still says which build/browser it happened on.
export function buildEnvironmentContext(): SupportContext {
  return {
    errorMessage: "",
    errorStack: "",
    componentStack: "",
    route: `${window.location.pathname}${window.location.search}`,
    occurredAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    appVersion: APP_VERSION,
  };
}

// API rules scope the result to the caller: customers see their own tickets,
// admins see all of them (pb_migrations/1784600008_support.js).
export async function fetchTickets(
  options: { expandUser?: boolean } = {},
): Promise<SupportTicket[]> {
  const records = await pb.collection("supportTickets").getFullList({
    sort: "-lastMessageAt",
    requestKey: null,
    ...(options.expandUser ? { expand: "userId" } : {}),
  });
  return records as unknown as SupportTicket[];
}

// Ein einzelnes Ticket nachladen. Gebraucht direkt nach dem Anlegen: ob die
// Weiterleitung an den Hersteller geklappt hat, steht erst danach im Datensatz
// (pb_hooks/support.pb.js leitet beim Anlegen der ersten Nachricht weiter).
export async function fetchTicket(ticketId: string): Promise<SupportTicket> {
  const record = await pb.collection("supportTickets").getOne(ticketId, { requestKey: null });
  return record as unknown as SupportTicket;
}

export async function fetchMessages(ticketId: string): Promise<SupportMessage[]> {
  const records = await pb.collection("supportMessages").getFullList({
    filter: pb.filter("ticketId = {:ticketId}", { ticketId }),
    sort: "created",
    requestKey: null,
  });
  return records as unknown as SupportMessage[];
}

export async function createTicket(input: {
  subject: string;
  category: SupportCategory;
  body: string;
  context: SupportContext | null;
  consentForward: boolean;
}): Promise<SupportTicket> {
  // target/status/forwardState are set server-side; userId must match the
  // caller for the create rule to pass.
  const ticket = (await pb.collection("supportTickets").create({
    userId: pb.authStore.model?.id,
    subject: input.subject,
    category: input.category,
    context: input.context,
    consentForward: input.consentForward,
  })) as unknown as SupportTicket;

  await pb.collection("supportMessages").create({
    ticketId: ticket.id,
    body: input.body,
  });
  return ticket;
}

export async function replyToTicket(ticketId: string, body: string): Promise<void> {
  await pb.collection("supportMessages").create({ ticketId, body });
}

// Not a plain record update: supportTickets.updateRule is admin-only so the
// routing/forwarding fields stay server-owned (pb_hooks/support.pb.js).
export async function setTicketStatus(
  ticketId: string,
  status: SupportStatus,
): Promise<void> {
  await pb.send("/api/custom/support/status", {
    method: "POST",
    body: { ticketId, status },
    requestKey: null,
  });
}

// Clears the caller's unread marker on a ticket; failures are irrelevant to the
// user, so they stay silent.
export async function markTicketSeen(ticketId: string): Promise<void> {
  try {
    await pb.send("/api/custom/support/seen", {
      method: "POST",
      body: { ticketId },
      requestKey: null,
    });
  } catch {
    // a stale badge is not worth an error toast
  }
}

// Wie viele Tickets eine ungelesene Nachricht fuer den Anrufer haben. Die
// Marker setzt pb_hooks/support.pb.js beim Eingang und loescht sie, sobald der
// Verlauf geoeffnet wurde. Die API-Regeln begrenzen die Zaehlung ohnehin auf
// das, was der Anrufer sehen darf: Kundschaft nur die eigenen Tickets.
export async function countUnread(isAdmin: boolean): Promise<number> {
  const list = await pb.collection("supportTickets").getList(1, 1, {
    filter: isAdmin ? "unreadForAdmin = true" : "unreadForUser = true",
    fields: "id",
    requestKey: null,
  });
  return list.totalItems;
}

// Realtime. PocketBase liefert nur Ereignisse zu Datensaetzen, die der Anrufer
// lesen darf, die Rechte liegen also weiter beim Server.
//
// Pro Collection gibt es genau EIN Abo fuer die Lebensdauer der Seite, und die
// Komponenten haengen sich in eine Zuhoererliste. Das ist nicht Sparsamkeit:
// pb.subscribe() liefert seine Abmeldefunktion erst spaeter, und wer in
// schneller Folge an- und abmeldet, verliert Abos im SDK. Genau das tut React
// beim Mounten (StrictMode) und beim Rollenwechsel der Seitenleiste — der
// Zaehler stand danach still, obwohl die Verbindung aufgebaut war. Ein festes
// Abo kennt dieses Wettrennen nicht.
type SupportEvent = { action: string; record: unknown };

function beobachter(collection: string) {
  const zuhoerer = new Set<(event: SupportEvent) => void>();
  let gestartet = false;

  return (handler: (event: SupportEvent) => void): (() => void) => {
    zuhoerer.add(handler);
    if (!gestartet) {
      gestartet = true;
      pb.collection(collection)
        .subscribe("*", (event: SupportEvent) => {
          zuhoerer.forEach((f) => f(event));
        })
        // Ohne Realtime bleibt alles benutzbar, es aktualisiert sich dann eben
        // erst beim naechsten Laden. Beim naechsten Zuhoerer neu versuchen.
        .catch(() => { gestartet = false; });
    }
    return () => { zuhoerer.delete(handler); };
  };
}

const ticketBeobachter = beobachter("supportTickets");
const nachrichtenBeobachter = beobachter("supportMessages");

export function watchTickets(onChange: () => void): () => void {
  return ticketBeobachter(() => onChange());
}

// Nachrichten eines offenen Verlaufs. Gefiltert wird beim Empfaenger statt
// serverseitig: es geht um ein paar Nachrichten pro Ticket.
export function watchMessages(
  ticketId: string,
  onMessage: (message: SupportMessage) => void,
): () => void {
  return nachrichtenBeobachter((event) => {
    const message = event.record as SupportMessage;
    if (event.action === "create" && message?.ticketId === ticketId) onMessage(message);
  });
}

// Admin-only: hand a ticket to the vendor (pb_hooks/support.pb.js).
export async function forwardTicket(ticketId: string, note: string): Promise<void> {
  await pb.send("/api/custom/support/forward", {
    method: "POST",
    body: { ticketId, note },
    requestKey: null,
  });
}

// Whether this instance can reach the vendor at all — false on self-hosted
// setups without SAAS_CONTROL_URL / VENDOR_SUPPORT_EMAIL.
export async function fetchVendorForwarding(): Promise<boolean> {
  try {
    // requestKey: null — StrictMode mounts the page twice and the SDK would
    // auto-cancel the first, identical request
    const res = await pb.send("/api/custom/support/config", {
      method: "GET",
      requestKey: null,
    });
    return Boolean((res as { vendorForwarding?: boolean }).vendorForwarding);
  } catch {
    return false;
  }
}

export function formatDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
