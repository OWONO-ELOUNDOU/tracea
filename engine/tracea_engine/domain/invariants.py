"""Structural invariants of BuildingModel 1.0, mirroring packages/domain/src/invariants.ts."""

from __future__ import annotations

from collections import defaultdict
from itertools import pairwise

from tracea_engine.domain.metrics import compute_metrics, metrics_match
from tracea_engine.domain.model import BuildingModel, Check, Opening, Room, Wall
from tracea_engine.geometry.polygon import (
    distance,
    distance_to_polygon_boundary,
    is_simple_polygon,
    point_along,
    polygons_overlap,
)

WALL_MIN_LENGTH = 300
WALL_MIN_THICKNESS = 70
WALL_MAX_THICKNESS = 600

_ROOMS_WITHOUT_DOOR_REQUIREMENT = {"storage", "technical"}
_DOOR_TYPES = {"door", "frenchWindow", "garageDoor", "opening"}
_ZERO_SILL_TYPES = {"door", "frenchWindow", "garageDoor"}


def _format_m2(mm2: int) -> str:
    return f"{mm2 / 1_000_000:.2f}".replace(".", ",")


def _error(code: str, message: str, target_ids: list[str], level_id: str | None = None) -> Check:
    return Check(
        code=code, severity="error", message=message, targetIds=target_ids, levelId=level_id
    )


def _check_levels(model: BuildingModel, checks: list[Check]) -> None:
    level_ids = {level.id for level in model.levels}
    for position, index in enumerate(sorted(level.index for level in model.levels)):
        if index != position:
            checks.append(
                _error(
                    "LEVEL_INDEX_GAP",
                    "Les index des niveaux doivent être consécutifs à partir de 0 "
                    f"(index {index} inattendu).",
                    [level.id for level in model.levels if level.index == index],
                )
            )

    referencing: list[tuple[str, str]] = [
        *((w.id, w.levelId) for w in model.walls),
        *((r.id, r.levelId) for r in model.rooms),
        *((s.id, s.levelId) for s in model.slabs),
        *((d.id, d.levelId) for d in model.annotations.dimensions),
        *((label.id, label.levelId) for label in model.annotations.labels),
    ]
    for element_id, level_id in referencing:
        if level_id not in level_ids:
            checks.append(
                _error(
                    "LEVEL_NOT_FOUND",
                    f"Le niveau « {level_id} » référencé par « {element_id} » n'existe pas.",
                    [element_id],
                )
            )
    for stair in model.stairs:
        for level_id in (stair.fromLevelId, stair.toLevelId):
            if level_id not in level_ids:
                checks.append(
                    _error(
                        "LEVEL_NOT_FOUND",
                        f"Le niveau « {level_id} » référencé par l'escalier « {stair.id} » "
                        "n'existe pas.",
                        [stair.id],
                    )
                )

    reached = {stair.toLevelId for stair in model.stairs}
    for level in model.levels:
        if level.index > 0 and level.id not in reached:
            checks.append(
                _error(
                    "LEVEL_NOT_CONNECTED",
                    f"Le niveau « {level.name} » n'est desservi par aucun escalier.",
                    [level.id],
                    level.id,
                )
            )


def _check_walls(model: BuildingModel, checks: list[Check]) -> dict[str, Wall]:
    walls: dict[str, Wall] = {}
    for wall in model.walls:
        walls[wall.id] = wall
        length = distance(wall.start, wall.end)
        if length < WALL_MIN_LENGTH:
            checks.append(
                _error(
                    "WALL_TOO_SHORT",
                    f"Le mur « {wall.id} » mesure {round(length)} mm, en dessous du minimum "
                    f"de {WALL_MIN_LENGTH} mm.",
                    [wall.id],
                    wall.levelId,
                )
            )
        if not WALL_MIN_THICKNESS <= wall.thickness <= WALL_MAX_THICKNESS:
            checks.append(
                _error(
                    "WALL_THICKNESS_OUT_OF_RANGE",
                    f"L'épaisseur du mur « {wall.id} » ({wall.thickness} mm) doit être comprise "
                    f"entre {WALL_MIN_THICKNESS} et {WALL_MAX_THICKNESS} mm.",
                    [wall.id],
                    wall.levelId,
                )
            )
    return walls


