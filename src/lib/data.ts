import { creators, products } from "./mock-data";
import type { Creator, Product } from "./types";

// Data access for the prototype. Every screen goes through these functions;
// the backend phase replaces their bodies with Supabase queries.

export async function getCreator(handle: string): Promise<Creator | null> {
  const c = creators.find((x) => x.handle === handle.toLowerCase());
  return c && !c.hidden ? c : null;
}

export async function getCreatorById(id: string): Promise<Creator | null> {
  return creators.find((x) => x.id === id) ?? null;
}

/** Public products for a creator: newest first, sold items kept (for social proof). */
export async function getCreatorProducts(creatorId: string): Promise<Product[]> {
  return products
    .filter((p) => p.creatorId === creatorId && p.status !== "draft" && p.status !== "hidden")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProduct(creatorId: string, slug: string): Promise<Product | null> {
  const p = products.find((x) => x.creatorId === creatorId && x.slug === slug);
  return p && p.status !== "draft" && p.status !== "hidden" ? p : null;
}

/** Lookup used client-side by the cart (prototype only; the backend will re-check on the server). */
export function getProductsByIds(ids: string[]): Product[] {
  return products.filter((p) => ids.includes(p.id));
}

export function getCreatorByIdSync(id: string): Creator | undefined {
  return creators.find((x) => x.id === id);
}
