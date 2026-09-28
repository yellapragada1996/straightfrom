// Product rules and limits in one place. Safe to import from server and client code.
// (The backend plan moves every hardcoded rule here: ship deadline, payout delay, ...)

/** Sign-up and password reset: length of the emailed code. Must match Supabase Auth's OTP length. */
export const CODE_LENGTH = 6;
/** How long before "Resend code" is available again. Supabase allows one code per user per 60 seconds by default. */
export const RESEND_CODE_SECONDS = 60;
/** Minimum password length. Must match Supabase Auth's password policy. */
export const MIN_PASSWORD_LENGTH = 8;
