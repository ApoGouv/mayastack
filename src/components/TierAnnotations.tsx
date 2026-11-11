import React from 'react';
import type { TierAnnotationRow } from '@utils/tierAnnotations';

interface TierAnnotationsProps {
  /** The rows from getTierAnnotationRows, bottom tier first */
  rows: TierAnnotationRow[];
  /**
   * What each row says: its power of 20 ("power", e.g. 20² for the tier of exponent 2), or the
   * base-20 digit of the first digit group in that tier ("digit", 0 to 19). A row without a
   * digit (null) shows nothing.
   */
  kind: 'power' | 'digit';
}

/**
 * Screen-only tier annotations: one label per tier of the numeral, in a row of the tier's own
 * height and position.
 *
 * Presentational only. The rows come from getTierAnnotationRows, which also fixes their geometry
 * (fractions of the numeral's height, as the tier guides'); here they become percentages, so the
 * layer fills whatever box it is placed in, which is meant to be as tall as the numeral image.
 * Where that box is, how wide it is and when it is shown are for its container to decide.
 *
 * The layer is decorative: it is hidden from assistive technology (the numeral's own label and
 * the base-20 card say the same), has nothing to focus, and lets the pointer through. It is never
 * part of the SVG, so it is never exported.
 */
export const TierAnnotations: React.FC<TierAnnotationsProps> = ({ rows, kind }) => (
  <div
    aria-hidden="true"
    className="absolute inset-0 pointer-events-none select-none"
    data-tier-annotations={kind}
  >
    {rows.map(({ exponent, top, height, digits }) => {
      // A zero digit is a digit: only null is missing
      const digit = digits[0] ?? null;
      return (
        <div
          key={exponent}
          // Powers, the tiers' structure, in the quieter subtle text colour; digits, the numeral's
          // values, in the gold text colour (UI-13). Both theme tokens, legible on the gutters' canvas
          className={`absolute inset-x-0 flex items-center justify-center whitespace-nowrap text-xs tabular-nums ${
            kind === 'power' ? 'text-fg-subtle' : 'text-accent-fg'
          }`}
          data-tier-annotation
          data-exponent={exponent}
          style={{ top: `${top * 100}%`, height: `${height * 100}%` }}
        >
          {kind === 'power' ? (
            <span>
              20<sup>{exponent}</sup>
            </span>
          ) : (
            // In brackets (UI-13), real elements in the quieter subtle colour, the digit in the
            // row's gold, each bracket 2 px from the digit by a margin, not a space; nothing at
            // all, brackets included, where the digit is missing
            digit !== null && (
              <span>
                <span className="mr-0.5 text-fg-subtle" data-tier-annotation-bracket>
                  [
                </span>
                {digit}
                <span className="ml-0.5 text-fg-subtle" data-tier-annotation-bracket>
                  ]
                </span>
              </span>
            )
          )}
        </div>
      );
    })}
  </div>
);

export default TierAnnotations;
