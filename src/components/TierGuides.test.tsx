// @vitest-environment happy-dom
import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RgbaColor } from '@/types/colors';
import { getGuideColors, VIEWER_BACKDROP } from '@utils/guideColors';
import type { NumeralLayout } from '@utils/tierGuides';
import { PlaceTierGuides, TierHairlines } from './TierGuides';

afterEach(cleanup);

const LAYOUT: NumeralLayout = { heightPerGlyphStack: 80, widthPerGroup: 100, spacing: 25 };
const WHITE: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const COLORS = getGuideColors(WHITE, VIEWER_BACKDROP.light);
// Day 25 (2 tiers), month 10 (1 tier) and a year of 3 tiers: 350 × 240 units
const DATE_GROUPS = [[1, 5], [10], [5, 1, 6]];

const percent = (value: string) => parseFloat(value);

/**
 * Renders the cards in a zoom wrapper, inside a stage box, inside a scrolling viewer, as
 * NumeralViewport does, and gives them the viewer as their scroller. With `scroller: false` they
 * are given no scroller; with `stage: false` the wrapper's parent is the viewer itself.
 */
function renderCards({
  digitGroups = DATE_GROUPS,
  background = WHITE,
  scroller = true,
  stage = true,
}: { digitGroups?: number[][]; background?: RgbaColor; scroller?: boolean; stage?: boolean } = {}) {
  const scrollerRef = createRef<HTMLDivElement>();
  const wrapperContent = (
    <div data-testid="wrapper">
      <PlaceTierGuides
        digitGroups={digitGroups}
        layout={LAYOUT}
        background={background}
        colors={COLORS}
        scrollerRef={scroller ? scrollerRef : { current: null }}
      />
      <svg className="mep-svg" />
    </div>
  );
  const { container } = render(
    <div data-testid="viewer" ref={scrollerRef}>
      {stage ? <div data-testid="stage">{wrapperContent}</div> : wrapperContent}
    </div>
  );
  const layer = container.querySelector<HTMLElement>('[data-place-tier-guides]')!;
  const cards = () => [...container.querySelectorAll<HTMLElement>('[data-place-tier-band]')];
  const hovered = () => cards().filter((card) => card.dataset.hovered !== undefined).map((card) => [card.dataset.groupIndex, card.dataset.exponent]);
  const wrapper = container.querySelector<HTMLElement>('[data-testid="wrapper"]')!;
  const viewer = container.querySelector<HTMLElement>('[data-testid="viewer"]')!;
  // happy-dom lays nothing out: the wrapper is 350 × 240 px at (0, offset)
  let offset = 0;
  wrapper.getBoundingClientRect = () => ({ left: 0, top: offset, width: 350, height: 240, right: 350, bottom: offset + 240, x: 0, y: offset, toJSON: () => ({}) }) as DOMRect;
  const point = (x: number, y: number, pointerType = 'mouse') =>
    act(() => {
      wrapper.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType, bubbles: true }));
    });
  // Scrolls the viewer, or another element given, by moving the wrapper's box and firing `scroll` there
  const scrollBy = (dy: number, target: HTMLElement = viewer) =>
    act(() => {
      offset -= dy;
      target.dispatchEvent(new Event('scroll'));
    });
  const leave = () => act(() => {
    wrapper.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
  });
  return { container, layer, cards, hovered, point, scrollBy, leave, wrapper, viewer };
}

function renderHairlines(digitGroups: number[][], color: RgbaColor = COLORS.hairline) {
  const { container } = render(<TierHairlines digitGroups={digitGroups} layout={LAYOUT} color={color} />);
  const overlay = container.querySelector<HTMLElement>('[data-tier-hairlines]')!;
  const lines = [...container.querySelectorAll<HTMLElement>('[data-tier-hairline]')];
  return { container, overlay, lines };
}

