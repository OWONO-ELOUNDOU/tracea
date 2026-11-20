/**
 * Project inputs: the free description, the structured parameters (EF-201) and the site (EF-202)
 * entered by the user. They feed the Tracea engine and are distinct from `BuildingModel`, which they
 * never modify. Lengths are integer mm, areas integer mm², angles decimal degrees.
 * Validation messages are in French and expressed in display units (m, m²), never in mm.
 */
import { z } from "zod";
import { area, isSimplePolygon, type Point, type Polygon } from "./geometry.js";

// ---------------------------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------------------------

export const PROJECT_NAME_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;

/** Bounds of the project inputs (D22). Lengths in mm, areas in mm², angles in degrees. */
export const PROJECT_INPUT_LIMITS = {
  levelsCount: { min: 1, max: 3 },
  targetHabitableArea: { min: 20_000_000, max: 500_000_000 },
  roomsLength: { max: 10 },
  roomCount: { min: 1, max: 10 },
  roomMinArea: { min: 1_000_000, max: 200_000_000 },
  garageSpaces: { min: 1, max: 3 },
  garageMinArea: { min: 10_000_000, max: 100_000_000 },
  siteRectangleSide: { min: 5_000, max: 500_000 },
  sitePolygonPoints: { min: 3, max: 64 },
  sitePolygonCoordinate: { min: 0, max: 1_000_000 },
  sitePolygonArea: { min: 25_000_000 },
  /** Exclusive upper bound. */
  angle: { min: 0, maxExclusive: 360 },
  setback: { min: 0, max: 50_000 },
  slopePercent: { min: 0, max: 30 },
} as const;

const L = PROJECT_INPUT_LIMITS;

// ---------------------------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------------------------

/**
 * Number of Unicode code points (A9). A composed emoji counts for each of its code points:
 * "👨‍👩‍👧" (three emoji joined by two ZWJ) counts 5; a lone surrogate counts 1.
 */
export function countCharacters(text: string): number {
  let count = 0;
  for (const _character of text) count += 1;
  return count;
}

// A lone half of a UTF-16 surrogate pair is not a character: PostgreSQL would store it as U+FFFD.
const LONE_SURROGATE = /\p{Cs}/u;

export const ProjectNameSchema = z
  .string("Le nom est requis.")
  .trim()
  .min(1, "Le nom est requis.")
  .refine(
    (value) => countCharacters(value) <= PROJECT_NAME_MAX_LENGTH,
    `Le nom est limité à ${PROJECT_NAME_MAX_LENGTH} caractères. Raccourcissez-le.`,
  )
  .refine((value) => !/\p{Cc}/u.test(value), "Le nom contient des caractères non autorisés.")
  .refine(
    (value) => !LONE_SURROGATE.test(value),
    "Le nom contient un caractère incomplet, souvent un émoji coupé lors d'un copier-coller. Supprimez-le ou saisissez-le de nouveau.",
  );

export const DescriptionTextSchema = z
  .string("La description doit être un texte.")
  .refine(
    (value) => countCharacters(value) <= DESCRIPTION_MAX_LENGTH,
    "La description est limitée à 2 000 caractères. Raccourcissez-la.",
  )
  // PostgreSQL text columns cannot store the NUL character.
  .refine(
    (value) => !value.includes("\u0000"),
    "La description contient un caractère non autorisé.",
  )
  .refine(
    (value) => !LONE_SURROGATE.test(value),
    "La description contient un caractère incomplet, souvent un émoji coupé lors d'un copier-coller. Supprimez-le ou saisissez-le de nouveau.",
  )
  .nullable();

// ---------------------------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------------------------

const UNKNOWN_KEY = "Champ non autorisé.";

/** Strict object whose own errors (wrong type, unknown key) carry French messages. */
function strictObject<Shape extends z.core.$ZodLooseShape>(shape: Shape, typeMessage: string) {
  return z.strictObject(shape, {
    error: (issue) => (issue.code === "unrecognized_keys" ? UNKNOWN_KEY : typeMessage),
  });
}

