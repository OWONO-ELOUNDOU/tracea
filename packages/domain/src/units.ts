/**
 * Conversions between display units (m, m²) and internal units (integer mm, integer mm²).
 *
 * Rounding: to the nearest integer, halves away from zero (0.0005 m → 1 mm, −0.0005 m → −1 mm).
 * The decimal point is shifted on the number's decimal representation rather than by a binary
 * multiplication, so 1.0005 m gives 1001 mm and not 1000 (1.0005 × 1000 = 1000.4999…).
 * Non-finite inputs (NaN, ±Infinity) return NaN, which every schema of the package rejects.
 */

function shiftAndRound(value: number, exponent: number): number {
  if (!Number.isFinite(value)) return Number.NaN;
  const magnitude = Math.abs(value);
  // String(5e-7) is "5e-7": its exponent is shifted too, so "5e-7" becomes "5e-1".
  const [mantissa = "0", ownExponent = "0"] = String(magnitude).split("e");
  const shifted = Number(`${mantissa}e${String(Number(ownExponent) + exponent)}`);
  const rounded = Math.round(shifted);
  return value < 0 && rounded !== 0 ? -rounded : rounded;
}

export function metresToMm(metres: number): number {
  return shiftAndRound(metres, 3);
}

export function mmToMetres(mm: number): number {
  return mm / 1000;
}

export function squareMetresToMm2(squareMetres: number): number {
  return shiftAndRound(squareMetres, 6);
}

export function mm2ToSquareMetres(mm2: number): number {
  return mm2 / 1_000_000;
}
