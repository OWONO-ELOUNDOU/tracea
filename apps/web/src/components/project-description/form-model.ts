import {
  DescriptionTextSchema,
  ProjectNameSchema,
  ProjectParametersSchema,
  ProjectSiteSchema,
  metresToMm,
  squareMetresToMm2,
  type ProjectSite,
  type SiteBoundary,
} from "@tracea/domain";
import type { ProjectDetail, ProjectPatch } from "@/lib/api";
import {
  INVALID_NUMBER_MESSAGE,
  formatMetres,
  formatPlain,
  formatSquareMetres,
  parseDecimalInput,
} from "./number-input";
import { garageValue } from "./options";

/**
 * Text values of the screen's fields, and their translation into the four groups of the contract
 * (spec § 5.2). Validation and its messages come from the schemas of `@tracea/domain` (D17).
 */
export const GROUPS = ["name", "descriptionText", "parameters", "site"] as const;
export type Group = (typeof GROUPS)[number];

export interface RoomRow {
  /** Local identity of the row, stable across insertions and deletions. */
  key: string;
  type: string;
  count: string;
  minArea: string;
}

type PolygonBoundary = Extract<SiteBoundary, { kind: "polygon" }>;

export interface FormValues {
  name: string;
  description: string;
  buildingType: string;
  levels: string;
  targetArea: string;
  roof: string;
  covering: string;
  /** `""`, `none` or `{kind}:{spaces}` (see `garageValue`). */
  garage: string;
  garageArea: string;
  orientation: string;
  rooms: RoomRow[];
  width: string;
  depth: string;
  /** Stored polygonal outline (D20): kept as received, never edited on this screen. */
  polygon: PolygonBoundary | null;
  access: string;
  north: string;
  front: string;
  side: string;
  rear: string;
  slope: string;
  slopeDirection: string;
}

let rowSequence = 0;

export function newRoomRow(values: Partial<Omit<RoomRow, "key">> = {}): RoomRow {
  rowSequence += 1;
  return { key: `ligne-${rowSequence}`, type: "", count: "", minArea: "", ...values };
}

const text = (value: number | undefined, format: (value: number) => string) =>
  value === undefined ? "" : format(value);

/** Fields filled from the stored project (spec § 5.2): absent or `null` gives an empty field. */
export function valuesFromProject(project: ProjectDetail): FormValues {
  const parameters = project.parameters ?? {};
  const site = project.site;
  const garage = parameters.garage;
  const boundary = site?.boundary;
  return {
    name: project.name,
    description: project.descriptionText ?? "",
    buildingType: parameters.buildingType ?? "",
    levels: parameters.levelsCount === undefined ? "" : String(parameters.levelsCount),
    targetArea: text(parameters.targetHabitableArea, formatSquareMetres),
    roof: parameters.roof?.type ?? "",
    covering: parameters.roof?.covering ?? "",
    garage:
      garage === undefined
        ? ""
        : garage.kind === "none"
          ? "none"
          : garageValue(garage.kind, garage.spaces),
    garageArea:
      garage !== undefined && garage.kind !== "none"
        ? text(garage.minArea, formatSquareMetres)
        : "",
    orientation: parameters.livingOrientation ?? "",
    rooms: (parameters.rooms ?? []).map((room) =>
      newRoomRow({
        type: room.type,
        count: String(room.count),
        minArea: text(room.minArea, formatSquareMetres),
      }),
    ),
    width: boundary?.kind === "rectangle" ? formatMetres(boundary.width) : "",
    depth: boundary?.kind === "rectangle" ? formatMetres(boundary.depth) : "",
    polygon: boundary?.kind === "polygon" ? boundary : null,
    access: String(site?.accessEdgeIndex ?? 0),
    north: text(site?.northAngle, formatPlain),
    front: text(site?.setbacks.front, formatMetres),
    side: text(site?.setbacks.side, formatMetres),
    rear: text(site?.setbacks.rear, formatMetres),
    slope: text(site?.slope.percent, formatPlain),
    slopeDirection: text(site?.slope.direction, formatPlain),
  };
}

