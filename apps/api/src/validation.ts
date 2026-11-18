import type { z } from "zod";
import { errors } from "./errors.js";

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    if (issue.code === "unrecognized_keys") {
      // Strict schemas: report each rejected key under its own name.
      for (const key of issue.keys) {
        fields[[...issue.path, key].join(".")] ??= "Champ non autorisé.";
      }
      continue;
    }
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  throw errors.validation(fields);
}
