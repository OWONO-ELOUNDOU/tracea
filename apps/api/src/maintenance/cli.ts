/**
 * Daily maintenance entry point, started by an external scheduler (decision D7):
 * `node dist/maintenance/cli.js`. Runs the purge once and exits; non-zero on failure.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadMaintenanceConfig } from "../config.js";
import * as schema from "../db/schema.js";
import { failureLine, filterByLevel, runPurgeCommand, writeJsonLine } from "./command.js";

async function main(): Promise<number> {
  // DATABASE_URL and LOG_LEVEL only: the job needs no session secret (S2-SEC-08).
  const config = loadMaintenanceConfig();
  // No migrations here: the API applies them at start-up, and running them from two processes
  // at once is not safe. A missing table makes the purge fail with a non-zero exit code.
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 1 });
  try {
    return await runPurgeCommand(
      drizzle(pool, { schema }),
      new Date(),
      filterByLevel(config.LOG_LEVEL, writeJsonLine),
    );
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
