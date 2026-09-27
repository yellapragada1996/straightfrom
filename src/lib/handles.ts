import { creators } from "./mock-data";

// Spec §11: handles are 3–30 chars, a-z 0-9 _, and can't collide with app routes.
export const RESERVED = new Set([
  "login", "logout", "signup", "dashboard", "onboarding", "checkout", "cart", "api", "admin", "settings",
  "terms", "privacy", "help", "support", "about", "blog", "static", "assets", "straightfrom",
]);

export type HandleCheck = { ok: true } | { ok: false; reason: string };

export function checkHandle(raw: string, currentHandle?: string): HandleCheck {
  const h = raw.trim().toLowerCase();
  if (!h) return { ok: false, reason: "Pick a handle" };
  if (h.length < 3) return { ok: false, reason: "At least 3 characters" };
  if (h.length > 30) return { ok: false, reason: "30 characters max" };
  if (!/^[a-z0-9_]+$/.test(h)) return { ok: false, reason: "Only letters, numbers and _" };
  if (RESERVED.has(h)) return { ok: false, reason: "That one's reserved" };
  if (h !== currentHandle && creators.some((c) => c.handle === h)) return { ok: false, reason: "Already taken" };
  return { ok: true };
}

/** Suggest a handle from a name or email. */
export const suggestHandle = (s: string) => s.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
