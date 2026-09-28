"use client";

import { DEFAULT_FEE_BPS } from "./fees";
export { parseFeePercent } from "./fees";
import { createLocalStore } from "./local-store";

// Platform settings the admin controls and the creator side reads.
// Real app: a settings row, a fee column on creators, and a small table of
// rates waiting for someone to sign up with that email.

export type FeeOverride = { feeBps: number; note: string; setAt: string };

export type PlatformState = {
  version: 2;
  defaultFeeBps: number;
  /** creatorId → their own rate. Absent = platform rate. */
  creatorFees: Record<string, FeeOverride>;
  /** email (lowercase) → rate that applies once someone signs up with it. */
  pendingFees: Record<string, FeeOverride>;
};

const DAY = 86_400_000;
const seed = (): PlatformState => ({
  version: 2,
  defaultFeeBps: DEFAULT_FEE_BPS,
  creatorFees: {
    c_theo: { feeBps: 0, note: "Launch partner", setAt: new Date(Date.now() - 10 * DAY).toISOString() },
  },
  pendingFees: {
    "nina@example.com": { feeBps: 0, note: "Nina Reyes, 2M on TikTok. Agreed on a call", setAt: new Date(Date.now() - 2 * DAY).toISOString() },
  },
});

const store = createLocalStore<PlatformState>("sf-platform-v1", seed);
export const usePlatform = store.use;

export const effectiveFeeBps = (s: PlatformState, creatorId: string) => s.creatorFees[creatorId]?.feeBps ?? s.defaultFeeBps;
export const useFeeBps = (creatorId: string) => effectiveFeeBps(usePlatform(), creatorId);

const override = (feeBps: number, note: string): FeeOverride => ({ feeBps, note, setAt: new Date().toISOString() });
const without = <T,>(r: Record<string, T>, key: string) => {
  const rest = { ...r };
  delete rest[key];
  return rest;
};

export const platformActions = {
  setDefaultFee(feeBps: number) {
    store.set((s) => ({ ...s, defaultFeeBps: feeBps }));
  },
  setCreatorFee(creatorId: string, feeBps: number, note: string) {
    store.set((s) => ({ ...s, creatorFees: { ...s.creatorFees, [creatorId]: override(feeBps, note) } }));
  },
  clearCreatorFee(creatorId: string) {
    store.set((s) => ({ ...s, creatorFees: without(s.creatorFees, creatorId) }));
  },
  /** Agree a rate before the creator has an account. */
  setPendingFee(email: string, feeBps: number, note: string) {
    store.set((s) => ({ ...s, pendingFees: { ...s.pendingFees, [email.toLowerCase()]: override(feeBps, note) } }));
  },
  clearPendingFee(email: string) {
    store.set((s) => ({ ...s, pendingFees: without(s.pendingFees, email.toLowerCase()) }));
  },
  /** Called when a creator finishes sign-up: a rate waiting for their email becomes theirs. */
  claimPendingFee(email: string, creatorId: string) {
    const key = email.toLowerCase();
    store.set((s) =>
      s.pendingFees[key]
        ? { ...s, creatorFees: { ...s.creatorFees, [creatorId]: s.pendingFees[key] }, pendingFees: without(s.pendingFees, key) }
        : s,
    );
  },
  reset() {
    store.set(seed);
  },
};

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
