/**
 * Daily maintenance entry point, started by an external scheduler (decision D7):
 * `node dist/maintenance/cli.js`. Runs the purge once and exits; non-zero on failure.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadConfig } from "../config.js";
import * as schema from "../db/schema.js";
import { failureLine, runPurgeCommand, writeJsonLine } from "./command.js";

async function main(): Promise<number> {
  const config = loadConfig();
  // No migrations here: the API applies them at start-up, and running them from two processes
  // at once is not safe. A missing table makes the purge fail with a non-zero exit code.
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 1 });
  try {
    return await runPurgeCommand(drizzle(pool, { schema }), new Date(), writeJsonLine);
  } finally {
    await pool.end();
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  writeJsonLine(failureLine(error));
  process.exitCode = 1;
}
