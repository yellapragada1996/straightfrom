"use client";

import { DEFAULT_FEE_BPS } from "./fees";
import { createLocalStore } from "./local-store";

// Platform settings the admin controls and the creator side reads.
// Real app: a single settings row + a fee column on creators, read on the server.

export type FeeOverride = { feeBps: number; note: string; setAt: string };

export type PlatformState = {
  version: 1;
  defaultFeeBps: number;
  /** creatorId → their own rate. Absent = platform rate. */
  creatorFees: Record<string, FeeOverride>;
};

const seed = (): PlatformState => ({
  version: 1,
  defaultFeeBps: DEFAULT_FEE_BPS,
  creatorFees: {
    c_theo: { feeBps: 0, note: "Launch partner", setAt: new Date(Date.now() - 10 * 86_400_000).toISOString() },
  },
});

const store = createLocalStore<PlatformState>("sf-platform-v1", seed);
export const usePlatform = store.use;

export const effectiveFeeBps = (s: PlatformState, creatorId: string) => s.creatorFees[creatorId]?.feeBps ?? s.defaultFeeBps;
export const useFeeBps = (creatorId: string) => effectiveFeeBps(usePlatform(), creatorId);

export const platformActions = {
  setDefaultFee(feeBps: number) {
    store.set((s) => ({ ...s, defaultFeeBps: feeBps }));
  },
  setCreatorFee(creatorId: string, feeBps: number, note: string) {
    store.set((s) => ({ ...s, creatorFees: { ...s.creatorFees, [creatorId]: { feeBps, note, setAt: new Date().toISOString() } } }));
  },
  clearCreatorFee(creatorId: string) {
    store.set((s) => {
      const rest = { ...s.creatorFees };
      delete rest[creatorId];
      return { ...s, creatorFees: rest };
    });
  },
  reset() {
    store.set(seed);
  },
};

/** Percent text ("4.9") → basis points (490). null when it isn't a valid 0–100 value. */
export function parseFeePercent(v: string): number | null {
  const t = v.trim().replace(/%$/, "");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const bps = Math.round(parseFloat(t) * 100);
  return bps >= 0 && bps <= 10000 ? bps : null;
}
