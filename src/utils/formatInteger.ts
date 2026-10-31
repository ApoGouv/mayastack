/**
 * Groups thousands with commas, as the interface's other numbers do ('en-US'), whatever the
 * browser's locale: in some locales a point groups thousands, which reads as a decimal point here.
 */
const groupedFormat = new Intl.NumberFormat('en-US');

/**
 * Writes an integer with thousands separators, e.g. 1200n => "1,200".
 *
 * Takes a bigint and formats it directly, so integers beyond Number.MAX_SAFE_INTEGER,
 * up to the input's 128-digit limit and beyond, keep every digit.
 *
 * @param value - The exact integer to format
 * @returns The integer's decimal digits, grouped in threes with commas
 */
export function formatGroupedInteger(value: bigint): string {
  return groupedFormat.format(value);
}

/** The fewest trailing zeros for which a value is written as a power-of-ten multiple */
export const COMPACT_MIN_TRAILING_ZEROS = 6;

/** An integer written as coefficient × 10^exponent */
export interface CompactInteger {
  coefficient: bigint;
  /** A multiple of 3, at least COMPACT_MIN_TRAILING_ZEROS */
  exponent: number;
}

/**
 * Writes an integer with many trailing zeros as an exact multiple of a power of ten, e.g.
 * 2,560,000,000 as 2,560 × 10⁶: whole groups of three trailing zeros move into the exponent,
 * so the coefficient keeps its grouping, as in "4,915,200 × 10¹²".
 *
 * Works on the decimal digits, so no value goes through Number. coefficient × 10^exponent is
 * exactly the value.
 *
 * Example:
 *   toCompactInteger(2560000000n) => { coefficient: 2560n, exponent: 6 }
 *   toCompactInteger(1200n)       => null
 *
 * @param value - A non-negative integer
 * @returns The coefficient and exponent, or null for zero and for values with fewer than
 *   COMPACT_MIN_TRAILING_ZEROS trailing zeros, which are written in full
 */
export function toCompactInteger(value: bigint): CompactInteger | null {
  if (value === 0n) return null;

  const digits = value.toString();
  const trailingZeros = digits.length - digits.replace(/0+$/, '').length;
  if (trailingZeros < COMPACT_MIN_TRAILING_ZEROS) return null;

  const exponent = trailingZeros - (trailingZeros % 3);
  return { coefficient: BigInt(digits.slice(0, -exponent)), exponent };
}
