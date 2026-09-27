"use client";

import { useSyncExternalStore } from "react";
import { platformFee, PAYOUT_DELAY_DAYS, SHIP_DEADLINE_DAYS } from "./fees";
import { creators, products as allProducts } from "./mock-data";
import type { SocialLinks } from "./social";
import type { Product } from "./types";

// Prototype-only store for the signed-in creator: profile, pieces, orders and
// bank status, kept in localStorage. The backend phase replaces this with
// Supabase tables + server actions; screens keep the same shape.

export const CARRIERS = [
  { key: "canada_post", label: "Canada Post", track: (n: string) => `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${n}` },
  { key: "purolator", label: "Purolator", track: (n: string) => `https://www.purolator.com/en/shipping/tracker?pin=${n}` },
  { key: "usps", label: "USPS", track: (n: string) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  { key: "ups", label: "UPS", track: (n: string) => `https://www.ups.com/track?tracknum=${n}` },
  { key: "fedex", label: "FedEx", track: (n: string) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { key: "dhl", label: "DHL", track: (n: string) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}` },
  { key: "other", label: "Other", track: null },
] as const;
export type CarrierKey = (typeof CARRIERS)[number]["key"];

export type OrderStatus = "paid" | "shipped" | "paid_out" | "refunded";

export type CreatorOrder = {
  id: string;
  items: { productId: string; title: string; image: string; priceCents: number; quantity: number }[];
  itemCents: number;
  shippingCents: number;
  feeCents: number;
  payoutCents: number;
  fan: { name: string; email: string; line1: string; line2?: string; city: string; region: string; postal: string; country: string };
  status: OrderStatus;
  paidAt: string;
  shippedAt?: string;
  carrier?: CarrierKey;
  tracking?: string;
  paidOutAt?: string;
  refundedAt?: string;
};

export type Profile = {
  email: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  socialLinks: SocialLinks;
};

export type CreatorState = {
  version: 1;
  profile: Profile | null; // null = not onboarded yet
  products: Product[];
  orders: CreatorOrder[];
  bank: { connected: boolean; last4?: string };
  bankCardDismissed: boolean;
};

const KEY = "sf-creator-v1";
const DAY = 86_400_000;
const daysAgo = (n: number, hours = 0) => new Date(Date.now() - n * DAY - hours * 3_600_000).toISOString();

function order(
  id: string,
  productId: string,
  status: OrderStatus,
  fan: CreatorOrder["fan"],
  dates: Partial<Pick<CreatorOrder, "paidAt" | "shippedAt" | "paidOutAt" | "refundedAt">> & { paidAt: string },
  extra: Partial<CreatorOrder> = {},
  quantity = 1,
): CreatorOrder {
  const p = allProducts.find((x) => x.id === productId)!;
  const itemCents = p.priceCents * quantity;
  const feeCents = platformFee(itemCents);
  return {
    id,
    items: [{ productId, title: p.title, image: p.images[0], priceCents: p.priceCents, quantity }],
    itemCents,
    shippingCents: p.shippingCents,
    feeCents,
    payoutCents: itemCents - feeCents + p.shippingCents,
    fan,
    status,
    ...dates,
    ...extra,
  };
}

/** Maya, with a realistic mix of orders and no bank connected yet. */
function seedMaya(): CreatorState {
  const maya = creators[0];
  return {
    version: 1,
    profile: {
      email: "maya@example.com",
      handle: maya.handle,
      displayName: maya.displayName,
      bio: maya.bio,
      avatarUrl: maya.avatarUrl,
      socialLinks: { ...maya.socialLinks },
    },
    products: allProducts.filter((p) => p.creatorId === maya.id).map((p) => ({ ...p })),
    orders: [
      order("SF-7Q2KD", "p_tokyo_polaroid", "paid",
        { name: "Priya Shah", email: "priya@example.com", line1: "88 Queen St W", line2: "Unit 1204", city: "Toronto", region: "ON", postal: "M5H 2M8", country: "Canada" },
        { paidAt: daysAgo(5, 3) }),
      order("SF-4MZ8P", "p_film_camera", "paid",
        { name: "Sam Rivera", email: "sam@example.com", line1: "120 Hudson St", line2: "Apt 4B", city: "New York", region: "NY", postal: "10013", country: "United States" },
        { paidAt: daysAgo(1, 2) }),
      order("SF-9TR3A", "p_lisbon_tote", "shipped",
        { name: "Jordan Lee", email: "jordan@example.com", line1: "2201 Pine St", city: "Seattle", region: "WA", postal: "98121", country: "United States" },
        { paidAt: daysAgo(6), shippedAt: daysAgo(3) }, { carrier: "usps", tracking: "9400111202555842331234" }),
      order("SF-2LX6W", "p_ring_light", "shipped",
        { name: "Aisha Bello", email: "aisha@example.com", line1: "45 Elm Ave", city: "Austin", region: "TX", postal: "78704", country: "United States" },
        { paidAt: daysAgo(15), shippedAt: daysAgo(12) }, { carrier: "ups", tracking: "1Z999AA10123456784" }),
      order("SF-8HB1C", "p_qa_hoodie", "refunded",
        { name: "Chris Novak", email: "chris@example.com", line1: "9 Harbour Rd", city: "Vancouver", region: "BC", postal: "V6B 1A1", country: "Canada" },
        { paidAt: daysAgo(24), refundedAt: daysAgo(17) }),
    ],
    bank: { connected: false },
    bankCardDismissed: false,
  };
}

// ---------- store plumbing ----------
const listeners = new Set<() => void>();
let snapshot: CreatorState | null = null;
let serverSnapshot: CreatorState | null = null;

function read(): CreatorState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as CreatorState;
      if (s.version === 1) return s;
    }
  } catch {}
  const seeded = seedMaya();
  write(seeded);
  return seeded;
}
function write(s: CreatorState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
const get = () => (snapshot ??= read());
const getServer = () => (serverSnapshot ??= seedMaya());
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = read();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function set(update: (s: CreatorState) => CreatorState) {
  snapshot = update(get());
  write(snapshot);
  listeners.forEach((l) => l());
}

export const useCreatorState = () => useSyncExternalStore(subscribe, get, getServer);

// ---------- actions ----------
export const creatorActions = {
  /** Brand-new creator from onboarding: empty shop. */
  startNew(profile: Profile) {
    set(() => ({ version: 1, profile, products: [], orders: [], bank: { connected: false }, bankCardDismissed: false }));
  },
  signInAsSample() {
    set(() => seedMaya());
  },
  resetPrototype() {
    set(() => seedMaya());
  },
  updateProfile(patch: Partial<Profile>) {
    set((s) => (s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s));
  },
  saveProduct(p: Product) {
    set((s) => {
      const exists = s.products.some((x) => x.id === p.id);
      return { ...s, products: exists ? s.products.map((x) => (x.id === p.id ? p : x)) : [p, ...s.products] };
    });
  },
  setProductStatus(id: string, status: Product["status"]) {
    set((s) => ({ ...s, products: s.products.map((x) => (x.id === id ? { ...x, status } : x)) }));
  },
  deleteDraft(id: string) {
    set((s) => ({ ...s, products: s.products.filter((x) => x.id !== id) }));
  },
  markShipped(orderId: string, carrier: CarrierKey, tracking: string) {
    set((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: "shipped", carrier, tracking, shippedAt: new Date().toISOString() } : o)),
    }));
  },
  connectBank() {
    // In the real app Stripe's account.updated webhook flips payouts on; the daily
    // payout job then pays anything that's past the delay.
    set((s) => ({
      ...s,
      bank: { connected: true, last4: "4821" },
      orders: s.orders.map((o) => (o.status === "shipped" && payoutDue(o) <= Date.now() ? { ...o, status: "paid_out", paidOutAt: new Date().toISOString() } : o)),
    }));
  },
  dismissBankCard() {
    set((s) => ({ ...s, bankCardDismissed: true }));
  },
};

// ---------- derived ----------
export const shipBy = (o: CreatorOrder) => new Date(o.paidAt).getTime() + SHIP_DEADLINE_DAYS * DAY;
export const payoutDue = (o: CreatorOrder) => (o.shippedAt ? new Date(o.shippedAt).getTime() + PAYOUT_DELAY_DAYS * DAY : Infinity);
export const daysLeft = (t: number) => Math.max(0, Math.ceil((t - Date.now()) / DAY));
/** Shipped, but the payout delay hasn't passed yet. */
export const payoutPending = (o: CreatorOrder) => payoutDue(o) > Date.now();

export function balances(s: CreatorState) {
  const sum = (os: CreatorOrder[]) => os.reduce((n, o) => n + o.payoutCents, 0);
  const toShip = s.orders.filter((o) => o.status === "paid");
  const shipped = s.orders.filter((o) => o.status === "shipped");
  const onTheWay = shipped.filter((o) => payoutDue(o) > Date.now());
  const ready = shipped.filter((o) => payoutDue(o) <= Date.now());
  const paidOut = s.orders.filter((o) => o.status === "paid_out");
  return {
    toShip, onTheWay, ready, paidOut,
    toShipCents: sum(toShip),
    onTheWayCents: sum(onTheWay),
    readyCents: sum(ready),
    paidOutCents: sum(paidOut),
    /** Everything earned but not yet in the bank. */
    pendingCents: sum(toShip) + sum(shipped),
  };
}

export const newProductId = () => "p_" + Math.random().toString(36).slice(2, 9);
export const slugify = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "piece";

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
