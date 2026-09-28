import { describe, expect, it } from "vitest";
import { days, SHIP_COUNTRIES, SHIP_COUNTRIES_TEXT } from "./config";

describe("config", () => {
  it("days() reads naturally", () => {
    expect(days(1)).toBe("1 day");
    expect(days(7)).toBe("7 days");
  });

  it("ship-to text matches the country list", () => {
    expect(SHIP_COUNTRIES.map((c) => c.code)).toEqual(["US", "CA"]);
    expect(SHIP_COUNTRIES_TEXT).toBe("the US and Canada");
  });
});
