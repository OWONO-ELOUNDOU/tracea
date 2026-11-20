import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  buildableZone,
  countCharacters,
  DescriptionTextSchema,
  DESCRIPTION_MAX_LENGTH,
  metresToMm,
  mm2ToSquareMetres,
  mmToMetres,
  PROJECT_NAME_MAX_LENGTH,
  ProjectNameSchema,
  ProjectParametersSchema,
  ProjectSiteSchema,
  siteBoundaryPolygon,
  squareMetresToMm2,
  type ProjectParametersInput,
  type ProjectSite,
  type ProjectSiteInput,
} from "../src/index.js";

/** Issues keyed by dotted path, unknown keys reported under their own name (as the API does). */
function fieldErrors(schema: z.ZodType, value: unknown): Record<string, string> {
  const result = schema.safeParse(value);
  if (result.success) return {};
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) fields[[...issue.path, key].join(".")] ??= issue.message;
      continue;
    }
    fields[issue.path.join(".") || "_"] ??= issue.message;
  }
  return fields;
}

const mockupParameters: ProjectParametersInput = {
  buildingType: "house",
  levelsCount: 1,
  targetHabitableArea: 120_000_000,
  rooms: [
    { type: "livingKitchen", count: 1, minArea: 40_000_000 },
    { type: "bedroom", count: 3, minArea: 10_000_000 },
    { type: "bathroom", count: 1 },
    { type: "wc", count: 1 },
    { type: "storage", count: 1, minArea: 4_000_000 },
  ],
  garage: { kind: "attached", spaces: 2, minArea: 36_000_000 },
  roof: { type: "gable", covering: "tile" },
  livingOrientation: "S",
};

const mockupSite: ProjectSiteInput = {
  boundary: { kind: "rectangle", width: 20_000, depth: 30_000 },
  setbacks: { front: 5_000, side: 3_000, rear: 4_000 },
};

function completeSite(input: ProjectSiteInput): ProjectSite {
  return ProjectSiteSchema.parse(input);
}

