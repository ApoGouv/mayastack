/**
 * The most significant digits Random generates: short enough to read and
 * compare at a glance. The input itself accepts up to MAX_SIGNIFICANT_DIGITS.
 */
export const MAX_RANDOM_DIGITS = 10;

/**
 * Returns a uniformly random integer from 0 to n - 1. Used for small counts
 * only (digit choices and lengths), never for the generated value itself.
 */
export type RandomBelow = (n: number) => number;

/** The number of distinct values of one Uint32Array element */
const UINT32_RANGE = 2 ** 32;

/**
 * A uniformly random integer from 0 to n - 1, from crypto.getRandomValues,
 * using rejection sampling.
 *
 * A 32-bit draw is reduced with a remainder (draw % n). When n does not
 * divide 2^32, the last block of draws is incomplete and would make the
 * smallest results more likely (modulo bias), so draws in that block are
 * rejected and drawn again. Every result is then equally likely.
 *
 * @param n - The number of possible results, an integer from 1 to 2^32
 * @param fill - Fills an array with random values (crypto.getRandomValues by default)
 * @returns An integer from 0 to n - 1
 * @throws RangeError when n is not an integer from 1 to 2^32
 */
export function cryptoRandomBelow(
  n: number,
  fill: (array: Uint32Array<ArrayBuffer>) => void = (array) => { crypto.getRandomValues(array); }
): number {
  if (!Number.isInteger(n) || n < 1 || n > UINT32_RANGE) {
    throw new RangeError(`Expected an integer from 1 to 2^32, not ${n}`);
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % n);
  const draw = new Uint32Array(1);
  while (true) {
    fill(draw);

    if (draw[0] < limit) {
      return draw[0] % n;
    }
  }
}

/**
 * Generates the decimal text of a random positive integer for the number
 * input. Its number of significant digits is chosen uniformly from 1 to
 * MAX_RANDOM_DIGITS, then each digit at random: the first from 1 to 9,
 * so there is no leading zero and the value is never 0, the others from 0
 * to 9. The value is built as text, so it is exact at any length.
 *
 * @param randomBelow - The random source (cryptoRandomBelow by default)
 * @returns The digits of the generated integer
 */
export function generateRandomNumberText(randomBelow: RandomBelow = cryptoRandomBelow): string {
  const length = 1 + randomBelow(MAX_RANDOM_DIGITS);
  const digits = [1 + randomBelow(9)];
  while (digits.length < length) digits.push(randomBelow(10));
  return digits.join('');
}
