import {
  BUILDING_TYPES,
  GARAGE_KINDS,
  ORIENTATIONS,
  PARAMETER_ROOF_TYPES,
  PARAMETER_ROOM_TYPES,
  PROJECT_INPUT_LIMITS,
  ROOF_COVERINGS,
  type BuildingType,
  type Orientation,
  type ParameterRoofType,
  type ParameterRoomType,
  type RoofCovering,
} from "@tracea/domain";

/**
 * French labels of the contract values (spec § 6). The lists of values and their order come from
 * `@tracea/domain`; only the wording is defined here.
 */
export interface Option {
  value: string;
  label: string;
}

const BUILDING_TYPE_LABELS: Record<BuildingType, string> = { house: "Maison individuelle" };

const ROOF_LABELS: Record<ParameterRoofType, string> = {
  flat: "Toit plat",
  gable: "2 pans",
  hip: "4 pans",
};

const COVERING_LABELS: Record<RoofCovering, string> = {
  tile: "Tuiles",
  slate: "Ardoises",
  metal: "Couverture métallique",
  membrane: "Membrane d'étanchéité",
};

const ORIENTATION_LABELS: Record<Orientation, string> = {
  N: "Nord",
  NE: "Nord-est",
  E: "Est",
  SE: "Sud-est",
  S: "Sud",
  SW: "Sud-ouest",
  W: "Ouest",
  NW: "Nord-ouest",
};

export const ROOM_TYPE_LABELS: Record<ParameterRoomType, string> = {
  livingKitchen: "Séjour-cuisine",
  living: "Séjour",
  kitchen: "Cuisine",
  bedroom: "Chambre",
  bathroom: "Salle de bain ou salle d'eau",
  wc: "WC",
  office: "Bureau",
  laundry: "Buanderie",
  storage: "Cellier ou rangement",
  technical: "Local technique",
};

const GARAGE_KIND_LABELS = { attached: "Accolé", detached: "Indépendant" } as const;

export const buildingTypeOptions: Option[] = BUILDING_TYPES.map((value) => ({
  value,
  label: BUILDING_TYPE_LABELS[value],
}));

export const roofOptions: Option[] = PARAMETER_ROOF_TYPES.map((value) => ({
  value,
  label: ROOF_LABELS[value],
}));

export const coveringOptions: Option[] = ROOF_COVERINGS.map((value) => ({
  value,
  label: COVERING_LABELS[value],
}));

export const orientationOptions: Option[] = ORIENTATIONS.map((value) => ({
  value,
  label: ORIENTATION_LABELS[value],
}));

export const roomTypeOptions: Option[] = PARAMETER_ROOM_TYPES.map((value) => ({
  value,
  label: ROOM_TYPE_LABELS[value],
}));

export function roomTypeLabel(value: string): string | undefined {
  return (ROOM_TYPE_LABELS as Record<string, string | undefined>)[value];
}

function range({ min, max }: { min: number; max: number }): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

/** Garage values are `none` or `{kind}:{spaces}`, e.g. `attached:2`. */
export function garageValue(kind: string, spaces?: number): string {
  return spaces === undefined ? kind : `${kind}:${spaces}`;
}

export const garageOptions: Option[] = GARAGE_KINDS.flatMap((kind): Option[] =>
  kind === "none"
    ? [{ value: "none", label: "Pas de garage" }]
    : range(PROJECT_INPUT_LIMITS.garageSpaces).map((spaces) => ({
        value: garageValue(kind, spaces),
        label: `${GARAGE_KIND_LABELS[kind]}, ${spaces} ${spaces === 1 ? "place" : "places"}`,
      })),
);

/** « Plain-pied », « R+1 », « R+2 » for 1, 2 and 3 levels. */
export const levelOptions: Option[] = range(PROJECT_INPUT_LIMITS.levelsCount).map((levels) => ({
  value: String(levels),
  label: levels === 1 ? "Plain-pied" : `R+${levels - 1}`,
}));

/** Rectangle edges as seen on the preview: edge 0 runs along y = 0, at the bottom. */
export const RECTANGLE_ACCESS_LABELS = [
  "En bas de l'aperçu",
  "À droite de l'aperçu",
  "En haut de l'aperçu",
  "À gauche de l'aperçu",
] as const;

export const RECTANGLE_ACCESS_SIDES = ["en bas", "à droite", "en haut", "à gauche"] as const;
