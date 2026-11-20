import type { z } from "zod";
import { errors } from "./errors.js";

/** Bounds on a 422 response, whatever the size of the rejected body (S2-SEC-06). */
export const MAX_FIELD_ENTRIES = 20;
export const MAX_FIELD_KEY_LENGTH = 64;

/** Cuts a key to MAX_FIELD_KEY_LENGTH code points, the last one being an ellipsis. */
function fieldKey(path: readonly PropertyKey[]): string {
  const key = path.map(String).join(".") || "_";
  const codePoints = Array.from(key);
  if (codePoints.length <= MAX_FIELD_KEY_LENGTH) return key;
  return `${codePoints.slice(0, MAX_FIELD_KEY_LENGTH - 1).join("")}…`;
}

/**
 * Builds the `fields` map of a 422 response, in the order of the Zod issues (deterministic for a
 * given schema and body), keeping the first message per key and at most MAX_FIELD_ENTRIES keys.
 */
export function issuesToFields(issues: z.ZodError["issues"]): Record<string, string> {
  // No prototype: a key such as "__proto__" stays an ordinary entry.
  const fields = Object.create(null) as Record<string, string>;
  let count = 0;
  const add = (path: readonly PropertyKey[], message: string): boolean => {
    const key = fieldKey(path);
    if (!Object.hasOwn(fields, key)) {
      fields[key] = message;
      count += 1;
    }
    return count < MAX_FIELD_ENTRIES;
  };
  for (const issue of issues) {
    if (issue.code === "unrecognized_keys") {
      // Strict schemas: report each rejected key under its own name.
      for (const key of issue.keys) {
        if (!add([...issue.path, key], "Champ non autorisé.")) return fields;
      }
      continue;
    }
    if (!add(issue.path, issue.message)) return fields;
  }
  return fields;
}

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  throw errors.validation(issuesToFields(result.error.issues));
}
