import type { FastifyError, FastifyReply, FastifyRequest, LightMyRequestResponse } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "../src/errors.js";
import { problemErrorHandler } from "../src/problem.js";
import { MAX_FIELD_ENTRIES, MAX_FIELD_KEY_LENGTH, parseBody } from "../src/validation.js";
import { createLoggedInClient, createTestApp, type TestContext } from "./helpers.js";

interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  fields?: Record<string, string>;
}

const CSRF = "csrf-token-for-problem-tests";

/** Sends a CSRF-protected request with a raw body, as a misbehaving client would. */
async function send(
  ctx: TestContext,
  method: "POST" | "PATCH",
  url: string,
  payload: string | Buffer,
  contentType = "application/json",
): Promise<LightMyRequestResponse> {
  return ctx.app.inject({
    method,
    url,
    cookies: { tracea_csrf: CSRF },
    headers: {
      "x-csrf-token": CSRF,
      "content-type": contentType,
    },
    payload,
  });
}

/** Checks the response is a French Problem Details that says nothing about the framework. */
function expectTranslated(response: LightMyRequestResponse, status: number, code: string): Problem {
  expect(response.statusCode).toBe(status);
  expect(response.headers["content-type"]).toMatch(/^application\/problem\+json/);
  expect(response.body).not.toMatch(/fastify/i);
  expect(response.body).not.toContain("FST_");
  const body = response.json<Problem>();
  expect(body).toEqual({
    type: `https://tracea.app/errors/${code.toLowerCase().replaceAll("_", "-")}`,
    title: expect.any(String) as string,
    status,
    code,
    detail: expect.any(String) as string,
  });
  // French sentences, not the framework's English messages ("Body is not valid JSON…").
  expect(`${body.title} ${body.detail ?? ""}`).not.toMatch(/\b(is|not|the|body|error)\b/i);
  return body;
}

describe("framework errors as Problem Details (S2-SEC-05)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("answers malformed JSON with INVALID_BODY", async () => {
    const response = await send(ctx, "POST", "/projects", '{"name": "Maison');
    const body = expectTranslated(response, 400, "INVALID_BODY");
    expect(body.title).toBe("Corps de requête invalide");
  });

  it("answers malformed JSON on an authentication route the same way", async () => {
    const response = await send(ctx, "POST", "/auth/login", "{email:}");
    expectTranslated(response, 400, "INVALID_BODY");
  });

  it("answers an empty JSON body with INVALID_BODY", async () => {
    const response = await send(ctx, "POST", "/projects", "");
    const body = expectTranslated(response, 400, "INVALID_BODY");
    expect(body.title).toBe("Corps de requête invalide");
  });

  it.each([
    '{"__proto__": {"admin": true}, "name": "Maison"}',
    '{"name": "Maison", "constructor": {"prototype": {"admin": true}}}',
  ])("answers prototype poisoning %s with INVALID_BODY", async (payload) => {
    const response = await send(
      ctx,
      "PATCH",
      "/projects/00000000-0000-4000-8000-000000000000",
      payload,
    );
    expectTranslated(response, 400, "INVALID_BODY");
  });

  it("answers a body over 1 MiB with PAYLOAD_TOO_LARGE", async () => {
    const payload = JSON.stringify({ name: "x".repeat(1_100_000) });
    const response = await send(ctx, "POST", "/projects", payload);
    const body = expectTranslated(response, 413, "PAYLOAD_TOO_LARGE");
    expect(body.title).toBe("Corps de requête trop volumineux");
  });

  it("answers an unsupported content type with UNSUPPORTED_MEDIA_TYPE", async () => {
    const response = await send(
      ctx,
      "POST",
      "/projects",
      "name=Maison",
      "application/x-www-form-urlencoded",
    );
    const body = expectTranslated(response, 415, "UNSUPPORTED_MEDIA_TYPE");
    expect(body.title).toBe("Type de contenu non pris en charge");
  });

  it("answers a malformed URL with REQUEST_ERROR", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/projects/%E0%A4%A" });
    const body = expectTranslated(response, 400, "REQUEST_ERROR");
    expect(body.title).toBe("Requête invalide");
    expect(response.body).not.toContain("%E0");
  });

  it("keeps business errors unchanged", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/projects" });
    expect(response.statusCode).toBe(401);
    expect(response.json<Problem>().code).toBe("UNAUTHENTICATED");
  });
});

