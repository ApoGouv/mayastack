import React, { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import {
  getZoomAnimationStart,
  prefersReducedMotion,
  ZOOM_ANIMATION_DURATION,
  ZOOM_ANIMATION_EASING,
  zoomAnimationKeyframes,
  type ScreenBox,
} from '@utils/zoomAnimation';

/** The zoom levels the viewport steps through, smallest to largest */
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;

const DEFAULT_ZOOM_INDEX = ZOOM_LEVELS.indexOf(1);

/** A point in the numeral's own coordinates, in SVG units from its top-left corner */
interface NumeralPoint {
  x: number;
  y: number;
}

/**
 * The numeral's box (the zoom wrapper's) in the scroller's content, in CSS px: where its left and
 * top edges are from the start of the scrollable area, whatever the scroll position, and its width
 */
function numeralBox(scroller: HTMLElement, numeral: HTMLElement) {
  const outer = scroller.getBoundingClientRect();
  const inner = numeral.getBoundingClientRect();
  return {
    left: inner.left - outer.left - scroller.clientLeft + scroller.scrollLeft,
    top: inner.top - outer.top - scroller.clientTop + scroller.scrollTop,
    width: inner.width,
  };
}

/** The numeral point at the viewer's centre, at the given zoom level */
function centrePoint(scroller: HTMLElement, numeral: HTMLElement, zoom: number): NumeralPoint {
  const box = numeralBox(scroller, numeral);
  return {
    x: (scroller.scrollLeft + scroller.clientWidth / 2 - box.left) / zoom,
    y: (scroller.scrollTop + scroller.clientHeight / 2 - box.top) / zoom,
  };
}

/*
 * The browser keeps a scroll position within the scrollable area: a numeral that fits the
 * stage's width, which cannot then scroll sideways, stays centred, and likewise its height.
 * Positions are measured from the zoom wrapper's own box, so the stage's and the paper's padding
 * and the centring margins, which do not scale with the zoom, never shift the point kept at the
 * centre.
 */

/** What the viewer shows: a numeral point at its centre, or the numeral's start (its top, centred horizontally) */
type View = NumeralPoint | 'start';

/** A scroll position, in CSS px */
interface ScrollPosition {
  left: number;
  top: number;
}

/**
 * Scroll positions within this many CSS px of each other count as the same. Browsers round them
 * to device pixels (e.g. to thirds of a CSS px at 150% display scaling), so a position read back
 * after scrolling is rarely exactly the one asked for.
 */
const SCROLL_TOLERANCE = 1;

/** The scroll position that shows a view at the given zoom level, before the browser clamps it */
function scrollPositionFor(scroller: HTMLElement, numeral: HTMLElement, zoom: number, view: View): ScrollPosition {
  const box = numeralBox(scroller, numeral);
  if (view === 'start') return { left: box.left + box.width / 2 - scroller.clientWidth / 2, top: 0 };
  return {
    left: box.left + view.x * zoom - scroller.clientWidth / 2,
    top: box.top + view.y * zoom - scroller.clientHeight / 2,
  };
}

/**
 * The view the viewer keeps, through zooming and resizing.
 *
 * `view` is the intended view: the one last chosen by the user's scrolling, a zoom, Reset or a
 * new numeral. It is never replaced by a position the browser clamped it to, e.g. while the
 * stage is too large to scroll to it, so it returns when the stage allows it again.
 *
 * `at` is the scroll position that view was last shown at, or the user last scrolled to. A
 * scroll event that finds the viewer there (within SCROLL_TOLERANCE) is the viewer's own
 * scrolling, or no movement: only a scroll elsewhere is the user's. Nothing is waited for or
 * expires, so a later scroll by the user is always recognised, whenever its event arrives.
 *
 * `size` is the scroller's client size the view was last shown for. While the scroller has
 * another size, a resize has not been corrected yet: a scroll event then is likely the browser
 * keeping the old position within the new size, not the user's, and is ignored. A genuine scroll
 * by the user in the same frame as a resize cannot be told from that clamping, so it is ignored
 * too, and the resize correction then undoes it, returning to the previous intended view; the
 * user's next scroll is followed as usual.
 */
interface Anchor {
  view: View;
  at: ScrollPosition | null;
  size: { width: number; height: number } | null;
}

/**
 * Shows a view and records it as the intended one, with where the browser put the scroller.
 * Scrolls instantly, and only when the viewer is not already there, so a correction never
 * scrolls in vain or animates.
 */
function showView(scroller: HTMLElement, numeral: HTMLElement, zoom: number, anchor: Anchor, view: View) {
  const target = scrollPositionFor(scroller, numeral, zoom, view);
  if (Math.abs(target.left - scroller.scrollLeft) >= 0.5 || Math.abs(target.top - scroller.scrollTop) >= 0.5) {
    scroller.scrollTo({ left: target.left, top: target.top, behavior: 'instant' });
  }
  anchor.view = view;
  // Read back: clamped to the scrollable area and rounded to device pixels
  anchor.at = { left: scroller.scrollLeft, top: scroller.scrollTop };
  anchor.size = { width: scroller.clientWidth, height: scroller.clientHeight };
}

/**
 * Makes the user's scrolling the intended view: the numeral point now at the viewer's centre.
 * Ignores the viewer's own scrolling (the scroller is where a view was shown) and scrolling while
 * a resize is not yet corrected (see Anchor). `beforeMeasuring` runs only for the user's
 * scrolling, just before the numeral is measured: it ends a zoom animation, whose transform the
 * measurement must not include, while the viewer's own scrolling leaves the animation running.
 */
function followUserScroll(
  scroller: HTMLElement,
  numeral: HTMLElement,
  zoom: number,
  anchor: Anchor,
  beforeMeasuring: () => void
) {
  const { at, size } = anchor;
  if (size && (scroller.clientWidth !== size.width || scroller.clientHeight !== size.height)) return;
  const left = scroller.scrollLeft;
  const top = scroller.scrollTop;
  if (at && Math.abs(left - at.left) <= SCROLL_TOLERANCE && Math.abs(top - at.top) <= SCROLL_TOLERANCE) return;
  beforeMeasuring();
  anchor.view = centrePoint(scroller, numeral, zoom);
  anchor.at = { left, top };
}

/**
 * The stage carries this attribute while a zoom animation runs, so that the screen-only
 * annotations, which sit outside the animated paper, can be hidden meanwhile (see
 * AnnotationGutter). Its value is `fit` while the zoomed layout does not scroll sideways, and
 * empty while it does. It is set only where the animation starts, and only the two functions
 * below remove it, together with the ref that holds the running animation, so the two never
 * disagree.
 */
const ZOOMING_ATTRIBUTE = 'data-zooming';

/**
 * Ends the zoom animation held in `running`, if any, at once, and clears it and the stage's
 * zooming attribute. For every cancellation: a new zoom, Reset, the user's scrolling, a new
 * numeral, a resize and unmounting.
 */
function settleZoomAnimation(running: { current: Animation | null }, stage: HTMLElement | null) {
  running.current?.cancel();
  running.current = null;
  stage?.removeAttribute(ZOOMING_ATTRIBUTE);
}

/**
 * Clears the zoom animation `finished` (completed, or ended by something else) and the stage's
 * attribute, but only if it is still the running one: a stale animation, whose promise settles
 * after a newer one has started, changes nothing, and nothing is cancelled here.
 */
function completeZoomAnimation(running: { current: Animation | null }, stage: HTMLElement | null, finished: Animation) {
  if (running.current !== finished) return;
  running.current = null;
  stage?.removeAttribute(ZOOMING_ATTRIBUTE);
}

interface NumeralViewportProps {
  /** The numeral, usually a MayanRenderer SVG */
  children: React.ReactNode;
  /**
   * The numeral's logical width in SVG units (its SVG's width): at 100% zoom, one CSS pixel per
   * unit, so its width in CSS px at any zoom is this times the zoom level
   */
  numeralWidth: number;
  /**
   * The numeral's background, a CSS colour (e.g. MayanRenderer's background fill): the paper
   * paints it once, behind the numeral and across its padding, in place of the SVG's own
   * background rectangle, which is transparent on screen only. Any alpha is kept, so a
   * translucent background shows the stage through it, once.
   */
  background: string;
  /** Accessible description of the numeral, e.g. how many digit stacks it has */
  label: string;
  /** Changing this value (e.g. for a new number) scrolls back to the top */
  resetKey?: string;
  /**
   * Screen-only content behind the numeral, e.g. place tier guides: placed before it in the
   * zoom wrapper, which is its positioning context, so it zooms and scrolls with the numeral
   */
  underlay?: React.ReactNode;
  /**
   * Screen-only content over the numeral, e.g. tier hairlines: placed after it in the zoom
   * wrapper, which is its positioning context, so it zooms and scrolls with the numeral
   */
  overlay?: React.ReactNode;
  /**
   * Set to the viewer's scroller, the element that scrolls the numeral, for content that must
   * follow its scrolling, e.g. the place tier guides' hover. The viewport keeps its own otherwise.
   */
  scrollerRef?: RefObject<HTMLDivElement | null>;
  /**
   * The viewer's heading, e.g. its card's `h2`: shown at the start of the header row, with the
   * zoom controls beside it, or under it where there is no room. Without it, the row has the
   * zoom controls only.
   */
  header?: React.ReactNode;
  /**
   * Screen-only content under the stage, e.g. the glyph key: outside the scroller, so it never
   * scrolls or zooms with the numeral
   */
  footer?: React.ReactNode;
  /**
   * Screen-only annotations in a gutter before the numeral (at its start side) and after it (at
   * its end side), e.g. tier annotations: decorative, so hidden from assistive technology. Each
   * is placed in a box as tall as the numeral image and as wide as the gutter, which is
   * positioned as a layer's containing block (`relative`), so a layer filling it with
   * percentages follows the numeral's tiers. The gutters sit beside the paper, in a group centred
   * with it, and stay at the stage's edges while the numeral scrolls under them. They are not
   * shown where the stage is narrower than 31rem (see AnnotationGutter). If either is given,
   * both gutters are laid out, an empty one keeping the numeral centred. They need `numeralHeight`.
   */
  annotationsStart?: React.ReactNode;
  annotationsEnd?: React.ReactNode;
  /**
   * The numeral's logical height in SVG units (its SVG's height), at one CSS px per unit at 100%
   * zoom, like `numeralWidth`: the viewport does not know the numeral's aspect ratio, which the
   * image's height follows from. Only the annotation gutters use it. Without a positive, finite
   * value, there are no gutters.
   */
  numeralHeight?: number;
}

/**
 * One annotation gutter (see `annotationsStart`), a flex item beside the paper in its group,
 * laid out like the paper so that its box mirrors the numeral image's:
 * - It stretches to the group's height, which is the paper's, and its inner box has the same
 *   automatic margins and the paper's vertical padding (12 px, `p-3`), so the two are the same
 *   height and line up; the group is centred in the stage content while the numeral is
 *   shorter than the stage, and starts at its padding where it is not.
 * - The mirror is as tall as the image: the image's width, `numeralWidth × zoom`, is the SVG's
 *   width, and its height follows from the SVG's own aspect ratio (a block, so no line-box gap),
 *   i.e. `numeralHeight × zoom`.
 * - It sticks to the scroller's edge (`left-0` / `right-0`), so nothing of the scrolling paper
 *   shows beside it. It is a flex item of the group, whose box spans the whole scrollable width
 *   whenever the stage scrolls sideways, so it can follow the scroller across all of it. At the
 *   scroll start or end it is in the flow at least as far in as the edge (the stage content's
 *   padding), so it does not jump when it begins or stops sticking. `overflow-clip` on the
 *   stage content, unlike `overflow: hidden`, does not make it the scroller sticky positioning
 *   looks to, so the scroller itself is.
 * - Opaque `canvas`, above the numeral (`z-10`), so the numeral scrolls under it. It is hidden
 *   (`display: none`) below a stage width of 31rem (496 px at the default font size), as a
 *   container query against the scroller, which is a container while there are gutters. The
 *   width queried is the scroller's content box: its client width, without its 1 px borders and
 *   any classic scrollbar. At 100% zoom the numeral needs 350 (its width) + 24 (the paper's
 *   padding) + 84 (two gutters) + 32 (the stage content's padding) = 490 px in both modes, so
 *   from 31rem the whole numeral and its gutters fit. The class must be written out in full for
 *   Tailwind to find it.
 * - While a zoom animation runs (the stage has `data-zooming`), the gutters take their final size
 *   and place at once, while the paper animates. So:
 *   - Its inner box (the labels) is `visibility: hidden`: they would not line up with the numeral.
 *     It is also transparent then, and fades back in over 150 ms once the mark is removed (the
 *     animation ended or cancelled): visibility, which is not transitioned, hides it at once and
 *     shows it again at once, while its opacity eases back to 1. Without a transition where
 *     reduced motion is preferred (`motion-safe:`), so the labels then reappear at once.
 *   - Where the zoomed layout does not scroll sideways (`data-zooming="fit"`), its background is
 *     transparent: zooming out, the paper is drawn larger than its final box, and would be cut by
 *     the opaque gutters. Nothing scrolls under them there, and their background is the stage's
 *     colour, so the change is not seen otherwise.
 *   - Where it scrolls sideways, the background stays opaque: the gutters are stuck over the
 *     scrolling paper before and after the zoom, and stay so throughout, rather than vanishing
 *     and covering the paper's edges again at the end.
 *   The gutter itself stays visible, and its layout, size and place never change.
 * - At the smallest zoom level (`compact`) the labels are 10 px instead of `text-xs`'s 12 px: a
 *   tier's row is then 20 px tall (80 × 25%), and 12 px labels would be as tall as the glyphs.
 *   Only the font size changes, so rows, alignment and the gutter's width stay as they were. The
 *   rule is on the box and selects the labels' rows (`[data-tier-annotation]`, TierAnnotations'),
 *   whose selector is more specific than `text-xs`'s, so it wins. Written out in full for
 *   Tailwind to find it.
 */
const AnnotationGutter: React.FC<{
  side: 'start' | 'end';
  height: number;
  /** Whether the numeral is at the smallest zoom level: smaller labels */
  compact: boolean;
  children?: React.ReactNode;
}> = ({ side, height, compact, children }) => (
  <div
    aria-hidden="true"
    data-numeral-annotations={side}
    className={`hidden @min-[31rem]:flex sticky z-10 w-10.5 shrink-0 bg-canvas pointer-events-none select-none in-data-[zooming=fit]:bg-transparent ${
      side === 'start' ? 'left-0' : 'right-0'
    }`}
  >
    <div className="m-auto w-full py-3">
      <div
        data-numeral-annotations-box
        className={`relative w-full in-data-[zooming]:invisible in-data-[zooming]:opacity-0 motion-safe:transition-opacity motion-safe:duration-150${
          compact ? ' [&_[data-tier-annotation]]:text-[10px]' : ''
        }`}
        style={{ height: `${height}px` }}
      >
        {children}
      </div>
    </div>
  </div>
);

/**
 * A bounded, natively scrolling viewport for a numeral.
 *
 * The numeral keeps its full logical size: zooming only changes the width of the
 * HTML wrapper the SVG scales to, so the SVG's own width, height and viewBox (the
 * source for SVG and PNG export) never change. Scrolling is the browser's own.
 *
 * Scale: 100% zoom is one CSS pixel per SVG unit, whatever the viewer's width; the numeral is
 * never shrunk to fit. Narrower than the viewer, it is centred; wider, the viewer scrolls
 * sideways. A new numeral and Reset show its top, centred horizontally, and zooming keeps the
 * point at the viewer's centre in place, measured in the numeral's own coordinates. A change in
 * the viewer's size keeps the intended view: the start, or the point the user scrolled to or a
 * zoom kept (see Anchor).
 *
 * Structure: the stage (`data-numeral-stage`: the scroller, the focusable "Numeral viewer",
 * the only scroll container, as wide as the viewer card, of a fixed height for the screen's, in
 * `canvas`, the backdrop behind a translucent numeral, also marked `data-numeral-backdrop`)
 * contains the stage content (`data-numeral-stage-content`: at least as large as the stage, as
 * large as the paper and its padding, and clipping only what is drawn outside it), which
 * contains the paper (`data-numeral-paper`: the visible surface, with the numeral's background,
 * a fixed 12 px padding that does not zoom, and a screen-only edge and shadow), which contains
 * the numeral image (`data-numeral-image`: the zoom wrapper, with `role="img"` and the label):
 * the underlay, the numeral's SVG and the overlay, in that order. The SVG (`svg.mep-svg`) is
 * deliberately given no attribute here: its markup is what is exported. The paper is centred both
 * ways while it fits, and starts at the stage's padding where it does not, so all of it stays
 * reachable by scrolling. Scroll positions are measured against the zoom wrapper, so neither
 * padding shifts the anchor. The header row is above the scroller, and the footer, if any,
 * under it.
 */
const NumeralViewport: React.FC<NumeralViewportProps> = ({
  children,
  numeralWidth,
  background,
  label,
  resetKey,
  underlay,
  overlay,
  scrollerRef: givenScrollerRef,
  header,
  footer,
  annotationsStart,
  annotationsEnd,
  numeralHeight,
}) => {
  const ownScrollerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = givenScrollerRef ?? ownScrollerRef;
  // The zoom wrapper, the numeral's box that scroll positions are measured against
  const numeralRef = useRef<HTMLDivElement>(null);
  // The paper, which the zoom animation draws transformed (UI-13, slice 6)
  const paperRef = useRef<HTMLDivElement>(null);
  // The zoom animation running on the paper, if any
  const zoomAnimation = useRef<Animation | null>(null);
  // For the zoom level being laid out, its animation: where the numeral image was drawn before.
  // Null for none (Reset, reduced motion, or no zoom pending)
  const pendingAnimation = useRef<ScreenBox | null>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  // Where to scroll once the next zoom level is laid out: the numeral point to keep at the
  // viewer's centre, or the numeral's start
  const pendingScroll = useRef<View | null>(null);
  // The view kept through zooming and resizing (see Anchor)
  const anchor = useRef<Anchor>({ view: 'start', at: null, size: null });
  // The zoom level for the resize observer, which outlives a render
  const zoomRef = useRef<number>(ZOOM_LEVELS[DEFAULT_ZOOM_INDEX]);
  const hintId = useId();

  const zoom = ZOOM_LEVELS[zoomIndex];
  const atMin = zoomIndex === 0;
  const atMax = zoomIndex === ZOOM_LEVELS.length - 1;
  // The gutters' mirror height at this zoom, or null for no gutters: they need a slot to show and
  // the numeral's height to mirror
  const gutterHeight =
    (annotationsStart || annotationsEnd) && numeralHeight !== undefined && Number.isFinite(numeralHeight) && numeralHeight > 0
      ? numeralHeight * zoom
      : null;
  const hasAnnotations = gutterHeight !== null;
  // Below 50%, i.e. at 25%, where a tier's row is 20 px tall: smaller annotation labels
  const compactAnnotations = zoom < 0.5;

  /**
   * Ends any zoom animation at once, leaving the paper at its final layout, untransformed. Every
   * measurement of the numeral's position first calls this, since an element's box on screen
   * includes the transforms animated on it and on its ancestors.
   */
  const endZoomAnimation = () => settleZoomAnimation(zoomAnimation, scrollerRef.current);

  const zoomTo = (index: number) => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    if (index < 0 || index >= ZOOM_LEVELS.length || index === zoomIndex) return;
    if (scroller && numeral) {
      // Where the numeral is drawn now, part-way through an earlier zoom's animation included:
      // the next animation starts from there, so a quick succession of zooms never jumps
      const { left, top, width } = numeral.getBoundingClientRect();
      endZoomAnimation();
      // Read at each zoom, so a change of preference applies from the next one
      pendingAnimation.current = prefersReducedMotion() ? null : { left, top, width };
      // Around the point the user sees at the centre, also where a resize clamped the intended
      // view: it then becomes the view to keep. Measured untransformed, once settled
      pendingScroll.current = centrePoint(scroller, numeral, zoom);
    }
    setZoomIndex(index);
  };

  // Instant, never animated: a jump to the start, not a change of scale
  const reset = () => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    endZoomAnimation();
    pendingAnimation.current = null;
    if (zoomIndex !== DEFAULT_ZOOM_INDEX) {
      pendingScroll.current = 'start';
      setZoomIndex(DEFAULT_ZOOM_INDEX);
    } else if (scroller && numeral) {
      showView(scroller, numeral, zoom, anchor.current, 'start');
    }
  };

  useLayoutEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Once the zoomed numeral is laid out, keep the same point at the centre (or go to its start).
  // Then, for a zoom (not Reset, nor with reduced motion), animate the paper from where the
  // numeral was drawn before to its final layout: a transform only, started once the layout and
  // the scroll position are final, all before paint
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    const target = pendingScroll.current;
    const pending = pendingAnimation.current;
    pendingScroll.current = null;
    pendingAnimation.current = null;
    if (!scroller || !numeral || !target) return;
    showView(scroller, numeral, zoom, anchor.current, target);

    const paper = paperRef.current;
    if (!pending || !paper || typeof paper.animate !== 'function') return;
    const start = getZoomAnimationStart(pending, numeral.getBoundingClientRect(), paper.getBoundingClientRect());
    if (!start) return;
    const animation = paper.animate(zoomAnimationKeyframes(start), {
      duration: ZOOM_ANIMATION_DURATION,
      easing: ZOOM_ANIMATION_EASING,
    });
    // Without a fill, its effect ends with it: the paper is left untransformed. Settling cancels
    // it, which rejects `finished`: expected. Either way, only the running animation's end
    // changes anything (see completeZoomAnimation)
    const onEnd = () => completeZoomAnimation(zoomAnimation, scroller, animation);
    animation.finished.then(onEnd, onEnd);
    // Marked last, once the animation exists and is being followed, so that nothing before it
    // can leave the stage marked without a running animation
    zoomAnimation.current = animation;
    // `fit` where the zoomed layout does not scroll sideways: the gutters are then never stuck
    // over the paper, and can let it show through (see AnnotationGutter)
    scroller.setAttribute(ZOOMING_ATTRIBUTE, scroller.scrollWidth > scroller.clientWidth ? '' : 'fit');
  }, [zoom, scrollerRef]);

  // A new numeral shows its start: its highest place value, centred horizontally. Before paint,
  // so it is never shown at the previous numeral's scroll position. Never animated
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    settleZoomAnimation(zoomAnimation, scroller);
    if (scroller && numeral) showView(scroller, numeral, zoomRef.current, anchor.current, 'start');
  }, [resetKey, scrollerRef]);

  // Showing or hiding the annotation gutters changes the width of the group around the paper, and
  // so where the paper is in the scrollable area (from the stage's padding where it overflows,
  // centred where it fits), but not the scroll position: the same position would then show another
  // part of the numeral. Show the intended view again, before paint. A transition only: not the
  // first render, whose gutters, if any, are laid out with the numeral's start, nor an ordinary
  // rerender. After the effects above, so that a new numeral's start is the intended view here.
  // The animation ends first: its transform is part of what is measured
  const hadAnnotations = useRef(hasAnnotations);
  useLayoutEffect(() => {
    if (hadAnnotations.current === hasAnnotations) return;
    hadAnnotations.current = hasAnnotations;
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    if (!scroller || !numeral) return;
    settleZoomAnimation(zoomAnimation, scroller);
    showView(scroller, numeral, zoomRef.current, anchor.current, anchor.current.view);
  }, [hasAnnotations, scrollerRef]);

  // A zoom animation does not outlive the viewer
  useEffect(() => {
    const scroller = scrollerRef.current;
    return () => settleZoomAnimation(zoomAnimation, scroller);
  }, [scrollerRef]);

  // When the scroller's size changes (the window, the layout, or a classic scrollbar appearing or
  // going), show the intended view again, so the point at the centre stays in place. The
  // observer reports the scroller's content box, which scrolling never changes, so correcting
  // the scroll position cannot report again; a report at the size already shown is skipped.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const numeral = numeralRef.current;
      const { size } = anchor.current;
      if (!numeral || (size && scroller.clientWidth === size.width && scroller.clientHeight === size.height)) return;
      // Measured untransformed: a resize during a zoom animation ends it first
      settleZoomAnimation(zoomAnimation, scroller);
      showView(scroller, numeral, zoomRef.current, anchor.current, anchor.current.view);
    });
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scrollerRef]);

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    if (scroller && numeral) followUserScroll(scroller, numeral, zoom, anchor.current, endZoomAnimation);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Only when the viewport itself has focus, and never for browser shortcuts such as Ctrl/⌘ +
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === '+' || e.key === '=') {
      // One step per key press: holding the key (auto-repeat) does not keep zooming
      if (!e.repeat) zoomTo(zoomIndex + 1);
    } else if (e.key === '-') {
      if (!e.repeat) zoomTo(zoomIndex - 1);
    } else if (e.key === '0') reset();
    else return;

    e.preventDefault();
  };

  // Borderless in the canvas tray: surface-active for hover and press, since surface-hover barely
  // differs from canvas in the light theme. At a limit, fg-disabled and no hover or press fill
  const buttonClass =
    'cursor-pointer inline-flex h-7 items-center justify-center rounded text-sm text-fg-muted hover:bg-surface-active hover:text-fg active:bg-surface-active active:text-fg focus-ring aria-disabled:cursor-not-allowed aria-disabled:bg-transparent aria-disabled:text-fg-disabled';

  return (
    // As wide as the viewer card's content
    <div className="w-full space-y-3">
      {/* The header row, outside the scroller, so it never takes part in the scroll positions
          kept through zooming and resizing: the heading, then the zoom controls beside it, or
          on their own line under it where there is no room. The controls never wrap */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {header}
        {/* A plain group: a toolbar role would promise arrow-key navigation between the buttons */}
        <div role="group" aria-label="Zoom controls" className="flex shrink-0 items-center gap-1 rounded-md bg-canvas p-0.5">
          {/* aria-disabled rather than disabled, so a focused button keeps its focus at a limit */}
          <button
            type="button"
            className={`${buttonClass} w-7`}
            aria-label="Zoom out"
            aria-disabled={atMin}
            onClick={() => zoomTo(zoomIndex - 1)}
          >
            −
          </button>
          {/* As wide as "400%" at every level, so Zoom in never moves under the pointer */}
          <span aria-live="polite" className="w-12 text-center text-sm tabular-nums text-fg-muted">
            {Math.round(zoom * 100)}%
            {atMin && <span className="sr-only"> (minimum zoom)</span>}
            {atMax && <span className="sr-only"> (maximum zoom)</span>}
          </span>
          <button
            type="button"
            className={`${buttonClass} w-7`}
            aria-label="Zoom in"
            aria-disabled={atMax}
            onClick={() => zoomTo(zoomIndex + 1)}
          >
            +
          </button>
          {/* Decorative: separates the steps from Reset */}
          <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-line-strong" />
          <button type="button" className={`${buttonClass} px-2`} onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <p id={hintId} className="sr-only">
        Scroll to move through the numeral. Press plus or minus to zoom and 0 to reset.
      </p>
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="group"
        aria-label="Numeral viewer"
        aria-describedby={hintId}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        // The stage: an inset panel in `canvas`, the backdrop the tier guides' colours assume
        // behind a translucent numeral (VIEWER_BACKDROP). Its height is the screen's, never the
        // numeral's, so it stays the same at every zoom level
        data-numeral-stage
        data-numeral-backdrop
        // A container for the annotation gutters' width query, only while there are gutters
        className={`numeral-stage-height overflow-auto rounded-md border border-line bg-canvas shadow-inner scrollbar-themed focus-ring${
          hasAnnotations ? ' @container' : ''
        }`}
      >
        {/* The stage content: a flex box at least as large as the stage and as large as the
            paper and its padding, so the stage's scrollable area always includes the whole
            paper. It is not a scroll container; it clips only what is drawn outside it. The
            group (`data-numeral-group`, always present, a real flex box) is its only item: it is
            centred both ways by automatic margins while it fits, and starts at the stage
            content's padding where it does not, so it is never out of reach. It is as wide as
            the paper and its annotation gutters, if any, which are its first and last items:
            as conditional siblings they leave the paper's place in the group, and so its
            identity, unchanged. */}
        <div data-numeral-stage-content className="flex w-max min-w-full min-h-full p-4 overflow-clip">
          <div data-numeral-group className="m-auto flex shrink-0">
            {gutterHeight !== null && (
              <AnnotationGutter side="start" height={gutterHeight} compact={compactAnnotations}>
                {annotationsStart}
              </AnnotationGutter>
            )}
            {/* The paper, the visible surface around the numeral image: the numeral's background,
                painted once across its fixed 12 px padding and the numeral (a screen-only rule in
                `src/index.css` makes the SVG's own background rectangle transparent inside it), and
                its edge and shadow, the page's, never part of the SVG. Its group centres it
                (both ways while it fits, from the stage content's padding where it does not); it is
                never shrunk. Its padding does not zoom, and is never exported */}
            <div
              ref={paperRef}
              data-numeral-paper
              className="m-auto shrink-0 p-3 shadow-sm ring-1 ring-line"
              style={{ backgroundColor: background }}
            >
              {/* The numeral image, the zoom wrapper: one image for assistive technology instead of
                  thousands of glyph shapes, and the positioning context of the underlay and
                  overlay. Its width is the numeral's in CSS px at this zoom, never shrunk */}
              <div
                ref={numeralRef}
                data-numeral-image
                role="img"
                aria-label={label}
                className="relative"
                style={{ width: `${numeralWidth * zoom}px` }}
              >
                {underlay}
                {children}
                {overlay}
              </div>
            </div>
            {gutterHeight !== null && (
              <AnnotationGutter side="end" height={gutterHeight} compact={compactAnnotations}>
                {annotationsEnd}
              </AnnotationGutter>
            )}
          </div>
        </div>
      </div>
      {footer}
    </div>
  );
};

export default NumeralViewport;
