import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: a few critical journeys in a phone-sized browser (CLAUDE.md, BACKEND_PLAN §21).
// Locally they reuse the running dev server; in CI they build and start the app.
const PORT = 3000;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  projects: [{ name: "phone", use: { ...devices["iPhone 13"], browserName: "chromium" } }],
  webServer: {
    command: process.env.CI ? `npm run start -- -p ${PORT}` : "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
