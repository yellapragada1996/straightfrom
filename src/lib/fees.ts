// Working assumptions (spec §13, still open): 15% platform fee on the item price;
// the creator keeps all of the shipping. Payout 7 days after tracking is added.
export const PLATFORM_FEE_BPS = 1500;
export const PAYOUT_DELAY_DAYS = 7;
export const SHIP_DEADLINE_DAYS = 7;

export const platformFee = (itemCents: number) => Math.round((itemCents * PLATFORM_FEE_BPS) / 10000);
export const creatorEarns = (itemCents: number, shippingCents: number) => itemCents - platformFee(itemCents) + shippingCents;
export const feePercent = `${PLATFORM_FEE_BPS / 100}%`;
