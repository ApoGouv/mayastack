import React from 'react';
import { Numbers } from '@components/icons/Numbers';
import { validateNumberInput } from '@utils/numberInput';
import type { NumberInputError } from '@utils/numberInput';

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ERROR_ID = 'number-input-error';

const ERROR_MESSAGES: Record<NumberInputError, string> = {
  negative: 'Negative numbers can’t be converted. Enter a whole number of 0 or more.',
  decimal: 'Decimal numbers can’t be converted. Enter a whole number without a decimal point.',
  'invalid-characters': 'Use digits 0–9 only, without spaces, separators or other symbols.',
};

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, placeholder = 'Enter a number' }) => {
  const validation = validateNumberInput(value);
  const error = validation.status === 'invalid' ? ERROR_MESSAGES[validation.reason] : null;

  // Pass the text on exactly as typed or pasted; invalid text is flagged, never altered
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="max-w-sm w-full">
      <div className="relative flex items-center">
        <label htmlFor="number-input" className="sr-only">Number input</label>
        {/* A text input (not type="number"): number inputs can't hold integers of
            arbitrary length and change the text before it reaches React */}
        <input
          id="number-input"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          aria-label="Number input"
          aria-invalid={error !== null}
          aria-describedby={error ? ERROR_ID : undefined}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          className={`w-full pl-10 pr-4 py-2 rounded-md px-4 border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition ${
            error
              ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-700 focus:ring-ms-moss-500'
          }`}
        />
        <Numbers className="absolute left-3 w-5 h-5 text-ms-moss-500 pointer-events-none" />
      </div>
      {/* Always rendered so screen readers announce the message when it appears */}
      <p
        id={ERROR_ID}
        aria-live="polite"
        className={`text-sm text-red-600 dark:text-red-400 ${error ? 'mt-1' : ''}`}
      >
        {error}
      </p>
    </div>
  );
};

export default NumberInput;
