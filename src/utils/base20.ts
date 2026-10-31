/**
 * The base used for Mayan numeral conversion.
 */
export const BASE_20 = 20;

/**
 * The HTML representation of subscript 20, used in base-20 notation.
 */
export const HTML_SUB_20 = `<sub>${BASE_20}</sub>`;

/**
 * Converts an array of base-20 digits into a formatted HTML string.
 *
 * Supports two modes:
 * - 'notation': outputs comma-separated digits with subscript 20 (e.g. "5,1,5<sub>20</sub>")
 * - 'expanded': outputs math-style notation (e.g. "5 × 20<sup>2</sup> • 1 × 20<sup>1</sup> • 5 × 20<sup>0</sup>")
 *
 * @param digits - An array of base-20 digits (most significant digit first)
 * @param mode - Display mode: 'notation' (default) or 'expanded'
 * @returns A string of HTML representing the base-20 number in the chosen format
 */
export function toBase20String(
  digits: number[],
  mode: "notation" | "expanded" = "notation"
): string {
  const length = digits.length;

  if (mode === "notation") {
    return `${digits.join(",")}${HTML_SUB_20}`;
  }

  // Expanded form: "5 × 20² • 1 × 20¹ • 5 × 20⁰"
  return digits
    .map((digit, index) => {
      const exp = length - 1 - index;
      return `${digit} × ${BASE_20}<sup>${exp}</sup>`;
    })
    .join(" • ");
}

/**
 * The base as a bigint, for exact integer arithmetic.
 */
const BASE_20_BIGINT = BigInt(BASE_20);

/**
 * Validates a value and returns it as an exact, non-negative bigint.
 *
 * Numbers must be safe integers: beyond Number.MAX_SAFE_INTEGER a number may
 * already have lost precision (e.g. 9007199254740993 becomes 9007199254740992),
 * so larger values must be passed as a bigint.
 *
 * @throws RangeError for negative, fractional, NaN, infinite or unsafe values
 */
function toExactNonNegativeInteger(value: number | bigint): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new RangeError(
      `Expected a safe integer, received ${value}. Use a bigint for larger values.`
    );
  }

  const integer = BigInt(value);
  if (integer < 0n) {
    throw new RangeError(`Expected a non-negative integer, received ${value}.`);
  }

  return integer;
}

/**
 * Converts a decimal number (base-10) to an array of digits in base-20.
 *
 * This is the core utility for transforming a number into Mayan-style numeric
 * representation. Each element in the returned array is a base-20 digit (0–19),
 * starting from the highest place value down to the lowest.
 *
 * The conversion uses bigint arithmetic, so integers larger than
 * Number.MAX_SAFE_INTEGER are converted exactly when passed as a bigint.
 *
 * Example:
 *   toBase20(0)    => [0]
 *   toBase20(7)    => [7]
 *   toBase20(123)  => [6, 3]  // 6×20 + 3 = 123
 *   toBase20(9007199254740993n) => [2, 3, 19, 12, 3, 14, 8, 7, 2, 2, 12, 9, 13]
 *
 * @param value - A non-negative integer: a safe-integer number or a bigint
 * @returns An array of base-20 digits, most significant digit first
 * @throws RangeError for negative, fractional, NaN, infinite or unsafe numbers
 */
export function toBase20(value: number | bigint): number[] {
  let n = toExactNonNegativeInteger(value);

  if (n === 0n) return [0]; // Mayan 0 is represented by the shell symbol

  const digits: number[] = [];

  // Repeatedly divide by 20 and collect remainders
  while (n > 0n) {
    const remainder = n % BASE_20_BIGINT;
    digits.unshift(Number(remainder)); // Add digit to the front (MSD first); always 0–19
    n /= BASE_20_BIGINT; // bigint division truncates: move to next place value
  }

  return digits;
}

/**
 * The exact positional value of one base-20 digit.
 */
export interface PlaceValue {
  /** The base-20 digit (0–19) */
  digit: number;
  /** Position of the digit: 0 for the lowest place */
  exponent: number;
  /** 20 raised to the exponent */
  multiplier: bigint;
  /** digit × multiplier, the digit's contribution in base-10 */
  value: bigint;
}

/**
 * Calculates the exact place value of each base-20 digit.
 *
 * Example:
 *   getPlaceValues([6, 3]) => [
 *     { digit: 6, exponent: 1, multiplier: 20n, value: 120n },
 *     { digit: 3, exponent: 0, multiplier: 1n, value: 3n },
 *   ]
 *
 * @param digits - Base-20 digits, most significant digit first
 * @returns The place value of each digit, in the same order
 */
export function getPlaceValues(digits: number[]): PlaceValue[] {
  return digits.map((digit, index) => {
    const exponent = digits.length - index - 1;
    const multiplier = BASE_20_BIGINT ** BigInt(exponent);

    return { digit, exponent, multiplier, value: BigInt(digit) * multiplier };
  });
}

/**
 * Unicode superscript digits, indexed by digit (¹, ² and ³ come from a different block)
 */
const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/**
 * Writes a non-negative integer with Unicode superscript digits, for plain-text exponents.
 *
 * Example:
 *   toSuperscript(384) => "³⁸⁴"
 *
 * @throws RangeError for negative, fractional or unsafe values
 */
export function toSuperscript(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError(`Expected a non-negative safe integer, received ${n}.`);
  }

  return [...n.toString()].map((digit) => SUPERSCRIPT_DIGITS[Number(digit)]).join('');
}

/**
 * Writes the positional sum of base-20 digits as a plain-text formula, ending with its
 * exact decimal value. Every tier is included, also those whose digit is 0.
 *
 * Example:
 *   toBase20Formula([3, 0, 2]) => "3 × 20² + 0 × 20¹ + 2 × 20⁰ = 1202"
 *
 * @param digits - Base-20 digits, most significant digit first
 * @returns The formula, without markup or digit grouping
 */
export function toBase20Formula(digits: number[]): string {
  const placeValues = getPlaceValues(digits);
  const terms = placeValues.map(({ digit, exponent }) => `${digit} × ${BASE_20}${toSuperscript(exponent)}`);
  const total = placeValues.reduce((sum, { value }) => sum + value, 0n);

  return `${terms.join(' + ')} = ${total}`;
}
