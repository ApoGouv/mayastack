// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  drawnRect,
  fitsSideways,
  getGutterAnimationStart,
  getZoomAnimationStart,
  gutterAnimationKeyframes,
  prefersReducedMotion,
  ZOOM_ANIMATION_DURATION,
  ZOOM_ANIMATION_EASING,
  zoomAnimationKeyframes,
  type ScreenBox,
  type ZoomAnimationStart,
} from './zoomAnimation';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Where a point of the paper, (px, py) from its corner, is drawn by a transform about that corner */
const drawn = ({ scale, x, y }: ZoomAnimationStart, paper: ScreenBox, px: number, py: number) => ({
  x: paper.left + x + scale * px,
  y: paper.top + y + scale * py,
});

describe('getZoomAnimationStart', () => {
  it('draws the image exactly where it was before the zoom, its size included', () => {
    // 100% → 150%, a 350-wide image in its paper's 12 px padding: before, at (100, 50), 350 wide;
    // after, laid out 525 wide at (-12.5, 8), in a paper whose corner is 12 px up and left
    const before = { left: 100, top: 50, width: 350 };
    const image = { left: -12.5, top: 8, width: 525 };
    const paper = { left: -24.5, top: -4, width: 549 };
    const start = getZoomAnimationStart(before, image, paper)!;
    expect(start.scale).toBeCloseTo(350 / 525, 12);

    // The image's corners, laid out 12 px into the paper, are drawn at the image's earlier ones
    const topLeft = drawn(start, paper, 12, 12);
    expect(topLeft.x).toBeCloseTo(100, 9);
    expect(topLeft.y).toBeCloseTo(50, 9);
    expect(drawn(start, paper, 12 + 525, 12).x).toBeCloseTo(100 + 350, 9);
    // The paper's padding scales with it, for the animation only: 8 px instead of 12
    expect(drawn(start, paper, 0, 0).x).toBeCloseTo(100 - 12 * (350 / 525), 9);
  });

  it('starts from wherever the image was drawn, also part-way through an earlier animation', () => {
    // Zooming out, 400% → 300%, from a drawn box that is neither the old layout nor the new one
    const before = { left: -413.25, top: 77.5, width: 1287.4 };
    const image = { left: 40, top: -300, width: 1050 };
    const paper = { left: 28, top: -312, width: 1074 };
    const start = getZoomAnimationStart(before, image, paper)!;
    expect(start.scale).toBeCloseTo(1287.4 / 1050, 12);
    const corner = drawn(start, paper, image.left - paper.left, image.top - paper.top);
    expect(corner.x).toBeCloseTo(before.left, 9);
    expect(corner.y).toBeCloseTo(before.top, 9);
  });

  it('keeps a point fixed when it stays where it was, as the anchored centre does', () => {
    // 100% → 200% about the image's point (175, 80), at (400, 300) on screen before and after
    const before = { left: 400 - 175, top: 300 - 80, width: 350 };
    const image = { left: 400 - 350, top: 300 - 160, width: 700 };
    const paper = { left: image.left - 12, top: image.top - 12, width: 724 };
    const start = getZoomAnimationStart(before, image, paper)!;
    const anchor = drawn(start, paper, 12 + 350, 12 + 160);
    expect(anchor.x).toBeCloseTo(400, 9);
    expect(anchor.y).toBeCloseTo(300, 9);
  });

  it('gives nothing to animate where the image is already drawn where it was', () => {
    const box = { left: 10, top: 20, width: 350 };
    expect(getZoomAnimationStart(box, box, { left: -2, top: 8, width: 374 })).toBeNull();
    expect(getZoomAnimationStart(box, { ...box, left: 10.004 }, { left: -2, top: 8, width: 374 })).toBeNull();
  });

  it('gives nothing to animate for an empty or unmeasurable box', () => {
    const box = { left: 10, top: 20, width: 350 };
    const paper = { left: -2, top: 8, width: 374 };
    expect(getZoomAnimationStart({ ...box, width: 0 }, box, paper)).toBeNull();
    expect(getZoomAnimationStart(box, { ...box, width: 0 }, paper)).toBeNull();
    expect(getZoomAnimationStart({ ...box, left: NaN }, box, paper)).toBeNull();
    expect(getZoomAnimationStart(box, { ...box, width: Infinity }, paper)).toBeNull();
    expect(getZoomAnimationStart(box, box, { ...paper, top: NaN })).toBeNull();
  });
});

