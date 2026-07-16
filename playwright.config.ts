import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E config. Assumes MongoDB is reachable (docker compose up -d mongo) and the
 * database has been seeded: `npm run seed && npm run seed:demo`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "next dev -p 3000",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      MONGODB_URI: process.env.MONGODB_URI ?? "mongodb://localhost:27017",
      MONGODB_DB: process.env.MONGODB_DB ?? "caliber",
      NEXTAUTH_URL: BASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-test-secret",
    },
  },
});
