// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getZoomAnimationStart,
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
