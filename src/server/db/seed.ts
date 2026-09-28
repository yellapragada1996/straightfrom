import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { DEFAULT_FEE_BPS } from "@/lib/fees";
import { creators as sampleCreators, products as sampleProducts } from "@/lib/mock-data";
import { creatorPayoutCents, orderTotals } from "../money";
import { createDb, type Db } from "./client";
import * as t from "./schema";

// Sample data for the dev database: the same creators, items and orders as the
// prototype, so every screen has something real to show once it's connected.
// `npm run db:seed` wipes the app tables first, and refuses to run unless
// APP_ENV=development (so it can never touch production).

const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);

/** Stripe's fee on each sample order, as Stripe would report it (real orders read it from Stripe). */
const SAMPLE_STRIPE_FEES: Record<string, number> = {
  "SF-7Q2KD": 146,
  "SF-4MZ8P": 770,
  "SF-9TR3A": 184,
  "SF-2LX6W": 262,
  "SF-8HB1C": 340,
  "SF-6WQ4N": 422,
  "SF-3PL9T": 488,
  "SF-5KD2R": 494,
  "SF-1JV7M": 726,
};

const APP_TABLES = [
  "rate_limits", "retired_handles", "job_runs", "stripe_events", "email_outbox", "audit_log", "creator_notes", "reports",
  "pending_fee_rates", "platform_settings", "reservations", "order_events", "order_items", "orders", "product_images", "products", "creators",
];

type CreatorKey = "maya" | "theo" | "lena" | "jules" | "dev" | "kofi";

/** Empties every app table (dev and tests only). */
export async function resetAppTables(db: Db) {
  await db.execute(sql.raw(`truncate table ${APP_TABLES.map((n) => `"${n}"`).join(", ")} restart identity cascade`));
}

