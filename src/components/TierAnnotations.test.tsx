// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getTierAnnotationRows, type TierAnnotationRow } from '@utils/tierAnnotations';
import { TierAnnotations } from './TierAnnotations';

afterEach(cleanup);

const LAYOUT = { heightPerGlyphStack: 80, widthPerGroup: 350, spacing: 25 };

/** Renders the annotations and returns the layer and its rows, bottom tier first */
function renderAnnotations(rows: TierAnnotationRow[], kind: 'power' | 'digit') {
  const { container } = render(<TierAnnotations rows={rows} kind={kind} />);
  const layer = container.firstElementChild as HTMLElement;
  const rowElements = [...layer.querySelectorAll<HTMLElement>('[data-tier-annotation]')];
  return { container, layer, rowElements };
}

// Three tiers, bottom up: 0, 10 and 19
const rows = getTierAnnotationRows([[19, 10, 0]], LAYOUT);

describe('TierAnnotations', () => {
  it('renders one row per supplied annotation row, in the order given', () => {
    const { rowElements } = renderAnnotations(rows, 'power');
    expect(rowElements).toHaveLength(3);
    expect(rowElements.map((el) => el.dataset.exponent)).toEqual(['0', '1', '2']);

    const digit = renderAnnotations(rows, 'digit');
    expect(digit.rowElements).toHaveLength(3);
  });

  it('shows each power of 20 with a real superscript, not a Unicode superscript character', () => {
    const { rowElements } = renderAnnotations(rows, 'power');
    expect(rowElements.map((el) => el.textContent)).toEqual(['200', '201', '202']);
    for (const [exponent, el] of rowElements.entries()) {
      const sup = el.querySelector('sup')!;
      expect(sup.textContent).toBe(String(exponent));
      expect(el.textContent).not.toMatch(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/);
    }
  });

  it('shows two-digit exponents up to the largest tier (98)', () => {
    const tall = getTierAnnotationRows([Array.from({ length: 99 }, () => 1)], LAYOUT);
    const { rowElements } = renderAnnotations(tall, 'power');
    expect(rowElements).toHaveLength(99);
    expect(rowElements[10].querySelector('sup')!.textContent).toBe('10');
    expect(rowElements[98].querySelector('sup')!.textContent).toBe('98');
  });

  it('shows the digit of each tier, bottom up, zero included', () => {
    // 19, 10, 0 from the top: the rows from the bottom are 0, 10, 19
    const { rowElements } = renderAnnotations(rows, 'digit');
    expect(rowElements.map((el) => el.textContent)).toEqual(['0', '10', '19']);
    expect(rowElements[0].querySelector('span')).not.toBeNull();
    expect(rowElements.some((el) => el.querySelector('sup'))).toBe(false);
  });

  it('shows the first group’s digit only', () => {
    const date = getTierAnnotationRows([[3, 4], [7], [1, 2, 3]], LAYOUT);
    const { rowElements } = renderAnnotations(date, 'digit');
    expect(rowElements.map((el) => el.textContent)).toEqual(['4', '3', '']);
  });

  it('shows no label, but keeps the row, where the digit is null', () => {
    // The first group has one tier, the second three: above its own tier, the first has no digit
    const mixed = getTierAnnotationRows([[5], [1, 2, 3]], LAYOUT);
    expect(mixed.map((row) => row.digits[0])).toEqual([5, null, null]);

    const { rowElements } = renderAnnotations(mixed, 'digit');
    expect(rowElements).toHaveLength(3);
    expect(rowElements.map((el) => el.textContent)).toEqual(['5', '', '']);
    expect(rowElements[1].children).toHaveLength(0);
  });

  it('does not treat a zero digit as missing', () => {
    const zero = getTierAnnotationRows([[0]], LAYOUT);
    const { rowElements } = renderAnnotations(zero, 'digit');
    expect(rowElements).toHaveLength(1);
    expect(rowElements[0].textContent).toBe('0');
  });

  it('positions each row by its own top and height, as percentages', () => {
    for (const kind of ['power', 'digit'] as const) {
      const { rowElements } = renderAnnotations(rows, kind);
      rowElements.forEach((el, i) => {
        expect(el.style.top).toBe(`${rows[i].top * 100}%`);
        expect(el.style.height).toBe(`${rows[i].height * 100}%`);
      });
    }
    // Three equal tiers tile the box, the bottom one last
    const { rowElements } = renderAnnotations(rows, 'power');
    expect(rowElements.map((el) => parseFloat(el.style.top))).toEqual([
      (2 / 3) * 100,
      (1 / 3) * 100,
      0,
    ]);
    expect(rowElements.map((el) => parseFloat(el.style.height))).toEqual([
      (1 / 3) * 100,
      (1 / 3) * 100,
      (1 / 3) * 100,
    ]);
  });

  it('uses given values as they are, with no layout or tier count of its own', () => {
    const given: TierAnnotationRow[] = [{ exponent: 4, top: 0.25, height: 0.5, digits: [7] }];
    const { rowElements } = renderAnnotations(given, 'digit');
    expect(rowElements[0].style.top).toBe('25%');
    expect(rowElements[0].style.height).toBe('50%');
    expect(rowElements[0].textContent).toBe('7');
  });

  it('is hidden from assistive technology, whatever its kind', () => {
    for (const kind of ['power', 'digit'] as const) {
      const { layer } = renderAnnotations(rows, kind);
      expect(layer.getAttribute('aria-hidden')).toBe('true');
      expect(layer.dataset.tierAnnotations).toBe(kind);
      cleanup();
    }
  });

  it('has nothing to focus, and lets the pointer through', () => {
    for (const kind of ['power', 'digit'] as const) {
      const { layer } = renderAnnotations(rows, kind);
      const focusable = layer.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex], [contenteditable]'
      );
      expect(focusable).toHaveLength(0);
      expect(layer.className).toContain('pointer-events-none');
      cleanup();
    }
  });

  it('renders safely with no rows', () => {
    for (const kind of ['power', 'digit'] as const) {
      const { layer, rowElements } = renderAnnotations([], kind);
      expect(rowElements).toHaveLength(0);
      expect(layer.children).toHaveLength(0);
      expect(layer.getAttribute('aria-hidden')).toBe('true');
      cleanup();
    }
    expect(getTierAnnotationRows([], LAYOUT)).toEqual([]);
  });
});
