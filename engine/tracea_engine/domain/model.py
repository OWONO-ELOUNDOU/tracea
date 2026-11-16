"""Pydantic mirror of BuildingModel 1.0 (see packages/domain/schema).

Lengths are integer millimetres, angles decimal degrees, areas square millimetres.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_VERSION = "1.0"

Mm = int
PositiveMm = Annotated[int, Field(gt=0)]
NonNegativeMm = Annotated[int, Field(ge=0)]
Degrees = Annotated[float, Field(ge=-360, le=360)]
Id = Annotated[str, Field(min_length=1, max_length=64)]
Point = tuple[Mm, Mm]
Polygon = Annotated[list[Point], Field(min_length=3)]

WallKind = Literal["exterior", "loadBearing", "partition"]
OpeningType = Literal["door", "window", "frenchWindow", "garageDoor", "opening"]
RoomType = Literal[
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
]
CheckSeverity = Literal["info", "warning", "error"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class ProjectInfo(StrictModel):
    name: Annotated[str, Field(min_length=1, max_length=200)]
    revision: Annotated[str, Field(min_length=1, max_length=10)]
    author: Annotated[str, Field(max_length=200)] | None = None


class Setbacks(StrictModel):
    front: NonNegativeMm
    side: NonNegativeMm
    rear: NonNegativeMm


class Slope(StrictModel):
    direction: Degrees
    percent: Annotated[float, Field(ge=0, le=100)]


class Site(StrictModel):
    boundary: Polygon
    northAngle: Degrees
    setbacks: Setbacks
    accessEdgeIndex: Annotated[int, Field(ge=0)]
    slope: Slope
    groundLevel: Mm


class Level(StrictModel):
    id: Id
    name: Annotated[str, Field(min_length=1, max_length=100)]
    index: Annotated[int, Field(ge=0)]
    elevation: Mm
    height: PositiveMm
    slabThickness: PositiveMm


class Wall(StrictModel):
    id: Id
    levelId: Id
    start: Point
    end: Point
    thickness: PositiveMm
    kind: WallKind
    height: PositiveMm | None = None
    locked: bool = False


class Swing(StrictModel):
    side: Literal["left", "right"]
    direction: Literal["in", "out"]


class Opening(StrictModel):
    id: Id
    wallId: Id
    type: OpeningType
    offset: NonNegativeMm
    width: PositiveMm
    height: PositiveMm
    sillHeight: NonNegativeMm
    swing: Swing | None
    locked: bool = False


class Room(StrictModel):
    id: Id
    levelId: Id
    name: Annotated[str, Field(min_length=1, max_length=100)]
    type: RoomType
    wallIds: Annotated[list[Id], Field(min_length=3)]
    polygon: Polygon
    area: NonNegativeMm
    habitable: bool
    locked: bool = False


class Stair(StrictModel):
    id: Id
    fromLevelId: Id
    toLevelId: Id
    footprint: Polygon
    type: Literal["straight", "quarterTurn", "halfTurn", "spiral"]
    upDirection: Degrees
    riserHeight: PositiveMm
    treadDepth: PositiveMm


class Roof(StrictModel):
    type: Literal["flat", "gable", "hip", "shed"]
    pitch: Annotated[float, Field(ge=0, le=89)]
    overhang: NonNegativeMm
    ridgeDirection: Literal[0, 90] | None
    material: Annotated[str, Field(min_length=1, max_length=50)]


class Slab(StrictModel):
    id: Id
    levelId: Id
    polygon: Polygon
    thickness: PositiveMm


class Dimension(StrictModel):
    id: Id
    levelId: Id
    kind: Literal["exterior", "interior"]
    points: Annotated[list[Point], Field(min_length=2)]
    offset: Mm


class SectionLine(StrictModel):
    id: Id
    name: Annotated[str, Field(min_length=1, max_length=10)]
    start: Point
    end: Point
    lookDirection: Degrees


class Label(StrictModel):
    id: Id
    levelId: Id
    position: Point
    text: Annotated[str, Field(min_length=1, max_length=200)]


class Annotations(StrictModel):
    dimensions: list[Dimension]
    sectionLines: list[SectionLine]
    labels: list[Label]


class Check(StrictModel):
    code: Annotated[str, Field(pattern=r"^[A-Z][A-Z0-9_]*$")]
    severity: CheckSeverity
    message: Annotated[str, Field(min_length=1)]
    targetIds: list[Id]
    levelId: Id | None = None


class Metrics(StrictModel):
    habitableArea: NonNegativeMm
    floorArea: NonNegativeMm
    footprintArea: NonNegativeMm
    siteCoverageRatio: Annotated[float, Field(ge=0, le=1)]


class GenerationInfo(StrictModel):
    seed: Annotated[int, Field(ge=0)]
    engineVersion: Annotated[str, Field(min_length=1)]
    programHash: Annotated[str, Field(min_length=1)]


class BuildingModel(StrictModel):
    schemaVersion: Literal["1.0"]
    id: Id
    project: ProjectInfo
    site: Site
    levels: Annotated[list[Level], Field(min_length=1)]
    walls: list[Wall]
    openings: list[Opening]
    rooms: list[Room]
    stairs: list[Stair]
    roof: Roof
    slabs: list[Slab]
    annotations: Annotations
    checks: list[Check]
    metrics: Metrics
    generation: GenerationInfo
