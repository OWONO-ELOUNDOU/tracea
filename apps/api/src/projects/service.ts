import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { z } from "zod";
import type { Database } from "../db/client.js";
import type * as schema from "../db/schema.js";
import { auditLog, projects, versions, type Project, type Version } from "../db/schema.js";
import { errors } from "../errors.js";

export const PROJECT_NAME_MAX_LENGTH = 120;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 2000;
export const PROJECT_LIST_DEFAULT_LIMIT = 20;
export const PROJECT_LIST_MAX_LIMIT = 50;

const COPY_SUFFIX = " (copie)";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Both drivers share this base type; the union in `Database` has no common `transaction` signature.
type Executor = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  currentVersion: { number: number } | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  descriptionText: string | null;
  parameters: Record<string, unknown> | null;
  site: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  currentVersion: {
    id: string;
    number: number;
    origin: Version["origin"];
    createdAt: string;
  } | null;
  /** Reserved until the jobs table exists. */
  lastJob: null;
}

export interface ProjectPage {
  items: ProjectSummary[];
  nextCursor: string | null;
}

export interface ProjectPatch {
  name?: string | undefined;
  descriptionText?: string | null | undefined;
}

interface Cursor {
  updatedAt: string;
  id: string;
}

const CursorSchema = z.strictObject({ u: z.iso.datetime(), i: z.string().regex(UUID_PATTERN) });

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify({ u: cursor.updatedAt, i: cursor.id })).toString("base64url");
}

function decodeCursor(value: string): Cursor {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const parsed = CursorSchema.parse(decoded);
    // Only timestamps this service produced are accepted, so PostgreSQL never sees an invalid date.
    if (new Date(parsed.u).toISOString() !== parsed.u) throw new Error("non-canonical timestamp");
    return { updatedAt: parsed.u, id: parsed.i };
  } catch {
    throw errors.validation({ cursor: "Curseur invalide." });
  }
}

/** Appends the copy suffix, shortening the original name so the result stays within the limit. */
export function copyName(name: string): string {
  const budget = PROJECT_NAME_MAX_LENGTH - COPY_SUFFIX.length;
  let base = "";
  // Iterating by code point never cuts a surrogate pair in half.
  for (const character of name) {
    if (base.length + character.length > budget) break;
    base += character;
  }
  return `${base.trimEnd()}${COPY_SUFFIX}`;
}

function toDetail(project: Project, version: Version | null): ProjectDetail {
  return {
    id: project.id,
    name: project.name,
    descriptionText: project.descriptionText,
    parameters: project.parameters,
    site: project.site,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    thumbnailUrl: null,
    currentVersion:
      version === null
        ? null
        : {
            id: version.id,
            number: version.number,
            origin: version.origin,
            createdAt: version.createdAt.toISOString(),
          },
    lastJob: null,
  };
}

/**
 * Every statement that reads or changes a project filters on the owner and on `deleted_at`
 * in its own WHERE clause, so a project of another user is indistinguishable from a missing one.
 */
export class ProjectService {
  private readonly db: Executor;

  constructor(db: Database) {
    this.db = db;
  }

  private owned(ownerId: string, projectId: string) {
    return and(
      eq(projects.id, projectId),
      eq(projects.ownerId, ownerId),
      isNull(projects.deletedAt),
    );
  }

  private async audit(
    executor: Executor,
    actorId: string,
    action: string,
    projectId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await executor.insert(auditLog).values({
      actorId,
      action,
      targetType: "project",
      targetId: projectId,
      metadata: metadata ?? null,
    });
  }

  private async findDetail(
    executor: Executor,
    ownerId: string,
    projectId: string,
  ): Promise<ProjectDetail> {
    const [row] = await executor
      .select({ project: projects, version: versions })
      .from(projects)
      .leftJoin(versions, eq(versions.id, projects.currentVersionId))
      .where(this.owned(ownerId, projectId))
      .limit(1);
    if (row === undefined) throw errors.projectNotFound();
    return toDetail(row.project, row.version);
  }