interface NumberMessages {
  /** Out of bounds, wrong type or `null`. */
  range: string;
  /** Finite number that is not an integer. Defaults to `range`. */
  integer?: string;
  /** Required key missing. Defaults to `range`. */
  required?: string;
}

function pickTypeMessage(input: unknown, messages: NumberMessages): string {
  if (input === undefined) return messages.required ?? messages.range;
  if (typeof input === "number" && Number.isFinite(input) && !Number.isInteger(input)) {
    return messages.integer ?? messages.range;
  }
  return messages.range;
}

function boundedInt(min: number, max: number, messages: NumberMessages) {
  return z
    .int({ error: (issue) => pickTypeMessage(issue.input, messages) })
    .min(min, messages.range)
    .max(max, messages.range);
}

/** Decimal angle in [0, 360). */
function angle(message: string) {
  return z.number(message).min(L.angle.min, message).lt(L.angle.maxExclusive, message);
}

function choice<const Values extends readonly [string, ...string[]]>(
  values: Values,
  message: string,
  requiredMessage: string = message,
) {
  return z.enum(values, {
    error: (issue) => (issue.input === undefined ? requiredMessage : message),
  });
}

// ---------------------------------------------------------------------------------------------
// ProjectParameters (EF-201)
// ---------------------------------------------------------------------------------------------

export const PARAMETER_ROOM_TYPES = [
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
] as const;

export const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export const BUILDING_TYPES = ["house"] as const;
export const PARAMETER_ROOF_TYPES = ["flat", "gable", "hip"] as const;
export const ROOF_COVERINGS = ["tile", "slate", "metal", "membrane"] as const;
export const GARAGE_KINDS = ["none", "attached", "detached"] as const;

export const BuildingTypeSchema = choice(
  BUILDING_TYPES,
  "Choisissez un type de bâtiment de la liste.",
);

export const ParameterRoomTypeSchema = choice(
  PARAMETER_ROOM_TYPES,
  "Choisissez un type de pièce de la liste.",
  "Indiquez le type de pièce.",
);

export const OrientationSchema = choice(ORIENTATIONS, "Choisissez une orientation de la liste.");

export const ParameterRoomSchema = strictObject(
  {
    type: ParameterRoomTypeSchema,
    count: boundedInt(L.roomCount.min, L.roomCount.max, {
      range: "Le nombre de pièces doit être un nombre entier compris entre 1 et 10.",
      required: "Indiquez le nombre de pièces.",
    }),
    minArea: boundedInt(L.roomMinArea.min, L.roomMinArea.max, {
      range: "La surface minimale doit être comprise entre 1 et 200 m².",
      integer: "La surface minimale doit être arrondie au millimètre carré.",
    }).optional(),
  },
  "Cette ligne de pièce est invalide.",
);

function roomTypeOf(room: unknown): ParameterRoomType | undefined {
  if (typeof room !== "object" || room === null || !("type" in room)) return undefined;
  const parsed = ParameterRoomTypeSchema.safeParse(room.type);
  return parsed.success ? parsed.data : undefined;
}

const DUPLICATE_ROOM_TYPE =
  "Ce type de pièce figure déjà dans la liste\u00a0: modifiez plutôt le nombre de la ligne existante.";

export const ParameterRoomsSchema = z
  .array(ParameterRoomSchema, "La liste des pièces est invalide.")
  .max(
    L.roomsLength.max,
    "La liste des pièces est limitée à 10 lignes\u00a0: supprimez une ligne ou regroupez des pièces.",
  )
  .superRefine(
    (rooms, context) => {
      // Runs even when other lines are invalid (see `when`), so the value is not trusted: only
      // lines whose type is valid are compared.
      const seen = new Set<string>();
      (rooms as unknown[]).forEach((room, index) => {
        const type = roomTypeOf(room);
        if (type === undefined) return;
        if (seen.has(type)) {
          context.addIssue({
            code: "custom",
            message: DUPLICATE_ROOM_TYPE,
            path: [index, "type"],
          });
        }
        seen.add(type);
      });
    },
    // By default a refinement is skipped once a line has an issue, which would hide a duplicate
    // behind an unrelated missing type (A12). An array is all it needs.
    { when: (payload) => Array.isArray(payload.value) },
  );

