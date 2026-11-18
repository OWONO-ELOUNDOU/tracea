import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../src/db/client.js";
import { projects, sessions, users, versions } from "../src/db/schema.js";
import { runPurgeCommand, type LogLine } from "../src/maintenance/command.js";
import { purgeExpired, TRASH_RETENTION_DAYS } from "../src/maintenance/purge.js";
import type { ProjectDetail } from "../src/projects/service.js";
import {
  type Client,
  createLoggedInClient,
  createTestApp,
  loadFixtureModel,
  type TestContext,
} from "./helpers.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

let ctx: TestContext;
let alice: Client;
let aliceId: string;
// Injected clock: every timestamp of the scenario is relative to this instant.
let now: Date;

beforeAll(async () => {
  ctx = await createTestApp();
  alice = await createLoggedInClient(ctx, "alice@example.org");
  const [user] = await ctx.db.select().from(users).where(eq(users.email, "alice@example.org"));
  aliceId = user!.id;
  now = new Date();
});

afterAll(async () => {
  await ctx.close();
});

function ago(ms: number): Date {
  return new Date(now.getTime() - ms);
}

async function createProject(name: string): Promise<string> {
  const response = await alice.request("POST", "/projects", { name });
  expect(response.statusCode).toBe(201);
  return response.json<{ project: ProjectDetail }>().project.id;
}

/** Soft-deletes through the API, then backdates the deletion. */
async function trash(projectId: string, deletedAt: Date): Promise<void> {
  const response = await alice.request("DELETE", `/projects/${projectId}`);
  expect(response.statusCode).toBe(204);
  await ctx.db.update(projects).set({ deletedAt }).where(eq(projects.id, projectId));
}

async function addVersion(projectId: string): Promise<string> {
  const model = loadFixtureModel();
  const [version] = await ctx.db
    .insert(versions)
    .values({
      projectId,
      number: 1,
      model,
      modelSchemaVersion: model.schemaVersion,
      origin: "generated",
      seed: 1,
    })
    .returning();
  await ctx.db
    .update(projects)
    .set({ currentVersionId: version!.id })
    .where(eq(projects.id, projectId));
  return version!.id;
}

async function existingProjectIds(ids: string[]): Promise<string[]> {
  const rows = await ctx.db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.id, ids));
  return rows.map((row) => row.id);
}

describe("purgeExpired", () => {
  it("removes expired sessions and projects trashed for more than 30 days only", async () => {
    const [expired, valid] = await ctx.db
      .insert(sessions)
      .values([
        { userId: aliceId, expiresAt: ago(HOUR_MS) },
        { userId: aliceId, expiresAt: new Date(now.getTime() + HOUR_MS) },
      ])
      .returning();

    const active = await createProject("Maison active");
    await addVersion(active);
    const trashed29 = await createProject("Corbeille 29 jours");
    const trashed29Version = await addVersion(trashed29);
    await trash(trashed29, ago(29 * DAY_MS));
    const trashed30 = await createProject("Corbeille 30 jours");
    await trash(trashed30, ago(TRASH_RETENTION_DAYS * DAY_MS));
    const trashed31 = await createProject("Corbeille 31 jours");
    const trashed31Version = await addVersion(trashed31);
    await trash(trashed31, ago(31 * DAY_MS));

    const result = await purgeExpired(ctx.db, now);

    expect(result).toEqual({ sessionsDeleted: 1, projectsDeleted: 1 });
    const remainingSessions = await ctx.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(inArray(sessions.id, [expired!.id, valid!.id]));
    expect(remainingSessions.map((row) => row.id)).toEqual([valid!.id]);

    expect((await existingProjectIds([active, trashed29, trashed30, trashed31])).sort()).toEqual(
      [active, trashed29, trashed30].sort(),
    );
    const remainingVersions = await ctx.db
      .select({ id: versions.id })
      .from(versions)
      .where(inArray(versions.id, [trashed29Version, trashed31Version]));
    expect(remainingVersions.map((row) => row.id)).toEqual([trashed29Version]);

    // The active project is untouched and still served to its owner.
    const detail = await alice.request("GET", `/projects/${active}`);
    expect(detail.statusCode).toBe(200);
    expect(detail.json<{ project: ProjectDetail }>().project.currentVersion?.number).toBe(1);
  });

  it("is idempotent: a second run deletes nothing", async () => {
    expect(await purgeExpired(ctx.db, now)).toEqual({ sessionsDeleted: 0, projectsDeleted: 0 });
  });

  // Last: moves the clock past the lifetime of every session of this file.
  it("logs out a user whose session was purged", async () => {
    expect((await alice.request("GET", "/me")).statusCode).toBe(200);

    // The wall clock still considers the session valid: only its deletion can cause the 401.
    const later = new Date(Date.now() + 73 * HOUR_MS);
    const result = await purgeExpired(ctx.db, later);
    expect(result.sessionsDeleted).toBeGreaterThanOrEqual(1);

    const response = await alice.request("GET", "/me");
    expect(response.statusCode).toBe(401);
    expect(response.json<{ code: string }>().code).toBe("UNAUTHENTICATED");
  });
});

describe("runPurgeCommand", () => {
  it("logs the two counters only and exits with 0", async () => {
    const lines: LogLine[] = [];
    const code = await runPurgeCommand(ctx.db, now, (line) => lines.push(line));
    expect(code).toBe(0);
    expect(lines).toHaveLength(1);
    expect(Object.keys(lines[0]!).sort()).toEqual(
      ["level", "msg", "projectsDeleted", "sessionsDeleted"].sort(),
    );
    expect(lines[0]).toMatchObject({ level: 30, msg: "purge completed" });
    expect(typeof lines[0]!.sessionsDeleted).toBe("number");
    expect(typeof lines[0]!.projectsDeleted).toBe("number");
  });

  it("exits with a non-zero code when the database fails", async () => {
    // Only the method the purge calls first is needed to simulate a lost connection.
    const failing = {
      delete: () => {
        throw new Error("connection terminated");
      },
    } as unknown as Database;
    const lines: LogLine[] = [];
    const code = await runPurgeCommand(failing, now, (line) => lines.push(line));
    expect(code).toBe(1);
    expect(lines).toEqual([
      { level: 50, msg: "purge failed", err: "Error: connection terminated" },
    ]);
  });
});
