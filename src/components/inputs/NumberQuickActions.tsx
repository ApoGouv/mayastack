import React from 'react';
import { MAX_SIGNIFICANT_DIGITS, addToNumberValue } from '@utils/numberInput';

interface NumberQuickActionsProps {
  /** The exact value of the number input, or null while it is empty or invalid */
  value: bigint | null;
  onChange: (value: string) => void;
  /** The description of why the steps are unavailable while value is null */
  unavailableReasonId: string;
}

const STEPS_LABEL_ID = 'number-steps-label';
const MAX_REASON_ID = 'number-steps-max-reason';

/** The quick steps; the titles name what each adds in the numeral (design-reference concept 3) */
const STEPS: { amount: bigint; title: string }[] = [
  { amount: 1n, title: '+1' },
  { amount: 5n, title: '+5 (1 Bar)' },
  { amount: 20n, title: '+20 (Tier ×1)' },
  { amount: 400n, title: '+400 (Tier ×2)' },
];

const stepClassName =
  'cursor-pointer px-2.5 py-1 text-sm tabular-nums rounded border border-line-strong bg-surface-hover text-fg hover:bg-surface-active active:bg-surface-active focus-ring aria-disabled:cursor-not-allowed aria-disabled:text-fg-disabled aria-disabled:bg-surface';

/**
 * The quick steps (+1, +5, +20 and +400) and Zero, under the number input.
 *
 * A step adds its amount to the current value, exactly, and gives canonical
 * text. While the input is empty or invalid, or where a step would go past the
 * 500-digit maximum, the step is unavailable instead of changing the text or
 * stopping at the maximum. Zero sets the input to 0 from any text.
 */
const NumberQuickActions: React.FC<NumberQuickActionsProps> = ({ value, onChange, unavailableReasonId }) => {
  const steps = STEPS.map((step) => ({
    ...step,
    next: value === null ? null : addToNumberValue(value, step.amount),
  }));
  const blockedAtMax = value !== null && steps.some((step) => step.next === null);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="group" aria-labelledby={STEPS_LABEL_ID} className="flex flex-wrap items-center gap-1.5">
          <span id={STEPS_LABEL_ID} className="mr-1 text-sm text-fg-muted">Steps</span>
          {steps.map(({ amount, title, next }) => (
            // aria-disabled rather than disabled, so a focused button keeps its focus
            <button
              key={amount.toString()}
              type="button"
              title={title}
              aria-disabled={next === null}
              aria-describedby={next !== null ? undefined : value === null ? unavailableReasonId : MAX_REASON_ID}
              onClick={() => { if (next !== null) onChange(next.toString()); }}
              className={stepClassName}
            >
              +{amount.toString()}
            </button>
          ))}
        </div>
        {/* Not a step: an outlined button, set apart at the end of the row, with a gold tint
            on hover and keyboard focus (not red: it restores a valid value, it destroys nothing) */}
        <button
          type="button"
          title="0 (Shell)"
          onClick={() => onChange('0')}
          className="ml-auto cursor-pointer px-2.5 py-1 text-sm rounded border border-line-strong bg-surface text-fg hover:border-accent-fg hover:bg-accent-subtle focus-visible:border-accent-fg focus-visible:bg-accent-subtle active:bg-surface-active focus-ring"
        >
          Zero
        </button>
      </div>
      {blockedAtMax && (
        <p id={MAX_REASON_ID} className="mt-1 text-sm text-fg-muted">
          Steps that would go past the {MAX_SIGNIFICANT_DIGITS}-digit maximum are unavailable.
        </p>
      )}
    </div>
  );
};

export default NumberQuickActions;
