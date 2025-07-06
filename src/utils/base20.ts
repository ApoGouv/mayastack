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
    const remainder = n % 20;
    digits.unshift(remainder); // Add digit to the front (MSD first)
    n = Math.floor(n / 20);     // Move to next place value
  }

  return digits;
}
