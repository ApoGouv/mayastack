import { describe, expect, it } from 'vitest';
import { MAX_INPUT_LENGTH, MAX_SIGNIFICANT_DIGITS, validateNumberInput } from './numberInput';

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
