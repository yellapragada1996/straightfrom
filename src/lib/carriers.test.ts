import { describe, expect, it } from "vitest";
import { carrier } from "@/server/db/schema";
import { CARRIERS, trackingUrl } from "./carriers";

describe("carriers", () => {
  it("match the database's carrier enum exactly", () => {
    expect(CARRIERS.map((c) => c.key)).toEqual(carrier.enumValues);
  });

  it("builds each carrier's tracking link", () => {
    expect(trackingUrl("usps", "9400111202555842331234")).toBe("https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111202555842331234");
    expect(trackingUrl("ups", "1Z999AA10123456784")).toBe("https://www.ups.com/track?tracknum=1Z999AA10123456784");
    for (const c of CARRIERS) if (c.track) expect(trackingUrl(c.key, "ABC123")).toMatch(/^https:\/\//);
  });

  it("strips spaces a creator may have typed", () => {
    expect(trackingUrl("usps", "9400 1112 0255")).toBe("https://tools.usps.com/go/TrackConfirmAction?tLabels=940011120255");
  });

  it("escapes anything that isn't a plain tracking number", () => {
    expect(trackingUrl("ups", "1Z&x=1")).toBe("https://www.ups.com/track?tracknum=1Z%26x%3D1");
  });

  it("has no link for 'Other' or an empty number", () => {
    expect(trackingUrl("other", "12345")).toBeNull();
    expect(trackingUrl("usps", "  ")).toBeNull();
  });
});
