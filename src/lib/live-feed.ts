import type { Product } from "./types";

/**
 * The creator page's red banner: what's actually happening on the page,
 * built from real data (newest listing, latest sale, low stock, fans who own a piece).
 * Falls back to item names when there isn't much going on yet.
 */
export function liveFeed(firstName: string, products: Pick<Product, "title" | "status" | "quantity" | "createdAt">[]): string[] {
  const newestFirst = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const available = newestFirst.filter((p) => p.status === "available");
  const sold = newestFirst.filter((p) => p.status === "sold_out");
  const feed: string[] = [];

  if (available[0]) feed.push(`Just listed: ${available[0].title}`);
  if (sold[0]) feed.push(`Just sold: ${sold[0].title}`);
  const low = available.find((p) => p.quantity > 1 && p.quantity <= 3);
  if (low) feed.push(`Only ${low.quantity} left: ${low.title}`);
  if (sold.length) feed.push(`${sold.length} ${sold.length === 1 ? "fan now owns" : "fans now own"} a piece of ${firstName}`);

  if (feed.length < 3) {
    for (const p of available.slice(1)) {
      if (feed.length >= 4) break;
      feed.push(p.title);
    }
  }
  return feed.length ? feed : [`New pieces from ${firstName} coming soon`];
}
