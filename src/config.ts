// Product rules and limits in one place (docs/BACKEND_PLAN.md §3).
// Safe to import from server and client code: no secrets here.
// Copy on screens and in emails uses these values; never type the numbers into text.

// ---------- orders and money ----------
/** Days a creator has to add tracking before the fan is refunded automatically. */
export const SHIP_DEADLINE_DAYS = 7;
/** Days after shipping before the creator's share is sent. */
export const PAYOUT_DELAY_DAYS = 7;
/** How long an item is held while a fan pays. (§22 recommends 15; not decided yet.) */
export const RESERVATION_MINUTES = 30;
/** Extra days admin can give a creator to ship. */
export const SHIP_EXTENSION_OPTIONS = [3, 7] as const;
/** The one ship reminder (email E8) goes out this many days before the ship-by date. */
export const SHIP_REMINDER_DAYS_BEFORE = 2;

// ---------- listing an item ----------
/** Pre-filled shipping price for a new item; the creator can change it. */
export const DEFAULT_SHIPPING_CENTS = 2000;
export const MIN_PRICE_CENTS = 100;
export const MAX_PHOTOS = 8;
export const STORY_MAX = 1000;

// ---------- creator profile ----------
export const BIO_MAX = 160;
export const MIN_CREATOR_AGE = 18;

// ---------- where fans can ship to ----------
export const SHIP_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
] as const;
export type ShipCountryCode = (typeof SHIP_COUNTRIES)[number]["code"];

/** "the US and Canada" */
export const SHIP_COUNTRIES_TEXT = "the US and Canada";

// ---------- contact ----------
export const SUPPORT_EMAIL = "hello@straightfrom.co";

// ---------- sign-in ----------
/** Length of the emailed code for sign-up and password reset. Must match Supabase Auth's OTP length. */
export const CODE_LENGTH = 6;
/** How long before "Resend code" is available again. Supabase allows one code per user per 60 seconds by default. */
export const RESEND_CODE_SECONDS = 60;
/** Minimum password length. Must match Supabase Auth's password policy. */
export const MIN_PASSWORD_LENGTH = 8;

/** "7 days" / "1 day" */
export const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
