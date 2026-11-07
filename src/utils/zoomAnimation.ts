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

/** Whether the user prefers reduced motion, read at the moment of asking */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
