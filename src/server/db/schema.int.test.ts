import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb } from "../../../test/db";
import * as t from "./schema";
import { resetAppTables } from "./seed";

const { db, sql: conn } = testDb();
afterAll(() => conn.end());
beforeEach(() => resetAppTables(db));

const APP_TABLES = Object.values(t)
  .filter((x): x is typeof t.creators => typeof x === "object" && x !== null && Symbol.for("drizzle:IsDrizzleTable") in x)
  .map((x) => (x as unknown as Record<symbol, string>)[Symbol.for("drizzle:Name")]);

async function makeCreator(handle = "maya_test") {
  const [c] = await db.insert(t.creators).values({ userId: randomUUID(), email: `${handle}@example.com`, handle, displayName: "Test" }).returning();
  return c;
}

const baseOrder = (creatorId: string) => ({
  code: "SF-" + randomUUID().slice(0, 5).toUpperCase(),
  creatorId,
  fanEmail: "fan@example.com",
  fanName: "Fan",
  shipTo: { line1: "1 Main St", city: "Austin", region: "TX", postal: "78704", country: "US" },
  itemsCents: 8000,
  shippingCents: 2000,
  totalCents: 10000,
  feeBps: 490,
  feeCents: 392,
});

describe("database: locked to the outside", () => {
  it("creates all 17 tables", () => {
    expect(APP_TABLES).toHaveLength(17);
  });

  it("has row level security on every table in public", async () => {
    const rows = await db.execute<{ tablename: string; rowsecurity: boolean }>(
      sql`select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(17);
    for (const r of rows) expect(r.rowsecurity, `${r.tablename} has RLS off`).toBe(true);
  });
});

describe("database: rules the database enforces itself", () => {
  it("only allows valid handles, and each only once", async () => {
    await makeCreator("valid_handle");
    await expect(makeCreator("valid_handle")).rejects.toThrow();
    await expect(makeCreator("Bad Handle")).rejects.toThrow();
    await expect(makeCreator("ab")).rejects.toThrow();
  });

  it("rejects a creator fee outside 0–100%", async () => {
    const c = await makeCreator();
    await expect(db.update(t.creators).set({ feeBps: 10001 }).where(sql`id = ${c.id}`)).rejects.toThrow();
    await db.update(t.creators).set({ feeBps: 0 }).where(sql`id = ${c.id}`);
  });

  it("rejects an order whose total doesn't add up", async () => {
    const c = await makeCreator();
    await expect(db.insert(t.orders).values({ ...baseOrder(c.id), totalCents: 9999 })).rejects.toThrow();
  });

  it("rejects a payout that isn't total − our fee − Stripe's fee", async () => {
    const c = await makeCreator();
    await expect(db.insert(t.orders).values({ ...baseOrder(c.id), stripeFeeCents: 320, payoutCents: 9300 })).rejects.toThrow();
    await expect(db.insert(t.orders).values({ ...baseOrder(c.id), payoutCents: 9288 })).rejects.toThrow(); // no Stripe fee yet
    await db.insert(t.orders).values({ ...baseOrder(c.id), stripeFeeCents: 320, payoutCents: 9288 });
    await db.insert(t.orders).values({ ...baseOrder(c.id) }); // fee unknown yet → payout stays empty
  });

  it("stores fan emails lowercase only", async () => {
    const c = await makeCreator();
    await expect(db.insert(t.orders).values({ ...baseOrder(c.id), fanEmail: "Fan@Example.com" })).rejects.toThrow();
  });

  it("never lets an order code or PaymentIntent repeat", async () => {
    const c = await makeCreator();
    const o = baseOrder(c.id);
    await db.insert(t.orders).values({ ...o, stripePaymentIntentId: "pi_1" });
    await expect(db.insert(t.orders).values({ ...o, code: "SF-OTHER" + Math.random(), stripePaymentIntentId: "pi_1" })).rejects.toThrow();
    await expect(db.insert(t.orders).values({ ...o })).rejects.toThrow();
  });

  it("keeps platform settings to a single row", async () => {
    await db.insert(t.platformSettings).values({ id: 1, feeBps: 490 });
    await expect(db.insert(t.platformSettings).values({ id: 2, feeBps: 490 })).rejects.toThrow();
  });

  it("rejects negative prices and stock", async () => {
    const c = await makeCreator();
    const p = { creatorId: c.id, slug: "x", title: "X", priceCents: 100, shippingCents: 0 };
    await expect(db.insert(t.products).values({ ...p, priceCents: -1 })).rejects.toThrow();
    await expect(db.insert(t.products).values({ ...p, quantity: -1 })).rejects.toThrow();
  });
});
