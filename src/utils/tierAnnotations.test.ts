import { describe, expect, it } from 'vitest';
import { getPlaceValues, toBase20 } from './base20';
import { getPlaceTierBands, type NumeralLayout } from './tierGuides';
import { getTierAnnotationRows } from './tierAnnotations';

// The layouts HomeView gives MayanRenderer
const NUMBER: NumeralLayout = { heightPerGlyphStack: 80, widthPerGroup: 350, spacing: 25 };
const DATE: NumeralLayout = { heightPerGlyphStack: 80, widthPerGroup: 100, spacing: 25 };

/** A Date-mode numeral's groups, as HomeView converts them: day, month and year */
const dateGroups = (day: number, month: number, year: number) => [toBase20(day), toBase20(month), toBase20(year)];

/** What each row says, without its geometry */
const summary = (rows: ReturnType<typeof getTierAnnotationRows>) => rows.map(({ exponent, digits }) => ({ exponent, digits }));

describe('getTierAnnotationRows', () => {
  describe('Number mode', () => {
    it('gives zero its one tier: the shell digit 0, the whole numeral', () => {
      expect(getTierAnnotationRows([toBase20(0)], NUMBER)).toEqual([{ exponent: 0, top: 0, height: 1, digits: [0] }]);
    });

    it('gives a single-tier value one row, whatever its digit', () => {
      for (const value of [1, 7, 19]) {
        expect(getTierAnnotationRows([toBase20(value)], NUMBER)).toEqual([
          { exponent: 0, top: 0, height: 1, digits: [value] },
        ]);
      }
    });

    it('lists the tiers bottom up, each with its own digit', () => {
      // 123 = 6 × 20 + 3: the top tier is the 6
      expect(summary(getTierAnnotationRows([toBase20(123)], NUMBER))).toEqual([
        { exponent: 0, digits: [3] },
        { exponent: 1, digits: [6] },
      ]);
      // A larger value: the rows follow its converted digits, lowest first
      const digits = toBase20(3047620);
      const rows = getTierAnnotationRows([digits], NUMBER);
      expect(rows.map((row) => row.exponent)).toEqual(digits.map((_, i) => i));
      expect(rows.map((row) => row.digits[0])).toEqual([...digits].reverse());
    });

    it('keeps the zero digits: internal zero tiers and a zero lowest tier are rows, not gaps', () => {
      // 20² = 1 0 0; 20² + 5 = 1 0 5; 3 × 20 = 3 0
      expect(summary(getTierAnnotationRows([toBase20(400)], NUMBER))).toEqual([
        { exponent: 0, digits: [0] },
        { exponent: 1, digits: [0] },
        { exponent: 2, digits: [1] },
      ]);
      expect(summary(getTierAnnotationRows([toBase20(405)], NUMBER))).toEqual([
        { exponent: 0, digits: [5] },
        { exponent: 1, digits: [0] },
        { exponent: 2, digits: [1] },
      ]);
      expect(summary(getTierAnnotationRows([toBase20(60)], NUMBER))).toEqual([
        { exponent: 0, digits: [0] },
        { exponent: 1, digits: [3] },
      ]);
      // A zero digit is never taken for a missing one
      for (const row of getTierAnnotationRows([toBase20(400)], NUMBER)) expect(row.digits[0]).not.toBeNull();
    });

    it('agrees with the place values of the digits, in the opposite order', () => {
      for (const value of [0n, 7n, 19n, 20n, 123n, 400n, 8000n, 3047620n, 9007199254740993n, 10n ** 40n + 7n]) {
        const digits = toBase20(value);
        const rows = getTierAnnotationRows([digits], NUMBER);
        const placeValues = getPlaceValues(digits).reverse();
        expect(rows.map(({ exponent, digits: [digit] }) => [exponent, digit]), `${value}`).toEqual(
          placeValues.map(({ exponent, digit }) => [exponent, digit])
        );
      }
    });

    it('gives the largest supported number 99 rows, exponents 0 to 98, each with its digit', () => {
      const digits = toBase20(10n ** 128n - 1n);
      expect(digits).toHaveLength(99);
      const rows = getTierAnnotationRows([digits], NUMBER);
      expect(rows).toHaveLength(99);
      expect(rows.map((row) => row.exponent)).toEqual(Array.from({ length: 99 }, (_, e) => e));
      expect(rows.map((row) => row.digits[0])).toEqual([...digits].reverse());
      for (const row of rows) {
        expect(Number.isFinite(row.top) && Number.isFinite(row.height)).toBe(true);
        expect(row.top).toBeGreaterThanOrEqual(0);
        expect(row.top + row.height).toBeLessThanOrEqual(1 + 1e-12);
      }
    });
  });

  describe('Date mode', () => {
    it('gives a row to each tier of the tallest group, with each group’s digit or null (day 25, month 10, year 2026)', () => {
      const groups = dateGroups(25, 10, 2026);
      // The conversions, for the reader: day 1 5, month 10, year 5 1 6
      expect(groups).toEqual([[1, 5], [10], [5, 1, 6]]);
      expect(summary(getTierAnnotationRows(groups, DATE))).toEqual([
        { exponent: 0, digits: [5, 10, 6] },
        { exponent: 1, digits: [1, null, 1] },
        { exponent: 2, digits: [null, null, 5] },
      ]);
    });

    it('has the same power in every group of a row: groups are aligned at the bottom', () => {
      const rows = getTierAnnotationRows(dateGroups(25, 10, 2026), DATE);
      // Every group's lowest tier is in the bottom row, whatever its height
      expect(rows[0].digits.every((digit) => digit !== null)).toBe(true);
      // The rows tile the year's three tiers: the numeral is as tall as its tallest group
      expect(rows.map((row) => row.top)).toEqual([2 / 3, 1 / 3, 0]);
    });

    it('follows a shorter year: two tiers, and the day may be the taller group', () => {
      // 399 = 19 19; day 31 = 1 11; month 1
      const groups = dateGroups(31, 1, 399);
      expect(groups).toEqual([[1, 11], [1], [19, 19]]);
      expect(summary(getTierAnnotationRows(groups, DATE))).toEqual([
        { exponent: 0, digits: [11, 1, 19] },
        { exponent: 1, digits: [1, null, 19] },
      ]);
      // A one-tier year, as the numeral then has as many tiers as its tallest group, the day's
      expect(summary(getTierAnnotationRows(dateGroups(25, 10, 7), DATE))).toEqual([
        { exponent: 0, digits: [5, 10, 7] },
        { exponent: 1, digits: [1, null, null] },
      ]);
      // And one tier throughout
      expect(summary(getTierAnnotationRows(dateGroups(5, 3, 9), DATE))).toEqual([{ exponent: 0, digits: [5, 3, 9] }]);
    });

    it('follows a longer year: 8000 is four tiers, with zero tiers kept', () => {
      const groups = dateGroups(15, 1, 8000);
      expect(groups).toEqual([[15], [1], [1, 0, 0, 0]]);
      expect(summary(getTierAnnotationRows(groups, DATE))).toEqual([
        { exponent: 0, digits: [15, 1, 0] },
        { exponent: 1, digits: [null, null, 0] },
        { exponent: 2, digits: [null, null, 0] },
        { exponent: 3, digits: [null, null, 1] },
      ]);
    });
  });

  describe('geometry', () => {
    const cases: [string, number[][], NumeralLayout][] = [
      ['zero', [toBase20(0)], NUMBER],
      ['one tier', [toBase20(19)], NUMBER],
      ['three tiers', [toBase20(3047620)], NUMBER],
      ['the largest number', [toBase20(10n ** 128n - 1n)], NUMBER],
      ['a date', dateGroups(25, 10, 2026), DATE],
      ['a date with a four-tier year', dateGroups(15, 1, 8000), DATE],
      ['a date with a two-tier year', dateGroups(31, 12, 399), DATE],
    ];

    it.each(cases)('is the whole tier cells of the guides’ bands, without their inset (%s)', (_, groups, layout) => {
      const rows = getTierAnnotationRows(groups, layout);
      const tallest = Math.max(...groups.map((digits) => digits.length));
      const bands = getPlaceTierBands(groups, layout, 0).filter(({ groupIndex }) => groups[groupIndex].length === tallest);
      // The first group of the tallest height supplies the rows
      const first = bands.filter(({ groupIndex }) => groupIndex === bands[0].groupIndex);
      expect(rows.map(({ exponent, top, height }) => ({ exponent, top, height }))).toEqual(
        first.map(({ exponent, top, height }) => ({ exponent, top, height }))
      );
    });

    it.each(cases)('tiles the numeral’s height, bottom up, with no gaps or overlaps (%s)', (_, groups, layout) => {
      const rows = getTierAnnotationRows(groups, layout);
      const tiers = rows.length;
      // One equal cell per tier; the lowest ends at the numeral's bottom edge, the highest starts at its top
      expect(rows[tiers - 1].top).toBe(0);
      expect(rows[0].top + rows[0].height).toBeCloseTo(1, 12);
      rows.forEach((row, i) => {
        expect(row.height).toBe(1 / tiers);
        expect(row.top).toBe((tiers - 1 - i) / tiers);
        if (i > 0) expect(row.top).toBeCloseTo(rows[i - 1].top - row.height, 12);
      });
    });

    it('does not depend on the layout’s width, spacing or tier height', () => {
      const groups = dateGroups(25, 10, 2026);
      const expected = getTierAnnotationRows(groups, DATE);
      for (const layout of [NUMBER, { ...DATE, spacing: 0 }, { ...DATE, heightPerGlyphStack: 40 }, { ...DATE, widthPerGroup: 7 }]) {
        expect(getTierAnnotationRows(groups, layout)).toEqual(expected);
      }
    });

    it('lies on the guides’ bands: each band, with its inset, is inside its row', () => {
      const groups = dateGroups(25, 10, 2026);
      const rows = getTierAnnotationRows(groups, DATE);
      for (const band of getPlaceTierBands(groups, DATE)) {
        const row = rows[band.exponent];
        expect(band.top).toBeGreaterThan(row.top);
        expect(band.top + band.height).toBeLessThan(row.top + row.height);
      }
    });
  });

  describe('empty input', () => {
    it('gives no rows for no groups', () => {
      expect(getTierAnnotationRows([], NUMBER)).toEqual([]);
    });

    it('gives no rows for groups that are all empty', () => {
      expect(getTierAnnotationRows([[]], NUMBER)).toEqual([]);
      expect(getTierAnnotationRows([[], [], []], DATE)).toEqual([]);
    });

    it('gives an empty group among others a null in every row', () => {
      expect(summary(getTierAnnotationRows([[], toBase20(123), []], DATE))).toEqual([
        { exponent: 0, digits: [null, 3, null] },
        { exponent: 1, digits: [null, 6, null] },
      ]);
    });
  });

  describe('invalid input', () => {
    it('rejects a digit that is not an integer from 0 to 19', () => {
      for (const digit of [20, -1, 1.5, NaN, Infinity, -Infinity, 100]) {
        expect(() => getTierAnnotationRows([[1, digit]], NUMBER), `${digit}`).toThrow(RangeError);
        expect(() => getTierAnnotationRows([[digit]], NUMBER), `${digit}`).toThrow(RangeError);
      }
      // The first and the last valid digits are fine
      expect(() => getTierAnnotationRows([[0, 19]], NUMBER)).not.toThrow();
    });

    it('rejects an invalid digit in any group, also in one shorter than the tallest', () => {
      for (const digit of [20, -1, 1.5, NaN]) {
        expect(() => getTierAnnotationRows([toBase20(2026), [digit], toBase20(25)], DATE), `${digit}`).toThrow(RangeError);
        expect(() => getTierAnnotationRows([toBase20(2026), toBase20(25), [digit]], DATE), `${digit}`).toThrow(RangeError);
        // Also in a group with no row for it: still a bad digit, never ignored
        expect(() => getTierAnnotationRows([[1, 2, 3], [4, digit]], DATE), `${digit}`).toThrow(RangeError);
      }
    });

    it('keeps the tier guides’ errors for an invalid layout', () => {
      for (const layout of [
        { ...NUMBER, heightPerGlyphStack: 0 },
        { ...NUMBER, heightPerGlyphStack: -80 },
        { ...NUMBER, heightPerGlyphStack: NaN },
        { ...NUMBER, widthPerGroup: 0 },
        { ...NUMBER, widthPerGroup: Infinity },
        { ...NUMBER, spacing: -1 },
        { ...NUMBER, spacing: NaN },
      ]) {
        expect(() => getTierAnnotationRows([[1, 0]], layout)).toThrow(RangeError);
        // Also without groups, as getPlaceTierBands
        expect(() => getTierAnnotationRows([], layout)).toThrow(RangeError);
      }
      // No spacing is a valid layout
      expect(() => getTierAnnotationRows([[1, 0], [1, 0]], { ...NUMBER, spacing: 0 })).not.toThrow();
    });
  });

  describe('purity', () => {
    it('does not change its input', () => {
      const groups = dateGroups(25, 10, 2026);
      const layout = { ...DATE };
      const groupsBefore = structuredClone(groups);
      const layoutBefore = structuredClone(layout);
      getTierAnnotationRows(groups, layout);
      expect(groups).toEqual(groupsBefore);
      expect(layout).toEqual(layoutBefore);
    });

    it('gives equal output for equal input, in fresh objects each time', () => {
      const groups = dateGroups(25, 10, 2026);
      const first = getTierAnnotationRows(groups, DATE);
      const second = getTierAnnotationRows(groups, DATE);
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(second[0]).not.toBe(first[0]);
      // Changing a result changes neither the input nor a later result
      first[0].digits[0] = 99;
      expect(groups).toEqual(dateGroups(25, 10, 2026));
      expect(getTierAnnotationRows(groups, DATE)).toEqual(second);
    });
  });
});
