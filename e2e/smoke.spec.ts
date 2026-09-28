import { SHIP_DEADLINE_DAYS } from "../src/config";
import { expect, expectNoSidewaysScroll, test } from "./fixtures";

// Smoke test: the public pages a fan lands on from a creator's link load cleanly on a phone.

test("homepage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/your stuff/i);
  await expect(page.getByRole("link", { name: /sign up/i }).first()).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("creator page", async ({ page }) => {
  await page.goto("/mayaokafor");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/maya/i);
  await expect(page.getByText("The rain jacket from the Japan vlog").first()).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("item page shows the price, the buy button and the ship-by promise from config", async ({ page }) => {
  await page.goto("/mayaokafor/rain-jacket-japan-vlog");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The rain jacket from the Japan vlog");
  await expect(page.getByRole("button", { name: /add to cart/i }).first()).toBeVisible();
  await expect(page.getByText(`Ships in ${SHIP_DEADLINE_DAYS} days or you're refunded`)).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test.describe("not found", () => {
  test.use({ allowedConsoleErrors: [/status of 404/] });
  test("an unknown creator shows the not-found page", async ({ page }) => {
    const res = await page.goto("/no_such_creator_xyz");
    expect(res?.status()).toBe(404);
    await expectNoSidewaysScroll(page);
  });
});

test("sign-up page offers Google and email + password", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByLabel("Create a password")).toBeVisible();
  await expectNoSidewaysScroll(page);
});
