// @vitest-environment happy-dom
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NumeralViewport from './NumeralViewport';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const LABEL = 'Mayan numeral for 123: 2 stacked base-20 digits, highest place value at the top';

/** Renders the viewport around a stand-in numeral and returns its parts */
function renderViewport(props: { resetKey?: string } = {}) {
  const result = render(
    <NumeralViewport numeralWidth={350} label={LABEL} {...props}>
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
    expect(zoomText()).toBe('150%');
    expect(image.style.width).toBe('525px');

    fireEvent.click(zoomOut);
    fireEvent.click(zoomOut);
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
    // Its own width in CSS px, never a share of the viewer's, never shrunk, centred both ways
    expect(image.className.split(' ')).toEqual(expect.arrayContaining(['relative', 'm-auto', 'shrink-0']));
    for (let i = 0; i < 3; i++) fireEvent.click(zoomOut);
    const widths: Record<string, string> = {};
    for (let i = 0; i < 8; i++) {
      widths[zoomText().split(' ')[0]] = image.style.width;
      fireEvent.click(zoomIn);
    }
    expect(widths).toEqual({
      '25%': '87.5px', '50%': '175px', '75%': '262.5px', '100%': '350px',
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
    expect(zoomText()).toBe('150%');
  });

  it('keeps focus on a zoom button that reaches its limit, and ignores it there', () => {
    const { zoomIn, zoomText } = renderViewport();

    zoomIn.focus();
    for (let i = 0; i < 4; i++) fireEvent.click(zoomIn);
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
    expect(zoomText()).toBe('150%');
    fireEvent.keyDown(viewer, { key: '=' });
    expect(zoomText()).toBe('200%');
    fireEvent.keyDown(viewer, { key: '-' });
    expect(zoomText()).toBe('150%');
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
      <NumeralViewport numeralWidth={350} label={LABEL} overlay={<div data-testid="overlay" />}>
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    const image = screen.getByRole('img', { name: LABEL });
    expect([...image.children]).toEqual([screen.getByTestId('numeral'), screen.getByTestId('overlay')]);
    expect(image.className).toContain('relative');

    // It zooms with the numeral
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(image.style.width).toBe('525px');
    expect(image.contains(screen.getByTestId('overlay'))).toBe(true);
  });

  it('places an underlay before the numeral, in the zoom wrapper, which zooms it with the numeral', () => {
    render(
      <NumeralViewport numeralWidth={350} label={LABEL} underlay={<div data-testid="underlay" />} overlay={<div data-testid="overlay" />}>
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
    expect(image.style.width).toBe('525px');
  });

  it('sets a scroller ref it is given to the viewer, and still scrolls through it', () => {
    const scrollerRef = createRef<HTMLDivElement>();
    render(
      <NumeralViewport numeralWidth={350} label={LABEL} scrollerRef={scrollerRef}>
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

  it('has the scroller, the stage in canvas and the backdrop, then the stage box, then the slab', () => {
    const { viewer, image } = renderViewport();
    // The scroller is the only scroll container, and the backdrop behind a translucent numeral
    expect(viewer.hasAttribute('data-numeral-backdrop')).toBe(true);
    expect(viewer.className.split(' ')).toEqual(expect.arrayContaining(['overflow-auto', 'bg-canvas']));
    expect(document.querySelectorAll('[data-numeral-backdrop]')).toHaveLength(1);
    // The stage box: the scroller's only child, holding the slab, padded, at least the scroller's size
    const stage = viewer.firstElementChild as HTMLElement;
    expect(viewer.children).toHaveLength(1);
    expect(stage.hasAttribute('data-numeral-stage')).toBe(true);
    expect(stage.className.split(' ')).toEqual(
      expect.arrayContaining(['flex', 'w-max', 'min-w-full', 'min-h-full', 'p-4', 'overflow-clip'])
    );
    expect([...stage.children]).toEqual([image]);
  });

  it('spans the viewer card’s width, with no canvas surround of its own (changed deliberately in UI-13)', () => {
    const { viewer } = renderViewport();
    const root = screen.getByRole('group', { name: 'Zoom controls' }).parentElement!;
    expect(root.contains(viewer)).toBe(true);
    expect(root.className.split(' ')).toContain('w-full');
    expect(root.className).not.toMatch(/\b(max-w-|bg-|p-)/);
  });

  it('has no underlay or overlay unless given', () => {
    const { image } = renderViewport();
    expect(image.children).toHaveLength(1);
  });

  it('returns to the top for a new numeral', () => {
    const { viewer, rerender } = renderViewport({ resetKey: 'a' });

    viewer.scrollTop = 500;
    rerender(
      <NumeralViewport numeralWidth={350} label={LABEL} resetKey="b">
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    expect(viewer.scrollTop).toBe(0);
  });
});

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
 * which happy-dom does not: the scroller's client size; the stage box's 16 px padding, with the
 * slab centred both ways while it fits; scroll positions clamped to the scrollable area at once
 * (also when the scroller resizes) and rounded to device pixels; and scroll events dispatched only
 * when the test says, since browsers dispatch them later than the scrolling.
 */
function renderLaidOut({
  width,
  height,
  pixelRatio = 1,
  roundsLater = false,
}: {
  width: number;
  height: number;
  pixelRatio?: number;
  /** Rounds to device pixels only by the time of the scroll event, not as soon as it scrolls */
  roundsLater?: boolean;
}) {
  FakeResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  const parts = renderViewport({ resetKey: 'a' });
  const { viewer, image } = parts;
  const s = { width, height, left: 0, top: 0, scrollToCalls: 0 };

  const slab = () => {
    const w = parseFloat(image.style.width);
    return { w, h: (w * 160) / 350, zoom: w / 350 };
  };
  const content = () => ({ w: Math.max(s.width, slab().w + 32), h: Math.max(s.height, slab().h + 32) });
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

  Object.defineProperties(viewer, {
    clientWidth: { configurable: true, get: () => s.width },
    clientHeight: { configurable: true, get: () => s.height },
    scrollLeft: { configurable: true, get: () => s.left, set: (v: number) => { s.left = clamp(v, content().w - s.width); } },
    scrollTop: { configurable: true, get: () => s.top, set: (v: number) => { s.top = clamp(v, content().h - s.height); } },
  });
  viewer.getBoundingClientRect = () => new DOMRect(0, 0, s.width, s.height);
  image.getBoundingClientRect = () => {
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
    for (let i = 0; i < 4; i++) fireEvent.click(v.zoomIn); // 400%: 1,400 × 640 px
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
    fireEvent.click(v.zoomIn);
    fireEvent.click(v.zoomIn); // 200%
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
    for (let i = 0; i < 3; i++) fireEvent.click(v.zoomIn); // 300%: 1,050 × 480 px
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
    for (let i = 0; i < 3; i++) fireEvent.click(v.zoomIn); // 300%
    // The point (230, 100) at the centre: 16 px of padding + 230 × 3 − 150 px, and likewise down
    v.userScroll(556, 216);
    const point = v.centre();
    expect(point.x).toBeCloseTo(230, 5);
    expect(point.y).toBeCloseTo(100, 5);
    // At 300% a 900 × 450 viewer cannot scroll that far (its centre reaches x ≈ 205, y ≈ 90)
    v.resize(900, 450);
    v.report();
    const shown = v.centre();
    expect(v.offBy(point)).toBeGreaterThan(10);

    // At 400% the same viewer could show the intended point (x up to ≈ 241, y up to ≈ 107), but
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
    fireEvent.click(v.zoomIn); // 150%
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
    for (let i = 0; i < 3; i++) fireEvent.click(v.zoomIn); // 300%
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
    for (let i = 0; i < 4; i++) fireEvent.click(v.zoomIn); // 400%
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
