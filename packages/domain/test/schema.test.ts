import { describe, expect, it } from "vitest";
import { safeParseBuildingModel } from "../src/index.js";
import { loadFixture } from "./fixture.js";

describe("BuildingModel schema", () => {
  it("accepts the reference fixture", () => {
    const model = loadFixture("house-rectangular");
    expect(model.schemaVersion).toBe("1.0");
    expect(model.rooms).toHaveLength(3);
  });

  it("rejects an unknown schema version", () => {
    const model = loadFixture("house-rectangular");
    const result = safeParseBuildingModel({ ...model, schemaVersion: "2.0" });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer lengths", () => {
    const model = loadFixture("house-rectangular");
    const walls = model.walls.map((wall, index) =>
      index === 0 ? { ...wall, thickness: 300.5 } : wall,
    );
    expect(safeParseBuildingModel({ ...model, walls }).success).toBe(false);
  });

  it("rejects a room type outside the enumeration", () => {
    const model = loadFixture("house-rectangular");
    const rooms = model.rooms.map((room, index) =>
      index === 0 ? { ...room, type: "pool" } : room,
    );
    expect(safeParseBuildingModel({ ...model, rooms }).success).toBe(false);
  });

  it("defaults locked to false", () => {
    const model = loadFixture("house-rectangular");
    const [wall] = model.walls;
    const { locked: _locked, ...withoutLocked } = wall!;
    const result = safeParseBuildingModel({
      ...model,
      walls: [withoutLocked, ...model.walls.slice(1)],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.walls[0]?.locked).toBe(false);
  });
});
