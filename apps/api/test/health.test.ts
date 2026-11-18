import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.close();
});

describe("GET /health", () => {
  it("reports the service and the model schema version", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", modelSchemaVersion: "1.0" });
  });

  it("sends security headers", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/health" });
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-ratelimit-limit"]).toBeDefined();
  });
});

describe("unknown route", () => {
  it("answers with a problem document", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/nope" });
    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.json()).toMatchObject({ code: "NOT_FOUND", status: 404 });
  });
});

describe("GET /v1/openapi.json", () => {
  it("serves an OpenAPI 3.1 document", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/v1/openapi.json" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ openapi: "3.1.0" });
  });

  it("describes the six project routes with their schemas", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/v1/openapi.json" });
    const document = response.json<{
      paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
      components: { schemas: Record<string, unknown> };
    }>();
    const operations = Object.entries(document.paths)
      .filter(([path]) => path.startsWith("/projects"))
      .flatMap(([path, item]) => Object.keys(item).map((method) => `${method} ${path}`));
    expect(operations.sort()).toEqual([
      "delete /projects/{id}",
      "get /projects",
      "get /projects/{id}",
      "patch /projects/{id}",
      "post /projects",
      "post /projects/{id}/duplicate",
    ]);
    expect(document.components.schemas).toHaveProperty("ProjectDetail");
    expect(document.components.schemas).toHaveProperty("ProjectSummary");
    expect(document.paths["/projects/{id}"]?.get?.responses).toHaveProperty("404");
  });
});