describe('zoomAnimationKeyframes', () => {
  it('runs from the starting transform about the paper’s corner to none', () => {
    expect(zoomAnimationKeyframes({ scale: 0.5, x: -12.25, y: 40 })).toEqual([
      { transformOrigin: '0 0', transform: 'translate(-12.25px, 40px) scale(0.5)' },
      { transformOrigin: '0 0', transform: 'none' },
    ]);
  });

  it('has the approved timing: 200 ms, a gentle ease-in-out', () => {
    expect(ZOOM_ANIMATION_DURATION).toBe(200);
    expect(ZOOM_ANIMATION_EASING).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });
});

describe('prefersReducedMotion', () => {
  const stubPreference = (reduce: boolean) =>
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)', media: query }) as MediaQueryList
    );

  it('reads the preference each time it is asked', () => {
    const matchMedia = stubPreference(true);
    expect(prefersReducedMotion()).toBe(true);
    matchMedia.mockRestore();
    stubPreference(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('is false where the browser cannot tell', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: undefined });
    try {
      expect(prefersReducedMotion()).toBe(false);
    } finally {
      if (original) Object.defineProperty(window, 'matchMedia', original);
      else delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });
});

describe('fitsSideways (UI-13, slice 3a-1)', () => {
  it('fits while the content is no wider than the scroller, overflows once it is wider', () => {
    expect(fitsSideways({ scrollWidth: 600, clientWidth: 703 })).toBe(true);
    // Exactly as wide: nothing to scroll
    expect(fitsSideways({ scrollWidth: 703, clientWidth: 703 })).toBe(true);
    expect(fitsSideways({ scrollWidth: 704, clientWidth: 703 })).toBe(false);
    expect(fitsSideways({ scrollWidth: 840, clientWidth: 703 })).toBe(false);
  });

  it('fits with nothing laid out (both 0, as in a test DOM)', () => {
    expect(fitsSideways({ scrollWidth: 0, clientWidth: 0 })).toBe(true);
  });

  it('reads the element’s own laid out dimensions', () => {
    const el = document.createElement('div');
    Object.defineProperties(el, {
      scrollWidth: { configurable: true, get: () => 900 },
      clientWidth: { configurable: true, get: () => 535 },
    });
    expect(fitsSideways(el)).toBe(false);
    Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => 535 });
    expect(fitsSideways(el)).toBe(true);
  });
});

describe('drawnRect (UI-13, slice 3a-1)', () => {
  it('keeps a drawn box’s position and size, and nothing else', () => {
    const rect = new DOMRect(16.5, 40.25, 42, 320);
    expect(drawnRect(rect)).toEqual({ left: 16.5, top: 40.25, width: 42, height: 320 });
    // Negative positions are fine: a box partly off screen
    expect(drawnRect({ left: -120, top: -8, width: 42, height: 80 })).toEqual({ left: -120, top: -8, width: 42, height: 80 });
  });

  it('is null where there is no element', () => {
    expect(drawnRect(null)).toBeNull();
    expect(drawnRect(undefined)).toBeNull();
  });

  it('is null for an element not displayed: an empty box', () => {
    expect(drawnRect(new DOMRect(0, 0, 0, 0))).toBeNull();
    expect(drawnRect({ left: 10, top: 10, width: 0, height: 320 })).toBeNull();
    expect(drawnRect({ left: 10, top: 10, width: 42, height: 0 })).toBeNull();
  });

  it('is null for a box that is not finite', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(drawnRect({ left: bad, top: 0, width: 42, height: 320 }), `${bad}`).toBeNull();
      expect(drawnRect({ left: 0, top: bad, width: 42, height: 320 }), `${bad}`).toBeNull();
      expect(drawnRect({ left: 0, top: 0, width: bad, height: 320 }), `${bad}`).toBeNull();
      expect(drawnRect({ left: 0, top: 0, width: 42, height: bad }), `${bad}`).toBeNull();
    }
  });
});

