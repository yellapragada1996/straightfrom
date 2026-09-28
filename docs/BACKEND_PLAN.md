# StraightFrom: Backend Plan

*Written 2026-09-27 and revised the same day after a review (payments simplified and made crash-safe). Based on a full read of the clickable prototype on the `prototype` branch and the original spec (`STRAIGHTFROM_SPEC.md`).*

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
| Payments | Stripe Checkout | **Kept deliberately basic:** cards and Link only, full refunds only, one payout per order, hourly jobs. Every money step is written so a crash or a retry can never charge, refund or pay twice (§2 rule 7). |

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
7. **Every money step survives a crash or a second run.** The pattern is always the same:
   - **claim** the order with a conditional update (e.g. `paid → refunding`, which only succeeds once);
   - call Stripe with an **idempotency key**;
   - **record** the result.

   If we crash in the middle, the order stays claimed and the next hourly run finishes it. Webhooks mark an event as done only in the same transaction as its work (§11).
8. **The database is locked to the outside.** Row Level Security is on for every table with no public policies. Only our server (Drizzle, service connection) reads and writes. The public Supabase key can do auth and nothing else.
9. **Payments stay basic for the MVP.** Cards and Link only, full refunds only, one creator per order, one transfer per order. No clawbacks, reserves, partial refunds, saved cards or tax. Each of those is a new way for money to go wrong; they wait until customers ask.

---

## 3. Hardcoded values found in the prototype

Money amounts are **not** hardcoded anywhere. Every dollar figure on screen is calculated from order and product data. What *is* hardcoded is rules, timings, countries and contact details written straight into copy. Each one moves into `src/config.ts` (or the database, for things admin can change).

