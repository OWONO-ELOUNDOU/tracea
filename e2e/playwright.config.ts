import { defineConfig, devices } from "@playwright/test";
import { accounts } from "./fixtures/accounts.js";

const WEB_URL = "http://localhost:3000";
const API_URL = "http://localhost:3001";
const isCI = process.env.CI !== undefined;

/**
 * `pnpm e2e` (repository root) builds the web app, then this config starts the stack:
 * - API: production app on an embedded database with verified test accounts (apps/api/test/e2e-server.ts);
 * - web: `next start` on the production build, which calls the API at its default URL.
 * Ports are the defaults (3000 / 3001) so the web build needs no e2e-specific setting; existing
 * servers are never reused, so a running dev stack makes the run fail instead of hitting the wrong API.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  reporter: isCI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Chromium only for now (sprint 2 decision D12).
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @tracea/api exec tsx test/e2e-server.ts",
      url: `${API_URL}/health`,
      env: {
        API_PORT: "3001",
        APP_URL: WEB_URL,
        E2E_ACCOUNTS: JSON.stringify(Object.values(accounts)),
      },
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
    },
    {
      command: "pnpm --filter @tracea/web start",
      url: `${WEB_URL}/connexion`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