// ---------------------------------------------------------------------------------------------
// Building the groups
// ---------------------------------------------------------------------------------------------

/** Field keys follow the API paths of `fields`, e.g. `parameters.rooms.1.minArea`. */
type InputErrors = Record<string, string>;

class Reader {
  readonly errors: InputErrors = {};

  /** Reads a number field; an unreadable text records the format message under `key`. */
  number(key: string, raw: string, convert: (value: number) => number = (value) => value) {
    const input = parseDecimalInput(raw);
    if (input.kind === "invalid") this.errors[key] = INVALID_NUMBER_MESSAGE;
    return input.kind === "number" ? convert(input.value) : undefined;
  }
}

function assign(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined) target[key] = value;
}

function buildParameters(values: FormValues, reader: Reader): Record<string, unknown> {
  const parameters: Record<string, unknown> = {};
  assign(parameters, "buildingType", values.buildingType || undefined);
  assign(parameters, "levelsCount", values.levels === "" ? undefined : Number(values.levels));
  assign(
    parameters,
    "targetHabitableArea",
    reader.number("parameters.targetHabitableArea", values.targetArea, squareMetresToMm2),
  );
  if (values.rooms.length > 0) {
    parameters.rooms = values.rooms.map((row, index) => {
      const room: Record<string, unknown> = {};
      assign(room, "type", row.type || undefined);
      assign(room, "count", reader.number(`parameters.rooms.${index}.count`, row.count));
      assign(
        room,
        "minArea",
        reader.number(`parameters.rooms.${index}.minArea`, row.minArea, squareMetresToMm2),
      );
      return room;
    });
  }
  if (values.garage === "none") {
    parameters.garage = { kind: "none" };
  } else if (values.garage !== "") {
    const [kind, spaces] = values.garage.split(":");
    const garage: Record<string, unknown> = { kind, spaces: Number(spaces) };
    assign(
      garage,
      "minArea",
      reader.number("parameters.garage.minArea", values.garageArea, squareMetresToMm2),
    );
    parameters.garage = garage;
  }
  if (values.roof !== "") {
    const roof: Record<string, unknown> = { type: values.roof };
    assign(roof, "covering", values.covering || undefined);
    parameters.roof = roof;
  }
  assign(parameters, "livingOrientation", values.orientation || undefined);
  return parameters;
}

const SITE_TEXT_FIELDS = [
  "width",
  "depth",
  "north",
  "front",
  "side",
  "rear",
  "slope",
  "slopeDirection",
] as const;

/** A blank site (no text, default access) is sent as `null` (spec § 5.2). */
export function isBlankSite(values: FormValues): boolean {
  return (
    values.polygon === null &&
    values.access === "0" &&
    SITE_TEXT_FIELDS.every((field) => values[field].trim() === "")
  );
}

