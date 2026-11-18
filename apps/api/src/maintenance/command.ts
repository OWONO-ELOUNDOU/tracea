import type { Database } from "../db/client.js";
import { purgeExpired } from "./purge.js";

export type LogLine = Record<string, string | number>;
export type LogWriter = (line: LogLine) => void;

/** Pino-compatible JSON lines on standard output, like the API's own logs. */
export const writeJsonLine: LogWriter = (line) => {
  process.stdout.write(`${JSON.stringify({ time: Date.now(), ...line })}\n`);
};

/**
 * Runs one purge and returns the process exit code. Only the two counters are logged on
 * success; on failure, only the error class and message, never row contents.
 */
export async function runPurgeCommand(db: Database, now: Date, log: LogWriter): Promise<number> {
  try {
    const result = await purgeExpired(db, now);
    log({ level: 30, msg: "purge completed", ...result });
    return 0;
  } catch (error) {
    log(failureLine(error));
    return 1;
  }
}

export function failureLine(error: unknown): LogLine {
  if (!(error instanceof Error)) return { level: 50, msg: "purge failed", err: String(error) };
  // The query wrapper hides the driver error (refused connection, missing table) in `cause`.
  const cause = error.cause instanceof Error ? ` (cause: ${error.cause.message})` : "";
  return { level: 50, msg: "purge failed", err: `${error.name}: ${error.message}${cause}` };
}
