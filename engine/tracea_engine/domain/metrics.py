from __future__ import annotations

from tracea_engine.domain.model import BuildingModel, Metrics
from tracea_engine.geometry.polygon import area

METRICS_TOLERANCE_MM2 = 1


def compute_metrics(model: BuildingModel) -> Metrics:
    habitable_area = sum(room.area for room in model.rooms if room.habitable)
    floor_area = sum(room.area for room in model.rooms)
    ground_level_ids = {level.id for level in model.levels if level.index == 0}
    footprint_area = round(
        sum(area(slab.polygon) for slab in model.slabs if slab.levelId in ground_level_ids)
    )
    site_area = area(model.site.boundary)
    ratio = footprint_area / site_area if site_area > 0 else 0.0
    return Metrics(
        habitableArea=habitable_area,
        floorArea=floor_area,
        footprintArea=footprint_area,
        siteCoverageRatio=ratio,
    )


def metrics_match(stored: Metrics, computed: Metrics) -> bool:
    return (
        abs(stored.habitableArea - computed.habitableArea) <= METRICS_TOLERANCE_MM2
        and abs(stored.floorArea - computed.floorArea) <= METRICS_TOLERANCE_MM2
        and abs(stored.footprintArea - computed.footprintArea) <= METRICS_TOLERANCE_MM2
        and abs(stored.siteCoverageRatio - computed.siteCoverageRatio) <= 1e-6
    )
