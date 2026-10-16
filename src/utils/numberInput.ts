/**
 * Why a number input value cannot be converted.
 */
export type NumberInputError = 'negative' | 'decimal' | 'invalid-characters';

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
 * with BigInt, so integers of any length stay exact.
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
  const trimmed = text.trim();

  if (trimmed === '') return { status: 'empty' };

  if (/^\d+$/.test(trimmed)) {
    return { status: 'valid', value: BigInt(trimmed) };
  }

  // A leading minus sign (ASCII hyphen-minus or Unicode minus)
  if (/^[-\u2212]/.test(trimmed)) return { status: 'invalid', reason: 'negative' };

  // Digits with a single decimal point, e.g. "12.5", "12." or ".5"
  if (/^(\d+\.\d*|\.\d+)$/.test(trimmed)) return { status: 'invalid', reason: 'decimal' };

  return { status: 'invalid', reason: 'invalid-characters' };
}
