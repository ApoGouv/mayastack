// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getTierAnnotationRows, type TierAnnotationRow } from '@utils/tierAnnotations';
import { TierAnnotations } from './TierAnnotations';

afterEach(cleanup);

const LAYOUT = { heightPerGlyphStack: 80, widthPerGroup: 350, spacing: 25 };

// The labels' colours: their gutter's inks (getAnnotationLabelColors), or the theme's tokens without them
const POWER_INK = 'text-[var(--annotation-power-ink,var(--color-fg-subtle))]';
const DIGIT_INK = 'text-[var(--annotation-digit-ink,var(--color-accent-fg))]';

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
    // 19, 10, 0 from the top: the rows from the bottom are 0, 10, 19 (in brackets since UI-13)
    const { rowElements } = renderAnnotations(rows, 'digit');
    expect(rowElements.map((el) => el.textContent)).toEqual(['[0]', '[10]', '[19]']);
    expect(rowElements[0].querySelector('span')).not.toBeNull();
    expect(rowElements.some((el) => el.querySelector('sup'))).toBe(false);
  });

  it('shows the first group’s digit only', () => {
    const date = getTierAnnotationRows([[3, 4], [7], [1, 2, 3]], LAYOUT);
    const { rowElements } = renderAnnotations(date, 'digit');
    expect(rowElements.map((el) => el.textContent)).toEqual(['[4]', '[3]', '']);
  });

  it('shows no label, but keeps the row, where the digit is null', () => {
    // The first group has one tier, the second three: above its own tier, the first has no digit
    const mixed = getTierAnnotationRows([[5], [1, 2, 3]], LAYOUT);
    expect(mixed.map((row) => row.digits[0])).toEqual([5, null, null]);

    const { rowElements } = renderAnnotations(mixed, 'digit');
    expect(rowElements).toHaveLength(3);
    expect(rowElements.map((el) => el.textContent)).toEqual(['[5]', '', '']);
    // Nothing at all where the digit is null: no brackets either
    expect(rowElements[1].children).toHaveLength(0);
    expect(rowElements[2].children).toHaveLength(0);
    expect(rowElements[1].querySelectorAll('[data-tier-annotation-bracket]')).toHaveLength(0);
  });

  it('does not treat a zero digit as missing', () => {
    const zero = getTierAnnotationRows([[0]], LAYOUT);
    const { rowElements } = renderAnnotations(zero, 'digit');
    expect(rowElements).toHaveLength(1);
    expect(rowElements[0].textContent).toBe('[0]');
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
    expect(rowElements[0].textContent).toBe('[7]');
  });

  describe('digit brackets (UI-13)', () => {
    /** A digit row's parts: its brackets and its own text between them */
    const parts = (row: HTMLElement) => {
      const brackets = [...row.querySelectorAll<HTMLElement>('[data-tier-annotation-bracket]')];
      const label = row.firstElementChild as HTMLElement;
      const digitText = [...label.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join('');
      return { brackets, label, digitText };
    };

    it('brackets a single-digit and a two-digit value, with real elements', () => {
      const given: TierAnnotationRow[] = [
        { exponent: 0, top: 0.5, height: 0.5, digits: [7] },
        { exponent: 1, top: 0, height: 0.5, digits: [12] },
      ];
      const { rowElements } = renderAnnotations(given, 'digit');
      expect(rowElements.map((el) => el.textContent)).toEqual(['[7]', '[12]']);
      for (const [i, digit] of ['7', '12'].entries()) {
        const { brackets, label, digitText } = parts(rowElements[i]);
        // Opening bracket, the digit, closing bracket: elements, not generated content
        expect(brackets.map((b) => b.textContent)).toEqual(['[', ']']);
        expect(brackets.every((b) => b.tagName === 'SPAN')).toBe(true);
        expect(label.firstElementChild).toBe(brackets[0]);
        expect(label.lastElementChild).toBe(brackets[1]);
        expect(digitText).toBe(digit);
      }
    });

    it('brackets every digit from 0 to 19', () => {
      const given: TierAnnotationRow[] = Array.from({ length: 20 }, (_, d) => ({
        exponent: d,
        top: (19 - d) / 20,
        height: 1 / 20,
        digits: [d],
      }));
      const { rowElements } = renderAnnotations(given, 'digit');
      expect(rowElements.map((el) => el.textContent)).toEqual(given.map((_, d) => `[${d}]`));
    });

    it('leaves the brackets and the digit with no colour of their own, so all take the row’s gold', () => {
      const { rowElements } = renderAnnotations(rows, 'digit');
      for (const row of rowElements) {
        const { brackets, label } = parts(row);
        expect(brackets).toHaveLength(2);
        for (const bracket of brackets) {
          // No text colour class: the bracket inherits the row's digit ink
          expect(bracket.className.split(' ').filter((c) => c.startsWith('text-'))).toEqual([]);
        }
        // The digit itself has no colour of its own either: it is the row's digit ink
        expect(label.className).toBe('');
        expect(row.className.split(' ')).toContain(DIGIT_INK);
      }
    });

    it('spaces each bracket 2 px from the digit by a margin on its inner side, not by whitespace', () => {
      const given: TierAnnotationRow[] = [
        { exponent: 0, top: 0.5, height: 0.5, digits: [7] },
        { exponent: 1, top: 0, height: 0.5, digits: [19] },
      ];
      const { rowElements } = renderAnnotations(given, 'digit');
      for (const row of rowElements) {
        const [open, close] = parts(row).brackets;
        // `0.5` is 0.125rem: 2 px at the default font size. Inner side only, so the label's outer
        // width grows by the two gaps alone, and stays centred in its row
        expect(open.className.split(' ')).toContain('mr-0.5');
        expect(close.className.split(' ')).toContain('ml-0.5');
        for (const bracket of [open, close]) {
          expect(bracket.className.split(' ').filter((c) => /^(m|p)[xytrblse]?-/.test(c))).toHaveLength(1);
        }
      }
      // No literal spaces: the text reads as before, brackets touching the digit
      expect(rowElements.map((el) => el.textContent)).toEqual(['[7]', '[19]']);
      expect(rowElements.every((el) => !/\s/.test(el.textContent!))).toBe(true);
    });

    it('leaves the power annotations as they were: no brackets', () => {
      const { rowElements } = renderAnnotations(rows, 'power');
      expect(rowElements.map((el) => el.textContent)).toEqual(['200', '201', '202']);
      for (const row of rowElements) {
        expect(row.querySelectorAll('[data-tier-annotation-bracket]')).toHaveLength(0);
        expect(row.textContent).not.toMatch(/[[\]]/);
        expect(row.className.split(' ')).toContain(POWER_INK);
      }
    });

    it('keeps the layer hidden from assistive technology, brackets included', () => {
      const { layer } = renderAnnotations(rows, 'digit');
      expect(layer.getAttribute('aria-hidden')).toBe('true');
      expect(layer.querySelectorAll('[data-tier-annotation-bracket]')).toHaveLength(6);
      expect(layer.querySelectorAll('[aria-hidden="false"], [role]')).toHaveLength(0);
    });
  });

  it('colours powers with the gutter’s power ink and digits with its digit ink, the theme’s subtle and gold tokens without them', () => {
    for (const [kind, colour, other] of [
      ['power', POWER_INK, DIGIT_INK],
      ['digit', DIGIT_INK, POWER_INK],
    ] as const) {
      const { rowElements } = renderAnnotations(rows, kind);
      expect(rowElements).toHaveLength(3);
      for (const el of rowElements) {
        const classes = el.className.split(' ');
        expect(classes, kind).toContain(colour);
        expect(classes, kind).not.toContain(other);
        expect(classes, kind).not.toContain('text-fg-muted');
        // One text colour only, no fixed token beside it, and the size and figures as they were
        expect(classes.filter((c) => /^text-(fg|accent|\[)/.test(c)), kind).toEqual([colour]);
        expect(classes, kind).not.toContain('text-fg-subtle');
        expect(classes, kind).not.toContain('text-accent-fg');
        expect(classes, kind).toEqual(expect.arrayContaining(['text-xs', 'tabular-nums']));
      }
      cleanup();
    }
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
