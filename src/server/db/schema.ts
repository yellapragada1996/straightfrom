import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// The database, as described in docs/BACKEND_PLAN.md §6.
// Every table has row level security on and no policies: only our server's
// connection can read or write. Money is always integer cents.

// ---------- enums ----------
export const creatorStatus = pgEnum("creator_status", ["active", "hidden"]);
export const productStatus = pgEnum("product_status", ["draft", "available", "sold_out"]);
export const orderStatus = pgEnum("order_status", ["pending", "paid", "shipped", "paid_out", "refunding", "refunded", "canceled"]);
export const stripeStatus = pgEnum("stripe_status", ["none", "pending", "active", "action_needed"]);
export const eventActor = pgEnum("event_actor", ["fan", "creator", "system", "admin"]);
export const carrier = pgEnum("carrier", ["canada_post", "purolator", "usps", "ups", "fedex", "dhl", "other"]);
export const reportStatus = pgEnum("report_status", ["open", "resolved"]);
export const reportTarget = pgEnum("report_target", ["item", "creator"]);
export const emailStatus = pgEnum("email_status", ["queued", "sent", "failed"]);

// ---------- helpers ----------
const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () =>
  ts("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------- creators ----------
export const creators = pgTable(
  "creators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Supabase auth.users.id. No FK to Supabase's auth schema so migrations also run on plain Postgres in tests. */
    userId: uuid("user_id").notNull(),
    email: text("email").notNull(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarPath: text("avatar_path"),
    /** Platform → username, e.g. { instagram: "maya" }. */
    socialLinks: jsonb("social_links").$type<Record<string, string>>().notNull().default({}),
    status: creatorStatus("status").notNull().default("active"),
    /** Their own rate in basis points. Null = platform rate. */
    feeBps: integer("fee_bps"),
    feeNote: text("fee_note"),
    feeSetAt: ts("fee_set_at"),
    country: text("country"),
    stripeAccountId: text("stripe_account_id"),
    stripeStatus: stripeStatus("stripe_status").notNull().default("none"),
    bankLast4: text("bank_last4"),
    bankCardDismissedAt: ts("bank_card_dismissed_at"),
    timezone: text("timezone").notNull().default("America/New_York"),
    termsVersion: text("terms_version"),
    termsAcceptedAt: ts("terms_accepted_at"),
    lastActiveAt: ts("last_active_at").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("creators_user_id_key").on(t.userId),
    uniqueIndex("creators_handle_key").on(t.handle),
    check("creators_handle_format", sql`${t.handle} ~ '^[a-z0-9_]{3,30}$'`),
    check("creators_fee_bps_range", sql`${t.feeBps} is null or (${t.feeBps} between 0 and 10000)`),
    check("creators_country", sql`${t.country} is null or ${t.country} in ('US', 'CA')`),
  ],
).enableRLS();

// ---------- products ----------
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creators.id),
    /** Set once from the title, never changes (keeps shared links working). */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    /** Units left to sell. */
    quantity: integer("quantity").notNull().default(1),
    status: productStatus("status").notNull().default("draft"),
    /** Admin kill switch, separate from status so unhiding restores exactly what was there. */
    adminHidden: boolean("admin_hidden").notNull().default(false),
    publishedAt: ts("published_at"),
    soldAt: ts("sold_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_creator_slug_key").on(t.creatorId, t.slug),
    index("products_creator_status_idx").on(t.creatorId, t.status),
    check("products_price_nonneg", sql`${t.priceCents} >= 0`),
    check("products_shipping_nonneg", sql`${t.shippingCents} >= 0`),
    check("products_quantity_nonneg", sql`${t.quantity} >= 0`),
  ],
).enableRLS();

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Storage path (or an absolute URL for seeded sample images). */
    path: text("path").notNull(),
    /** 0 = cover. */
    position: integer("position").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("product_images_position_key").on(t.productId, t.position)],
).enableRLS();

// ---------- orders ----------
export type ShipTo = { line1: string; line2?: string; city: string; region: string; postal: string; country: string };

