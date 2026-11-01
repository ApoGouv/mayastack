import { describe, expect, it } from 'vitest';
import { toBase20 } from './base20';
import {
  findPlaceTierBand,
  getNumeralSize,
  getPlaceTierBands,
  getTierHairlines,
  PLACE_TIER_BAND_INSET,
  TIER_GUIDE_SIDE_INSET,
  type NumeralLayout,
} from './tierGuides';

// The layouts HomeView gives MayanRenderer
const NUMBER: NumeralLayout = { heightPerGlyphStack: 80, widthPerGroup: 350, spacing: 25 };
const DATE: NumeralLayout = { heightPerGlyphStack: 80, widthPerGroup: 100, spacing: 25 };

/** A fraction of a size in SVG units, rounded to remove floating-point noise */
const units = (fraction: number, size: number) => Math.round(fraction * size * 1e9) / 1e9;
/** A guide's horizontal extent in SVG units, for a numeral `width` units wide */
const across = (guide: { left: number; width: number }, width: number) => [
  units(guide.left, width),
  units(guide.left + guide.width, width),
];

describe('getNumeralSize', () => {
  it('gives the size of the renderer’s SVG', () => {
    expect(getNumeralSize([[7]], NUMBER)).toEqual({ width: 350, height: 80 });
    expect(getNumeralSize([toBase20(10n ** 128n - 1n)], NUMBER)).toEqual({ width: 350, height: 7920 });
    // Three groups, 100 wide and 25 apart, as tall as the tallest group
    expect(getNumeralSize([[1, 5], [10], [5, 1, 6]], DATE)).toEqual({ width: 350, height: 240 });
  });

  it('is empty without groups', () => {
    expect(getNumeralSize([], NUMBER)).toEqual({ width: 0, height: 0 });
  });
});

describe('the guides’ side inset', () => {
  it('leaves 3% of the group’s width clear at each side, the guides centred in it', () => {
    expect(TIER_GUIDE_SIDE_INSET).toBe(0.03);
    // Number mode: 10.5 of 350 units at each side
    expect(across(getTierHairlines([[1, 0]], NUMBER)[0], 350)).toEqual([10.5, 339.5]);
    expect(across(getPlaceTierBands([[1, 0]], NUMBER)[0], 350)).toEqual([10.5, 339.5]);
  });

  it('is the same for the hairlines and the bands of every group', () => {
    const groups = [toBase20(25), toBase20(10), toBase20(2026)];
    const lines = getTierHairlines(groups, DATE);
    const bands = getPlaceTierBands(groups, DATE);
    for (const line of lines) {
      for (const band of bands.filter(({ groupIndex }) => groupIndex === line.groupIndex)) {
        expect(across(band, 350)).toEqual(across(line, 350));
      }
    }
    // Date mode: 3 of 100 units at each side, in each group 125 units after the last
    expect(bands.map((band) => across(band, 350))).toEqual([
      [3, 97], [3, 97],
      [128, 222],
      [253, 347], [253, 347], [253, 347],
    ]);
  });
});

