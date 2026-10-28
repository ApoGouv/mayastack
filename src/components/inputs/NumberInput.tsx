import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Numbers } from '@components/icons/Numbers';
import { Casino } from '@components/icons/Casino';
import { ContentCopy } from '@components/icons/ContentCopy';
import { Close } from '@components/icons/Close';
import NumberQuickActions from '@components/inputs/NumberQuickActions';
import { copyText } from '@utils/clipboard';
import {
  MAX_INPUT_LENGTH,
  MAX_SIGNIFICANT_DIGITS,
  countRedundantLeadingZeros,
  countSignificantDigits,
  stepNumberValue,
  validateNumberInput,
} from '@utils/numberInput';
import type { NumberInputError } from '@utils/numberInput';
import { generateRandomNumberText } from '@utils/randomNumber';

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ERROR_ID = 'number-input-error';
const COUNT_ID = 'number-input-count';
const HINT_ID = 'number-input-hint';
const UNAVAILABLE_ID = 'number-input-unavailable';
/** One copy message at a time: a new one replaces the last */
const COPY_TOAST_ID = 'number-copy';

const iconButtonClassName =
  'cursor-pointer p-1.5 rounded text-fg-muted hover:bg-surface-hover hover:text-fg active:bg-surface-active focus-ring aria-disabled:cursor-not-allowed aria-disabled:text-fg-disabled aria-disabled:hover:bg-transparent';

const ERROR_MESSAGES: Record<NumberInputError, string> = {
  negative: 'Negative numbers can’t be converted. Enter a whole number of 0 or more.',
  decimal: 'Decimal numbers can’t be converted. Enter a whole number without a decimal point.',
  'invalid-characters': 'Use digits 0–9 only, without spaces, separators or other symbols.',
  'too-many-digits': `Numbers can have at most ${MAX_SIGNIFICANT_DIGITS} digits, not counting leading zeros.`,
  'too-long': `The input can be at most ${MAX_INPUT_LENGTH} characters long, including spaces and leading zeros.`,
};

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, placeholder = 'Enter a number' }) => {
  // The last Random result; the count gives each announcement a new node, so screen
  // readers announce it even when the message is the same as the last one
  const [random, setRandom] = useState<{ text: string; count: number } | null>(null);

  const validation = validateNumberInput(value);
  const exactValue = validation.status === 'valid' ? validation.value : null;
  const error = validation.status === 'invalid' ? ERROR_MESSAGES[validation.reason] : null;
  const digitCount = exactValue !== null ? countSignificantDigits(exactValue) : null;
  const describedBy = [error && ERROR_ID, digitCount !== null && COUNT_ID, HINT_ID].filter(Boolean).join(' ');
  // Announced only while the input still holds the generated number, and only until the next
  // change: changeValue drops it, so a later edit back to the same text does not revive it
  const randomAnnouncement =
    random !== null && random.text === value
      ? `Random number generated, ${random.text.length} ${random.text.length === 1 ? 'digit' : 'digits'}.`
      : '';

  // Every change other than Random: typing, the arrow keys, the steps, Clear and Zero
  const changeValue = (text: string) => {
    setRandom(null);
    onChange(text);
  };

  // Replaces any text, even empty or invalid text, with a random positive integer
  const handleRandom = () => {
    const text = generateRandomNumberText();
    setRandom((last) => ({ text, count: (last?.count ?? 0) + 1 }));
    onChange(text);
  };

  // Copies the value in its canonical form, e.g. "7" for " 007", and says whether it worked
  const handleCopy = async () => {
    if (exactValue === null) return;
    const result = await copyText(exactValue.toString());
    if (result.ok) {
      toast.success('Number copied to the clipboard.', { id: COPY_TOAST_ID });
    } else if (result.reason === 'unavailable') {
      toast.error('This browser can’t copy to the clipboard here. Select the number and copy it with Ctrl+C or ⌘+C.', { id: COPY_TOAST_ID });
    } else {
      toast.error('The number could not be copied. Select it and copy it with Ctrl+C or ⌘+C.', { id: COPY_TOAST_ID });
    }
  };

  // Pass the text on as typed or pasted. Invalid text is flagged, never altered; only the
  // leading zeros of a valid integer are removed, so typing 5 after the initial 0 gives 5
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const text = input.value;
    const zeros = countRedundantLeadingZeros(text);
    if (zeros === 0) {
      changeValue(text);
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
    changeValue(digits);
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
    if (next !== validation.value) changeValue(next.toString());
  };

  return (
    <div className="w-full">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label htmlFor="number-input" className="text-sm font-medium text-fg">Decimal integer</label>
        {/* Not a live region: the count changes with every keystroke */}
        {digitCount !== null && (
          <span id={COUNT_ID} className="rounded-md bg-surface-hover px-2 py-0.5 text-xs tabular-nums text-fg-muted">
            {digitCount} {digitCount === 1 ? 'digit' : 'digits'}
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        {/* A text input (not type="number"): number inputs can't hold integers of
            arbitrary length and change the text before it reaches React */}
        <input
          id="number-input"
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          title="Enter a decimal integer. Use ↑/↓ to change by 1."
          aria-invalid={error !== null}
          aria-describedby={describedBy}
          aria-keyshortcuts="ArrowUp ArrowDown"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          // A 1px line-strong boundary (at least 3:1 against the card in both themes, which no
          // field fill reaches) with an inset shadow, as in design-reference concept 3. Errors
          // turn it red, and keyboard focus draws the focus ring over it
          className={`w-full pl-10 pr-28 py-3 rounded border bg-well shadow-inner text-fg placeholder-fg-subtle focus-ring-inset transition ${
            error ? 'border-danger' : 'border-line-strong'
          }`}
        />
        <Numbers className="absolute left-3 w-5 h-5 text-fg-subtle pointer-events-none" aria-hidden="true" />
        {/* In the field, after the text; focus stays on each button after use */}
        <div className="absolute right-1.5 flex items-center gap-0.5">
          <button type="button" aria-label="Random number" title="Random number" onClick={handleRandom} className={iconButtonClassName}>
            <Casino className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
          {/* aria-disabled rather than disabled, so a focused button keeps its focus */}
          <button
            type="button"
            aria-label="Copy number"
            title="Copy number"
            aria-disabled={exactValue === null}
            aria-describedby={exactValue === null ? UNAVAILABLE_ID : undefined}
            onClick={handleCopy}
            className={iconButtonClassName}
          >
            <ContentCopy className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
          {/* Empties the field from any text; Zero sets it to 0 */}
          <button type="button" aria-label="Clear input" title="Clear input" onClick={() => changeValue('')} className={iconButtonClassName}>
            <Close className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {/* Always rendered so screen readers announce the message when it appears */}
      <p
        id={ERROR_ID}
        aria-live="polite"
        className={`text-sm text-danger ${error ? 'mt-1' : ''}`}
      >
        {error}
      </p>
      {/* Visually hidden: pointer users see the field's title instead. Screen readers get it
          as the field's description, together with aria-keyshortcuts */}
      <p id={HINT_ID} className="sr-only">Up and Down arrow keys add or subtract 1.</p>
      <NumberQuickActions value={exactValue} onChange={changeValue} unavailableReasonId={UNAVAILABLE_ID} />
      {exactValue === null && (
        <p id={UNAVAILABLE_ID} className="mt-1 text-sm text-fg-muted">
          Enter a whole number to copy it or use the steps.
        </p>
      )}
      <p role="status" className="sr-only">
        {randomAnnouncement && <span key={random?.count}>{randomAnnouncement}</span>}
      </p>
    </div>
  );
};

export default NumberInput;