function buildSite(values: FormValues, reader: Reader): Record<string, unknown> | null {
  if (isBlankSite(values)) return null;
  const boundary: Record<string, unknown> = values.polygon ?? { kind: "rectangle" };
  if (values.polygon === null) {
    assign(boundary, "width", reader.number("site.boundary.width", values.width, metresToMm));
    assign(boundary, "depth", reader.number("site.boundary.depth", values.depth, metresToMm));
  }
  const setbacks: Record<string, unknown> = {};
  assign(setbacks, "front", reader.number("site.setbacks.front", values.front, metresToMm));
  assign(setbacks, "side", reader.number("site.setbacks.side", values.side, metresToMm));
  assign(setbacks, "rear", reader.number("site.setbacks.rear", values.rear, metresToMm));
  const slope: Record<string, unknown> = {};
  assign(slope, "direction", reader.number("site.slope.direction", values.slopeDirection));
  assign(slope, "percent", reader.number("site.slope.percent", values.slope));
  const site: Record<string, unknown> = {
    boundary,
    accessEdgeIndex: Number(values.access),
    setbacks,
    slope,
  };
  assign(site, "northAngle", reader.number("site.northAngle", values.north));
  return site;
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

export interface GroupState {
  /** Value sent in the `PATCH` when the group is modified and valid. */
  value: unknown;
  /** Compares the group with its last saved value (spec § 8.1). */
  signature: string;
  /** Error message by field key, empty when the group is valid. */
  errors: Record<string, string>;
  valid: boolean;
}

export type GroupStates = Record<Group, GroupState>;

const PARAMETER_KEYS = new Set([
  "buildingType",
  "levelsCount",
  "targetHabitableArea",
  "livingOrientation",
]);

/**
 * Field that shows the error of a contract path (spec § 9.1). Paths without a field of their own
 * fall back to a group-level key (`parameters`, `site`, `site.boundary`, `site.setbacks`,
 * `parameters.rooms`, `parameters.garage`, `parameters.roof`).
 */
export function fieldKeyForPath(path: string): string {
  const [group = "", key, sub, leaf] = path.split(".");
  if (group === "parameters") {
    if (key === "rooms") {
      if (sub === undefined || !/^\d+$/u.test(sub)) return "parameters.rooms";
      const cell = leaf === "count" || leaf === "minArea" ? leaf : "type";
      return `parameters.rooms.${sub}.${cell}`;
    }
    if (key === "garage")
      return sub === "minArea" ? "parameters.garage.minArea" : "parameters.garage";
    if (key === "roof") return sub === "covering" ? "parameters.roof.covering" : "parameters.roof";
    if (key !== undefined && PARAMETER_KEYS.has(key) && sub === undefined)
      return `parameters.${key}`;
    return "parameters";
  }
  if (group === "site") {
    if (key === "boundary") {
      return sub === "width" || sub === "depth" ? `site.boundary.${sub}` : "site.boundary";
    }
    if (key === "setbacks") {
      return sub === "front" || sub === "side" || sub === "rear"
        ? `site.setbacks.${sub}`
        : "site.setbacks";
    }
    if (key === "slope" && (sub === "percent" || sub === "direction")) return `site.slope.${sub}`;
    if ((key === "northAngle" || key === "accessEdgeIndex") && sub === undefined) {
      return `site.${key}`;
    }
    return "site";
  }
  return group;
}

export function groupOfKey(key: string): Group {
  const [group] = key.split(".");
  return (GROUPS as readonly string[]).includes(group ?? "") ? (group as Group) : "parameters";
}

interface SafeParse {
  success: boolean;
  error?: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
}

function groupState(
  group: Group,
  value: unknown,
  result: SafeParse,
  inputErrors: InputErrors,
): GroupState {
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const key = fieldKeyForPath([group, ...issue.path.map(String)].join("."));
    errors[key] ??= issue.message;
  }
  // An unreadable number precedes any schema message for its field (spec § 9.3).
  Object.assign(errors, inputErrors);
  return {
    value,
    // Unreadable texts take part in the signature: typing in them is a modification.
    signature: JSON.stringify([value, inputErrors]),
    errors,
    valid: Object.keys(errors).length === 0,
  };
}

export function buildGroups(values: FormValues): GroupStates {
  const reader = new Reader();
  const parameters = buildParameters(values, reader);
  const site = buildSite(values, reader);
  const errorsOf = (prefix: string) =>
    Object.fromEntries(
      Object.entries(reader.errors).filter(([key]) => key.startsWith(`${prefix}.`)),
    );
  return {
    name: groupState("name", values.name, ProjectNameSchema.safeParse(values.name), {}),
    descriptionText: groupState(
      "descriptionText",
      values.description,
      DescriptionTextSchema.safeParse(values.description),
      {},
    ),
    parameters: groupState(
      "parameters",
      parameters,
      ProjectParametersSchema.safeParse(parameters),
      errorsOf("parameters"),
    ),
    site: groupState(
      "site",
      site,
      site === null ? { success: true } : ProjectSiteSchema.safeParse(site),
      errorsOf("site"),
    ),
  };
}

