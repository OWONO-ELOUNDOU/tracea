import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { BuildingModelSchema, SCHEMA_VERSION } from "../src/schema.js";
import { ProjectParametersSchema, ProjectSiteSchema } from "../src/project-input.js";

const schemaDir = resolve(import.meta.dirname, "../schema");

function write(fileName: string, document: Record<string, unknown>): void {
  const target = resolve(schemaDir, fileName);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Schema written to ${target}`);
}

write("building-model.schema.json", {
  $id: `https://tracea.app/schemas/building-model/${SCHEMA_VERSION}`,
  title: "BuildingModel",
  ...z.toJSONSchema(BuildingModelSchema, { target: "draft-2020-12" }),
});

// Project inputs are exported in their input form (what a client may send): keys with a default
// value are optional. Cross-field rules (unique room types, simple polygon, minimum polygon area,
// access edge within the boundary) are not expressible here and stay enforced by Zod.
write("project-parameters.schema.json", {
  $id: "https://tracea.app/schemas/project-parameters",
  title: "ProjectParameters",
  description:
    "Structured building parameters (EF-201). Lengths in mm, areas in mm². Each room type appears at most once.",
  ...z.toJSONSchema(ProjectParametersSchema, { target: "draft-2020-12", io: "input" }),
});

write("project-site.schema.json", {
  $id: "https://tracea.app/schemas/project-site",
  title: "ProjectSite",
  description:
    "Site entered by the user (EF-202). Lengths in mm, angles in degrees. A polygon boundary must be simple with an area of at least 25 m²; accessEdgeIndex must designate an edge of the boundary.",
  ...z.toJSONSchema(ProjectSiteSchema, { target: "draft-2020-12", io: "input" }),
});
