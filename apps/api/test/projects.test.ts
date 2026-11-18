import { and, eq, like } from "drizzle-orm";
import type { InjectOptions } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditLog, projects, users, versions } from "../src/db/schema.js";
import type { ProjectDetail, ProjectPage } from "../src/projects/service.js";
import {
  Client,
  createLoggedInClient,
  createTestApp,
  loadFixtureModel,
  type TestContext,
} from "./helpers.js";

type Method = NonNullable<InjectOptions["method"]>;

interface Problem {
  code: string;
  title: string;
  status: number;
  fields?: Record<string, string>;
}

const UNKNOWN_ID = "3f0c9a52-6f0e-4b7a-9d55-0d2f6f1f8a11";

let ctx: TestContext;
let alice: Client;
let bob: Client;

beforeAll(async () => {
  ctx = await createTestApp();
  alice = await createLoggedInClient(ctx, "alice@example.org");
  bob = await createLoggedInClient(ctx, "bob@example.org");
});

afterAll(async () => {
  await ctx.close();
});

async function createProject(client: Client, name: string): Promise<ProjectDetail> {
  const response = await client.request("POST", "/projects", { name });
  expect(response.statusCode).toBe(201);
  return response.json<{ project: ProjectDetail }>().project;
}

async function userId(email: string): Promise<string> {
  const [user] = await ctx.db.select().from(users).where(eq(users.email, email));
  return user!.id;
}

async function auditActions(projectId: string): Promise<string[]> {
  const rows = await ctx.db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.targetType, "project"), eq(auditLog.targetId, projectId)))
    .orderBy(auditLog.createdAt);
  return rows.map((row) => row.action);
}

/** One request per route, against the given project id. */
function routesFor(id: string): [Method, string, unknown][] {
  return [
    ["GET", `/projects/${id}`, undefined],
    ["PATCH", `/projects/${id}`, { name: "Détourné" }],
    ["POST", `/projects/${id}/duplicate`, undefined],
    ["DELETE", `/projects/${id}`, undefined],
  ];
}

describe("project lifecycle", () => {
  it("creates, reads, lists, renames, duplicates and deletes a project", async () => {
    const client = await createLoggedInClient(ctx, "cycle@example.org");

    const created = await client.request("POST", "/projects", { name: "  Maison Dupont  " });
    expect(created.statusCode).toBe(201);
    const { project } = created.json<{ project: ProjectDetail }>();
    expect(created.headers.location).toBe(`/projects/${project.id}`);
    expect(project).toEqual({
      id: project.id,
      name: "Maison Dupont",
      descriptionText: null,
      parameters: null,
      site: null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      thumbnailUrl: null,
      currentVersion: null,
      lastJob: null,
    });
    expect(new Date(project.createdAt).toISOString()).toBe(project.createdAt);

    const read = await client.request("GET", `/projects/${project.id}`);
    expect(read.statusCode).toBe(200);
    expect(read.json()).toEqual({ project });

    const listed = await client.request("GET", "/projects");
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual({
      items: [
        {
          id: project.id,
          name: "Maison Dupont",
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          thumbnailUrl: null,
          currentVersion: null,
        },
      ],
      nextCursor: null,
    });

    const renamed = await client.request("PATCH", `/projects/${project.id}`, {
      name: "Maison Martin",
      descriptionText: "Maison de plain-pied, trois chambres.",
    });
    expect(renamed.statusCode).toBe(200);
    const updated = renamed.json<{ project: ProjectDetail }>().project;
    expect(updated.name).toBe("Maison Martin");
    expect(updated.descriptionText).toBe("Maison de plain-pied, trois chambres.");
    expect(updated.createdAt).toBe(project.createdAt);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(project.updatedAt));

    const cleared = await client.request("PATCH", `/projects/${project.id}`, {
      descriptionText: null,
    });
    expect(cleared.json<{ project: ProjectDetail }>().project).toMatchObject({
      name: "Maison Martin",
      descriptionText: null,
    });

    const duplicated = await client.request("POST", `/projects/${project.id}/duplicate`);
    expect(duplicated.statusCode).toBe(201);
    const copy = duplicated.json<{ project: ProjectDetail }>().project;
    expect(duplicated.headers.location).toBe(`/projects/${copy.id}`);
    expect(copy.id).not.toBe(project.id);
    expect(copy.name).toBe("Maison Martin (copie)");
    expect(copy.currentVersion).toBeNull();

    const removed = await client.request("DELETE", `/projects/${project.id}`);
    expect(removed.statusCode).toBe(204);
    expect(removed.body).toBe("");

    for (const [method, url, body] of routesFor(project.id)) {
      const response = await client.request(method, url, body);
      expect(response.statusCode, `${method} ${url}`).toBe(404);
      expect(response.json<Problem>().code).toBe("PROJECT_NOT_FOUND");
    }
    const after = await client.request("GET", "/projects");
    expect(after.json<ProjectPage>().items.map((item) => item.id)).toEqual([copy.id]);

    const [row] = await ctx.db.select().from(projects).where(eq(projects.id, project.id));
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });
});

