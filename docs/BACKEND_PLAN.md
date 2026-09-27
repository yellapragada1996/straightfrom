# StraightFrom: Backend Plan

*Written 2026-09-27, from a full read of the clickable prototype on the `prototype` branch and the original spec (`STRAIGHTFROM_SPEC.md`).*

The prototype has every screen. They run on fake data kept in the browser (`localStorage`). This plan replaces that fake layer with a real database, real auth, real Stripe money movement and real emails. It changes as little UI as possible, so the backend can be built fast.

Sections marked **DECIDE** are open questions for our next discussion. Everything else is a recommendation ready to build.

---

## Contents

1. [What changed since the spec](#1-what-changed-since-the-spec)
2. [Ground rules (how money and data are handled)](#2-ground-rules)
3. [Hardcoded values found in the prototype](#3-hardcoded-values-found-in-the-prototype)
4. [Stack, services and environment](#4-stack-services-and-environment)
5. [Code layout](#5-code-layout)
6. [Database schema](#6-database-schema)
7. [Money: formulas, snapshots and balances](#7-money-formulas-snapshots-and-balances)
8. [Auth and roles](#8-auth-and-roles)
9. [Checkout and payment flow](#9-checkout-and-payment-flow)
10. [Stripe Connect, payouts, refunds, chargebacks](#10-stripe-connect-payouts-refunds-chargebacks)
11. [Webhooks](#11-webhooks)
12. [Scheduled jobs](#12-scheduled-jobs)
13. [Emails](#13-emails)
14. [Images](#14-images)
15. [Every screen: what it reads, what it writes](#15-every-screen-what-it-reads-what-it-writes)
16. [Server actions (all writes)](#16-server-actions-all-writes)
17. [Admin backend](#17-admin-backend)
18. [Security and privacy](#18-security-and-privacy)
19. [Replacing the prototype, file by file](#19-replacing-the-prototype-file-by-file)
20. [Build phases](#20-build-phases)
21. [Testing](#21-testing)
22. [Values and decisions for our discussion](#22-values-and-decisions-for-our-discussion)

---

## 1. What changed since the spec

We decided these while building the prototype. They override the spec.

| Area | Spec said | Now |
|---|---|---|
| Buying | One item, straight to Stripe Checkout | **Cart**: several items from **one creator** per order. Shipping is charged once per order (the highest shipping of the items). |
| Checkout page | Stripe-hosted Checkout | **Our own checkout page** (contact, address, payment), with Stripe's embedded **Payment Element** for the card. |
| Fans | No fan accounts | **Guest checkout** (email required) plus an **optional fan account** (Google, or email + password verified with a 6-digit code), which shows every order ever placed with that email. |
| Creator sign-in | Email magic link | **Google, or email + password.** Signing up with email sends a **6-digit code** to verify the address. No magic links anywhere. Forgot password also uses a 6-digit code. |
| Handles | Chosen at onboarding | Chosen at onboarding and **permanent**. Only admin can change one, for support cases. |
| Admin | None (Supabase dashboard) | **Admin panel** with 4 sections: Home, Orders, Creators, Fees. One admin account. Hide and remove only. Full refunds only. |
| Fee | 15% placeholder, env var | **4.9% platform fee, stored in the database and editable in admin.** Per-creator rates (e.g. 0%). Rates can be set **by email before sign-up**. Each order keeps the fee it was bought at. |
| Reports | `mailto:` link | Reports are saved in the database and handled from admin Home. |
| Order data | Single product per order | Orders have **order items**, a readable code (`SF-7Q2KD`), and a timeline of events. |

---

## 2. Ground rules

These keep the numbers right and the build fast.

1. **Money is always whole cents (integers).** Never floats, never strings. Formatting (`$77.06`) happens only at display time with `money()`.
2. **The server is the only source of truth for prices, fees and totals.** The browser sends product ids and quantities. The server looks up prices and computes everything again.
3. **Snapshot at purchase.** When an order is paid we save the item prices, shipping, fee rate, fee amount and creator payout **on the order**. Later edits to prices or fees never change past orders.
4. **Balances are calculated, never stored as running totals.** The dashboard's "$77.06 is ready for you!" is not typed into the page, and it won't be stored in a `balance` column either. A running total can drift out of sync with orders. Instead:
   - each order stores its own `payout_cents` (snapshot, rule 3);
   - one function, `getCreatorBalances(creatorId)`, adds them up with SQL by status;
   - every screen and email that shows a creator's money calls that one function.

   Today's prototype already works this way (`balances()` in `creator-store.ts` computes from orders). The backend keeps the same shape and names, so the screens barely change. See §7.
5. **All rules and timings live in one config file** (`src/config.ts`), never typed into copy. "7 days" in the UI becomes `${SHIP_DEADLINE_DAYS} days`. See §3.
6. **Every write is a server action** that checks who you are, validates input with Zod, writes in a transaction when it touches more than one row, logs an event, and then refreshes the affected pages.
7. **Webhooks and scheduled jobs are safe to run twice.** Each one checks state before acting and uses Stripe idempotency keys.
8. **The database is locked to the outside.** Row Level Security is on for every table with no public policies. Only our server (Drizzle, service connection) reads and writes. The public Supabase key can do auth and nothing else.

---

## 3. Hardcoded values found in the prototype

Money amounts are **not** hardcoded anywhere. Every dollar figure on screen is calculated from order and product data. What *is* hardcoded is rules, timings, countries and contact details written straight into copy. Each one moves into `src/config.ts` (or the database, for things admin can change).

| Value | Where it's written today | Becomes |
|---|---|---|
| **4.9%** platform fee | `lib/fees.ts` (`DEFAULT_FEE_BPS`), prototype store | `platform_settings.fee_bps` (DB, admin-editable). `DEFAULT_FEE_BPS` is only the seed value. |
| **7 days** to ship | `buy-box.tsx:131`, `cart-view.tsx:101`, `checkout-view.tsx:242`, `order-confirmation.tsx:34,36`, `how-it-works.tsx:5`, `[handle]/[slug]/page.tsx:46`, `dashboard-home.tsx:109` | `SHIP_DEADLINE_DAYS` |
| **7 days** until payout | `earnings-view.tsx:124`, `item-editor.tsx:200`, `admin/orders.tsx:231` | `PAYOUT_DELAY_DAYS` |
| **30 minutes** hold during checkout | `buy-box.tsx:116`, `cart-view.tsx:129` | `RESERVATION_MINUTES` |
| **$20** default shipping | `item-editor.tsx:17` | `DEFAULT_SHIPPING_CENTS` |
| **$1** minimum price | `item-editor.tsx:58` | `MIN_PRICE_CENTS` (validated on the server too) |
| **8** photos max | `photo-uploader.tsx:9` | `MAX_PHOTOS` |
| **160** bio length | `onboarding.tsx:20`, `settings-view.tsx:14` | `BIO_MAX` |
| **1000** story length | `item-editor.tsx:18` | `STORY_MAX` |
| **US and Canada** | `checkout-view.tsx:174`, `mock-data.ts` (`SHIPS_TO`) | `SHIP_COUNTRIES` (also restricts the address form and Stripe) |
| Code length, resend wait, password length | `config.ts` (already created) | `CODE_LENGTH = 6`, `RESEND_CODE_SECONDS = 30`, `MIN_PASSWORD_LENGTH = 8` (must match Supabase Auth settings) |
| **18 or older** | `login-form.tsx:101`, `onboarding.tsx:153` | `MIN_CREATOR_AGE` |
| **+3 / +7 days** admin extensions | `admin/orders.tsx:203-204` | `SHIP_EXTENSION_OPTIONS` |
| One ship reminder, 2 days before the deadline | spec had day 3 and 5 | `SHIP_REMINDER_DAYS_BEFORE = 2` |
| **"ending 4821"** bank | `creator-store.ts:221` (fake) | Real last 4 from Stripe (`creators.bank_last4`) |
| `hello@straightfrom.co` | `app/page.tsx:252` | `SUPPORT_EMAIL` |
| `admin@straightfrom.co` | `admin-shell.tsx:69,143` | `ADMIN_EMAIL` env var (secret list, never shown to visitors) |
| Stripe card fee 2.9% + 30¢ (estimate) | `lib/fees.ts` | Gone. We store the **actual** Stripe fee per order from Stripe (§7). |
| "Takes about 5 minutes" / "2 minutes" | dashboard, earnings copy | Fine to leave as copy (marketing estimates, not rules). |

**Also delete (prototype-only):** every "Prototype: …" button and note, the fake Stripe dialog, "fill test details", the decline-card hint, "reset sample data", and the fake order id generator.

`src/config.ts` exports plain constants, so both server and client code can import them. Secrets stay in env vars and are only read in `src/server/`.

---

## 4. Stack, services and environment

| Need | Choice | Notes |
|---|---|---|
| App | Next.js 16 (App Router), already set up | Writes are Server Functions (`'use server'`). Webhooks and cron are Route Handlers. `middleware.ts` is now called **`proxy.ts`** in Next 16. |
| Database | Supabase Postgres | One project for production and one for staging/dev. |
| ORM | Drizzle + `postgres` driver | Use Supabase's **transaction pooler** URL at runtime with `prepare: false`. Use the direct URL for migrations. |
| Auth | Supabase Auth via `@supabase/ssr` | Google OAuth, and **email + password** with a **6-digit code** to confirm the email and to reset a password. |
| Files | Supabase Storage | One public bucket for photos. Uploads go through signed URLs. |
| Payments | Stripe: Payment Element + Connect Express | Separate charges and transfers. |
| Email | Resend + React Email | Also used as Supabase Auth's SMTP, so verification and reset codes come from our domain and look like ours. |
| Jobs | Vercel Cron | One daily route that runs every job in order (§12). |
| Validation | Zod | Every server action input. |
| Errors | Sentry (free tier) | Recommended. Money code must never fail silently. |

**Environment variables**

```
NEXT_PUBLIC_SITE_URL=https://straightfrom.co
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # publishable key, auth only
SUPABASE_SERVICE_ROLE_KEY=              # server only (storage signed URLs, admin auth calls)
DATABASE_URL=                           # pooled (transaction mode), runtime
DATABASE_URL_DIRECT=                    # direct, migrations only
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=                  # platform events endpoint
STRIPE_CONNECT_WEBHOOK_SECRET=          # connected-account events endpoint
RESEND_API_KEY=
EMAIL_FROM="StraightFrom <orders@straightfrom.co>"
SUPPORT_EMAIL=hello@straightfrom.co
ADMIN_EMAILS=you@yourdomain.com         # comma-separated; one for now
CRON_SECRET=
SENTRY_DSN=
```

---

## 5. Code layout

New code goes under `src/server/`, which only runs on the server. Screens keep their current components. We swap *where the data comes from*, not how it looks.

```
src/
  config.ts                 # all rules/timings/limits (§3), safe to import anywhere
  proxy.ts                  # refreshes the Supabase session cookie; quick redirects for /dashboard, /admin
  server/
    db/
      schema.ts             # Drizzle tables (§6)
      index.ts              # db client (pooled)
      seed.ts               # loads the prototype's sample data into a dev database
    auth.ts                 # getUser(), requireCreator(), requireAdmin(), getFanEmail()
    money.ts                # orderTotals(), creatorEarns(), fee maths, all integer cents (§7)
    queries/                # reads, one file per area
      creators.ts           # getPublicCreator, getCreatorForDashboard, ...
      products.ts
      orders.ts
      balances.ts           # getCreatorBalances (§7)
      admin.ts              # needsAttention, creatorsToNudge, admin lists
    actions/                # writes ('use server'), one file per area (§16)
      onboarding.ts  profile.ts  products.ts  uploads.ts  shipping.ts
      checkout.ts  connect.ts  fan.ts  reports.ts  admin.ts
    stripe/
      client.ts  payments.ts  connect.ts  transfers.ts  refunds.ts
    email/
      send.ts               # sendEmail(template, to, data), writes email_log
      templates/*.tsx       # React Email templates (§13)
    jobs/
      payouts.ts  autoRefunds.ts  shipReminder.ts  cleanupPending.ts
  app/
    api/stripe/webhook/route.ts
    api/stripe/connect-webhook/route.ts
    api/cron/daily/route.ts
    auth/callback/route.ts  # Google OAuth return
    ...existing pages
```

`src/lib/data.ts` already routes all reads through async functions ("the backend phase replaces their bodies"). We keep those names and point them at `server/queries/`.

---

## 6. Database schema

Postgres enums, `uuid` primary keys (`gen_random_uuid()`), `timestamptz` everywhere, `created_at`/`updated_at` on every table.

### Enums

```
creator_status:  active | hidden
product_status:  draft | available | sold_out | hidden
order_status:    pending | paid | shipped | paid_out | refunded | canceled
event_actor:     fan | creator | system | admin
carrier:         canada_post | purolator | usps | ups | fedex | dhl | other
report_status:   open | resolved
report_target:   item | creator
```

`reserved` is **no longer a stored product status**. An item is "being paid for right now" when all of its units are held by active reservations. It is calculated (see `reservations`), so a stuck status can never block an item.

`pending` orders are checkouts that started but haven't been paid yet. `canceled` orders are ones where the fan never finished paying. Neither ever appears on creator screens, fan screens or totals.

### Tables

**`creators`**

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid unique | `auth.users.id` |
| email | text | copy of the sign-in email (for admin, pending-fee matching) |
| handle | text unique | lowercase, 3–30, `[a-z0-9_]`, not reserved (`lib/handles.ts`) |
| display_name | text | |
| bio | text | ≤ `BIO_MAX` |
| avatar_path | text null | storage path, not full URL |
| social_links | jsonb | `{ instagram: "maya", ... }` usernames only (current shape) |
| status | creator_status | `active` default; admin can hide |
| fee_bps | int null | **own rate**; null = platform rate. Check 0–10000 |
| fee_note | text null | "Launch partner" |
| fee_set_at | timestamptz null | |
| stripe_account_id | text null | Express account |
| payouts_enabled | bool | from `account.updated` |
| bank_last4 | text null | from the account's external bank account, for "ending 4821" |
| bank_card_dismissed_at | timestamptz null | the dismissible "connect your bank" card |
| last_active_at | timestamptz | touched at most hourly when they use the dashboard |

**`products`**

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| creator_id | uuid fk | |
| slug | text | unique per creator; set once from the title, never changes (keeps shared links working) |
| title | text | |
| description | text | the story, ≤ `STORY_MAX` |
| price_cents | int | ≥ `MIN_PRICE_CENTS` to publish |
| shipping_cents | int | ≥ 0 |
| quantity | int | units left to sell, ≥ 0 |
| status | product_status | |
| published_at | timestamptz null | first publish; used for "Listed Sep 23" and "Just listed" |
| sold_at | timestamptz null | when quantity hit 0; used for "Just sold" |

**`product_images`**: id, product_id, `path`, `position` (0 = cover), width, height. 1–`MAX_PHOTOS` per product (checked in the action).

**`orders`**

| column | type | notes |
|---|---|---|
| id | uuid pk | also the Stripe `transfer_group` |
| code | text unique | `SF-7Q2KD`, shown to people |
| creator_id | uuid fk | one creator per order |
| status | order_status | |
| fan_email | text | stored lowercase; index on it (fan accounts match on this) |
| fan_name | text | |
| ship_to | jsonb | `{ line1, line2, city, region, postal, country }` |
| items_cents | int | snapshot: sum of item price × qty |
| shipping_cents | int | snapshot: highest shipping in the order |
| total_cents | int | items + shipping (what the fan paid) |
| fee_bps | int | **snapshot of the rate** at purchase |
| fee_cents | int | round(items × fee_bps / 10000) |
| payout_cents | int | items − fee + shipping |
| stripe_fee_cents | int null | **actual** Stripe fee from the charge's balance transaction |
| stripe_payment_intent_id | text unique | |
| stripe_charge_id | text null | needed as `source_transaction` for the payout |
| stripe_transfer_id | text null | set when paid out |
| stripe_refund_id | text null | |
| transfer_reversal_id | text null | when a refund happens after payout |
| carrier | carrier null | |
| tracking_number | text null | |
| ship_extra_days | int default 0 | admin "+3 days / +7 days" |
| dispute_id | text null | Stripe dispute |
| dispute_status | text null | `needs_response`, `won`, `lost`… |
| dispute_reason | text null | |
| refund_reason | text null | |
| paid_at, shipped_at, paid_out_at, refunded_at, canceled_at | timestamptz null | |
| ship_reminder_sent_at | timestamptz null | the one ship reminder (E8), so re-runs don't send it twice |

**`order_items`**: id, order_id, product_id, `title` (snapshot), `image_path` (snapshot), `price_cents` (snapshot), `quantity`.

**`order_events`** (the order timeline in admin): id, order_id, at, actor (`event_actor`), `kind` (`paid`, `shipped`, `tracking_changed`, `paid_out`, `refunded`, `ship_extended`, `email_resent`, `dispute_opened`, …), `text` (human sentence shown in the timeline).

**`reservations`** (holds items while a fan pays): id, order_id (the pending order), product_id, quantity, `expires_at`. Units available to buy = `products.quantity − sum(active reservations)`, where "active" means `expires_at > now()`. Expired rows are simply ignored, so **no job is needed to release them**. A daily cleanup deletes old rows.

**`platform_settings`** (single row, `id = 1`): `fee_bps` (seeded 490), `updated_at`, `updated_by`.

**`pending_fee_rates`** (a rate agreed before sign-up): `email` pk (lowercase), fee_bps, note, created_at, `claimed_by_creator_id`, `claimed_at`.

**`reports`**: id, `code` (`R-104`), target (`report_target`), product_id null, creator_id, reason, message, reporter_email, status, resolution, resolved_at.

**`creator_notes`** (admin-only notes): id, creator_id, body, created_at.

**`audit_log`** (admin activity log, append-only): id, at, actor_email, `action` (machine key like `order.refund`), `summary` (the sentence shown in the log), target_type, target_id, `data` jsonb.

**`email_log`**: id, at, to, template, order_id null, creator_id null, resend_id, status. It's cheap to write and answers "did the fan get the tracking email?" Delivery/bounce status via Resend webhooks can come later.

**`stripe_events`** (webhook de-duplication): `id` pk (Stripe event id), type, received_at, processed_at.

**`job_runs`**: id, job, started_at, finished_at, ok, summary jsonb.

### Fans

There is **no fans table**. A fan account is a Supabase auth user with no `creators` row. Their order history is `orders where lower(fan_email) = their verified email and status in (paid, shipped, paid_out, refunded)`. That's how orders placed before sign-up appear automatically, which is the behaviour we designed.

### Indexes

`creators(handle)`, `products(creator_id, status)`, `products(creator_id, slug)` unique, `orders(creator_id, status)`, `orders(lower(fan_email))`, `orders(status, paid_at)`, `orders(status, shipped_at)`, `reservations(product_id, expires_at)`, `order_events(order_id, at)`, `reports(status)`.

---

## 7. Money: formulas, snapshots and balances

All in `src/server/money.ts`, with unit tests. `src/lib/fees.ts` keeps the pure helpers (`feeFor`, `creatorEarns`, `fmtFee`) that the item editor's "You'll earn" preview uses, so preview and real maths are the same code.

### At purchase (inside the checkout action, §9)

```
items_cents    = Σ (price_cents × quantity)            for the lines in the cart
shipping_cents = max(shipping_cents of those products)  (you only pay shipping once)
total_cents    = items_cents + shipping_cents
fee_bps        = creator.fee_bps ?? platform_settings.fee_bps
fee_cents      = round(items_cents × fee_bps / 10000)   (fee is on items only)
payout_cents   = items_cents − fee_cents + shipping_cents
```

All of these are saved on the order.

### After payment

`stripe_fee_cents` = the charge's balance transaction `fee`. It's the real number, used for admin's "We keep":

```
we_keep = Σ fee_cents (orders not refunded)
        − Σ stripe_fee_cents (all paid orders, refunded too; Stripe keeps its fee on refunds)
        − dispute fees
```

### Creator balances: one function, used everywhere

`getCreatorBalances(creatorId)` runs one SQL query over that creator's orders:

```sql
select
  count(*)            filter (where status = 'paid')                                          as to_ship_count,
  coalesce(sum(payout_cents) filter (where status = 'paid'), 0)                               as to_ship_cents,
  coalesce(sum(payout_cents) filter (where status = 'shipped' and shipped_at >  now() - :delay), 0) as on_the_way_cents,
  coalesce(sum(payout_cents) filter (where status = 'shipped' and shipped_at <= now() - :delay), 0) as ready_cents,
  coalesce(sum(payout_cents) filter (where status = 'paid_out'), 0)                           as paid_out_cents,
  coalesce(sum(payout_cents) filter (where status in ('paid','shipped','paid_out')), 0)       as total_earned_cents,
  min(shipped_at) filter (where status = 'shipped' and shipped_at > now() - :delay)           as next_payout_from,
  max(paid_out_at)                                                                            as last_payout_at
from orders where creator_id = :id
```

It returns the **same field names the prototype's `balances()` uses today**, so the screens change very little:

| Field | Meaning | Shown on |
|---|---|---|
| `toShipCents` / count | paid, not shipped yet | Dashboard "To ship", Earnings "Ship N orders to get $X on its way" |
| `onTheWayCents` | shipped, inside the payout delay | Earnings "Coming to you", next payout date |
| `readyCents` | shipped, delay passed, not paid (waiting on bank, or today's job) | Earnings **"$77.06 is ready for you!"** |
| `pendingCents` = toShip + onTheWay + ready | everything earned but not in the bank | Dashboard "**$X waiting for you**", "Coming to you" stat |
| `paidOutCents` | sent to their bank | Dashboard and Earnings "Paid out" |
| `totalEarnedCents` | everything except refunds | Earnings "Total earned" |

Emails ("Someone ordered: you'll earn $X") use the order's own `payout_cents`, and any balance they mention comes from the same function.

**Rounding:** fee uses standard rounding of integer cents, done once per order (not per item), so totals always add up exactly.

---

## 8. Auth and roles

**One login system (Supabase Auth), three roles, all decided on the server:**

| Role | How we know | Where it's checked |
|---|---|---|
| Creator | signed in **and** has a `creators` row | `requireCreator()` in every dashboard query/action |
| Fan | signed in, no `creators` row | `getFanEmail()` for `/account` |
| Admin | signed-in email is in `ADMIN_EMAILS` | `requireAdmin()` in every admin query/action |

`proxy.ts` refreshes the session cookie on each request and does a *quick* redirect for `/dashboard/*` and `/admin/*` when there's no session. Following the Next 16 guidance, the real check happens again in the server code (proxy is not a security boundary).

### Sign-in methods

Two ways in, for creators and fans alike:

- **Google**: Supabase OAuth (`signInWithOAuth`), redirect back to `/auth/callback`. The in-app-browser warning (`google-button.tsx`) stays: Google blocks sign-in inside Instagram/TikTok's browser, so we point people to email there.
- **Email + password**:
  - **Sign up:** `supabase.auth.signUp({ email, password })` with "Confirm email" on. Supabase's *Confirm signup* email template shows the 6-digit code (`{{ .Token }}`) instead of a link. The person types it, `verifyOtp({ email, token, type: "email" })` confirms the address and signs them in.
  - **Sign in:** `signInWithPassword({ email, password })`. An unconfirmed email gets a fresh code (`auth.resend({ type: "signup", email })`) and goes to the code screen.
  - **Forgot password:** `resetPasswordForEmail(email)`, with the *Reset password* template showing the code. Then `verifyOtp({ email, token, type: "recovery" })` and `updateUser({ password })`, and they're signed in.

Why codes and not links: most people arrive from Instagram/TikTok in-app browsers. A link tapped in the Mail app opens Safari, so the session lands in the wrong browser. Typing a code keeps them where they started. The UI is already built (`components/auth/email-password.tsx`).

**Supabase Auth settings to set:**
- Confirm email: on.
- Email OTP length: `CODE_LENGTH` (6).
- OTP expiry: 10 minutes.
- Minimum password length: `MIN_PASSWORD_LENGTH` (8).
- Leaked-password protection: on (Pro plan).
- Custom SMTP through Resend (Supabase's built-in sender is rate-limited and not for production).
- Automatic identity linking, so an email used with Google and with a password is **one** account.
- If someone who only ever used Google tries a password, show "This email signs in with Google" (the error from `signInWithPassword` + an identities check).

### Creator sign-up flow

1. `/signup` → Google, or email + password → 6-digit code → signed in.
2. No `creators` row → `/onboarding`. There, one server action creates the row. It re-checks the handle (unique, reserved words) and **claims any pending fee rate for this email** (`pending_fee_rates` → `creators.fee_bps`), in one transaction.
3. Has a row → `/dashboard`.

`/login` is the same minus the code (unless the email was never confirmed). A signed-in person with no `creators` row always goes to onboarding.

### Fan account flow

- **"Save it to your account"** on the confirmation page: email is pre-filled from the order, they pick a password, type the code, done.
- **`/account`**: sign in (Google or email + password), or "Create an account" with the same code step.

Once signed in, `/account` lists orders by the verified email, including ones from before the account existed. **Checkout never requires an account.**

---

## 9. Checkout and payment flow

Our checkout page stays as designed. The fake card fields are replaced by Stripe's **Payment Element** (card, Apple Pay, Google Pay, Link), using Stripe's *create the payment on submit* flow. We only hold items once the fan presses Pay, not while they're typing.

```
Cart (browser: product ids + qty)
   │
   ▼
/checkout loads ──▶ getCheckoutLines(ids)  [server: fresh prices, availability, totals]
   │                  Payment Element shows the total; nothing is held yet
   ▼
Fan presses "Pay $X"
   │  1. elements.submit()  (Stripe checks the card form)
   │  2. startCheckout({ lines, email, name, shipTo })  [server action]
   │       in ONE transaction:
   │        - lock the product rows (SELECT … FOR UPDATE)
   │        - check each: available, creator active, units free = quantity − active reservations
   │        - check country is in SHIP_COUNTRIES
   │        - compute totals + fee snapshot (§7)
   │        - insert order (status = pending, code SF-XXXXX) + order_items
   │        - insert reservations (expires in RESERVATION_MINUTES)
   │       then create the PaymentIntent:
   │        amount = total, currency = usd, (no receipt_email: our E3 replaces Stripe's receipt),
   │        shipping = name + address, transfer_group = order.id,
   │        metadata = { order_id }, automatic_payment_methods on,
   │        idempotency key = order.id
   │       returns clientSecret + order code
   │  3. stripe.confirmPayment(clientSecret, return_url = /checkout/success?order=CODE)
   ▼
Declined? Show Stripe's message on our page. The reservation stays until it expires, so they can try another card.
Succeeded ──▶ /checkout/success?order=CODE
                 (reads the order from the DB; if the webhook hasn't landed yet,
                  checks the PaymentIntent status directly and shows "confirmed")
   ▼
Webhook payment_intent.succeeded ──▶ order paid (§11)
```

**Why an order row exists before payment:** the webhook then only has to flip `pending → paid` with a conditional update (`where status = 'pending'`). That's simple and naturally safe to run twice. Pending orders are invisible everywhere and get canceled by the daily cleanup.

**Edge case: the payment succeeds after the hold expired and someone else bought the item.** The webhook finds there isn't enough quantity, **refunds automatically**, marks the order `refunded` with reason "Sold to someone else while you were paying", and emails the fan. Rare, but it must be handled.

**Cart storage:** the cart stays in the browser (`localStorage`: ids and quantities only), since the server recomputes everything at checkout. **DECIDE** in §22 whether to also store it server-side.

---

## 10. Stripe Connect, payouts, refunds, chargebacks

### Connecting a bank

- "Connect your bank" → server action `startConnectOnboarding()`:
  - creates an **Express** account if the creator has none;
  - saves `stripe_account_id`;
  - creates an Account Link (return URL `/dashboard/earnings?connected=1`, refresh URL `/dashboard/earnings?retry=1`);
  - redirects to Stripe.
- `account.updated` (Connect webhook) sets `payouts_enabled` and `bank_last4` from the account's default external account.
- "Manage" on Earnings → `createLoginLink()` → Stripe Express dashboard.
- The fake `StripeDialog` in `earnings-view.tsx` is deleted.

### Payouts

The daily payout job (§12) finds orders that are:
- `shipped`,
- with `shipped_at` more than `PAYOUT_DELAY_DAYS` ago,
- from a creator with payouts enabled and an active page.

For each one it creates:

```
stripe.transfers.create({
  amount: payout_cents, currency: 'usd',
  destination: creator.stripe_account_id,
  transfer_group: order.id,
  source_transaction: order.stripe_charge_id,
}, { idempotencyKey: `payout-${order.id}` })
```

Then the job sets the order to `paid_out` (with `paid_out_at` and `stripe_transfer_id`) and writes an order event. No email in the MVP: the creator sees it on Earnings.

`source_transaction` ties the transfer to that fan's charge, so we never pay out money we haven't received.

**Money waiting on a bank:** when a creator connects, `account.updated` also **runs the payout job for that creator right away**. That matches the prototype's "Connected! $X is on its way to your bank."

### Refunds (always full)

- **Admin refund** or **auto-refund** → `stripe.refunds.create({ payment_intent, idempotencyKey: refund-${id} })`.
- If the order was already `paid_out`, first `transfers.createReversal(transfer_id)` to take the creator's share back (the admin dialog already says this).
- Then: order → `refunded`, put the item quantities back, move the product to **draft** (the creator decides whether to relist; matches "You can list the item again from Items"), write an event, and send E6 to the fan and E7 to the creator.
- Stripe doesn't return its fee on refunds. This shows up in "We keep".

### Chargebacks (disputes)

- `charge.dispute.created` → save the dispute on the order, add an event, and put it on admin Home's to-do list with a link to the dispute in Stripe.
- Responding happens in Stripe's dashboard (we only link to it).
- `charge.dispute.closed` → save the outcome.
- **DECIDE** in §22: if we lose a chargeback on an order already paid out, do we take it back from the creator?

### Canadian platform, US creators

The spec's Phase 0 flagged this, and you've done Stripe Connect before. Two things to confirm in the Stripe dashboard before Phase 4:
1. **Cross-border payouts** to US Express accounts. This uses the *recipient* service agreement with separate charges and transfers.
2. **A USD bank account on the Canadian Stripe account**, so USD charges stay in USD and USD transfers draw on that balance without conversion.

---

## 11. Webhooks

Two endpoints, both verify the Stripe signature. Each first inserts the event id into `stripe_events`. If it's already there, return 200 and do nothing.

**`/api/stripe/webhook`** (platform events)

| Event | What we do |
|---|---|
| `payment_intent.succeeded` | In a transaction: order `pending → paid` (conditional), set `paid_at` and `stripe_charge_id`, fetch the balance transaction for `stripe_fee_cents`, subtract product quantities, set `sold_out` + `sold_at` when a product hits 0, delete the order's reservations, add a `paid` event. Then, after the response (`after()`), email the fan's confirmation and the creator's "You made a sale". If quantity ran out (edge case, §9), refund instead. |
| `payment_intent.payment_failed` | Log only (the fan sees the error on the page). |
| `charge.refunded` | Sync in case a refund was made in the Stripe dashboard directly. |
| `charge.dispute.created` / `charge.dispute.closed` | §10. |

**`/api/stripe/connect-webhook`** (connected account events)

| Event | What we do |
|---|---|
| `account.updated` | Update `payouts_enabled` and `bank_last4`. If payouts just turned on, run payouts for that creator. |
| `payout.failed` | Show it on admin Home; admin contacts the creator by hand (automatic email is on the *later* list, §13). |

Pages that show products or orders are rendered fresh on each request (§18). A webhook doesn't need to clear any cache.

---

## 12. Scheduled jobs

One Vercel Cron entry calls `/api/cron/daily` (protected by `Authorization: Bearer CRON_SECRET`), which runs these **in order**. Each job records a row in `job_runs` and is safe to re-run.

| Job | Finds | Does |
|---|---|---|
| 1. `autoRefunds` | `paid` orders where `paid_at + SHIP_DEADLINE_DAYS + ship_extra_days < now` | Full refund (§10), item back to draft, E6 to the fan, E7 to the creator. |
| 2. `payouts` | §10 | Transfer, `paid_out`. |
| 3. `shipReminder` | `paid` orders whose ship-by date is `SHIP_REMINDER_DAYS_BEFORE` days away and `ship_reminder_sent_at` is empty | E8: "Ship Priya's polaroid by Oct 2." |
| 4. `cleanupPending` | `pending` orders older than the hold | Cancel the PaymentIntent, order → `canceled`, delete expired reservations. |

**Daily or hourly?** Vercel's Hobby plan only allows daily crons. Daily is enough for payouts (they're measured in days). Auto-refunds may happen up to a day late, which only favours the creator. **DECIDE** in §22.

---

## 13. Emails

**Decided for the MVP: 8 emails.** Everything in them is a variable from the database; nothing is typed in.

Two come from Supabase Auth, using its templates sent through Resend. Six are ours: React Email templates in `server/email/templates/`, sent with `sendEmail()`. That function writes an `email_log` row and runs after the response (`after()`), so pages stay fast. A failed email never undoes a payment or a refund.

| # | To | Email | Sent when | What's in it |
|---|---|---|---|---|
| E1 | Creator or fan | **Your sign-up code** | they sign up with email + password (and "Resend code") | 6-digit code (`{{ .Token }}`), expires in 10 minutes. Supabase *Confirm signup* template. |
| E2 | Creator or fan | **Your password reset code** | "Forgot password?" | 6-digit code. Supabase *Reset password* template. |
| E3 | Fan | **Order confirmed** | payment succeeds (webhook) | order code, items with photos, subtotal/shipping/total, "straight from @handle", ship-to address, "ships within `SHIP_DEADLINE_DAYS` days or you're refunded automatically", link to create an account (pre-filled email) |
| E4 | Creator | **Someone ordered** | payment succeeds (webhook) | items, **you'll earn `payout_cents`**, fan's name and ship-to address, ship-by date, "Add tracking" button → `/dashboard/orders`. If no bank connected: a "Connect your bank to get paid" block (this replaces separate bank reminders). |
| E5 | Fan | **Your item shipped** | creator (or admin) adds tracking | carrier, tracking number, **Track package** link (`CARRIERS[].track`; "Other" shows the number only), creator. Sent again if the tracking is changed later. |
| E6 | Fan | **You've been refunded** | any refund (auto, admin, or the sold-while-paying edge case) | amount, reason in plain words, "back on your card in 5–10 business days" |
| E7 | Creator | **Order refunded** | auto-refund (not shipped in time) or admin refund | item, amount, reason, "the item is back in your drafts; list it again anytime" |
| E8 | Creator | **Ship reminder** | daily job, `SHIP_REMINDER_DAYS_BEFORE` (2) days before the ship-by date, once per order | item, fan's first name, ship-by date, "Add tracking" button, "after that the fan is refunded automatically" |

**Admin "Resend"** on an order re-sends E5 if it has tracking, otherwise E3.

**Turn off Stripe's receipt emails.** Don't set `receipt_email` on the PaymentIntent, and switch off "Successful payments" emails in Stripe settings. E3 is the receipt, so fans don't get two.

**Later (not in the MVP)**, each easy to add because `sendEmail()` and the data already exist:
- creator welcome / "your page is live"
- payout sent (Earnings shows it)
- bank reminders when money is ready (the E4 block covers the key moment)
- separate "tracking updated" (E5 is re-sent instead)
- ship-by date extended
- fee change notice (see `setPlatformFee`, §17)
- payout failed
- admin alerts for new reports (admin Home shows them; Stripe already emails you about chargebacks)

---

## 14. Images

- **Bucket:** `media` (public read). Paths: `avatars/{creatorId}/{uuid}.jpg`, `products/{productId}/{uuid}.jpg`. The database stores **paths**. `publicUrl(path)` builds the URL, so moving storage later is one change.
- **Upload:** the browser already resizes to 1200px JPEG (`lib/image-resize.ts`). Then:
  - `createUploadUrl()` server action checks ownership, content type and size, and returns a signed upload URL;
  - the browser uploads directly to Storage (the image never passes through our server);
  - saving the item stores the paths and order.
- **Deleting a photo** (creator or admin "Remove photo") deletes the row and the file. Removing the last photo of a live item moves it to draft (already built into the admin).
- **Display:** `next/image` with the Supabase storage host added to `remotePatterns` in `next.config.ts`.
- **Order snapshots** keep `image_path`. Photos used by paid orders are **not** deleted when a creator edits the item, so old orders keep their picture. They're deleted when no order uses them.

---

## 15. Every screen: what it reads, what it writes

| Route | Reads (server) | Writes (server actions) | Notes |
|---|---|---|---|
| `/` | session role (for header buttons) | none | Static marketing otherwise. |
| `/[handle]` | `getPublicCreator(handle)`, `getPublicProducts(creatorId)` incl. sold, live feed data (newest listed, latest sold, low stock, sold count) | none | 404 if hidden. `liveFeed()` stays as is and uses `published_at`/`sold_at`. |
| `/[handle]/[slug]` | product + images + creator, "more from" | `submitReport()` (replaces mailto) | Buy box shows "Someone is paying for this" when all units are reserved. |
| `/cart` | `getCheckoutLines(ids)` | none | Cart ids live in the browser. |
| `/checkout` | `getCheckoutLines(ids)` | `startCheckout()` | §9 |
| `/checkout/success` | `getOrderForConfirmation(code, paymentIntentSecret)` | sign up (email + password → code) | Replaces `last-order.ts` (sessionStorage). |
| `/account` | fan's orders by email | sign in / sign up / forgot password, `signOut()` | |
| `/login`, `/signup` | none | sign in / sign up / forgot password (Supabase Auth from the browser, §8) | UI already built. |
| `/onboarding` | `checkHandle()` while typing | `completeOnboarding()` | Claims a pending fee rate. |
| `/dashboard` | profile, `getCreatorBalances()`, orders to ship, live item count | `dismissBankCard()` | |
| `/dashboard/items` | creator's products (all statuses) | `setProductStatus()`, `deleteDraft()` | |
| `/dashboard/items/new`, `/[id]` | product + images, **effective fee rate** | `createUploadUrl()`, `saveProduct()` | "You'll earn" uses the creator's rate from the DB. |
| `/dashboard/orders` | creator's orders with items and ship-to | `markShipped()`, `updateTracking()` | |
| `/dashboard/earnings` | `getCreatorBalances()`, per-order payout list, bank status | `startConnectOnboarding()`, `openStripeDashboard()` | Fee line reads the creator's effective rate. |
| `/dashboard/settings` | profile, bank status, live feed | `updateProfile()`, avatar upload, `signOut()` | Handle is read-only (already built). |
| `/admin` | `needsAttention()`, open reports, 4 numbers, `creatorsToNudge()` | `resolveReport()` | |
| `/admin/orders`, `/[code]` | order list with search + filters, order + items + events | `adminRefund()`, `extendShipBy()`, `adminSetTracking()`, `resendEmail()` | |
| `/admin/creators`, `/[id]` | creator list with stats + next step, creator detail | `setCreatorStatus()`, `removeBio()`, `removeAvatar()`, `changeHandle()`, `addNote()`, `setItemStatus()`, `removePhoto()`, `setCreatorFee()` | |
| `/admin/fees` | settings, creators with own rate, pending email rates | `setPlatformFee()`, `setCreatorFee()`, `clearCreatorFee()`, `setPendingFee()`, `clearPendingFee()` | |
| `/admin/activity` | `audit_log` newest first | none | |

**Admin order URLs** keep using the order code (`/admin/orders/SF-1JV7M`). It's unique, readable and safe to put in a URL.

---

## 16. Server actions (all writes)

Every action follows the same pattern:

```
'use server'
1. auth:      requireCreator() / requireAdmin() / public (checkout, reports)
2. validate:  zod schema; re-check business rules on the server
3. write:     one transaction when touching several rows
4. record:    order_events and/or audit_log
5. side effects after the response: emails (after())
6. refresh:   refresh() so the page shows the new data
7. return:    { ok: true, ... } | { ok: false, error: "human sentence" }
```

The UI already shows success toasts. It just needs to also show `error` when `ok` is false.

**Creator**

| Action | Rules checked on the server |
|---|---|
| `checkHandle(h)` | format, reserved words, taken. Read-only, called while typing. |
| `completeOnboarding(profile)` | handle free (again), age box ticked, name present, bio ≤ `BIO_MAX`, socials cleaned (`normalizeUsername`). Claims a pending fee. |
| `updateProfile(patch)` | handle **cannot** change. Same limits. |
| `createUploadUrl(kind, id)` | owns the product/profile; jpeg/png/webp; ≤ 5 MB; photo count ≤ `MAX_PHOTOS`. |
| `saveProduct(input, status)` | owns it; not sold out; publishing needs ≥1 photo, title, price ≥ `MIN_PRICE_CENTS`, shipping ≥ 0; story ≤ `STORY_MAX`; quantity ≥ 1; slug made unique on create only; sets `published_at` on first publish. |
| `setProductStatus(id, draft/available)` | owns it; can't publish a hidden-by-admin item (admin hides → status `hidden`; creator can't flip it back). |
| `deleteDraft(id)` | draft only and never ordered. |
| `markShipped(orderId, carrier, tracking)` | owns the order; status `paid`; tracking ≥ 4 chars. Sets `shipped_at`, sends E5. |
| `updateTracking(orderId, …)` | status `shipped`/`paid_out`. Re-sends E5 with the new link. |
| `startConnectOnboarding()` / `openStripeDashboard()` | §10 |
| `dismissBankCard()` | sets `bank_card_dismissed_at` |

**Fan / public**

| Action | Rules |
|---|---|
| `getCheckoutLines(ids)` | read-only; returns current price, shipping, units free, state `ok / sold / on_hold`, totals. Same shape as today's `buildCart()`. |
| `startCheckout(input)` | §9. Rate-limited per IP. |
| `submitReport(input)` | rate-limited; message length; creates `reports` row (shows on admin Home; no email). |
| Auth (sign up, verify code, resend code, sign in, forgot/reset password) | Called from the browser with the Supabase client, not our own actions. Supabase rate-limits them; we add per-IP limits for sign-up. |

**Admin**: §17.

---

## 17. Admin backend

Every admin query and action starts with `requireAdmin()`. Every admin action writes an `audit_log` row with the same human sentence the prototype shows (e.g. "Refunded SF-7Q2KD in full ($40): Creator can't ship it").

| Admin action | Effect |
|---|---|
| `adminRefund(code, reason)` | §10 refund flow, E6 and E7 |
| `extendShipBy(code, days)` | `ship_extra_days += days`, event. No email in the MVP (admin tells the creator). |
| `adminSetTracking(code, carrier, number)` | as creator's `markShipped`/`updateTracking` |
| `resendEmail(code)` | E5 if tracking exists, else E3 |
| `setCreatorStatus(id, hidden/active, reason)` | hiding hides the page and all items from fans; open orders still shippable |
| `removeBio(id)` / `removeAvatar(id)` | clears field / deletes file |
| `changeHandle(id, newHandle, reason)` | same handle rules; old link 404s |
| `addNote(id, text)` | `creator_notes` |
| `setItemStatus(productId, hidden/available)` | admin hide/unhide |
| `removePhoto(productId, imageId)` | delete image; live item with none left → draft |
| `resolveReport(id, hide/no_action)` | closes report; optionally hides item/page in the same transaction |
| `setPlatformFee(bps)` | updates `platform_settings`. The fee-change email is on the *later* list, so the prototype's "Email those creators" checkbox is dropped for now; admin tells creators by hand. |
| `setCreatorFee(id, bps, note)` / `clearCreatorFee(id)` | `creators.fee_bps` |
| `setPendingFee(email, bps, note)` / `clearPendingFee(email)` | `pending_fee_rates` |

**Admin reads** (`server/queries/admin.ts`) reproduce the prototype's derived helpers, now as SQL:
- `needsAttention()`: open disputes, `paid` orders within 2 days of ship-by, failed payouts;
- open reports;
- Home numbers (creators, orders this week, sales, **we keep** from real Stripe fees);
- `creatorsToNudge()`: next step per creator (no live item → no sale → no bank). Same logic as `creatorNextStep()`;
- lists with search (name/handle/email prefix, order code, fan email).

---

## 18. Security and privacy

- **RLS on, no public policies**, on every table. Only the server's database connection reads/writes.
- **Authorization in one place** (`server/auth.ts`). Every query that returns private data takes the creator id from the session, never from the request.
- **Fan addresses** are only returned to that order's creator and to admin. Public queries select explicit columns, never `*`.
- **Prices from the server only.** `startCheckout` ignores any price sent by the browser.
- **Webhook signatures** verified; **cron** protected by secret; **admin** by email allowlist on the server.
- **Rate limits** (simple Postgres-backed or Upstash): checkout start, report form, sign-in emails, handle check.
- **No personal data in URLs** (order code only; the success page double-checks with the PaymentIntent secret or the session).
- **Uploads**: signed URLs, type and size checked, stored under the owner's id.
- **Caching:** public pages render fresh on every request for now (no `'use cache'`), so a sold item can never show as available. With 10–100 creators this is fast. Caching can come later with `cacheTag`/`revalidateTag`.
- **Backups:** Supabase daily backups (Pro plan adds point-in-time recovery; worth it once real money flows).

---

## 19. Replacing the prototype, file by file

| Prototype file | Becomes |
|---|---|
| `lib/mock-data.ts` | `server/db/seed.ts` (dev/staging sample data only) |
| `lib/data.ts` | same function names, bodies call `server/queries/*` |
| `lib/creator-store.ts` | server queries + actions. `balances()` → `getCreatorBalances()`. `CARRIERS`, `fmtDate`, `slugify` move to `lib/` (shared). |
| `lib/fan-store.ts` | `getFanOrders()` query + auth |
| `lib/last-order.ts` | `getOrderForConfirmation()` |
| `lib/admin-store.ts` | `server/queries/admin.ts` + `server/actions/admin.ts`. Derived helpers (`orderLabel`, `creatorNextStep`, `payoutState`) stay as pure functions over DB rows. |
| `lib/platform-store.ts` | `platform_settings`, `creators.fee_bps`, `pending_fee_rates` |
| `lib/local-store.ts` | deleted |
| `lib/cart.tsx` | stays (browser cart of ids); `buildCart` → `getCheckoutLines` |
| `lib/cart-view-model.ts` | server version of the same maths |
| `lib/fees.ts` | pure helpers stay; defaults move to config/DB; Stripe estimate removed |
| `components/checkout-view.tsx` | card fields → Payment Element; submit → `startCheckout` |
| `components/creator/earnings-view.tsx` | `StripeDialog` → real Connect redirect |
| `components/creator/*` using `useCreatorState()` | receive data as props from server pages, call actions |
| `components/admin/*` using `useAdmin()` | same: props from server pages, actions for writes |

**How the client components change:** each page becomes a small server component that loads data and passes it into the existing client component. For example:

```tsx
// app/dashboard/earnings/page.tsx
export default async function Page() {
  const creator = await requireCreator();
  const [balances, payouts, feeBps] = await Promise.all([
    getCreatorBalances(creator.id), getPayoutRows(creator.id), getEffectiveFeeBps(creator.id),
  ]);
  return <EarningsView balances={balances} payouts={payouts} bank={creator.bank} feeBps={feeBps} />;
}
```

`EarningsView` keeps its markup and swaps `useCreatorState()` for props.

---

## 20. Build phases

Each phase ends with a working, testable slice. We present a short plan before each phase (our working rule).

**Phase 1: Foundation**
- Supabase projects (dev + prod), Drizzle schema and migrations (§6), `config.ts`, env vars, `server/` skeleton, seed script with the prototype's sample data, Sentry.
- Swap the hardcoded rule values in copy for config constants (§3).
- ✅ `npm run db:migrate && npm run db:seed` gives a database that looks like the prototype.

**Phase 2: Auth and pages**
- Supabase Auth (Google, email + password, 6-digit codes for sign-up and password reset), `proxy.ts`, `/auth/callback`, onboarding with pending-fee claim, `requireCreator/requireAdmin`.
- Public creator and item pages and the dashboard read from the DB. Item CRUD with Storage uploads. Settings.
- ✅ A new creator signs up on a phone, builds a page, publishes an item with photos, and a logged-out visitor sees it.

**Phase 3: Checkout**
- `getCheckoutLines`, `startCheckout` with reservations, Payment Element, webhook (`payment_intent.succeeded`), success page from DB, E3 and E4, fan account order history. (E1 and E2 come with Phase 2's auth.)
- ✅ Test-mode purchase end to end (card, Apple Pay). Two people can't buy the last unit. A declined card leaves the item held, then free after the hold. A duplicate webhook changes nothing.

**Phase 4: Shipping, Connect and money**
- Mark shipped / edit tracking (E5).
- Express onboarding, `account.updated`, `getCreatorBalances` on Dashboard and Earnings.
- Daily cron: payouts, auto-refunds, reminders, cleanup. Refund flow with transfer reversal. E6, E7 and E8.
- ✅ In test mode, with Stripe test clocks or by back-dating rows:
  - a shipped order pays out after the delay, only once a bank is connected;
  - an unshipped order refunds after the deadline;
  - re-running the cron changes nothing;
  - the numbers on Dashboard, Earnings and in E4 match.

**Phase 5: Admin**
- Admin queries and actions (§17), `audit_log`, report form on item pages, dispute webhooks, fee settings from DB. Admin resend (E3/E5) and refund (E6/E7) reuse the existing emails.
- ✅ Every admin button works against real data and shows in the activity log; a 0% creator's next order has `fee_cents = 0`.

**Phase 6: Launch checks**
- Terms and Privacy pages.
- Test the full flow inside the Instagram and TikTok in-app browsers.
- Error and empty states for every action.
- Switch Stripe to live keys, custom email domain (SPF/DKIM), backups.
- A first real purchase with a friendly creator.
- ✅ The spec's §14 "how we'll know it works" can be measured from admin Home.

---

## 21. Testing

- **Unit tests (Vitest):** `money.ts` (fees, rounding, 0% rate, multi-item shipping), `getCreatorBalances` mapping, handle rules, `creatorNextStep`, carrier URLs.
- **Integration tests** against a local Supabase (`supabase start`):
  - checkout reservation race (two parallel `startCheckout` for the last unit);
  - webhook idempotency (send the same event twice);
  - cron re-runs.
- **Stripe CLI** (`stripe listen --forward-to …`) for webhooks in dev; **test clocks** for payout/refund timing.
- **Manual phone script** per phase, from an Instagram DM link.

---

## 22. Values and decisions for our discussion

My recommendation is in the right-hand column. These are the "values" to settle before or during Phase 1.

### Numbers and rules

| Value | Prototype uses | Recommendation |
|---|---|---|
| Platform fee | 4.9% (decided) | Keep. |
| **Who pays Stripe's card fee** (≈2.9% + 30¢) | We do (admin shows "We keep" going negative with 0% creators) | **DECIDE.** Options: (a) we absorb it (simple, costly at 4.9%); (b) creator pays it on top of our fee; (c) we absorb it except for 0% creators, who pay Stripe's fee. I lean (c). |
| Days to ship before auto-refund | 7 | Keep 7. |
| Days after shipping before payout | 7 | Keep 7. It covers most chargeback-for-non-delivery windows early on. |
| Checkout hold | 30 min | **15 min.** With our own page the fan is already at the Pay step when the hold starts. |
| Default shipping | $20 | Keep. |
| Minimum price | $1 | $5. Stripe's 30¢ makes tiny orders lose money. |
| Maximum price | none | $5,000 cap at launch (limits fraud exposure); raise per creator on request. |
| Photos per item | 1–8 | Keep. |
| Ship-to countries | US, Canada | Keep. |
| Creator countries | US, Canada | Keep (depends on Stripe cross-border setup, §10). |
| Ship reminders | spec: day 3 and 5 | **Decided:** one reminder, 2 days before the deadline (E8). |
| Bank reminders | not built | **Decided:** not in the MVP; the "Someone ordered" email (E4) carries the connect-your-bank nudge. |

### Policies

| Question | Recommendation |
|---|---|
| **Chargeback lost after payout**: take it back from the creator? | Yes for "item not received" when there's no tracking; no when tracking shows delivered. Decide case by case in admin at first. |
| **Refund after payout**: take it back from the creator? | Yes (the admin dialog already says so). Stripe allows the reversal even if their balance goes negative, which they cover from future sales. |
| **Unclaimed money** (shipped, never connected a bank) | Admin reaches out personally (admin Home's "Creators to nudge" lists them); decide a cut-off, e.g. 90 days. Ask an accountant about holding funds in Canada. |
| **Sales tax** | Out of MVP scope. Revisit with Stripe Tax before volume. |
| **Item after auto-refund** | Back to draft, creator relists (matches current copy). |

### Approach

| Question | Recommendation |
|---|---|
| Cart: browser only, or also saved on the server? | **Browser only** for MVP. Server recomputes everything. Revisit if fans lose carts in in-app browsers. |
| Address form: ours, or Stripe's Address Element? | **Keep ours** (already designed, matches the page). Add Google Places autocomplete later if typos cause returns. |
| Sign-in method | **Decided:** Google, or email + password with a 6-digit code to verify the email and to reset a password. |
| Cron: daily (Vercel Hobby) or hourly (Pro)? | **Daily** to start; Pro when we need faster refunds or reminders. |
| Supabase plan | Free for dev; **Pro for production** (backups, no pausing). |
| Email provider | Resend (spec suggested it; confirm). Sending domain `mail.straightfrom.co`. |
| Error tracking | Sentry free tier. |
| One admin now, how to add a second later | `ADMIN_EMAILS` is already a list. Adding someone is one env change. |
