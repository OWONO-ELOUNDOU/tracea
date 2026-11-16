import { describe, expect, it } from "vitest";
import { area, isSimplePolygon, pointStrictlyInside, polygonsOverlap } from "../src/geometry.js";

const square = [
  [0, 0],
  [1000, 0],
  [1000, 1000],
  [0, 1000],
] as const;

describe("geometry", () => {
  it("computes the area of a rectangle", () => {
    expect(area(square)).toBe(1_000_000);
  });

  it("computes the area of an L-shaped room", () => {
    const l = [
      [0, 0],
      [2000, 0],
      [2000, 1000],
      [1000, 1000],
      [1000, 2000],
      [0, 2000],
    ] as const;
    expect(area(l)).toBe(3_000_000);
  });

  it("detects self-crossing polygons", () => {
    const bowtie = [
      [0, 0],
      [1000, 1000],
      [1000, 0],
      [0, 1000],
    ] as const;
    expect(isSimplePolygon(bowtie)).toBe(false);
    expect(isSimplePolygon(square)).toBe(true);
  });

  it("treats boundary points as outside", () => {
    expect(pointStrictlyInside([500, 500], square)).toBe(true);
    expect(pointStrictlyInside([0, 500], square)).toBe(false);
    expect(pointStrictlyInside([1500, 500], square)).toBe(false);
  });

  it("does not report adjacent rooms sharing an edge as overlapping", () => {
    const neighbour = [
      [1000, 0],
      [2000, 0],
      [2000, 1000],
      [1000, 1000],
    ] as const;
    expect(polygonsOverlap(square, neighbour)).toBe(false);
  });

  it("reports intersecting rooms as overlapping", () => {
    const shifted = [
      [500, 500],
      [1500, 500],
      [1500, 1500],
      [500, 1500],
    ] as const;
    expect(polygonsOverlap(square, shifted)).toBe(true);
    expect(polygonsOverlap(square, square)).toBe(true);
  });

  it("reports a room containing another as overlapping", () => {
    const inner = [
      [200, 200],
      [800, 200],
      [800, 800],
      [200, 800],
    ] as const;
    expect(polygonsOverlap(square, inner)).toBe(true);
  });
});
