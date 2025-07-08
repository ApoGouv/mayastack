import React from 'react';

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
    <input
      type="number"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      aria-label="Number input"
      min="0"
      step="1"
      pattern="\d*"
    />
  );
};

export default NumberInput;
