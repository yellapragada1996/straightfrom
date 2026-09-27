"use client";

import { useSyncExternalStore } from "react";
import { creators, products } from "./mock-data";
import type { PlacedOrder } from "./last-order";

// Prototype-only fan account + order history, kept in localStorage.
// Real app: orders table, matched on the fan's verified email (case-insensitive),
// so orders placed before sign-up show up automatically.

export type FanOrderStatus = "paid" | "shipped" | "refunded";
export type FanOrder = PlacedOrder & {
  placedAt: string;
  status: FanOrderStatus;
  carrier?: string;
  trackingUrl?: string;
  tracking?: string;
  shippedAt?: string;
};

type FanState = { version: 1; signedInEmail: string | null; orders: FanOrder[] };

const KEY = "sf-fan-v1";
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

/** Earlier orders by the demo fan, placed before they had an account. */
function seed(): FanState {
  const theo = creators.find((c) => c.handle === "theoplays")!;
  const maya = creators.find((c) => c.handle === "mayaokafor")!;
  const kb = products.find((p) => p.id === "p_theo_keyboard")!;
  const tote = products.find((p) => p.id === "p_lisbon_tote")!;
  const shipTo = { name: "Sam Rivera", line1: "120 Hudson St", line2: "Apt 4B", city: "New York", region: "NY", postal: "10013", country: "United States" };
  const mk = (id: string, c: typeof theo, p: typeof kb, placed: number, shipped: number, carrier: string, tracking: string, url: string): FanOrder => ({
    id,
    creatorHandle: c.handle,
    creatorName: c.displayName,
    creatorAvatar: c.avatarUrl,
    email: "sam.fan@example.com",
    shipTo,
    items: [{ title: p.title, image: p.images[0], priceCents: p.priceCents, quantity: 1 }],
    subtotalCents: p.priceCents,
    shippingCents: p.shippingCents,
    totalCents: p.priceCents + p.shippingCents,
    placedAt: daysAgo(placed),
    status: "shipped",
    shippedAt: daysAgo(shipped),
    carrier,
    tracking,
    trackingUrl: url,
  });
  return {
    version: 1,
    signedInEmail: null,
    orders: [
      mk("SF-3KD9Q", theo, kb, 24, 21, "UPS", "1Z999AA10123456784", "https://www.ups.com/track?tracknum=1Z999AA10123456784"),
      mk("SF-9TR3A", maya, tote, 6, 3, "USPS", "9400111202555842331234", "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111202555842331234"),
    ],
  };
}

const listeners = new Set<() => void>();
let snapshot: FanState | null = null;
let serverSnapshot: FanState | null = null;

function read(): FanState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as FanState;
      if (s.version === 1) return s;
    }
  } catch {}
  return seed();
}
function write(s: FanState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
const get = () => (snapshot ??= read());
const getServer = () => (serverSnapshot ??= { version: 1, signedInEmail: null, orders: [] });
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
function set(update: (s: FanState) => FanState) {
  snapshot = update(get());
  write(snapshot);
  listeners.forEach((l) => l());
}

export const useFanState = () => useSyncExternalStore(subscribe, get, getServer);

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Every order placed with this email, newest first. */
export const ordersFor = (s: FanState, email: string | null) =>
  email ? s.orders.filter((o) => same(o.email, email)).sort((a, b) => b.placedAt.localeCompare(a.placedAt)) : [];

export const fanActions = {
  recordOrder(o: PlacedOrder) {
    set((s) => ({ ...s, orders: [{ ...o, placedAt: new Date().toISOString(), status: "paid" }, ...s.orders.filter((x) => x.id !== o.id)] }));
  },
  /** Called once the fan has signed in (password, verified code, or Google). */
  signIn(email: string) {
    set((s) => ({ ...s, signedInEmail: email.trim().toLowerCase() }));
  },
  signOut() {
    set((s) => ({ ...s, signedInEmail: null }));
  },
};

export const isSignedInAs = (s: FanState, email: string) => !!s.signedInEmail && same(s.signedInEmail, email);
