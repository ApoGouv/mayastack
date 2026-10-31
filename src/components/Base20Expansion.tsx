import React, { Fragment, memo, useId, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { ContentCopy } from '@components/icons/ContentCopy';
import { ExpandMore } from '@components/icons/ExpandMore';
import PowerOf20 from '@components/PowerOf20';
import { useOverflowing } from '@hooks/useOverflowing';
import { getPlaceValues, toBase20Formula, toSuperscript } from '@utils/base20';
import type { PlaceValue } from '@utils/base20';
import { copyText } from '@utils/clipboard';
import { formatGroupedInteger, toCompactInteger } from '@utils/formatInteger';

/** One copy message at a time: a new one replaces the last */
const COPY_TOAST_ID = 'formula-copy';

/** The closing animation (animate-fade-out); the breakdown is removed when it ends */
const FADE_OUT_ANIMATION = 'fade-out';

/**
 * Sticky over the rows as they scroll, so it needs an opaque background. Where even the
 * tightest columns are too narrow (phone widths with a classic scrollbar), a header word
 * breaks rather than widening the table
 */
const headerCellClassName =
  'sticky top-0 z-10 bg-surface px-1.5 sm:px-2 py-1.5 align-bottom text-xs font-medium uppercase tracking-wide wrap-break-word text-fg-muted border-b border-line-strong';

/** Tighter on phones, so that four columns fit */
const bodyCellClassName = 'px-1.5 sm:px-2 py-1.5 align-top border-t border-line';

/**
 * The tier count and the range of powers of 20 they cover, e.g. "12 tiers · 20⁰–20¹¹".
 * Screen readers get the same in words.
 */
export const TierBadge: React.FC<{ tiers: number }> = ({ tiers }) => {
  const highest = tiers - 1;
  const visible = tiers === 1 ? '1 tier · 20⁰' : `${tiers} tiers · 20⁰–20${toSuperscript(highest)}`;
  const spoken = tiers === 1 ? '1 tier, 20 to the power of 0' : `${tiers} tiers, powers of 20 from 0 to ${highest}`;

  return (
    <span className="rounded-md bg-surface-hover px-2 py-0.5 text-xs tabular-nums text-fg-muted">
      <span aria-hidden="true">{visible}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
};

interface AnalyticalBreakdownProps {
  id: string;
  /** The element that names the region: the disclosure button */
  labelledBy: string;
  placeValues: PlaceValue[];
}

/**
 * Every tier's multiplier, digit and contribution, highest tier first, in a capped scrolling box.
 *
 * A multiplier is shown as its power of 20 only; its exact value is in a tooltip, on hover
 * or keyboard focus. A subtotal with 6 or more trailing zeros is shown as a multiple of a
 * power of ten, e.g. "2,560 × 10⁶", with its exact value in the same tooltip. One tooltip
 * serves every row and formats only the value it shows.
 *
 * Subtotals have thousands separators, and a long one wraps only after a separator, never
 * inside a group of three digits (see GroupedInteger).
 */
const AnalyticalBreakdown: React.FC<AnalyticalBreakdownProps> = ({ id, labelledBy, placeValues }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const scrollable = useOverflowing(boxRef, placeValues);
  const tooltipId = useId();

  return (
    <>
      <div
        id={id}
        ref={boxRef}
        role="region"
        // Named by the disclosure button, so the caption below does not repeat the name
        aria-labelledby={labelledBy}
        // In the tab order only while there is something to scroll
        tabIndex={scrollable ? 0 : undefined}
        // A value focused while tabbing backwards is scrolled to the top of the box: the padding
        // keeps it, with its focus ring, below the sticky header (about 45px tall)
        className="max-h-75 overflow-y-auto scroll-pt-14 rounded-md border border-line-strong scrollbar-themed focus-ring"
      >
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm tabular-nums">
          <caption className="sr-only">Place-value contribution of each base-20 tier</caption>
          <colgroup>
            {/* Just wide enough for "Tier 98", "Multiplier" and "Digit" (with "(20ⁿ)" and
                "(cₙ)" on the same line from 640px); the Subtotal column takes the rest */}
            <col className="w-16 sm:w-20" />
            <col className="w-20 sm:w-28" />
            <col className="w-12 sm:w-24" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={headerCellClassName}>Tier</th>
              {/* The headers are uppercase on screen, but not their notation: cₙ and n are symbols.
                  The notation is for the eye: the headers' names say it in words, and reading
                  through the table skips it */}
              <th scope="col" aria-label="Multiplier, 20 to the power of n" className={headerCellClassName}>
                Multiplier<span aria-hidden="true" className="normal-case"> (20<sup>n</sup>)</span>
              </th>
              <th scope="col" aria-label="Digit" className={`${headerCellClassName} text-center`}>
                Digit<span aria-hidden="true" className="normal-case"> (c<sub>n</sub>)</span>
              </th>
              <th scope="col" aria-label="Subtotal, digit times multiplier" className={`${headerCellClassName} text-right`}>
                Subtotal<span aria-hidden="true" className="normal-case"> (c<sub>n</sub> × 20<sup>n</sup>)</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-fg">
            {placeValues.map(({ digit, exponent, value }) => (
              <BreakdownRow key={exponent} digit={digit} exponent={exponent} value={value} tooltipId={tooltipId} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Outside the scrolling box, so that the box never clips it. The longest value, 170
          characters, wraps anywhere onto at most 5 lines, so the tooltip needs no scrolling */}
      <Tooltip
        id={tooltipId}
        className="z-50 max-w-[min(24rem,calc(100vw-2rem))]! bg-inverse! text-on-inverse! text-sm! tabular-nums wrap-anywhere rounded! p-2!"
        place="top"
        offset={6}
        // The pointer can move onto the tooltip (e.g. to select the value); Escape closes it
        clickable
        globalCloseEvents={{ escape: true }}
        render={({ activeAnchor }) => {
          const exact = exactValueOf(activeAnchor);
          return exact == null ? null : formatGroupedInteger(exact);
        }}
      />
    </>
  );
};

/**
 * The exact value a tooltip anchor stands for: 20ⁿ for a multiplier (data-exponent), or the
 * subtotal (data-subtotal, its decimal digits)
 */
function exactValueOf(anchor: Element | null): bigint | null {
  const exponent = anchor?.getAttribute('data-exponent');
  if (exponent != null) return 20n ** BigInt(exponent);
  const subtotal = anchor?.getAttribute('data-subtotal');
  return subtotal == null ? null : BigInt(subtotal);
}

/** Dotted, like an abbreviation: the exact value is in a tooltip, on hover or keyboard focus */
const tooltipAnchorClassName =
  'cursor-help rounded-sm underline decoration-dotted decoration-1 underline-offset-4 focus-ring';

/**
 * An integer with thousands separators that a line may break only after a separator (a <wbr>
 * after each comma), never inside a group of three digits. The text, as read or copied, is
 * unchanged. At the 128-digit limit a whole breakdown has about 500 of them, with no measurable
 * cost; at the earlier 500-digit limit, 63,000 took about 3 s to open, so values then wrapped
 * anywhere.
 */
const GroupedInteger: React.FC<{ value: bigint }> = ({ value }) => (
  <>
    {formatGroupedInteger(value).split(',').map((group, index) => (
      <Fragment key={index}>
        {index > 0 && <>,<wbr /></>}
        {group}
      </Fragment>
    ))}
  </>
);

/**
 * A subtotal: written in full, or, with 6 or more trailing zeros, as "coefficient × 10ᵏ",
 * focusable for a tooltip with the exact value. Screen readers hear "2,560 times 10 to the
 * power of 6". The "× 10ᵏ" part never breaks; a long coefficient wraps between its groups.
 */
const Subtotal: React.FC<{ value: bigint; tooltipId: string }> = ({ value, tooltipId }) => {
  const compact = toCompactInteger(value);
  if (compact == null) return <GroupedInteger value={value} />;

  return (
    <span tabIndex={0} data-tooltip-id={tooltipId} data-subtotal={value.toString()} className={tooltipAnchorClassName}>
      <GroupedInteger value={compact.coefficient} />{' '}
      <span className="whitespace-nowrap">
        <span aria-hidden="true">× 10<sup>{compact.exponent}</sup></span>
        <span className="sr-only select-none">times 10 to the power of {compact.exponent}</span>
      </span>
    </span>
  );
};

interface BreakdownRowProps {
  digit: number;
  exponent: number;
  value: bigint;
  tooltipId: string;
}

/**
 * One tier of the breakdown. Memoized: its props are primitives, so when the number changes
 * only the tiers whose digit changed render again, not every row (up to 99)
 */
const BreakdownRow = memo<BreakdownRowProps>(({ digit, exponent, value, tooltipId }) => (
  <tr>
    <th scope="row" className={`${bodyCellClassName} whitespace-nowrap font-medium text-fg-muted`}>Tier {exponent}</th>
    <td className={bodyCellClassName}>
      {/* Focusable for its tooltip, which gives the exact value; the cells around it are not */}
      <span
        tabIndex={0}
        data-tooltip-id={tooltipId}
        data-exponent={exponent}
        className={`${tooltipAnchorClassName} whitespace-nowrap text-fg-muted`}
      >
        <PowerOf20 exponent={exponent} />
      </span>
    </td>
    <td className={`${bodyCellClassName} text-center font-semibold text-accent-fg`}>{digit}</td>
    {/* A group of digits breaks only as a last resort, where even one would not fit */}
    <td className={`${bodyCellClassName} text-right wrap-break-word`}>
      <Subtotal value={value} tooltipId={tooltipId} />
    </td>
  </tr>
));
BreakdownRow.displayName = 'BreakdownRow';

interface Base20ExpansionProps {
  /** Base-20 digits of the current number, most significant digit first */
  digits: number[];
  /** Whether the analytical breakdown is open: the user's latest choice, kept by the parent */
  breakdownOpen: boolean;
  /** Called with the user's new choice when the breakdown is opened or closed */
  onBreakdownOpenChange: (open: boolean) => void;
}

/**
 * The current number as a sum of base-20 place values: the formula, a Copy Formula action
 * and, on demand, an analytical breakdown of every tier. Everything is derived from the
 * digits through getPlaceValues, so it always matches the rendered numeral.
 *
 * Whether the breakdown is open is kept by the parent, so that it survives this component
 * being removed (for empty or invalid input, or in Date mode).
 */
const Base20Expansion: React.FC<Base20ExpansionProps> = ({ digits, breakdownOpen, onBreakdownOpenChange }) => {
  const placeValues = useMemo(() => getPlaceValues(digits), [digits]);
  const breakdownId = useId();
  const toggleId = useId();
  const formulaLabelId = useId();

  // Closing is the parent's state at once; the breakdown only stays a moment longer, here,
  // to fade out. Opening fades it in only when the user opens it, not when it is shown
  // again already open (e.g. after a number replaces invalid input)
  const [closing, setClosing] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const breakdownShown = breakdownOpen || closing;

  const toggleBreakdown = () => {
    const open = !breakdownOpen;
    onBreakdownOpenChange(open);
    // Reopening while it fades out cancels the fade-out and keeps the table
    setClosing(!open);
    setFadeIn(open);
  };

  // Only the end of a fade-out that is still wanted removes the breakdown: after reopening,
  // closing is false, and a fade-in ending (or one cancelled by closing again) is ignored
  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.animationName === FADE_OUT_ANIMATION) {
      setClosing(false);
    }
  };

  // The formula has one term per tier, so for large numbers it is capped in height and
  // scrolls. Only then does it become a focusable, labelled region, so keyboard users can
  // scroll it; short formulas stay plain text with their natural height
  const formulaRef = useRef<HTMLDivElement>(null);
  const formulaScrollable = useOverflowing(formulaRef, placeValues);

  // Copies the formula of the digits shown now, and says whether it worked
  const handleCopy = async () => {
    const result = await copyText(toBase20Formula(digits));
    if (result.ok) {
      toast.success('Formula copied to the clipboard.', { id: COPY_TOAST_ID });
    } else if (result.reason === 'unavailable') {
      toast.error('This browser can’t copy to the clipboard here.', { id: COPY_TOAST_ID });
    } else {
      toast.error('The formula could not be copied. Please try again.', { id: COPY_TOAST_ID });
    }
  };

  return (
    <div className="basis-full space-y-2">
      {/* The formula panel: inset, a little darker than the card (canvas) in both themes */}
      <div className="rounded-md border border-line bg-canvas p-3 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div id={formulaLabelId} className="text-xs font-medium uppercase tracking-wider text-fg-muted">
            Positional Sum Formula
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-6 cursor-pointer items-center gap-1 rounded px-1 text-xs font-medium text-accent-fg hover:underline focus-ring"
          >
            <ContentCopy className="w-3.5 h-3.5" aria-hidden="true" />
            Copy Formula
          </button>
        </div>

        <div
          ref={formulaRef}
          className="mt-2 max-h-64 overflow-y-auto scrollbar-themed font-mono text-sm leading-relaxed text-fg-muted focus-ring"
          tabIndex={formulaScrollable ? 0 : undefined}
          role={formulaScrollable ? 'region' : undefined}
          aria-labelledby={formulaScrollable ? formulaLabelId : undefined}
        >
          {placeValues.map(({ digit, exponent }, index) => (
            <Fragment key={exponent}>
              {index > 0 && ' '}
              {/* A term never wraps inside itself, and keeps its "+", so lines end with "+".
                  The digit stands out; the operators and powers of 20 stay quieter */}
              <span className="whitespace-nowrap">
                <span className="font-bold text-accent-fg">{digit}</span> × <PowerOf20 exponent={exponent} />
                {index < placeValues.length - 1 && ' +'}
              </span>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-2">
        <button
          type="button"
          id={toggleId}
          aria-expanded={breakdownOpen}
          // Points to the breakdown only while it is open
          aria-controls={breakdownOpen ? breakdownId : undefined}
          onClick={toggleBreakdown}
          // Always tinted, so it reads as a control; darker on hover. The chevron points down
          // while closed and up while open
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded bg-surface-hover px-2 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-active hover:text-fg focus-ring"
        >
          Analytical breakdown
          <ExpandMore className={`w-5 h-5 shrink-0 transition-transform ${breakdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* The rows are only rendered while open, or fading out: up to 99 tiers of 128-digit values.
          The fades animate opacity and a 4px slide only, never the height */}
      {breakdownShown && (
        <div
          className={closing ? 'animate-fade-out' : fadeIn ? 'animate-fade-in' : undefined}
          onAnimationEnd={handleAnimationEnd}
        >
          <AnalyticalBreakdown id={breakdownId} labelledBy={toggleId} placeValues={placeValues} />
        </div>
      )}
    </div>
  );
};

export default Base20Expansion;
