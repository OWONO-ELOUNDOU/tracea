import type { LogLevel } from "../config.js";
import type { Database } from "../db/client.js";
import { purgeExpired } from "./purge.js";

export type LogLine = Record<string, string | number>;
export type LogWriter = (line: LogLine) => void;

/** Pino-compatible JSON lines on standard output, like the API's own logs. */
export const writeJsonLine: LogWriter = (line) => {
  process.stdout.write(`${JSON.stringify({ time: Date.now(), ...line })}\n`);
};

/** Pino numeric levels, so that LOG_LEVEL filters the command's lines as it does the API's. */
const LEVELS: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/** Error lines (level 50 and above) are written whatever LOG_LEVEL says (A14). */
const ALWAYS_WRITTEN = LEVELS.error;

/**
 * Drops lines below `level`. Lines without a numeric level and error lines are always written:
 * a failed purge must leave a trace even with LOG_LEVEL=fatal, the exit code alone being easy
 * to miss in a scheduler.
 */
export function filterByLevel(level: LogLevel, write: LogWriter): LogWriter {
  const minimum = Math.min(LEVELS[level], ALWAYS_WRITTEN);
  return (line) => {
    if (typeof line.level === "number" && line.level < minimum) return;
    write(line);
  };
}

/**
 * Runs one purge and returns the process exit code. Only the three counters are logged on
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