describe('getTierHairlines', () => {
  it('draws no line for a single tier', () => {
    expect(getTierHairlines([[0]], NUMBER)).toEqual([]);
    expect(getTierHairlines([[19]], NUMBER)).toEqual([]);
  });

  it('draws one line across the group between two tiers', () => {
    const [line] = getTierHairlines([[1, 0]], NUMBER);
    expect(line).toMatchObject({ groupIndex: 0, boundary: 1, top: 0.5 });
    expect(line.left).toBeCloseTo(0.03, 12);
    expect(line.width).toBeCloseTo(0.94, 12);
  });

  it('draws a line at each tier boundary of the largest number, never at its outer edges', () => {
    const digits = toBase20(10n ** 128n - 1n);
    expect(digits).toHaveLength(99);

    const lines = getTierHairlines([digits], NUMBER);
    expect(lines).toHaveLength(98);
    lines.forEach((line, i) => {
      // Exactly the ratio of whole numbers: no rounding accumulates from one tier to the next
      expect(line).toMatchObject({ groupIndex: 0, boundary: i + 1, top: (98 - i) / 99 });
      expect(line.top).toBeGreaterThan(0);
      expect(line.top).toBeLessThan(1);
    });
    // In SVG units, each boundary is a multiple of the tier height, to within rounding
    lines.forEach((line, i) => expect(line.top * 7920).toBeCloseTo((98 - i) * 80, 9));
  });

  it('places each Date-mode group’s lines independently, within its own width', () => {
    // Day 25 (2 tiers), month 10 (1 tier) and year 2026 (3 tiers), aligned at the bottom
    const groups = [toBase20(25), toBase20(10), toBase20(2026)];
    expect(groups.map((digits) => digits.length)).toEqual([2, 1, 3]);

    const lines = getTierHairlines(groups, DATE);
    expect(lines.map(({ groupIndex, boundary, top }) => [groupIndex, boundary, units(top, 240)])).toEqual([
      // Day: one line, one tier up from the bottom of the 3-tier-tall numeral
      [0, 1, 160],
      // Month: none. Year: two lines
      [2, 1, 160],
      [2, 2, 80],
    ]);
    expect(lines.map((line) => across(line, 350))).toEqual([[3, 97], [253, 347], [253, 347]]);
  });

  it('draws nothing without groups', () => {
    expect(getTierHairlines([], NUMBER)).toEqual([]);
  });

  it('rejects invalid layout values', () => {
    for (const layout of [
      { ...NUMBER, heightPerGlyphStack: 0 },
      { ...NUMBER, heightPerGlyphStack: -80 },
      { ...NUMBER, heightPerGlyphStack: NaN },
      { ...NUMBER, widthPerGroup: 0 },
      { ...NUMBER, widthPerGroup: Infinity },
      { ...NUMBER, spacing: -1 },
      { ...NUMBER, spacing: NaN },
    ]) {
      expect(() => getTierHairlines([[1, 0]], layout)).toThrow(RangeError);
    }
    // No spacing is a valid layout: the second group starts halfway, then its inset
    expect(units(getTierHairlines([[1, 0], [1, 0]], { ...NUMBER, spacing: 0 })[1].left, 700)).toBe(360.5);
  });
});

