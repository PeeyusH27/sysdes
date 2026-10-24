import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  // Pages with a story open on the walkthrough; most specs read the written lesson, so they start in that view.
  // tests/e2e/story.spec.ts starts from a clean browser instead.
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Most specs read the scrolling page, which is also the default; the explicit setting keeps them there whatever the default is.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORT}`,
          localStorage: [
            { name: "sds-view", value: "read" },
            { name: "sds-progress", value: JSON.stringify({ state: { readerMode: "scroll" }, version: 2 }) },
          ],
        },
      ],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
