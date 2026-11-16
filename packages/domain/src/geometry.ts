export type Point = readonly [number, number];
export type Polygon = readonly Point[];

export function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Signed area (shoelace); positive for counter-clockwise rings. */
export function signedArea(polygon: Polygon): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const [x1, y1] = polygon[i] as Point;
    const [x2, y2] = polygon[(i + 1) % polygon.length] as Point;
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

export function area(polygon: Polygon): number {
  return Math.abs(signedArea(polygon));
}

function orientation(p: Point, q: Point, r: Point): number {
  const value = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  if (value === 0) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    q[0] <= Math.max(p[0], r[0]) &&
    q[0] >= Math.min(p[0], r[0]) &&
    q[1] <= Math.max(p[1], r[1]) &&
    q[1] >= Math.min(p[1], r[1])
  );
}

/** True when the closed segments [p1,p2] and [p3,p4] cross or touch. */
export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;
  return false;
}

/** Strict interior test (points on the boundary count as outside). */
export function pointStrictlyInside(point: Point, polygon: Polygon): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] as Point;
    const [xj, yj] = polygon[j] as Point;
    if (orientation([xi, yi], [xj, yj], point) === 0 && onSegment([xi, yi], point, [xj, yj])) {
      return false;
    }
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** A polygon is simple when it has at least three vertices, a non-zero area and no self-crossing. */
export function isSimplePolygon(polygon: Polygon): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  if (area(polygon) === 0) return false;
  for (let i = 0; i < n; i += 1) {
    const a1 = polygon[i] as Point;
    const a2 = polygon[(i + 1) % n] as Point;
    for (let j = i + 1; j < n; j += 1) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      const b1 = polygon[j] as Point;
      const b2 = polygon[(j + 1) % n] as Point;
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared));
  return distance(p, [a[0] + t * dx, a[1] + t * dy]);
}

export function distanceToPolygonBoundary(point: Point, polygon: Polygon): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i] as Point;
    const b = polygon[(i + 1) % polygon.length] as Point;
    best = Math.min(best, distanceToSegment(point, a, b));
  }
  return best;
}

/** Point on the wall axis at `along` mm from its start. */
export function pointAlong(start: Point, end: Point, along: number): Point {
  const length = distance(start, end);
  if (length === 0) return start;
  const t = along / length;
  return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
}

function edgesCrossStrictly(a: Polygon, b: Polygon): boolean {
  for (let i = 0; i < a.length; i += 1) {
    const a1 = a[i] as Point;
    const a2 = a[(i + 1) % a.length] as Point;
    for (let j = 0; j < b.length; j += 1) {
      const b1 = b[j] as Point;
      const b2 = b[(j + 1) % b.length] as Point;
      const o1 = orientation(a1, a2, b1);
      const o2 = orientation(a1, a2, b2);
      const o3 = orientation(b1, b2, a1);
      const o4 = orientation(b1, b2, a2);
      if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4) return true;
    }
  }
  return false;
}

function samePolygon(a: Polygon, b: Polygon): boolean {
  if (a.length !== b.length) return false;
  const key = (p: Point): string => `${String(p[0])},${String(p[1])}`;
  const setA = new Set(a.map(key));
  return b.every((p) => setA.has(key(p)));
}

/**
 * Two simple polygons overlap when their interiors share a region: a vertex of one lies strictly
 * inside the other, their edges cross, or they are the same polygon. Sharing an edge is not an overlap.
 */
export function polygonsOverlap(a: Polygon, b: Polygon): boolean {
  if (samePolygon(a, b)) return true;
  if (a.some((p) => pointStrictlyInside(p, b))) return true;
  if (b.some((p) => pointStrictlyInside(p, a))) return true;
  return edgesCrossStrictly(a, b);
}
