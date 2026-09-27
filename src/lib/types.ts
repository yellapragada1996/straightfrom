// Shapes mirror the planned database tables (spec §7) so the fake data layer
// can later be swapped for Supabase without touching the screens.

export type SocialKey = "instagram" | "youtube" | "tiktok" | "x" | "twitch";

export type Creator = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  socialLinks: Partial<Record<SocialKey, string>>;
  payoutsEnabled: boolean;
  hidden: boolean;
};

export type ProductStatus = "draft" | "available" | "reserved" | "sold_out" | "hidden";

export type Product = {
  id: string;
  creatorId: string;
  slug: string;
  title: string;
  /** The item's story, in the creator's words. */
  description: string;
  priceCents: number;
  shippingCents: number;
  quantity: number;
  status: ProductStatus;
  images: string[];
  createdAt: string;
};

export type CartLine = { productId: string; quantity: number };

export type Cart = { creatorHandle: string | null; lines: CartLine[] };
