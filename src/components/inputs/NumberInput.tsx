import React from 'react';
import { Numbers } from '@components/icons/Numbers';
import {
  MAX_INPUT_LENGTH,
  MAX_SIGNIFICANT_DIGITS,
  countRedundantLeadingZeros,
  countSignificantDigits,
  stepNumberValue,
  validateNumberInput,
} from '@utils/numberInput';
import type { NumberInputError } from '@utils/numberInput';

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ERROR_ID = 'number-input-error';
const COUNT_ID = 'number-input-count';
const HINT_ID = 'number-input-hint';

const ERROR_MESSAGES: Record<NumberInputError, string> = {
  negative: 'Negative numbers can’t be converted. Enter a whole number of 0 or more.',
  decimal: 'Decimal numbers can’t be converted. Enter a whole number without a decimal point.',
  'invalid-characters': 'Use digits 0–9 only, without spaces, separators or other symbols.',
  'too-many-digits': `Numbers can have at most ${MAX_SIGNIFICANT_DIGITS} digits, not counting leading zeros.`,
  'too-long': `The input can be at most ${MAX_INPUT_LENGTH} characters long, including spaces and leading zeros.`,
};

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, placeholder = 'Enter a number' }) => {
  const validation = validateNumberInput(value);
  const error = validation.status === 'invalid' ? ERROR_MESSAGES[validation.reason] : null;
  const digitCount = validation.status === 'valid' ? countSignificantDigits(validation.value) : null;
  const describedBy = [error && ERROR_ID, digitCount !== null && COUNT_ID, HINT_ID].filter(Boolean).join(' ');

  // Pass the text on as typed or pasted. Invalid text is flagged, never altered; only the
  // leading zeros of a valid integer are removed, so typing 5 after the initial 0 gives 5
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const text = input.value;
    const zeros = countRedundantLeadingZeros(text);
    if (zeros === 0) {
      onChange(text);
      return;
    }

    // Remove the zeros in the field itself, keeping the caret (or selection) on the same
    // digits, so React then finds the field already showing the new value and leaves it as is
    const start = Math.max(0, (input.selectionStart ?? text.length) - zeros);
    const end = Math.max(0, (input.selectionEnd ?? text.length) - zeros);
    const direction = input.selectionDirection ?? undefined;
    const digits = text.slice(zeros);
    input.value = digits;
    input.setSelectionRange(start, end, direction);
    onChange(digits);
  };

  // Up and Down add or subtract 1 from a valid integer, within 0 to the 500-digit maximum.
  // With modifiers (e.g. Shift to select), while composing, or for empty or invalid text,
  // the keys keep their usual effect
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.nativeEvent.isComposing) return;
    if (validation.status !== 'valid') return;

    // Handled even at either end of the range, where the value stays as it is
    e.preventDefault();
    const next = stepNumberValue(validation.value, e.key === 'ArrowUp' ? 1 : -1);
    if (next !== validation.value) onChange(next.toString());
  };

  return (
    <div className="max-w-sm w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex flex-1 items-center">
          <label htmlFor="number-input" className="sr-only">Number input</label>
          {/* A text input (not type="number"): number inputs can't hold integers of
              arbitrary length and change the text before it reaches React */}
          <input
            id="number-input"
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Number input"
            aria-invalid={error !== null}
            aria-describedby={describedBy}
            aria-keyshortcuts="ArrowUp ArrowDown"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            className={`w-full pl-10 pr-4 py-2 rounded-md px-4 border bg-well text-fg placeholder-fg-subtle focus-ring transition ${
              error ? 'border-danger' : 'border-line-strong'
            }`}
          />
          <Numbers className="absolute left-3 w-5 h-5 text-fg-subtle pointer-events-none" />
        </div>
        {/* Resets the number to 0, from any text; focus stays on the button */}
        <button
          type="button"
          onClick={() => onChange('0')}
          className="shrink-0 cursor-pointer px-3 py-2 text-sm rounded-md border border-line-strong bg-surface text-fg hover:bg-surface-hover active:bg-surface-active focus-ring"
        >
          Clear
        </button>
      </div>
      {/* Always rendered so screen readers announce the message when it appears */}
      <p
        id={ERROR_ID}
        aria-live="polite"
        className={`text-sm text-danger ${error ? 'mt-1' : ''}`}
      >
        {error}
      </p>
      {/* Not a live region: the count changes with every keystroke */}
      <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-fg-muted">
        {digitCount !== null && (
          <span id={COUNT_ID} className="tabular-nums">
            {digitCount} significant {digitCount === 1 ? 'digit' : 'digits'}
          </span>
        )}
        <span id={HINT_ID}>Up and Down arrow keys add or subtract 1.</span>
      </p>
    </div>
  );
};

export default NumberInput;
