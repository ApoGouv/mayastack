import React from 'react';
import DatePicker from "react-datepicker";
import { format } from "date-fns";

import "react-datepicker/dist/react-datepicker.css";
import "@components/inputs/DateInput.css";

export type DateParts = { day: number; month: number; year: number } | null;

interface DateInputProps {
  value: string;
  onChange: (parsed: DateParts, raw: string) => void;
  placeholder?: string;
}

const parseDateParts = (date: Date): DateParts => ({
  day: date.getDate(),
  month: date.getMonth() + 1,
  year: date.getFullYear(),
});

const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  placeholder = 'DD-MM-YYYY' 
}) => {

  const parsedDate = (() => {
    const parts = value.split(/[-\/]/);
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
    return null;
  })();

  const handleChange = (date: Date | null) => {
    if (date) {
      const formatted = format(date, "dd-MM-yyyy");
      const parts = parseDateParts(date);
      onChange(parts, formatted);
    } else {
      onChange(null, "");
    }
  };

  return (
    <DatePicker
      selected={parsedDate}
      onChange={handleChange}
      peekNextMonth
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      placeholderText={placeholder}
      dateFormat="dd-MM-yyyy"
      className="date-picker-input"
      aria-label="Date input"
      autoComplete="off"
      isClearable
    />
  );
};

export default DateInput;
