import React from 'react';
import { Numbers } from '@components/icons/Numbers';

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, placeholder = 'Enter a number' }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative flex items-center max-w-sm w-full">
      <label htmlFor="number-input" className="sr-only">Number input</label>
      <input
        id="number-input"
        type="number"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Number input"
        min="0"
        step="1"
        pattern="\d*"
        className="w-full pl-10 pr-4 py-2 rounded-md px-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ms-moss-500 transition"
      />
      <Numbers className="absolute left-3 w-5 h-5 text-ms-moss-500 pointer-events-none" />
    </div>
  );
};

export default NumberInput;