  async list(
    ownerId: string,
    options: { limit: number; cursor?: string | undefined },
  ): Promise<ProjectPage> {
    const cursor = options.cursor === undefined ? undefined : decodeCursor(options.cursor);
    const rows = await this.db
      .select({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        versionNumber: versions.number,
      })
      .from(projects)
      .leftJoin(versions, eq(versions.id, projects.currentVersionId))
      .where(
        and(
          eq(projects.ownerId, ownerId),
          isNull(projects.deletedAt),
          cursor === undefined
            ? undefined
            : sql`(${projects.updatedAt}, ${projects.id}) < (${cursor.updatedAt}::timestamptz, ${cursor.id}::uuid)`,
        ),
      )
      .orderBy(desc(projects.updatedAt), desc(projects.id))
      .limit(options.limit + 1);

    const page = rows.slice(0, options.limit);
    const last = page.at(-1);
    return {
      items: page.map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        thumbnailUrl: null,
        currentVersion: row.versionNumber === null ? null : { number: row.versionNumber },
      })),
      nextCursor:
        rows.length > options.limit && last !== undefined
          ? encodeCursor({ updatedAt: last.updatedAt.toISOString(), id: last.id })
          : null,
    };
  }

  async create(ownerId: string, name: string): Promise<ProjectDetail> {
    return this.db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values({ ownerId, name }).returning();
      if (project === undefined) throw new Error("project insert returned no row");
      await this.audit(tx, ownerId, "project.create", project.id);
      return toDetail(project, null);
    });
  }

  async get(ownerId: string, projectId: string): Promise<ProjectDetail> {
    if (!UUID_PATTERN.test(projectId)) throw errors.projectNotFound();
    return this.findDetail(this.db, ownerId, projectId);
  }

  async update(ownerId: string, projectId: string, patch: ProjectPatch): Promise<ProjectDetail> {
    if (!UUID_PATTERN.test(projectId)) throw errors.projectNotFound();
    const changes = {
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(patch.descriptionText === undefined ? {} : { descriptionText: patch.descriptionText }),
    };
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(projects)
        .set({ ...changes, updatedAt: sql`now()` })
        .where(this.owned(ownerId, projectId))
        .returning({ id: projects.id });
      if (updated === undefined) throw errors.projectNotFound();
      await this.audit(tx, ownerId, "project.update", updated.id, {
        fields: Object.keys(changes),
      });
      return this.findDetail(tx, ownerId, updated.id);
    });
  }

  /** Copies the project and, when it has one, its current version as version 1 of the copy. */
  async duplicate(ownerId: string, projectId: string): Promise<ProjectDetail> {
    if (!UUID_PATTERN.test(projectId)) throw errors.projectNotFound();
    return this.db.transaction(async (tx) => {
      const [source] = await tx
        .select({ project: projects, version: versions })
        .from(projects)
        .leftJoin(versions, eq(versions.id, projects.currentVersionId))
        .where(this.owned(ownerId, projectId))
        .limit(1);
      if (source === undefined) throw errors.projectNotFound();

      const [copy] = await tx
        .insert(projects)
        .values({
          ownerId,
          name: copyName(source.project.name),
          descriptionText: source.project.descriptionText,
          parameters: source.project.parameters,
          site: source.project.site,
        })
        .returning({ id: projects.id });
      if (copy === undefined) throw new Error("project insert returned no row");

      if (source.version !== null) {
        const [version] = await tx
          .insert(versions)
          .values({
            projectId: copy.id,
            number: 1,
            model: source.version.model,
            modelSchemaVersion: source.version.modelSchemaVersion,
            origin: source.version.origin,
            seed: source.version.seed,
            warnings: source.version.warnings,
          })
          .returning({ id: versions.id });
        if (version === undefined) throw new Error("version insert returned no row");
        await tx
          .update(projects)
          .set({ currentVersionId: version.id })
          .where(this.owned(ownerId, copy.id));
      }

      await this.audit(tx, ownerId, "project.duplicate", copy.id, {
        sourceProjectId: source.project.id,
      });
      return this.findDetail(tx, ownerId, copy.id);
    });
  }

  /** Soft delete: the row stays in the bin until the purge removes it. */
  async delete(ownerId: string, projectId: string): Promise<void> {
    if (!UUID_PATTERN.test(projectId)) throw errors.projectNotFound();
    await this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .update(projects)
        .set({ deletedAt: sql`now()` })
        .where(this.owned(ownerId, projectId))
        .returning({ id: projects.id });
      if (deleted === undefined) throw errors.projectNotFound();
      await this.audit(tx, ownerId, "project.delete", deleted.id);
    });
  }
}
