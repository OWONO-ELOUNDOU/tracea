import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseBuildingModel, type BuildingModel } from "../src/index.js";

export function loadFixture(name: string): BuildingModel {
  const path = resolve(import.meta.dirname, "../fixtures", `${name}.json`);
  return parseBuildingModel(JSON.parse(readFileSync(path, "utf8")));
}

export function clone(model: BuildingModel): BuildingModel {
  return structuredClone(model);
}
