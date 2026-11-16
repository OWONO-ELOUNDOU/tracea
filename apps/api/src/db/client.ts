import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { resolve } from "node:path";
import { Pool } from "pg";
import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

export interface DatabaseHandle {
  db: Database;
  close: () => Promise<void>;
}

const migrationsFolder = resolve(import.meta.dirname, "../../drizzle");

export async function connectDatabase(url: string): Promise<DatabaseHandle> {
  const pool = new Pool({ connectionString: url, max: 10 });
  const db = drizzlePg(pool, { schema });
  await migratePg(db, { migrationsFolder });
  return { db, close: () => pool.end() };
}

/** In-memory PostgreSQL for tests; runs the same migrations as production. */
export async function createEmbeddedDatabase(): Promise<DatabaseHandle> {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder });
  return { db, close: () => client.close() };
}