describe("problemErrorHandler", () => {
  function invoke(error: FastifyError | ApiError): {
    status: number | undefined;
    payload: Problem | undefined;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  } {
    const info = vi.fn();
    const logError = vi.fn();
    const result: { status?: number; payload?: Problem } = {};
    const reply = {
      status(code: number) {
        result.status = code;
        return reply;
      },
      type() {
        return reply;
      },
      send(payload: Problem) {
        result.payload = payload;
        return reply;
      },
    };
    const request = { id: "req-1", log: { info, error: logError } };
    problemErrorHandler(
      error,
      request as unknown as FastifyRequest,
      reply as unknown as FastifyReply,
    );
    return { status: result.status, payload: result.payload, info, error: logError };
  }

  function frameworkError(code: string, statusCode: number, message: string): FastifyError {
    return Object.assign(new Error(message), { name: "FastifyError", code, statusCode });
  }

  it("logs the original code at info level, without the message", () => {
    const outcome = invoke(
      frameworkError("FST_ERR_CTP_INVALID_JSON_BODY", 400, "Body is not valid JSON: secret"),
    );
    expect(outcome.payload?.code).toBe("INVALID_BODY");
    expect(outcome.info).toHaveBeenCalledOnce();
    const [context] = outcome.info.mock.calls[0] as [Record<string, unknown>];
    expect(context).toMatchObject({ errorCode: "FST_ERR_CTP_INVALID_JSON_BODY", statusCode: 400 });
    expect(JSON.stringify(outcome.info.mock.calls)).not.toContain("secret");
  });

  it("maps an unknown 4xx to REQUEST_ERROR with its status, never echoing name or message", () => {
    const outcome = invoke(
      frameworkError("PLUGIN_ERR_SOMETHING", 418, "Detailed plugin message with user data"),
    );
    expect(outcome.status).toBe(418);
    expect(outcome.payload).toEqual({
      type: "https://tracea.app/errors/request-error",
      title: "Requête invalide",
      status: 418,
      code: "REQUEST_ERROR",
      detail: "La requête ne peut pas être traitée.",
    });
  });

  it("maps 413 and 415 by status whatever the code", () => {
    expect(invoke(frameworkError("OTHER", 413, "too big")).payload?.code).toBe("PAYLOAD_TOO_LARGE");
    expect(invoke(frameworkError("OTHER", 415, "bad type")).payload?.code).toBe(
      "UNSUPPORTED_MEDIA_TYPE",
    );
  });

  it("handles a 4xx without code", () => {
    const error = Object.assign(new Error("raw"), { statusCode: 400 }) as FastifyError;
    const outcome = invoke(error);
    expect(outcome.payload?.code).toBe("REQUEST_ERROR");
    expect(outcome.info.mock.calls[0]?.[0]).toMatchObject({ errorCode: "unknown" });
  });

  it("answers 500 for errors without a client status", () => {
    const outcome = invoke(new Error("database is down") as FastifyError);
    expect(outcome.status).toBe(500);
    expect(outcome.payload?.code).toBe("INTERNAL_ERROR");
    expect(outcome.error).toHaveBeenCalledOnce();
  });
});

describe("422 fields bounds (S2-SEC-06)", () => {
  const Strict = z.strictObject({ name: z.string() });

  function fieldsOf(schema: z.ZodType, body: unknown): Record<string, string> {
    try {
      parseBody(schema, body);
    } catch (error) {
      if (error instanceof ApiError && error.fields !== undefined) return error.fields;
      throw error;
    }
    throw new Error("body was accepted");
  }

  it("keeps at most 20 entries for 1,000 unknown keys, in a stable order", () => {
    const body: Record<string, unknown> = {};
    for (let index = 0; index < 1000; index += 1) body[`inconnu${index}`] = index;
    const fields = fieldsOf(Strict, body);
    expect(Object.keys(fields)).toHaveLength(MAX_FIELD_ENTRIES);
    expect(Object.keys(fieldsOf(Strict, body))).toEqual(Object.keys(fields));
    // Schema issues come first, then the unknown keys in the order of the body.
    expect(Object.keys(fields)[0]).toBe("name");
    expect(Object.keys(fields)[1]).toBe("inconnu0");
  });

  it("cuts long keys to 64 characters, counted in code points", () => {
    const longKey = "🏠".repeat(200);
    const fields = fieldsOf(Strict, { name: "Maison", [longKey]: 1 });
    const [key] = Object.keys(fields);
    expect(key).toBeDefined();
    expect(Array.from(key ?? "")).toHaveLength(MAX_FIELD_KEY_LENGTH);
    expect(key?.endsWith("…")).toBe(true);
    expect(key?.startsWith("🏠🏠")).toBe(true);
  });

  it("keeps short keys and nested paths intact", () => {
    const Nested = z.strictObject({ site: z.strictObject({ width: z.number() }) });
    const fields = fieldsOf(Nested, { site: { width: "large", extra: 1 } });
    expect(Object.keys(fields).sort()).toEqual(["site.extra", "site.width"]);
  });

  describe("over HTTP", () => {
    let ctx: TestContext;

    beforeAll(async () => {
      ctx = await createTestApp();
    });

    afterAll(async () => {
      await ctx.close();
    });

    it("answers 1,000 unknown keys with at most 20 fields", async () => {
      const client = await createLoggedInClient(ctx, "champs@example.org");
      const body: Record<string, unknown> = { name: "Maison" };
      for (let index = 0; index < 1000; index += 1)
        body[`${String(index)}${"x".repeat(100)}`] = index;
      const response = await client.request("POST", "/projects", body);
      expect(response.statusCode).toBe(422);
      const problem = response.json<Problem>();
      expect(problem.code).toBe("VALIDATION_ERROR");
      const keys = Object.keys(problem.fields ?? {});
      expect(keys).toHaveLength(MAX_FIELD_ENTRIES);
      for (const key of keys) expect(Array.from(key).length).toBeLessThanOrEqual(64);
      expect(response.body.length).toBeLessThan(4096);
    });
  });
});

describe("OpenAPI common error responses", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("documents 400 on every project route and 413 / 415 on mutations", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/v1/openapi.json" });
    const document = response.json<{
      paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
      components: { responses: Record<string, unknown> };
    }>();
    expect(Object.keys(document.components.responses)).toEqual(
      expect.arrayContaining(["BadRequest", "PayloadTooLarge", "UnsupportedMediaType"]),
    );
    expect(document.paths["/projects"]?.get?.responses).toHaveProperty("400");
    for (const status of ["400", "413", "415"]) {
      expect(document.paths["/projects"]?.post?.responses).toHaveProperty(status);
      expect(document.paths["/projects/{id}"]?.patch?.responses).toHaveProperty(status);
    }
  });
});
