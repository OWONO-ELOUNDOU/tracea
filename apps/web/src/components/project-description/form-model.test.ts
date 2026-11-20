import {
  ProjectParametersSchema,
  ProjectSiteSchema,
  squareMetresToMm2,
  type ProjectParameters,
  type ProjectSite,
} from "@tracea/domain";
import { describe, expect, it } from "vitest";
import type { ProjectDetail } from "@/lib/api";
import {
  buildGroups,
  fieldKeyForPath,
  isBlankSite,
  placeErrors,
  sitePreviewState,
  valuesFromProject,
  type FormValues,
} from "./form-model";
import {
  INVALID_NUMBER_MESSAGE,
  formatDimension,
  formatMetres,
  formatSquareMetres,
  parseDecimalInput,
} from "./number-input";
import { formatSavedDate, savedDateRefreshMs } from "./saved-date";

const parameters: ProjectParameters = {
  buildingType: "house",
  levelsCount: 1,
  targetHabitableArea: 120_000_000,
  rooms: [
    { type: "livingKitchen", count: 1, minArea: 40_000_000 },
    { type: "bedroom", count: 3, minArea: 12_500_000 },
  ],
  garage: { kind: "attached", spaces: 2, minArea: 36_000_000 },
  roof: { type: "gable", covering: "tile" },
  livingOrientation: "S",
};

const site: ProjectSite = ProjectSiteSchema.parse({
  boundary: { kind: "rectangle", width: 20_000, depth: 30_000 },
  setbacks: { front: 5_000, side: 3_000, rear: 4_000 },
});

function detail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: "p1",
    name: "Maison Mbarga",
    descriptionText: "Maison familiale",
    parameters,
    site,
    createdAt: "2026-11-17T10:00:00.000Z",
    updatedAt: "2026-11-17T10:00:00.000Z",
    thumbnailUrl: null,
    currentVersion: null,
    lastJob: null,
    ...overrides,
  };
}

/** Message of the schema for a value, so that tests never copy the wording of `domain`. */
function parametersMessage(value: unknown): string {
  const result = ProjectParametersSchema.safeParse(value);
  const message = result.error?.issues[0]?.message;
  if (message === undefined) throw new Error("expected a refusal");
  return message;
}

describe("parseDecimalInput", () => {
  it("reads French and international decimals and thousands spaces", () => {
    expect(parseDecimalInput("12,5")).toEqual({ kind: "number", value: 12.5 });
    expect(parseDecimalInput(" 12.5 ")).toEqual({ kind: "number", value: 12.5 });
    expect(parseDecimalInput("1 000")).toEqual({ kind: "number", value: 1000 });
    expect(parseDecimalInput("1 000,25")).toEqual({ kind: "number", value: 1000.25 });
    expect(parseDecimalInput("-3")).toEqual({ kind: "number", value: -3 });
    expect(parseDecimalInput("−3")).toEqual({ kind: "number", value: -3 });
  });

  it("treats blank text as absent and anything else as unreadable", () => {
    expect(parseDecimalInput("  ")).toEqual({ kind: "empty" });
    for (const text of ["12,", ",5", "12,5,1", "1e3", "abc", "12 m", "+4"]) {
      expect(parseDecimalInput(text), text).toEqual({ kind: "invalid" });
    }
  });
});

describe("number display", () => {
  it("shows stored values in metres and square metres without useless zeros", () => {
    expect(formatSquareMetres(120_000_000)).toBe("120");
    expect(formatSquareMetres(35_500_000)).toBe("35,5");
    expect(formatSquareMetres(12_345_678)).toBe("12,345678");
    expect(formatMetres(12_345)).toBe("12,345");
    expect(formatDimension(30_000)).toBe("30,00");
  });
});

describe("valuesFromProject", () => {
  it("fills every field from the stored project", () => {
    const values = valuesFromProject(detail());
    expect(values).toMatchObject({
      name: "Maison Mbarga",
      description: "Maison familiale",
      buildingType: "house",
      levels: "1",
      targetArea: "120",
      roof: "gable",
      covering: "tile",
      garage: "attached:2",
      garageArea: "36",
      orientation: "S",
      width: "20",
      depth: "30",
      access: "0",
      north: "0",
      front: "5",
      side: "3",
      rear: "4",
      slope: "0",
      slopeDirection: "0",
      polygon: null,
    });
    expect(values.rooms.map(({ type, count, minArea }) => [type, count, minArea])).toEqual([
      ["livingKitchen", "1", "40"],
      ["bedroom", "3", "12,5"],
    ]);
  });

  it("leaves fields empty for absent groups", () => {
    const values = valuesFromProject(
      detail({ descriptionText: null, parameters: null, site: null }),
    );
    expect(values.description).toBe("");
    expect(values.levels).toBe("");
    expect(values.rooms).toEqual([]);
    expect(isBlankSite(values)).toBe(true);
  });
});

