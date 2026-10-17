import React, { forwardRef } from 'react';
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { CalendarMonth } from '@components/icons/CalendarMonth';

import "react-datepicker/dist/react-datepicker.css";
import "@components/inputs/DateInput.css";

export type DateParts = { day: number; month: number; year: number } | null;

interface DateInputProps {
  value: string;
  onChange: (parsed: DateParts, raw: string) => void;
  placeholder?: string;
}

// The props react-datepicker passes to its custom input that this read-only field uses:
// the focus and key handlers open the calendar and move into it from the keyboard
type CustomInputProps = Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  | 'value'
  | 'placeholder'
  | 'onClick'
  | 'onFocus'
  | 'onBlur'
  | 'onKeyDown'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-invalid'
  | 'aria-required'
>;

// Parse a Date object into { day, month, year }
const parseDateParts = (date: Date): DateParts => ({
  day: date.getDate(),
  month: date.getMonth() + 1,
  year: date.getFullYear(),
});

// Custom input component with readonly behavior
  const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
    (
      {
        value,
        placeholder,
        onClick,
        onFocus,
        onBlur,
        onKeyDown,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        'aria-describedby': ariaDescribedBy,
        'aria-invalid': ariaInvalid,
        'aria-required': ariaRequired,
      },
      ref
    ) => (
      <div className="relative flex items-center max-w-sm w-full">
        <label htmlFor="date-input" className="sr-only">Date input</label>
        {/* Read-only: dates are chosen in the calendar, so typing never changes the value.
            The picker's onChange, id, name and class props are left out: they would replace
            this field's own id and styling, and a read-only field has no typed changes */}
        <input
          id="date-input"
          type="text"
          readOnly
          onClick={onClick}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          ref={ref}
          value={value}
          placeholder={placeholder}
          aria-haspopup="dialog"
          className="w-full pl-10 pr-4 py-2 rounded-md px-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ms-moss-500 transition cursor-pointer"
        />
        <CalendarMonth className="absolute left-3 w-5 h-5 text-ms-moss-500 pointer-events-none" />
      </div>
    )
  );

const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  placeholder = 'DD-MM-YYYY' 
}) => {

  // Parse raw string into Date object (if valid)
  const parsedDate = (() => {
    const parts = value.split("-");
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
      dateFormat="dd-MM-yyyy"
      customInput={<CustomInput placeholder={placeholder}/>}
      aria-label="Date input"
      autoComplete="off"
      isClearable
    />
  );
};

export default DateInput;
