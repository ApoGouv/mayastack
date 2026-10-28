import { describe, expect, it } from 'vitest';
import {
  MAX_INPUT_LENGTH,
  MAX_NUMBER_VALUE,
  MAX_SIGNIFICANT_DIGITS,
  countRedundantLeadingZeros,
  addToNumberValue,
  countSignificantDigits,
  stepNumberValue,
  validateNumberInput,
} from './numberInput';

describe('validateNumberInput', () => {
  it('accepts positive integers', () => {
    expect(validateNumberInput('7')).toEqual({ status: 'valid', value: 7n });
    expect(validateNumberInput('2025')).toEqual({ status: 'valid', value: 2025n });
  });

  it('accepts zero', () => {
    expect(validateNumberInput('0')).toEqual({ status: 'valid', value: 0n });
  });

  it('accepts leading zeros and converts them to the same value', () => {
    expect(validateNumberInput('007')).toEqual({ status: 'valid', value: 7n });
    expect(validateNumberInput('000')).toEqual({ status: 'valid', value: 0n });
  });

  it('treats empty and whitespace-only text as empty, not invalid', () => {
    expect(validateNumberInput('')).toEqual({ status: 'empty' });
    expect(validateNumberInput('   ')).toEqual({ status: 'empty' });
  });

  it('ignores surrounding whitespace, e.g. from a paste', () => {
    expect(validateNumberInput(' 42 ')).toEqual({ status: 'valid', value: 42n });
  });

  it('keeps integers beyond Number.MAX_SAFE_INTEGER exact', () => {
    expect(validateNumberInput('9007199254740993')).toEqual({
      status: 'valid',
      value: 9007199254740993n,
    });

    const fourHundredNines = '9'.repeat(400);
    expect(validateNumberInput(fourHundredNines)).toEqual({
      status: 'valid',
      value: BigInt(fourHundredNines),
    });
  });

  it.each(['12.5', '12.', '.5', '0.0'])('rejects the decimal value "%s"', (text) => {
    expect(validateNumberInput(text)).toEqual({ status: 'invalid', reason: 'decimal' });
  });

  it.each([
    '-3',
    '-0',
    '-12.5',
    '-',
    '\u22127', // "−7" with the Unicode minus sign, e.g. pasted from formatted text
  ])('rejects the negative value "%s"', (text) => {
    expect(validateNumberInput(text)).toEqual({ status: 'invalid', reason: 'negative' });
  });

  it.each([
    'abc',
    '12abc',
    '1e5',
    '+5',
    '1,000',
    '1 000',
    '1.2.3',
    '0x1F',
    '\u0663', // "٣", the Arabic-Indic digit three: only the digits 0–9 are accepted
  ])('rejects the malformed value "%s"', (text) => {
    expect(validateNumberInput(text)).toEqual({ status: 'invalid', reason: 'invalid-characters' });
  });
});

describe('validateNumberInput size limits', () => {
  const maxDigits = '9'.repeat(MAX_SIGNIFICANT_DIGITS);

  it('uses a 500-digit limit and a 1000-character input limit', () => {
    expect(MAX_SIGNIFICANT_DIGITS).toBe(500);
    expect(MAX_INPUT_LENGTH).toBe(1000);
  });

  it('accepts an integer with exactly the maximum number of digits, exactly', () => {
    expect(validateNumberInput(maxDigits)).toEqual({ status: 'valid', value: BigInt(maxDigits) });
  });

  it('rejects an integer with one digit more than the maximum', () => {
    expect(validateNumberInput('1' + maxDigits)).toEqual({
      status: 'invalid',
      reason: 'too-many-digits',
    });
  });

  it('does not count leading zeros or surrounding whitespace as digits', () => {
    expect(validateNumberInput('000' + maxDigits)).toEqual({ status: 'valid', value: BigInt(maxDigits) });
    expect(validateNumberInput(`  ${maxDigits}  `)).toEqual({ status: 'valid', value: BigInt(maxDigits) });
    expect(validateNumberInput('0'.repeat(MAX_INPUT_LENGTH))).toEqual({ status: 'valid', value: 0n });
  });

  it('accepts text of exactly the maximum length and rejects one character more', () => {
    const atLimit = '0'.repeat(MAX_INPUT_LENGTH - 1) + '7';
    expect(validateNumberInput(atLimit)).toEqual({ status: 'valid', value: 7n });
    expect(validateNumberInput('0' + atLimit)).toEqual({ status: 'invalid', reason: 'too-long' });
  });

  it('rejects over-long text of any kind, including whitespace, without parsing it', () => {
    expect(validateNumberInput('9'.repeat(1_000_000))).toEqual({ status: 'invalid', reason: 'too-long' });
    expect(validateNumberInput(' '.repeat(MAX_INPUT_LENGTH + 1))).toEqual({
      status: 'invalid',
      reason: 'too-long',
    });
  });

  it('keeps the existing reasons for long text that is invalid for another reason', () => {
    const longDigits = '1'.repeat(600);
    expect(validateNumberInput('-' + longDigits)).toEqual({ status: 'invalid', reason: 'negative' });
    expect(validateNumberInput(longDigits + '.5')).toEqual({ status: 'invalid', reason: 'decimal' });
    expect(validateNumberInput(longDigits + 'a')).toEqual({
      status: 'invalid',
      reason: 'invalid-characters',
    });
  });
});

