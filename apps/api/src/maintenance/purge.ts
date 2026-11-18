import { and, isNotNull, lt, lte } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Database } from "../db/client.js";
import type * as schema from "../db/schema.js";
import { projects, sessions } from "../db/schema.js";

/** Days a soft-deleted project stays in the trash before it is removed for good. */
export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// Both drivers share this base type; the union in `Database` has no common `delete` signature.
type Executor = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface PurgeResult {
  sessionsDeleted: number;
  projectsDeleted: number;
}

/**
 * Deletes expired sessions and projects that have been in the trash for more than
 * `TRASH_RETENTION_DAYS`; their versions go with them through the foreign-key cascade.
 * Idempotent and safe to run concurrently: each statement only removes rows that still match.
 */
export async function purgeExpired(db: Database, now: Date): Promise<PurgeResult> {
  const executor: Executor = db;
  // Same boundary as session resolution, which only accepts `expires_at > now`.
  const expiredSessions = await executor
    .delete(sessions)
    .where(lte(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  const trashCutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * DAY_MS);
  const purgedProjects = await executor
    .delete(projects)
    .where(and(isNotNull(projects.deletedAt), lt(projects.deletedAt, trashCutoff)))
    .returning({ id: projects.id });

  return { sessionsDeleted: expiredSessions.length, projectsDeleted: purgedProjects.length };
}
