// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RenderModeSelector from './RenderModeSelector';
import type { RenderMode } from './RenderModeSelector';

afterEach(cleanup);

/** Renders the selector controlled by state, as HomeView does */
function renderSelector(initialMode: RenderMode = 'number', onModeChange = vi.fn()) {
  function ControlledSelector() {
    const [mode, setMode] = useState(initialMode);
    return <RenderModeSelector mode={mode} onChange={(next) => { setMode(next); onModeChange(next); }} />;
  }
  render(<ControlledSelector />);
  return {
    number: screen.getByRole('radio', { name: 'Number (Decimal)' }) as HTMLInputElement,
    date: screen.getByRole('radio', { name: 'Date' }) as HTMLInputElement,
    onModeChange,
  };
}

describe('RenderModeSelector', () => {
  it('is a fieldset of native radio buttons named by its legend, "Input Type"', () => {
    const { number, date } = renderSelector();
    const group = screen.getByRole('group', { name: 'Input Type' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group.querySelector('legend')?.textContent).toBe('Input Type');
    expect([number.type, date.type]).toEqual(['radio', 'radio']);
    expect(number.name).toBe(date.name);
    expect(group.contains(number) && group.contains(date)).toBe(true);
  });

  it('names the group once, without a second radiogroup label, and hides its icon', () => {
    renderSelector();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getAllByRole('group')).toHaveLength(1);
    expect(document.querySelector('legend svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('checks the current mode and changes it from either segment', () => {
    const { number, date, onModeChange } = renderSelector('number');
    expect([number.checked, date.checked]).toEqual([true, false]);

    fireEvent.click(date);
    expect([number.checked, date.checked]).toEqual([false, true]);
    expect(onModeChange).toHaveBeenLastCalledWith('date');

    // A click on the segment's text selects it too
    fireEvent.click(screen.getByText('Number (Decimal)'));
    expect([number.checked, date.checked]).toEqual([true, false]);
    expect(onModeChange).toHaveBeenLastCalledWith('number');
  });

  it('starts with the date mode checked when given it', () => {
    const { number, date } = renderSelector('date');
    expect([number.checked, date.checked]).toEqual([false, true]);
  });
});
