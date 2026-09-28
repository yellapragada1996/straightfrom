import { test as base, expect, type Page } from "@playwright/test";

/** Every page must load without console errors and without sideways scrolling on a phone. */
export const test = base.extend<{ allowedConsoleErrors: RegExp[]; noConsoleErrors: void }>({
  /** Console errors a specific test expects (e.g. the 404 on the not-found page). Everything else fails the test. */
  allowedConsoleErrors: [[], { option: true }],
  noConsoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && !allowedConsoleErrors.some((re) => re.test(m.text()))) errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await use();
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export async function expectNoSidewaysScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, "page scrolls sideways").toBeLessThanOrEqual(client);
}

export { expect };