describe('getPlaceTierBands', () => {
  /** A band's top and bottom edges in SVG units, for a numeral `height` units tall */
  const edges = (band: { top: number; height: number }, height: number) => [
    units(band.top, height),
    units(band.top + band.height, height),
  ];

  it('leaves a small gap at the top and bottom of each tier', () => {
    expect(PLACE_TIER_BAND_INSET).toBe(2);
  });

  it('shades the one tier of a single-tier numeral, less the insets', () => {
    const [band] = getPlaceTierBands([[7]], NUMBER);
    expect(band).toMatchObject({ groupIndex: 0, exponent: 0 });
    expect(edges(band, 80)).toEqual([2, 78]);
    expect(across(band, 350)).toEqual([10.5, 339.5]);
  });

  it('shades each tier of a group, bottom tier first, with a gap between adjacent bands', () => {
    const bands = getPlaceTierBands([[1, 0, 0]], NUMBER);
    expect(bands.map(({ exponent }) => exponent)).toEqual([0, 1, 2]);
    // The tier of exponent e fills its cell, (2 − e) × 80 to (3 − e) × 80, less 2 at each end
    expect(bands.map((band) => edges(band, 240))).toEqual([
      [162, 238],
      [82, 158],
      [2, 78],
    ]);
  });

  it('shades every tier of the largest number within the numeral, without rounding drift', () => {
    const digits = toBase20(10n ** 128n - 1n);
    const bands = getPlaceTierBands([digits], NUMBER);
    expect(bands).toHaveLength(99);
    bands.forEach((band, e) => {
      expect(band.top).toBe(((98 - e) * 80 + 2) / 7920);
      expect(band.height).toBe(76 / 7920);
      expect(band.top).toBeGreaterThan(0);
      expect(band.top + band.height).toBeLessThan(1);
    });
  });

  it('shades only the actual tiers of each Date-mode group, nothing above shorter groups', () => {
    // Day 25 (2 tiers), month 10 (1 tier) and year 2026 (3 tiers), aligned at the bottom
    const groups = [toBase20(25), toBase20(10), toBase20(2026)];
    const bands = getPlaceTierBands(groups, DATE);
    expect(bands.map((band) => [band.groupIndex, band.exponent, edges(band, 240)])).toEqual([
      [0, 0, [162, 238]],
      [0, 1, [82, 158]],
      [1, 0, [162, 238]],
      [2, 0, [162, 238]],
      [2, 1, [82, 158]],
      [2, 2, [2, 78]],
    ]);
    // Nothing above the day's second tier or the month's first: the top 80 units are the year's alone
    bands
      .filter(({ groupIndex }) => groupIndex !== 2)
      .forEach((band) => expect(band.top * 240).toBeGreaterThanOrEqual(80));
  });

  it('lies between the dividing hairlines, never across one', () => {
    const groups = [toBase20(25), toBase20(10), toBase20(2026)];
    const bands = getPlaceTierBands(groups, DATE);
    for (const line of getTierHairlines(groups, DATE)) {
      for (const band of bands.filter(({ groupIndex }) => groupIndex === line.groupIndex)) {
        const inside = line.top > band.top && line.top < band.top + band.height;
        expect(inside).toBe(false);
      }
    }
  });

  it('shades nothing without groups', () => {
    expect(getPlaceTierBands([], NUMBER)).toEqual([]);
  });

  it('takes another inset, including none', () => {
    expect(edges(getPlaceTierBands([[1, 0]], NUMBER, 0)[0], 160)).toEqual([80, 160]);
    expect(edges(getPlaceTierBands([[1, 0]], NUMBER, 10)[1], 160)).toEqual([10, 70]);
  });

  it('rejects invalid layout values and insets', () => {
    for (const layout of [
      { ...NUMBER, heightPerGlyphStack: 0 },
      { ...NUMBER, heightPerGlyphStack: -80 },
      { ...NUMBER, heightPerGlyphStack: NaN },
      { ...NUMBER, widthPerGroup: 0 },
      { ...NUMBER, widthPerGroup: Infinity },
      { ...NUMBER, spacing: -1 },
      { ...NUMBER, spacing: NaN },
    ]) {
      expect(() => getPlaceTierBands([[1, 0]], layout)).toThrow(RangeError);
    }
    for (const inset of [-1, NaN, Infinity, 40, 41]) {
      expect(() => getPlaceTierBands([[1, 0]], NUMBER, inset)).toThrow(RangeError);
    }
    // No spacing is a valid layout
    expect(units(getPlaceTierBands([[1, 0], [1, 0]], { ...NUMBER, spacing: 0 })[2].left, 700)).toBe(360.5);
  });
});

describe('findPlaceTierBand', () => {
  const groups = [toBase20(25), toBase20(10), toBase20(2026)]; // 2, 1 and 3 tiers
  const bands = getPlaceTierBands(groups, DATE);
  /** The band at a point given in SVG units of the 350 × 240 Date-mode numeral */
  const at = (x: number, y: number) => {
    const band = findPlaceTierBand(bands, x / 350, y / 240);
    return band && [band.groupIndex, band.exponent];
  };

  it('finds the band under a point', () => {
    expect(at(50, 200)).toEqual([0, 0]);
    expect(at(50, 120)).toEqual([0, 1]);
    expect(at(175, 200)).toEqual([1, 0]);
    expect(at(300, 40)).toEqual([2, 2]);
    // Its edges belong to it
    expect(at(3, 162)).toEqual([0, 0]);
    expect(at(97, 238)).toEqual([0, 0]);
  });

  it('finds none between bands, beside them, or above a shorter group', () => {
    expect(at(50, 80)).toBeUndefined(); // the gap between the day's tiers
    expect(at(1, 200)).toBeUndefined(); // the side inset
    expect(at(110, 200)).toBeUndefined(); // the spacing between groups
    expect(at(50, 40)).toBeUndefined(); // above the day's two tiers
    expect(at(175, 120)).toBeUndefined(); // above the month's one tier
    expect(at(-10, 200)).toBeUndefined();
    expect(findPlaceTierBand([], 0.5, 0.5)).toBeUndefined();
  });
});
