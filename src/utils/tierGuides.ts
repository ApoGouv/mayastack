/**
 * Geometry of the screen-only tier guides, in the coordinate system of MayanRenderer's SVG:
 * - Dividing Hairlines: one horizontal line between consecutive tiers (place values) of each
 *   numeral group.
 * - Place Tier Guides: one shaded band per tier of each group, with a small gap between bands.
 *
 * MayanRenderer lays out its groups side by side, each `widthPerGroup` wide and `spacing` apart,
 * and stacks each group's tiers, `heightPerGlyphStack` tall, from the bottom of an SVG as tall as
 * the group with the most tiers. The calculations here follow the same layout; HomeView passes
 * both the same values, and HomeView.test.tsx checks the result against the rendered SVG.
 */

/** The layout values MayanRenderer is given, in SVG user units */
export interface NumeralLayout {
  heightPerGlyphStack: number;
  widthPerGroup: number;
  spacing: number;
}

/** One hairline, positioned as fractions (0 to 1) of the numeral's logical width and height */
export interface TierHairline {
  /** The numeral group the line belongs to, e.g. 0 for the day in Date mode */
  groupIndex: number;
  /** The tiers of its group below the line: it lies between the tiers of exponents k and k − 1 */
  boundary: number;
  top: number;
  left: number;
  width: number;
}

/** One place tier band, positioned as fractions (0 to 1) of the numeral's logical width and height */
export interface PlaceTierBand {
  /** The numeral group the band belongs to, e.g. 0 for the day in Date mode */
  groupIndex: number;
  /** The exponent of the band's tier: 0 for the bottom tier of its group */
  exponent: number;
  top: number;
  height: number;
  left: number;
  width: number;
}

/**
 * The SVG units left unshaded at the top and at the bottom of each tier's cell, so that
 * adjacent bands are visibly apart. Glyphs lie well inside their cell (from about 41 to 75 of
 * its 80 units), so a band always covers its tier's glyphs completely.
 */
export const PLACE_TIER_BAND_INSET = 2;

/**
 * The fraction of a group's width left clear at each side of its guides, both bands and
 * hairlines: they are 94% as wide as the group, centred in it. Glyphs are at most 46 units wide
 * (four dots), well within 94% of the narrowest group (100 units).
 */
export const TIER_GUIDE_SIDE_INSET = 0.03;

/** The numeral's logical size, as MayanRenderer gives its SVG (width, height and viewBox) */
export function getNumeralSize(
  digitGroups: number[][],
  { heightPerGlyphStack, widthPerGroup, spacing }: NumeralLayout
): { width: number; height: number } {
  const groups = digitGroups.length;
  return {
    width: groups > 0 ? widthPerGroup * groups + spacing * (groups - 1) : 0,
    height: Math.max(0, ...digitGroups.map((digits) => digits.length)) * heightPerGlyphStack,
  };
}

const isPositive = (value: number) => Number.isFinite(value) && value > 0;

// A group's guides, from the left of the numeral, as fractions of its width
function guideSpan(groupIndex: number, { widthPerGroup, spacing }: NumeralLayout, totalWidth: number) {
  const inset = widthPerGroup * TIER_GUIDE_SIDE_INSET;
  return {
    left: (groupIndex * (widthPerGroup + spacing) + inset) / totalWidth,
    width: (widthPerGroup - 2 * inset) / totalWidth,
  };
}

// Throws a RangeError unless the layout's values are finite and positive (spacing may be 0)
function assertValidLayout({ heightPerGlyphStack, widthPerGroup, spacing }: NumeralLayout): void {
  if (!isPositive(heightPerGlyphStack) || !isPositive(widthPerGroup) || !(Number.isFinite(spacing) && spacing >= 0)) {
    throw new RangeError(
      `Invalid numeral layout: heightPerGlyphStack ${heightPerGlyphStack}, widthPerGroup ${widthPerGroup}, spacing ${spacing}`
    );
  }
}

