import { PGlite } from "@electric-sql/pglite";
import type { BuildingModel } from "@tracea/domain";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEmbeddedDatabase, type DatabaseHandle } from "../src/db/client.js";
import * as schema from "../src/db/schema.js";
import { projects, users, versions } from "../src/db/schema.js";
import { loadFixtureModel } from "./helpers.js";

const migrationsFolder = resolve(import.meta.dirname, "../drizzle");

let handle: DatabaseHandle;
let model: BuildingModel;

beforeAll(async () => {
  handle = await createEmbeddedDatabase();
  model = loadFixtureModel();
});

afterAll(async () => {
  await handle.close();
});

async function insertUser(email: string): Promise<string> {
  const [user] = await handle.db.insert(users).values({ email, passwordHash: "x" }).returning();
  return user!.id;
}

async function insertProjectWithVersion(ownerId: string) {
  const { db } = handle;
  const [project] = await db.insert(projects).values({ ownerId, name: "Maison" }).returning();
  const [version] = await db
    .insert(versions)
    .values({
      projectId: project!.id,
      number: 1,
      model,
      modelSchemaVersion: model.schemaVersion,
      origin: "generated",
      seed: 42,
    })
    .returning();
  await db
    .update(projects)
    .set({ currentVersionId: version!.id })
    .where(eq(projects.id, project!.id));
  return { projectId: project!.id, versionId: version!.id };
}

describe("projects and versions tables", () => {
  it("removes projects and versions when their owner is deleted", async () => {
    const ownerId = await insertUser("cascade@example.org");
    const { projectId } = await insertProjectWithVersion(ownerId);

    await handle.db.delete(users).where(eq(users.id, ownerId));

    expect(await handle.db.select().from(projects).where(eq(projects.id, projectId))).toEqual([]);
    expect(
      await handle.db.select().from(versions).where(eq(versions.projectId, projectId)),
    ).toEqual([]);
  });

  it("clears current_version_id when the current version is deleted", async () => {
    const ownerId = await insertUser("set-null@example.org");
    const { projectId, versionId } = await insertProjectWithVersion(ownerId);

    await handle.db.delete(versions).where(eq(versions.id, versionId));

    const [project] = await handle.db.select().from(projects).where(eq(projects.id, projectId));
    expect(project?.currentVersionId).toBeNull();
  });

  it("refuses two versions with the same number in one project", async () => {
    const ownerId = await insertUser("unique@example.org");
    const { projectId } = await insertProjectWithVersion(ownerId);
    const duplicate = {
      projectId,
      number: 1,
      model,
      modelSchemaVersion: model.schemaVersion,
      origin: "edited" as const,
    };

    await expect(handle.db.insert(versions).values(duplicate)).rejects.toThrow();
    await expect(
      handle.db.insert(versions).values({ ...duplicate, number: 2 }),
    ).resolves.toBeDefined();
  });

  it("refuses a version number below 1", async () => {
    const ownerId = await insertUser("positive@example.org");
    const [project] = await handle.db
      .insert(projects)
      .values({ ownerId, name: "Vide" })
      .returning();

    await expect(
      handle.db.insert(versions).values({
        projectId: project!.id,
        number: 0,
        model,
        modelSchemaVersion: model.schemaVersion,
        origin: "generated",
      }),
    ).rejects.toThrow();
  });

  it("stores a version with an empty warning list by default", async () => {
    const ownerId = await insertUser("defaults@example.org");
    const { versionId } = await insertProjectWithVersion(ownerId);
    const [version] = await handle.db.select().from(versions).where(eq(versions.id, versionId));
    expect(version?.warnings).toEqual([]);
    expect(version?.model.schemaVersion).toBe(model.schemaVersion);
  });
});

describe("migration 0001_projects", () => {
  it("applies on a database already migrated to 0000 and keeps its data", async () => {
    const initialOnly = mkdtempSync(join(tmpdir(), "tracea-migrations-"));
    try {
      cpSync(join(migrationsFolder, "0000_init_auth.sql"), join(initialOnly, "0000_init_auth.sql"));
      const journal = JSON.parse(
        readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
      ) as { entries: { idx: number }[] };
      journal.entries = journal.entries.filter((entry) => entry.idx === 0);
      cpSync(join(migrationsFolder, "meta"), join(initialOnly, "meta"), { recursive: true });
      writeFileSync(join(initialOnly, "meta/_journal.json"), JSON.stringify(journal));

      const client = new PGlite();
      const db = drizzle(client, { schema });
      try {
        await migrate(db, { migrationsFolder: initialOnly });
        const [user] = await db
          .insert(users)
          .values({ email: "before@example.org", passwordHash: "x" })
          .returning();

        await migrate(db, { migrationsFolder });

        const [project] = await db
          .insert(projects)
          .values({ ownerId: user!.id, name: "Après migration" })
          .returning();
        expect(project?.ownerId).toBe(user!.id);
        expect(await db.select().from(users)).toHaveLength(1);
      } finally {
        await client.close();
      }
    } finally {
      rmSync(initialOnly, { recursive: true, force: true });
    }
    // Two migration runs on a fresh embedded PostgreSQL.
  }, 60_000);
});
