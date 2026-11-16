"""Light polygon helpers shared by the invariants; the solver uses shapely for heavier work.

The algorithms mirror packages/domain/src/geometry.ts so both sides agree on every fixture.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

Point = tuple[int, int]
Polygon = Sequence[Point]
FloatPoint = tuple[float, float]


def distance(a: FloatPoint, b: FloatPoint) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def signed_area(polygon: Polygon) -> float:
    total = 0
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return total / 2


def area(polygon: Polygon) -> float:
    return abs(signed_area(polygon))


def _orientation(p: Point, q: Point, r: Point) -> int:
    value = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
    if value == 0:
        return 0
    return 1 if value > 0 else 2


def _on_segment(p: Point, q: Point, r: Point) -> bool:
    return min(p[0], r[0]) <= q[0] <= max(p[0], r[0]) and min(p[1], r[1]) <= q[1] <= max(p[1], r[1])


def segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool:
    o1 = _orientation(p1, p2, p3)
    o2 = _orientation(p1, p2, p4)
    o3 = _orientation(p3, p4, p1)
    o4 = _orientation(p3, p4, p2)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and _on_segment(p1, p3, p2):
        return True
    if o2 == 0 and _on_segment(p1, p4, p2):
        return True
    if o3 == 0 and _on_segment(p3, p1, p4):
        return True
    return o4 == 0 and _on_segment(p3, p2, p4)


def point_strictly_inside(point: Point, polygon: Polygon) -> bool:
    x, y = point
    inside = False
    n = len(polygon)
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if _orientation((xi, yi), (xj, yj), point) == 0 and _on_segment((xi, yi), point, (xj, yj)):
            return False
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def is_simple_polygon(polygon: Polygon) -> bool:
    n = len(polygon)
    if n < 3 or area(polygon) == 0:
        return False
    for i in range(n):
        a1, a2 = polygon[i], polygon[(i + 1) % n]
        for j in range(i + 1, n):
            adjacent = j == i + 1 or (i == 0 and j == n - 1)
            if adjacent:
                continue
            b1, b2 = polygon[j], polygon[(j + 1) % n]
            if segments_intersect(a1, a2, b1, b2):
                return False
    return True


def _distance_to_segment(p: FloatPoint, a: Point, b: Point) -> float:
    dx, dy = b[0] - a[0], b[1] - a[1]
    length_squared = dx * dx + dy * dy
    if length_squared == 0:
        return distance(p, a)
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length_squared))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def distance_to_polygon_boundary(point: FloatPoint, polygon: Polygon) -> float:
    n = len(polygon)
    return min(_distance_to_segment(point, polygon[i], polygon[(i + 1) % n]) for i in range(n))


def point_along(start: Point, end: Point, along: float) -> tuple[float, float]:
    """Point on the wall axis at `along` mm from its start."""
    length = distance(start, end)
    if length == 0:
        return (float(start[0]), float(start[1]))
    t = along / length
    return (start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t)


def _edges_cross_strictly(a: Polygon, b: Polygon) -> bool:
    for i in range(len(a)):
        a1, a2 = a[i], a[(i + 1) % len(a)]
        for j in range(len(b)):
            b1, b2 = b[j], b[(j + 1) % len(b)]
            o1 = _orientation(a1, a2, b1)
            o2 = _orientation(a1, a2, b2)
            o3 = _orientation(b1, b2, a1)
            o4 = _orientation(b1, b2, a2)
            if 0 not in (o1, o2, o3, o4) and o1 != o2 and o3 != o4:
                return True
    return False


def polygons_overlap(a: Polygon, b: Polygon) -> bool:
    """True when interiors share a region; a shared edge alone is not an overlap."""
    if len(a) == len(b) and set(a) == set(b):
        return True
    if any(point_strictly_inside(p, b) for p in a):
        return True
    if any(point_strictly_inside(p, a) for p in b):
        return True
    return _edges_cross_strictly(a, b)