describe("cross-account isolation", () => {
  it("answers 404 to another user exactly as for an unknown project", async () => {
    const project = await createProject(alice, "Projet d'Alice");
    await createProject(bob, "Projet de Bob");
    const before = await alice.request("GET", `/projects/${project.id}`);

    const foreign = routesFor(project.id);
    const unknown = routesFor(UNKNOWN_ID);
    for (const [index, [method, url, body]] of foreign.entries()) {
      const [, unknownUrl] = unknown[index]!;
      const response = await bob.request(method, url, body);
      const reference = await bob.request(method, unknownUrl, body);
      expect(response.statusCode, `${method} ${url}`).toBe(404);
      expect(reference.statusCode).toBe(404);
      expect(response.headers["content-type"]).toContain("application/problem+json");
      expect(response.body).toBe(reference.body);
      expect(response.json<Problem>()).toMatchObject({
        code: "PROJECT_NOT_FOUND",
        title: "Projet introuvable",
        status: 404,
      });
    }

    const bobList = await bob.request("GET", "/projects?limit=50");
    const bobItems = bobList.json<ProjectPage>().items;
    expect(bobItems.map((item) => item.name)).toEqual(["Projet de Bob"]);
    expect(bobItems.some((item) => item.id === project.id)).toBe(false);

    const after = await alice.request("GET", `/projects/${project.id}`);
    expect(after.statusCode).toBe(200);
    expect(after.body).toBe(before.body);
    expect(await auditActions(project.id)).toEqual(["project.create"]);
    const aliceId = await userId("alice@example.org");
    const aliceRows = await ctx.db.select().from(projects).where(eq(projects.ownerId, aliceId));
    expect(aliceRows).toHaveLength(1);
  });

  it("answers the same 404 for a deleted project and a malformed identifier", async () => {
    const project = await createProject(alice, "À supprimer");
    expect((await alice.request("DELETE", `/projects/${project.id}`)).statusCode).toBe(204);
    const reference = await alice.request("GET", `/projects/${UNKNOWN_ID}`);

    for (const id of [project.id, "42", "pas-un-uuid", `${UNKNOWN_ID}x`, "%27%20OR%201=1"]) {
      for (const [method, url, body] of routesFor(id)) {
        const response = await alice.request(method, url, body);
        expect(response.statusCode, `${method} ${url}`).toBe(404);
        expect(response.body).toBe(reference.body);
      }
    }
  });

  it("ignores an owner supplied by the client", async () => {
    const bobId = await userId("bob@example.org");
    const response = await alice.request("POST", "/projects", { name: "Pour Bob", ownerId: bobId });
    expect(response.statusCode).toBe(422);
    expect(response.json<Problem>().fields).toHaveProperty("ownerId");
    const rows = await ctx.db.select().from(projects).where(eq(projects.name, "Pour Bob"));
    expect(rows).toEqual([]);
  });
});