| Value | Where it's written today | Becomes |
|---|---|---|
| **4.9%** platform fee | `lib/fees.ts` (`DEFAULT_FEE_BPS`), prototype store | `platform_settings.fee_bps` (DB, admin-editable). `DEFAULT_FEE_BPS` is only the seed value. |
| **7 days** to ship | `buy-box.tsx:131`, `cart-view.tsx:101`, `checkout-view.tsx:242`, `order-confirmation.tsx:34,36`, `how-it-works.tsx:5`, `[handle]/[slug]/page.tsx:46`, `dashboard-home.tsx:109` | `SHIP_DEADLINE_DAYS` |
| **7 days** until payout | `earnings-view.tsx:124`, `item-editor.tsx:200`, `admin/orders.tsx:231` | `PAYOUT_DELAY_DAYS`. Copy also changes from "paid to your bank" to "sent" (§10). |
| **30 minutes** hold during checkout | `buy-box.tsx:116`, `cart-view.tsx:129` | `RESERVATION_MINUTES` (recommend 15, §22) |
| **$20** default shipping | `item-editor.tsx:17` | `DEFAULT_SHIPPING_CENTS` |
| **$1** minimum price | `item-editor.tsx:58` | `MIN_PRICE_CENTS` (validated on the server too) |
| **8** photos max | `photo-uploader.tsx:9` | `MAX_PHOTOS` |
| **160** bio length | `onboarding.tsx:20`, `settings-view.tsx:14` | `BIO_MAX` |
| **1000** story length | `item-editor.tsx:18` | `STORY_MAX` |
| **US and Canada** | `checkout-view.tsx:174`, `mock-data.ts` (`SHIPS_TO`) | `SHIP_COUNTRIES` (also restricts the address form and Stripe) |
| Code length, resend wait, password length | `config.ts` (already created) | `CODE_LENGTH = 6`, `RESEND_CODE_SECONDS = 60` (Supabase allows one code per 60 s by default; was 30, fixed), `MIN_PASSWORD_LENGTH = 8` |
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
| Hosting | **Vercel Pro** | Required: Vercel's Hobby plan is for non-commercial use only, and any site that takes payments is commercial. Pro also allows an hourly cron. |
| Database | Supabase Postgres | One project for production and one for staging/dev. |
| ORM | Drizzle + `postgres` driver | Use Supabase's **transaction pooler** URL at runtime with `prepare: false`. Use the direct URL for migrations. |
| Auth | Supabase Auth via `@supabase/ssr` | Google OAuth, and **email + password** with a **6-digit code** to confirm the email and to reset a password. |
| Files | Supabase Storage | One public bucket for photos. Uploads go through signed URLs. |
| Payments | Stripe: Payment Element + Connect Express | Separate charges and transfers. |
| Email | Resend + React Email | Also used as Supabase Auth's SMTP, so verification and reset codes come from our domain and look like ours. |
| Jobs | Vercel Cron | One **hourly** route that runs every job in order (§12). |
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
EMAIL_FROM="StraightFrom <orders@mail.straightfrom.co>"   # sending domain mail.straightfrom.co
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
      client.ts  payments.ts  connect.ts  transfers.ts  refunds.ts   # refundOrder() lives here (§10)
    email/
      outbox.ts             # queueEmail() inside transactions, sendQueued() after commit / hourly
      templates/*.tsx       # React Email templates (§13)
    jobs/
      finishRefunds.ts  autoRefunds.ts  payouts.ts  shipReminder.ts  cleanupPending.ts
      sendEmails.ts  fillStripeFees.ts  privacyCleanup.ts
  app/
    api/stripe/webhook/route.ts
    api/stripe/connect-webhook/route.ts
    api/cron/hourly/route.ts
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
product_status:  draft | available | sold_out
order_status:    pending | paid | shipped | paid_out | refunding | refunded | canceled
stripe_status:   none | pending | active | action_needed
event_actor:     fan | creator | system | admin
carrier:         canada_post | purolator | usps | ups | fedex | dhl | other
report_status:   open | resolved
report_target:   item | creator
```

`reserved` is **no longer a stored product status**. An item is "being paid for right now" when all of its units are held by active reservations. It's calculated (see `reservations`), so a stuck status can never block an item. UI that reads `status === "reserved"` today moves to the calculated value:
- `buy-box.tsx`;
- `lib/cart-view-model.ts` (`on_hold`);
- `items-list.tsx` (`tabOf`);
- `dashboard-home.tsx` (live count);
- the `ProductStatus` type.

**Admin hiding is a separate flag** (`admin_hidden`), not a status. Unhiding then returns the item to exactly what it was; the prototype's "unhide → available" would have made a sold-out item buyable again.

`refunding` is a short-lived internal status while a refund is in progress (§10); screens treat it like refunded.

`pending` orders are checkouts that started but haven't been paid yet. `canceled` orders are ones where the fan never finished paying (their personal data is erased after 7 days). Neither ever appears on creator screens, fan screens or totals.

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
| country | text null | `US` / `CA`, asked when they connect a bank (Stripe needs it) |
| stripe_status | stripe_status | from `account.updated` (§10) |
| bank_last4 | text null | from the account's external bank account, for "ending 4821" |
| bank_card_dismissed_at | timestamptz null | the dismissible "connect your bank" card |
| last_active_at | timestamptz | touched at most hourly when they use the dashboard |
| timezone | text | from the browser at onboarding; ship-by dates are end of day in this zone |
| terms_version, terms_accepted_at | text, timestamptz | which Terms they agreed to at sign-up, and when |

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
| admin_hidden | bool default false | admin kill switch, separate from status |
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
| transfer_reversal_id | text null | when a refund after payout could be taken back |
| we_covered_cents | int default 0 | a refund or lost dispute after payout that we paid ourselves |
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

**`reservations`** (holds items while a fan pays): id, order_id (the pending order), product_id, quantity, `expires_at`. Units available to buy = `products.quantity − sum(active reservations)`, where "active" means `expires_at > now()`. Expired rows are simply ignored, so **no job is needed to release them**. The hourly `cleanupPending` job deletes old rows.

**`platform_settings`** (single row, `id = 1`): `fee_bps` (seeded 490), `updated_at`, `updated_by`.

**`pending_fee_rates`** (a rate agreed before sign-up): `email` pk (lowercase), fee_bps, note, created_at, `claimed_by_creator_id`, `claimed_at`.

**`reports`**: id, `code` (`R-104`), target (`report_target`), product_id null, creator_id, reason, message, reporter_email, status, resolution, resolved_at.

**`creator_notes`** (admin-only notes): id, creator_id, body, created_at.

**`audit_log`** (admin activity log, append-only): id, at, actor_email, `action` (machine key like `order.refund`), `summary` (the sentence shown in the log), target_type, target_id, `data` jsonb.

**`email_outbox`**: id, template, to, data jsonb, order_id null, creator_id null, status (`queued` / `sent` / `failed`), attempts, last_error, resend_id, sent_at. Emails are queued in the same transaction as the change that causes them, then sent (§13). It doubles as the log: "did the fan get the tracking email?"

**`stripe_events`** (webhook de-duplication): `id` pk (Stripe event id), type, received_at, processed_at.

**`job_runs`**: id, job, started_at, finished_at, ok, summary jsonb.

**`retired_handles`**: handle pk, creator_id, retired_at. When admin changes someone's link, the old handle goes here and can never be claimed again, so nobody can take over traffic from old bios and videos.

**`rate_limits`**: key (e.g. `checkout:ip`), window_start, count. A tiny fixed-window counter for our own endpoints (§18).

### Fans

There is **no fans table**. A fan account is a Supabase auth user with no `creators` row. Their order history is `orders where lower(fan_email) = their verified email and status in (paid, shipped, paid_out, refunded)`. That's how orders placed before sign-up appear automatically, which is the behaviour we designed.

### Indexes

`creators(handle)`, `orders(status)` (for jobs), `email_outbox(status)`, `products(creator_id, status)`, `products(creator_id, slug)` unique, `orders(creator_id, status)`, `orders(lower(fan_email))`, `orders(status, paid_at)`, `orders(status, shipped_at)`, `reservations(product_id, expires_at)`, `order_events(order_id, at)`, `reports(status)`.

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
we_keep = Σ fee_cents        (shipped or paid-out orders; unshipped ones may still refund)
        − Σ stripe_fee_cents (every charged order, refunded too; Stripe keeps its fee on refunds)
        − Σ we_covered_cents (refunds/disputes after payout that we paid)
```

Not included: Connect's own costs (a monthly fee per active creator account, per-payout and cross-border fees). Check them in Stripe's dashboard monthly, and against current Connect pricing before agreeing to more 0% deals (§22).

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
from orders where creator_id = :id   -- refunding/refunded/pending/canceled never counted
```

The "Next: $X on Oct 3" line on Earnings comes from a second tiny query: the earliest `shipped` order still inside the delay, with its `payout_cents`.

It returns the **same field names the prototype's `balances()` uses today**, so the screens change very little:

| Field | Meaning | Shown on |
|---|---|---|
| `toShipCents` / count | paid, not shipped yet | Dashboard "To ship", Earnings "Ship N orders to get $X on its way" |
| `onTheWayCents` | shipped, inside the payout delay | Earnings "Coming to you", next payout date |
| `readyCents` | shipped, delay passed, not paid yet (waiting on a bank, or the next hourly run) | Earnings **"$77.06 is ready for you!"** |
| `pendingCents` = toShip + onTheWay + ready | everything earned but not in the bank | Dashboard "**$X waiting for you**", "Coming to you" stat |
| `paidOutCents` | sent to their bank | Dashboard and Earnings "Paid out" |
| `totalEarnedCents` | everything except refunds | Earnings "Total earned" |

Emails ("Someone ordered: you'll earn $X") use the order's own `payout_cents`, and any balance they mention comes from the same function.

**Rounding:** fee uses standard rounding of integer cents, done once per order (not per item), so totals always add up exactly.

---

## 8. Auth and roles

**One login system (Supabase Auth). Roles are decided on the server, and one person can have several:**

| Role | How we know | Where it's checked |
|---|---|---|
| Anyone signed in | a session | `/account` shows the orders for their verified email, **creators included** (creators buy things too) |
| Creator | signed in **and** has a `creators` row | `requireCreator()` in every dashboard query/action |
| Admin | signed-in email is in `ADMIN_EMAILS` | `requireAdmin()` in every admin query/action |

**Where sign-in sends you:**
- **`/login` and `/signup` are the creator doors.** After sign-in: has a `creators` row → `/dashboard`, otherwise → `/onboarding`.
- **Fans sign in on `/account` or the confirmation page** and stay there. They're never sent to onboarding.
- **Admin signs in on `/admin`.** A non-admin email there sees "no access" and nothing else.

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
- **CAPTCHA on sign-up and password reset** (Supabase's built-in Cloudflare Turnstile support). Auth calls go straight from the browser to Supabase, so our server can't rate-limit them. Supabase's own limits plus the CAPTCHA cover this.
- Resend-code wait: 60 seconds, matching Supabase's default (`RESEND_CODE_SECONDS`).

**Signing up with an email that already has an account:** Supabase deliberately sends no new code (so outsiders can't test which emails exist), which would leave the person waiting forever. So the code screen always says: *"Already have an account with this email? Sign in instead"* with a link. This is common for fans who later become creators.

### Creator sign-up flow

1. `/signup` → Google, or email + password → 6-digit code → signed in.
2. No `creators` row → `/onboarding`. There, one server action creates the row. It re-checks the handle (unique, reserved words, not a retired handle), saves the browser's time zone and the Terms version they accepted, and **claims any pending fee rate for this verified email** (`pending_fee_rates` → `creators.fee_bps`), in one transaction.
3. Has a row → `/dashboard`.

`/login` is the same minus the code (unless the email was never confirmed).

### Fan account flow

- **"Save it to your account"** on the confirmation page: email is pre-filled from the order, they pick a password, type the code, done.
- **`/account`**: sign in (Google or email + password), or "Create an account" with the same code step.

Once signed in, `/account` lists orders by the verified email, including ones from before the account existed. **Checkout never requires an account.**

---

## 9. Checkout and payment flow

**Payment methods: cards and Link only.** Apple Pay and Google Pay are cards, so they're included. No bank debits, no buy-now-pay-later: those confirm days later and can still fail after the creator has shipped. Set `payment_method_types: ['card', 'link']` on the Payment Element and the PaymentIntent.

Our checkout page stays as designed. The fake card fields become Stripe's **Payment Element**, using Stripe's *create the payment on submit* flow. Items are held only once the fan presses Pay.

```
Cart (browser: product ids + qty)
   │
   ▼
/checkout loads ──▶ getCheckoutLines(ids)   [server: fresh prices, availability, total]
   │                 Payment Element is created with that total. Nothing is held yet.
   ▼
Fan presses "Pay $X"
   │  1. elements.submit()   (Stripe checks the card form)
   │  2. startCheckout({ lines, expectedTotal, email, name, shipTo })   [server action]
   │       in ONE transaction:
   │        a. if this browser already has a pending order (httpOnly cookie `sf_checkout`),
   │           release it: cancel its PaymentIntent, delete its holds, mark it canceled.
   │           (A reload or second try never blocks the fan's own item.)
   │        b. lock the product rows (SELECT … FOR UPDATE)
   │        c. check each: live, not admin-hidden, creator active,
   │           units free = quantity − active holds; country in SHIP_COUNTRIES
   │        d. compute totals + fee snapshot (§7).
   │           If total ≠ expectedTotal → return "Prices changed". The page refreshes
   │           the summary and the Payment Element amount; the fan presses Pay again.
   │        e. insert order (status pending, code SF-XXXXX) + order_items + holds
   │           (expire in RESERVATION_MINUTES); set the `sf_checkout` cookie
   │       then create the PaymentIntent (idempotency key = order.id):
   │        amount = total, currency = usd, payment_method_types = card + link,
   │        shipping = name + address, transfer_group = order.id,
   │        metadata = { order_id }, statement_descriptor_suffix = creator handle,
   │        no receipt_email (E3 is the receipt)
   │       returns clientSecret + order code
   │  3. stripe.confirmPayment(clientSecret, return_url = /checkout/success?order=CODE)
   ▼
Declined? Show Stripe's message. The fan retries with the SAME clientSecret:
same order, same hold. No new order is created.
Succeeded ──▶ /checkout/success?order=CODE
                (reads the order; if the webhook hasn't landed yet, it checks the
                 PaymentIntent status directly and shows "confirmed")
   ▼
Webhook payment_intent.succeeded ──▶ order paid (§11)
```

**Why an order row exists before payment:** the webhook only has to move `pending → paid`, which is simple and safe to repeat. Pending orders never appear on any screen or in any total.

**Why a late payment can't create a "paid but canceled" order:** the cleanup job (§12) cancels the PaymentIntent in Stripe **first** and only marks the order canceled if Stripe agrees. A canceled PaymentIntent can never succeed. If Stripe says it already succeeded, the job leaves the order alone and the webhook finishes it.

**Edge case: paid after the hold expired, and someone else bought the last unit.** The webhook sees there isn't enough stock and refunds in full (§10, reason "Sold to someone else while you were paying"). Rare, but handled.

**Cart storage:** browser only (`localStorage`, ids and quantities). The server recomputes everything at checkout.

**Deliberately not in the MVP:** manual capture, saved cards, partial refunds, discount codes, sales tax, multiple creators per order.

---

## 10. Stripe Connect, payouts, refunds, chargebacks

### Stripe account setup (Phase 0, before any code)

Do these in the Stripe dashboard, then prove them with one test-mode transfer to a US Express account:

1. **Connect with Express accounts, full service agreement.** Not the *recipient* agreement: Stripe doesn't allow cross-border payouts to recipient accounts. A Canadian platform can pay US connected accounts with separate charges and transfers, as long as we don't use `on_behalf_of`.
2. **A USD bank account on the platform**, so USD charges settle in USD and USD transfers draw on that balance with no conversion.
3. **Platform payouts set to manual.** This one matters. We pay creators 7+ days after shipping, but Stripe's automatic payouts would sweep that money to our bank after about 2 days. Then creator transfers fail. With manual payouts, creator money stays in the Stripe balance. We withdraw our own share by hand (e.g. monthly), always leaving at least "Owed to creators", which admin Home shows.
4. **Payment methods:** cards and Link only. Statement descriptor `STRAIGHTFROM`. Stripe's receipt emails off. Radar's default rules on.

### Connecting a bank

- "Connect your bank" first asks **one question: country (United States / Canada)**. This is the only new UI. Stripe needs it to create the account.
- `startConnectOnboarding(country)`:
  - creates an Express account with that country, if the creator has none, and saves `stripe_account_id` and `country`;
  - creates an Account Link (return URL `/dashboard/earnings`) and redirects to Stripe.
- `account.updated` sets **`stripe_status`**:

| `stripe_status` | When | Earnings shows |
|---|---|---|
| `none` | no account yet | "Connect your bank to get paid" (as built) |
| `pending` | details sent, Stripe still checking | "Stripe is checking your details. This usually takes a few minutes." |
| `active` | payouts enabled, nothing due | "Paid to your account ending 4821" |
| `action_needed` | Stripe wants more info, or payouts were disabled | "Stripe needs a bit more info" + button (new Account Link) |

- "Manage" → `createLoginLink()` → Stripe Express dashboard.

### Payouts (hourly job)

Pays orders that are:
- `shipped`,
- with `shipped_at` at least `PAYOUT_DELAY_DAYS` ago,
- from a creator whose `stripe_status` is `active` and whose page is **not hidden**,
- with no open chargeback.

For each order:
1. **Look before creating.** List transfers for `transfer_group = order.id`. If one exists (we crashed after Stripe succeeded last time), just record it.
2. Otherwise create the transfer: `amount = payout_cents`, `destination = stripe_account_id`, `source_transaction = stripe_charge_id`, idempotency key `payout-{order.id}`.
3. Order → `paid_out`, with `paid_out_at` and `stripe_transfer_id`.

A hidden creator's payouts pause, and the admin screen says so. Unhiding resumes them on the next run.

**Copy fix:** "Sent 7 days after you ship. Your bank usually shows it 2–3 business days later (a first payout can take a bit longer)." This replaces "Paid to your bank 7 days after…".

### Refunds (always full, one function for every case)

`refundOrder(order, reason)` is used by admin refunds, auto-refunds and the sold-while-paying edge case:

1. **Claim:** `update orders set status = 'refunding' where id = ? and status in ('paid','shipped','paid_out') and dispute_id is null returning *`. If no row comes back, someone else already handled it, so stop. Because `markShipped` only works on `paid`, a creator can't ship an order that is being refunded.
2. **If it was already paid out:** try to reverse the transfer. Stripe only allows this if the creator's Stripe balance still covers it. If it doesn't (the money already reached their bank), **we don't chase it in the MVP**: record `we_covered_cents = payout_cents` and add an order event "We covered $X". It shows on admin Home.
3. **Refund** the PaymentIntent (idempotency key `refund-{order.id}`).
4. In one transaction:
   - order → `refunded`;
   - put the units back: the product returns to **draft** only if it was sold out, otherwise the units are simply added back;
   - queue E6 (fan) and E7 (creator) in the outbox (§13).

If anything crashes in between, the order stays `refunding`. The hourly job finishes it, and the idempotency keys make every retry safe.

Orders with an open chargeback can't be refunded (Stripe blocks it). Auto-refund skips them, and admin handles them in Stripe.

### Chargebacks

- `charge.dispute.created` saves the dispute on the order, adds an event, and puts it on admin Home. If the order hasn't been paid out yet, its payout is skipped while the dispute is open.
- We respond in Stripe's dashboard. When the dispute closes, we save the outcome. A lost dispute's amount and fee are recorded as our loss.
- **Honest risk:**
  - The 7-day delay protects us from "creator never shipped", because that auto-refunds before any payout.
  - It does **not** protect us from disputes weeks later. With separate charges and transfers, the platform pays for those.
  - With a small group of trusted creators, that's acceptable for the MVP. After launch we can revisit: pay after delivery, a longer delay for new creators, or Stripe's connected-account reserves.

---

## 11. Webhooks

Two endpoints: `/api/stripe/webhook` (our account) and `/api/stripe/connect-webhook` (creators' accounts). Both verify the Stripe signature, then:

1. If the event id is already in `stripe_events` → return 200 (already done).
2. Otherwise, in **one database transaction**: do the work (every step checks the current status first), queue any emails in the outbox, and insert the event id into `stripe_events` **last**.
3. Commit and return 200. If anything throws, the transaction rolls back and we return 500, so Stripe retries later. **An event is only marked done once its work is saved**, so nothing is lost.
4. After the commit, try to send the queued emails right away (§13).

| Event | What we do |
|---|---|
| `payment_intent.succeeded` | Order `pending → paid`. Set `paid_at`, `stripe_charge_id`, `stripe_fee_cents` (from the charge's balance transaction; if Stripe hasn't attached it yet, leave it empty and the hourly job fills it in). Subtract units, set `sold_out` + `sold_at` at zero, delete the order's holds, add a `paid` event, and queue E3 + E4. If the holds had expired and there isn't enough stock left: set the order straight to `refunding` (reason "Sold to someone else while you were paying") instead of `paid`, and after the commit run the rest of `refundOrder`; if that crashes, the hourly `finishRefunds` completes it. |
| `payment_intent.payment_failed` | Nothing (the fan sees the error on the page). |
| `charge.refunded` | Someone refunded in the Stripe dashboard directly: mark the order refunded (same steps as `refundOrder`, minus the Stripe call). |
| `charge.dispute.created` / `.closed` | §10. |
| `account.updated` (Connect) | Update `stripe_status` and `bank_last4`. If it just became `active`, the next hourly payout run pays anything that's waiting. |
| `payout.failed` (Connect) | Show on admin Home; admin contacts the creator. |

Pages render fresh on every request (§18), so no cache clearing is needed.

---

## 12. Scheduled jobs

Vercel **Pro** (required anyway: §4) lets us run the cron **hourly**. One route, `/api/cron/hourly`, protected by `Authorization: Bearer CRON_SECRET`, runs these in order:

- Each job handles one order at a time inside its own `try/catch`, so one bad order never stops the rest.
- Each run is written to `job_runs`. A failed run appears on admin Home's to-do list, so problems aren't silent.

| Job | Finds | Does |
|---|---|---|
| 1. `finishRefunds` | orders stuck in `refunding` | runs `refundOrder` again (safe: idempotency keys) |
| 2. `autoRefunds` | `paid` orders past their ship-by time, with no open dispute | `refundOrder`, reason "Not shipped in time" |
| 3. `payouts` | §10 | transfer → `paid_out` |
| 4. `shipReminder` | `paid` orders whose ship-by is within `SHIP_REMINDER_DAYS_BEFORE` days, and `ship_reminder_sent_at` is empty | queue E8, set `ship_reminder_sent_at` |
| 5. `cleanupPending` | `pending` orders whose hold has expired | cancel the PaymentIntent in Stripe **first**; only if Stripe confirms, mark the order canceled and delete its holds. If Stripe says it already succeeded, leave it for the webhook. |
| 6. `sendEmails` | outbox rows not sent yet (fewer than 5 tries) | send them (§13) |
| 7. `fillStripeFees` | paid orders with an empty `stripe_fee_cents` | fetch the fee from Stripe |
| 8. `privacyCleanup` | canceled orders older than 7 days | erase their name, email and address |

**Ship-by time** is the end of the day (11:59 pm), `SHIP_DEADLINE_DAYS` days after payment (plus any admin extension), **in the creator's time zone**. We save their browser's time zone at onboarding, so "Ship by Oct 2" means the whole of Oct 2 for them.

---

## 13. Emails

**Decided for the MVP: 8 emails.** Everything in them is a variable from the database; nothing is typed in.

Two come from Supabase Auth, using its templates sent through Resend. Six are ours: React Email templates in `server/email/templates/`.

**Our six go through an outbox, so none are ever lost:**
1. The code that changes an order adds the email to `email_outbox` **in the same transaction**. No order change without its email, and no email without its order change.
2. Right after the commit, we try to send it (`after()`), so it normally arrives in seconds.
3. Anything that failed is retried by the hourly job, up to 5 tries; then it shows on admin Home.

A failed email never undoes a payment or a refund. This matters most for E4: it's how a creator learns they have something to ship.

| # | To | Email | Sent when | What's in it |
|---|---|---|---|---|
| E1 | Creator or fan | **Your sign-up code** | they sign up with email + password (and "Resend code") | 6-digit code (`{{ .Token }}`), expires in 10 minutes. Supabase *Confirm signup* template. |
| E2 | Creator or fan | **Your password reset code** | "Forgot password?" | 6-digit code. Supabase *Reset password* template. |
| E3 | Fan | **Order confirmed** | payment succeeds (webhook) | order code, items with photos, subtotal/shipping/total, "straight from @handle", ship-to address, "ships within `SHIP_DEADLINE_DAYS` days or you're refunded automatically", link to create an account (pre-filled email) |
| E4 | Creator | **Someone ordered** | payment succeeds (webhook) | items, **you'll earn `payout_cents`**, fan's name and ship-to address, ship-by date, "Add tracking" button → `/dashboard/orders`. If no bank connected: a "Connect your bank to get paid" block (this replaces separate bank reminders). |
| E5 | Fan | **Your item shipped** | creator (or admin) adds tracking | carrier, tracking number, **Track package** link (`CARRIERS[].track`; "Other" shows the number only), creator. Sent again if the tracking is changed later. |
| E6 | Fan | **You've been refunded** | any refund (auto, admin, or the sold-while-paying edge case) | amount, reason in plain words, "back on your card in 5–10 business days" |
| E7 | Creator | **Order refunded** | auto-refund (not shipped in time) or admin refund | item, amount, reason, "the item is back in your drafts; list it again anytime" |
| E8 | Creator | **Ship reminder** | hourly job, `SHIP_REMINDER_DAYS_BEFORE` (2) days before the ship-by date, once per order | item, fan's first name, ship-by date, "Add tracking" button, "after that the fan is refunded automatically" |

**Admin "Resend"** on an order re-sends E5 if it has tracking, otherwise E3.

**Turn off Stripe's receipt emails.** Don't set `receipt_email` on the PaymentIntent, and switch off "Successful payments" emails in Stripe settings. E3 is the receipt, so fans don't get two.

**Later (not in the MVP)**, each easy to add because the outbox and the data already exist:
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

- **Bucket:** `media` (public read). The database stores **paths**; `publicUrl(path)` builds the URL, so moving storage later is one change.
- **Paths use the uploader's user id**, not the item's: `u/{userId}/{uuid}.jpg`. A brand-new item has no id yet, and onboarding has no creator row yet, so this is the one path that always works. The upload action checks only "is this person signed in", plus type (jpeg/png/webp) and size (≤ 5 MB).
- **Upload:** the browser already resizes to 1200px JPEG (`lib/image-resize.ts`). Then:
  - `createUploadUrl()` returns a signed upload URL;
  - the browser uploads straight to Storage;
  - saving the item stores the paths in order.
- **Keep it simple: creators' photos are never deleted in the MVP.** Removing a photo from an item only removes the database row, so old orders keep their picture and nothing can be deleted by mistake. Storage is cheap; a cleanup job can come later.
- **The one exception: admin "Remove photo" (moderation) deletes the file too,** so it's really gone from its public URL. Removing the last photo of a live item moves it to draft (already built into the admin).
- **Display:** `next/image` with the Supabase storage host added to `remotePatterns` in `next.config.ts`.

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
| `/dashboard/earnings` | `getCreatorBalances()`, per-order payout list, `stripe_status` | `startConnectOnboarding(country)`, `openStripeDashboard()` | Fee line reads the creator's effective rate. Bank card shows the 4 Stripe states (§10). |
| `/dashboard/settings` | profile, bank status, live feed | `updateProfile()`, avatar upload, `signOut()` | Handle is read-only (already built). |
| `/admin` | `needsAttention()`, open reports, 4 numbers, `creatorsToNudge()` | `resolveReport()` | |
| `/admin/orders`, `/[code]` | order list with search + filters, order + items + events | `adminRefund()`, `extendShipBy()`, `adminSetTracking()`, `resendEmail()` | |
| `/admin/creators`, `/[id]` | creator list with stats + next step, creator detail | `setCreatorStatus()`, `removeBio()`, `removeAvatar()`, `changeHandle()`, `addNote()`, `setItemHidden()`, `removePhoto()`, `setCreatorFee()` | |
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
| `checkHandle(h)` | format, reserved words, taken, retired. Read-only, called while typing. |
| `completeOnboarding(profile)` | handle free (again), age box ticked, name present, bio ≤ `BIO_MAX`, socials cleaned (`normalizeUsername`). Claims a pending fee. |
| `updateProfile(patch)` | handle **cannot** change. Same limits. |
| `createUploadUrl()` | signed in; jpeg/png/webp; ≤ 5 MB. Path is under their user id (§14). |
| `saveProduct(input, status)` | owns it; not sold out; 1–`MAX_PHOTOS` photos, all uploaded by this user; publishing needs ≥1 photo, title, price between `MIN_PRICE_CENTS` and `MAX_PRICE_CENTS`, shipping ≥ 0; story ≤ `STORY_MAX`; quantity ≥ 1; slug made unique on create only; sets `published_at` on first publish. |
| `setProductStatus(id, draft/available)` | owns it. An admin-hidden item stays hidden from fans whatever the creator does (separate flag). |
| `deleteDraft(id)` | draft only and never ordered. |
| `markShipped(orderId, carrier, tracking)` | owns the order; conditional update `where status = 'paid'` (so it can't collide with a refund in progress); tracking ≥ 4 chars. Sets `shipped_at`, queues E5. |
| `updateTracking(orderId, …)` | status `shipped`/`paid_out`. Re-sends E5 with the new link. |
| `startConnectOnboarding(country)` / `openStripeDashboard()` | §10 |
| `dismissBankCard()` | sets `bank_card_dismissed_at` |

**Fan / public**

| Action | Rules |
|---|---|
| `getCheckoutLines(ids)` | read-only; returns current price, shipping, units free, state `ok / sold / on_hold`, totals. Same shape as today's `buildCart()`. |
| `startCheckout(input)` | §9. Rate-limited per IP (`rate_limits`, e.g. 10 per 10 minutes). |
| `submitReport(input)` | rate-limited (`rate_limits`); message length; creates `reports` row (shows on admin Home; no email). |
| Auth (sign up, verify code, resend code, sign in, forgot/reset password) | Called from the browser with the Supabase client, not our own actions. Supabase rate-limits them; we add per-IP limits for sign-up. |

**Admin**: §17.

---

## 17. Admin backend

Every admin query and action starts with `requireAdmin()`. Every admin action writes an `audit_log` row with the same human sentence the prototype shows (e.g. "Refunded SF-7Q2KD in full ($40): Creator can't ship it").

| Admin action | Effect |
|---|---|
| `adminRefund(code, reason)` | `refundOrder()` (§10), E6 and E7. If the order was already paid out, the dialog says: "If we can't take it back from the creator's Stripe balance, we cover it." |
| `extendShipBy(code, days)` | `ship_extra_days += days`, event. No email in the MVP (admin tells the creator). |
| `adminSetTracking(code, carrier, number)` | as creator's `markShipped`/`updateTracking` |
| `resendEmail(code)` | E5 if tracking exists, else E3 |
| `setCreatorStatus(id, hidden/active, reason)` | hiding hides the page and all items from fans; open orders are still shippable; **payouts pause while hidden** (the admin banner and confirm dialog say so) |
| `removeBio(id)` / `removeAvatar(id)` | clears field / deletes file |
| `changeHandle(id, newHandle, reason)` | same handle rules; old link 404s; old handle goes to `retired_handles` |
| `addNote(id, text)` | `creator_notes` |
| `setItemHidden(productId, true/false)` | sets `admin_hidden`; unhiding restores exactly what was there |
| `removePhoto(productId, imageId)` | deletes the row **and the file** (moderation); a live item with none left → draft |
| `resolveReport(id, hide/no_action)` | closes report; optionally hides item/page in the same transaction |
| `setPlatformFee(bps)` | updates `platform_settings`. The fee-change email is on the *later* list, so the prototype's "Email those creators" checkbox is dropped for now; admin tells creators by hand. |
| `setCreatorFee(id, bps, note)` / `clearCreatorFee(id)` | `creators.fee_bps` |
| `setPendingFee(email, bps, note)` / `clearPendingFee(email)` | `pending_fee_rates` |

**Admin reads** (`server/queries/admin.ts`) reproduce the prototype's derived helpers, now as SQL:
- `needsAttention()`: open disputes, `paid` orders within 2 days of ship-by, failed Connect payouts, orders stuck in `refunding`, a failed job run, emails that failed 5 times, and "we covered $X" events;
- open reports;
- Home numbers (creators, orders this week, sales, **we keep** from real Stripe fees), plus **owed to creators** (so we never withdraw creator money from Stripe by mistake, §10);
- `creatorsToNudge()`: next step per creator (no live item → no sale → no bank). Same logic as `creatorNextStep()`;
- lists with search (name/handle/email prefix, order code, fan email).

---

## 18. Security and privacy

- **RLS on, no public policies**, on every table. Only the server's database connection reads/writes.
- **Authorization in one place** (`server/auth.ts`). Every query that returns private data takes the creator id from the session, never from the request.
- **Fan addresses** are only returned to that order's creator and to admin. Public queries select explicit columns, never `*`.
- **Prices from the server only.** `startCheckout` ignores any price sent by the browser.
- **Webhook signatures** verified; **cron** protected by secret; **admin** by email allowlist on the server.
- **Rate limits:** our endpoints (checkout start, report form, handle check) use the small `rate_limits` table. Sign-up and password reset go straight to Supabase, so they're covered by Supabase's limits plus CAPTCHA (§8).
- **No personal data in URLs** (order code only; the success page double-checks with the PaymentIntent secret or the session).
- **Uploads**: signed URLs, type and size checked, stored under the owner's id.
- **Caching:** public pages render fresh on every request for now (no `'use cache'`), so a sold item can never show as available. With 10–100 creators this is fast. Caching can come later with `cacheTag`/`revalidateTag`.
- **Backups:** Supabase daily backups (Pro plan adds point-in-time recovery; worth it once real money flows).
- **Personal data, kept to what's needed:**
  - abandoned checkouts are erased after 7 days (§12);
  - creators see a fan's address only while the order is open, and for 30 days after it ships;
  - creators never see fan emails;
  - we record which Terms version each creator accepted.
- **Deleting an account:** by email request in the MVP, handled by admin. Delete the auth user and profile, and anonymize their orders; order amounts stay for our records. Self-serve deletion comes later.

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
| `components/creator/earnings-view.tsx` | `StripeDialog` → country question + real Connect redirect; bank card shows the 4 Stripe states; payout copy says "sent" (§10) |
| `components/buy-box.tsx`, `lib/cart-view-model.ts`, `creator/items-list.tsx`, `creator/dashboard-home.tsx`, `lib/types.ts` | "reserved" comes from active holds, not a stored status (§6) |
| `components/admin/creators.tsx` | hidden banner and confirm dialog add "payouts are paused while hidden" |
| `components/admin/orders.tsx` | refund dialog: "if we can't take it back, we cover it" |
| `components/admin/fee-controls.tsx` | drop the "Email those creators" checkbox (fee-change email is later) |
| `components/auth/email-password.tsx` | add "Already have an account? Sign in" on the code screen; CAPTCHA widget; resend wait already 60 s |
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

**Phase 0: Accounts and settings (before any code)**
- Stripe: the setup checklist in §10. Then prove it: in test mode, create a **US** Express account, charge a test card on the platform, and transfer to that account with `source_transaction`. If this fails, stop and rethink before building.
- Vercel **Pro** project, Supabase projects (dev + prod), Resend with the `mail.straightfrom.co` domain.
- ✅ A test transfer from our Canadian platform lands in a US test account.

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
- ✅ Test-mode purchase end to end (card, Apple Pay). Two people can't buy the last unit. A declined card, then a retry, gives **one** order. Reloading the checkout page never blocks your own item. A price change mid-checkout shows "Prices changed". A duplicate webhook changes nothing, and a webhook that crashes is retried by Stripe and completes.

**Phase 4: Shipping, Connect and money**
- Mark shipped / edit tracking (E5).
- Express onboarding, `account.updated`, `getCreatorBalances` on Dashboard and Earnings.
- Hourly cron (§12), `refundOrder` with the claim step, reversal-or-we-cover, the email outbox. E6, E7 and E8.
- ✅ In test mode, with Stripe test clocks or by back-dating rows:
  - a shipped order pays out after the delay, only once a bank is connected;
  - an unshipped order refunds after the deadline;
  - re-running the cron changes nothing;
  - forcing a crash right after a Stripe call (refund or transfer), then re-running, finishes the job with **one** refund or transfer, never two;
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
  - cron re-runs;
  - **crash tests:** throw right after each Stripe call in `refundOrder` and the payout job, then run again; assert exactly one refund/transfer in Stripe and the right final status.
- **Stripe CLI** (`stripe listen --forward-to …`) for webhooks in dev; **test clocks** for payout/refund timing.
- **Manual phone script** per phase, from an Instagram DM link.

---

## 22. Values and decisions for our discussion

My recommendation is in the right-hand column. These are the "values" to settle before or during Phase 1.

### Numbers and rules

| Value | Prototype uses | Recommendation |
|---|---|---|
| Platform fee | 4.9% (decided) | Keep. |
| **Who pays Stripe's card fee** (≈2.9% + 30¢) | We do (admin shows "We keep" going negative with 0% creators) | **DECIDE.** Options: (a) we absorb it (simple, costly at 4.9%); (b) creator pays it on top of our fee; (c) we absorb it except for 0% creators, who pay Stripe's fee. I lean (c). Also check Connect's per-account and payout fees before more 0% deals. |
| Days to ship before auto-refund | 7 | Keep 7. |
| Days after shipping before payout | 7 | Keep 7. It guarantees "never shipped" orders refund before any payout. It does **not** protect against disputes weeks later (§10). |
| Checkout hold | 30 min | **15 min.** With our own page the fan is already at the Pay step when the hold starts. |
| Default shipping | $20 | Keep. |
| Minimum price | $1 | $5. Stripe's 30¢ makes tiny orders lose money. |
| Maximum price | none | $5,000 cap at launch (`MAX_PRICE_CENTS`, limits fraud exposure); raise per creator on request. |
| Photos per item | 1–8 | Keep. |
| Ship-to countries | US, Canada | Keep. |
| Creator countries | US, Canada | Keep (depends on Stripe cross-border setup, §10). |
| Ship reminders | spec: day 3 and 5 | **Decided:** one reminder, 2 days before the deadline (E8). |
| Bank reminders | not built | **Decided:** not in the MVP; the "Someone ordered" email (E4) carries the connect-your-bank nudge. |

### Policies

| Question | Recommendation |
|---|---|
| **Chargeback lost after payout** | **MVP: we cover it** and record it. Stripe can only take money back while it's still in the creator's Stripe balance, and chasing it adds a new money path. Talk to the creator case by case. |
| **Refund after payout** | **MVP:** try to reverse the transfer; if the creator's Stripe balance can't cover it (already in their bank), **we cover it** and record it (§10). No negative balances, no chasing. |
| **Unclaimed money** (shipped, never connected a bank) | Admin reaches out personally (admin Home's "Creators to nudge" lists them); decide a cut-off, e.g. 90 days. Ask an accountant about holding funds in Canada. |
| **Sales tax** | Out of MVP scope. Revisit with Stripe Tax before volume. |
| **Tax forms for US creators** (1099-K) | Ask the accountant, together with the unclaimed-funds question. |
| **Item after auto-refund** | Back to draft, creator relists (matches current copy). |

### Approach

| Question | Recommendation |
|---|---|
| Cart: browser only, or also saved on the server? | **Browser only** for MVP. Server recomputes everything. Revisit if fans lose carts in in-app browsers. |
| Address form: ours, or Stripe's Address Element? | **Keep ours** (already designed, matches the page). Add Google Places autocomplete later if typos cause returns. |
| Sign-in method | **Decided:** Google, or email + password with a 6-digit code to verify the email and to reset a password. |
| Hosting and cron | **Decided:** Vercel Pro (Hobby is non-commercial only), cron **hourly**. |
| Supabase plan | Free for dev; **Pro for production** (backups, no pausing). |
| Email provider | Resend (spec suggested it; confirm). Sending domain `mail.straightfrom.co`, from `orders@mail.straightfrom.co`. |
| Error tracking | Sentry free tier. |
| One admin now, how to add a second later | `ADMIN_EMAILS` is already a list. Adding someone is one env change. |
