// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DisplaySettingsProvider } from '@context/DisplaySettingsContext';
import { ThemeSelector } from './ThemeSelector';

// The selected option's colours come from compiled Tailwind CSS, which these tests can't
// evaluate: e2e/theme.e2e.ts checks that the selection is visible in both themes.

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/** Renders the selector and opens its menu */
function openMenu() {
  render(
    <DisplaySettingsProvider>
      <ThemeSelector />
    </DisplaySettingsProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /^Theme selector/ }));
  return screen.getAllByRole('menuitem');
}

describe('ThemeSelector selected option', () => {
  it('marks only the current theme as selected', () => {
    const options = openMenu();
    expect(options.map((option) => option.textContent)).toEqual(['Light', 'Dark', 'System']);
    // No saved theme: the system theme is current
    expect(options.map((option) => option.getAttribute('aria-current'))).toEqual([null, null, 'true']);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Dark' }));
    fireEvent.click(screen.getByRole('button', { name: /^Theme selector/ }));
    expect(
      screen.getAllByRole('menuitem').map((option) => option.getAttribute('aria-current'))
    ).toEqual([null, 'true', null]);
  });

  it('styles the selected option differently from the others', () => {
    const [light, dark, system] = openMenu();
    expect(system.className).not.toBe(light.className);
    expect(light.className).toBe(dark.className);
  });
});
