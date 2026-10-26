import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

/** The zoom levels the viewport steps through, smallest to largest */
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

const DEFAULT_ZOOM_INDEX = ZOOM_LEVELS.indexOf(1);

interface NumeralViewportProps {
  /** The numeral, usually a MayanRenderer SVG */
  children: React.ReactNode;
  /** Accessible description of the numeral, e.g. how many digit stacks it has */
  label: string;
  /** Maximum height in px; shorter numerals keep their natural height */
  maxHeight?: number;
  /** Changing this value (e.g. for a new number) scrolls back to the top */
  resetKey?: string;
}

/**
 * A bounded, natively scrolling viewport for a numeral.
 *
 * The numeral keeps its full logical size: zooming only changes the width of the
 * HTML wrapper the SVG scales to, so the SVG's own width, height and viewBox (the
 * source for SVG and PNG export) never change. Scrolling is the browser's own.
 */
const NumeralViewport: React.FC<NumeralViewportProps> = ({
  children,
  label,
  maxHeight = 480,
  resetKey,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  // Where to put the scroll position after the next zoom change: a point to keep
  // centred (as a fraction of the content size), or the top-left corner
  const pendingScroll = useRef<{ x: number; y: number } | 'top' | null>(null);
  const hintId = useId();

  const zoom = ZOOM_LEVELS[zoomIndex];
  const atMin = zoomIndex === 0;
  const atMax = zoomIndex === ZOOM_LEVELS.length - 1;

  const zoomTo = (index: number) => {
    const scroller = scrollerRef.current;
    if (index < 0 || index >= ZOOM_LEVELS.length || index === zoomIndex) return;
    if (scroller && scroller.scrollWidth > 0 && scroller.scrollHeight > 0) {
      pendingScroll.current = {
        x: (scroller.scrollLeft + scroller.clientWidth / 2) / scroller.scrollWidth,
        y: (scroller.scrollTop + scroller.clientHeight / 2) / scroller.scrollHeight,
      };
    }
    setZoomIndex(index);
  };

  const reset = () => {
    if (zoomIndex === DEFAULT_ZOOM_INDEX) {
      scrollerRef.current?.scrollTo(0, 0);
    } else {
      pendingScroll.current = 'top';
      setZoomIndex(DEFAULT_ZOOM_INDEX);
    }
  };

  // Once the zoomed content is laid out, keep the same point centred (or go to the top)
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const target = pendingScroll.current;
    pendingScroll.current = null;
    if (!scroller || !target) return;
    if (target === 'top') {
      scroller.scrollTo(0, 0);
    } else {
      scroller.scrollTo(
        target.x * scroller.scrollWidth - scroller.clientWidth / 2,
        target.y * scroller.scrollHeight - scroller.clientHeight / 2
      );
    }
  }, [zoom]);

  // A new numeral starts at its top: its highest place value
  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0);
  }, [resetKey]);

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
    <div className="space-y-2">
      {/* A plain group: a toolbar role would promise arrow-key navigation between the buttons */}
      <div role="group" aria-label="Zoom controls" className="flex items-center gap-2">
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
        <button
          type="button"
          className={buttonClass}
          aria-label="Zoom in"
          aria-disabled={atMax}
          onClick={() => zoomTo(zoomIndex + 1)}
        >
          +
        </button>
        <button type="button" className={buttonClass} onClick={reset}>
          Reset
        </button>
        <span aria-live="polite" className="text-sm tabular-nums text-fg-muted">
          {Math.round(zoom * 100)}%
          {atMin && <span className="sr-only"> (minimum zoom)</span>}
          {atMax && <span className="sr-only"> (maximum zoom)</span>}
        </span>
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
        className="overflow-auto rounded-xs focus-ring"
        style={{ maxHeight }}
      >
        {/* One image for assistive technology instead of thousands of glyph shapes */}
        <div role="img" aria-label={label} style={{ width: `${zoom * 100}%` }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default NumeralViewport;