describe('countSignificantDigits', () => {
  it('counts zero as one digit', () => {
    expect(countSignificantDigits(0n)).toBe(1);
  });

  it('counts the digits of small values and digit boundaries', () => {
    expect(countSignificantDigits(7n)).toBe(1);
    expect(countSignificantDigits(9n)).toBe(1);
    expect(countSignificantDigits(10n)).toBe(2);
    expect(countSignificantDigits(1000n)).toBe(4);
  });

  it('counts the value, so a parsed "007" has one digit', () => {
    const validation = validateNumberInput('007');
    expect(validation.status === 'valid' && countSignificantDigits(validation.value)).toBe(1);
  });

  it('counts exactly beyond Number.MAX_SAFE_INTEGER and at the 500-digit limit', () => {
    expect(countSignificantDigits(9007199254740993n)).toBe(16);
    expect(countSignificantDigits(10n ** 499n)).toBe(500);
    expect(countSignificantDigits(MAX_NUMBER_VALUE)).toBe(500);
    expect(countSignificantDigits(10n ** 500n)).toBe(501);
  });
});

describe('countRedundantLeadingZeros', () => {
  it('finds the zeros before the first significant digit', () => {
    expect(countRedundantLeadingZeros('05')).toBe(1);
    expect(countRedundantLeadingZeros('007')).toBe(2);
    expect(countRedundantLeadingZeros('0010')).toBe(2);
  });

  it('keeps one zero of an all-zero value', () => {
    expect(countRedundantLeadingZeros('0')).toBe(0);
    expect(countRedundantLeadingZeros('00')).toBe(1);
    expect(countRedundantLeadingZeros('000')).toBe(2);
  });

  it('finds none without leading zeros or in empty text', () => {
    expect(countRedundantLeadingZeros('')).toBe(0);
    expect(countRedundantLeadingZeros('5')).toBe(0);
    expect(countRedundantLeadingZeros('500')).toBe(0);
  });

  it.each(['012a', '-05', '05.5', ' 05', '05 ', '0' + '9'.repeat(501), '0'.repeat(MAX_INPUT_LENGTH + 1)])(
    'leaves "%s" as it is, since it is not exactly the digits of a valid integer',
    (text) => {
      expect(countRedundantLeadingZeros(text)).toBe(0);
    }
  );

  it('finds leading zeros before a value with the maximum number of digits', () => {
    expect(countRedundantLeadingZeros('000' + '9'.repeat(MAX_SIGNIFICANT_DIGITS))).toBe(3);
  });
});

describe('stepNumberValue', () => {
  it('adds and subtracts exactly 1', () => {
    expect(stepNumberValue(0n, 1)).toBe(1n);
    expect(stepNumberValue(41n, 1)).toBe(42n);
    expect(stepNumberValue(42n, -1)).toBe(41n);
    expect(stepNumberValue(20n, -1)).toBe(19n);
  });

  it('keeps zero at zero instead of going negative', () => {
    expect(stepNumberValue(0n, -1)).toBe(0n);
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER', () => {
    expect(stepNumberValue(9007199254740992n, 1)).toBe(9007199254740993n);
    expect(stepNumberValue(9007199254740993n, -1)).toBe(9007199254740992n);
    expect(stepNumberValue(10n ** 400n, -1)).toBe(BigInt('9'.repeat(400)));
  });

  it('keeps the largest value instead of going beyond 500 digits', () => {
    expect(MAX_NUMBER_VALUE).toBe(BigInt('9'.repeat(MAX_SIGNIFICANT_DIGITS)));
    expect(stepNumberValue(MAX_NUMBER_VALUE, 1)).toBe(MAX_NUMBER_VALUE);
    expect(stepNumberValue(MAX_NUMBER_VALUE, -1)).toBe(MAX_NUMBER_VALUE - 1n);
    expect(stepNumberValue(MAX_NUMBER_VALUE - 1n, 1)).toBe(MAX_NUMBER_VALUE);
  });
});

describe('addToNumberValue', () => {
  it.each([1n, 5n, 20n, 400n])('adds exactly %s', (step) => {
    expect(addToNumberValue(0n, step)).toBe(step);
    expect(addToNumberValue(41n, step)).toBe(41n + step);
  });

  it('crosses digit boundaries and base-20 place values exactly', () => {
    expect(addToNumberValue(9n, 1n)).toBe(10n);
    expect(addToNumberValue(19n, 1n)).toBe(20n);
    expect(addToNumberValue(399n, 1n)).toBe(400n);
    expect(addToNumberValue(7600n, 400n)).toBe(8000n);
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER', () => {
    expect(addToNumberValue(9007199254740992n, 1n)).toBe(9007199254740993n);
    expect(addToNumberValue(BigInt('9'.repeat(400)), 5n)).toBe(BigInt('1' + '0'.repeat(399) + '4'));
  });

  it.each([1n, 5n, 20n, 400n])('lands exactly on the largest value with %s', (step) => {
    expect(addToNumberValue(MAX_NUMBER_VALUE - step, step)).toBe(MAX_NUMBER_VALUE);
  });

  it.each([1n, 5n, 20n, 400n])('returns null instead of going past the largest value with %s', (step) => {
    expect(addToNumberValue(MAX_NUMBER_VALUE - step + 1n, step)).toBeNull();
    expect(addToNumberValue(MAX_NUMBER_VALUE, step)).toBeNull();
  });

  it('returns null instead of going below 0, and allows landing on 0', () => {
    expect(addToNumberValue(4n, -5n)).toBeNull();
    expect(addToNumberValue(5n, -5n)).toBe(0n);
  });
});
