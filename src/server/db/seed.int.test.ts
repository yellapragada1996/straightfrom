import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { products as sampleProducts } from "@/lib/mock-data";
import { testDb } from "../../../test/db";
import { seed } from "./seed";
import * as t from "./schema";

const { db, sql: conn } = testDb();
afterAll(() => conn.end());

describe("seed", () => {
  it("loads the prototype's sample data", async () => {
    expect(await seed(db)).toEqual({ creators: 6, products: 19, orders: 9 });
    const [{ n: images }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from product_images`);
    expect(images).toBe(sampleProducts.reduce((n, p) => n + p.images.length, 0));
  });

  it("can run again (it resets first)", async () => {
    await seed(db);
    const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from creators`);
    expect(n).toBe(6);
  });

  it("gives every paid order a payout of total − our fee − Stripe's fee", async () => {
    const rows = await db.select().from(t.orders);
    for (const o of rows) expect(o.payoutCents).toBe(o.totalCents - o.feeCents - (o.stripeFeeCents ?? NaN));
  });

  it("applies Theo's 0% rate to his orders, 4.9% to everyone else's", async () => {
    const rows = await db.execute<{ handle: string; fee_bps: number }>(
      sql`select c.handle, o.fee_bps from orders o join creators c on c.id = o.creator_id`,
    );
    for (const r of rows) expect(r.fee_bps).toBe(r.handle === "theoplays" ? 0 : 490);
  });
});
