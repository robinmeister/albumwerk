import { TextInput } from "@astryxdesign/core/TextInput";
import { ReactElement } from "react";

import { ImagePriceObject } from "../../utils/types";

export type Shipment = { trackingNumber: string; trackingUrl: string };
export const EMPTY_SHIPMENT: Shipment = { trackingNumber: "", trackingUrl: "" };

// Handdrucke: physisch und nicht über das Labor. Laborpositionen meldet der
// Labor-Webhook selbst. Grobe Anzeige-Entscheidung — ob die Mail rausgeht,
// entscheidet der Server (druckelib.needsManualShipmentMail).
export function hasManualPrints(items: ImagePriceObject[]): boolean {
  return items.some((it) => it.price.some((p) => !p.isDownloadable && !p.labSku));
}

export default function ShipmentFields({ value, onChange }: { value: Shipment; onChange: (v: Shipment) => void }): ReactElement {
  return (
    <>
      <TextInput width="100%" label="Sendungsnummer (optional)"
        value={value.trackingNumber} onChange={(v) => onChange({ ...value, trackingNumber: v })} />
      <TextInput width="100%" label="Link zur Sendungsverfolgung (optional)"
        placeholder="https://…"
        value={value.trackingUrl} onChange={(v) => onChange({ ...value, trackingUrl: v })} />
    </>
  );
}