/** Value analysed by the schema for the preview (spec § 6.5): defaults applied. */
export type SitePreviewState =
  { kind: "blank" } | { kind: "invalid" } | { kind: "ready"; site: ProjectSite };

export function sitePreviewState(values: FormValues): SitePreviewState {
  const reader = new Reader();
  const site = buildSite(values, reader);
  if (site === null) return { kind: "blank" };
  const result = ProjectSiteSchema.safeParse(site);
  if (!result.success || Object.keys(reader.errors).length > 0) return { kind: "invalid" };
  return { kind: "ready", site: result.data };
}

export function patchOf(groups: GroupStates, sent: readonly Group[]): ProjectPatch {
  // Values were checked by the schemas of `@tracea/domain` before reaching this point.
  const patch: Record<string, unknown> = {};
  for (const group of sent) patch[group] = groups[group].value;
  return patch;
}

/** Single-value fields of the form (rooms and the stored polygon are handled apart). */
export type ScalarField = Exclude<keyof FormValues, "rooms" | "polygon">;

export const FIELD_KEYS: Record<ScalarField, string> = {
  name: "name",
  description: "descriptionText",
  buildingType: "parameters.buildingType",
  levels: "parameters.levelsCount",
  targetArea: "parameters.targetHabitableArea",
  roof: "parameters.roof",
  covering: "parameters.roof.covering",
  garage: "parameters.garage",
  garageArea: "parameters.garage.minArea",
  orientation: "parameters.livingOrientation",
  width: "site.boundary.width",
  depth: "site.boundary.depth",
  access: "site.accessEdgeIndex",
  north: "site.northAngle",
  front: "site.setbacks.front",
  side: "site.setbacks.side",
  rear: "site.setbacks.rear",
  slope: "site.slope.percent",
  slopeDirection: "site.slope.direction",
};

export type RoomCell = "type" | "count" | "minArea";

export const roomKey = (index: number, cell: RoomCell) => `parameters.rooms.${index}.${cell}`;

/** Keys without a field of their own, revealed whenever a field of their group is left. */
export const GROUP_LEVEL_KEYS: Record<Group, string[]> = {
  name: ["name"],
  descriptionText: ["descriptionText"],
  parameters: ["parameters", "parameters.rooms"],
  site: ["site", "site.boundary", "site.setbacks"],
};

/**
 * Keys that have a place on the screen for the current values; an error on any other key is shown
 * as an error of its group, at the bottom of its card (spec § 8.4).
 */
export function placedKeys(values: FormValues): Set<string> {
  const keys = new Set<string>(Object.values(FIELD_KEYS));
  keys.add("parameters.rooms");
  keys.add("site.boundary");
  keys.add("site.setbacks");
  if (values.roof === "") keys.delete(FIELD_KEYS.covering);
  if (values.garage === "" || values.garage === "none") keys.delete(FIELD_KEYS.garageArea);
  if (values.polygon !== null) {
    keys.delete(FIELD_KEYS.width);
    keys.delete(FIELD_KEYS.depth);
  }
  values.rooms.forEach((_, index) => {
    for (const cell of ["type", "count", "minArea"] as const) keys.add(roomKey(index, cell));
  });
  return keys;
}

/** Moves errors without a place to their group key; the first message of a key wins. */
export function placeErrors(
  errors: Record<string, string>,
  values: FormValues,
): Record<string, string> {
  const placed = placedKeys(values);
  const result: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    const target = placed.has(key) ? key : groupOfKey(key);
    result[target] ??= message;
  }
  return result;
}
