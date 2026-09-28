import { feeFor } from "@/lib/fees";

// Order money maths (docs/BACKEND_PLAN.md §7). All amounts are whole cents.
//
// 1. At purchase: items, shipping (highest in the order), total, our fee on the items.
// 2. When the payment succeeds: Stripe's exact fee is read from Stripe, and
//    creator payout = total − our fee − Stripe's fee.
// Stripe's fee is never estimated here: it's an input.

export type OrderLine = { priceCents: number; shippingCents: number; quantity: number };

export type OrderTotals = {
  itemsCents: number;
  shippingCents: number;
  totalCents: number;
  feeBps: number;
  feeCents: number;
};

const isCents = (n: number) => Number.isSafeInteger(n) && n >= 0;

function assertCents(name: string, n: number) {
  if (!isCents(n)) throw new RangeError(`${name} must be a whole, non-negative number of cents (got ${n})`);
}

export function assertFeeBps(feeBps: number) {
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000) throw new RangeError(`feeBps must be 0–10000 (got ${feeBps})`);
}

/** The creator's own rate if they have one (0 counts!), otherwise the platform rate. */
export function effectiveFeeBps(creatorFeeBps: number | null | undefined, platformFeeBps: number): number {
  const bps = creatorFeeBps ?? platformFeeBps;
  assertFeeBps(bps);
  return bps;
}

/** Totals for one order (one creator). Shipping is charged once: the highest shipping of the items. */
export function orderTotals(lines: OrderLine[], feeBps: number): OrderTotals {
  if (lines.length === 0) throw new RangeError("An order needs at least one line");
  assertFeeBps(feeBps);
  for (const l of lines) {
    assertCents("priceCents", l.priceCents);
    assertCents("shippingCents", l.shippingCents);
    if (!Number.isSafeInteger(l.quantity) || l.quantity < 1) throw new RangeError(`quantity must be a whole number ≥ 1 (got ${l.quantity})`);
  }
  const itemsCents = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
  const shippingCents = Math.max(...lines.map((l) => l.shippingCents));
  return {
    itemsCents,
    shippingCents,
    totalCents: itemsCents + shippingCents,
    feeBps,
    feeCents: feeFor(itemsCents, feeBps),
  };
}

/**
 * The creator's share once Stripe has reported its fee: total − our fee − Stripe's fee.
 * Returns null while Stripe's fee is unknown, so nothing is paid on a guess.
 */
export function creatorPayoutCents(order: { totalCents: number; feeCents: number }, stripeFeeCents: number | null | undefined): number | null {
  if (stripeFeeCents === null || stripeFeeCents === undefined) return null;
  assertCents("totalCents", order.totalCents);
  assertCents("feeCents", order.feeCents);
  assertCents("stripeFeeCents", stripeFeeCents);
  const payout = order.totalCents - order.feeCents - stripeFeeCents;
  if (payout < 0) throw new RangeError(`Fees exceed the order total (${order.totalCents} − ${order.feeCents} − ${stripeFeeCents})`);
  return payout;
}
