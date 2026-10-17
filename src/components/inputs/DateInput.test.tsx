// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateInput from './DateInput';
import type { DateParts } from './DateInput';

afterEach(cleanup);

/** Renders the date input with its value kept in state, as HomeView does */
function renderDateInput() {
  const onChange = vi.fn<(parsed: DateParts, raw: string) => void>();
  function Controlled() {
    const [value, setValue] = useState('');
    return (
      <DateInput
        value={value}
        onChange={(parsed, raw) => {
          onChange(parsed, raw);
          setValue(raw);
        }}
      />
    );
  }
  render(<Controlled />);
  const field = screen.getByLabelText('Date input') as HTMLInputElement;
  const days = () => screen.queryAllByRole('gridcell', { name: /^Choose / });
  return { field, days, onChange };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The day, month and year of a calendar day, from its name, e.g. "Choose Monday, October 19th, 2026" */
function partsOf(dayName: string) {
  const [, month, day, year] = /, (\w+) (\d+)\w\w, (\d{4})$/.exec(dayName)!;
  return { day: Number(day), month: MONTHS.indexOf(month) + 1, year: Number(year) };
}

describe('DateInput keyboard use', () => {
  it('opens the calendar when the field receives keyboard focus', () => {
    const { field, days } = renderDateInput();
    expect(days()).toHaveLength(0);

    fireEvent.focus(field);
    expect(days().length).toBeGreaterThan(27);
  });

  it('opens the calendar with Enter or an arrow key after Escape has closed it', () => {
    const { field, days } = renderDateInput();
    for (const key of ['Enter', 'ArrowDown', 'ArrowUp']) {
      fireEvent.focus(field);
      fireEvent.keyDown(field, { key: 'Escape' });
      expect(days()).toHaveLength(0);

      fireEvent.keyDown(field, { key });
      expect(days().length).toBeGreaterThan(27);
    }
  });

  it('moves into the calendar and selects a date with the keyboard', () => {
    const { field, onChange } = renderDateInput();
    fireEvent.focus(field);
    fireEvent.keyDown(field, { key: 'ArrowDown' });

    const focusedDay = () => document.activeElement as HTMLElement;
    expect(focusedDay().getAttribute('role')).toBe('gridcell');
    fireEvent.keyDown(focusedDay(), { key: 'ArrowRight' });
    const chosen = partsOf(focusedDay().getAttribute('aria-label')!);
    fireEvent.keyDown(focusedDay(), { key: 'Enter' });

    // Day, month and year stay separate numbers, as for a date chosen with the mouse
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toEqual(chosen);
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(field.value).toBe(`${pad(chosen.day)}-${pad(chosen.month)}-${chosen.year}`);
  });

  it('keeps the field read-only, with its own id and label', () => {
    const { field } = renderDateInput();
    fireEvent.focus(field);

    expect(field.id).toBe('date-input');
    expect(field.readOnly).toBe(true);
  });
});
