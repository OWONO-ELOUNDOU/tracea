import { mm2ToSquareMetres, mmToMetres } from "@tracea/domain";

/**
 * Reading and display of the numbers typed on the screen (spec § 5.3). Only the input syntax lives
 * here: bounds, integrality, unit conversions and messages come from `@tracea/domain`.
 */
export type DecimalInput =
  { kind: "empty" } | { kind: "number"; value: number } | { kind: "invalid" };

export const INVALID_NUMBER_MESSAGE = "Saisissez un nombre, par exemple 12,5.";

// `\s` covers the no-break and narrow no-break spaces used as French thousands separators.
const SPACES = /\s/gu;
// U+2212 is the minus sign `Intl.NumberFormat("fr-FR")` writes for negative numbers.
const DECIMAL = /^[-\u2212]?\d+(?:[.,]\d+)?$/u;

export function parseDecimalInput(text: string): DecimalInput {
  const compact = text.replace(SPACES, "");
  if (compact === "") return { kind: "empty" };
  if (!DECIMAL.test(compact)) return { kind: "invalid" };
  return { kind: "number", value: Number(compact.replace("\u2212", "-").replace(",", ".")) };
}

export function formatDecimal(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat("fr-FR", { useGrouping: false, maximumFractionDigits }).format(
    value,
  );
}

/** Integer mm shown in metres, exact to the millimetre. */
export const formatMetres = (mm: number) => formatDecimal(mmToMetres(mm), 3);

/** Integer mm² shown in square metres, exact to the square millimetre. */
export const formatSquareMetres = (mm2: number) => formatDecimal(mm2ToSquareMetres(mm2), 6);

/** Degrees and percentages. */
export const formatPlain = (value: number) => formatDecimal(value, 3);

/** Dimension text of the site preview: metres with two decimals, e.g. « 30,00 ». */
export function formatDimension(mm: number): string {
  return new Intl.NumberFormat("fr-FR", {
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(mmToMetres(mm));
}

/** Grouped integer, e.g. « 2 000 » with a narrow no-break space (description counter). */
export const formatCount = (value: number) => new Intl.NumberFormat("fr-FR").format(value);
