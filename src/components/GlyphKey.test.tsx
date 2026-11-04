// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import ShellGlyph, { SHELL_VISUAL_Y_OFFSET, VISUAL_SHELL_WIDTH } from '@components/glyphs/ShellGlyph';
import DotGlyph from '@components/glyphs/DotGlyph';
import BarGlyph, { BAR_WIDTH } from '@components/glyphs/BarGlyph';
import { spokenText, visibleText } from '@/test/text';
import GlyphKey, { GLYPH_KEY_SCALE } from './GlyphKey';

afterEach(cleanup);

/** The markup a glyph component draws on its own, at scale 1 */
const drawn = (glyph: ReactElement) => {
  const { container, unmount } = render(<svg>{glyph}</svg>);
  const markup = container.querySelector('svg')!.innerHTML;
  unmount();
  return markup;
};

describe('GlyphKey', () => {
  const entries = () => within(screen.getByRole('list', { name: 'Glyph key' })).getAllByRole('listitem');

  it('lists Shell = 0, Dot = 1 and Bar = 5, in that order, as text', () => {
    render(<GlyphKey />);

    expect(entries().map((item) => visibleText(item))).toEqual(['Shell = 0', 'Dot = 1', 'Bar = 5']);
    expect(entries().map((item) => spokenText(item))).toEqual(['Shell = 0', 'Dot = 1', 'Bar = 5']);
  });

  it('draws each entry with the actual glyph component, unchanged, in a decorative SVG', () => {
    const shell = drawn(<ShellGlyph x={VISUAL_SHELL_WIDTH / 2} y={SHELL_VISUAL_Y_OFFSET} />);
    const dot = drawn(<DotGlyph x={5} y={5} />);
    const bar = drawn(<BarGlyph x={BAR_WIDTH / 2} y={3} />);
    render(<GlyphKey />);

    const svgs = entries().map((item) => {
      expect(item.querySelectorAll('svg')).toHaveLength(1);
      return item.querySelector('svg')!;
    });
    expect(svgs.map((svg) => svg.innerHTML)).toEqual([shell, dot, bar]);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      // The glyph is drawn first, then its label, beside it
      expect(svg.nextElementSibling?.textContent).toMatch(/ = \d$/);
    }
  });

  it('draws all three glyphs in the one accent colour, unclipped, with the labels muted', () => {
    render(<GlyphKey />);

    expect(screen.getByRole('list', { name: 'Glyph key' }).className.split(' ')).toContain('text-fg-muted');
    for (const item of entries()) {
      const classes = item.querySelector('svg')!.getAttribute('class')!.split(' ');
      expect(classes).toContain('text-accent-fg');
      // The viewBox is flush with the glyph: pixel snapping must not clip its anti-aliased edge
      expect(classes).toContain('overflow-visible');
      expect(item.querySelector('span')!.className).not.toMatch(/text-/);
    }
  });

  it('shows every glyph at the same reduced scale, keeping its proportions', () => {
    render(<GlyphKey />);

    const sizes = entries().map((item) => {
      const svg = item.querySelector('svg')!;
      const [, , boxWidth, boxHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number);
      return { boxWidth, boxHeight, width: Number(svg.getAttribute('width')), height: Number(svg.getAttribute('height')) };
    });
    for (const { boxWidth, boxHeight, width, height } of sizes) {
      expect(width / boxWidth).toBeCloseTo(GLYPH_KEY_SCALE, 10);
      expect(height / boxHeight).toBeCloseTo(GLYPH_KEY_SCALE, 10);
    }
    // The drawn boxes at scale 1: the shell's outline with its stroke, the dot's diameter, the
    // bar's length and stroke
    expect(sizes.map(({ boxWidth, boxHeight }) => [boxWidth, boxHeight])).toEqual([
      [expect.closeTo(40.372, 3), expect.closeTo(21.249, 3)],
      [10, 10],
      [44, 6],
    ]);
  });

  it('is a named list, never a live region or interactive', () => {
    const { container } = render(<GlyphKey />);
    const list = screen.getByRole('list', { name: 'Glyph key' });

    expect(list.tagName).toBe('UL');
    expect(entries()).toHaveLength(3);
    for (const el of container.querySelectorAll('*')) {
      expect(el.hasAttribute('aria-live')).toBe(false);
      expect(el.hasAttribute('tabindex')).toBe(false);
    }
    // Starting at the content edge; each glyph stays beside its label where the entries wrap
    expect(list.className.split(' ')).toContain('justify-start');
    for (const item of entries()) expect(item.className.split(' ')).toContain('whitespace-nowrap');
  });
});
