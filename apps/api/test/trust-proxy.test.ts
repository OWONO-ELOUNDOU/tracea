import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { createTestApp, type TestContext } from "./helpers.js";

const BASE_ENV = { SESSION_SECRET: "test-secret-test-secret-test-secret-1234" };

/** Sends a CSRF-protected POST from the given socket address, with an optional forwarded header. */
async function post(
  app: FastifyInstance,
  url: string,
  body: unknown,
  remoteAddress: string,
  forwardedFor?: string,
): Promise<LightMyRequestResponse> {
  const token = "csrf-token-for-rate-limit-tests";
  return app.inject({
    method: "POST",
    url,
    remoteAddress,
    cookies: { tracea_csrf: token },
    headers: {
      "content-type": "application/json",
      "x-csrf-token": token,
      ...(forwardedFor === undefined ? {} : { "x-forwarded-for": forwardedFor }),
    },
    payload: JSON.stringify(body),
  });
}

const badLogin = { email: "cible@example.org", password: "mauvais-mot-de-passe" };

describe("TRUST_PROXY configuration", () => {
  it("trusts no proxy by default", () => {
    expect(loadConfig(BASE_ENV).TRUST_PROXY).toBeUndefined();
    expect(loadConfig({ ...BASE_ENV, TRUST_PROXY: " " }).TRUST_PROXY).toBeUndefined();
  });

  it("accepts a list of addresses and ranges", () => {
    expect(
      loadConfig({ ...BASE_ENV, TRUST_PROXY: "10.0.0.0/8, 192.168.1.4,loopback" }).TRUST_PROXY,
    ).toBe("10.0.0.0/8,192.168.1.4,loopback");
  });

  it.each(["true", "TRUE", "*", "0.0.0.0/0", "::/0", "10.0.0.0/8,0.0.0.0/0", "1", "2"])(
    "refuses %s at start-up",
    (value) => {
      expect(() => loadConfig({ ...BASE_ENV, TRUST_PROXY: value })).toThrow(/TRUST_PROXY/);
    },
  );
});

describe("rate limits without a trusted proxy", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp({ strictRateLimits: true });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("keeps counting logins when X-Forwarded-For changes", async () => {
    const client = "198.51.100.20";
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await post(ctx.app, "/auth/login", badLogin, client);
      expect(response.statusCode, `attempt ${attempt}`).toBe(401);
    }
    const spoofed = await post(ctx.app, "/auth/login", badLogin, client, "203.0.113.77");
    expect(spoofed.statusCode).toBe(429);
    expect(spoofed.json()).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("keeps counting password reset requests when X-Forwarded-For changes", async () => {
    const client = "198.51.100.21";
    const body = { email: "cible@example.org" };
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await post(
        ctx.app,
        "/auth/password/forgot",
        body,
        client,
        `203.0.113.${attempt}`,
      );
      expect(response.statusCode, `attempt ${attempt}`).toBe(202);
    }
    const spoofed = await post(ctx.app, "/auth/password/forgot", body, client, "203.0.113.99");
    expect(spoofed.statusCode).toBe(429);
  });
});

describe("rate limits behind a trusted proxy", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp({ env: { TRUST_PROXY: "10.0.0.0/8" }, strictRateLimits: true });
    ctx.app.get("/test/client-ip", (request) => ({ ip: request.ip }));
  });

  afterAll(async () => {
    await ctx.close();
  });

  async function clientIp(remoteAddress: string, forwardedFor: string): Promise<string> {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/test/client-ip",
      remoteAddress,
      headers: { "x-forwarded-for": forwardedFor },
    });
    return response.json<{ ip: string }>().ip;
  }

  it("takes the client address added by the trusted proxy", async () => {
    expect(await clientIp("10.1.1.1", "203.0.113.7, 198.51.100.9")).toBe("198.51.100.9");
  });

  it("ignores the header sent by a client that is not a trusted proxy", async () => {
    expect(await clientIp("198.51.100.9", "203.0.113.7")).toBe("198.51.100.9");
  });

  it("counts logins per client, not per proxy", async () => {
    const proxy = "10.1.1.1";
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const forwarded = `203.0.113.${attempt}, 198.51.100.30`;
      const response = await post(ctx.app, "/auth/login", badLogin, proxy, forwarded);
      expect(response.statusCode, `attempt ${attempt}`).toBe(401);
    }
    const sameClient = await post(
      ctx.app,
      "/auth/login",
      badLogin,
      proxy,
      "203.0.113.200, 198.51.100.30",
    );
    expect(sameClient.statusCode).toBe(429);
    const otherClient = await post(ctx.app, "/auth/login", badLogin, proxy, "198.51.100.31");
    expect(otherClient.statusCode).toBe(401);
  });
});
