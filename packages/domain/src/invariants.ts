import {
  distance,
  distanceToPolygonBoundary,
  isSimplePolygon,
  pointAlong,
  polygonsOverlap,
} from "./geometry.js";
import { computeMetrics, metricsMatch } from "./metrics.js";
import type { BuildingModel, Check, Opening, Room, Wall } from "./schema.js";

export const WALL_MIN_LENGTH = 300;
export const WALL_MIN_THICKNESS = 70;
export const WALL_MAX_THICKNESS = 600;

const ROOMS_WITHOUT_DOOR_REQUIREMENT = new Set<Room["type"]>(["storage", "technical"]);
const DOOR_TYPES = new Set<Opening["type"]>(["door", "frenchWindow", "garageDoor", "opening"]);
const ZERO_SILL_TYPES = new Set<Opening["type"]>(["door", "frenchWindow", "garageDoor"]);

function formatM2(mm2: number): string {
  return (mm2 / 1_000_000).toFixed(2).replace(".", ",");
}

function error(code: string, message: string, targetIds: string[], levelId?: string): Check {
  return levelId === undefined
    ? { code, severity: "error", message, targetIds }
    : { code, severity: "error", message, targetIds, levelId };
}

function checkLevels(model: BuildingModel, checks: Check[]): void {
  const levelIds = new Set(model.levels.map((level) => level.id));
  const indices = [...model.levels].map((level) => level.index).sort((a, b) => a - b);
  indices.forEach((index, position) => {
    if (index !== position) {
      checks.push(
        error(
          "LEVEL_INDEX_GAP",
          `Les index des niveaux doivent être consécutifs à partir de 0 (index ${String(index)} inattendu).`,
          model.levels.filter((level) => level.index === index).map((level) => level.id),
        ),
      );
    }
  });

  const referencing: { id: string; levelId: string }[] = [
    ...model.walls,
    ...model.rooms,
    ...model.slabs,
    ...model.annotations.dimensions,
    ...model.annotations.labels,
  ];
  for (const element of referencing) {
    if (!levelIds.has(element.levelId)) {
      checks.push(
        error(
          "LEVEL_NOT_FOUND",
          `Le niveau « ${element.levelId} » référencé par « ${element.id} » n'existe pas.`,
          [element.id],
        ),
      );
    }
  }
  for (const stair of model.stairs) {
    for (const levelId of [stair.fromLevelId, stair.toLevelId]) {
      if (!levelIds.has(levelId)) {
        checks.push(
          error(
            "LEVEL_NOT_FOUND",
            `Le niveau « ${levelId} » référencé par l'escalier « ${stair.id} » n'existe pas.`,
            [stair.id],
          ),
        );
      }
    }
  }

  const reachedByStairs = new Set(model.stairs.map((stair) => stair.toLevelId));
  for (const level of model.levels) {
    if (level.index > 0 && !reachedByStairs.has(level.id)) {
      checks.push(
        error(
          "LEVEL_NOT_CONNECTED",
          `Le niveau « ${level.name} » n'est desservi par aucun escalier.`,
          [level.id],
          level.id,
        ),
      );
    }
  }
}

function checkWalls(model: BuildingModel, checks: Check[]): Map<string, Wall> {
  const walls = new Map<string, Wall>();
  for (const wall of model.walls) {
    walls.set(wall.id, wall);
    const length = distance(wall.start, wall.end);
    if (length < WALL_MIN_LENGTH) {
      checks.push(
        error(
          "WALL_TOO_SHORT",
          `Le mur « ${wall.id} » mesure ${String(Math.round(length))} mm, en dessous du minimum de ${String(WALL_MIN_LENGTH)} mm.`,
          [wall.id],
          wall.levelId,
        ),
      );
    }
    if (wall.thickness < WALL_MIN_THICKNESS || wall.thickness > WALL_MAX_THICKNESS) {
      checks.push(
        error(
          "WALL_THICKNESS_OUT_OF_RANGE",
          `L'épaisseur du mur « ${wall.id} » (${String(wall.thickness)} mm) doit être comprise entre ${String(WALL_MIN_THICKNESS)} et ${String(WALL_MAX_THICKNESS)} mm.`,
          [wall.id],
          wall.levelId,
        ),
      );
    }
  }
  return walls;
}

