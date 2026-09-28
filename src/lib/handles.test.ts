import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkHandle, RESERVED, suggestHandle } from "./handles";

describe("checkHandle", () => {
  it("accepts a normal handle, case-insensitively", () => {
    expect(checkHandle("new_creator1")).toEqual({ ok: true });
    expect(checkHandle("  New_Creator1 ")).toEqual({ ok: true });
  });

  it.each([
    ["", "Pick a handle"],
    ["ab", "At least 3 characters"],
    ["a".repeat(31), "30 characters max"],
    ["maya okafor", "Only letters, numbers and _"],
    ["maya.okafor", "Only letters, numbers and _"],
    ["dashboard", "That one's reserved"],
    ["mayaokafor", "Already taken"],
  ])("rejects %j: %s", (input, reason) => {
    expect(checkHandle(input)).toEqual({ ok: false, reason });
  });

  it("lets a creator keep their own handle", () => {
    expect(checkHandle("mayaokafor", "mayaokafor")).toEqual({ ok: true });
  });

  it("reserves every top-level page, so no handle can ever clash with a route", () => {
    const app = join(process.cwd(), "src/app");
    const routes = readdirSync(app, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("[") && !d.name.startsWith("(") && !d.name.startsWith("_"))
      .map((d) => d.name);
    for (const r of routes) expect(RESERVED.has(r), `"${r}" is a route but not a reserved handle`).toBe(true);
    // Planned routes that don't exist yet (docs/BACKEND_PLAN.md §5)
    for (const r of ["auth", "api", "admin"]) expect(RESERVED.has(r)).toBe(true);
  });
});

describe("suggestHandle", () => {
  it("builds a valid handle from an email or name", () => {
    expect(suggestHandle("Maya.Okafor+shop@gmail.com")).toBe("mayaokaforshop");
    expect(suggestHandle("Théo Vance")).toBe("thovance");
    expect(suggestHandle("x".repeat(40) + "@a.co")).toHaveLength(30);
  });
});