/**
 * The Dividing Hairlines of a numeral: for each group of n tiers, n − 1 lines at its tier
 * boundaries, as wide as the group less TIER_GUIDE_SIDE_INSET at each side. A single tier has none, and no line is ever at the outer
 * top or bottom edge. Positions are ratios of whole numbers, so they do not accumulate
 * rounding errors.
 *
 * @param digitGroups - Each group's base-20 digits, highest place value first
 * @param layout - The layout MayanRenderer is given
 * @returns The lines, or none for no groups
 * @throws RangeError if a layout value is not finite, or not positive (spacing may be 0)
 */
export function getTierHairlines(digitGroups: number[][], layout: NumeralLayout): TierHairline[] {
  assertValidLayout(layout);
  if (digitGroups.length === 0) return [];

  const { width: totalWidth } = getNumeralSize(digitGroups, layout);
  // The tallest group's tier count: the SVG is this many tiers tall
  const maxTiers = Math.max(...digitGroups.map((digits) => digits.length));

  const lines: TierHairline[] = [];
  digitGroups.forEach((digits, groupIndex) => {
    const { left, width } = guideSpan(groupIndex, layout, totalWidth);
    // Groups are aligned at the bottom: the boundary k tiers up is (maxTiers − k) tiers down
    for (let boundary = 1; boundary < digits.length; boundary++) {
      lines.push({ groupIndex, boundary, top: (maxTiers - boundary) / maxTiers, left, width });
    }
  });
  return lines;
}

/**
 * The Place Tier Guides of a numeral: one band per actual tier of each group, as wide as the
 * group less TIER_GUIDE_SIDE_INSET at each side (as the hairlines), and as tall as the tier's
 * cell less `inset` at its top and bottom. A group shorter than
 * the tallest has no band above its own tiers, so no band suggests a place it does not have.
 *
 * @param digitGroups - Each group's base-20 digits, highest place value first
 * @param layout - The layout MayanRenderer is given
 * @param inset - The SVG units left unshaded at the top and bottom of each cell
 * @returns The bands, bottom tier first within each group, or none for no groups
 * @throws RangeError if a layout value is invalid (as for getTierHairlines), or if the inset is
 *   not finite, is negative, or leaves no band
 */
export function getPlaceTierBands(
  digitGroups: number[][],
  layout: NumeralLayout,
  inset: number = PLACE_TIER_BAND_INSET
): PlaceTierBand[] {
  assertValidLayout(layout);
  const { heightPerGlyphStack } = layout;
  if (!(Number.isFinite(inset) && inset >= 0 && 2 * inset < heightPerGlyphStack)) {
    throw new RangeError(`Invalid place tier band inset ${inset} for heightPerGlyphStack ${heightPerGlyphStack}`);
  }
  if (digitGroups.length === 0) return [];

  const { width: totalWidth, height: totalHeight } = getNumeralSize(digitGroups, layout);
  const maxTiers = Math.max(...digitGroups.map((digits) => digits.length));
  const height = (heightPerGlyphStack - 2 * inset) / totalHeight;

  const bands: PlaceTierBand[] = [];
  digitGroups.forEach((digits, groupIndex) => {
    const { left, width } = guideSpan(groupIndex, layout, totalWidth);
    // Groups are aligned at the bottom: the cell of exponent e starts (maxTiers − 1 − e) tiers down
    for (let exponent = 0; exponent < digits.length; exponent++) {
      const top = ((maxTiers - 1 - exponent) * heightPerGlyphStack + inset) / totalHeight;
      bands.push({ groupIndex, exponent, top, height, left, width });
    }
  });
  return bands;
}

/**
 * The band under a point of the numeral, e.g. the pointer, or undefined between bands
 *
 * @param bands - The bands, from getPlaceTierBands
 * @param x - The point's distance from the numeral's left edge, as a fraction of its width
 * @param y - The point's distance from the numeral's top edge, as a fraction of its height
 */
export function findPlaceTierBand(bands: PlaceTierBand[], x: number, y: number): PlaceTierBand | undefined {
  return bands.find(
    (band) => x >= band.left && x <= band.left + band.width && y >= band.top && y <= band.top + band.height
  );
}
