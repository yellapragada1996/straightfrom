import { describe, expect, it } from "vitest";
import { creatorEarns, feeFor, fmtFee, parseFeePercent } from "./fees";

describe("feeFor", () => {
  it("is the rate applied to the item price, in whole cents", () => {
    expect(feeFor(8000, 490)).toBe(392);
    expect(feeFor(8000, 0)).toBe(0);
    expect(feeFor(1050, 490)).toBe(51);
  });
});

describe("creatorEarns (preview before card processing)", () => {
  it("is price − our fee + shipping", () => {
    expect(creatorEarns(8000, 2000, 490)).toBe(9608);
  });
});

describe("fmtFee", () => {
  it("formats basis points without trailing zeros", () => {
    expect(fmtFee(490)).toBe("4.9%");
    expect(fmtFee(0)).toBe("0%");
    expect(fmtFee(1500)).toBe("15%");
    expect(fmtFee(125)).toBe("1.25%");
  });
});

describe("parseFeePercent", () => {
  it.each([
    ["4.9", 490],
    ["4.9%", 490],
    [" 0 ", 0],
    ["100", 10000],
    ["1.25", 125],
  ])("parses %j as %i bps", (input, bps) => {
    expect(parseFeePercent(input)).toBe(bps);
  });

  it.each(["", "abc", "-1", "101", "4.999", "1e2", "4,9"])("rejects %j", (input) => {
    expect(parseFeePercent(input)).toBeNull();
  });
});
