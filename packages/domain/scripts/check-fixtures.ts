import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safeParseBuildingModel } from "../src/schema.js";
import { validateInvariants } from "../src/invariants.js";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");
let failures = 0;

for (const file of readdirSync(fixturesDir).filter((name) => name.endsWith(".json"))) {
  const raw: unknown = JSON.parse(readFileSync(resolve(fixturesDir, file), "utf8"));
  const parsed = safeParseBuildingModel(raw);
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

if (failures > 0) process.exit(1);
