import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { z } from "zod";
import { safeParseBuildingModel } from "../src/schema.js";
import { validateInvariants } from "../src/invariants.js";
import { ProjectParametersSchema, ProjectSiteSchema } from "../src/project-input.js";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");
let failures = 0;

function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

// BuildingModel fixtures: top-level files only (also read by engine/tests/test_contract.py).
for (const file of jsonFiles(fixturesDir)) {
  const parsed = safeParseBuildingModel(readJson(resolve(fixturesDir, file)));
  if (!parsed.success) {
    failures += 1;
    console.error(`[FAIL] ${file}: schema\n${parsed.error.message}`);
    continue;
  }
  const violations = validateInvariants(parsed.data);
  if (violations.length > 0) {
    failures += 1;
    console.error(`[FAIL] ${file}: invariants`);
    for (const check of violations) console.error(`  - ${check.code}: ${check.message}`);
    continue;
  }
  console.log(`[OK]   ${file}`);
}

// Project input fixtures: the file name prefix selects the schema; `valid/` files must be
// accepted, `invalid/` files must be rejected.
const inputDir = resolve(fixturesDir, "project-input");
const inputSchemas: Record<string, z.ZodType> = {
  parameters: ProjectParametersSchema,
  site: ProjectSiteSchema,
};

for (const expectation of ["valid", "invalid"] as const) {
  const dir = resolve(inputDir, expectation);
  for (const file of jsonFiles(dir)) {
    const label = `project-input/${expectation}/${file}`;
    const prefix = file.split("-")[0] ?? "";
    const schema = inputSchemas[prefix];
    if (schema === undefined) {
      failures += 1;
      console.error(`[FAIL] ${label}: name must start with "parameters-" or "site-"`);
      continue;
    }
    const parsed = schema.safeParse(readJson(resolve(dir, file)));
    if (expectation === "valid" && !parsed.success) {
      failures += 1;
      console.error(`[FAIL] ${label}: rejected\n${parsed.error.message}`);
      continue;
    }
    if (expectation === "invalid" && parsed.success) {
      failures += 1;
      console.error(`[FAIL] ${label}: accepted although invalid`);
      continue;
    }
    console.log(`[OK]   ${label}`);
  }
}

if (failures > 0) process.exit(1);
