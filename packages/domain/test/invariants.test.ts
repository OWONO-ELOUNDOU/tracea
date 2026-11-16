import { describe, expect, it } from "vitest";
import { computeMetrics, validateInvariants } from "../src/index.js";
import { clone, loadFixture } from "./fixture.js";

const codes = (model: ReturnType<typeof loadFixture>): string[] =>
  validateInvariants(model).map((check) => check.code);

describe("invariants", () => {
  it("accepts the reference fixture", () => {
    expect(validateInvariants(loadFixture("house-rectangular"))).toEqual([]);
  });

  it("recomputes the stored metrics", () => {
    const model = loadFixture("house-rectangular");
    expect(computeMetrics(model)).toEqual(model.metrics);
  });

  it("flags a wall shorter than 300 mm", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.walls[5]!.end = [7200, 4000];
    expect(codes(model)).toContain("WALL_TOO_SHORT");
  });

  it("flags a wall thickness outside 70–600 mm", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.walls[4]!.thickness = 50;
    expect(codes(model)).toContain("WALL_THICKNESS_OUT_OF_RANGE");
  });

  it("flags an opening beyond the end of its wall", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.openings[2]!.offset = 11500;
    expect(codes(model)).toContain("OPENING_OUT_OF_WALL");
  });

  it("flags a door with a non-zero sill", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.openings[0]!.sillHeight = 100;
    expect(codes(model)).toContain("OPENING_SILL_INVALID");
  });

  it("flags overlapping openings on the same wall", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.openings[1]!.offset = 1500;
    expect(codes(model)).toContain("OPENINGS_OVERLAP");
  });

  it("flags a habitable room without a door", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.openings = model.openings.filter((opening) => opening.id !== "o_05");
    const result = validateInvariants(model);
    expect(result.map((check) => check.code)).toContain("ROOM_NOT_ACCESSIBLE");
    expect(result.find((check) => check.code === "ROOM_NOT_ACCESSIBLE")?.targetIds).toEqual([
      "r_03",
    ]);
  });

  it("flags overlapping rooms on the same level", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.rooms[1]!.polygon = [
      [6000, 150],
      [11850, 150],
      [11850, 3950],
      [6000, 3950],
    ];
    model.rooms[1]!.area = 22_230_000;
    model.metrics.habitableArea += 3_990_000;
    model.metrics.floorArea += 3_990_000;
    expect(codes(model)).toContain("ROOMS_OVERLAP");
  });

  it("flags an unreferenced level and a level without stairs", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.levels.push({
      id: "lvl_1",
      name: "Étage",
      index: 1,
      elevation: 2900,
      height: 2500,
      slabThickness: 200,
    });
    model.walls[0]!.levelId = "lvl_9";
    const result = codes(model);
    expect(result).toContain("LEVEL_NOT_FOUND");
    expect(result).toContain("LEVEL_NOT_CONNECTED");
  });

  it("flags inconsistent metrics", () => {
    const model = clone(loadFixture("house-rectangular"));
    model.metrics.habitableArea += 10;
    expect(codes(model)).toContain("METRICS_MISMATCH");
  });
});