export async function seed(db: Db) {
  await resetAppTables(db);

  // ---------- platform ----------
  await db.insert(t.platformSettings).values({ id: 1, feeBps: DEFAULT_FEE_BPS, updatedBy: "seed" });

  // ---------- creators ----------
  const [maya, theo] = sampleCreators;
  const creatorRows: Record<CreatorKey, typeof t.creators.$inferInsert> = {
    maya: { userId: randomUUID(), email: "maya@example.com", handle: maya.handle, displayName: maya.displayName, bio: maya.bio, avatarPath: maya.avatarUrl, socialLinks: { ...maya.socialLinks } as Record<string, string>, stripeStatus: "none", createdAt: ago(26), lastActiveAt: ago(0, 2), timezone: "America/Toronto" },
    theo: { userId: randomUUID(), email: "theo@example.com", handle: theo.handle, displayName: theo.displayName, bio: theo.bio, avatarPath: theo.avatarUrl, socialLinks: { ...theo.socialLinks } as Record<string, string>, stripeStatus: "active", country: "US", bankLast4: "4821", feeBps: 0, feeNote: "Launch partner", feeSetAt: ago(10), createdAt: ago(34), lastActiveAt: ago(1), timezone: "America/Los_Angeles" },
    lena: { userId: randomUUID(), email: "lena@example.com", handle: "lenacooks", displayName: "Lena Park", bio: "Home cooking, small kitchen, big pots.", stripeStatus: "active", country: "US", bankLast4: "1180", createdAt: ago(11), lastActiveAt: ago(0, 5) },
    jules: { userId: randomUUID(), email: "jules@example.com", handle: "julesdraws", displayName: "Jules Moreau", bio: "Illustrator. I draw live most Sundays.", stripeStatus: "active", country: "CA", bankLast4: "5302", createdAt: ago(18), lastActiveAt: ago(3), timezone: "America/Toronto" },
    dev: { userId: randomUUID(), email: "dev@example.com", handle: "devskates", displayName: "Dev Arora", bio: "Skate clips, mostly the ones where I fall.", stripeStatus: "none", createdAt: ago(4), lastActiveAt: ago(2) },
    kofi: { userId: randomUUID(), email: "kofi.m@example.com", handle: "kofiboxing", displayName: "Kofi Mensah", bio: "Boxing coach. Training videos every week.", stripeStatus: "none", createdAt: ago(1), lastActiveAt: ago(1) },
  };
  const creatorId = {} as Record<CreatorKey, string>;
  for (const [key, row] of Object.entries(creatorRows) as [CreatorKey, typeof t.creators.$inferInsert][]) {
    const [r] = await db.insert(t.creators).values({ ...row, termsVersion: "2026-09", termsAcceptedAt: row.createdAt }).returning({ id: t.creators.id });
    creatorId[key] = r.id;
  }
  const mockCreatorKey: Record<string, CreatorKey> = { c_maya: "maya", c_theo: "theo" };

  // ---------- products ----------
  type SeedProduct = { key: string; creator: CreatorKey; slug: string; title: string; description: string; priceCents: number; shippingCents: number; quantity: number; status: "draft" | "available" | "sold_out"; images: string[]; listed: Date };
  const seedProducts: SeedProduct[] = [
    ...sampleProducts.map((p) => ({
      key: p.id,
      creator: mockCreatorKey[p.creatorId],
      slug: p.slug,
      title: p.title,
      description: p.description,
      priceCents: p.priceCents,
      shippingCents: p.shippingCents,
      quantity: p.status === "sold_out" ? 0 : p.quantity,
      status: p.status === "sold_out" ? ("sold_out" as const) : p.status === "draft" ? ("draft" as const) : ("available" as const),
      images: p.images,
      listed: new Date(`${p.createdAt}T15:00:00Z`),
    })),
    { key: "p_lena_apron", creator: "lena", slug: "lena-apron", title: "The apron from the cooking channel", description: "", priceCents: 8500, shippingCents: 2000, quantity: 1, status: "available", images: [], listed: ago(9) },
    { key: "p_lena_pan", creator: "lena", slug: "lena-pan", title: "My first cast iron pan", description: "", priceCents: 14000, shippingCents: 2000, quantity: 0, status: "sold_out", images: [], listed: ago(9) },
    { key: "p_lena_knife", creator: "lena", slug: "lena-knife", title: "The knife from the dumpling video", description: "", priceCents: 6000, shippingCents: 2000, quantity: 1, status: "draft", images: [], listed: ago(2) },
    { key: "p_jules_sketchbook", creator: "jules", slug: "jules-sketchbook", title: "A sketchbook full of doodles", description: "", priceCents: 22000, shippingCents: 2000, quantity: 0, status: "sold_out", images: [], listed: ago(16) },
    { key: "p_jules_pens", creator: "jules", slug: "jules-pens", title: "The pens from the Sunday streams", description: "", priceCents: 4000, shippingCents: 2000, quantity: 3, status: "available", images: [], listed: ago(16) },
    { key: "p_dev_board", creator: "dev", slug: "dev-board", title: "The board from the trick video", description: "", priceCents: 16000, shippingCents: 2000, quantity: 1, status: "draft", images: [], listed: ago(3) },
    { key: "p_kofi_gloves", creator: "kofi", slug: "kofi-gloves", title: "Signed boxing gloves", description: "", priceCents: 25000, shippingCents: 2000, quantity: 1, status: "available", images: [], listed: ago(1) },
  ];
  const productId: Record<string, string> = {};
  const productByKey: Record<string, SeedProduct> = {};
  for (const p of seedProducts) {
    const [r] = await db
      .insert(t.products)
      .values({
        creatorId: creatorId[p.creator],
        slug: p.slug,
        title: p.title,
        description: p.description,
        priceCents: p.priceCents,
        shippingCents: p.shippingCents,
        quantity: p.quantity,
        status: p.status,
        publishedAt: p.status === "draft" ? null : p.listed,
        soldAt: p.status === "sold_out" ? new Date(p.listed.getTime() + 2 * DAY) : null,
        createdAt: p.listed,
      })
      .returning({ id: t.products.id });
    productId[p.key] = r.id;
    productByKey[p.key] = p;
    if (p.images.length) await db.insert(t.productImages).values(p.images.map((path, position) => ({ productId: r.id, path, position })));
  }

  // ---------- orders ----------
  const fans = {
    priya: { name: "Priya Shah", email: "priya@example.com", shipTo: { line1: "88 Queen St W", line2: "Unit 1204", city: "Toronto", region: "ON", postal: "M5H 2M8", country: "CA" } },
    sam: { name: "Sam Rivera", email: "sam@example.com", shipTo: { line1: "120 Hudson St", line2: "Apt 4B", city: "New York", region: "NY", postal: "10013", country: "US" } },
    jordan: { name: "Jordan Lee", email: "jordan@example.com", shipTo: { line1: "2201 Pine St", city: "Seattle", region: "WA", postal: "98121", country: "US" } },
    aisha: { name: "Aisha Bello", email: "aisha@example.com", shipTo: { line1: "45 Elm Ave", city: "Austin", region: "TX", postal: "78704", country: "US" } },
    chris: { name: "Chris Novak", email: "chris@example.com", shipTo: { line1: "9 Harbour Rd", city: "Vancouver", region: "BC", postal: "V6B 1A1", country: "CA" } },
    mia: { name: "Mia Torres", email: "mia.t@example.com", shipTo: { line1: "310 Lake Shore Dr", city: "Chicago", region: "IL", postal: "60611", country: "US" } },
    ben: { name: "Ben Carter", email: "ben@example.com", shipTo: { line1: "77 King St", city: "Calgary", region: "AB", postal: "T2P 1J9", country: "CA" } },
    nora: { name: "Nora Kim", email: "nora@example.com", shipTo: { line1: "15 Mission St", city: "San Francisco", region: "CA", postal: "94105", country: "US" } },
  };
  type Fan = (typeof fans)[keyof typeof fans];
  type SeedOrder = {
    code: string;
    creator: CreatorKey;
    product: string;
    status: "paid" | "shipped" | "paid_out" | "refunded";
    fan: Fan;
    paidAt: Date;
    shippedAt?: Date;
    paidOutAt?: Date;
    refundedAt?: Date;
    carrier?: (typeof t.carrier.enumValues)[number];
    tracking?: string;
    refundReason?: string;
    dispute?: { id: string; openedAt: Date; reason: string };
  };
  const seedOrders: SeedOrder[] = [
    { code: "SF-7Q2KD", creator: "maya", product: "p_tokyo_polaroid", status: "paid", fan: fans.priya, paidAt: ago(5, 3) },
    { code: "SF-4MZ8P", creator: "maya", product: "p_film_camera", status: "paid", fan: fans.sam, paidAt: ago(1, 2) },
    { code: "SF-9TR3A", creator: "maya", product: "p_lisbon_tote", status: "shipped", fan: fans.jordan, paidAt: ago(6), shippedAt: ago(3), carrier: "usps", tracking: "9400111202555842331234" },
    { code: "SF-2LX6W", creator: "maya", product: "p_ring_light", status: "shipped", fan: fans.aisha, paidAt: ago(15), shippedAt: ago(12), carrier: "ups", tracking: "1Z999AA10123456784" },
    { code: "SF-8HB1C", creator: "maya", product: "p_qa_hoodie", status: "refunded", fan: fans.chris, paidAt: ago(24), refundedAt: ago(17), refundReason: "Not shipped in time" },
    { code: "SF-6WQ4N", creator: "theo", product: "p_theo_keyboard", status: "paid_out", fan: fans.mia, paidAt: ago(28), shippedAt: ago(26), paidOutAt: ago(19), carrier: "fedex", tracking: "771234567890" },
    { code: "SF-3PL9T", creator: "theo", product: "p_theo_mic", status: "paid", fan: fans.ben, paidAt: ago(6, 4) },
    { code: "SF-5KD2R", creator: "lena", product: "p_lena_pan", status: "shipped", fan: fans.nora, paidAt: ago(8), shippedAt: ago(6), carrier: "usps", tracking: "9400111202555849876543" },
    { code: "SF-1JV7M", creator: "jules", product: "p_jules_sketchbook", status: "paid_out", fan: fans.sam, paidAt: ago(16), shippedAt: ago(15), paidOutAt: ago(8), carrier: "canada_post", tracking: "7023210039414604", dispute: { id: "dp_sample_1JV7M", openedAt: ago(2), reason: "Fan says the item didn't arrive" } },
  ];

  const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
  for (const o of seedOrders) {
    const p = productByKey[o.product];
    const feeBps = creatorRows[o.creator].feeBps ?? DEFAULT_FEE_BPS;
    const totals = orderTotals([{ priceCents: p.priceCents, shippingCents: p.shippingCents, quantity: 1 }], feeBps);
    const stripeFeeCents = SAMPLE_STRIPE_FEES[o.code];
    const payoutCents = creatorPayoutCents(totals, stripeFeeCents);
    const [row] = await db
      .insert(t.orders)
      .values({
        code: o.code,
        creatorId: creatorId[o.creator],
        status: o.status,
        fanEmail: o.fan.email.toLowerCase(),
        fanName: o.fan.name,
        shipTo: o.fan.shipTo,
        ...totals,
        stripeFeeCents,
        payoutCents,
        stripePaymentIntentId: `pi_sample_${o.code}`,
        stripeChargeId: `ch_sample_${o.code}`,
        stripeTransferId: o.paidOutAt ? `tr_sample_${o.code}` : null,
        stripeRefundId: o.refundedAt ? `re_sample_${o.code}` : null,
        carrier: o.carrier ?? null,
        trackingNumber: o.tracking ?? null,
        refundReason: o.refundReason ?? null,
        disputeId: o.dispute?.id ?? null,
        disputeStatus: o.dispute ? "needs_response" : null,
        disputeReason: o.dispute?.reason ?? null,
        paidAt: o.paidAt,
        shippedAt: o.shippedAt ?? null,
        paidOutAt: o.paidOutAt ?? null,
        refundedAt: o.refundedAt ?? null,
        createdAt: o.paidAt,
      })
      .returning({ id: t.orders.id });

    await db.insert(t.orderItems).values({ orderId: row.id, productId: productId[o.product], title: p.title, imagePath: p.images[0] ?? null, priceCents: p.priceCents, quantity: 1 });

    const first = o.fan.name.split(" ")[0];
    const events: (typeof t.orderEvents.$inferInsert)[] = [{ orderId: row.id, at: o.paidAt, actor: "fan", kind: "paid", text: `${o.fan.name} paid ${money(totals.totalCents)}. Order confirmation emailed.` }];
    if (o.shippedAt) events.push({ orderId: row.id, at: o.shippedAt, actor: "creator", kind: "shipped", text: `Marked shipped. Tracking emailed to ${first}.` });
    if (o.paidOutAt && payoutCents !== null) events.push({ orderId: row.id, at: o.paidOutAt, actor: "system", kind: "paid_out", text: `Paid out ${money(payoutCents)} to the creator.` });
    if (o.refundedAt) events.push({ orderId: row.id, at: o.refundedAt, actor: "system", kind: "refunded", text: `Refunded ${money(totals.totalCents)}. Not shipped in time.` });
    if (o.dispute) events.push({ orderId: row.id, at: o.dispute.openedAt, actor: "system", kind: "dispute_opened", text: "Chargeback opened by the fan's bank: “item not received”." });
    await db.insert(t.orderEvents).values(events);
  }

  // ---------- admin ----------
  await db.insert(t.reports).values([
    { code: "R-104", target: "creator", creatorId: creatorId.kofi, reason: "Pretending to be someone", message: "This isn't the real Kofi. His Instagram is kofimensahboxing and it doesn't link here.", reporterEmail: "kai@example.com", createdAt: ago(0, 6) },
    { code: "R-103", target: "item", productId: productId.p_theo_chair, creatorId: creatorId.theo, reason: "Not what it says", message: "The chair in these photos looks different from the one on stream.", reporterEmail: "lee@example.com", createdAt: ago(1, 3) },
    { code: "R-101", target: "item", productId: productId.p_rain_jacket, creatorId: creatorId.maya, reason: "Something else", message: "Price seems too high.", reporterEmail: "anon@example.com", status: "resolved", resolution: "No action needed", resolvedAt: ago(8), createdAt: ago(9) },
  ]);
  await db.insert(t.creatorNotes).values({ creatorId: creatorId.theo, body: "Launch partner. 0% fee agreed on our call.", createdAt: ago(10) });
  await db.insert(t.pendingFeeRates).values({ email: "nina@example.com", feeBps: 0, note: "Nina Reyes, 2M on TikTok. Agreed on a call", createdAt: ago(2) });
  await db.insert(t.auditLog).values([
    { at: ago(40), actorEmail: "admin", action: "fees.platform", summary: "Set the platform fee to 4.9%" },
    { at: ago(10), actorEmail: "admin", action: "fees.creator", summary: "Set Theo Vance's fee to 0% (Launch partner)", targetType: "creator", targetId: creatorId.theo },
    { at: ago(8), actorEmail: "admin", action: "report.resolve", summary: "Closed report R-101: No action needed", targetType: "report", targetId: "R-101" },
  ]);

  return { creators: Object.keys(creatorId).length, products: seedProducts.length, orders: seedOrders.length };
}

// CLI: npm run db:seed (dev only)
if (process.argv[1]?.endsWith("seed.ts")) {
  if (process.env.APP_ENV !== "development") {
    console.error("Refusing to seed: APP_ENV must be 'development'. Seeding wipes the app tables.");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) {
    console.error("DATABASE_URL_DIRECT is not set.");
    process.exit(1);
  }
  const { db, sql: conn } = createDb(url, { max: 1 });
  seed(db)
    .then((n) => console.log(`Seeded ${n.creators} creators, ${n.products} items, ${n.orders} orders.`))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => conn.end());
}
