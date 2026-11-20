import { BuildingModelSchema, type BuildingModel } from "@tracea/domain";
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createEmbeddedDatabase, type Database, type DatabaseHandle } from "../src/db/client.js";
import { MemoryMailer } from "../src/mail/mailer.js";

export interface TestContext {
  app: FastifyInstance;
  db: Database;
  mailer: MemoryMailer;
  close: () => Promise<void>;
}

export interface TestAppOptions {
  env?: Record<string, string>;
  strictRateLimits?: boolean;
}

export async function createTestApp(options: TestAppOptions = {}): Promise<TestContext> {
  const database: DatabaseHandle = await createEmbeddedDatabase();
  const mailer = new MemoryMailer();
  const app = await buildApp(
    loadConfig({
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      SESSION_SECRET: "test-secret-test-secret-test-secret-1234",
      RATE_LIMIT_PER_MINUTE: "1000",
      ...options.env,
    }),
    { db: database.db, mailer },
    options.strictRateLimits === undefined ? {} : { strictRateLimits: options.strictRateLimits },
  );
  return {
    app,
    db: database.db,
    mailer,
    close: async () => {
      await app.close();
      await database.close();
    },
  };
}

/** Browser-like client: keeps cookies between calls and sends the CSRF header on mutations. */
export class Client {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly app: FastifyInstance) {}

  async csrf(): Promise<void> {
    await this.request("GET", "/auth/csrf");
  }

  async request(
    method: NonNullable<InjectOptions["method"]>,
    url: string,
    body?: unknown,
    overrides: { csrf?: string | null; headers?: Record<string, string> } = {},
  ): Promise<LightMyRequestResponse> {
    const headers: Record<string, string> = { ...overrides.headers };
    const csrf = overrides.csrf === undefined ? this.cookies.get("tracea_csrf") : overrides.csrf;
    if (csrf !== undefined && csrf !== null) headers["x-csrf-token"] = csrf;
    if (body !== undefined) headers["content-type"] ??= "application/json";
    const options: InjectOptions = {
      method,
      url,
      headers,
      cookies: Object.fromEntries(this.cookies),
      ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
    };
    const response: LightMyRequestResponse = await this.app.inject(options);
    for (const cookie of response.cookies) {
      if (
        cookie.value === "" ||
        (cookie.expires !== undefined && cookie.expires.getTime() < Date.now())
      ) {
        this.cookies.delete(cookie.name);
      } else {
        this.cookies.set(cookie.name, cookie.value);
      }
    }
    return response;
  }
}

export function extractToken(text: string, path: string): string {
  const match = new RegExp(`${path}\\?token=([A-Za-z0-9_%-]+)`).exec(text);
  if (match?.[1] === undefined) throw new Error(`no token link for ${path} in mail`);
  return decodeURIComponent(match[1]);
}

const TEST_PASSWORD = "plan-de-masse-2026!";

/** Registers an account, verifies its address and returns a logged-in client. */
export async function createLoggedInClient(ctx: TestContext, email: string): Promise<Client> {
  const client = new Client(ctx.app);
  await client.csrf();
  await client.request("POST", "/auth/register", { email, password: TEST_PASSWORD });
  const mail = ctx.mailer.lastTo(email);
  if (mail === undefined) throw new Error(`no verification mail for ${email}`);
  const token = extractToken(mail.text, "/verification");
  await client.request("POST", "/auth/verify-email", { token });
  const login = await client.request("POST", "/auth/login", { email, password: TEST_PASSWORD });
  if (login.statusCode !== 200) throw new Error(`login failed for ${email}`);
  return client;
}

/** Reference BuildingModel shared with the contract tests of @tracea/domain. */
export function loadFixtureModel(): BuildingModel {
  const path = resolve(
    import.meta.dirname,
    "../../../packages/domain/fixtures/house-rectangular.json",
  );
  return BuildingModelSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