def _check_openings(model: BuildingModel, walls: dict[str, Wall], checks: list[Check]) -> None:
    by_wall: dict[str, list[Opening]] = defaultdict(list)
    for opening in model.openings:
        wall = walls.get(opening.wallId)
        if wall is None:
            checks.append(
                _error(
                    "WALL_NOT_FOUND",
                    f"Le mur « {opening.wallId} » de l'ouverture « {opening.id} » n'existe pas.",
                    [opening.id],
                )
            )
            continue
        if opening.offset + opening.width > distance(wall.start, wall.end):
            checks.append(
                _error(
                    "OPENING_OUT_OF_WALL",
                    f"L'ouverture « {opening.id} » dépasse l'extrémité du mur « {wall.id} ».",
                    [opening.id, wall.id],
                    wall.levelId,
                )
            )
        if opening.type in _ZERO_SILL_TYPES and opening.sillHeight != 0:
            checks.append(
                _error(
                    "OPENING_SILL_INVALID",
                    f"L'ouverture « {opening.id} » est une porte : sa hauteur d'allège doit être "
                    "nulle.",
                    [opening.id],
                    wall.levelId,
                )
            )
        by_wall[wall.id].append(opening)

    for wall_id, openings in by_wall.items():
        ordered = sorted(openings, key=lambda o: o.offset)
        for previous, current in pairwise(ordered):
            if current.offset < previous.offset + previous.width:
                checks.append(
                    _error(
                        "OPENINGS_OVERLAP",
                        f"Les ouvertures « {previous.id} » et « {current.id} » se chevauchent "
                        f"sur le mur « {wall_id} ».",
                        [previous.id, current.id],
                        walls[wall_id].levelId,
                    )
                )


def _room_has_door(room: Room, doors: list[Opening], walls: dict[str, Wall]) -> bool:
    """A door serves a room when its centre lies along the room's boundary, within half the
    wall thickness; a door elsewhere on a shared wall does not count."""
    wall_ids = set(room.wallIds)
    for door in doors:
        wall = walls.get(door.wallId)
        if door.wallId not in wall_ids or wall is None:
            continue
        centre = point_along(wall.start, wall.end, door.offset + door.width / 2)
        if distance_to_polygon_boundary(centre, room.polygon) <= wall.thickness / 2 + 1:
            return True
    return False


def _check_rooms(model: BuildingModel, walls: dict[str, Wall], checks: list[Check]) -> None:
    doors = [opening for opening in model.openings if opening.type in _DOOR_TYPES]

    for room in model.rooms:
        if not is_simple_polygon(room.polygon):
            checks.append(
                _error(
                    "ROOM_POLYGON_INVALID",
                    f"Le contour de la pièce « {room.name} » n'est pas un polygone simple.",
                    [room.id],
                    room.levelId,
                )
            )
        for wall_id in room.wallIds:
            if wall_id not in walls:
                checks.append(
                    _error(
                        "WALL_NOT_FOUND",
                        f"Le mur « {wall_id} » de la pièce « {room.name} » n'existe pas.",
                        [room.id],
                        room.levelId,
                    )
                )
        needs_door = room.habitable and room.type not in _ROOMS_WITHOUT_DOOR_REQUIREMENT
        if needs_door and not _room_has_door(room, doors, walls):
            checks.append(
                _error(
                    "ROOM_NOT_ACCESSIBLE",
                    f"La pièce « {room.name} » ({_format_m2(room.area)} m²) n'a aucune porte.",
                    [room.id],
                    room.levelId,
                )
            )

    by_level: dict[str, list[Room]] = defaultdict(list)
    for room in model.rooms:
        by_level[room.levelId].append(room)
    for rooms in by_level.values():
        for i, a in enumerate(rooms):
            for b in rooms[i + 1 :]:
                if polygons_overlap(a.polygon, b.polygon):
                    checks.append(
                        _error(
                            "ROOMS_OVERLAP",
                            f"Les pièces « {a.name} » et « {b.name} » se chevauchent.",
                            [a.id, b.id],
                            a.levelId,
                        )
                    )


def _check_metrics(model: BuildingModel, checks: list[Check]) -> None:
    computed = compute_metrics(model)
    if not metrics_match(model.metrics, computed):
        checks.append(
            _error(
                "METRICS_MISMATCH",
                "Les surfaces enregistrées ne correspondent pas au modèle (habitable : "
                f"{_format_m2(model.metrics.habitableArea)} m² enregistrée, "
                f"{_format_m2(computed.habitableArea)} m² recalculée).",
                [],
            )
        )


def validate_invariants(model: BuildingModel) -> list[Check]:
    checks: list[Check] = []
    _check_levels(model, checks)
    walls = _check_walls(model, checks)
    _check_openings(model, walls, checks)
    _check_rooms(model, walls, checks)
    _check_metrics(model, checks)
    return checks
