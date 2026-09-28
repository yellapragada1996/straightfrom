// Our fee is a percentage of the item price; the creator keeps all of the shipping.
// The platform-wide rate and any per-creator rates are set in /admin (see platform-store).
// Every order stores the fee it was bought at, so a change only affects new orders.
export const DEFAULT_FEE_BPS = 490; // 4.9%

export const feeFor = (itemCents: number, feeBps: number) => Math.round((itemCents * feeBps) / 10000);
export const creatorEarns = (itemCents: number, shippingCents: number, feeBps: number) =>
  itemCents - feeFor(itemCents, feeBps) + shippingCents;
/** 490 → "4.9%", 0 → "0%" */
export const fmtFee = (feeBps: number) => `${Number((feeBps / 100).toFixed(2))}%`;

// Stripe's card fee (US cards). It's charged on the full amount the fan pays and
// isn't returned on refunds. Used for our own numbers in admin; an estimate.
const STRIPE_PCT_BPS = 290;
const STRIPE_FIXED_CENTS = 30;
export const stripeFeeEstimate = (chargedCents: number) => Math.round((chargedCents * STRIPE_PCT_BPS) / 10000) + STRIPE_FIXED_CENTS;

/** Percent text as typed in admin ("4.9", "0", "4.9%") → basis points (490). Null when it isn't a valid 0–100 value. */
export function parseFeePercent(v: string): number | null {
  const t = v.trim().replace(/%$/, "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const bps = Math.round(parseFloat(t) * 100);
  return bps >= 0 && bps <= 10000 ? bps : null;
}
