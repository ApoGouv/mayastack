import { describe, expect, it } from 'vitest';
import { getPlaceValues, toBase20, toBase20Formula, toSuperscript } from './base20';

// Large reference values are written as bigint literals: building them as a
// JavaScript number first would already lose precision.
// Expected digits were computed independently with arbitrary-precision integers.

/** 2^53 + 1: the smallest positive integer a JavaScript number cannot represent */
const BEYOND_MAX_SAFE = 9007199254740993n;
const BEYOND_MAX_SAFE_DIGITS = [2, 3, 19, 12, 3, 14, 8, 7, 2, 2, 12, 9, 13];

const THIRTY_DIGIT = 123456789012345678901234567890n;
const THIRTY_DIGIT_DIGITS = [
  2, 18, 17, 7, 10, 5, 10, 3, 14, 18, 7, 4, 2, 14, 2, 1, 11, 15, 16, 0, 19, 14, 10,
];

/** Rebuilds the integer represented by base-20 digits (most significant first) */
const fromBase20Digits = (digits: number[]): bigint =>
  digits.reduce((total, digit) => total * 20n + BigInt(digit), 0n);

describe('toBase20', () => {
  it('converts zero to a single zero digit', () => {
    expect(toBase20(0)).toEqual([0]);
    expect(toBase20(0n)).toEqual([0]);
  });

  it('converts a single-digit value', () => {
    expect(toBase20(7)).toEqual([7]);
  });

  it('handles the base-20 positional boundaries', () => {
    expect(toBase20(19)).toEqual([19]);
    expect(toBase20(20)).toEqual([1, 0]);
    expect(toBase20(399)).toEqual([19, 19]);
    expect(toBase20(400)).toEqual([1, 0, 0]);
  });

  it('converts representative existing inputs', () => {
    expect(toBase20(123)).toEqual([6, 3]);
    // Values used by date mode (day, month, year)
    expect(toBase20(31)).toEqual([1, 11]);
    expect(toBase20(12)).toEqual([12]);
    expect(toBase20(2025)).toEqual([5, 1, 5]);
  });

  it('gives the same digits for a number and the equivalent bigint', () => {
    expect(toBase20(123n)).toEqual(toBase20(123));
    expect(toBase20(BigInt(Number.MAX_SAFE_INTEGER))).toEqual(
      toBase20(Number.MAX_SAFE_INTEGER)
    );
  });

  it('converts 9007199254740993 (beyond Number.MAX_SAFE_INTEGER) exactly', () => {
    expect(toBase20(BEYOND_MAX_SAFE)).toEqual(BEYOND_MAX_SAFE_DIGITS);
    // Parsed from a decimal string, as the number input provides it
    expect(toBase20(BigInt('9007199254740993'))).toEqual(BEYOND_MAX_SAFE_DIGITS);
  });

  it('converts a 30-digit integer exactly', () => {
    expect(toBase20(THIRTY_DIGIT)).toEqual(THIRTY_DIGIT_DIGITS);
  });

  it('round-trips to the exact original integer', () => {
    const values = [0n, 1n, 19n, 20n, 400n, 123n, BEYOND_MAX_SAFE, THIRTY_DIGIT, 10n ** 100n - 1n];

    for (const value of values) {
      const digits = toBase20(value);
      expect(digits.every((digit) => Number.isInteger(digit) && digit >= 0 && digit < 20)).toBe(true);
      expect(fromBase20Digits(digits)).toBe(value);
    }
  });

  it('converts the largest 128-digit integer, the number input limit, exactly', () => {
    const largest128Digit = 10n ** 128n - 1n;
    const digits = toBase20(largest128Digit);

    expect(digits).toHaveLength(99);
    expect(fromBase20Digits(digits)).toBe(largest128Digit);
  });

  it('rejects negative values', () => {
    expect(() => toBase20(-1)).toThrow(RangeError);
    expect(() => toBase20(-1n)).toThrow(RangeError);
  });

  it('rejects fractional values', () => {
    expect(() => toBase20(1.5)).toThrow(RangeError);
  });

  it('rejects NaN', () => {
    expect(() => toBase20(Number.NaN)).toThrow(RangeError);
  });

  it('rejects Infinity instead of looping forever', () => {
    expect(() => toBase20(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => toBase20(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it('rejects numbers beyond Number.MAX_SAFE_INTEGER, whose precision may already be lost', () => {
    // Number('9007199254740993') silently becomes 9007199254740992
    expect(() => toBase20(Number('9007199254740993'))).toThrow(RangeError);
    expect(() => toBase20(2 ** 53)).toThrow(RangeError);
  });
});

describe('getPlaceValues', () => {
  it('returns exact multipliers and base-10 values for small numbers', () => {
    expect(getPlaceValues([6, 3])).toEqual([
      { digit: 6, exponent: 1, multiplier: 20n, value: 120n },
      { digit: 3, exponent: 0, multiplier: 1n, value: 3n },
    ]);
  });

  it('handles zero digits and positional transitions', () => {
    expect(getPlaceValues([0])).toEqual([{ digit: 0, exponent: 0, multiplier: 1n, value: 0n }]);
    expect(getPlaceValues([1, 0, 0]).map(({ multiplier }) => multiplier)).toEqual([400n, 20n, 1n]);
  });

  it('calculates exact place values for large numbers', () => {
    const placeValues = getPlaceValues(THIRTY_DIGIT_DIGITS);

    expect(placeValues[0]).toEqual({
      digit: 2,
      exponent: 22,
      multiplier: 20n ** 22n,
      value: 83886080000000000000000000000n,
    });
    expect(placeValues.reduce((total, { value }) => total + value, 0n)).toBe(THIRTY_DIGIT);
  });
});

describe('toSuperscript', () => {
  it('writes every digit as a superscript, including those of multi-digit exponents', () => {
    expect([...Array(10).keys()].map(toSuperscript).join('')).toBe('⁰¹²³⁴⁵⁶⁷⁸⁹');
    expect(toSuperscript(10)).toBe('¹⁰');
    expect(toSuperscript(11)).toBe('¹¹');
    expect(toSuperscript(98)).toBe('⁹⁸');
  });

  it('rejects values that are not exponents', () => {
    expect(() => toSuperscript(-1)).toThrow(RangeError);
    expect(() => toSuperscript(1.5)).toThrow(RangeError);
    expect(() => toSuperscript(Number.NaN)).toThrow(RangeError);
  });
});

describe('toBase20Formula', () => {
  /** Reads a formula's terms back: [digit, exponent] pairs and the stated total */
  function parseFormula(formula: string) {
    const fromSuperscript = (text: string) => Number([...text].map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).join(''));
    const [sum, total] = formula.split(' = ');
    const terms = sum.split(' + ').map((term) => {
      const [, digit, exponent] = term.match(/^(\d+) × 20([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/)!;
      return [Number(digit), fromSuperscript(exponent)] as const;
    });
    return { terms, total };
  }

  it('writes zero as its single tier', () => {
    expect(toBase20Formula(toBase20(0))).toBe('0 × 20⁰ = 0');
  });

  it('keeps every zero-valued tier across the positional boundaries', () => {
    expect(toBase20Formula(toBase20(19))).toBe('19 × 20⁰ = 19');
    expect(toBase20Formula(toBase20(20))).toBe('1 × 20¹ + 0 × 20⁰ = 20');
    expect(toBase20Formula(toBase20(400))).toBe('1 × 20² + 0 × 20¹ + 0 × 20⁰ = 400');
    expect(toBase20Formula(toBase20(1202))).toBe('3 × 20² + 0 × 20¹ + 2 × 20⁰ = 1202');
  });

  it('writes digits above 9 and the exact total beyond Number.MAX_SAFE_INTEGER', () => {
    expect(toBase20Formula(BEYOND_MAX_SAFE_DIGITS)).toBe(
      '2 × 20¹² + 3 × 20¹¹ + 19 × 20¹⁰ + 12 × 20⁹ + 3 × 20⁸ + 14 × 20⁷ + 8 × 20⁶ + 7 × 20⁵ + 2 × 20⁴ + 2 × 20³ + 12 × 20² + 9 × 20¹ + 13 × 20⁰ = 9007199254740993'
    );
  });

  it('writes the largest 128-digit number exactly, as plain text without grouping', () => {
    const value = 10n ** 128n - 1n;
    const formula = toBase20Formula(toBase20(value));
    const { terms, total } = parseFormula(formula);

    expect(terms).toHaveLength(99);
    expect(terms.map(([, exponent]) => exponent)).toEqual([...Array(99).keys()].reverse());
    expect(terms.reduce((sum, [digit, exponent]) => sum + BigInt(digit) * 20n ** BigInt(exponent), 0n)).toBe(value);
    expect(total).toBe('9'.repeat(128));
    expect(formula).not.toMatch(/[<>,]/);
  });
});