const garageSpaces = boundedInt(L.garageSpaces.min, L.garageSpaces.max, {
  range: "Le nombre de places du garage doit être un nombre entier compris entre 1 et 3.",
  required: "Indiquez le nombre de places du garage.",
});

const garageMinArea = boundedInt(L.garageMinArea.min, L.garageMinArea.max, {
  range: "La surface du garage doit être comprise entre 10 et 100 m².",
  integer: "La surface du garage doit être arrondie au millimètre carré.",
});

const GARAGE_MESSAGE = "Le garage est invalide.";

/** `{ kind: "none" }` means "no garage", unlike an absent key which means "not specified". */
export const GarageParameterSchema = z.discriminatedUnion(
  "kind",
  [
    strictObject({ kind: z.literal("none") }, GARAGE_MESSAGE),
    strictObject(
      {
        kind: z.enum(["attached", "detached"]),
        spaces: garageSpaces,
        minArea: garageMinArea.optional(),
      },
      GARAGE_MESSAGE,
    ),
  ],
  { error: "Choisissez une option de garage de la liste." },
);

export const RoofParameterSchema = strictObject(
  {
    type: choice(
      PARAMETER_ROOF_TYPES,
      "Choisissez un type de toiture de la liste.",
      "Indiquez le type de toiture.",
    ),
    covering: choice(ROOF_COVERINGS, "Choisissez une couverture de la liste.").optional(),
  },
  "La toiture est invalide.",
);

/** Every key is optional: absent means "not specified" and the engine relies on the description. */
export const ProjectParametersSchema = strictObject(
  {
    buildingType: BuildingTypeSchema.optional(),
    levelsCount: boundedInt(L.levelsCount.min, L.levelsCount.max, {
      range: "Le nombre de niveaux doit être un nombre entier compris entre 1 et 3.",
    }).optional(),
    targetHabitableArea: boundedInt(L.targetHabitableArea.min, L.targetHabitableArea.max, {
      range: "La surface habitable doit être comprise entre 20 et 500 m².",
      integer: "La surface habitable doit être arrondie au millimètre carré.",
    }).optional(),
    rooms: ParameterRoomsSchema.optional(),
    garage: GarageParameterSchema.optional(),
    roof: RoofParameterSchema.optional(),
    livingOrientation: choice(
      ORIENTATIONS,
      "Choisissez une orientation du séjour de la liste.",
    ).optional(),
  },
  "Les paramètres du bâtiment sont invalides.",
);

// ---------------------------------------------------------------------------------------------
// ProjectSite (EF-202)
// ---------------------------------------------------------------------------------------------

const POLYGON_CROSSING = "Le contour du terrain ne doit pas se recouper.";
const POLYGON_TOO_SMALL = "La surface du terrain doit être d'au moins 25 m².";

const siteSide = (name: "largeur" | "profondeur") =>
  boundedInt(L.siteRectangleSide.min, L.siteRectangleSide.max, {
    range: `La ${name} du terrain doit être comprise entre 5 et 500 m.`,
    integer: `La ${name} du terrain doit être arrondie au millimètre.`,
    required: `Indiquez la ${name} du terrain.`,
  });

const polygonCoordinate = boundedInt(L.sitePolygonCoordinate.min, L.sitePolygonCoordinate.max, {
  range: "Les coordonnées du contour doivent être comprises entre 0 et 1 000 m.",
  integer: "Les coordonnées du contour doivent être arrondies au millimètre.",
});

