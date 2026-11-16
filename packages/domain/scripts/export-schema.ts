import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { BuildingModelSchema, SCHEMA_VERSION } from "../src/schema.js";

const target = resolve(import.meta.dirname, "../schema/building-model.schema.json");
const jsonSchema = z.toJSONSchema(BuildingModelSchema, { target: "draft-2020-12" });
const document = {
  $id: `https://tracea.app/schemas/building-model/${SCHEMA_VERSION}`,
  title: "BuildingModel",
  ...jsonSchema,
};

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Schema written to ${target}`);
