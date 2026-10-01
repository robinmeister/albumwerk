import type { ImagePriceObject } from "../../../utils/types";

// Spiegel von shippingFor in pb_hooks/lib/printlib.js — der Server bucht ab,
// diese Kopie zeigt nur an. tests/versand.test.ts hält beide gleich.
export function shippingFor(goodsTotal: number, hasLab: boolean, flat: number, freeFrom: number): number {
  if (!hasLab || !(flat > 0)) return 0;
  if (freeFrom > 0 && goodsTotal >= freeFrom) return 0;
  return Math.round(flat * 100) / 100;
}

export function hasLabItem(list: ImagePriceObject[]): boolean {
  return list.some((obj) => obj.price.some((p) => Boolean(p.labSku) && p.quantity > 0));
}
