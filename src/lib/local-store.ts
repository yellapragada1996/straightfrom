"use client";

import { useSyncExternalStore } from "react";

/**
 * Prototype-only: a tiny localStorage-backed store for useSyncExternalStore.
 * The server (and first client render) always sees the seed, so hydration matches.
 */
export function createLocalStore<T extends { version: number }>(key: string, seed: () => T) {
  const listeners = new Set<() => void>();
  let snapshot: T | null = null;
  let serverSnapshot: T | null = null;

  function read(): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw) as T;
        if (s.version === seed().version) return s;
      }
    } catch {}
    const seeded = seed();
    write(seeded);
    return seeded;
  }
  function write(s: T) {
    try {
      localStorage.setItem(key, JSON.stringify(s));
    } catch {}
  }
  const get = () => (snapshot ??= read());
  const getServer = () => (serverSnapshot ??= seed());
  function subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
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
  function set(update: (s: T) => T) {
    snapshot = update(get());
    write(snapshot);
    listeners.forEach((l) => l());
  }
  const use = () => useSyncExternalStore(subscribe, get, getServer);
  return { use, get, set };
}
