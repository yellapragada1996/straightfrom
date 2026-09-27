// Our fee is a percentage of the item price; the creator keeps all of the shipping.
// The platform-wide rate and any per-creator rates are set in /admin (see platform-store).
// Every order stores the fee it was bought at, so a change only affects new orders.
export const DEFAULT_FEE_BPS = 490; // 4.9%
export const PAYOUT_DELAY_DAYS = 7;
export const SHIP_DEADLINE_DAYS = 7;

export const feeFor = (itemCents: number, feeBps: number) => Math.round((itemCents * feeBps) / 10000);
export const creatorEarns = (itemCents: number, shippingCents: number, feeBps: number) =>
  itemCents - feeFor(itemCents, feeBps) + shippingCents;
/** 490 → "4.9%", 0 → "0%" */
export const fmtFee = (feeBps: number) => `${Number((feeBps / 100).toFixed(2))}%`;
