import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createEmbeddedDatabase, type DatabaseHandle } from "../src/db/client.js";
import { MemoryMailer } from "../src/mail/mailer.js";

export interface TestContext {
  app: FastifyInstance;
  mailer: MemoryMailer;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestContext> {
  const database: DatabaseHandle = await createEmbeddedDatabase();
  const mailer = new MemoryMailer();
  const app = await buildApp(
    loadConfig({
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      SESSION_SECRET: "test-secret-test-secret-test-secret-1234",
      RATE_LIMIT_PER_MINUTE: "1000",
    }),
    { db: database.db, mailer },
  );
  return {
    app,
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
    overrides: { csrf?: string | null } = {},
  ): Promise<LightMyRequestResponse> {
    const headers: Record<string, string> = {};
    const csrf = overrides.csrf === undefined ? this.cookies.get("tracea_csrf") : overrides.csrf;
    if (csrf !== undefined && csrf !== null) headers["x-csrf-token"] = csrf;
    if (body !== undefined) headers["content-type"] = "application/json";
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
