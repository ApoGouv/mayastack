// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import DisplaySettings from '@components/DisplaySettings';
import { ThemeSelector } from '@components/ThemeSelector';
import { DisplaySettingsProvider } from './DisplaySettingsContext';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  storageSpies.splice(0).forEach((spy) => spy.mockRestore());
  localStorage.clear();
});

/** The error a browser throws for storage it blocks */
const blocked = () => {
  throw new DOMException('The operation is insecure.', 'SecurityError');
};

/** Storage methods made to throw, restored after each test */
const storageSpies: { mockRestore: () => void }[] = [];

/**
 * Makes a storage method throw. These spies are restored one by one, because
 * vi.restoreAllMocks() does not restore a spy on happy-dom's storage (a Proxy).
 */
function failStorage(method: 'getItem' | 'setItem' | 'removeItem', fail: () => never = blocked) {
  const spy = vi.spyOn(localStorage, method).mockImplementation(fail);
  storageSpies.push(spy);
  return spy;
}

/** Renders the theme selector and the display settings, and returns their controls */
function renderSettings() {
  render(
    <DisplaySettingsProvider>
      <ThemeSelector />
      <DisplaySettings />
    </DisplaySettingsProvider>
  );
  const themeButton = () => screen.getByRole('button', { name: /^Theme selector/ });
  const chooseTheme = (name: 'Light' | 'Dark' | 'System') => {
    fireEvent.click(themeButton());
    fireEvent.click(screen.getByRole('menuitem', { name }));
  };
  const gridSwitch = () => screen.getByRole('switch', { name: 'Show Grid:' });
  const themeClass = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  return { themeButton, chooseTheme, gridSwitch, themeClass };
}

/** Checks the defaults, then that the theme and grid can still be changed */
function expectDefaultsThatStillChange({ themeButton, chooseTheme, gridSwitch, themeClass }: ReturnType<typeof renderSettings>) {
  expect(themeButton().getAttribute('aria-label')).toBe('Theme selector (current: system)');
  expect(gridSwitch().getAttribute('aria-checked')).toBe('false');

  chooseTheme('Dark');
  expect(themeButton().getAttribute('aria-label')).toBe('Theme selector (current: dark)');
  expect(themeClass()).toBe('dark');
  chooseTheme('Light');
  expect(themeClass()).toBe('light');
  chooseTheme('System');
  expect(themeButton().getAttribute('aria-label')).toBe('Theme selector (current: system)');

  fireEvent.click(gridSwitch());
  expect(gridSwitch().getAttribute('aria-checked')).toBe('true');
  fireEvent.click(gridSwitch());
  expect(gridSwitch().getAttribute('aria-checked')).toBe('false');
}

describe('DisplaySettingsProvider with working storage', () => {
  it('starts from the saved theme and grid visibility', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('showGrid', 'true');
    const { themeButton, gridSwitch, themeClass } = renderSettings();

    expect(themeButton().getAttribute('aria-label')).toBe('Theme selector (current: dark)');
    expect(themeClass()).toBe('dark');
    expect(gridSwitch().getAttribute('aria-checked')).toBe('true');
  });

  it('ignores an invalid saved theme', () => {
    localStorage.setItem('theme', 'purple');
    const { themeButton } = renderSettings();
    expect(themeButton().getAttribute('aria-label')).toBe('Theme selector (current: system)');
  });

  it('saves theme and grid changes, and the system theme by removing the saved one', () => {
    const { chooseTheme, gridSwitch } = renderSettings();

    chooseTheme('Light');
    expect(localStorage.getItem('theme')).toBe('light');
    chooseTheme('System');
    expect(localStorage.getItem('theme')).toBeNull();
    fireEvent.click(gridSwitch());
    expect(localStorage.getItem('showGrid')).toBe('true');
  });
});

describe('DisplaySettingsProvider without usable storage', () => {
  it('uses the defaults and still changes settings when the storage itself is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(blocked);
    expectDefaultsThatStillChange(renderSettings());
  });

  it('uses the defaults and still changes settings when saved settings cannot be read', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('showGrid', 'true');
    failStorage('getItem');
    expectDefaultsThatStillChange(renderSettings());
  });

  it('keeps changes for the visit, unsaved, when settings cannot be written', () => {
    const setItem = failStorage('setItem', () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    const removeItem = failStorage('removeItem');
    const settings = renderSettings();

    expectDefaultsThatStillChange(settings);
    // Every change was attempted, and none was saved
    expect(setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(setItem).toHaveBeenCalledWith('showGrid', 'true');
    expect(removeItem).toHaveBeenCalledWith('theme');
    expect(localStorage.getItem('theme')).toBeNull();
    expect(localStorage.getItem('showGrid')).toBeNull();
  });

  it('renders the whole app, which still converts numbers, when the storage is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(blocked);
    render(
      <DisplaySettingsProvider>
        <App />
      </DisplaySettingsProvider>
    );

    expect(screen.getByRole('heading', { name: /Convert to Mayan Numerals/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Number input'), { target: { value: '123' } });
    expect(
      screen.getByRole('img', {
        name: 'Mayan numeral for 123: 2 stacked base-20 digits, highest place value at the top',
      })
    ).toBeTruthy();
  });
});
