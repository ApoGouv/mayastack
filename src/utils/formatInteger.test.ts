import { describe, expect, it, vi } from 'vitest';
import { COMPACT_MIN_TRAILING_ZEROS, formatGroupedInteger, toCompactInteger } from './formatInteger';

/** Digits grouped in threes with commas, the first group 1 to 3 digits long */
const GROUPED = /^\d{1,3}(,\d{3})*$/;

describe('formatGroupedInteger', () => {
  it('groups thousands with commas', () => {
    expect(formatGroupedInteger(0n)).toBe('0');
    expect(formatGroupedInteger(999n)).toBe('999');
    expect(formatGroupedInteger(1000n)).toBe('1,000');
    expect(formatGroupedInteger(8000n)).toBe('8,000');
    expect(formatGroupedInteger(1200n)).toBe('1,200');
  });

  it('keeps every digit beyond Number.MAX_SAFE_INTEGER', () => {
    // As a number, 2^53 + 1 would already have become 9,007,199,254,740,992
    expect(formatGroupedInteger(2n ** 53n + 1n)).toBe('9,007,199,254,740,993');
  });

  it.each([
    ['20^98, the largest multiplier', 20n ** 98n],
    ['10^128 - 1, the largest number', 10n ** 128n - 1n],
  ])('keeps every digit of %s', (_, value) => {
    const grouped = formatGroupedInteger(value);

    expect(grouped).toMatch(GROUPED);
    expect(grouped).toHaveLength(170);
    expect(grouped.replaceAll(',', '')).toBe(value.toString());
  });
});

/** The value a compact form stands for, computed exactly */
const expand = ({ coefficient, exponent }: { coefficient: bigint; exponent: number }) => coefficient * 10n ** BigInt(exponent);

describe('toCompactInteger', () => {
  it('starts at 6 trailing zeros', () => {
    expect(COMPACT_MIN_TRAILING_ZEROS).toBe(6);
  });

  it('leaves zero, and values with fewer than 6 trailing zeros, to be written in full', () => {
    for (const value of [0n, 7n, 1202n, 1200n, 8000n, 3_200_000n, 1_234_500_000n, 99_900_000n]) {
      expect(toCompactInteger(value)).toBeNull();
    }
  });

  it.each([
    // Exactly 6 trailing zeros
    [1_000_000n, 1n, 6],
    [16_000_000n, 16n, 6],
    // 7 and 8: whole groups of three move into the exponent, the rest stay in the coefficient
    [2_560_000_000n, 2_560n, 6],
    [12_800_000_000n, 12_800n, 6],
    // 9 and more
    [1_000_000_000n, 1n, 9],
    [4_915_200_000_000_000_000n, 4_915_200n, 12],
    [256_000_000_000_000_000_000n, 256n, 18],
  ])('writes %s as %s × 10^%i, exactly', (value, coefficient, exponent) => {
    const compact = toCompactInteger(value)!;

    expect(compact).toEqual({ coefficient, exponent });
    expect(expand(compact)).toBe(value);
  });

  it('is exact for every subtotal of the largest 128-digit number, far beyond Number.MAX_SAFE_INTEGER', () => {
    // Every digit times every power of 20 up to 20^98: d × 20^n has at least n trailing zeros
    for (let exponent = 0n; exponent <= 98n; exponent++) {
      for (const digit of [1n, 5n, 19n]) {
        const value = digit * 20n ** exponent;
        const compact = toCompactInteger(value);
        const trailingZeros = value.toString().length - value.toString().replace(/0+$/, '').length;

        if (trailingZeros < 6) {
          expect(compact).toBeNull();
        } else {
          expect(expand(compact!)).toBe(value);
          expect(compact!.exponent % 3).toBe(0);
          // At most two trailing zeros left in the coefficient
          expect(trailingZeros - compact!.exponent).toBeLessThan(3);
        }
      }
    }
    // The largest number's top subtotal, 3 × 20^98 (128 digits), shortened to 32 digits
    const top = toCompactInteger(3n * 20n ** 98n)!;
    expect(top).toEqual({ coefficient: 95_073_795_017_117_205_112_252_740_403_200n, exponent: 96 });
    expect(expand(top)).toBe(3n * 20n ** 98n);
  });

  it('never converts the value to a Number', () => {
    const toNumber = vi.spyOn(globalThis, 'Number');

    expect(expand(toCompactInteger(9n * 20n ** 98n)!)).toBe(9n * 20n ** 98n);
    expect(toNumber).not.toHaveBeenCalled();
    toNumber.mockRestore();
  });
});
