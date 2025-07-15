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
 * Converts a decimal number (base-10) to an array of digits in base-20.
 *
 * This is the core utility for transforming a number into Mayan-style numeric
 * representation. Each element in the returned array is a base-20 digit (0–19),
 * starting from the highest place value down to the lowest.
 *
 * Example:
 *   toBase20(0)   => [0]
 *   toBase20(7)   => [7]
 *   toBase20(123) => [6, 3]  // 6×20 + 3 = 123
 *
 * @param n - A non-negative integer in base-10
 * @returns An array of base-20 digits, most significant digit first
 */
export function toBase20(n: number): number[] {
  if (n === 0) return [0]; // Mayan 0 is represented by the shell symbol

  const digits: number[] = [];

  // Repeatedly divide by 20 and collect remainders
  while (n > 0) {
    const remainder = n % BASE_20;
    digits.unshift(remainder); // Add digit to the front (MSD first)
    n = Math.floor(n / BASE_20); // Move to next place value
  }

  return digits;
}
