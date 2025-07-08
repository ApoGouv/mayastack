import React from 'react';

export type DateParts = { day: number; month: number; year: number } | null;

interface DateInputProps {
  value: string;
  onChange: (parsed: DateParts, raw: string) => void;
  placeholder?: string;
}

const DateInput: React.FC<DateInputProps> = ({ value, onChange, placeholder = 'DD-MM-YYYY' }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // match dates like "DD-MM-YYYY" or "DD/MM/YYYY"
    const regex = /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/;
    const match = raw.match(regex);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      onChange({ day, month, year }, raw);
    } else {
      onChange(null, raw);
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      aria-label="Date input in DD-MM-YYYY format"
      spellCheck={false}
      autoComplete="off"
    />
  );
};

export default DateInput;
