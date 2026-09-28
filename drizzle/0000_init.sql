CREATE TYPE "public"."carrier" AS ENUM('canada_post', 'purolator', 'usps', 'ups', 'fedex', 'dhl', 'other');--> statement-breakpoint
CREATE TYPE "public"."creator_status" AS ENUM('active', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."event_actor" AS ENUM('fan', 'creator', 'system', 'admin');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'shipped', 'paid_out', 'refunding', 'refunded', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'available', 'sold_out');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('item', 'creator');--> statement-breakpoint
CREATE TYPE "public"."stripe_status" AS ENUM('none', 'pending', 'active', 'action_needed');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"data" jsonb
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "creator_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"avatar_path" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "creator_status" DEFAULT 'active' NOT NULL,
	"fee_bps" integer,
	"fee_note" text,
	"fee_set_at" timestamp with time zone,
	"country" text,
	"stripe_account_id" text,
	"stripe_status" "stripe_status" DEFAULT 'none' NOT NULL,
	"bank_last4" text,
	"bank_card_dismissed_at" timestamp with time zone,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"terms_version" text,
	"terms_accepted_at" timestamp with time zone,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creators_handle_format" CHECK ("creators"."handle" ~ '^[a-z0-9_]{3,30}$'),
	CONSTRAINT "creators_fee_bps_range" CHECK ("creators"."fee_bps" is null or ("creators"."fee_bps" between 0 and 10000)),
	CONSTRAINT "creators_country" CHECK ("creators"."country" is null or "creators"."country" in ('US', 'CA'))
);
--> statement-breakpoint
ALTER TABLE "creators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template" text NOT NULL,
	"to" text NOT NULL,
	"data" jsonb NOT NULL,
	"order_id" uuid,
	"creator_id" uuid,
	"status" "email_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"resend_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"summary" jsonb
);
--> statement-breakpoint
ALTER TABLE "job_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" "event_actor" NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"image_path" text,
	"price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "order_items_quantity_pos" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"fan_email" text NOT NULL,
	"fan_name" text NOT NULL,
	"ship_to" jsonb NOT NULL,
	"items_cents" integer NOT NULL,
	"shipping_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"fee_bps" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"stripe_fee_cents" integer,
	"payout_cents" integer,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"stripe_transfer_id" text,
	"stripe_refund_id" text,
	"transfer_reversal_id" text,
	"we_covered_cents" integer DEFAULT 0 NOT NULL,
	"carrier" "carrier",
	"tracking_number" text,
	"ship_extra_days" integer DEFAULT 0 NOT NULL,
	"dispute_id" text,
	"dispute_status" text,
	"dispute_reason" text,
	"refund_reason" text,
	"paid_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"paid_out_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"ship_reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_fan_email_lowercase" CHECK ("orders"."fan_email" = lower("orders"."fan_email")),
	CONSTRAINT "orders_total_adds_up" CHECK ("orders"."total_cents" = "orders"."items_cents" + "orders"."shipping_cents"),
	CONSTRAINT "orders_fee_bps_range" CHECK ("orders"."fee_bps" between 0 and 10000),
	CONSTRAINT "orders_amounts_nonneg" CHECK ("orders"."items_cents" >= 0 and "orders"."shipping_cents" >= 0 and "orders"."fee_cents" >= 0),
	CONSTRAINT "orders_payout_adds_up" CHECK ("orders"."payout_cents" is null or ("orders"."stripe_fee_cents" is not null and "orders"."payout_cents" = "orders"."total_cents" - "orders"."fee_cents" - "orders"."stripe_fee_cents"))
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pending_fee_rates" (
	"email" text PRIMARY KEY NOT NULL,
	"fee_bps" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_by_creator_id" uuid,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "pending_fee_rates_email_lowercase" CHECK ("pending_fee_rates"."email" = lower("pending_fee_rates"."email")),
	CONSTRAINT "pending_fee_rates_fee_range" CHECK ("pending_fee_rates"."fee_bps" between 0 and 10000)
);
--> statement-breakpoint
ALTER TABLE "pending_fee_rates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"fee_bps" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "platform_settings_single_row" CHECK ("platform_settings"."id" = 1),
	CONSTRAINT "platform_settings_fee_range" CHECK ("platform_settings"."fee_bps" between 0 and 10000)
);
--> statement-breakpoint
ALTER TABLE "platform_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"path" text NOT NULL,
	"position" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"shipping_cents" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"admin_hidden" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_nonneg" CHECK ("products"."price_cents" >= 0),
	CONSTRAINT "products_shipping_nonneg" CHECK ("products"."shipping_cents" >= 0),
	CONSTRAINT "products_quantity_nonneg" CHECK ("products"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"target" "report_target" NOT NULL,
	"product_id" uuid,
	"creator_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"message" text NOT NULL,
	"reporter_email" text NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reservations_quantity_pos" CHECK ("reservations"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "retired_handles" (
	"handle" text PRIMARY KEY NOT NULL,
	"creator_id" uuid NOT NULL,
	"retired_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "retired_handles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "stripe_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "creator_notes" ADD CONSTRAINT "creator_notes_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_fee_rates" ADD CONSTRAINT "pending_fee_rates_claimed_by_creator_id_creators_id_fk" FOREIGN KEY ("claimed_by_creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retired_handles" ADD CONSTRAINT "retired_handles_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "creator_notes_creator_idx" ON "creator_notes" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creators_user_id_key" ON "creators" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creators_handle_key" ON "creators" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "email_outbox_status_idx" ON "email_outbox" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_runs_job_started_idx" ON "job_runs" USING btree ("job","started_at");--> statement-breakpoint
CREATE INDEX "order_events_order_at_idx" ON "order_events" USING btree ("order_id","at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_code_key" ON "orders" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_intent_key" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "orders_creator_status_idx" ON "orders" USING btree ("creator_id","status");--> statement-breakpoint
CREATE INDEX "orders_fan_email_idx" ON "orders" USING btree ("fan_email");--> statement-breakpoint
CREATE INDEX "orders_status_paid_at_idx" ON "orders" USING btree ("status","paid_at");--> statement-breakpoint
CREATE INDEX "orders_status_shipped_at_idx" ON "orders" USING btree ("status","shipped_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_position_key" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "products_creator_slug_key" ON "products" USING btree ("creator_id","slug");--> statement-breakpoint
CREATE INDEX "products_creator_status_idx" ON "products" USING btree ("creator_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_code_key" ON "reports" USING btree ("code");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservations_product_expires_idx" ON "reservations" USING btree ("product_id","expires_at");