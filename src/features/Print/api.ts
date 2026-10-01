import { pb } from "../../config/pocketbase";

// Spiegel der Sammlung printJobs (pb_migrations/1785900001_druckauftraege.js)
export type PrintStatus =
  | "awaiting_approval" | "submitted" | "in_production" | "shipped"
  | "delivered_to_customer" | "cancelled" | "failed";
export type PrintRoute = "customer" | "studio";

export interface PrintRecipient {
  name: string; email: string; phone: string; line1: string;
  postalCode: string; city: string; state: string; countryCode: string;
}

export interface PrintItem { image: string; sku: string; copies: number; originalId: string }

export interface PrintJob {
  id: string;
  created: string;
  orderId: string;
  route: PrintRoute;
  recipient: PrintRecipient;
  items: PrintItem[];
  status: PrintStatus;
  labOrderId: string;
  trackingUrl: string;
  trackingNumber: string;
  labCost: string;
  error: string;
}

export const STATUS_TEXTE: Record<PrintStatus, { label: string; variant: "info" | "neutral" | "success" | "warning" | "error" }> = {
  awaiting_approval: { label: "Wartet auf Freigabe", variant: "warning" },
  submitted: { label: "Beim Labor", variant: "info" },
  in_production: { label: "In Produktion", variant: "info" },
  shipped: { label: "Versendet", variant: "success" },
  delivered_to_customer: { label: "An Kund:in versendet", variant: "success" },
  cancelled: { label: "Storniert", variant: "neutral" },
  failed: { label: "Fehlgeschlagen", variant: "error" },
};

export async function listJobs(): Promise<PrintJob[]> {
  return pb.collection("printJobs").getFullList<PrintJob>({ sort: "-created", requestKey: null });
}

export async function setRoute(id: string, route: PrintRoute): Promise<void> {
  await pb.collection("printJobs").update(id, { route });
}

async function action(id: string, name: "submit" | "cancel" | "delivered", body: object = {}): Promise<void> {
  await pb.send(`/api/custom/print/${id}/${name}`, { method: "POST", body });
}

export const submitJob = (id: string) => action(id, "submit");
export const cancelJob = (id: string) => action(id, "cancel");
export const markDelivered = (id: string, trackingNumber: string, trackingUrl: string) =>
  action(id, "delivered", { trackingNumber, trackingUrl });

export async function saveProdigiKey(apiKey: string, live: boolean): Promise<{ enabled: boolean; live: boolean }> {
  return pb.send("/api/custom/prodigi/config", { method: "POST", body: { apiKey, live } });
}
