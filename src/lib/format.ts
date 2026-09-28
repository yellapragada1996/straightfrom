import type { Creator, Product } from "./types";

export const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const moneyExact = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const firstName = (c: Creator) => c.displayName.split(" ")[0];

export const isSold = (p: Product) => p.status === "sold_out";

/** First sentence of an item's story, used as the one-line quote on cards. */
export function firstSentence(s: string, max = 80) {
  const f = s.split(/(?<=[.!?])\s/)[0];
  return f.length > max ? f.slice(0, max - 2).trim() + "…" : f;
}

/** Order shipping: the highest single item's shipping, charged once (see cart decisions). */
export const orderShipping = (items: { shippingCents: number }[]) =>
  items.reduce((max, i) => Math.max(max, i.shippingCents), 0);