describe('PlaceTierGuides', () => {
  it('is a screen-only layer before the SVG that paints the background, hidden from assistive technology', () => {
    const { container, layer } = renderCards();
    expect(layer.nextElementSibling?.tagName.toLowerCase()).toBe('svg');
    expect(layer.hasAttribute('data-numeral-underlay')).toBe(true);
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.className.split(' ')).toEqual(expect.arrayContaining(['absolute', 'inset-0', 'pointer-events-none']));
    expect(layer.style.backgroundColor).toBe('rgba(255, 255, 255, 1)');
    expect(container.querySelectorAll('[data-place-tier-guides] svg, [data-place-tier-guides] [tabindex]')).toHaveLength(0);
    expect(layer.textContent).toBe('');
  });

  it('places a card on each actual tier of each group, inset at the sides, nothing above a shorter group', () => {
    const { cards } = renderCards();
    expect(cards().map((card) => [card.dataset.groupIndex, card.dataset.exponent])).toEqual([
      ['0', '0'], ['0', '1'],
      ['1', '0'],
      ['2', '0'], ['2', '1'], ['2', '2'],
    ]);
    // The year's top tier: the top 80 of 240 units less 2 at each end, 3 units in at each side
    const top = cards()[5];
    expect(percent(top.style.top)).toBeCloseTo((2 / 240) * 100, 10);
    expect(percent(top.style.height)).toBeCloseTo((76 / 240) * 100, 10);
    expect(percent(top.style.left)).toBeCloseTo((253 / 350) * 100, 10);
    expect(percent(top.style.width)).toBeCloseTo((94 / 350) * 100, 10);
  });

  it('uses the card colour at rest, without a shadow, and a short transition only without reduced motion', () => {
    const { cards } = renderCards();
    for (const card of cards()) {
      expect(card.style.backgroundColor).toBe(`rgba(39, 42, 48, ${COLORS.card.a})`);
      expect(card.style.boxShadow).toBe('none');
      expect(card.className.split(' ')).toEqual(
        expect.arrayContaining(['motion-safe:transition-[background-color,box-shadow]', 'motion-safe:duration-150'])
      );
    }
  });

  it('strengthens the card under a mouse pointer, with a shadow, and only that one', () => {
    const { cards, hovered, point, leave } = renderCards();
    point(50, 200); // the day's bottom tier
    expect(hovered()).toEqual([['0', '0']]);
    const card = cards()[0];
    expect(card.style.backgroundColor).toBe(`rgba(39, 42, 48, ${COLORS.cardHover.a})`);
    expect(card.style.boxShadow).toBe(COLORS.cardHoverShadow);
    expect(cards()[1].style.boxShadow).toBe('none');

    point(300, 40); // the year's top tier
    expect(hovered()).toEqual([['2', '2']]);
    point(50, 80); // the gap between the day's tiers
    expect(hovered()).toEqual([]);
    point(175, 120); // above the month's one tier
    expect(hovered()).toEqual([]);
    point(175, 200);
    expect(hovered()).toEqual([['1', '0']]);
    leave();
    expect(hovered()).toEqual([]);
  });

  it('shows no hover for touch', () => {
    const { hovered, point } = renderCards();
    point(50, 200, 'touch');
    expect(hovered()).toEqual([]);
  });

  it('follows the content as the viewer scrolls under a still pointer', () => {
    const { hovered, point, scrollBy, wrapper, viewer } = renderCards();
    // The viewer it follows is the scroller it is given, not the wrapper's parent (the stage box)
    expect(wrapper.parentElement).not.toBe(viewer);
    point(300, 120); // the year's middle tier
    expect(hovered()).toEqual([['2', '1']]);
    scrollBy(80); // the content moves up one tier: the pointer is over the tier below
    expect(hovered()).toEqual([['2', '0']]);
    scrollBy(-80);
    expect(hovered()).toEqual([['2', '1']]);
  });

  it('follows only the scroller it is given, never the wrapper’s parent', () => {
    const { hovered, point, scrollBy, wrapper } = renderCards();
    point(300, 120);
    expect(hovered()).toEqual([['2', '1']]);
    scrollBy(80, wrapper.parentElement!); // a scroll event on the stage box is not the viewer's
    expect(hovered()).toEqual([['2', '1']]);
  });

  it('does not fall back to the wrapper’s parent without a scroller, and still follows the pointer', () => {
    // As before UI-13, the wrapper's parent is the viewer: without the scroller, its scrolling is not followed
    const { hovered, point, scrollBy, wrapper, viewer } = renderCards({ scroller: false, stage: false });
    expect(wrapper.parentElement).toBe(viewer);
    point(300, 120);
    expect(hovered()).toEqual([['2', '1']]);
    expect(() => scrollBy(80)).not.toThrow();
    expect(hovered()).toEqual([['2', '1']]);
    // The pointer's own moves are still followed
    point(300, 120);
    expect(hovered()).toEqual([['2', '0']]);
  });

  it('stops following the pointer once removed', () => {
    const { container, point, hovered } = renderCards();
    cleanup();
    expect(container.innerHTML).toBe('');
    expect(() => point(50, 200)).not.toThrow();
    expect(hovered()).toEqual([]);
  });
});

describe('TierHairlines', () => {
  it('draws a hairline between each pair of tiers of each group, inset as the cards', () => {
    const { lines } = renderHairlines(DATE_GROUPS);
    expect(lines.map((line) => [line.dataset.groupIndex, line.dataset.boundary])).toEqual([
      ['0', '1'],
      ['2', '1'],
      ['2', '2'],
    ]);
    // Positioned in percentages of the numeral, 1 px thick and centred on the boundary
    const year = lines[2];
    expect(percent(year.style.top)).toBeCloseTo(100 / 3, 10);
    expect(percent(year.style.left)).toBeCloseTo((253 / 350) * 100, 10);
    expect(percent(year.style.width)).toBeCloseTo((94 / 350) * 100, 10);
    expect(year.className.split(' ')).toEqual(expect.arrayContaining(['absolute', 'h-px', '-translate-y-1/2']));
  });

  it('is an HTML overlay hidden from assistive technology that lets the pointer through', () => {
    const { container, overlay } = renderHairlines([[1, 0]]);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.className.split(' ')).toEqual(expect.arrayContaining(['absolute', 'inset-0', 'pointer-events-none']));
    expect(container.querySelector('svg')).toBeNull();
    expect(overlay.textContent).toBe('');
  });

  it('draws the colour it is given', () => {
    expect(renderHairlines([[1, 0]], { r: 34, g: 22, b: 0, a: 0.551 }).lines[0].style.backgroundColor).toBe('rgba(34, 22, 0, 0.551)');
  });

  it('draws no hairline for a single tier', () => {
    expect(renderHairlines([[7]]).lines).toHaveLength(0);
  });
});
