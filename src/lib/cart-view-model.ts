import { creators } from "./mock-data";
import { getProductsByIds } from "./data";
import { orderShipping } from "./format";
import type { Cart, Creator, Product } from "./types";

export type LineState = "ok" | "sold" | "on_hold";
export type CartRow = { product: Product; quantity: number; state: LineState };

/** Joins the stored cart with current product data and works out the totals. */
export function buildCart(cart: Cart) {
  const products = getProductsByIds(cart.lines.map((l) => l.productId));
  const rows: CartRow[] = cart.lines.flatMap((l) => {
    const product = products.find((p) => p.id === l.productId);
    if (!product) return [];
    const state: LineState = product.status === "sold_out" ? "sold" : product.status === "reserved" ? "on_hold" : "ok";
    return [{ product, quantity: Math.min(l.quantity, Math.max(product.quantity, 1)), state }];
  });
  const buyable = rows.filter((r) => r.state === "ok");
  const subtotal = buyable.reduce((s, r) => s + r.product.priceCents * r.quantity, 0);
  const shipping = orderShipping(buyable.map((r) => r.product));
  const creator: Creator | undefined = creators.find((c) => c.handle === cart.creatorHandle);
  return { rows, buyable, subtotal, shipping, total: subtotal + shipping, creator };
}