export const orders = pgTable(
  "orders",
  {
    /** Also the Stripe transfer_group. */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human code shown to people, e.g. SF-7Q2KD. */
    code: text("code").notNull(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creators.id),
    status: orderStatus("status").notNull().default("pending"),
    /** Stored lowercase. Fan accounts match orders on this. */
    fanEmail: text("fan_email").notNull(),
    fanName: text("fan_name").notNull(),
    shipTo: jsonb("ship_to").$type<ShipTo>().notNull(),
    itemsCents: integer("items_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** Our fee rate at purchase (snapshot). */
    feeBps: integer("fee_bps").notNull(),
    feeCents: integer("fee_cents").notNull(),
    /** Stripe's exact fee, read from Stripe when the payment succeeds. Never estimated. */
    stripeFeeCents: integer("stripe_fee_cents"),
    /** total − our fee − Stripe's fee. Null until Stripe reports its fee. */
    payoutCents: integer("payout_cents"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeChargeId: text("stripe_charge_id"),
    stripeTransferId: text("stripe_transfer_id"),
    stripeRefundId: text("stripe_refund_id"),
    transferReversalId: text("transfer_reversal_id"),
    /** A refund or lost dispute after payout that we paid ourselves. */
    weCoveredCents: integer("we_covered_cents").notNull().default(0),
    carrier: carrier("carrier"),
    trackingNumber: text("tracking_number"),
    shipExtraDays: integer("ship_extra_days").notNull().default(0),
    disputeId: text("dispute_id"),
    disputeStatus: text("dispute_status"),
    disputeReason: text("dispute_reason"),
    refundReason: text("refund_reason"),
    paidAt: ts("paid_at"),
    shippedAt: ts("shipped_at"),
    paidOutAt: ts("paid_out_at"),
    refundedAt: ts("refunded_at"),
    canceledAt: ts("canceled_at"),
    shipReminderSentAt: ts("ship_reminder_sent_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_code_key").on(t.code),
    uniqueIndex("orders_payment_intent_key").on(t.stripePaymentIntentId),
    index("orders_creator_status_idx").on(t.creatorId, t.status),
    index("orders_fan_email_idx").on(t.fanEmail),
    index("orders_status_paid_at_idx").on(t.status, t.paidAt),
    index("orders_status_shipped_at_idx").on(t.status, t.shippedAt),
    check("orders_fan_email_lowercase", sql`${t.fanEmail} = lower(${t.fanEmail})`),
    check("orders_total_adds_up", sql`${t.totalCents} = ${t.itemsCents} + ${t.shippingCents}`),
    check("orders_fee_bps_range", sql`${t.feeBps} between 0 and 10000`),
    check("orders_amounts_nonneg", sql`${t.itemsCents} >= 0 and ${t.shippingCents} >= 0 and ${t.feeCents} >= 0`),
    check(
      "orders_payout_adds_up",
      sql`${t.payoutCents} is null or (${t.stripeFeeCents} is not null and ${t.payoutCents} = ${t.totalCents} - ${t.feeCents} - ${t.stripeFeeCents})`,
    ),
  ],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    title: text("title").notNull(),
    imagePath: text("image_path"),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), check("order_items_quantity_pos", sql`${t.quantity} > 0`)],
).enableRLS();

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    at: ts("at").notNull().defaultNow(),
    actor: eventActor("actor").notNull(),
    /** Machine key: paid, shipped, tracking_changed, paid_out, refunded, ship_extended, email_resent, dispute_opened, ... */
    kind: text("kind").notNull(),
    /** Human sentence shown in the admin timeline. */
    text: text("text").notNull(),
  },
  (t) => [index("order_events_order_at_idx").on(t.orderId, t.at)],
).enableRLS();

/** Holds items while a fan pays. Active = expires_at > now(). Expired rows are simply ignored. */
export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("reservations_product_expires_idx").on(t.productId, t.expiresAt), check("reservations_quantity_pos", sql`${t.quantity} > 0`)],
).enableRLS();

// ---------- platform ----------
/** Single row, id = 1. */
export const platformSettings = pgTable(
  "platform_settings",
  {
    id: integer("id").primaryKey().default(1),
    feeBps: integer("fee_bps").notNull(),
    updatedAt: updatedAt(),
    updatedBy: text("updated_by"),
  },
  (t) => [check("platform_settings_single_row", sql`${t.id} = 1`), check("platform_settings_fee_range", sql`${t.feeBps} between 0 and 10000`)],
).enableRLS();

/** A rate agreed before sign-up; claimed at onboarding by a verified email. */
export const pendingFeeRates = pgTable(
  "pending_fee_rates",
  {
    email: text("email").primaryKey(),
    feeBps: integer("fee_bps").notNull(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
    claimedByCreatorId: uuid("claimed_by_creator_id").references(() => creators.id),
    claimedAt: ts("claimed_at"),
  },
  (t) => [check("pending_fee_rates_email_lowercase", sql`${t.email} = lower(${t.email})`), check("pending_fee_rates_fee_range", sql`${t.feeBps} between 0 and 10000`)],
).enableRLS();

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    target: reportTarget("target").notNull(),
    productId: uuid("product_id").references(() => products.id),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creators.id),
    reason: text("reason").notNull(),
    message: text("message").notNull(),
    reporterEmail: text("reporter_email").notNull(),
    status: reportStatus("status").notNull().default("open"),
    resolution: text("resolution"),
    resolvedAt: ts("resolved_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reports_code_key").on(t.code), index("reports_status_idx").on(t.status)],
).enableRLS();

export const creatorNotes = pgTable(
  "creator_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creators.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("creator_notes_creator_idx").on(t.creatorId)],
).enableRLS();

/** Admin activity log. Append-only. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    at: ts("at").notNull().defaultNow(),
    actorEmail: text("actor_email").notNull(),
    /** Machine key, e.g. order.refund */
    action: text("action").notNull(),
    /** The sentence shown in the log. */
    summary: text("summary").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    data: jsonb("data").$type<Record<string, unknown>>(),
  },
  (t) => [index("audit_log_at_idx").on(t.at)],
).enableRLS();

/** Emails are queued in the same transaction as the change that causes them, then sent and retried. */
export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    template: text("template").notNull(),
    to: text("to").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    creatorId: uuid("creator_id").references(() => creators.id),
    status: emailStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    resendId: text("resend_id"),
    sentAt: ts("sent_at"),
    createdAt: createdAt(),
  },
  (t) => [index("email_outbox_status_idx").on(t.status)],
).enableRLS();

/** Webhook de-duplication. Inserted last, in the same transaction as the event's work. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: ts("received_at").notNull().defaultNow(),
  processedAt: ts("processed_at"),
}).enableRLS();

export const jobRuns = pgTable(
  "job_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    job: text("job").notNull(),
    startedAt: ts("started_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
    ok: boolean("ok"),
    summary: jsonb("summary").$type<Record<string, unknown>>(),
  },
  (t) => [index("job_runs_job_started_idx").on(t.job, t.startedAt)],
).enableRLS();

/** Handles an admin changed away from. They can never be claimed again. */
export const retiredHandles = pgTable("retired_handles", {
  handle: text("handle").primaryKey(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id),
  retiredAt: ts("retired_at").notNull().defaultNow(),
}).enableRLS();

/** Fixed-window counters for our own endpoints (checkout start, reports, handle check). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: ts("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
).enableRLS();
