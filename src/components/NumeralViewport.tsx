import React, { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** The zoom levels the viewport steps through, smallest to largest */
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

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
 * Positions are measured from the slab's own box, so the stage's padding and centring margins,
 * which do not scale with the zoom, never shift the point kept at the centre.
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
 * a resize is not yet corrected (see Anchor).
 */
function followUserScroll(scroller: HTMLElement, numeral: HTMLElement, zoom: number, anchor: Anchor) {
  const { at, size } = anchor;
  if (size && (scroller.clientWidth !== size.width || scroller.clientHeight !== size.height)) return;
  const left = scroller.scrollLeft;
  const top = scroller.scrollTop;
  if (at && Math.abs(left - at.left) <= SCROLL_TOLERANCE && Math.abs(top - at.top) <= SCROLL_TOLERANCE) return;
  anchor.view = centrePoint(scroller, numeral, zoom);
  anchor.at = { left, top };
}

interface NumeralViewportProps {
  /** The numeral, usually a MayanRenderer SVG */
  children: React.ReactNode;
  /**
   * The numeral's logical width in SVG units (its SVG's width): at 100% zoom, one CSS pixel per
   * unit, so its width in CSS px at any zoom is this times the zoom level
   */
  numeralWidth: number;
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
}

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
 * Structure: the scroller (the focusable "Numeral viewer", the only scroll container: the
 * stage, as wide as the viewer card, of a fixed height for the screen's, in `canvas`, the
 * backdrop behind a translucent numeral, marked `data-numeral-backdrop`) contains the stage box
 * (`data-numeral-stage`: at least as large as the scroller, as large as the numeral and its
 * padding, and clipping only what is drawn outside it), which contains the zoom wrapper, the
 * slab: the underlay, the numeral and the overlay, in that order, with a screen-only edge and
 * shadow. The slab is centred both ways while it fits, and starts at the stage's padding where
 * it does not, so all of it stays reachable by scrolling.
 */
const NumeralViewport: React.FC<NumeralViewportProps> = ({
  children,
  numeralWidth,
  label,
  resetKey,
  underlay,
  overlay,
  scrollerRef: givenScrollerRef,
  header,
}) => {
  const ownScrollerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = givenScrollerRef ?? ownScrollerRef;
  // The zoom wrapper, the numeral's box that scroll positions are measured against
  const numeralRef = useRef<HTMLDivElement>(null);
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

  const zoomTo = (index: number) => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    if (index < 0 || index >= ZOOM_LEVELS.length || index === zoomIndex) return;
    // Around the point the user sees at the centre, also where a resize clamped the intended
    // view: it then becomes the view to keep
    if (scroller && numeral) pendingScroll.current = centrePoint(scroller, numeral, zoom);
    setZoomIndex(index);
  };

  const reset = () => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
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

  // Once the zoomed numeral is laid out, keep the same point at the centre (or go to its start)
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    const target = pendingScroll.current;
    pendingScroll.current = null;
    if (!scroller || !numeral || !target) return;
    showView(scroller, numeral, zoom, anchor.current, target);
  }, [zoom, scrollerRef]);

  // A new numeral shows its start: its highest place value, centred horizontally. Before paint,
  // so it is never shown at the previous numeral's scroll position
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    if (scroller && numeral) showView(scroller, numeral, zoomRef.current, anchor.current, 'start');
  }, [resetKey, scrollerRef]);

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
      showView(scroller, numeral, zoomRef.current, anchor.current, anchor.current.view);
    });
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scrollerRef]);

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    const numeral = numeralRef.current;
    if (scroller && numeral) followUserScroll(scroller, numeral, zoom, anchor.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Only when the viewport itself has focus, and never for browser shortcuts such as Ctrl/⌘ +
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === '+' || e.key === '=') zoomTo(zoomIndex + 1);
    else if (e.key === '-') zoomTo(zoomIndex - 1);
    else if (e.key === '0') reset();
    else return;

    e.preventDefault();
  };

  const buttonClass =
    'cursor-pointer px-2 py-1 text-sm rounded border border-line-strong bg-surface text-fg hover:bg-surface-hover active:bg-surface-active focus-ring aria-disabled:opacity-50 aria-disabled:cursor-not-allowed';

  return (
    // As wide as the viewer card's content
    <div className="w-full space-y-3">
      {/* The header row, outside the scroller, so it never takes part in the scroll positions
          kept through zooming and resizing: the heading, then the zoom controls beside it, or
          on their own line under it where there is no room. The controls never wrap */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {header}
        {/* A plain group: a toolbar role would promise arrow-key navigation between the buttons */}
        <div role="group" aria-label="Zoom controls" className="flex shrink-0 items-center gap-2">
          {/* aria-disabled rather than disabled, so a focused button keeps its focus at a limit */}
          <button
            type="button"
            className={buttonClass}
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
            className={buttonClass}
            aria-label="Zoom in"
            aria-disabled={atMax}
            onClick={() => zoomTo(zoomIndex + 1)}
          >
            +
          </button>
          {/* Decorative: separates the steps from Reset */}
          <span aria-hidden="true" className="h-5 w-px bg-line-strong" />
          <button type="button" className={buttonClass} onClick={reset}>
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
        data-numeral-backdrop
        className="numeral-stage-height overflow-auto rounded-md border border-line bg-canvas shadow-inner scrollbar-themed focus-ring"
      >
        {/* The stage box: a flex box at least as large as the scroller and as large as the slab
            and its padding, so the scroller's scrollable area always includes the whole slab.
            It is not a scroll container; it clips only what is drawn outside it */}
        <div data-numeral-stage className="flex w-max min-w-full min-h-full p-4 overflow-clip">
          {/* The slab, one image for assistive technology instead of thousands of glyph shapes.
              Its width is the numeral's in CSS px at this zoom, never shrunk. Automatic margins
              centre it both ways while it fits, and become 0 where it does not, so it then
              starts at the padding instead of overflowing out of reach. Its edge and shadow are
              the page's, never part of the SVG */}
          <div
            ref={numeralRef}
            role="img"
            aria-label={label}
            className="relative m-auto shrink-0 shadow-sm ring-1 ring-line"
            style={{ width: `${numeralWidth * zoom}px` }}
          >
            {underlay}
            {children}
            {overlay}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumeralViewport;
