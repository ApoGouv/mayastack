/**
 * The viewer's zoom animation (UI-13, slice 6): after a zoom level is laid out and the anchored
 * scroll position applied, the viewer's paper is drawn, for a moment, where the numeral image
 * was on screen before, and eases to its final layout. Only a transform animates; the layout,
 * the scroll position and the scrollable area are final from the start.
 */

/**
 * A zoom step's timing (a click, a tap or a key): short, from rest to rest, with a gentle start
 * and a long deceleration (an asymmetric ease-in-out), and no overshoot
 */
export const ZOOM_ANIMATION_DURATION = 200;
export const ZOOM_ANIMATION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** A box on screen, in CSS px: its left and top edges, from the viewport, and its width */
export interface ScreenBox {
  left: number;
  top: number;
  width: number;
}

/** A box on screen, in CSS px, with its height: e.g. an annotation gutter as drawn */
export interface ScreenRect extends ScreenBox {
  height: number;
}

/**
 * Whether a scroller's content fits its width: nothing to scroll sideways. The viewer's one test
 * of a layout fitting (UI-13), on its real, laid out dimensions: for the zoom's mark, of the layout
 * zoomed to, and for the layout zoomed from, measured before it changes. The stage content clips
 * what is drawn outside it, so a zoom animation's transform never changes the result.
 */
export function fitsSideways(scroller: Pick<Element, 'scrollWidth' | 'clientWidth'>): boolean {
  return scroller.scrollWidth <= scroller.clientWidth;
}

/**
 * A box as drawn on screen (an element's `getBoundingClientRect()`, transforms included), or null
 * where nothing is drawn: no element, an element not displayed (e.g. a gutter hidden on a narrow
 * stage, whose box is empty), or a box that is not finite.
 */
export function drawnRect(rect: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'> | null | undefined): ScreenRect | null {
  if (!rect) return null;
  const { left, top, width, height } = rect;
  if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

/** A uniform scale about the paper's top-left corner, then a translation, in CSS px */
export interface ZoomAnimationStart {
  scale: number;
  x: number;
  y: number;
}

/**
 * The transform that draws the paper so that the numeral image inside it appears at `before`,
 * where it was on screen before the zoom (including any zoom animation then running), when it is
 * laid out at `image` within the paper laid out at `paper`, both untransformed. The scale is
 * uniform, so the numeral is never distorted; the paper's fixed padding scales with it for the
 * animation's duration only.
 *
 * With `transform-origin: 0 0`, a point of the paper at (px, py) from its corner is drawn at
 * (paper.left + x + scale × px, paper.top + y + scale × py).
 *
 * @returns The starting transform, or null where there is nothing to animate: the image would
 *   already be drawn where it was, or a box is empty or not finite
 */
export function getZoomAnimationStart(before: ScreenBox, image: ScreenBox, paper: ScreenBox): ZoomAnimationStart | null {
  const values = [before.left, before.top, before.width, image.left, image.top, image.width, paper.left, paper.top];
  if (!values.every(Number.isFinite) || before.width <= 0 || image.width <= 0) return null;
  const scale = before.width / image.width;
  const x = before.left - paper.left - scale * (image.left - paper.left);
  const y = before.top - paper.top - scale * (image.top - paper.top);
  // Within rounding of where the final layout already draws it
  if (Math.abs(scale - 1) < 1e-6 && Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return null;
  return { scale, x, y };
}

/** The keyframes of the zoom animation from a starting transform to the final layout */
export function zoomAnimationKeyframes({ scale, x, y }: ZoomAnimationStart): Keyframe[] {
  return [
    { transformOrigin: '0 0', transform: `translate(${x}px, ${y}px) scale(${scale})` },
    { transformOrigin: '0 0', transform: 'none' },
  ];
}

/**
 * An annotation gutter's starting transform (UI-13, slice 3a-2), about its own top-left corner: a
 * translation, then a vertical scale only, so it keeps its width
 */
export interface GutterAnimationStart {
  x: number;
  y: number;
  scaleY: number;
}

/**
 * The transform that draws an annotation gutter, laid out at `final` (untransformed, the zoomed
 * layout's), as it moves with the paper's zoom animation `paperStart` (getZoomAnimationStart),
 * whose paper is laid out with its top at `paperTop`:
 * - Sideways, from where the gutter was drawn before the zoom (`before`, transforms included) to
 *   where it is laid out: whether it sits beside the paper (the layout fits) or sticks to the
 *   stage's edge (it overflows), and across the boundary between the two.
 * - Vertically, as the paper's transform draws the same heights: its top and bottom stay on the
 *   paper's drawn ones in every frame. Both are a translation and a scale eased to none with the
 *   same timing, so every height is drawn at its final place plus a fixed offset times the same
 *   remaining progress, for the gutter as for the paper.
 *
 * @returns The starting transform, or null where there is nothing to animate (it would be drawn
 *   where it is laid out) or a value is not finite
 */
export function getGutterAnimationStart(
  before: ScreenRect,
  final: ScreenRect,
  paperStart: ZoomAnimationStart,
  paperTop: number
): GutterAnimationStart | null {
  const x = before.left - final.left;
  const scaleY = paperStart.scale;
  const y = paperStart.y + (paperStart.scale - 1) * (final.top - paperTop);
  if (![x, y, scaleY].every(Number.isFinite) || scaleY <= 0) return null;
  if (Math.abs(scaleY - 1) < 1e-6 && Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return null;
  return { x, y, scaleY };
}

/** The keyframes of a gutter's animation from a starting transform to its final layout */
export function gutterAnimationKeyframes({ x, y, scaleY }: GutterAnimationStart): Keyframe[] {
  return [
    { transformOrigin: '0 0', transform: `translate(${x}px, ${y}px) scale(1, ${scaleY})` },
    { transformOrigin: '0 0', transform: 'none' },
  ];
}

/** Whether the user prefers reduced motion, read at the moment of asking */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