describe("ProjectParametersSchema", () => {
  it("accepts the mock-up example unchanged", () => {
    expect(ProjectParametersSchema.parse(mockupParameters)).toEqual(mockupParameters);
  });

  it("accepts an empty object and adds no default", () => {
    expect(ProjectParametersSchema.parse({})).toEqual({});
  });

  it("accepts the absence of a garage as distinct from an unspecified one", () => {
    expect(ProjectParametersSchema.parse({ garage: { kind: "none" } })).toEqual({
      garage: { kind: "none" },
    });
  });

  type Bound = [field: string, build: (value: number) => unknown, min: number, max: number];
  const room = (patch: Record<string, unknown>) => ({
    rooms: [{ type: "bedroom", count: 1, ...patch }],
  });
  const bounds: Bound[] = [
    ["levelsCount", (v) => ({ levelsCount: v }), 1, 3],
    ["targetHabitableArea", (v) => ({ targetHabitableArea: v }), 20_000_000, 500_000_000],
    ["rooms.0.count", (v) => room({ count: v }), 1, 10],
    ["rooms.0.minArea", (v) => room({ minArea: v }), 1_000_000, 200_000_000],
    ["garage.spaces", (v) => ({ garage: { kind: "attached", spaces: v } }), 1, 3],
    [
      "garage.minArea",
      (v) => ({ garage: { kind: "detached", spaces: 1, minArea: v } }),
      10_000_000,
      100_000_000,
    ],
  ];

  it.each(bounds)("bounds %s", (field, build, min, max) => {
    expect(ProjectParametersSchema.safeParse(build(min)).success).toBe(true);
    expect(ProjectParametersSchema.safeParse(build(max)).success).toBe(true);
    expect(Object.keys(fieldErrors(ProjectParametersSchema, build(min - 1)))).toEqual([field]);
    expect(Object.keys(fieldErrors(ProjectParametersSchema, build(max + 1)))).toEqual([field]);
  });

  it("limits the room list to 10 lines", () => {
    const types = [
      "livingKitchen",
      "living",
      "kitchen",
      "bedroom",
      "bathroom",
      "wc",
      "office",
      "laundry",
      "storage",
      "technical",
    ];
    const rooms = types.map((type) => ({ type, count: 1 }));
    expect(ProjectParametersSchema.safeParse({ rooms }).success).toBe(true);
    expect(
      fieldErrors(ProjectParametersSchema, { rooms: [...rooms, { type: "bedroom", count: 1 }] }),
    ).toEqual({
      rooms:
        "La liste des pièces est limitée à 10 lignes\u00a0: supprimez une ligne ou regroupez des pièces.",
    });
  });

  it("states the bounds in display units", () => {
    expect(fieldErrors(ProjectParametersSchema, { targetHabitableArea: 1 })).toEqual({
      targetHabitableArea: "La surface habitable doit être comprise entre 20 et 500 m².",
    });
  });

  it("rejects a duplicated room type on the second line", () => {
    expect(
      fieldErrors(ProjectParametersSchema, {
        rooms: [
          { type: "bedroom", count: 2 },
          { type: "wc", count: 1 },
          { type: "bedroom", count: 1 },
        ],
      }),
    ).toEqual({
      "rooms.2.type":
        "Ce type de pièce figure déjà dans la liste\u00a0: modifiez plutôt le nombre de la ligne existante.",
    });
  });

  it.each([
    ["a line without type", { count: 1 }],
    ["a line with a type outside the list", { type: "pool", count: 1 }],
    ["a line that is not an object", null],
  ])("still reports a duplicated type next to %s (A12)", (_label, other) => {
    const errors = fieldErrors(ProjectParametersSchema, {
      rooms: [other, { type: "bedroom", count: 2 }, { type: "bedroom", count: 1 }],
    });
    expect(errors["rooms.2.type"]).toBe(
      "Ce type de pièce figure déjà dans la liste\u00a0: modifiez plutôt le nombre de la ligne existante.",
    );
    // The other line keeps its own error.
    expect(Object.keys(errors).some((key) => key.startsWith("rooms.0"))).toBe(true);
  });

  it.each(["garage", "hall", "corridor"])("rejects the model room type %s", (type) => {
    expect(Object.keys(fieldErrors(ProjectParametersSchema, room({ type })))).toEqual([
      "rooms.0.type",
    ]);
  });

  it("requires the number of spaces of a garage", () => {
    expect(fieldErrors(ProjectParametersSchema, { garage: { kind: "attached" } })).toEqual({
      "garage.spaces": "Indiquez le nombre de places du garage.",
    });
  });

  it("rejects spaces without a garage", () => {
    expect(fieldErrors(ProjectParametersSchema, { garage: { kind: "none", spaces: 1 } })).toEqual({
      "garage.spaces": "Champ non autorisé.",
    });
  });

  it("rejects an unknown garage kind", () => {
    expect(
      Object.keys(fieldErrors(ProjectParametersSchema, { garage: { kind: "carport" } })),
    ).toEqual(["garage.kind"]);
  });

  it("rejects the shed roof and requires the roof type", () => {
    expect(Object.keys(fieldErrors(ProjectParametersSchema, { roof: { type: "shed" } }))).toEqual([
      "roof.type",
    ]);
    expect(fieldErrors(ProjectParametersSchema, { roof: { covering: "tile" } })).toEqual({
      "roof.type": "Indiquez le type de toiture.",
    });
  });

  it("rejects an unknown nested key", () => {
    expect(fieldErrors(ProjectParametersSchema, { roof: { type: "flat", pitch: 30 } })).toEqual({
      "roof.pitch": "Champ non autorisé.",
    });
  });

  it("rejects a nested null", () => {
    expect(Object.keys(fieldErrors(ProjectParametersSchema, { levelsCount: null }))).toEqual([
      "levelsCount",
    ]);
    expect(Object.keys(fieldErrors(ProjectParametersSchema, room({ minArea: null })))).toEqual([
      "rooms.0.minArea",
    ]);
  });

  it("rejects a non-integer area", () => {
    expect(fieldErrors(ProjectParametersSchema, { targetHabitableArea: 120_000_000.5 })).toEqual({
      targetHabitableArea: "La surface habitable doit être arrondie au millimètre carré.",
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 1e300, "3"])(
    "rejects the non-number or out-of-range value %s",
    (value) => {
      expect(ProjectParametersSchema.safeParse({ levelsCount: value }).success).toBe(false);
    },
  );

  it("rejects a non-object value", () => {
    expect(fieldErrors(ProjectParametersSchema, [])).toEqual({
      _: "Les paramètres du bâtiment sont invalides.",
    });
  });
});

describe("ProjectSiteSchema", () => {
  it("accepts the mock-up example and applies the defaults", () => {
    expect(ProjectSiteSchema.parse(mockupSite)).toEqual({
      boundary: { kind: "rectangle", width: 20_000, depth: 30_000 },
      northAngle: 0,
      accessEdgeIndex: 0,
      setbacks: { front: 5_000, side: 3_000, rear: 4_000 },
      slope: { direction: 0, percent: 0 },
    });
  });

  it("fills partial groups with their own defaults", () => {
    const site = ProjectSiteSchema.parse({
      boundary: { kind: "rectangle", width: 10_000, depth: 10_000 },
      setbacks: { rear: 2_000 },
      slope: { percent: 5 },
    });
    expect(site.setbacks).toEqual({ front: 0, side: 0, rear: 2_000 });
    expect(site.slope).toEqual({ direction: 0, percent: 5 });
  });

  it("is stable when parsing its own output", () => {
    const site = completeSite(mockupSite);
    expect(ProjectSiteSchema.parse(site)).toEqual(site);
  });

  it("requires the boundary", () => {
    expect(fieldErrors(ProjectSiteSchema, {})).toEqual({
      boundary: "Indiquez les dimensions du terrain.",
    });
  });

  type Bound = [field: string, build: (value: number) => unknown, min: number, max: number];
  const rect = (width: number, depth = 30_000) => ({
    boundary: { kind: "rectangle", width, depth },
  });
  const withSite = (patch: Record<string, unknown>) => ({ ...rect(20_000), ...patch });
  const integerBounds: Bound[] = [
    ["boundary.width", (v) => rect(v), 5_000, 500_000],
    ["boundary.depth", (v) => rect(20_000, v), 5_000, 500_000],
    ["setbacks.front", (v) => withSite({ setbacks: { front: v } }), 0, 50_000],
    ["setbacks.side", (v) => withSite({ setbacks: { side: v } }), 0, 50_000],
    ["setbacks.rear", (v) => withSite({ setbacks: { rear: v } }), 0, 50_000],
    ["accessEdgeIndex", (v) => withSite({ accessEdgeIndex: v }), 0, 3],
    [
      "boundary.points.1.0",
      (v) => ({
        boundary: {
          kind: "polygon",
          points: [
            [0, 0],
            [v, 0],
            [0, 1_000_000],
          ],
        },
      }),
      10_000,
      1_000_000,
    ],
  ];

  it.each(integerBounds)("bounds %s", (field, build, min, max) => {
    expect(ProjectSiteSchema.safeParse(build(min)).success).toBe(true);
    expect(ProjectSiteSchema.safeParse(build(max)).success).toBe(true);
    if (field !== "boundary.points.1.0") {
      expect(Object.keys(fieldErrors(ProjectSiteSchema, build(min - 1)))).toEqual([field]);
    }
    expect(Object.keys(fieldErrors(ProjectSiteSchema, build(max + 1)))).toEqual([field]);
  });

  it("rejects a negative polygon coordinate", () => {
    const points = [
      [-1, 0],
      [10_000, 0],
      [10_000, 10_000],
    ];
    expect(
      Object.keys(fieldErrors(ProjectSiteSchema, { boundary: { kind: "polygon", points } })),
    ).toEqual(["boundary.points.0.0"]);
  });

  type DecimalBound = [field: string, build: (value: number) => unknown, max: number];
  const decimalBounds: DecimalBound[] = [
    ["northAngle", (v) => withSite({ northAngle: v }), 359.999],
    ["slope.direction", (v) => withSite({ slope: { direction: v } }), 359.999],
    ["slope.percent", (v) => withSite({ slope: { percent: v } }), 30],
  ];

  it.each(decimalBounds)("bounds %s", (field, build, max) => {
    expect(ProjectSiteSchema.safeParse(build(0)).success).toBe(true);
    expect(ProjectSiteSchema.safeParse(build(max)).success).toBe(true);
    expect(Object.keys(fieldErrors(ProjectSiteSchema, build(-1)))).toEqual([field]);
    expect(Object.keys(fieldErrors(ProjectSiteSchema, build(Math.floor(max) + 1)))).toEqual([
      field,
    ]);
  });

  it("excludes 360 degrees", () => {
    expect(fieldErrors(ProjectSiteSchema, withSite({ northAngle: 360 }))).toEqual({
      northAngle: "L'orientation du nord doit être comprise entre 0 et 360° (360 exclu).",
    });
  });

  it("states the side bounds in metres", () => {
    expect(fieldErrors(ProjectSiteSchema, rect(4_999))).toEqual({
      "boundary.width": "La largeur du terrain doit être comprise entre 5 et 500 m.",
    });
  });

  it("rejects a non-integer length in mm", () => {
    expect(fieldErrors(ProjectSiteSchema, rect(20_000.5))).toEqual({
      "boundary.width": "La largeur du terrain doit être arrondie au millimètre.",
    });
  });

  it("requires the rectangle sides", () => {
    expect(
      fieldErrors(ProjectSiteSchema, { boundary: { kind: "rectangle", width: 10_000 } }),
    ).toEqual({ "boundary.depth": "Indiquez la profondeur du terrain." });
  });

  it("rejects an access edge beyond the four sides of a rectangle", () => {
    expect(fieldErrors(ProjectSiteSchema, withSite({ accessEdgeIndex: 4 }))).toEqual({
      accessEdgeIndex: "Choisissez le côté du terrain qui donne sur la voie d'accès.",
    });
  });

  it("accepts any edge of a polygon as access edge", () => {
    const points = [
      [0, 0],
      [18_000, 0],
      [22_000, 26_000],
      [0, 30_000],
      [0, 15_000],
    ];
    const polygon = { boundary: { kind: "polygon", points } };
    expect(ProjectSiteSchema.safeParse({ ...polygon, accessEdgeIndex: 4 }).success).toBe(true);
    expect(Object.keys(fieldErrors(ProjectSiteSchema, { ...polygon, accessEdgeIndex: 5 }))).toEqual(
      ["accessEdgeIndex"],
    );
  });

  it("rejects a crossed polygon", () => {
    const points = [
      [0, 0],
      [20_000, 20_000],
      [20_000, 0],
      [0, 20_000],
    ];
    expect(fieldErrors(ProjectSiteSchema, { boundary: { kind: "polygon", points } })).toEqual({
      "boundary.points": "Le contour du terrain ne doit pas se recouper.",
    });
  });

  it("rejects a polygon of two points", () => {
    const points = [
      [0, 0],
      [20_000, 0],
    ];
    expect(fieldErrors(ProjectSiteSchema, { boundary: { kind: "polygon", points } })).toEqual({
      "boundary.points": "Le contour du terrain doit compter entre 3 et 64 points.",
    });
  });

  it("rejects a polygon above 64 points", () => {
    const circle = (n: number) =>
      Array.from({ length: n }, (_, i) => [
        Math.round(50_000 + 40_000 * Math.cos((2 * Math.PI * i) / n)),
        Math.round(50_000 + 40_000 * Math.sin((2 * Math.PI * i) / n)),
      ]);
    expect(
      ProjectSiteSchema.safeParse({ boundary: { kind: "polygon", points: circle(64) } }).success,
    ).toBe(true);
    expect(
      Object.keys(
        fieldErrors(ProjectSiteSchema, { boundary: { kind: "polygon", points: circle(65) } }),
      ),
    ).toEqual(["boundary.points"]);
  });

  it("rejects a polygon below 25 m² and a degenerate one", () => {
    const small = [
      [0, 0],
      [4_999, 0],
      [4_999, 5_000],
      [0, 5_000],
    ];
    const flat = [
      [0, 0],
      [10_000, 0],
      [20_000, 0],
    ];
    for (const points of [small, flat]) {
      expect(fieldErrors(ProjectSiteSchema, { boundary: { kind: "polygon", points } })).toEqual({
        "boundary.points": "La surface du terrain doit être d'au moins 25 m².",
      });
    }
    const exact = [
      [0, 0],
      [5_000, 0],
      [5_000, 5_000],
      [0, 5_000],
    ];
    expect(
      ProjectSiteSchema.safeParse({ boundary: { kind: "polygon", points: exact } }).success,
    ).toBe(true);
  });

  it("rejects a point with three coordinates", () => {
    const points = [
      [0, 0, 0],
      [10_000, 0],
      [10_000, 10_000],
    ];
    expect(
      Object.keys(fieldErrors(ProjectSiteSchema, { boundary: { kind: "polygon", points } })),
    ).toEqual(["boundary.points.0"]);
  });

  it("rejects an unknown boundary kind, unknown nested keys, nulls and groundLevel", () => {
    expect(Object.keys(fieldErrors(ProjectSiteSchema, { boundary: { kind: "circle" } }))).toEqual([
      "boundary.kind",
    ]);
    expect(fieldErrors(ProjectSiteSchema, withSite({ setbacks: { front: 0, back: 1 } }))).toEqual({
      "setbacks.back": "Champ non autorisé.",
    });
    expect(Object.keys(fieldErrors(ProjectSiteSchema, withSite({ northAngle: null })))).toEqual([
      "northAngle",
    ]);
    expect(Object.keys(fieldErrors(ProjectSiteSchema, withSite({ slope: null })))).toEqual([
      "slope",
    ]);
    expect(fieldErrors(ProjectSiteSchema, withSite({ groundLevel: 0 }))).toEqual({
      groundLevel: "Champ non autorisé.",
    });
  });

  it("accepts an empty buildable zone (D28)", () => {
    const site = withSite({ setbacks: { front: 20_000, rear: 20_000 } });
    expect(ProjectSiteSchema.safeParse(site).success).toBe(true);
  });
});

describe("site geometry", () => {
  it("draws the rectangle in the input frame", () => {
    expect(siteBoundaryPolygon(completeSite(mockupSite))).toEqual([
      [0, 0],
      [20_000, 0],
      [20_000, 30_000],
      [0, 30_000],
    ]);
  });

  it("returns a polygon as entered", () => {
    const points: [number, number][] = [
      [0, 0],
      [10_000, 0],
      [0, 10_000],
    ];
    expect(siteBoundaryPolygon({ boundary: { kind: "polygon", points } })).toEqual(points);
  });

  it("keeps the whole site with zero setbacks", () => {
    const site = completeSite({ boundary: mockupSite.boundary });
    expect(buildableZone(site)).toEqual(siteBoundaryPolygon(site));
  });

  it.each([
    // access edge, expected zone [x0, y0, x1, y1] for front 5 m, side 3 m, rear 4 m on 20 × 30 m
    [0, [3_000, 5_000, 17_000, 26_000]],
    [1, [4_000, 3_000, 15_000, 27_000]],
    [2, [3_000, 4_000, 17_000, 25_000]],
    [3, [5_000, 3_000, 16_000, 27_000]],
  ] as const)("applies asymmetric setbacks from access edge %i", (accessEdgeIndex, zone) => {
    const [x0, y0, x1, y1] = zone;
    expect(buildableZone(completeSite({ ...mockupSite, accessEdgeIndex }))).toEqual([
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ]);
  });

  it("returns null for an empty zone", () => {
    const touching = completeSite({ ...mockupSite, setbacks: { front: 15_000, rear: 15_000 } });
    expect(buildableZone(touching)).toBeNull();
    const tooWide = completeSite({ ...mockupSite, setbacks: { side: 10_000 } });
    expect(buildableZone(tooWide)).toBeNull();
  });

  it("returns null for a polygon or an invalid access edge", () => {
    const polygon = completeSite({
      boundary: {
        kind: "polygon",
        points: [
          [0, 0],
          [10_000, 0],
          [0, 10_000],
        ],
      },
    });
    expect(buildableZone(polygon)).toBeNull();
    expect(buildableZone({ ...completeSite(mockupSite), accessEdgeIndex: 4 })).toBeNull();
  });
});

describe("unit conversions", () => {
  it.each([
    [0, 0],
    [1, 1_000],
    [12.345, 12_345],
    [0.0004, 0],
    [0.0005, 1],
    [1.0005, 1_001],
    [1.0004999, 1_000],
    [-0.0005, -1],
    [-0.0004, 0],
    [1e-7, 0],
  ])("metresToMm(%d) = %d", (metres, mm) => {
    expect(Object.is(metresToMm(metres), mm)).toBe(true);
  });

  it.each([
    [120, 120_000_000],
    [12.5, 12_500_000],
    [0.0000005, 1],
    [0.0000004, 0],
    [36.0000015, 36_000_002],
  ])("squareMetresToMm2(%d) = %d", (squareMetres, mm2) => {
    expect(squareMetresToMm2(squareMetres)).toBe(mm2);
  });

  it("converts back to display units", () => {
    expect(mmToMetres(20_000)).toBe(20);
    expect(mmToMetres(12_345)).toBe(12.345);
    expect(mm2ToSquareMetres(120_000_000)).toBe(120);
    expect(mm2ToSquareMetres(12_500_000)).toBe(12.5);
  });

  it("round-trips millimetre values", () => {
    for (const mm of [0, 1, 999, 5_000, 12_345, 500_000]) {
      expect(metresToMm(mmToMetres(mm))).toBe(mm);
    }
  });

  it("returns NaN for non-finite inputs", () => {
    expect(metresToMm(Number.NaN)).toBeNaN();
    expect(squareMetresToMm2(Number.POSITIVE_INFINITY)).toBeNaN();
  });
});

describe("project text", () => {
  it("counts code points, composed emoji included", () => {
    expect(countCharacters("")).toBe(0);
    expect(countCharacters("été")).toBe(3);
    expect(countCharacters("🏠")).toBe(1);
    // Man, woman, girl joined by two zero-width joiners.
    expect(countCharacters("👨‍👩‍👧")).toBe(5);
    // Flag: two regional indicators.
    expect(countCharacters("🇫🇷")).toBe(2);
  });

  it("bounds the description in code points", () => {
    expect(DescriptionTextSchema.safeParse("🏠".repeat(DESCRIPTION_MAX_LENGTH)).success).toBe(true);
    const tooLong = DescriptionTextSchema.safeParse("🏠".repeat(DESCRIPTION_MAX_LENGTH + 1));
    expect(tooLong.error?.issues[0]?.message).toBe(
      "La description est limitée à 2 000 caractères. Raccourcissez-la.",
    );
    expect(DescriptionTextSchema.safeParse(null).success).toBe(true);
    expect(DescriptionTextSchema.safeParse("a\u0000b").success).toBe(false);
  });

  it.each(["\uD83C", "\uDFE0", "Maison \uD83C fin", "\uDFE0\uD83C"])(
    "refuses a lone surrogate (%j) in the name and the description",
    (fragment) => {
      expect(ProjectNameSchema.safeParse(`Nom ${fragment}`).error?.issues[0]?.message).toBe(
        "Le nom contient un caractère incomplet, souvent un émoji coupé lors d'un copier-coller. Supprimez-le ou saisissez-le de nouveau.",
      );
      expect(DescriptionTextSchema.safeParse(fragment).error?.issues[0]?.message).toBe(
        "La description contient un caractère incomplet, souvent un émoji coupé lors d'un copier-coller. Supprimez-le ou saisissez-le de nouveau.",
      );
    },
  );

  it("accepts complete surrogate pairs", () => {
    expect(ProjectNameSchema.safeParse("Maison 🏠").success).toBe(true);
    expect(DescriptionTextSchema.safeParse("🏠\uD83C\uDFE0").success).toBe(true);
  });

  it("trims and bounds the project name in code points", () => {
    expect(ProjectNameSchema.parse("  Maison  ")).toBe("Maison");
    expect(ProjectNameSchema.safeParse("🏠".repeat(PROJECT_NAME_MAX_LENGTH)).success).toBe(true);
    expect(
      ProjectNameSchema.safeParse("🏠".repeat(PROJECT_NAME_MAX_LENGTH + 1)).error?.issues[0]
        ?.message,
    ).toBe("Le nom est limité à 120 caractères. Raccourcissez-le.");
    expect(ProjectNameSchema.safeParse("   ").error?.issues[0]?.message).toBe("Le nom est requis.");
    expect(ProjectNameSchema.safeParse("a\tb").success).toBe(false);
  });
});

describe("project input fixtures", () => {
  const dir = resolve(import.meta.dirname, "../fixtures/project-input");
  const schemas: Record<string, z.ZodType> = {
    parameters: ProjectParametersSchema,
    site: ProjectSiteSchema,
  };
  const cases = (["valid", "invalid"] as const).flatMap((expectation) =>
    readdirSync(resolve(dir, expectation))
      .filter((file) => file.endsWith(".json"))
      .map((file) => [expectation, file] as const),
  );

  it.each(cases)("%s/%s", (expectation, file) => {
    const schema = schemas[file.split("-")[0] ?? ""];
    expect(schema).toBeDefined();
    const value: unknown = JSON.parse(readFileSync(resolve(dir, expectation, file), "utf8"));
    expect(schema?.safeParse(value).success).toBe(expectation === "valid");
  });
});
