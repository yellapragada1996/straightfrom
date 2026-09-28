"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { Cart, Product } from "./types";

// Prototype cart: kept in localStorage, one creator per cart.
// The backend phase moves this to a server-side session so it survives
// Instagram/TikTok in-app browsers that drop local storage.

const KEY = "sf-cart-v1";
const EMPTY: Cart = { creatorHandle: null, lines: [] };

export type AddResult = "added" | "already" | "conflict";

type CartApi = {
  cart: Cart;
  ready: boolean;
  count: number;
  has: (productId: string) => boolean;
  add: (product: Product, creatorHandle: string, quantity?: number) => AddResult;
  startNewCart: (product: Product, creatorHandle: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

function read(): Cart {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Cart;
    return Array.isArray(parsed.lines) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(cart: Cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // Storage unavailable (private mode, some in-app browsers): cart lives for this page view only.
  }
}

// A tiny external store over localStorage, so React reads it without effects
// and other tabs stay in sync.
const listeners = new Set<() => void>();
let snapshot: Cart | null = null;

function getSnapshot() {
  if (snapshot === null) snapshot = read();
  return snapshot;
}
const getServerSnapshot = () => EMPTY;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    snapshot = read();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function update(next: Cart) {
  snapshot = next.lines.length ? next : EMPTY;
  write(snapshot);
  listeners.forEach((l) => l());
}

const noopSubscribe = () => () => {};

/** False during server render and hydration, true once browser storage has been read. */
export const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useHydrated();

  const api = useMemo<CartApi>(() => {
    const has = (id: string) => cart.lines.some((l) => l.productId === id);
    return {
      cart,
      ready,
      count: cart.lines.reduce((n, l) => n + l.quantity, 0),
      has,
      add(product, creatorHandle, quantity = 1) {
        if (cart.creatorHandle && cart.creatorHandle !== creatorHandle && cart.lines.length) return "conflict";
        if (has(product.id)) return "already";
        update({ creatorHandle, lines: [...cart.lines, { productId: product.id, quantity }] });
        return "added";
      },
      startNewCart(product, creatorHandle) {
        update({ creatorHandle, lines: [{ productId: product.id, quantity: 1 }] });
      },
      setQuantity(productId, quantity) {
        update({ ...cart, lines: cart.lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)) });
      },
      remove(productId) {
        update({ ...cart, lines: cart.lines.filter((l) => l.productId !== productId) });
      },
      clear() {
        update(EMPTY);
      },
    };
  }, [cart, ready]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