function allCollinear(points: readonly Point[]): boolean {
  const [origin] = points;
  if (origin === undefined) return true;
  const other = points.find((p) => p[0] !== origin[0] || p[1] !== origin[1]);
  if (other === undefined) return true;
  const [dx, dy] = [other[0] - origin[0], other[1] - origin[1]];
  return points.every((p) => dx * (p[1] - origin[1]) - dy * (p[0] - origin[0]) === 0);
}

const POINT_MESSAGE = "Chaque point du contour doit avoir deux coordonnées.";
const POINTS_COUNT = "Le contour du terrain doit compter entre 3 et 64 points.";

export const SiteBoundarySchema = z.discriminatedUnion(
  "kind",
  [
    strictObject(
      { kind: z.literal("rectangle"), width: siteSide("largeur"), depth: siteSide("profondeur") },
      "Le contour du terrain est invalide.",
    ),
    strictObject(
      {
        kind: z.literal("polygon"),
        points: z
          .array(z.tuple([polygonCoordinate, polygonCoordinate], POINT_MESSAGE), POINTS_COUNT)
          .min(L.sitePolygonPoints.min, POINTS_COUNT)
          .max(L.sitePolygonPoints.max, POINTS_COUNT)
          .superRefine((points, context) => {
            const polygon = points as readonly Point[];
            // Closure is implicit and the winding is free. Points all on one line read as
            // "too small"; a crossing ring (whose shoelace area may cancel out) as "crossing".
            if (!isSimplePolygon(polygon) && !allCollinear(polygon)) {
              context.addIssue({ code: "custom", message: POLYGON_CROSSING });
            } else if (area(polygon) < L.sitePolygonArea.min) {
              context.addIssue({ code: "custom", message: POLYGON_TOO_SMALL });
            }
          }),
      },
      "Le contour du terrain est invalide.",
    ),
  ],
  {
    error: (issue) =>
      issue.input === undefined
        ? "Indiquez les dimensions du terrain."
        : "Choisissez une forme de terrain de la liste.",
  },
);

const setback = (label: string) =>
  boundedInt(L.setback.min, L.setback.max, {
    range: `${label} doit être compris entre 0 et 50 m.`,
    integer: `${label} doit être arrondi au millimètre.`,
  }).default(0);

export const SiteSetbacksSchema = strictObject(
  {
    front: setback("Le recul avant"),
    side: setback("Le recul latéral"),
    rear: setback("Le recul arrière"),
  },
  "Les reculs sont invalides.",
);

export const SiteSlopeSchema = strictObject(
  {
    direction: angle(
      "La direction de la pente doit être comprise entre 0 et 360° (360 exclu).",
    ).default(0),
    percent: z
      .number("La pente doit être comprise entre 0 et 30 %.")
      .min(L.slopePercent.min, "La pente doit être comprise entre 0 et 30 %.")
      .max(L.slopePercent.max, "La pente doit être comprise entre 0 et 30 %.")
      .default(0),
  },
  "La pente est invalide.",
);

const ACCESS_EDGE = "Choisissez le côté du terrain qui donne sur la voie d'accès.";

/**
 * Only `boundary` is required; the other keys take their default value, so the parsed (stored)
 * value is always complete. An empty buildable zone is accepted here (D28).
 */