describe("buildGroups", () => {
  it("rebuilds the stored groups unchanged", () => {
    const groups = buildGroups(valuesFromProject(detail()));
    expect(groups.parameters).toMatchObject({ valid: true, value: parameters });
    expect(ProjectSiteSchema.parse(groups.site.value)).toEqual(site);
    expect(groups.descriptionText.value).toBe("Maison familiale");
  });

  it("sends an empty object for empty parameters and null for a blank site", () => {
    const groups = buildGroups(
      valuesFromProject(detail({ descriptionText: null, parameters: null, site: null })),
    );
    expect(groups.parameters.value).toEqual({});
    expect(groups.site.value).toBeNull();
    expect(groups.site.valid).toBe(true);
    expect(groups.descriptionText.value).toBe("");
  });

  it("gives the format message to an unreadable number and the schema message otherwise", () => {
    const values = valuesFromProject(detail());
    const unreadable = buildGroups({ ...values, targetArea: "12,5x" });
    expect(unreadable.parameters.valid).toBe(false);
    expect(unreadable.parameters.errors["parameters.targetHabitableArea"]).toBe(
      INVALID_NUMBER_MESSAGE,
    );

    const tooLarge = buildGroups({ ...values, targetArea: "600" });
    expect(tooLarge.parameters.errors["parameters.targetHabitableArea"]).toBe(
      parametersMessage({ targetHabitableArea: squareMetresToMm2(600) }),
    );
  });

  it("reports a duplicate room type on its second row and a row without type on its type cell", () => {
    const values = valuesFromProject(detail());
    const duplicate = [...values.rooms, { key: "x", type: "bedroom", count: "1", minArea: "" }];
    expect(Object.keys(buildGroups({ ...values, rooms: duplicate }).parameters.errors)).toEqual([
      "parameters.rooms.2.type",
    ]);
    const untyped = [...values.rooms, { key: "y", type: "", count: "1", minArea: "" }];
    expect(Object.keys(buildGroups({ ...values, rooms: untyped }).parameters.errors)).toEqual([
      "parameters.rooms.2.type",
    ]);
  });

  it("validates a site with a missing depth on the depth field", () => {
    const values: FormValues = { ...valuesFromProject(detail({ site: null })), width: "20" };
    const { errors, valid } = buildGroups(values).site;
    expect(valid).toBe(false);
    expect(Object.keys(errors)).toEqual(["site.boundary.depth"]);
  });

  it("changes the signature with the value, not with the spelling of the same number", () => {
    const values = valuesFromProject(detail());
    const base = buildGroups(values).parameters.signature;
    expect(buildGroups({ ...values, targetArea: "120,0" }).parameters.signature).toBe(base);
    expect(buildGroups({ ...values, targetArea: "121" }).parameters.signature).not.toBe(base);
  });
});

describe("error placement", () => {
  it("maps contract paths to the fields of the screen", () => {
    expect(fieldKeyForPath("parameters.rooms.1.minArea")).toBe("parameters.rooms.1.minArea");
    expect(fieldKeyForPath("parameters.rooms.1")).toBe("parameters.rooms.1.type");
    expect(fieldKeyForPath("parameters.rooms")).toBe("parameters.rooms");
    expect(fieldKeyForPath("parameters.garage.spaces")).toBe("parameters.garage");
    expect(fieldKeyForPath("parameters.roof.type")).toBe("parameters.roof");
    expect(fieldKeyForPath("parameters.unknown")).toBe("parameters");
    expect(fieldKeyForPath("site.boundary.width")).toBe("site.boundary.width");
    expect(fieldKeyForPath("site.boundary.points.3")).toBe("site.boundary");
    expect(fieldKeyForPath("site.setbacks")).toBe("site.setbacks");
    expect(fieldKeyForPath("site.accessEdgeIndex")).toBe("site.accessEdgeIndex");
    expect(fieldKeyForPath("site")).toBe("site");
    expect(fieldKeyForPath("name")).toBe("name");
  });

  it("shows errors of fields that are not displayed at the bottom of their card", () => {
    const values = { ...valuesFromProject(detail()), garage: "none", garageArea: "" };
    expect(
      placeErrors({ "parameters.garage.minArea": "a", "parameters.rooms.7.count": "b" }, values),
    ).toEqual({ parameters: "a" });
  });
});

describe("sitePreviewState", () => {
  it("parses the site with its defaults, or reports it blank or invalid", () => {
    const values = valuesFromProject(detail());
    const ready = sitePreviewState(values);
    expect(ready).toEqual({ kind: "ready", site });
    expect(sitePreviewState({ ...values, depth: "" })).toEqual({ kind: "invalid" });
    expect(sitePreviewState(valuesFromProject(detail({ site: null })))).toEqual({ kind: "blank" });
  });
});

describe("formatSavedDate", () => {
  const savedAt = Date.parse("2026-11-19T10:00:00.000Z");
  it("rounds seconds down to the ten and refreshes every 5 s, then every minute", () => {
    expect(formatSavedDate(savedAt, savedAt + 4_999)).toBe("à l'instant");
    expect(formatSavedDate(savedAt, savedAt - 1_000)).toBe("à l'instant");
    expect(formatSavedDate(savedAt, savedAt + 7_000)).toBe("il y a 5 s");
    expect(formatSavedDate(savedAt, savedAt + 12_000)).toBe("il y a 10 s");
    expect(formatSavedDate(savedAt, savedAt + 59_999)).toBe("il y a 50 s");
    expect(formatSavedDate(savedAt, savedAt + 120_000)).toBe("il y a 2 min");
    expect(savedDateRefreshMs(savedAt, savedAt + 10_000)).toBe(5_000);
    expect(savedDateRefreshMs(savedAt, savedAt + 60_000)).toBe(60_000);
  });
});
