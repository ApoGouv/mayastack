import { BASE_20 } from './base20';
import { getPlaceTierBands, getTierCount, type NumeralLayout } from './tierGuides';

/**
 * One row of tier annotations: a tier of the numeral, from the bottom up, with the base-20 digit
 * each numeral group has in it. Positions are fractions (0 to 1) of the numeral's height, like
 * the tier guides', so a row follows the numeral at any zoom level.
 */
export interface TierAnnotationRow {
  /** The tier's power of 20: 0 for the bottom tier */
  exponent: number;

  /** Whole tier cell position, normalized to numeral height */
  top: number;

  /** Whole tier cell height, normalized to numeral height */
  height: number;

  /** One digit per input group, or null when that group has no such tier */
  digits: (number | null)[];
}

/**
 * The annotation rows of a numeral: one for each tier of its tallest group, bottom tier first
 * (exponent 0, 1, 2, ...). Groups are aligned at the bottom, so a row has the same exponent in
 * every group; a shorter group has no digit (null) in the rows above its own tiers.
 *
 * Positions are the Place Tier Guides' bands without their inset (getPlaceTierBands), so each row
 * is exactly the tier's cell, as MayanRenderer lays it out, and the rows tile the numeral's height.
 * Nothing is converted here: the digits are the groups' own (a zero digit is a digit, not a
 * missing one), looked up by the bottom-up exponent convention of getPlaceValues and the renderer.
 *
 * @param digitGroups - Each group's base-20 digits, highest place value first, as given to
 *   MayanRenderer
 * @param layout - The layout MayanRenderer is given
 * @returns The rows, or none for no groups or only empty groups
 * @throws RangeError if a layout value is invalid (as for getPlaceTierBands), or if any digit of
 *   any group is not an integer from 0 to 19
 */
export function getTierAnnotationRows(digitGroups: number[][], layout: NumeralLayout): TierAnnotationRow[] {
  // The same layout checks, and the same bands, as the guides (inset 0: the whole cells)
  const bands = getPlaceTierBands(digitGroups, layout, 0);

  for (const digits of digitGroups) {
    for (const digit of digits) {
      if (!Number.isInteger(digit) || digit < 0 || digit >= BASE_20) {
        throw new RangeError(`Invalid base-20 digit ${digit}: expected an integer from 0 to ${BASE_20 - 1}`);
      }
    }
  }

  const tiers = getTierCount(digitGroups);
  if (tiers === 0) return [];

  // The tallest group has a band for every exponent; any group of that height has the same rows
  const tallest = digitGroups.findIndex((digits) => digits.length === tiers);
  return bands
    .filter((band) => band.groupIndex === tallest)
    .map(({ exponent, top, height }) => ({
      exponent,
      top,
      height,
      digits: digitGroups.map((digits) => (exponent < digits.length ? digits[digits.length - 1 - exponent] : null)),
    }));
}