export const ProjectSiteSchema = strictObject(
  {
    boundary: SiteBoundarySchema,
    northAngle: angle(
      "L'orientation du nord doit être comprise entre 0 et 360° (360 exclu).",
    ).default(0),
    accessEdgeIndex: boundedInt(0, L.sitePolygonPoints.max - 1, { range: ACCESS_EDGE }).default(0),
    // `prefault` parses `{}` so that each setback gets its own default.
    setbacks: SiteSetbacksSchema.prefault({}),
    slope: SiteSlopeSchema.prefault({}),
  },
  "Le terrain est invalide.",
).superRefine((site, context) => {
  if (site.accessEdgeIndex >= boundaryEdgeCount(site.boundary)) {
    context.addIssue({ code: "custom", message: ACCESS_EDGE, path: ["accessEdgeIndex"] });
  }
});

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export type ParameterRoomType = z.infer<typeof ParameterRoomTypeSchema>;
export type Orientation = z.infer<typeof OrientationSchema>;
export type BuildingType = z.infer<typeof BuildingTypeSchema>;
export type ParameterRoofType = (typeof PARAMETER_ROOF_TYPES)[number];
export type RoofCovering = (typeof ROOF_COVERINGS)[number];
export type GarageKind = (typeof GARAGE_KINDS)[number];
export type ParameterRoom = z.infer<typeof ParameterRoomSchema>;
export type GarageParameter = z.infer<typeof GarageParameterSchema>;
export type RoofParameter = z.infer<typeof RoofParameterSchema>;
/** Parsed and stored form. Identical to the input form: parameters have no default value. */
export type ProjectParameters = z.infer<typeof ProjectParametersSchema>;
export type ProjectParametersInput = z.input<typeof ProjectParametersSchema>;
export type SiteBoundary = z.infer<typeof SiteBoundarySchema>;
export type SiteSetbacks = z.infer<typeof SiteSetbacksSchema>;
export type SiteSlope = z.infer<typeof SiteSlopeSchema>;
/** Parsed and stored form: defaults applied, every key present. */
export type ProjectSite = z.infer<typeof ProjectSiteSchema>;
/** Accepted on write: only `boundary` is required. */
export type ProjectSiteInput = z.input<typeof ProjectSiteSchema>;

// ---------------------------------------------------------------------------------------------
// Site geometry (preview of the input, not a site plan: the site plan derives from BuildingModel)
// ---------------------------------------------------------------------------------------------

function boundaryEdgeCount(boundary: SiteBoundary): number {
  return boundary.kind === "rectangle" ? 4 : boundary.points.length;
}

/**
 * Site outline in the input frame. A rectangle gives (0,0), (width,0), (width,depth), (0,depth),
 * so edge `i` runs from vertex `i` to vertex `i + 1`: 0 along y = 0, 1 along x = width,
 * 2 along y = depth, 3 along x = 0. A polygon is returned as entered.
 */
export function siteBoundaryPolygon(site: Pick<ProjectSite, "boundary">): Polygon {
  const { boundary } = site;
  if (boundary.kind === "polygon") return boundary.points.map(([x, y]): Point => [x, y]);
  const { width, depth } = boundary;
  return [
    [0, 0],
    [width, 0],
    [width, depth],
    [0, depth],
  ];
}

/**
 * Buildable zone of a rectangular site, counter-clockwise from its lowest-left vertex: the front
 * setback applies to the access edge, the rear setback to the opposite edge and the side setback
 * to the two other edges. Returns `null` when the zone is empty (setbacks reaching the opposite
 * limit, D28), when the site is a polygon (deferred with the site import, D20) or when
 * `accessEdgeIndex` does not designate one of the four edges.
 */
export function buildableZone(
  site: Pick<ProjectSite, "boundary" | "accessEdgeIndex" | "setbacks">,
): Polygon | null {
  const { boundary, accessEdgeIndex, setbacks } = site;
  if (boundary.kind !== "rectangle") return null;
  if (!Number.isInteger(accessEdgeIndex) || accessEdgeIndex < 0 || accessEdgeIndex > 3) {
    return null;
  }
  const inset = [setbacks.side, setbacks.side, setbacks.side, setbacks.side];
  inset[accessEdgeIndex] = setbacks.front;
  inset[(accessEdgeIndex + 2) % 4] = setbacks.rear;
  const [bottom, right, top, left] = inset as [number, number, number, number];
  const x0 = left;
  const x1 = boundary.width - right;
  const y0 = bottom;
  const y1 = boundary.depth - top;
  if (x1 <= x0 || y1 <= y0) return null;
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}
