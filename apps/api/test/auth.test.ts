import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, createTestApp, extractToken, type TestContext } from "./helpers.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.close();
});

const EMAIL = "marie@example.org";
const PASSWORD = "plan-de-masse-2026!";

async function registerAndVerify(email = EMAIL, password = PASSWORD): Promise<Client> {
  const client = new Client(ctx.app);
  await client.csrf();
  const registered = await client.request("POST", "/auth/register", { email, password });
  expect(registered.statusCode).toBe(201);
  const mail = ctx.mailer.lastTo(email);
  expect(mail?.subject).toBe("Vérifiez votre adresse e-mail");
  const token = extractToken(mail!.text, "/verification");
  const verified = await client.request("POST", "/auth/verify-email", { token });
  expect(verified.statusCode).toBe(204);
  return client;
}

describe("CSRF", () => {
  it("rejects a mutation without the token", async () => {
    const client = new Client(ctx.app);
    const response = await client.request("POST", "/auth/login", {
      email: EMAIL,
      password: PASSWORD,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "CSRF_TOKEN_INVALID" });
  });

  it("rejects a header that does not match the cookie", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    const response = await client.request(
      "POST",
      "/auth/login",
      { email: EMAIL, password: PASSWORD },
      { csrf: "wrong" },
    );
    expect(response.statusCode).toBe(403);
  });
});

describe("registration and login", () => {
  it("registers, verifies, logs in and reads the profile", async () => {
    const client = await registerAndVerify();

    const login = await client.request("POST", "/auth/login", { email: EMAIL, password: PASSWORD });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({
      user: { email: EMAIL, emailVerified: true, plan: "free" },
    });
    const sessionCookie = login.cookies.find((cookie) => cookie.name === "tracea_session");
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe("Lax");

    const me = await client.request("GET", "/me");
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ user: { email: EMAIL } });

    const patched = await client.request("PATCH", "/me", { displayName: "Marie" });
    expect(patched.json()).toMatchObject({ user: { displayName: "Marie" } });

    const logout = await client.request("POST", "/auth/logout");
    expect(logout.statusCode).toBe(204);
    const afterLogout = await client.request("GET", "/me");
    expect(afterLogout.statusCode).toBe(401);
  });

  it("answers 201 again for an existing address without leaking it", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    const sentBefore = ctx.mailer.sent.length;
    const response = await client.request("POST", "/auth/register", {
      email: EMAIL,
      password: PASSWORD,
    });
    expect(response.statusCode).toBe(201);
    expect(ctx.mailer.sent.length).toBe(sentBefore);
  });

  it("refuses a weak password", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    const response = await client.request("POST", "/auth/register", {
      email: "paul@example.org",
      password: "short",
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: "PASSWORD_TOO_WEAK" });
  });

  it("refuses an invalid e-mail with field details", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    const response = await client.request("POST", "/auth/register", {
      email: "pas-un-email",
      password: PASSWORD,
    });
    expect(response.statusCode).toBe(422);
    const body = response.json<{ code: string; fields: Record<string, string> }>();
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(typeof body.fields.email).toBe("string");
  });

  it("rejects a wrong password with a single generic message", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    const response = await client.request("POST", "/auth/login", {
      email: EMAIL,
      password: "wrong-password-123",
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "INVALID_CREDENTIALS" });
    const unknown = await client.request("POST", "/auth/login", {
      email: "nobody@example.org",
      password: "wrong-password-123",
    });
    expect(unknown.json()).toEqual(response.json());
  });

  it("refuses login before e-mail verification", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    await client.request("POST", "/auth/register", {
      email: "jean@example.org",
      password: PASSWORD,
    });
    const response = await client.request("POST", "/auth/login", {
      email: "jean@example.org",
      password: PASSWORD,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("rejects a verification token used twice", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    await client.request("POST", "/auth/register", {
      email: "lea@example.org",
      password: PASSWORD,
    });
    const token = extractToken(ctx.mailer.lastTo("lea@example.org")!.text, "/verification");
    expect((await client.request("POST", "/auth/verify-email", { token })).statusCode).toBe(204);
    const again = await client.request("POST", "/auth/verify-email", { token });
    expect(again.statusCode).toBe(400);
    expect(again.json()).toMatchObject({ code: "TOKEN_INVALID" });
  });
});

describe("password reset", () => {
  it("resets the password and closes every session", async () => {
    const email = "nadia@example.org";
    const client = await registerAndVerify(email);
    expect(
      (await client.request("POST", "/auth/login", { email, password: PASSWORD })).statusCode,
    ).toBe(200);

    const forgot = await client.request("POST", "/auth/password/forgot", { email });
    expect(forgot.statusCode).toBe(202);
    const token = extractToken(ctx.mailer.lastTo(email)!.text, "/reinitialisation");

    const newPassword = "nouveau-mot-de-passe-42";
    const reset = await client.request("POST", "/auth/password/reset", {
      token,
      password: newPassword,
    });
    expect(reset.statusCode).toBe(204);

    expect((await client.request("GET", "/me")).statusCode).toBe(401);
    expect(
      (await client.request("POST", "/auth/login", { email, password: PASSWORD })).statusCode,
    ).toBe(401);
    expect(
      (await client.request("POST", "/auth/login", { email, password: newPassword })).statusCode,
    ).toBe(200);
  });

  it("answers 202 for an unknown address without sending mail", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    const sentBefore = ctx.mailer.sent.length;
    const response = await client.request("POST", "/auth/password/forgot", {
      email: "ghost@example.org",
    });
    expect(response.statusCode).toBe(202);
    expect(ctx.mailer.sent.length).toBe(sentBefore);
  });

  it("rejects an unknown reset token", async () => {
    const client = new Client(ctx.app);
    await client.csrf();
    const response = await client.request("POST", "/auth/password/reset", {
      token: "0123456789abcdefghij",
      password: "nouveau-mot-de-passe-42",
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("logout-all", () => {
  it("revokes every session of the user", async () => {
    const email = "omar@example.org";
    const first = await registerAndVerify(email);
    await first.request("POST", "/auth/login", { email, password: PASSWORD });
    const second = new Client(ctx.app);
    await second.csrf();
    await second.request("POST", "/auth/login", { email, password: PASSWORD });

    expect((await second.request("POST", "/auth/logout-all")).statusCode).toBe(204);
    expect((await first.request("GET", "/me")).statusCode).toBe(401);
    expect((await second.request("GET", "/me")).statusCode).toBe(401);
  });
});
