/**
 * The maximum number of significant digits (leading zeros aside) the number
 * input converts. 500 decimal digits are at most 385 base-20 digits, which
 * keeps the glyph stack and its SVG to a size the browser renders quickly.
 */
export const MAX_SIGNIFICANT_DIGITS = 500;

/**
 * The maximum length of the raw input text, surrounding whitespace and
 * leading zeros included. It bounds the work done on any pasted text, so even
 * a huge paste is reported quickly instead of being scanned or parsed.
 */
export const MAX_INPUT_LENGTH = 1000;

/**
 * Why a number input value cannot be converted.
 */
export type NumberInputError =
  | 'negative'
  | 'decimal'
  | 'invalid-characters'
  | 'too-many-digits'
  | 'too-long';

/**
 * The result of validating the text of the number input.
 *
 * - `empty`: nothing to convert yet (the user may still be typing)
 * - `valid`: a non-negative integer, as an exact bigint
 * - `invalid`: text that cannot be converted, with the reason
 */
export type NumberInputValidation =
  | { status: 'empty' }
  | { status: 'valid'; value: bigint }
  | { status: 'invalid'; reason: NumberInputError };

/**
 * Validates the text of the number input as a non-negative integer.
 *
 * The text is never altered into a different number: anything other than
 * digits (surrounding whitespace aside) is reported as invalid instead of
 * being stripped. Leading zeros are allowed ("007" is 7). The value is parsed
 * with BigInt, so integers stay exact.
 *
 * Text longer than MAX_INPUT_LENGTH is reported as 'too-long' before anything
 * else, and integers with more than MAX_SIGNIFICANT_DIGITS digits (leading
 * zeros aside) as 'too-many-digits'. The text is never truncated.
 *
 * Example:
 *   validateNumberInput('')     => { status: 'empty' }
 *   validateNumberInput('007')  => { status: 'valid', value: 7n }
 *   validateNumberInput('12.5') => { status: 'invalid', reason: 'decimal' }
 *   validateNumberInput('-3')   => { status: 'invalid', reason: 'negative' }
 *   validateNumberInput('1e5')  => { status: 'invalid', reason: 'invalid-characters' }
 *
 * @param text - The raw text of the input
 * @returns The validation result
 */
export function validateNumberInput(text: string): NumberInputValidation {
  if (text.length > MAX_INPUT_LENGTH) return { status: 'invalid', reason: 'too-long' };

  const trimmed = text.trim();

  if (trimmed === '') return { status: 'empty' };

  if (/^\d+$/.test(trimmed)) {
    // Leading zeros don't count towards the limit ("007" has one significant digit)
    const significantDigits = trimmed.replace(/^0+(?=\d)/, '').length;
    if (significantDigits > MAX_SIGNIFICANT_DIGITS) {
      return { status: 'invalid', reason: 'too-many-digits' };
    }

    return { status: 'valid', value: BigInt(trimmed) };
  }

  // A leading minus sign (ASCII hyphen-minus or Unicode minus)
  if (/^[-\u2212]/.test(trimmed)) return { status: 'invalid', reason: 'negative' };

  // Digits with a single decimal point, e.g. "12.5", "12." or ".5"
  if (/^(\d+\.\d*|\.\d+)$/.test(trimmed)) return { status: 'invalid', reason: 'decimal' };

  return { status: 'invalid', reason: 'invalid-characters' };
}

/**
 * The largest value the number input converts: 500 nines, i.e. 10^500 - 1.
 */
export const MAX_NUMBER_VALUE = 10n ** BigInt(MAX_SIGNIFICANT_DIGITS) - 1n;

/**
 * Counts the significant digits of a non-negative integer. Zero has one.
 *
 * A bigint has no leading zeros, so this is the length of its decimal digits.
 *
 * Example:
 *   countSignificantDigits(0n)    => 1
 *   countSignificantDigits(1000n) => 4
 *
 * @param value - A non-negative integer
 * @returns The number of significant digits
 */
export function countSignificantDigits(value: bigint): number {
  return value.toString().length;
}

/**
 * Counts the leading zeros that can be removed from the text of the number
 * input without changing its value, e.g. the "0" of "05" (typed after the
 * initial 0) or the "00" of a pasted "007". A single "0" keeps its zero.
 *
 * Only text that is exactly the digits of a valid integer counts: text with
 * surrounding whitespace, invalid text and over-long text are left as they are
 * (0), so they keep their validation message.
 *
 * Example:
 *   countRedundantLeadingZeros('05')   => 1
 *   countRedundantLeadingZeros('000')  => 2
 *   countRedundantLeadingZeros('0')    => 0
 *   countRedundantLeadingZeros('012a') => 0
 *
 * @param text - The raw text of the input
 * @returns The number of leading zeros to remove
 */
export function countRedundantLeadingZeros(text: string): number {
  if (!/^\d+$/.test(text) || validateNumberInput(text).status !== 'valid') return 0;

  return text.match(/^0+(?=\d)/)?.[0].length ?? 0;
}

/**
 * Adds 1 to or subtracts 1 from a value of the number input, exactly.
 *
 * The result stays within 0 to MAX_NUMBER_VALUE: at either end, the value is
 * returned unchanged rather than leaving the supported range.
 *
 * Example:
 *   stepNumberValue(41n, 1)  => 42n
 *   stepNumberValue(0n, -1)  => 0n
 *
 * @param value - A value from 0 to MAX_NUMBER_VALUE
 * @param direction - 1 to increment, -1 to decrement
 * @returns The new value, or the same value at the end of the range
 */
export function stepNumberValue(value: bigint, direction: 1 | -1): bigint {
  const next = value + BigInt(direction);
  return next < 0n || next > MAX_NUMBER_VALUE ? value : next;
}

/**
 * Adds a step to a value of the number input, exactly, or returns null when
 * the result would leave 0 to MAX_NUMBER_VALUE. The result is never clamped,
 * so a step that cannot be taken in full is not taken at all. Landing exactly
 * on either end is allowed.
 *
 * Example:
 *   addToNumberValue(41n, 20n)                    => 61n
 *   addToNumberValue(MAX_NUMBER_VALUE - 5n, 5n)   => MAX_NUMBER_VALUE
 *   addToNumberValue(MAX_NUMBER_VALUE - 4n, 5n)   => null
 *
 * @param value - A value from 0 to MAX_NUMBER_VALUE
 * @param step - The amount to add (negative to subtract)
 * @returns The new value, or null when it would be out of range
 */
export function addToNumberValue(value: bigint, step: bigint): bigint | null {
  const next = value + step;
  return next < 0n || next > MAX_NUMBER_VALUE ? null : next;
}
