import { defineConfig, devices } from "@playwright/test";
import { accounts } from "./fixtures/accounts.js";

const WEB_URL = "http://localhost:3000";
const API_URL = "http://localhost:3001";
const isCI = process.env.CI !== undefined;

/**
 * `pnpm e2e` (repository root) builds the web app, then this config starts the stack:
 * - API: production app on an embedded database with verified test accounts (apps/api/test/e2e-server.ts);
 * - web: the standalone server of the production build, as in the `web` image
 *   (infra/docker/web.Dockerfile), which calls the API at its default URL.
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
      // `next start` does not support `output: "standalone"`. Like the image, copy the static
      // assets next to the standalone server, then run it.
      command:
        "cp -R .next/static .next/standalone/apps/web/.next/ && node .next/standalone/apps/web/server.js",
      cwd: "../apps/web",
      env: { PORT: "3000", HOSTNAME: "localhost" },
      url: `${WEB_URL}/connexion`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