describe("authentication and CSRF", () => {
  it("answers 401 on the six routes without a session", async () => {
    const anonymous = new Client(ctx.app);
    await anonymous.csrf();
    const requests: [Method, string, unknown][] = [
      ["GET", "/projects", undefined],
      ["POST", "/projects", { name: "Anonyme" }],
      ...routesFor(UNKNOWN_ID),
    ];
    expect(requests).toHaveLength(6);
    for (const [method, url, body] of requests) {
      const response = await anonymous.request(method, url, body);
      expect(response.statusCode, `${method} ${url}`).toBe(401);
      expect(response.json<Problem>().code).toBe("UNAUTHENTICATED");
    }
  });

  it("answers 403 to a mutation without the CSRF token", async () => {
    const project = await createProject(alice, "Protégé");
    const mutations: [Method, string, unknown][] = [
      ["POST", "/projects", { name: "Sans jeton" }],
      ["PATCH", `/projects/${project.id}`, { name: "Sans jeton" }],
      ["POST", `/projects/${project.id}/duplicate`, undefined],
      ["DELETE", `/projects/${project.id}`, undefined],
    ];
    for (const [method, url, body] of mutations) {
      const response = await alice.request(method, url, body, { csrf: null });
      expect(response.statusCode, `${method} ${url}`).toBe(403);
      expect(response.json<Problem>().code).toBe("CSRF_TOKEN_INVALID");
    }
    const read = await alice.request("GET", `/projects/${project.id}`);
    expect(read.json<{ project: ProjectDetail }>().project.name).toBe("Protégé");
    expect(await auditActions(project.id)).toEqual(["project.create"]);
  });
});

describe("validation", () => {
  it.each([
    ["an empty name", { name: "" }, "name"],
    ["a name made of spaces", { name: "   " }, "name"],
    ["a name of 121 characters", { name: "a".repeat(121) }, "name"],
    ["a name with a control character", { name: "Maison\u0007" }, "name"],
    ["a name that is not a string", { name: 12 }, "name"],
    ["a missing name", {}, "name"],
    ["an unknown key", { name: "Maison", ownerId: UNKNOWN_ID }, "ownerId"],
    ["a server-managed key", { name: "Maison", deletedAt: null }, "deletedAt"],
  ])("refuses a creation with %s", async (_label, body, field) => {
    const response = await alice.request("POST", "/projects", body);
    expect(response.statusCode).toBe(422);
    const problem = response.json<Problem>();
    expect(problem.code).toBe("VALIDATION_ERROR");
    expect(typeof problem.fields?.[field]).toBe("string");
  });

  it("accepts a name of exactly 120 characters", async () => {
    const project = await createProject(alice, "a".repeat(120));
    expect(project.name).toHaveLength(120);
  });

  it.each([
    ["an empty body", {}, "_"],
    ["an empty name", { name: " " }, "name"],
    [
      "a description above 2 000 characters",
      { descriptionText: "d".repeat(2001) },
      "descriptionText",
    ],
    ["parameters", { name: "Maison", parameters: {} }, "parameters"],
    ["site", { site: {} }, "site"],
    ["an owner", { name: "Maison", ownerId: UNKNOWN_ID }, "ownerId"],
    ["an identifier", { id: UNKNOWN_ID }, "id"],
  ])("refuses a modification with %s", async (_label, body, field) => {
    const project = await createProject(alice, "À modifier");
    const response = await alice.request("PATCH", `/projects/${project.id}`, body);
    expect(response.statusCode).toBe(422);
    const problem = response.json<Problem>();
    expect(problem.code).toBe("VALIDATION_ERROR");
    expect(typeof problem.fields?.[field]).toBe("string");
    const read = await alice.request("GET", `/projects/${project.id}`);
    expect(read.json<{ project: ProjectDetail }>().project).toEqual(project);
  });

  it("accepts a description of exactly 2 000 characters", async () => {
    const project = await createProject(alice, "Description longue");
    const response = await alice.request("PATCH", `/projects/${project.id}`, {
      descriptionText: "d".repeat(2000),
    });
    expect(response.statusCode).toBe(200);
  });

  it("refuses a non-empty body on duplication", async () => {
    const project = await createProject(alice, "Copie refusée");
    const response = await alice.request("POST", `/projects/${project.id}/duplicate`, {
      name: "Autre nom",
    });
    expect(response.statusCode).toBe(422);
    expect(response.json<Problem>().fields).toHaveProperty("name");
  });

  it.each([
    ["limit=0", "limit"],
    ["limit=51", "limit"],
    ["limit=abc", "limit"],
    ["limit=1.5", "limit"],
    ["cursor=illisible", "cursor"],
    ["cursor=", "cursor"],
    [`cursor=${Buffer.from('{"u":"hier","i":"1"}').toString("base64url")}`, "cursor"],
    [
      `cursor=${Buffer.from(`{"u":"2026-02-30T00:00:00.000Z","i":"${UNKNOWN_ID}"}`).toString("base64url")}`,
      "cursor",
    ],
  ])("refuses the list query %s", async (query, field) => {
    const response = await alice.request("GET", `/projects?${query}`);
    expect(response.statusCode).toBe(422);
    const problem = response.json<Problem>();
    expect(problem.code).toBe("VALIDATION_ERROR");
    expect(typeof problem.fields?.[field]).toBe("string");
  });

  it("accepts the bounds of limit", async () => {
    expect((await alice.request("GET", "/projects?limit=1")).statusCode).toBe(200);
    expect((await alice.request("GET", "/projects?limit=50")).statusCode).toBe(200);
  });
});

