import { describe, expect, it, vi } from 'vitest';
import { MAX_SIGNIFICANT_DIGITS, countSignificantDigits, validateNumberInput } from './numberInput';
import { MAX_RANDOM_DIGITS, cryptoRandomBelow, generateRandomNumberText } from './randomNumber';
import type { RandomBelow } from './randomNumber';

/** A random source that returns the given results in turn, checking each range it is asked for */
function sequence(results: [n: number, result: number][]): RandomBelow {
  let i = 0;
  return (n) => {
    const [expectedN, result] = results[i++] ?? [n, 0];
    expect(n).toBe(expectedN);
    return result;
  };
}

/** A random source that always returns the same result for each range */
const constant = (byRange: Record<number, number>): RandomBelow => (n) => byRange[n];

describe('generateRandomNumberText', () => {
  it('generates a single nonzero digit for the shortest length', () => {
    expect(generateRandomNumberText(sequence([[10, 0], [9, 0]]))).toBe('1');
    expect(generateRandomNumberText(sequence([[10, 0], [9, 8]]))).toBe('9');
  });

  it('chooses the length first, then the first digit from 1 to 9 and the others from 0 to 9', () => {
    expect(generateRandomNumberText(sequence([[10, 3], [9, 4], [10, 0], [10, 9], [10, 7]]))).toBe('5097');
  });

  it('generates at most 10 digits, well within the input’s 500-digit maximum', () => {
    expect(MAX_RANDOM_DIGITS).toBe(10);
    expect(MAX_RANDOM_DIGITS).toBeLessThan(MAX_SIGNIFICANT_DIGITS);
  });

  it('generates the longest length, 10 digits, without a leading zero', () => {
    // The length draw and the other digits both use a range of 10: 9 gives the longest length
    const text = generateRandomNumberText(sequence([[10, 9], [9, 0], ...Array.from({ length: 9 }, (): [number, number] => [10, 0])]));
    expect(text).toBe('1000000000');
    expect(validateNumberInput(text)).toEqual({ status: 'valid', value: 10n ** 9n });
  });

  it('generates the largest value, ten nines, which the input accepts', () => {
    const text = generateRandomNumberText(constant({ 9: 8, 10: 9 }));
    expect(text).toBe('9'.repeat(10));
    expect(validateNumberInput(text)).toEqual({ status: 'valid', value: 9999999999n });
  });

  it('never asks for a length range other than 1 to 10 digits', () => {
    const ranges: number[] = [];
    generateRandomNumberText((n) => { ranges.push(n); return n - 1; });
    expect(ranges[0]).toBe(MAX_RANDOM_DIGITS);
    expect(ranges).toHaveLength(MAX_RANDOM_DIGITS + 1);
  });

  it('generates valid positive integers whose digit count is the chosen length, with the real random source', () => {
    const lengths = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const text = generateRandomNumberText();
      const validation = validateNumberInput(text);
      expect(text).toMatch(/^[1-9]\d*$/);
      expect(validation.status).toBe('valid');
      if (validation.status !== 'valid') continue;
      expect(validation.value).toBeGreaterThan(0n);
      expect(countSignificantDigits(validation.value)).toBe(text.length);
      expect(text.length).toBeGreaterThanOrEqual(1);
      expect(text.length).toBeLessThanOrEqual(MAX_RANDOM_DIGITS);
      lengths.add(text.length);
    }
    // Every length from 1 to 10 occurs: a length chosen at random, not almost always 10 as for
    // a uniformly random value. The chance that 500 draws miss any of them is about 1 in 10^22
    expect([...lengths].sort((a, b) => a - b)).toEqual(Array.from({ length: MAX_RANDOM_DIGITS }, (_, i) => i + 1));
  });
});

describe('cryptoRandomBelow', () => {
  /** Fills each draw with the next of the given values */
  const draws = (values: number[]) => vi.fn((array: Uint32Array<ArrayBuffer>) => { array[0] = values.shift()!; });

  it('returns the remainder of an accepted draw', () => {
    expect(cryptoRandomBelow(10, draws([123]))).toBe(3);
    expect(cryptoRandomBelow(500, draws([0]))).toBe(0);
  });

  it('rejects draws in the incomplete last block, so every result is equally likely', () => {
    // 2^32 = 429,496,729 × 10 + 6: the draws from 4,294,967,290 up would favour 0 to 5
    const fill = draws([4294967290, 4294967295, 4294967289]);
    expect(cryptoRandomBelow(10, fill)).toBe(9);
    expect(fill).toHaveBeenCalledTimes(3);
  });

  it('accepts every draw when n divides 2^32', () => {
    const fill = draws([4294967295]);
    expect(cryptoRandomBelow(2 ** 32, fill)).toBe(4294967295);
    expect(cryptoRandomBelow(1, draws([4294967295]))).toBe(0);
    expect(fill).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, 1.5, Number.NaN, 2 ** 32 + 1])('rejects the range %s', (n) => {
    expect(() => cryptoRandomBelow(n, draws([0]))).toThrow(RangeError);
  });

  it('uses crypto.getRandomValues by default', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues');
    const result = cryptoRandomBelow(9);
    expect(spy).toHaveBeenCalled();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(9);
    spy.mockRestore();
  });
});
