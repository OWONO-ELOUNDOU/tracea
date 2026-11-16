import { area } from "./geometry.js";
import type { BuildingModel, Metrics } from "./schema.js";

export const METRICS_TOLERANCE_MM2 = 1;

/**
 * Metrics are derived from rooms, slabs and site; they are stored on the model for display and
 * recomputed here to verify the stored values.
 */
export function computeMetrics(model: BuildingModel): Metrics {
  const habitableArea = model.rooms
    .filter((room) => room.habitable)
    .reduce((sum, room) => sum + room.area, 0);
  const floorArea = model.rooms.reduce((sum, room) => sum + room.area, 0);

  const groundLevelIds = new Set(
    model.levels.filter((level) => level.index === 0).map((level) => level.id),
  );
  const footprintArea = Math.round(
    model.slabs
      .filter((slab) => groundLevelIds.has(slab.levelId))
      .reduce((sum, slab) => sum + area(slab.polygon), 0),
  );

  const siteArea = area(model.site.boundary);
  const siteCoverageRatio = siteArea > 0 ? footprintArea / siteArea : 0;

  return { habitableArea, floorArea, footprintArea, siteCoverageRatio };
}

export function metricsMatch(stored: Metrics, computed: Metrics): boolean {
  return (
    Math.abs(stored.habitableArea - computed.habitableArea) <= METRICS_TOLERANCE_MM2 &&
    Math.abs(stored.floorArea - computed.floorArea) <= METRICS_TOLERANCE_MM2 &&
    Math.abs(stored.footprintArea - computed.footprintArea) <= METRICS_TOLERANCE_MM2 &&
    Math.abs(stored.siteCoverageRatio - computed.siteCoverageRatio) <= 1e-6
  );
}