describe("pagination", () => {
  it("walks 45 projects in 3 pages without duplicate or gap", async () => {
    const client = await createLoggedInClient(ctx, "pages@example.org");
    const ownerId = await userId("pages@example.org");
    // Three timestamps only, with sub-millisecond-free values: many rows tie on updatedAt.
    const base = Date.parse("2026-11-01T10:00:00.000Z");
    await ctx.db.insert(projects).values(
      Array.from({ length: 45 }, (_, index) => ({
        ownerId,
        name: `Projet ${String(index + 1).padStart(2, "0")}`,
        updatedAt: new Date(base + (index % 3) * 1000),
      })),
    );
    // Rows that must never show up: deleted, or owned by someone else.
    await ctx.db.insert(projects).values({
      ownerId,
      name: "Supprimé",
      updatedAt: new Date(base + 1000),
      deletedAt: new Date(),
    });
    await createProject(bob, "Hors liste");

    const seen: ProjectPage["items"] = [];
    const sizes: number[] = [];
    let cursor: string | null = null;
    do {
      const suffix: string = cursor === null ? "" : `&cursor=${encodeURIComponent(cursor)}`;
      const response = await client.request("GET", `/projects?limit=20${suffix}`);
      expect(response.statusCode).toBe(200);
      const page = response.json<ProjectPage>();
      sizes.push(page.items.length);
      seen.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(sizes).toEqual([20, 20, 5]);
    expect(new Set(seen.map((item) => item.id)).size).toBe(45);
    expect(seen.map((item) => item.name).sort()).toEqual(
      Array.from({ length: 45 }, (_, index) => `Projet ${String(index + 1).padStart(2, "0")}`),
    );
    for (const [index, item] of seen.entries()) {
      const previous = seen[index - 1];
      if (previous === undefined) continue;
      const ordered =
        previous.updatedAt > item.updatedAt ||
        (previous.updatedAt === item.updatedAt && previous.id > item.id);
      expect(ordered, `order at index ${index}`).toBe(true);
    }
  });

  it("uses a default page of 20 and puts the last modified project first", async () => {
    const client = await createLoggedInClient(ctx, "defaut@example.org");
    const ownerId = await userId("defaut@example.org");
    const base = Date.parse("2026-11-02T10:00:00.000Z");
    await ctx.db.insert(projects).values(
      Array.from({ length: 21 }, (_, index) => ({
        ownerId,
        name: `Ancien ${index}`,
        updatedAt: new Date(base + index),
      })),
    );
    const first = await client.request("GET", "/projects");
    const page = first.json<ProjectPage>();
    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(page.items[0]?.name).toBe("Ancien 20");

    const oldest = await ctx.db
      .select()
      .from(projects)
      .where(and(eq(projects.ownerId, ownerId), eq(projects.name, "Ancien 0")));
    const renamed = await client.request("PATCH", `/projects/${oldest[0]!.id}`, {
      name: "Remonté",
    });
    expect(renamed.statusCode).toBe(200);
    const again = await client.request("GET", "/projects?limit=1");
    expect(again.json<ProjectPage>().items[0]?.name).toBe("Remonté");
  });
});

describe("duplication", () => {
  it("copies the current version as version 1 of the new project", async () => {
    const model = loadFixtureModel();
    const source = await createProject(alice, "Avec version");
    await alice.request("PATCH", `/projects/${source.id}`, { descriptionText: "Trois chambres." });
    const inserted = await ctx.db
      .insert(versions)
      .values([
        {
          projectId: source.id,
          number: 1,
          model,
          modelSchemaVersion: model.schemaVersion,
          origin: "generated",
          seed: 1,
        },
        {
          projectId: source.id,
          number: 2,
          model,
          modelSchemaVersion: model.schemaVersion,
          origin: "edited",
          seed: 7,
          warnings: [{ code: "ROOM_TOO_SMALL" }],
        },
      ])
      .returning();
    const current = inserted.find((version) => version.number === 2)!;
    await ctx.db
      .update(projects)
      .set({ currentVersionId: current.id, parameters: { levels: 1 }, site: { width: 20000 } })
      .where(eq(projects.id, source.id));

    const sourceRead = await alice.request("GET", `/projects/${source.id}`);
    expect(sourceRead.json<{ project: ProjectDetail }>().project.currentVersion).toEqual({
      id: current.id,
      number: 2,
      origin: "edited",
      createdAt: current.createdAt.toISOString(),
    });
    const listed = await alice.request("GET", "/projects?limit=50");
    expect(
      listed.json<ProjectPage>().items.find((item) => item.id === source.id)?.currentVersion,
    ).toEqual({ number: 2 });

    const response = await alice.request("POST", `/projects/${source.id}/duplicate`);
    expect(response.statusCode).toBe(201);
    const copy = response.json<{ project: ProjectDetail }>().project;
    expect(copy).toMatchObject({
      name: "Avec version (copie)",
      descriptionText: "Trois chambres.",
      parameters: { levels: 1 },
      site: { width: 20000 },
      currentVersion: { number: 1, origin: "edited" },
    });

    const copied = await ctx.db.select().from(versions).where(eq(versions.projectId, copy.id));
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatchObject({
      id: copy.currentVersion?.id,
      number: 1,
      model,
      modelSchemaVersion: model.schemaVersion,
      origin: "edited",
      seed: 7,
      warnings: [{ code: "ROOM_TOO_SMALL" }],
    });
    expect(copied[0]?.id).not.toBe(current.id);
    const untouched = await ctx.db.select().from(versions).where(eq(versions.projectId, source.id));
    expect(untouched).toHaveLength(2);
  });

  it("shortens the original name so the copy stays within 120 characters", async () => {
    const source = await createProject(alice, "n".repeat(120));
    const response = await alice.request("POST", `/projects/${source.id}/duplicate`);
    const copy = response.json<{ project: ProjectDetail }>().project;
    expect(copy.name).toBe(`${"n".repeat(112)} (copie)`);
    expect(copy.name).toHaveLength(120);
  });

  it("allows two projects with the same name", async () => {
    const first = await createProject(alice, "Homonyme");
    const second = await createProject(alice, "Homonyme");
    expect(second.id).not.toBe(first.id);
  });
});

describe("audit log", () => {
  it("writes one line per mutation without project content", async () => {
    const client = await createLoggedInClient(ctx, "audit@example.org");
    const actorId = await userId("audit@example.org");
    const project = await createProject(client, "Nom confidentiel");
    await client.request("PATCH", `/projects/${project.id}`, {
      name: "Nom confidentiel 2",
      descriptionText: "Description confidentielle",
    });
    const duplicated = await client.request("POST", `/projects/${project.id}/duplicate`);
    const copy = duplicated.json<{ project: ProjectDetail }>().project;
    await client.request("DELETE", `/projects/${project.id}`);
    // Refused or read-only requests leave no trace.
    await client.request("GET", `/projects/${project.id}`);
    await client.request("DELETE", `/projects/${project.id}`);
    await client.request("PATCH", `/projects/${copy.id}`, {});

    const rows = await ctx.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.actorId, actorId), like(auditLog.action, "project.%")))
      .orderBy(auditLog.createdAt);
    expect(
      rows
        .map((row) => [row.action, row.targetType, row.targetId])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ).toEqual([
      ["project.create", "project", project.id],
      ["project.delete", "project", project.id],
      ["project.duplicate", "project", copy.id],
      ["project.update", "project", project.id],
    ]);
    const serialized = JSON.stringify(rows.map((row) => row.metadata));
    expect(serialized).not.toContain("confidentiel");
  });
});
