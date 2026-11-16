import { z } from "zod";

export const SCHEMA_VERSION = "1.0";

const mm = z.number().int();
const positiveMm = z.number().int().positive();
const nonNegativeMm = z.number().int().nonnegative();
const degrees = z.number().min(-360).max(360);
const id = z.string().min(1).max(64);

export const PointSchema = z.tuple([mm, mm]);
export const PolygonSchema = z.array(PointSchema).min(3);

export const ProjectInfoSchema = z.object({
  name: z.string().min(1).max(200),
  revision: z.string().min(1).max(10),
  author: z.string().max(200).optional(),
});

export const SiteSchema = z.object({
  boundary: PolygonSchema,
  northAngle: degrees,
  setbacks: z.object({ front: nonNegativeMm, side: nonNegativeMm, rear: nonNegativeMm }),
  accessEdgeIndex: z.number().int().nonnegative(),
  slope: z.object({ direction: degrees, percent: z.number().min(0).max(100) }),
  groundLevel: mm,
});

export const LevelSchema = z.object({
  id,
  name: z.string().min(1).max(100),
  index: z.number().int().nonnegative(),
  elevation: mm,
  height: positiveMm,
  slabThickness: positiveMm,
});

export const WallKindSchema = z.enum(["exterior", "loadBearing", "partition"]);

export const WallSchema = z.object({
  id,
  levelId: id,
  start: PointSchema,
  end: PointSchema,
  thickness: positiveMm,
  kind: WallKindSchema,
  height: positiveMm.optional(),
  locked: z.boolean().default(false),
});

export const OpeningTypeSchema = z.enum([
  "door",
  "window",
  "frenchWindow",
  "garageDoor",
  "opening",
]);

export const SwingSchema = z.object({
  side: z.enum(["left", "right"]),
  direction: z.enum(["in", "out"]),
});

export const OpeningSchema = z.object({
  id,
  wallId: id,
  type: OpeningTypeSchema,
  offset: nonNegativeMm,
  width: positiveMm,
  height: positiveMm,
  sillHeight: nonNegativeMm,
  swing: SwingSchema.nullable(),
  locked: z.boolean().default(false),
});

export const RoomTypeSchema = z.enum([
  "living",
  "kitchen",
  "bedroom",
  "bathroom",
  "wc",
  "hall",
  "corridor",
  "office",
  "laundry",
  "storage",
  "garage",
  "technical",
]);

export const RoomSchema = z.object({
  id,
  levelId: id,
  name: z.string().min(1).max(100),
  type: RoomTypeSchema,
  wallIds: z.array(id).min(3),
  polygon: PolygonSchema,
  area: nonNegativeMm,
  habitable: z.boolean(),
  locked: z.boolean().default(false),
});

export const StairSchema = z.object({
  id,
  fromLevelId: id,
  toLevelId: id,
  footprint: PolygonSchema,
  type: z.enum(["straight", "quarterTurn", "halfTurn", "spiral"]),
  upDirection: degrees,
  riserHeight: positiveMm,
  treadDepth: positiveMm,
});

export const RoofSchema = z.object({
  type: z.enum(["flat", "gable", "hip", "shed"]),
  pitch: z.number().min(0).max(89),
  overhang: nonNegativeMm,
  ridgeDirection: z.union([z.literal(0), z.literal(90)]).nullable(),
  material: z.string().min(1).max(50),
});

export const SlabSchema = z.object({
  id,
  levelId: id,
  polygon: PolygonSchema,
  thickness: positiveMm,
});

export const DimensionSchema = z.object({
  id,
  levelId: id,
  kind: z.enum(["exterior", "interior"]),
  points: z.array(PointSchema).min(2),
  offset: mm,
});

export const SectionLineSchema = z.object({
  id,
  name: z.string().min(1).max(10),
  start: PointSchema,
  end: PointSchema,
  lookDirection: degrees,
});

export const LabelSchema = z.object({
  id,
  levelId: id,
  position: PointSchema,
  text: z.string().min(1).max(200),
});

export const AnnotationsSchema = z.object({
  dimensions: z.array(DimensionSchema),
  sectionLines: z.array(SectionLineSchema),
  labels: z.array(LabelSchema),
});

export const CheckSeveritySchema = z.enum(["info", "warning", "error"]);

export const CheckSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  severity: CheckSeveritySchema,
  message: z.string().min(1),
  targetIds: z.array(id),
  levelId: id.optional(),
});

export const MetricsSchema = z.object({
  habitableArea: nonNegativeMm,
  floorArea: nonNegativeMm,
  footprintArea: nonNegativeMm,
  siteCoverageRatio: z.number().min(0).max(1),
});

export const GenerationInfoSchema = z.object({
  seed: z.number().int().nonnegative(),
  engineVersion: z.string().min(1),
  programHash: z.string().min(1),
});

export const BuildingModelSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id,
  project: ProjectInfoSchema,
  site: SiteSchema,
  levels: z.array(LevelSchema).min(1),
  walls: z.array(WallSchema),
  openings: z.array(OpeningSchema),
  rooms: z.array(RoomSchema),
  stairs: z.array(StairSchema),
  roof: RoofSchema,
  slabs: z.array(SlabSchema),
  annotations: AnnotationsSchema,
  checks: z.array(CheckSchema),
  metrics: MetricsSchema,
  generation: GenerationInfoSchema,
});

export type BuildingModel = z.infer<typeof BuildingModelSchema>;
export type BuildingModelInput = z.input<typeof BuildingModelSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type WallKind = z.infer<typeof WallKindSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type OpeningType = z.infer<typeof OpeningTypeSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type RoomType = z.infer<typeof RoomTypeSchema>;
export type Stair = z.infer<typeof StairSchema>;
export type Roof = z.infer<typeof RoofSchema>;
export type Slab = z.infer<typeof SlabSchema>;
export type Check = z.infer<typeof CheckSchema>;
export type CheckSeverity = z.infer<typeof CheckSeveritySchema>;
export type Metrics = z.infer<typeof MetricsSchema>;

export function parseBuildingModel(input: unknown): BuildingModel {
  return BuildingModelSchema.parse(input);
}

export function safeParseBuildingModel(input: unknown): z.ZodSafeParseResult<BuildingModel> {
  return BuildingModelSchema.safeParse(input);
}
