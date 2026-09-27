// Prototype only: the confirmation page reads the order the checkout just "placed".
// In the real app this comes from the orders table via the Stripe session/payment id.

export type PlacedOrder = {
  id: string;
  creatorHandle: string;
  creatorName: string;
  creatorAvatar: string;
  email: string;
  shipTo: { name: string; line1: string; line2?: string; city: string; region: string; postal: string; country: string };
  items: { title: string; image: string; priceCents: number; quantity: number }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
};

const KEY = "sf-last-order";

export function saveOrder(o: PlacedOrder) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(o));
  } catch {}
}

let cachedRaw: string | null = null;
let cachedOrder: PlacedOrder | null = null;

/** Stable snapshot for useSyncExternalStore: re-parses only when the stored value changes. */
export function loadOrder(): PlacedOrder | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedOrder = raw ? (JSON.parse(raw) as PlacedOrder) : null;
    }
    return cachedOrder;
  } catch {
    return null;
  }
}

export const newOrderId = () => "SF-" + Math.random().toString(36).slice(2, 7).toUpperCase();
