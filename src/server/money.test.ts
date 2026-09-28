import { describe, expect, it } from "vitest";
import { creatorPayoutCents, effectiveFeeBps, orderTotals } from "./money";

describe("orderTotals", () => {
  it("matches the plan's $100 example: $80 item + $20 shipping at 4.9%", () => {
    expect(orderTotals([{ priceCents: 8000, shippingCents: 2000, quantity: 1 }], 490)).toEqual({
      itemsCents: 8000,
      shippingCents: 2000,
      totalCents: 10000,
      feeBps: 490,
      feeCents: 392,
    });
  });

  it("takes our fee on the item price only, never on shipping", () => {
    const t = orderTotals([{ priceCents: 1000, shippingCents: 5000, quantity: 1 }], 1000);
    expect(t.feeCents).toBe(100);
  });

  it("charges shipping once per order: the highest of the items", () => {
    const t = orderTotals(
      [
        { priceCents: 3500, shippingCents: 500, quantity: 2 },
        { priceCents: 18000, shippingCents: 1500, quantity: 1 },
      ],
      490,
    );
    expect(t.itemsCents).toBe(3500 * 2 + 18000);
    expect(t.shippingCents).toBe(1500);
    expect(t.totalCents).toBe(25000 + 1500);
  });

  it("rounds the fee once per order to whole cents", () => {
    // 1050 × 4.9% = 51.45 → 51
    expect(orderTotals([{ priceCents: 1050, shippingCents: 0, quantity: 1 }], 490).feeCents).toBe(51);
    // 1070 × 4.9% = 52.43 → 52; 1071 × 4.9% = 52.479 → 52; 1072 × 4.9% = 52.528 → 53
    expect(orderTotals([{ priceCents: 1072, shippingCents: 0, quantity: 1 }], 490).feeCents).toBe(53);
  });

  it("charges nothing at a 0% rate", () => {
    expect(orderTotals([{ priceCents: 22000, shippingCents: 6000, quantity: 1 }], 0).feeCents).toBe(0);
  });

  it("rejects bad input instead of guessing", () => {
    expect(() => orderTotals([], 490)).toThrow(RangeError);
    expect(() => orderTotals([{ priceCents: 10.5, shippingCents: 0, quantity: 1 }], 490)).toThrow(RangeError);
    expect(() => orderTotals([{ priceCents: -1, shippingCents: 0, quantity: 1 }], 490)).toThrow(RangeError);
    expect(() => orderTotals([{ priceCents: 100, shippingCents: 0, quantity: 0 }], 490)).toThrow(RangeError);
    expect(() => orderTotals([{ priceCents: 100, shippingCents: 0, quantity: 1 }], 10001)).toThrow(RangeError);
    expect(() => orderTotals([{ priceCents: 100, shippingCents: 0, quantity: 1 }], 4.9)).toThrow(RangeError);
  });
});

describe("creatorPayoutCents", () => {
  it("is total − our fee − Stripe's fee ($100 example → $92.88)", () => {
    expect(creatorPayoutCents({ totalCents: 10000, feeCents: 392 }, 320)).toBe(9288);
  });

  it("is null while Stripe hasn't reported its fee, so nothing is paid on a guess", () => {
    expect(creatorPayoutCents({ totalCents: 10000, feeCents: 392 }, null)).toBeNull();
    expect(creatorPayoutCents({ totalCents: 10000, feeCents: 392 }, undefined)).toBeNull();
  });

  it("gives a 0% creator everything except Stripe's fee", () => {
    expect(creatorPayoutCents({ totalCents: 10000, feeCents: 0 }, 320)).toBe(9680);
  });

  it("refuses fees larger than the order", () => {
    expect(() => creatorPayoutCents({ totalCents: 100, feeCents: 5 }, 130)).toThrow(RangeError);
  });

  it("refuses a fractional Stripe fee", () => {
    expect(() => creatorPayoutCents({ totalCents: 10000, feeCents: 392 }, 3.2)).toThrow(RangeError);
  });
});

describe("effectiveFeeBps", () => {
  it("uses the creator's own rate when set, including 0%", () => {
    expect(effectiveFeeBps(0, 490)).toBe(0);
    expect(effectiveFeeBps(250, 490)).toBe(250);
  });
  it("falls back to the platform rate", () => {
    expect(effectiveFeeBps(null, 490)).toBe(490);
    expect(effectiveFeeBps(undefined, 490)).toBe(490);
  });
});
