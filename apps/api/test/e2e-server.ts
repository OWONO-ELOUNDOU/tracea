/**
 * API entry point for the end-to-end suite (`pnpm e2e`), started by the Playwright config.
 *
 * It lives under `test/`, so it is neither compiled into `dist/` nor shipped in the image: the
 * production entry point (`src/index.ts`) and the routes are unchanged. It runs the regular app on
 * an embedded PostgreSQL (same migrations as production), keeps mail in memory, and inserts the
 * verified accounts listed in `E2E_ACCOUNTS` directly into the database.
 */
import { z } from "zod";
import { buildApp } from "../src/app.js";
import { hashPassword } from "../src/auth/password.js";
import { loadConfig } from "../src/config.js";
import { createEmbeddedDatabase } from "../src/db/client.js";
import { users } from "../src/db/schema.js";
import { MemoryMailer } from "../src/mail/mailer.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("e2e-server must never run with NODE_ENV=production");
}

const AccountsSchema = z
  .array(z.object({ email: z.email(), password: z.string().min(12) }))
  .min(1, "E2E_ACCOUNTS must list at least one account");
const accounts = AccountsSchema.parse(JSON.parse(process.env.E2E_ACCOUNTS ?? "[]"));

// NODE_ENV=test is the existing switch that lifts the per-route login and mail limits (10 and
// 5 per 15 minutes), as in the API test suite; the production configuration is not affected.
const config = loadConfig({
  NODE_ENV: "test",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "warn",
  API_PORT: process.env.API_PORT ?? "3001",
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  RATE_LIMIT_PER_MINUTE: "1000",
  // Fixed, non-secret value: sessions only live as long as this in-memory database.
  SESSION_SECRET: "e2e-only-session-secret-not-used-anywhere-else",
});

const database = await createEmbeddedDatabase();
const verifiedAt = new Date();
await database.db.insert(users).values(
  await Promise.all(
    accounts.map(async (account) => ({
      email: account.email,
      passwordHash: await hashPassword(account.password),
      emailVerifiedAt: verifiedAt,
    })),
  ),
);

const app = await buildApp(config, { db: database.db, mailer: new MemoryMailer() });

const shutdown = async (): Promise<void> => {
  await app.close();
  await database.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await app.listen({ port: config.API_PORT, host: "localhost" });
app.log.info({ accounts: accounts.length }, "e2e API ready on embedded database");