function checkOpenings(model: BuildingModel, walls: Map<string, Wall>, checks: Check[]): void {
  const byWall = new Map<string, Opening[]>();
  for (const opening of model.openings) {
    const wall = walls.get(opening.wallId);
    if (wall === undefined) {
      checks.push(
        error(
          "WALL_NOT_FOUND",
          `Le mur « ${opening.wallId} » de l'ouverture « ${opening.id} » n'existe pas.`,
          [opening.id],
        ),
      );
      continue;
    }
    const length = distance(wall.start, wall.end);
    if (opening.offset + opening.width > length) {
      checks.push(
        error(
          "OPENING_OUT_OF_WALL",
          `L'ouverture « ${opening.id} » dépasse l'extrémité du mur « ${wall.id} ».`,
          [opening.id, wall.id],
          wall.levelId,
        ),
      );
    }
    if (ZERO_SILL_TYPES.has(opening.type) && opening.sillHeight !== 0) {
      checks.push(
        error(
          "OPENING_SILL_INVALID",
          `L'ouverture « ${opening.id} » est une porte : sa hauteur d'allège doit être nulle.`,
          [opening.id],
          wall.levelId,
        ),
      );
    }
    const list = byWall.get(wall.id) ?? [];
    list.push(opening);
    byWall.set(wall.id, list);
  }

  for (const [wallId, openings] of byWall) {
    const sorted = [...openings].sort((a, b) => a.offset - b.offset);
    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1] as Opening;
      const current = sorted[i] as Opening;
      if (current.offset < previous.offset + previous.width) {
        checks.push(
          error(
            "OPENINGS_OVERLAP",
            `Les ouvertures « ${previous.id} » et « ${current.id} » se chevauchent sur le mur « ${wallId} ».`,
            [previous.id, current.id],
            walls.get(wallId)?.levelId,
          ),
        );
      }
    }
  }
}

/**
 * A door serves a room when it sits on one of the room's walls and its centre lies along the
 * room's boundary (within half the wall thickness). A door elsewhere on a shared wall does not.
 */
function roomHasDoor(room: Room, doors: Opening[], walls: Map<string, Wall>): boolean {
  const wallIds = new Set(room.wallIds);
  return doors.some((door) => {
    if (!wallIds.has(door.wallId)) return false;
    const wall = walls.get(door.wallId);
    if (wall === undefined) return false;
    const centre = pointAlong(wall.start, wall.end, door.offset + door.width / 2);
    return distanceToPolygonBoundary(centre, room.polygon) <= wall.thickness / 2 + 1;
  });
}

function checkRooms(model: BuildingModel, walls: Map<string, Wall>, checks: Check[]): void {
  const doors = model.openings.filter((opening) => DOOR_TYPES.has(opening.type));

  for (const room of model.rooms) {
    if (!isSimplePolygon(room.polygon)) {
      checks.push(
        error(
          "ROOM_POLYGON_INVALID",
          `Le contour de la pièce « ${room.name} » n'est pas un polygone simple.`,
          [room.id],
          room.levelId,
        ),
      );
    }
    for (const wallId of room.wallIds) {
      if (!walls.has(wallId)) {
        checks.push(
          error(
            "WALL_NOT_FOUND",
            `Le mur « ${wallId} » de la pièce « ${room.name} » n'existe pas.`,
            [room.id],
            room.levelId,
          ),
        );
      }
    }
    const needsDoor = room.habitable && !ROOMS_WITHOUT_DOOR_REQUIREMENT.has(room.type);
    if (needsDoor && !roomHasDoor(room, doors, walls)) {
      checks.push(
        error(
          "ROOM_NOT_ACCESSIBLE",
          `La pièce « ${room.name} » (${formatM2(room.area)} m²) n'a aucune porte.`,
          [room.id],
          room.levelId,
        ),
      );
    }
  }

  const byLevel = new Map<string, Room[]>();
  for (const room of model.rooms) {
    const list = byLevel.get(room.levelId) ?? [];
    list.push(room);
    byLevel.set(room.levelId, list);
  }
  for (const rooms of byLevel.values()) {
    for (let i = 0; i < rooms.length; i += 1) {
      for (let j = i + 1; j < rooms.length; j += 1) {
        const a = rooms[i] as Room;
        const b = rooms[j] as Room;
        if (polygonsOverlap(a.polygon, b.polygon)) {
          checks.push(
            error(
              "ROOMS_OVERLAP",
              `Les pièces « ${a.name} » et « ${b.name} » se chevauchent.`,
              [a.id, b.id],
              a.levelId,
            ),
          );
        }
      }
    }
  }
}

function checkMetrics(model: BuildingModel, checks: Check[]): void {
  const computed = computeMetrics(model);
  if (!metricsMatch(model.metrics, computed)) {
    checks.push(
      error(
        "METRICS_MISMATCH",
        `Les surfaces enregistrées ne correspondent pas au modèle (habitable : ${formatM2(model.metrics.habitableArea)} m² enregistrée, ${formatM2(computed.habitableArea)} m² recalculée).`,
        [],
      ),
    );
  }
}

/**
 * Structural invariants of BuildingModel 1.0. Returns an empty list for a consistent model;
 * every violation is an `error` check with a user-facing message.
 */
export function validateInvariants(model: BuildingModel): Check[] {
  const checks: Check[] = [];
  checkLevels(model, checks);
  const walls = checkWalls(model, checks);
  checkOpenings(model, walls, checks);
  checkRooms(model, walls, checks);
  checkMetrics(model, checks);
  return checks;
}
