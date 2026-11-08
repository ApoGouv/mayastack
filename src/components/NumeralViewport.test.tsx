// @vitest-environment happy-dom
import { createRef, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NumeralViewport from './NumeralViewport';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const LABEL = 'Mayan numeral for 123: 2 stacked base-20 digits, highest place value at the top';
/** A translucent numeral background, as a CSS colour */
const BACKGROUND = 'rgba(20, 40, 90, 0.5)';

/** Renders the viewport around a stand-in numeral and returns its parts */
function renderViewport(
  props: {
    resetKey?: string;
    header?: ReactNode;
    footer?: ReactNode;
    numeralHeight?: number;
    annotationsStart?: ReactNode;
    annotationsEnd?: ReactNode;
    underlay?: ReactNode;
    overlay?: ReactNode;
  } = {}
) {
  const result = render(
    <NumeralViewport numeralWidth={350} background={BACKGROUND} label={LABEL} {...props}>
      <svg width={350} height={160} viewBox="0 0 350 160" data-testid="numeral" />
    </NumeralViewport>
  );
  const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
  const image = screen.getByRole('img', { name: LABEL });
  const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
  const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
  const reset = screen.getByRole('button', { name: 'Reset' });
  /** The zoom level shown to the user and announced to screen readers, e.g. "100%" */
  const zoomStatus = screen.getByRole('group', { name: 'Zoom controls' }).querySelector('[aria-live]') as HTMLElement;
  const zoomText = () => zoomStatus.textContent ?? '';
  return { ...result, viewer, image, zoomIn, zoomOut, reset, zoomStatus, zoomText };
}

describe('NumeralViewport', () => {
  it('shows the numeral as one labelled image in a focusable, bounded viewer', () => {
    const { viewer, image } = renderViewport();

    expect(viewer.tabIndex).toBe(0);
    // Changed deliberately in UI-13: the stage's height for the screen, not a 480 px maximum
    expect(viewer.className.split(' ')).toContain('numeral-stage-height');
    expect(viewer.getAttribute('style')).toBeNull();
    expect(viewer.className).toContain('overflow-auto');
    expect(document.getElementById(viewer.getAttribute('aria-describedby') ?? '')?.textContent).toContain(
      'Press plus or minus to zoom'
    );
    expect(image.contains(screen.getByTestId('numeral'))).toBe(true);
    expect(image.style.width).toBe('350px');
  });

  it('zooms in and out through the zoom levels, keeping the numeral itself unchanged', () => {
    const { zoomIn, zoomOut, image, zoomText } = renderViewport();

    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('125%');
    expect(image.style.width).toBe('437.5px');
    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('150%');
    expect(image.style.width).toBe('525px');

    for (let i = 0; i < 3; i++) fireEvent.click(zoomOut);
    expect(zoomText()).toBe('75%');
    expect(image.style.width).toBe('262.5px');

    // The SVG keeps its logical size: only the wrapper it scales to changes
    const svg = screen.getByTestId('numeral');
    expect(svg.getAttribute('width')).toBe('350');
    expect(svg.getAttribute('height')).toBe('160');
    expect(svg.getAttribute('viewBox')).toBe('0 0 350 160');
  });

  it('shows the numeral at 1 CSS px per SVG unit at 100%, scaled exactly at every zoom level, and centred', () => {
    const { zoomIn, zoomOut, image, zoomText } = renderViewport();
    // Its own width in CSS px, never a share of the viewer's; its paper (UI-13), around it, is
    // never shrunk and is centred both ways
    expect(image.className.split(' ')).toContain('relative');
    expect(image.parentElement!.className.split(' ')).toEqual(expect.arrayContaining(['m-auto', 'shrink-0']));
    for (let i = 0; i < 3; i++) fireEvent.click(zoomOut);
    const widths: Record<string, string> = {};
    for (let i = 0; i < 9; i++) {
      widths[zoomText().split(' ')[0]] = image.style.width;
      fireEvent.click(zoomIn);
    }
    expect(widths).toEqual({
      '25%': '87.5px', '50%': '175px', '75%': '262.5px', '100%': '350px', '125%': '437.5px',
      '150%': '525px', '200%': '700px', '300%': '1050px', '400%': '1400px',
    });
  });

  it('stops at 400% and 25% and marks the limit', () => {
    const { zoomIn, zoomOut, zoomText } = renderViewport();

    for (let i = 0; i < 10; i++) fireEvent.click(zoomIn);
    expect(zoomText()).toBe('400% (maximum zoom)');
    expect(zoomIn.getAttribute('aria-disabled')).toBe('true');
    expect(zoomOut.getAttribute('aria-disabled')).toBe('false');

    for (let i = 0; i < 10; i++) fireEvent.click(zoomOut);
    expect(zoomText()).toBe('25% (minimum zoom)');
    expect(zoomOut.getAttribute('aria-disabled')).toBe('true');
    expect(zoomIn.getAttribute('aria-disabled')).toBe('false');
  });

  it('announces the zoom level politely from a region present from the start', () => {
    const { zoomIn, zoomStatus, zoomText } = renderViewport();

    expect(zoomStatus.getAttribute('aria-live')).toBe('polite');
    expect(zoomText()).toBe('100%');
    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('125%');
  });

  it('keeps focus on a zoom button that reaches its limit, and ignores it there', () => {
    const { zoomIn, zoomText } = renderViewport();

    zoomIn.focus();
    for (let i = 0; i < 5; i++) fireEvent.click(zoomIn);
    expect(zoomText()).toBe('400% (maximum zoom)');
    expect(document.activeElement).toBe(zoomIn);
    expect(zoomIn.hasAttribute('disabled')).toBe(false);

    // Activating it again, e.g. with Enter, changes nothing
    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('400% (maximum zoom)');
    expect(document.activeElement).toBe(zoomIn);
  });

  it('resets to 100% and the top of the numeral', () => {
    const { viewer, zoomIn, reset, zoomText } = renderViewport();

    fireEvent.click(zoomIn);
    viewer.scrollTop = 300;
    fireEvent.click(reset);
    expect(zoomText()).toBe('100%');
    expect(viewer.scrollTop).toBe(0);

    // Also from 100%, after scrolling
    viewer.scrollTop = 300;
    fireEvent.click(reset);
    expect(viewer.scrollTop).toBe(0);
  });

  it('supports +, - and 0 while the viewer has focus', () => {
    const { viewer, zoomText } = renderViewport();

    fireEvent.keyDown(viewer, { key: '+' });
    expect(zoomText()).toBe('125%');
    fireEvent.keyDown(viewer, { key: '=' });
    expect(zoomText()).toBe('150%');
    fireEvent.keyDown(viewer, { key: '-' });
    expect(zoomText()).toBe('125%');
    fireEvent.keyDown(viewer, { key: '0' });
    expect(zoomText()).toBe('100%');
  });

  it('ignores the shortcuts with Ctrl, ⌘ or Alt, which belong to the browser', () => {
    const { viewer, zoomText } = renderViewport();

    fireEvent.keyDown(viewer, { key: '+', ctrlKey: true });
    fireEvent.keyDown(viewer, { key: '+', metaKey: true });
    fireEvent.keyDown(viewer, { key: '-', altKey: true });
    expect(zoomText()).toBe('100%');
  });

  it('ignores the shortcuts on the zoom buttons and on content inside the viewer', () => {
    const { reset, image, zoomText } = renderViewport();

    fireEvent.keyDown(reset, { key: '+' });
    fireEvent.keyDown(image, { key: '+' });
    expect(zoomText()).toBe('100%');
  });

  it('places an overlay after the numeral, in the zoom wrapper, which is its positioning context', () => {
    render(
      <NumeralViewport numeralWidth={350} background={BACKGROUND} label={LABEL} overlay={<div data-testid="overlay" />}>
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    const image = screen.getByRole('img', { name: LABEL });
    expect([...image.children]).toEqual([screen.getByTestId('numeral'), screen.getByTestId('overlay')]);
    expect(image.className).toContain('relative');

    // It zooms with the numeral
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(image.style.width).toBe('437.5px');
    expect(image.contains(screen.getByTestId('overlay'))).toBe(true);
  });

  it('places an underlay before the numeral, in the zoom wrapper, which zooms it with the numeral', () => {
    render(
      <NumeralViewport numeralWidth={350} background={BACKGROUND} label={LABEL} underlay={<div data-testid="underlay" />} overlay={<div data-testid="overlay" />}>
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    const image = screen.getByRole('img', { name: LABEL });
    expect([...image.children]).toEqual([
      screen.getByTestId('underlay'),
      screen.getByTestId('numeral'),
      screen.getByTestId('overlay'),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(image.style.width).toBe('437.5px');
  });

  it('sets a scroller ref it is given to the viewer, and still scrolls through it', () => {
    const scrollerRef = createRef<HTMLDivElement>();
    render(
      <NumeralViewport numeralWidth={350} background={BACKGROUND} label={LABEL} scrollerRef={scrollerRef}>
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
    expect(scrollerRef.current).toBe(viewer);

    // Reset at 100% still returns the viewer to its top
    viewer.scrollTop = 500;
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(viewer.scrollTop).toBe(0);
  });

  it('has the stage in canvas and the backdrop, then the stage content, the paper and the numeral image', () => {
    const { viewer, image } = renderViewport();
    // The stage is the scroller, the only scroll container, and the backdrop behind a
    // translucent numeral. Changed deliberately in UI-13: it now carries data-numeral-stage
    expect(viewer.hasAttribute('data-numeral-stage')).toBe(true);
    expect(viewer.hasAttribute('data-numeral-backdrop')).toBe(true);
    expect(viewer.className.split(' ')).toEqual(expect.arrayContaining(['overflow-auto', 'bg-canvas']));
    expect(document.querySelectorAll('[data-numeral-backdrop]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-numeral-stage]')).toHaveLength(1);
    // Its accessible role, name, description and focusability are unchanged
    expect(viewer.getAttribute('role')).toBe('group');
    expect(viewer.getAttribute('aria-label')).toBe('Numeral viewer');
    expect(viewer.getAttribute('tabindex')).toBe('0');
    expect(document.getElementById(viewer.getAttribute('aria-describedby')!)?.className).toBe('sr-only');
    // The stage content: the stage's only child, holding the paper, padded, at least the stage's
    // size (formerly marked data-numeral-stage)
    const content = viewer.firstElementChild as HTMLElement;
    expect(viewer.children).toHaveLength(1);
    expect(content.hasAttribute('data-numeral-stage-content')).toBe(true);
    expect(content.hasAttribute('data-numeral-stage')).toBe(false);
    expect(document.querySelectorAll('[data-numeral-stage-content]')).toHaveLength(1);
    expect(content.className.split(' ')).toEqual(
      expect.arrayContaining(['flex', 'w-max', 'min-w-full', 'min-h-full', 'p-4', 'overflow-clip'])
    );
    // Changed deliberately in UI-13: the paper between the stage content and the numeral image
    // (UI-10, slice 2.1: through the centred group, always present, that holds the paper)
    const group = content.firstElementChild as HTMLElement;
    expect([...content.children]).toEqual([group]);
    expect(group.hasAttribute('data-numeral-group')).toBe(true);
    const paper = group.firstElementChild as HTMLElement;
    expect([...group.children]).toEqual([paper]);
    expect(paper.hasAttribute('data-numeral-paper')).toBe(true);
    expect([...paper.children]).toEqual([image]);
    expect(document.querySelectorAll('[data-numeral-paper]')).toHaveLength(1);
    // The numeral image: the zoom wrapper, with its role and label unchanged
    expect(image.hasAttribute('data-numeral-image')).toBe(true);
    expect(document.querySelectorAll('[data-numeral-image]')).toHaveLength(1);
    expect(image.getAttribute('role')).toBe('img');
    expect(image.getAttribute('aria-label')).toBe(LABEL);
    expect(image.className).toBe('relative');
    // The numeral given as children, the exported SVG in the app, is passed through unmarked
    const numeral = screen.getByTestId('numeral');
    expect(numeral.parentElement).toBe(image);
    expect([...numeral.attributes].map((a) => a.name).sort()).toEqual(['data-testid', 'height', 'viewBox', 'width'].sort());
  });

  it('gives the paper the background, the 12 px padding, the edge and the shadow, and the zoom wrapper none of them (UI-13)', () => {
    const { image, zoomIn, zoomOut } = renderViewport();
    const paper = image.parentElement!;
    const classes = (el: HTMLElement) => el.className.split(' ');

    // The paper: centred both ways while it fits, never shrunk, 12 px of padding on all four
    // sides (Tailwind's p-3), the page's edge and shadow, and the background it is given, alpha
    // included, painted once across the padding and behind the numeral
    expect(classes(paper)).toEqual(expect.arrayContaining(['m-auto', 'shrink-0', 'p-3', 'ring-1', 'ring-line', 'shadow-sm']));
    expect(classes(paper).filter((c) => /^p[xytrblse]?-/.test(c))).toEqual(['p-3']);
    expect(paper.style.backgroundColor).toBe(BACKGROUND);
    expect(paper.getAttribute('role')).toBeNull();
    expect(paper.hasAttribute('aria-label')).toBe(false);

    // The zoom wrapper keeps the image role and name, its width and its positioning context,
    // with no padding, background, edge or shadow of its own
    expect(image.getAttribute('aria-label')).toBe(LABEL);
    expect(classes(image)).toEqual(['relative']);
    expect(image.style.backgroundColor).toBe('');
    expect(image.style.width).toBe('350px');

    // The padding does not zoom: only the wrapper's width changes
    for (const [button, width] of [[zoomIn, '437.5px'], [zoomOut, '350px'], [zoomOut, '262.5px']] as const) {
      fireEvent.click(button);
      expect(image.style.width).toBe(width);
      expect(image.parentElement).toBe(paper);
      expect(classes(paper).filter((c) => /^p[xytrblse]?-/.test(c))).toEqual(['p-3']);
      expect(paper.style.padding).toBe('');
      expect(paper.style.backgroundColor).toBe(BACKGROUND);
    }
  });

  it('paints the background it is given, also when it changes', () => {
    const { image, rerender } = renderViewport();
    rerender(
      <NumeralViewport numeralWidth={350} background="rgba(0, 0, 0, 0)" label={LABEL}>
        <svg width={350} height={160} viewBox="0 0 350 160" data-testid="numeral" />
      </NumeralViewport>
    );
    expect(image.parentElement!.style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('spans the viewer card’s width, with no canvas surround of its own (changed deliberately in UI-13)', () => {
    const { viewer, container } = renderViewport();
    // Changed deliberately in UI-13's slice 5a: the zoom controls are in a header row
    const root = container.firstElementChild as HTMLElement;
    expect(root.contains(viewer)).toBe(true);
    expect(root.className.split(' ')).toContain('w-full');
    expect(root.className).not.toMatch(/\b(max-w-|bg-|p-)/);
  });

  describe('header row (UI-13, slice 5a)', () => {
    const HEADING = <h2>Mayan Numeral Stack</h2>;

    it('shows the given heading, then the zoom controls, in one wrapping row above the hint and the viewer', () => {
      const { viewer, container } = renderViewport({ header: HEADING });
      const heading = screen.getByRole('heading', { name: 'Mayan Numeral Stack' });
      const controls = screen.getByRole('group', { name: 'Zoom controls' });
      const row = heading.parentElement!;
      const root = container.firstElementChild as HTMLElement;

      expect([...row.children]).toEqual([heading, controls]);
      expect(row.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'items-center', 'justify-between']));
      // The row, then the hint, then the viewer: outside the scroller, which keeps the scroll positions
      expect(root.firstElementChild).toBe(row);
      expect(row.contains(viewer) || viewer.contains(row)).toBe(false);
      const hint = document.getElementById(viewer.getAttribute('aria-describedby')!)!;
      expect([...root.children]).toEqual([row, hint, viewer]);
      // The controls never wrap within themselves, nor shrink
      expect(controls.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'shrink-0']));
      expect(controls.className).not.toContain('flex-wrap');
    });

    it('works without a heading: the row has the zoom controls only', () => {
      const { zoomIn, zoomText, container } = renderViewport();
      const controls = screen.getByRole('group', { name: 'Zoom controls' });
      expect([...controls.parentElement!.children]).toEqual([controls]);
      expect((container.firstElementChild as HTMLElement).firstElementChild).toBe(controls.parentElement);
      expect(screen.queryByRole('heading')).toBeNull();
      fireEvent.click(zoomIn);
      expect(zoomText()).toBe('125%');
    });

    it('orders the controls Zoom out, the percentage, Zoom in, a decorative separator, then Reset', () => {
      const { zoomIn, zoomOut, reset, zoomStatus } = renderViewport({ header: HEADING });
      const controls = screen.getByRole('group', { name: 'Zoom controls' });
      const [first, percentage, third, separator, fifth, ...rest] = [...controls.children];

      expect([first, percentage, third, fifth]).toEqual([zoomOut, zoomStatus, zoomIn, reset]);
      expect(rest).toEqual([]);
      // The percentage: a non-interactive, fixed-width, tabular readout in the polite live region
      expect(percentage.getAttribute('aria-live')).toBe('polite');
      expect(percentage.tagName).toBe('SPAN');
      expect(percentage.hasAttribute('tabindex')).toBe(false);
      expect(percentage.className.split(' ')).toEqual(expect.arrayContaining(['w-12', 'text-center', 'tabular-nums']));
      // The separator: hidden from assistive technology, not focusable, with no text
      expect(separator.getAttribute('aria-hidden')).toBe('true');
      expect(separator.hasAttribute('tabindex')).toBe(false);
      expect(separator.textContent).toBe('');
    });

    it('keeps the tab order Zoom out, Zoom in, Reset, then the viewer', () => {
      const { viewer, zoomIn, zoomOut, reset } = renderViewport({ header: HEADING });
      const focusable = [...document.querySelectorAll<HTMLElement>('button, [tabindex="0"]')];
      expect(focusable).toEqual([zoomOut, zoomIn, reset, viewer]);
      for (const button of [zoomOut, zoomIn, reset]) expect(button.className).toContain('focus-ring');
    });
  });

  // UI-13, slice 5c: the footer, for the glyph key
  it('shows the given footer under the viewer, outside it, and nothing there without one', () => {
    const { viewer, image, container, rerender } = renderViewport({ footer: <p>Key</p> });
    const footer = screen.getByText('Key');
    const root = container.firstElementChild as HTMLElement;

    expect(root.lastElementChild).toBe(footer);
    expect(viewer.nextElementSibling).toBe(footer);
    expect(viewer.contains(footer) || image.contains(footer)).toBe(false);

    rerender(
      <NumeralViewport numeralWidth={350} background={BACKGROUND} label={LABEL}>
        <svg width={350} height={160} viewBox="0 0 350 160" data-testid="numeral" />
      </NumeralViewport>
    );
    expect(screen.queryByText('Key')).toBeNull();
    expect(root.lastElementChild).toBe(screen.getByRole('group', { name: 'Numeral viewer' }));
  });

  it('has no underlay or overlay unless given', () => {
    const { image } = renderViewport();
    expect(image.children).toHaveLength(1);
  });

  it('returns to the top for a new numeral', () => {
    const { viewer, rerender } = renderViewport({ resetKey: 'a' });

    viewer.scrollTop = 500;
    rerender(
      <NumeralViewport numeralWidth={350} background={BACKGROUND} label={LABEL} resetKey="b">
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    expect(viewer.scrollTop).toBe(0);
  });
});

/** The zoom wrapper's distance from the stage box's edge: its 16 px padding and the paper's 12 px */
const SLAB_INSET = 16 + 12;
/** An annotation gutter's width (`w-10.5`), at each side of the paper when there are gutters */
const GUTTER_WIDTH = 42;

/** A ResizeObserver whose reports the test sends, as happy-dom's never reports */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  unobserve() {}
  disconnect() {
    this.observed = [];
  }
  /** Reports every observed element, as a browser does after a layout that resized them */
  static report() {
    for (const o of FakeResizeObserver.instances) {
      if (o.observed.length) o.callback([], o as unknown as ResizeObserver);
    }
  }
}

/**
 * The viewport around the 350 × 160 stand-in numeral, with the layout a browser would give it,
 * which happy-dom does not: the scroller's client size; the stage box's 16 px padding and the
 * paper's 12 px around the zoom wrapper (SLAB_INSET at each side), with the slab centred both ways
 * while it fits; scroll positions clamped to the scrollable area at once
 * (also when the scroller resizes) and rounded to device pixels; and scroll events dispatched only
 * when the test says, since browsers dispatch them later than the scrolling.
 */
function renderLaidOut({
  width,
  height,
  pixelRatio = 1,
  roundsLater = false,
  viewport = {},
}: {
  width: number;
  height: number;
  pixelRatio?: number;
  /** More props for the viewport, e.g. annotations */
  viewport?: Parameters<typeof renderViewport>[0];
  /** Rounds to device pixels only by the time of the scroll event, not as soon as it scrolls */
  roundsLater?: boolean;
}) {
  FakeResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  const parts = renderViewport({ resetKey: 'a', ...viewport });
  const { viewer, image } = parts;
  const s = { width, height, left: 0, top: 0, scrollToCalls: 0 };

  const slab = () => {
    const w = parseFloat(image.style.width);
    return { w, h: (w * 160) / 350, zoom: w / 350 };
  };
  // The annotation gutters, if rendered, widen the group symmetrically: the paper is as centred as before
  const gutters = () => viewer.querySelectorAll('[data-numeral-annotations]').length * GUTTER_WIDTH;
  const content = () => ({
    w: Math.max(s.width, slab().w + 2 * SLAB_INSET + gutters()),
    h: Math.max(s.height, slab().h + 2 * SLAB_INSET),
  });
  const round = (value: number) => Math.round(value * pixelRatio) / pixelRatio;
  const clamp = (value: number, max: number) => {
    const clamped = Math.min(Math.max(value, 0), Math.max(max, 0));
    return roundsLater ? clamped : round(clamped);
  };
  const dispatchScroll = () => {
    s.left = round(s.left);
    s.top = round(s.top);
    fireEvent.scroll(viewer);
  };
  const clampAll = () => {
    s.left = clamp(s.left, content().w - s.width);
    s.top = clamp(s.top, content().h - s.height);
  };

  // Showing or hiding the gutters changes the content's size: the browser clamps the scroll
  // position at its layout, before anything reads it (only then, to leave the other tests' fake as it was)
  let guttersLaidOut = gutters();
  const layOutGutters = () => {
    if (gutters() === guttersLaidOut) return;
    guttersLaidOut = gutters();
    clampAll();
  };

  Object.defineProperties(viewer, {
    clientWidth: { configurable: true, get: () => s.width },
    clientHeight: { configurable: true, get: () => s.height },
    // The scrollable area: the content, at least as large as the stage
    scrollWidth: { configurable: true, get: () => content().w },
    scrollHeight: { configurable: true, get: () => content().h },
    scrollLeft: {
      configurable: true,
      get: () => (layOutGutters(), s.left),
      set: (v: number) => { s.left = clamp(v, content().w - s.width); },
    },
    scrollTop: {
      configurable: true,
      get: () => (layOutGutters(), s.top),
      set: (v: number) => { s.top = clamp(v, content().h - s.height); },
    },
  });
  viewer.getBoundingClientRect = () => new DOMRect(0, 0, s.width, s.height);
  image.getBoundingClientRect = () => {
    layOutGutters();
    const { w, h } = slab();
    const c = content();
    return new DOMRect((c.w - w) / 2 - s.left, (c.h - h) / 2 - s.top, w, h);
  };
  const scrollTo = viewer.scrollTo.bind(viewer);
  viewer.scrollTo = ((...args: Parameters<typeof scrollTo>) => {
    s.scrollToCalls++;
    scrollTo(...args);
  }) as typeof viewer.scrollTo;

  const layout = {
    ...parts,
    state: s,
    /** The numeral point at the viewer's centre, in SVG units */
    centre: () => {
      const r = image.getBoundingClientRect();
      return { x: (s.width / 2 - r.left) / slab().zoom, y: (s.height / 2 - r.top) / slab().zoom };
    },
    /** How far the centre is from a point, in CSS px at the current zoom level */
    offBy: (point: { x: number; y: number }) => {
      const c = layout.centre();
      return Math.max(Math.abs(c.x - point.x), Math.abs(c.y - point.y)) * slab().zoom;
    },
    /** Resizes the scroller; the browser clamps the scroll position before any report */
    resize: (w: number, h: number) => {
      s.width = w;
      s.height = h;
      clampAll();
    },
    /** The browser's resize report, after the layout */
    report: () => act(() => FakeResizeObserver.report()),
    /** The scroll event for whatever scrolling happened since the last one */
    scrollEvent: dispatchScroll,
    /** The user scrolls to a position, and its event arrives */
    userScroll: (left: number, top: number) => {
      s.left = clamp(left, content().w - s.width);
      s.top = clamp(top, content().h - s.height);
      dispatchScroll();
    },
  };
  // The first report, once the viewer is laid out at its size
  layout.report();
  return layout;
}

describe('NumeralViewport: keeping the view when the viewer is resized', () => {
  it('observes the scroller and stops when removed', () => {
    const { viewer, unmount } = renderLaidOut({ width: 300, height: 200 });
    const [observer] = FakeResizeObserver.instances;
    expect(observer.observed).toEqual([viewer]);
    unmount();
    expect(observer.observed).toEqual([]);
  });

  it('keeps the point at the centre, both ways, through resizes of the viewer', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    for (let i = 0; i < 5; i++) fireEvent.click(v.zoomIn); // 400%: 1,400 × 640 px
    v.userScroll(500, 200);
    const point = v.centre();

    for (const [w, h] of [[600, 400], [250, 150], [1000, 300], [300, 200]]) {
      v.resize(w, h);
      v.report();
      expect(v.offBy(point), `${w} × ${h}`).toBeLessThanOrEqual(0.5);
    }
  });

  it('keeps the start, the top centred horizontally, of a new numeral and after Reset', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    v.resize(200, 120);
    v.report();
    expect(v.viewer.scrollTop).toBe(0);
    expect(v.centre().x).toBeCloseTo(175, 5);

    // After scrolling, Reset returns to the start, which a resize then keeps
    fireEvent.click(v.zoomIn);
    v.userScroll(300, 150);
    fireEvent.click(v.reset);
    v.scrollEvent();
    v.resize(320, 180);
    v.report();
    expect(v.zoomText()).toBe('100%');
    expect(v.viewer.scrollTop).toBe(0);
    expect(v.centre().x).toBeCloseTo(175, 5);
  });

  it('makes the user’s scrolling the view to keep, also after a correction', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    for (let i = 0; i < 3; i++) fireEvent.click(v.zoomIn); // 200%
    v.userScroll(100, 100);
    v.resize(280, 180);
    v.report();
    v.scrollEvent(); // the correction's own scroll event, which changes nothing

    // A later scroll by the user wins over the earlier corrections
    v.userScroll(250, 40);
    const point = v.centre();
    v.resize(320, 220);
    v.report();
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it('never takes the viewer’s own scrolling for the user’s', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    v.userScroll(10, 50);
    fireEvent.click(v.zoomIn); // keeps the point, scrolling the viewer itself
    const point = v.centre();
    v.scrollEvent();
    v.scrollEvent();
    v.resize(260, 160);
    v.report();
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);

    // Nor the scroll event of a correction the browser clamped, which would lose the point
    v.resize(2000, 1000);
    v.report();
    expect(v.offBy(point)).toBeGreaterThan(10);
    v.scrollEvent();
    v.resize(260, 160);
    v.report();
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it('keeps the intended point through clamping, and returns to it when the viewer allows', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    for (let i = 0; i < 4; i++) fireEvent.click(v.zoomIn); // 300%: 1,050 × 480 px
    v.userScroll(10_000, 10_000); // the bottom-right corner
    const point = v.centre();

    // A larger viewer cannot scroll there: the browser clamps, and its scroll event arrives
    // before the resize report, and the user even scrolls before it; none of it is the view
    v.resize(900, 450);
    v.scrollEvent();
    v.state.left -= 40;
    v.scrollEvent();
    v.report();
    expect(v.offBy(point)).toBeGreaterThan(10);

    // Back at its size, the viewer shows the intended point again
    v.resize(300, 200);
    v.report();
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it('zooms around the point it shows, also where a resize clamped the intended one, which the zoom then replaces', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    for (let i = 0; i < 4; i++) fireEvent.click(v.zoomIn); // 300%
    // The point (230, 100) at the centre: 28 px of padding (the stage's 16 and the paper's 12)
    // + 230 × 3 − 150 px, and likewise down
    v.userScroll(568, 228);
    const point = v.centre();
    expect(point.x).toBeCloseTo(230, 5);
    expect(point.y).toBeCloseTo(100, 5);
    // At 300% a 900 × 450 viewer cannot scroll that far (its centre reaches x ≈ 209, y ≈ 94)
    v.resize(900, 450);
    v.report();
    const shown = v.centre();
    expect(v.offBy(point)).toBeGreaterThan(10);

    // At 400% the same viewer could show the intended point (x up to ≈ 244, y up to ≈ 110), but
    // zooming keeps the point the user sees in place, as approved for UI-13
    fireEvent.click(v.zoomIn);
    expect(v.zoomText()).toContain('400%');
    expect(v.offBy(shown)).toBeLessThanOrEqual(0.5);
    expect(v.offBy(point)).toBeGreaterThan(10);

    // That point is now the view the viewer keeps through resizing
    v.resize(300, 200);
    v.report();
    expect(v.offBy(shown)).toBeLessThanOrEqual(0.5);
  });

  it('counts a scroll whose event has not arrived yet when zooming', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    fireEvent.click(v.zoomIn); // 125%
    v.state.left = 200;
    v.state.top = 60;
    const point = v.centre();
    fireEvent.click(v.zoomIn);
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it('corrects once per resize, and never for a report at the same size', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    fireEvent.click(v.zoomIn);
    v.userScroll(80, 90);
    const before = v.state.scrollToCalls;
    v.report();
    v.report();
    expect(v.state.scrollToCalls).toBe(before);

    v.resize(250, 200);
    v.report();
    v.report();
    v.scrollEvent();
    v.report();
    expect(v.state.scrollToCalls).toBe(before + 1);

    // Also while the intended view is out of reach, where every correction would be clamped
    v.userScroll(10_000, 10_000);
    v.resize(600, 300);
    v.report();
    const clamped = v.state.scrollToCalls;
    v.report();
    v.report();
    expect(v.state.scrollToCalls).toBe(clamped);
  });

  it('does not scroll when a resize leaves the view where it is', () => {
    // A numeral that fits both ways stays centred by the stage, at scroll position 0
    const v = renderLaidOut({ width: 600, height: 400 });
    const before = v.state.scrollToCalls;
    v.resize(700, 450);
    v.report();
    expect(v.state.scrollToCalls).toBe(before);
    expect([v.viewer.scrollLeft, v.viewer.scrollTop]).toEqual([0, 0]);
  });

  it('takes a position the browser rounds after the viewer’s own scroll as the viewer’s, not the user’s', () => {
    // At 150% display scaling, rounded to thirds of a CSS px only by the time of the event
    const v = renderLaidOut({ width: 301, height: 199, pixelRatio: 1.5, roundsLater: true });
    for (let i = 0; i < 4; i++) fireEvent.click(v.zoomIn); // 300%
    v.userScroll(556, 160);
    const point = v.centre();

    // Wider, the viewer cannot reach the point sideways; down, it scrolls to 34.5 px, which the
    // browser then rounds to 34.67 px
    v.resize(900, 450);
    v.report();
    expect(v.viewer.scrollTop).toBe(34.5);
    v.scrollEvent();
    expect(v.viewer.scrollTop).toBeCloseTo(34.667, 3);

    // Still the intended point, which the narrower viewer shows again
    v.resize(301, 199);
    v.report();
    expect(v.offBy(point)).toBeLessThanOrEqual(1);
  });

  it('keeps the point without drift at fractional scroll positions (150% display scaling)', () => {
    const v = renderLaidOut({ width: 301, height: 199, pixelRatio: 1.5 });
    for (let i = 0; i < 5; i++) fireEvent.click(v.zoomIn); // 400%
    v.userScroll(333.3, 211.1);
    expect(v.viewer.scrollLeft % 1).not.toBe(0); // a fractional position, as at 150%
    const point = v.centre();
    const positions: number[][] = [];
    // Rapid, repeated resizing, each report followed by the correction's own scroll event
    for (let i = 0; i < 10; i++) {
      v.resize(457, 263);
      v.report();
      v.scrollEvent();
      v.resize(301, 199);
      v.report();
      v.scrollEvent();
      expect(v.offBy(point), `cycle ${i + 1}`).toBeLessThanOrEqual(1);
      positions.push([v.viewer.scrollLeft, v.viewer.scrollTop]);
    }
    expect(positions.slice(1)).toEqual(Array(9).fill(positions[0]));
  });
});

/**
 * A Web Animations API animation as the zoom animation uses it, run by the test: it is "running"
 * from its creation until the test finishes it or the viewport cancels it, and `progress` (0 to 1)
 * is how far it has eased, which sets where it draws the paper meanwhile
 */
class FakeAnimation {
  playState: 'running' | 'finished' | 'idle' = 'running';
  progress = 0;
  finished: Promise<FakeAnimation>;
  readonly target: Element;
  readonly keyframes: Keyframe[];
  readonly options: KeyframeAnimationOptions;
  private readonly log: string[];
  private settle!: { resolve: (a: FakeAnimation) => void; reject: (e: Error) => void };
  constructor(target: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions, log: string[]) {
    this.target = target;
    this.keyframes = keyframes;
    this.options = options;
    this.log = log;
    this.finished = new Promise((resolve, reject) => (this.settle = { resolve, reject }));
    log.push('animate');
  }
  cancel() {
    if (this.playState !== 'running') return;
    this.playState = 'idle';
    this.log.push('cancel');
    this.settle.reject(new DOMException('The animation was canceled.', 'AbortError'));
  }
  finish() {
    this.playState = 'finished';
    this.settle.resolve(this);
  }
  /** The starting transform, from its first keyframe: translate(x px, y px) scale(s) */
  get start() {
    const [x, y, scale] = (this.keyframes[0].transform as string).match(/-?[\d.e+-]+(?=px|\))/g)!.map(Number);
    return { x, y, scale };
  }
}

/** The paper's 12 px padding, around the numeral image */
const PAPER_PADDING = 12;

/**
 * The laid-out viewport (renderLaidOut) with a fake `Element.animate`, the user's motion
 * preference (read through `matchMedia`), and the boxes a browser reports for the paper and the
 * numeral image: their layout, and, while a zoom animation runs, where its transform draws them,
 * at its `progress`. `log` records the animations' creation and cancellation and every
 * measurement of the numeral image, in order.
 */
function renderAnimated({
  reduce = false,
  width = 300,
  height = 200,
  viewport,
}: { reduce?: boolean; width?: number; height?: number; viewport?: Parameters<typeof renderViewport>[0] } = {}) {
  const log: string[] = [];
  const animations: FakeAnimation[] = [];
  const preference = { reduce };
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: preference.reduce && query === '(prefers-reduced-motion: reduce)', media: query }) as MediaQueryList
  );
  vi.spyOn(Element.prototype, 'animate').mockImplementation(function (this: Element, keyframes, options) {
    const animation = new FakeAnimation(this, keyframes as Keyframe[], options as KeyframeAnimationOptions, log);
    animations.push(animation);
    return animation as unknown as Animation;
  });

  const v = renderLaidOut({ width, height, viewport });
  const paper = v.image.parentElement!;
  const layoutBox = v.image.getBoundingClientRect.bind(v.image);
  const running = () => animations.find((a) => a.playState === 'running');
  /** A layout box as the running animation's transform, about the paper's corner, draws it */
  const drawn = (box: DOMRect) => {
    const a = running();
    if (!a) return box;
    const { x, y, scale } = a.start;
    // Linearly eased from the start (progress 0) to none (progress 1)
    const s = 1 + (scale - 1) * (1 - a.progress);
    const [tx, ty] = [x * (1 - a.progress), y * (1 - a.progress)];
    const corner = paperLayout();
    return new DOMRect(corner.left + tx + s * (box.left - corner.left), corner.top + ty + s * (box.top - corner.top), s * box.width, s * box.height);
  };
  const paperLayout = () => {
    const r = layoutBox();
    return new DOMRect(r.left - PAPER_PADDING, r.top - PAPER_PADDING, r.width + 2 * PAPER_PADDING, r.height + 2 * PAPER_PADDING);
  };
  v.image.getBoundingClientRect = () => {
    log.push('measure');
    return drawn(layoutBox());
  };
  paper.getBoundingClientRect = () => drawn(paperLayout());
  log.length = 0;
  /** The numeral point at the viewer's centre in the layout, whatever an animation draws, in SVG units */
  const centre = () => {
    const r = layoutBox();
    const zoom = r.width / 350;
    return { x: (v.state.width / 2 - r.left) / zoom, y: (v.state.height / 2 - r.top) / zoom };
  };
  return {
    ...v,
    centre,
    /** How far the layout's centre is from a point, in CSS px at the current zoom level */
    offBy: (point: { x: number; y: number }) => {
      const c = centre();
      return Math.max(Math.abs(c.x - point.x), Math.abs(c.y - point.y)) * (layoutBox().width / 350);
    },
    paper,
    log,
    animations,
    preference,
    running,
    /** The numeral image's untransformed layout box */
    layoutBox,
  };
}