describe('getGutterAnimationStart (UI-13, slice 3a-2)', () => {
  // A paper laid out at (100, 40), 400 × 300, and a gutter beside it, as tall
  const paper = { left: 100, top: 40, width: 400, height: 300 };
  const final = { left: 58, top: 40, width: 42, height: 300 };
  /** Where a gutter is drawn at an eased progress, from its start to its layout */
  const gutterAt = (start: { x: number; y: number; scaleY: number }, box: typeof final, progress: number) => {
    const rest = 1 - progress;
    return { left: box.left + start.x * rest, top: box.top + start.y * rest, height: box.height * (1 + (start.scaleY - 1) * rest) };
  };
  /** Where the paper's transform, eased to the same progress, draws a height of the paper laid out at `q` */
  const paperAt = (start: ZoomAnimationStart, q: number, progress: number) => {
    const rest = 1 - progress;
    return paper.top + start.y * rest + (1 + (start.scale - 1) * rest) * (q - paper.top);
  };

  it('starts sideways where the gutter was drawn, keeping its width', () => {
    const before = { left: 20, top: 10, width: 42, height: 360 };
    const start = getGutterAnimationStart(before, final, { scale: 1.2, x: -30, y: -30 }, paper.top)!;
    expect(start.x).toBe(before.left - final.left);
    expect(gutterAt(start, final, 0).left).toBe(before.left);
    expect(gutterAnimationKeyframes(start)[0].transform).toMatch(/scale\(1, /);
  });

  it('keeps the gutter’s top and bottom on the paper’s drawn ones at every progress, zooming in and out', () => {
    for (const paperStart of [
      { scale: 1.25, x: -50, y: -45 },
      { scale: 0.8, x: 40, y: 36 },
      { scale: 1.5, x: -120, y: 10 },
    ]) {
      const start = getGutterAnimationStart({ left: 0, top: 0, width: 42, height: 10 }, final, paperStart, paper.top)!;
      for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
        const g = gutterAt(start, final, progress);
        expect(g.top).toBeCloseTo(paperAt(paperStart, final.top, progress), 9);
        expect(g.top + g.height).toBeCloseTo(paperAt(paperStart, final.top + final.height, progress), 9);
      }
    }
  });

  it('maps a gutter whose top is not the paper’s by the same transform', () => {
    const lower = { left: 58, top: 70, width: 42, height: 200 };
    const paperStart = { scale: 1.4, x: -10, y: -60 };
    const start = getGutterAnimationStart(lower, lower, paperStart, paper.top)!;
    for (const progress of [0, 0.3, 0.7]) {
      const g = gutterAt(start, lower, progress);
      expect(g.top).toBeCloseTo(paperAt(paperStart, lower.top, progress), 9);
      expect(g.top + g.height).toBeCloseTo(paperAt(paperStart, lower.top + lower.height, progress), 9);
    }
  });

  it('is null where nothing would move, or a value is not finite', () => {
    expect(getGutterAnimationStart(final, final, { scale: 1, x: 0, y: 0 }, paper.top)).toBeNull();
    expect(getGutterAnimationStart({ ...final, left: Number.NaN }, final, { scale: 1.2, x: 0, y: 0 }, paper.top)).toBeNull();
    expect(getGutterAnimationStart(final, final, { scale: Number.POSITIVE_INFINITY, x: 0, y: 0 }, paper.top)).toBeNull();
    expect(getGutterAnimationStart(final, final, { scale: 0, x: 0, y: 0 }, paper.top)).toBeNull();
    // Moved sideways only (the scale and the paper's top unchanged): still animated
    expect(getGutterAnimationStart({ ...final, left: 0 }, final, { scale: 1, x: 0, y: 0 }, paper.top)).toEqual({ x: -58, y: 0, scaleY: 1 });
  });

  it('eases from a translation and a vertical scale about the gutter’s corner to none', () => {
    expect(gutterAnimationKeyframes({ x: -12.5, y: 30, scaleY: 1.25 })).toEqual([
      { transformOrigin: '0 0', transform: 'translate(-12.5px, 30px) scale(1, 1.25)' },
      { transformOrigin: '0 0', transform: 'none' },
    ]);
  });
});