describe('NumeralViewport: zoom animation (UI-13, slice 6)', () => {
  it('animates nothing when first shown, for a new numeral, or for a new mode', () => {
    const v = renderAnimated();
    expect(v.animations).toEqual([]);
    // A new numeral, and Date mode's numeral (a new key and new content, at the same zoom)
    for (const [key, width] of [['b', 350], ['date', 350], ['c', 350]] as const) {
      v.rerender(
        <NumeralViewport numeralWidth={width} background={BACKGROUND} label={LABEL} resetKey={key}>
          <svg width={width} height={240} viewBox={`0 0 ${width} 240`} data-testid="numeral" />
        </NumeralViewport>
      );
    }
    expect(v.animations).toEqual([]);
    // Only a zoom animates
    fireEvent.click(v.zoomIn);
    expect(v.animations).toHaveLength(1);
  });

  it('animates the paper, once per zoom in or out, for 200 ms, a gentle ease-in-out, to no transform', () => {
    const v = renderAnimated();
    fireEvent.click(v.zoomIn);
    v.animations[0].finish();
    fireEvent.click(v.zoomOut);
    expect(v.animations).toHaveLength(2);
    for (const animation of v.animations) {
      expect(animation.target).toBe(v.paper);
      expect(animation.options).toEqual({ duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
      expect(animation.keyframes.at(-1)).toEqual({ transformOrigin: '0 0', transform: 'none' });
      expect(animation.keyframes[0].transformOrigin).toBe('0 0');
    }
    // Zooming in starts smaller, zooming out larger: from the earlier size, 100% and then 125%
    expect(v.animations[0].start.scale).toBeCloseTo(1 / 1.25, 12);
    expect(v.animations[1].start.scale).toBeCloseTo(1.25, 12);
    // No style is left on the paper: the animation's effect is all there is
    expect(v.paper.style.transform).toBe('');
  });

  it('starts by drawing the numeral where it was, after the layout and the scroll position are final', () => {
    const v = renderAnimated();
    v.userScroll(10, 50);
    const before = v.image.getBoundingClientRect();
    const point = v.centre();
    v.log.length = 0;
    fireEvent.click(v.zoomIn);
    // The zoom is laid out and anchored at once: the final width, the point kept at the centre
    expect(v.image.style.width).toBe('437.5px');
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    // At its start, the animation draws the numeral exactly where it was
    const first = v.image.getBoundingClientRect();
    for (const side of ['left', 'top', 'width', 'height'] as const) expect(first[side], side).toBeCloseTo(before[side], 9);
    // The animation starts last: after the measurements for the anchor and the layout
    expect(v.log.at(-2)).toBe('animate');
  });

  it('animates nothing for a zoom past either limit', () => {
    const v = renderAnimated();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(v.zoomIn);
      v.running()?.finish();
    }
    expect(v.zoomText()).toMatch(/^400%/);
    const count = v.animations.length;
    fireEvent.click(v.zoomIn);
    fireEvent.keyDown(v.viewer, { key: '+' });
    expect(v.animations).toHaveLength(count);
    for (let i = 0; i < 8; i++) {
      fireEvent.click(v.zoomOut);
      v.running()?.finish();
    }
    expect(v.zoomText()).toMatch(/^25%/);
    const atMin = v.animations.length;
    fireEvent.click(v.zoomOut);
    fireEvent.keyDown(v.viewer, { key: '-' });
    expect(v.animations).toHaveLength(atMin);
  });

  it('zooms at once, with no animation or transform, when reduced motion is preferred, read at each zoom', () => {
    const v = renderAnimated({ reduce: true });
    const point = v.centre();
    fireEvent.click(v.zoomIn);
    fireEvent.keyDown(v.viewer, { key: '+' });
    expect(v.zoomText()).toBe('150%');
    expect(v.image.style.width).toBe('525px');
    // Within the whole-pixel rounding of the two zooms' scroll positions
    expect(v.offBy(point)).toBeLessThanOrEqual(1);
    expect(v.animations).toEqual([]);
    expect(v.paper.style.transform).toBe('');
    // A change of preference applies from the next zoom, both ways
    v.preference.reduce = false;
    fireEvent.click(v.zoomOut);
    expect(v.animations).toHaveLength(1);
    v.preference.reduce = true;
    fireEvent.click(v.zoomOut);
    expect(v.animations).toHaveLength(1);
    expect(v.animations[0].playState).toBe('idle'); // the second zoom ended the first's animation
  });

  it('retargets a quick second zoom from where the first animation draws the numeral, anchored on the untransformed layout', () => {
    const v = renderAnimated();
    v.userScroll(10, 50);
    const point = v.centre();
    fireEvent.click(v.zoomIn);
    const [first] = v.animations;
    first.progress = 0.4;
    const drawnNow = v.image.getBoundingClientRect();
    v.log.length = 0;

    fireEvent.keyDown(v.viewer, { key: '+' }); // 150%, during the first animation
    // The drawn box is read first, then the first animation cancelled, before any other measurement
    expect(v.log.slice(0, 3)).toEqual(['measure', 'cancel', 'measure']);
    expect(first.playState).toBe('idle');
    const [, second] = v.animations;
    expect(v.running()).toBe(second);
    // The second starts exactly where the first had drawn the numeral
    const start = v.image.getBoundingClientRect();
    for (const side of ['left', 'top', 'width'] as const) expect(start[side], side).toBeCloseTo(drawnNow[side], 9);
    // The anchor comes from the layout, not the transform: the same point at the centre
    expect(v.image.style.width).toBe('525px');
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    // Once finished, the final layout is all that is drawn
    second.finish();
    expect(v.running()).toBeUndefined();
    expect(v.image.getBoundingClientRect()).toEqual(v.layoutBox());
  });

  it('ends a running animation at Reset, which stays instant, with the button and with 0', () => {
    const v = renderAnimated();
    for (const resetBy of ['button', 'key'] as const) {
      fireEvent.click(v.zoomIn);
      const animation = v.running()!;
      animation.progress = 0.5;
      const count = v.animations.length;
      if (resetBy === 'button') fireEvent.click(v.reset);
      else fireEvent.keyDown(v.viewer, { key: '0' });
      expect(animation.playState, resetBy).toBe('idle');
      expect(v.animations, resetBy).toHaveLength(count);
      expect(v.zoomText(), resetBy).toBe('100%');
      expect(v.viewer.scrollTop, resetBy).toBe(0);
      expect(v.centre().x, resetBy).toBeCloseTo(175, 5);
    }
    // Also at 100%, where Reset only scrolls back to the start
    fireEvent.click(v.zoomIn);
    v.running()!.finish();
    fireEvent.click(v.zoomOut);
    const animation = v.running()!;
    fireEvent.click(v.reset);
    expect(animation.playState).toBe('idle');
  });

  it('ends the animation for the user’s scrolling, but not for the viewer’s own', () => {
    const v = renderAnimated();
    v.userScroll(10, 50);
    fireEvent.click(v.zoomIn);
    const animation = v.running()!;
    animation.progress = 0.3;
    // The anchored scroll's own event arrives after the animation has started
    v.scrollEvent();
    v.scrollEvent();
    expect(animation.playState).toBe('running');

    v.log.length = 0;
    v.userScroll(200, 120);
    expect(animation.playState).toBe('idle');
    // Ended before the user's view was measured, which is then taken from the layout
    expect(v.log).toEqual(['cancel', 'measure']);
    const point = v.centre();
    v.resize(260, 160);
    v.report();
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it('ends the animation before correcting for a resize, measuring the layout', () => {
    const v = renderAnimated();
    v.userScroll(10, 50);
    fireEvent.click(v.zoomIn);
    v.scrollEvent();
    const point = v.centre(); // the point kept by the zoom, from the layout
    const animation = v.running()!;
    animation.progress = 0.5;

    v.log.length = 0;
    v.resize(260, 160);
    v.report();
    expect(animation.playState).toBe('idle');
    expect(v.log[0]).toBe('cancel');
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    // A report at the size already shown changes nothing, and starts nothing
    v.report();
    expect(v.animations).toHaveLength(1);
  });

  it('ends a running animation when removed', () => {
    const v = renderAnimated();
    fireEvent.click(v.zoomIn);
    const animation = v.running()!;
    v.unmount();
    expect(animation.playState).toBe('idle');
  });

  it('leaves the accessible image, its label and the zoom announcement as before', () => {
    const v = renderAnimated();
    fireEvent.click(v.zoomIn);
    expect(v.zoomText()).toBe('125%');
    expect(v.image.getAttribute('role')).toBe('img');
    expect(v.image.getAttribute('aria-label')).toBe(LABEL);
    expect(v.paper.getAttribute('aria-hidden')).toBeNull();
    expect(v.paper.getAttribute('role')).toBeNull();
  });
});

describe('NumeralViewport: click-only zoom buttons', () => {
  const MOUSE = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 } as const;
  const TOUCH = { pointerId: 3, pointerType: 'touch', isPrimary: true, button: 0 } as const;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('changes exactly one level for a click, with nothing repeated after it', () => {
    const { zoomIn, zoomOut, zoomText } = renderViewport();
    // A press as a browser sends it: pointerdown, pointerup, then the click
    for (const [button, pointer] of [[zoomIn, MOUSE], [zoomOut, TOUCH]] as const) {
      fireEvent.pointerDown(button, pointer);
      fireEvent.pointerUp(button, pointer);
      fireEvent.click(button, { detail: 1 });
    }
    // One level in, one level out
    expect(zoomText()).toBe('100%');
    fireEvent.click(zoomIn, { detail: 1 });
    expect(zoomText()).toBe('125%');
    act(() => vi.advanceTimersByTime(5000));
    expect(zoomText()).toBe('125%');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not zoom on pointerdown, however long the pointer is held, moved or cancelled', () => {
    const { zoomIn, zoomOut, zoomText } = renderViewport();
    fireEvent.pointerDown(zoomIn, MOUSE);
    expect(zoomText()).toBe('100%');
    act(() => vi.advanceTimersByTime(5000));
    expect(zoomText()).toBe('100%');
    fireEvent.pointerMove(document.body, MOUSE);
    fireEvent.pointerUp(document.body, MOUSE); // released outside the button: no click comes
    expect(zoomText()).toBe('100%');
    // A touch the browser takes over to scroll: pointercancel, and no click
    fireEvent.pointerDown(zoomOut, TOUCH);
    fireEvent.pointerCancel(zoomOut, TOUCH);
    fireEvent.lostPointerCapture(zoomOut, TOUCH);
    act(() => vi.advanceTimersByTime(5000));
    expect(zoomText()).toBe('100%');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never swallows an activation: keyboard and assistive-technology clicks always step', () => {
    const { zoomIn, zoomOut, zoomText } = renderViewport();
    zoomIn.focus();
    fireEvent.click(zoomIn, { detail: 0 }); // Enter or Space on the button
    expect(zoomText()).toBe('125%');
    // Right after a pointer press that released outside the button and sent no click
    fireEvent.pointerDown(zoomIn, MOUSE);
    fireEvent.pointerUp(document.body, MOUSE);
    fireEvent.click(zoomIn, { detail: 0 }); // a script or assistive technology
    expect(zoomText()).toBe('150%');
    fireEvent.click(zoomOut, { detail: 1 });
    expect(zoomText()).toBe('125%');
    expect(document.activeElement).toBe(zoomIn);
  });

  it('stops at either limit, where the button is aria-disabled and a click does nothing', () => {
    const v = renderAnimated();
    for (let i = 0; i < 5; i++) fireEvent.click(v.zoomIn);
    expect(v.zoomText()).toBe('400% (maximum zoom)');
    expect(v.zoomIn.getAttribute('aria-disabled')).toBe('true');
    const animations = v.animations.length;
    fireEvent.click(v.zoomIn);
    expect(v.zoomText()).toBe('400% (maximum zoom)');
    expect(v.animations).toHaveLength(animations);
    for (let i = 0; i < 8; i++) fireEvent.click(v.zoomOut);
    expect(v.zoomText()).toBe('25% (minimum zoom)');
    expect(v.zoomOut.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(v.zoomOut);
    expect(v.zoomText()).toBe('25% (minimum zoom)');
  });

  it('zooms one level for + or - on the viewer, and ignores the key repeating while it is held', () => {
    const { viewer, zoomText } = renderViewport();
    fireEvent.keyDown(viewer, { key: '+' });
    expect(zoomText()).toBe('125%');
    for (let i = 0; i < 5; i++) fireEvent.keyDown(viewer, { key: '+', repeat: true });
    expect(zoomText()).toBe('125%');
    fireEvent.keyDown(viewer, { key: '=', repeat: true });
    expect(zoomText()).toBe('125%');
    // Released and pressed again: a new key press
    fireEvent.keyDown(viewer, { key: '=' });
    expect(zoomText()).toBe('150%');
    fireEvent.keyDown(viewer, { key: '-' });
    expect(zoomText()).toBe('125%');
    for (let i = 0; i < 5; i++) fireEvent.keyDown(viewer, { key: '-', repeat: true });
    expect(zoomText()).toBe('125%');
    fireEvent.keyDown(viewer, { key: '-' });
    expect(zoomText()).toBe('100%');
    // The key is still the viewer's own: a repeat is not left to the browser (fireEvent returns
    // false for a prevented event)
    expect(fireEvent.keyDown(viewer, { key: '+', repeat: true })).toBe(false);
  });

  it('leaves Reset, its shortcut and the other keys as they were', () => {
    const { viewer, zoomText } = renderViewport();
    fireEvent.keyDown(viewer, { key: '+' });
    fireEvent.keyDown(viewer, { key: '+' });
    expect(zoomText()).toBe('150%');
    fireEvent.keyDown(viewer, { key: '0' });
    expect(zoomText()).toBe('100%');
    // Ctrl/⌘ + and other keys are not the viewer's
    fireEvent.keyDown(viewer, { key: '+', ctrlKey: true });
    fireEvent.keyDown(viewer, { key: 'ArrowDown' });
    expect(zoomText()).toBe('100%');
  });

  it('keeps the buttons’ names, states and type, native activation included', () => {
    const { zoomIn, zoomOut, zoomText } = renderViewport();
    for (const button of [zoomIn, zoomOut]) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.hasAttribute('disabled')).toBe(false);
    }
    expect(zoomIn.getAttribute('aria-disabled')).toBe('false');
    // Native activation: the browser's own click, which a user's Enter or Space produces
    zoomIn.focus();
    act(() => zoomIn.click());
    expect(zoomText()).toBe('125%');
    expect(document.activeElement).toBe(zoomIn);
  });

  it('animates a click, and only a click, for 200 ms with the approved easing, one animation at a time', () => {
    const v = renderAnimated();
    fireEvent.pointerDown(v.zoomIn, MOUSE);
    act(() => vi.advanceTimersByTime(2000));
    expect(v.animations).toHaveLength(0);
    fireEvent.pointerUp(v.zoomIn, MOUSE);
    fireEvent.click(v.zoomIn, { detail: 1 });
    expect(v.animations).toHaveLength(1);
    expect(v.animations[0].options).toEqual({ duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    // A rapid second click retargets from where the numeral is drawn, with the same timing
    fireEvent.click(v.zoomIn, { detail: 1 });
    expect(v.animations.map((a) => a.playState)).toEqual(['idle', 'running']);
    expect(v.animations[1].options).toEqual({ duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    // A repeating key adds none
    fireEvent.keyDown(v.viewer, { key: '+', repeat: true });
    expect(v.animations).toHaveLength(2);
  });

  it('zooms at once, with no animation and no transform, for a click when reduced motion is preferred', () => {
    const v = renderAnimated({ reduce: true });
    fireEvent.click(v.zoomIn, { detail: 1 });
    fireEvent.click(v.zoomIn, { detail: 1 });
    expect(v.zoomText()).toBe('150%');
    expect(v.image.style.width).toBe('525px');
    expect(v.animations).toEqual([]);
    expect(v.paper.style.transform).toBe('');
  });
});

describe('NumeralViewport: the 125% zoom level (UI-13)', () => {
  it('steps from 100% through 125% to 150% and back, with the buttons and with the keys, at exact widths', () => {
    const { zoomIn, zoomOut, viewer, image, zoomText } = renderViewport();
    const at = () => [zoomText(), image.style.width];

    expect(at()).toEqual(['100%', '350px']);
    fireEvent.click(zoomIn);
    expect(at()).toEqual(['125%', '437.5px']);
    fireEvent.click(zoomIn);
    expect(at()).toEqual(['150%', '525px']);
    fireEvent.click(zoomOut);
    expect(at()).toEqual(['125%', '437.5px']);
    fireEvent.click(zoomOut);
    expect(at()).toEqual(['100%', '350px']);

    fireEvent.keyDown(viewer, { key: '+' });
    expect(at()).toEqual(['125%', '437.5px']);
    fireEvent.keyDown(viewer, { key: '+' });
    expect(at()).toEqual(['150%', '525px']);
    fireEvent.keyDown(viewer, { key: '-' });
    expect(at()).toEqual(['125%', '437.5px']);
    fireEvent.keyDown(viewer, { key: '-' });
    expect(at()).toEqual(['100%', '350px']);
  });

  it('reaches the maximum in exactly five steps from 100% and the minimum in exactly three, and no sooner', () => {
    const { zoomIn, zoomOut, viewer, zoomText } = renderViewport();

    for (let i = 0; i < 4; i++) fireEvent.click(zoomIn);
    expect(zoomText()).toBe('300%');
    expect(zoomIn.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('400% (maximum zoom)');
    expect(zoomIn.getAttribute('aria-disabled')).toBe('true');
    // At the maximum both ways of zooming in do nothing, and the shortcut is still the viewer's own
    fireEvent.click(zoomIn);
    expect(fireEvent.keyDown(viewer, { key: '+' })).toBe(false);
    expect(zoomText()).toBe('400% (maximum zoom)');

    for (let i = 0; i < 7; i++) fireEvent.click(zoomOut);
    expect(zoomText()).toBe('50%');
    expect(zoomOut.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(zoomOut);
    expect(zoomText()).toBe('25% (minimum zoom)');
    expect(zoomOut.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(zoomOut);
    expect(fireEvent.keyDown(viewer, { key: '-' })).toBe(false);
    expect(zoomText()).toBe('25% (minimum zoom)');
  });

  it('keeps the point at the centre through 100% → 125% → 150% and back', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    // The numeral's middle (175, 80), within the scrollable area at each of the three levels
    v.userScroll(53, 8);
    const point = v.centre();
    expect(point.x).toBeCloseTo(175, 0);
    expect(point.y).toBeCloseTo(80, 0);

    // Within the whole-pixel rounding of the browser's scroll positions
    for (const [button, level] of [
      [v.zoomIn, '125%'],
      [v.zoomIn, '150%'],
      [v.zoomOut, '125%'],
      [v.zoomOut, '100%'],
    ] as const) {
      fireEvent.click(button);
      expect(v.zoomText()).toBe(level);
      expect(v.offBy(point), level).toBeLessThanOrEqual(1);
    }
  });

  it('resets from 125% to 100% and the start of the numeral, with the button and with 0', () => {
    for (const resetBy of ['button', 'key'] as const) {
      const v = renderLaidOut({ width: 300, height: 200 });
      fireEvent.click(v.zoomIn);
      expect(v.zoomText()).toBe('125%');
      v.userScroll(150, 40);
      if (resetBy === 'button') fireEvent.click(v.reset);
      else fireEvent.keyDown(v.viewer, { key: '0' });
      expect(v.zoomText(), resetBy).toBe('100%');
      expect(v.image.style.width, resetBy).toBe('350px');
      expect(v.viewer.scrollTop, resetBy).toBe(0);
      expect(v.centre().x, resetBy).toBeCloseTo(175, 5);
      cleanup();
    }
  });

  it('animates 100% → 125% → 150% from where the numeral was drawn, one animation each', () => {
    const v = renderAnimated();
    fireEvent.click(v.zoomIn);
    v.animations[0].finish();
    fireEvent.click(v.zoomIn);
    expect(v.animations).toHaveLength(2);
    expect(v.animations[0].start.scale).toBeCloseTo(350 / 437.5, 12);
    expect(v.animations[1].start.scale).toBeCloseTo(437.5 / 525, 12);
  });

  it('zooms to 125% and 150% at once when reduced motion is preferred, with no animation or transform', () => {
    const v = renderAnimated({ reduce: true });
    const point = v.centre();
    fireEvent.click(v.zoomIn);
    expect(v.zoomText()).toBe('125%');
    expect(v.image.style.width).toBe('437.5px');
    fireEvent.click(v.zoomIn);
    expect(v.zoomText()).toBe('150%');
    expect(v.image.style.width).toBe('525px');
    expect(v.offBy(point)).toBeLessThanOrEqual(1);
    expect(v.animations).toEqual([]);
    expect(v.paper.style.transform).toBe('');
  });
});


/*
 * The annotation gutters (UI-10, slice 2). happy-dom does no layout: these tests check the
 * structure, identity, classes and inline sizes. That the gutters stick, centre like the paper,
 * match the image's box to the pixel, and appear from a stage width of 31rem are browser
 * behaviours, outstanding for the browser tests (slice 5).
 */
describe('NumeralViewport: annotation gutters (UI-10, slice 2)', () => {
  const NUMERAL_HEIGHT = 160;

  type GutterProps = { annotationsStart?: ReactNode; annotationsEnd?: ReactNode; numeralHeight?: number };

  function renderGutters(props: GutterProps = {}) {
    const element = (p: GutterProps) => (
      <NumeralViewport numeralWidth={350} background={BACKGROUND} label={LABEL} {...p}>
        <svg width={350} height={NUMERAL_HEIGHT} viewBox="0 0 350 160" data-testid="numeral" />
      </NumeralViewport>
    );
    const result = render(element(props));
    const parts = () => {
      const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
      const content = viewer.querySelector<HTMLElement>('[data-numeral-stage-content]')!;
      return {
        viewer,
        content,
        group: content.querySelector<HTMLElement>('[data-numeral-group]')!,
        paper: viewer.querySelector<HTMLElement>('[data-numeral-paper]')!,
        image: screen.getByRole('img', { name: LABEL }),
        start: content.querySelector<HTMLElement>('[data-numeral-annotations="start"]'),
        end: content.querySelector<HTMLElement>('[data-numeral-annotations="end"]'),
      };
    };
    return { ...result, parts, change: (p: GutterProps) => result.rerender(element(p)) };
  }

  const box = (gutter: HTMLElement) => gutter.querySelector<HTMLElement>('[data-numeral-annotations-box]')!;
  const classesOf = (el: HTMLElement) => el.className.split(' ');

  it('without slots: the centred group holds the paper alone, and there is no container', () => {
    const { parts } = renderGutters();
    const { viewer, content, group, paper } = parts();
    expect([...content.children]).toEqual([group]);
    expect([...group.children]).toEqual([paper]);
    expect(content.querySelector('[data-numeral-annotations]')).toBeNull();
    expect(classesOf(viewer)).not.toContain('@container');
    expect(content.className).toBe('flex w-max min-w-full min-h-full p-4 overflow-clip');
  });

  it('adds no gutters from a height alone, nor slots without a usable height', () => {
    const unusable: GutterProps[] = [
      { numeralHeight: NUMERAL_HEIGHT },
      { annotationsStart: <b>x</b> },
      { annotationsStart: <b>x</b>, numeralHeight: 0 },
      { annotationsStart: <b>x</b>, numeralHeight: -80 },
      { annotationsStart: <b>x</b>, numeralHeight: Number.NaN },
      { annotationsStart: <b>x</b>, numeralHeight: Number.POSITIVE_INFINITY },
      { annotationsStart: false, annotationsEnd: null, numeralHeight: NUMERAL_HEIGHT },
    ];
    for (const props of unusable) {
      const { parts, unmount } = renderGutters(props);
      expect(parts().group.children).toHaveLength(1);
      expect(classesOf(parts().viewer)).not.toContain('@container');
      unmount();
    }
  });

  it('puts the start gutter before the paper and the end gutter after it, each with its slot', () => {
    const { parts } = renderGutters({
      annotationsStart: <i data-testid="start-slot" />,
      annotationsEnd: <i data-testid="end-slot" />,
      numeralHeight: NUMERAL_HEIGHT,
    });
    const { content, group, paper, start, end } = parts();
    expect([...content.children]).toEqual([group]);
    expect([...group.children]).toEqual([start, paper, end]);
    expect(box(start!).contains(screen.getByTestId('start-slot'))).toBe(true);
    expect(box(end!).contains(screen.getByTestId('end-slot'))).toBe(true);
    // Neither gutter is inside the paper, nor in the numeral image or its SVG
    expect(paper.contains(start)).toBe(false);
    expect(paper.contains(end)).toBe(false);
    expect(screen.getByTestId('numeral').closest('[data-numeral-annotations]')).toBeNull();
  });

  it('lays out both gutters when only one has content, so the numeral stays centred', () => {
    const { parts } = renderGutters({ annotationsStart: <i data-testid="only" />, numeralHeight: NUMERAL_HEIGHT });
    const { content, group, paper, start, end } = parts();
    expect([...content.children]).toEqual([group]);
    expect([...group.children]).toEqual([start, paper, end]);
    expect(box(end!).childNodes).toHaveLength(0);
    expect(classesOf(start!)).toContain('w-10.5');
    expect(classesOf(end!)).toContain('w-10.5');
  });

  it('keeps the viewer, paper and image elements when gutters appear and disappear', () => {
    const { parts, change } = renderGutters();
    const before = parts();

    change({ annotationsStart: <i />, annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    const during = parts();
    expect(during.start).not.toBeNull();
    expect(during.viewer).toBe(before.viewer);
    expect(during.content).toBe(before.content);
    expect(during.paper).toBe(before.paper);
    expect(during.image).toBe(before.image);
    expect(during.image.contains(screen.getByTestId('numeral'))).toBe(true);

    change({});
    const after = parts();
    expect(after.start).toBeNull();
    expect(after.paper).toBe(before.paper);
    expect(after.image).toBe(before.image);
    expect(classesOf(after.viewer)).not.toContain('@container');
  });

  it('keeps its single scroller observer and its zoom through slot changes', () => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const { parts, change } = renderGutters();
    const { viewer } = parts();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(parts().image.style.width).toBe('437.5px');

    change({ annotationsStart: <i />, annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    change({});
    expect(FakeResizeObserver.instances).toHaveLength(1);
    expect(FakeResizeObserver.instances[0].observed).toEqual([viewer]);
    expect(parts().image.style.width).toBe('437.5px');
  });

  it('makes the viewer a container for the width query only while there are gutters', () => {
    const { parts, change } = renderGutters({ annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    expect(classesOf(parts().viewer)).toContain('@container');
    change({});
    expect(classesOf(parts().viewer)).not.toContain('@container');
  });

  it('gives each gutter its place, layer and look: sticky, above the numeral, opaque, and no pointer', () => {
    const { parts } = renderGutters({ annotationsStart: <i />, annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    const { start, end, content } = parts();
    for (const gutter of [start!, end!]) {
      expect(classesOf(gutter)).toEqual(
        expect.arrayContaining(['sticky', 'z-10', 'bg-canvas', 'pointer-events-none', 'shrink-0'])
      );
      expect(gutter.getAttribute('aria-hidden')).toBe('true');
      expect(gutter.tabIndex).toBe(-1);
      // Hidden by default; shown by the stage's width (a browser test checks the threshold)
      expect(classesOf(gutter)).toContain('hidden');
      expect(classesOf(gutter)).toContain('@min-[31rem]:flex');
    }
    // Pinned to the scroller's edges, so no strip beside a gutter shows the scrolling paper; the
    // stage content's padding (p-4) keeps them in the flow at the ends, so nothing jumps
    expect(classesOf(start!)).toContain('left-0');
    expect(classesOf(end!)).toContain('right-0');
    for (const gutter of [start!, end!]) {
      expect(classesOf(gutter)).not.toContain('left-4');
      expect(classesOf(gutter)).not.toContain('right-4');
    }
    expect(classesOf(content)).toContain('p-4');
  });

  it('mirrors the image: as tall as the numeral at each zoom level, with the paper’s vertical layout', () => {
    const { parts } = renderGutters({ annotationsStart: <i />, annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });

    // 100%, then 125%, 150%
    for (const [width, height] of [
      ['350px', '160px'],
      ['437.5px', '200px'],
      ['525px', '240px'],
    ]) {
      const { image, start, end } = parts();
      expect(image.style.width).toBe(width);
      expect(box(start!).style.height).toBe(height);
      expect(box(end!).style.height).toBe(height);
      fireEvent.click(zoomIn);
    }

    // The same automatic margins and vertical padding as the paper (m-auto, p-3); no horizontal
    // padding, which would narrow the labels
    const { paper, start } = parts();
    const inner = start!.firstElementChild as HTMLElement;
    expect(classesOf(paper)).toEqual(expect.arrayContaining(['m-auto', 'p-3']));
    expect(classesOf(inner)).toEqual(expect.arrayContaining(['m-auto', 'py-3']));
    expect(classesOf(inner)).not.toContain('p-3');
    expect(inner.firstElementChild).toBe(box(start!));
    expect(classesOf(box(start!))).toContain('relative');
  });

  it('centres a real group: a flex box with automatic margins that is never shrunk', () => {
    const { parts } = renderGutters({ annotationsStart: <i />, annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    const { content, group } = parts();
    expect(group.parentElement).toBe(content);
    expect(classesOf(group)).toEqual(expect.arrayContaining(['m-auto', 'flex', 'shrink-0']));
    // A real layout box, not display: contents, and it has no padding of its own
    expect(classesOf(group)).not.toContain('contents');
    expect(group.style.display).toBe('');
    expect(classesOf(group).filter((c) => /^p[xytrblse]?-/.test(c))).toEqual([]);
    // The group is the stage content's only item, so the page gets no overflow of its own
    expect(content.children).toHaveLength(1);
    expect(classesOf(content)).toContain('overflow-clip');
  });

  it('keeps the group, paper and image the same elements through gutters appearing and disappearing', () => {
    const { parts, change } = renderGutters();
    const before = parts();
    change({ annotationsStart: <i />, annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    const during = parts();
    expect(during.group).toBe(before.group);
    expect(during.paper).toBe(before.paper);
    expect(during.image).toBe(before.image);
    change({});
    expect(parts().group).toBe(before.group);
    expect(parts().paper).toBe(before.paper);
    expect(document.querySelectorAll('[data-numeral-group]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-numeral-paper]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-numeral-image]')).toHaveLength(1);
  });

  it('gives the paper the same neighbours whatever the slots hold, so Date mode cannot shift it', () => {
    const shape = (p: GutterProps) => {
      const { parts, unmount } = renderGutters(p);
      const { group, start, end } = parts();
      const result = {
        order: [...group.children].map((c) => c.getAttribute('data-numeral-annotations') ?? 'paper'),
        classes: [start, end].map((g) => (g ? g.className : null)).map((c) => c?.replace(/left-0|right-0/, '')),
        boxes: [start, end].map((g) => (g ? box(g).style.height : null)),
      };
      unmount();
      return result;
    };
    const both = shape({ annotationsStart: <i />, annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    const startOnly = shape({ annotationsStart: <i />, numeralHeight: NUMERAL_HEIGHT });
    const endOnly = shape({ annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    expect(both.order).toEqual(['start', 'paper', 'end']);
    expect(startOnly).toEqual(both);
    expect(endOnly).toEqual(both);
  });

  it('keeps the gutter width, the 31rem threshold and the zoom wrapper as they were', () => {
    const { parts } = renderGutters({ annotationsStart: <i />, annotationsEnd: <i />, numeralHeight: NUMERAL_HEIGHT });
    const { start, end, image } = parts();
    for (const gutter of [start!, end!]) {
      expect(classesOf(gutter)).toEqual(expect.arrayContaining(['w-10.5', 'hidden', '@min-[31rem]:flex']));
    }
    expect(image.style.width).toBe('350px');
  });
});

describe('NumeralViewport: annotations during the zoom animation (UI-10, slice 3.1)', () => {
  const annotated = (extra: Record<string, unknown> = {}) => ({
    numeralHeight: 160,
    annotationsStart: <span data-testid="start-label">20</span>,
    annotationsEnd: <span data-testid="end-label">1</span>,
    underlay: <div data-testid="underlay-guide" />,
    overlay: <div data-testid="overlay-hairline" />,
    ...extra,
  });
  const setup = (opts: { reduce?: boolean } = {}) => renderAnimated({ ...opts, viewport: annotated() });
  const zooming = (v: { viewer: HTMLElement }) => v.viewer.hasAttribute('data-zooming');
  /** Lets the animations' `finished` handlers run: promise callbacks only, no timers */
  const flush = () => act(async () => {});

  it('marks the stage, and only the stage, while a zoom animation runs, and not before', () => {
    const v = setup();
    expect(zooming(v)).toBe(false);
    fireEvent.click(v.zoomIn);
    expect(v.running()).toBeDefined();
    expect(zooming(v)).toBe(true);
    expect(v.viewer.hasAttribute('data-numeral-stage')).toBe(true);
    expect(document.querySelectorAll('[data-zooming]')).toHaveLength(1);
  });

  it('hides the labels by the mark, and clears the gutters’ background only where it fits, keeping their layout, the guides, hairlines and paper', () => {
    const v = setup();
    // The labels' boxes are hidden throughout the animation
    const boxes = [...v.viewer.querySelectorAll<HTMLElement>('[data-numeral-annotations-box]')];
    expect(boxes).toHaveLength(2);
    for (const box of boxes) expect(box.className.split(' ')).toContain('in-data-[zooming]:invisible');
    // ...and transparent, fading back in over 150 ms once the mark goes, only where motion is
    // not reduced: every transition class is behind `motion-safe:`, so with reduced motion they
    // reappear at once
    for (const box of boxes) {
      const classes = box.className.split(' ');
      expect(classes).toEqual(
        expect.arrayContaining(['in-data-[zooming]:opacity-0', 'motion-safe:transition-opacity', 'motion-safe:duration-150'])
      );
      const timing = classes.filter((c) => /(^|:)(transition|duration|ease|delay)/.test(c));
      expect(timing).toEqual(['motion-safe:transition-opacity', 'motion-safe:duration-150']);
    }
    // The fade is the labels' only: the gutters, their background and layout, have no transition
    for (const gutter of v.viewer.querySelectorAll<HTMLElement>('[data-numeral-annotations]')) {
      expect(gutter.className).not.toMatch(/transition|duration|opacity/);
    }
    // Changed deliberately in UI-10: the gutters themselves stay visible, and their background is
    // transparent only where the zoomed layout does not scroll sideways (`data-zooming="fit"`):
    // zooming out, the paper is drawn larger than its final box, and shows through them
    const gutters = [...v.viewer.querySelectorAll<HTMLElement>('[data-numeral-annotations]')];
    expect(gutters).toHaveLength(2);
    for (const gutter of gutters) {
      expect(gutter.className.split(' ')).toContain('in-data-[zooming=fit]:bg-transparent');
      expect(gutter.className).not.toContain('invisible');
      expect(gutter.className).not.toContain('opacity');
      // Its layout, layer and look are unchanged
      expect(gutter.className.split(' ')).toEqual(
        expect.arrayContaining(['w-10.5', 'sticky', 'z-10', 'bg-canvas', 'hidden', '@min-[31rem]:flex'])
      );
    }

    // Nothing else is given a zooming class: not the guides, the hairlines, the paper or the image
    const marked = [...v.viewer.querySelectorAll('[class]')].filter((el) =>
      el.className.toString().split(' ').some((name) => name.includes('[zooming'))
    );
    // In document order: each gutter, then its box
    expect(marked).toEqual([gutters[0], boxes[0], gutters[1], boxes[1]]);
    for (const id of ['underlay-guide', 'overlay-hairline']) {
      expect(v.image.contains(screen.getByTestId(id))).toBe(true);
      expect(screen.getByTestId(id).className).toBe('');
    }
    expect(v.paper.className).not.toContain('invisible');
    expect(v.image.className).not.toContain('invisible');
    fireEvent.click(v.zoomIn);
    expect(v.paper.hasAttribute('data-zooming')).toBe(false);
    expect(v.image.hasAttribute('data-zooming')).toBe(false);
  });

  it('marks a zoom whose layout fits the stage sideways as `fit`, and one that scrolls sideways as empty', async () => {
    // 600 px wide: at 125% the numeral, the paper's and stage's padding and the gutters need
    // 437.5 + 56 + 84 = 577.5 px and fit; at 150%, 525 + 140 = 665 px, and scroll sideways
    const v = renderAnimated({ width: 600, viewport: annotated() });
    const mark = () => v.viewer.getAttribute('data-zooming');
    const settle = async () => {
      v.running()!.finish();
      await flush();
      expect(mark()).toBeNull();
    };
    fireEvent.click(v.zoomIn); // 125%: fits
    expect(mark()).toBe('fit');
    await settle();
    fireEvent.click(v.zoomIn); // 150%: scrolls sideways
    expect(mark()).toBe('');
    await settle();
    fireEvent.click(v.zoomOut); // back to 125%: fits again, judged by the zoomed layout
    expect(mark()).toBe('fit');
    await settle();
    fireEvent.click(v.zoomOut); // 100%
    expect(mark()).toBe('fit');
    // A new zoom replacing a running one is marked for its own layout
    fireEvent.click(v.zoomIn);
    fireEvent.click(v.zoomIn); // 150% while 125%'s animation ran
    expect(mark()).toBe('');
    expect(document.querySelectorAll('[data-zooming]')).toHaveLength(1);
    await settle();
  });

  it('removes the mark when the animation finishes', async () => {
    const v = setup();
    fireEvent.click(v.zoomIn);
    v.running()!.finish();
    await flush();
    expect(zooming(v)).toBe(false);
  });

  it('removes the mark when the animation is cancelled from outside', async () => {
    const v = setup();
    fireEvent.click(v.zoomIn);
    v.running()!.cancel();
    await flush();
    expect(zooming(v)).toBe(false);
  });

  it('keeps the mark for a replacement animation, whatever the replaced one does afterwards', async () => {
    const v = setup();
    fireEvent.click(v.zoomIn);
    const [first] = v.animations;
    fireEvent.click(v.zoomIn); // cancels the first, starts the second
    const second = v.running()!;
    expect(second).not.toBe(first);
    expect(zooming(v)).toBe(true);

    await flush(); // the first's rejection settles: a stale handler
    expect(zooming(v)).toBe(true);
    expect(v.running()).toBe(second);

    first.finish(); // a late fulfilment of the stale one changes nothing either
    await flush();
    expect(zooming(v)).toBe(true);

    second.finish();
    await flush();
    expect(zooming(v)).toBe(false);
  });

  it('keeps the mark through rapid repeated zooms, until the last animation ends', async () => {
    const v = setup();
    fireEvent.click(v.zoomIn);
    fireEvent.keyDown(v.viewer, { key: '+' });
    fireEvent.click(v.zoomIn);
    fireEvent.keyDown(v.viewer, { key: '-' });
    expect(v.animations).toHaveLength(4);
    expect(v.animations.filter((a) => a.playState === 'running')).toHaveLength(1);
    expect(zooming(v)).toBe(true);

    await flush();
    expect(zooming(v)).toBe(true);
    v.running()!.finish();
    await flush();
    expect(zooming(v)).toBe(false);
  });

  it('removes the mark at once when a resize ends the animation', () => {
    const v = setup();
    v.userScroll(10, 50);
    fireEvent.click(v.zoomIn);
    expect(zooming(v)).toBe(true);
    v.resize(260, 160);
    v.report();
    expect(v.animations[0].playState).toBe('idle');
    expect(zooming(v)).toBe(false);
  });

  it('removes the mark at once at Reset, with the button and with 0', () => {
    const v = setup();
    for (const resetBy of ['button', 'key'] as const) {
      fireEvent.click(v.zoomIn);
      expect(zooming(v), resetBy).toBe(true);
      if (resetBy === 'button') fireEvent.click(v.reset);
      else fireEvent.keyDown(v.viewer, { key: '0' });
      expect(zooming(v), resetBy).toBe(false);
    }
  });

  it('removes the mark at once when the user scrolls, but not for the viewer’s own scrolling', () => {
    const v = setup();
    v.userScroll(10, 50);
    fireEvent.click(v.zoomIn);
    v.scrollEvent(); // the anchored scroll's own event
    expect(zooming(v)).toBe(true);
    v.userScroll(200, 120);
    expect(v.animations[0].playState).toBe('idle');
    expect(zooming(v)).toBe(false);
  });

  it('removes the mark at once for a new numeral', () => {
    const v = setup();
    fireEvent.click(v.zoomIn);
    expect(zooming(v)).toBe(true);
    v.rerender(
      <NumeralViewport numeralWidth={350} background={BACKGROUND} label={LABEL} resetKey="b" {...annotated()}>
        <svg width={350} height={160} viewBox="0 0 350 160" data-testid="numeral" />
      </NumeralViewport>
    );
    expect(v.animations[0].playState).toBe('idle');
    expect(zooming(v)).toBe(false);
  });

  it('never marks the stage with reduced motion', async () => {
    const v = setup({ reduce: true });
    fireEvent.click(v.zoomIn);
    fireEvent.click(v.zoomIn);
    expect(v.animations).toHaveLength(0);
    expect(zooming(v)).toBe(false);
    await flush();
    expect(zooming(v)).toBe(false);
  });

  it('leaves no mark when the animation cannot be created', () => {
    const v = setup();
    (Element.prototype.animate as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('animate failed');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      fireEvent.click(v.zoomIn);
    } catch {
      // The error may propagate from the layout effect; the stage must not be marked either way
    }
    error.mockRestore();
    expect(zooming(v)).toBe(false);
  });

  it('ends the animation and the mark when removed, and a late settling is harmless', async () => {
    const v = setup();
    fireEvent.click(v.zoomIn);
    const animation = v.running()!;
    const stage = v.viewer;
    v.unmount();
    expect(animation.playState).toBe('idle');
    expect(stage.hasAttribute('data-zooming')).toBe(false);
    animation.finish();
    await flush();
    expect(stage.hasAttribute('data-zooming')).toBe(false);
  });
});

describe('NumeralViewport: keeping the view when the annotation gutters are toggled (UI-10, slice 3.2)', () => {
  const annotations = {
    numeralHeight: 160,
    annotationsStart: <span>20</span>,
    annotationsEnd: <span>1</span>,
  };
  /** The viewport as renderViewport renders it, with or without the annotation gutters */
  const element = (on: boolean, { resetKey = 'a', label = LABEL } = {}) => (
    <NumeralViewport numeralWidth={350} background={BACKGROUND} label={label} resetKey={resetKey} {...(on ? annotations : {})}>
      <svg width={350} height={160} viewBox="0 0 350 160" data-testid="numeral" />
    </NumeralViewport>
  );
  const gutterCount = (v: { viewer: HTMLElement }) => v.viewer.querySelectorAll('[data-numeral-annotations]').length;

  it('keeps the point at the centre when the gutters appear while the numeral overflows and is scrolled', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    v.userScroll(50, 20);
    const point = v.centre();
    v.rerender(element(true));
    expect(gutterCount(v)).toBe(2);
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    // The scroll position moved with the paper
    expect(v.viewer.scrollLeft).not.toBe(50);
  });

  it('keeps the point at the centre when the gutters go while the numeral overflows', () => {
    const v = renderLaidOut({ width: 300, height: 200, viewport: annotations });
    expect(gutterCount(v)).toBe(2);
    v.userScroll(80, 20);
    const point = v.centre();
    v.rerender(element(false));
    expect(gutterCount(v)).toBe(0);
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    expect(v.viewer.scrollLeft).not.toBe(80);
  });

  it('moves nothing when the numeral fits with and without the gutters', () => {
    const v = renderLaidOut({ width: 600, height: 400 });
    const scrolls = v.state.scrollToCalls;
    const point = v.centre();
    v.rerender(element(true));
    expect([v.viewer.scrollLeft, v.viewer.scrollTop]).toEqual([0, 0]);
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    v.rerender(element(false));
    expect([v.viewer.scrollLeft, v.viewer.scrollTop]).toEqual([0, 0]);
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    expect(v.state.scrollToCalls).toBe(scrolls);
  });

  it('keeps the point at the centre when the gutters make a numeral that fitted overflow (125%)', () => {
    // 437.5 + 24 + 32 = 493.5 px fits the 520 px stage; with the gutters, 577.5 px does not
    const v = renderLaidOut({ width: 520, height: 600 });
    fireEvent.click(v.zoomIn);
    expect(v.zoomText()).toBe('125%');
    expect(v.viewer.scrollLeft).toBe(0);
    const point = v.centre();
    v.rerender(element(true));
    expect(v.viewer.scrollLeft).toBeGreaterThan(0);
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    v.rerender(element(false));
    expect(v.viewer.scrollLeft).toBe(0);
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it.each([
    ['25%', 0, 3, 0],
    ['100%', 0, 0, 40],
    ['400%', 5, 0, 500],
  ])('keeps the point at the centre at %s, both ways', (zoomText, ins, outs, scrollLeft) => {
    const v = renderLaidOut({ width: 300, height: 200 });
    for (let i = 0; i < ins; i++) fireEvent.click(v.zoomIn);
    for (let i = 0; i < outs; i++) fireEvent.click(v.zoomOut);
    expect(v.zoomText().startsWith(zoomText)).toBe(true); // the limits add a screen-reader suffix
    v.userScroll(scrollLeft, 30);
    const point = v.centre();
    v.rerender(element(true));
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    v.rerender(element(false));
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it('does not drift through rapid toggling', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    v.userScroll(50, 20);
    const [left, top] = [v.viewer.scrollLeft, v.viewer.scrollTop]; // the vertical position is clamped
    const point = v.centre();
    for (let i = 0; i < 5; i++) {
      v.rerender(element(true));
      expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
      v.rerender(element(false));
      expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
    }
    expect(Math.abs(v.viewer.scrollLeft - left)).toBeLessThanOrEqual(1);
    expect(Math.abs(v.viewer.scrollTop - top)).toBeLessThanOrEqual(1);
  });

  it('ends a running zoom animation before measuring, and keeps the view', () => {
    const v = renderAnimated({ width: 300, height: 200 });
    v.userScroll(10, 50);
    fireEvent.click(v.zoomIn);
    v.scrollEvent();
    const animation = v.running()!;
    animation.progress = 0.5;
    expect(v.viewer.hasAttribute('data-zooming')).toBe(true);
    const point = v.centre();

    v.log.length = 0;
    v.rerender(element(true));
    expect(animation.playState).toBe('idle');
    expect(v.log[0]).toBe('cancel');
    expect(v.log).toContain('measure');
    expect(v.viewer.hasAttribute('data-zooming')).toBe(false);
    expect(v.animations).toHaveLength(1);
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it('does not re-anchor on the first render with the gutters, which shows the start', () => {
    const v = renderLaidOut({ width: 300, height: 200, viewport: annotations });
    // Content 406 + 84 = 490 px wide: the start centres the paper, (490 − 300) / 2 px in
    expect(v.viewer.scrollLeft).toBe(95);
    expect(v.state.scrollToCalls).toBe(1);
    expect(v.centre().x).toBeCloseTo(175, 5);
  });

  it('still keeps the view through a resize after a toggle', () => {
    const v = renderLaidOut({ width: 300, height: 200 });
    v.userScroll(50, 20);
    v.rerender(element(true));
    const point = v.centre();
    v.resize(260, 160);
    v.report();
    expect(v.offBy(point)).toBeLessThanOrEqual(0.5);
  });

  it('still shows the start for a new numeral while the gutters stay', () => {
    const v = renderLaidOut({ width: 300, height: 200, viewport: annotations });
    v.userScroll(10, 50);
    v.rerender(element(true, { resetKey: 'b' }));
    expect(v.viewer.scrollTop).toBe(0);
    expect(v.centre().x).toBeCloseTo(175, 5);
  });

  it('does not scroll for ordinary rerenders', () => {
    const v = renderLaidOut({ width: 300, height: 200, viewport: annotations });
    v.userScroll(60, 30);
    const [scrolls, left, top] = [v.state.scrollToCalls, v.viewer.scrollLeft, v.viewer.scrollTop];
    v.rerender(element(true, { label: 'Another label' }));
    v.rerender(element(true, { label: 'Yet another label' }));
    expect(v.state.scrollToCalls).toBe(scrolls);
    expect([v.viewer.scrollLeft, v.viewer.scrollTop]).toEqual([left, top]);
  });
});

describe('NumeralViewport: compact annotation labels at the smallest zoom (UI-10, slice 4b)', () => {
  const COMPACT = '[&_[data-tier-annotation]]:text-[10px]';
  const annotated = {
    numeralHeight: 160,
    annotationsStart: (
      <div data-tier-annotations="power">
        <div data-tier-annotation>20</div>
      </div>
    ),
    annotationsEnd: (
      <div data-tier-annotations="digit">
        <div data-tier-annotation>1</div>
      </div>
    ),
  };
  const boxes = (viewer: HTMLElement) => [...viewer.querySelectorAll<HTMLElement>('[data-numeral-annotations-box]')];
  const compactBoxes = (viewer: HTMLElement) => boxes(viewer).filter((box) => box.className.split(' ').includes(COMPACT));

  it('uses the compact labels at 25% only, in both gutters, labels still present', () => {
    const v = renderViewport(annotated);
    expect(boxes(v.viewer)).toHaveLength(2);
    expect(compactBoxes(v.viewer)).toHaveLength(0); // 100%

    for (const expected of [
      ['75%', 0],
      ['50%', 0],
      ['25%', 2],
    ] as const) {
      fireEvent.click(v.zoomOut);
      expect(v.zoomText().startsWith(expected[0])).toBe(true);
      expect(compactBoxes(v.viewer), expected[0]).toHaveLength(expected[1]);
    }
    // At 25%: the power and the digit labels are there, in the compacted boxes
    const [start, end] = boxes(v.viewer);
    expect(start.querySelector('[data-tier-annotations="power"] [data-tier-annotation]')).not.toBeNull();
    expect(end.querySelector('[data-tier-annotations="digit"] [data-tier-annotation]')).not.toBeNull();
    expect(v.viewer.hasAttribute('data-zooming')).toBe(false);
  });

  it('keeps the default labels at 50%, 75%, 100% and 400%, and returns to them from 25%', () => {
    const v = renderViewport(annotated);
    for (let i = 0; i < 5; i++) fireEvent.click(v.zoomIn); // 400%
    expect(v.zoomText().startsWith('400%')).toBe(true);
    expect(compactBoxes(v.viewer)).toHaveLength(0);

    fireEvent.click(v.reset);
    for (let i = 0; i < 3; i++) fireEvent.click(v.zoomOut);
    expect(compactBoxes(v.viewer)).toHaveLength(2);
    fireEvent.click(v.zoomIn); // 50%
    expect(v.zoomText().startsWith('50%')).toBe(true);
    expect(compactBoxes(v.viewer)).toHaveLength(0);
    fireEvent.click(v.zoomOut);
    expect(compactBoxes(v.viewer)).toHaveLength(2);
    fireEvent.click(v.reset);
    expect(compactBoxes(v.viewer)).toHaveLength(0);
  });

  it('changes only the labels’ font size: the gutters and boxes keep their classes and size', () => {
    const v = renderViewport(annotated);
    const classesOf = (el: HTMLElement) => el.className.split(' ').filter((name) => name !== COMPACT);
    const gutters = () => [...v.viewer.querySelectorAll<HTMLElement>('[data-numeral-annotations]')];
    const before = [gutters().map((g) => g.className), boxes(v.viewer).map(classesOf)];
    for (let i = 0; i < 3; i++) fireEvent.click(v.zoomOut);
    expect(compactBoxes(v.viewer)).toHaveLength(2);
    expect([gutters().map((g) => g.className), boxes(v.viewer).map(classesOf)]).toEqual(before);
    expect(gutters().every((g) => g.className.includes('w-10.5'))).toBe(true);
    // The boxes keep following the zoom as before: 160 units × 25 %
    expect(boxes(v.viewer).map((box) => box.style.height)).toEqual(['40px', '40px']);
  });

  it('has no gutters, so no compact styling, without annotations', () => {
    const v = renderViewport();
    for (let i = 0; i < 3; i++) fireEvent.click(v.zoomOut);
    expect(v.zoomText().startsWith('25%')).toBe(true);
    expect(v.viewer.querySelectorAll('[data-numeral-annotations]')).toHaveLength(0);
    expect(v.viewer.innerHTML).not.toContain('text-[10px]');
  });

  it('still hides the labels during a zoom animation, compact or not, and shows them afterwards', async () => {
    const v = renderAnimated({ viewport: annotated });
    const hidden = () => v.viewer.hasAttribute('data-zooming');
    for (let i = 0; i < 3; i++) {
      fireEvent.click(v.zoomOut); // 75%, 50%, 25%
      expect(hidden()).toBe(true);
      v.running()!.finish();
      await act(async () => {});
      expect(hidden()).toBe(false);
    }
    expect(compactBoxes(v.viewer)).toHaveLength(2);
    // The hiding rule stays on the same boxes, compact or not, and the gutters' on the gutters
    for (const box of boxes(v.viewer)) expect(box.className.split(' ')).toContain('in-data-[zooming]:invisible');
    const gutters = [...v.viewer.querySelectorAll<HTMLElement>('[data-numeral-annotations]')];
    expect(gutters).toHaveLength(2);
    for (const gutter of gutters) {
      expect(gutter.className.split(' ')).toContain('in-data-[zooming=fit]:bg-transparent');
      expect(gutter.className).not.toContain('invisible');
    }
    fireEvent.click(v.zoomIn);
    expect(hidden()).toBe(true);
    expect(compactBoxes(v.viewer)).toHaveLength(0);
  });
});
