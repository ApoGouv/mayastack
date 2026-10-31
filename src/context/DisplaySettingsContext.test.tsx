// @vitest-environment happy-dom
import { StrictMode, useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import DisplaySettings from '@components/DisplaySettings';
import { ThemeSelector } from '@components/ThemeSelector';
import { useDisplaySettings } from '@/hooks/useDisplaySettings';
import type { RgbaColor } from '@/types/colors';
import type { DisplaySettingsContextType } from './DisplaySettingsContextTypes';
import { DisplaySettingsProvider } from './DisplaySettingsContext';

// The keys are written out here rather than imported, so a changed key fails these tests
const THEME_KEY = 'mayastack:theme';
const SHOW_GRID_KEY = 'mayastack:showGrid';
const BACKGROUND_COLOR_KEY = 'mayastack:backgroundColor';
const GLYPH_COLOR_KEY = 'mayastack:glyphColor';
const SHOW_TIER_GUIDES_KEY = 'mayastack:showTierGuides';

const DEFAULT_BACKGROUND: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const DEFAULT_GLYPH: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

/**
 * Records every write to storage, in order, while still making it: a value saved, or null for
 * a value removed. Returns the writes under a key, or all of them as [key, value] without one.
 * Call it once per test: a second spy on happy-dom's storage wraps the first, which then
 * records nothing.
 */
function watchWrites() {
  const setItem = vi.spyOn(localStorage, 'setItem');
  const removeItem = vi.spyOn(localStorage, 'removeItem');
  storageSpies.push(setItem, removeItem);

  // Both spies' calls, in the order they were made
  const all = (): [string, string | null][] =>
    [
      ...setItem.mock.calls.map(([key, value], i) => ({ order: setItem.mock.invocationCallOrder[i], key, value })),
      ...removeItem.mock.calls.map(([key], i) => ({ order: removeItem.mock.invocationCallOrder[i], key, value: null })),
    ]
      .sort((a, b) => a.order - b.order)
      .map(({ key, value }) => [key, value]);

  const writes = (key: string) => all().filter(([k]) => k === key).map(([, value]) => value);
  return Object.assign(writes, { all });
}

/**
 * Stands in for the OS colour-scheme query, starting light. Returns a function that changes
 * the scheme and tells the provider, as an OS change does.
 */
function fakeSystemScheme() {
  const listeners = new Set<() => void>();
  const query = {
    matches: false,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(query as unknown as MediaQueryList);
  return (dark: boolean) => {
    query.matches = dark;
    act(() => listeners.forEach((listener) => listener()));
  };
}

/** Hands the settings, as components get them, to a test after every render */
function SettingsProbe({ onSettings }: { onSettings: (settings: DisplaySettingsContextType) => void }) {
  const settings = useDisplaySettings();
  useEffect(() => onSettings(settings));
  return null;
}

/**
 * Renders the provider with a probe, optionally in Strict Mode (which, in development, runs
 * effects twice on mount), and returns the latest settings and the render result
 */
function renderProbe({ strict = false } = {}) {
  const latest: { settings?: DisplaySettingsContextType } = {};
  const provider = (
    <DisplaySettingsProvider>
      <SettingsProbe onSettings={(settings) => { latest.settings = settings; }} />
    </DisplaySettingsProvider>
  );
  const result = render(strict ? <StrictMode>{provider}</StrictMode> : provider);
  return { ...result, settings: () => latest.settings! };
}

const stored = (key: string) => localStorage.getItem(key);
const storedColor = (key: string) => {
  const value = stored(key);
  return value === null ? null : JSON.parse(value);
};

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
  it.each([false, true])('saves nothing on mount with the defaults (Strict Mode: %s)', (strict) => {
    const writes = watchWrites();
    const { settings, unmount } = renderProbe({ strict });

    expect(settings().theme).toBe('system');
    expect(settings().showGrid).toBe(false);
    expect(settings().showTierGuides).toBe(false);
    unmount();
    expect(writes.all()).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it.each([false, true])('does not save the saved settings again on mount (Strict Mode: %s)', (strict) => {
    localStorage.setItem(THEME_KEY, 'dark');
    localStorage.setItem(SHOW_GRID_KEY, 'true');
    localStorage.setItem(SHOW_TIER_GUIDES_KEY, 'true');
    localStorage.setItem(BACKGROUND_COLOR_KEY, '{"r":10,"g":20,"b":30,"a":0.4}');
    localStorage.setItem(GLYPH_COLOR_KEY, '{"r":200,"g":100,"b":0,"a":0}');
    const writes = watchWrites();
    const { settings, unmount } = renderProbe({ strict });

    expect(settings().theme).toBe('dark');
    expect(settings().showGrid).toBe(true);
    expect(settings().showTierGuides).toBe(true);
    unmount();
    expect(writes.all()).toEqual([]);
  });

  it('starts from the saved theme and grid visibility', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    localStorage.setItem(SHOW_GRID_KEY, 'true');
    const { themeButton, gridSwitch, themeClass } = renderSettings();

    expect(themeButton().getAttribute('aria-label')).toBe('Theme selector (current: dark)');
    expect(themeClass()).toBe('dark');
    expect(gridSwitch().getAttribute('aria-checked')).toBe('true');
  });

  it('ignores an invalid saved theme', () => {
    localStorage.setItem(THEME_KEY, 'purple');
    const { themeButton } = renderSettings();
    expect(themeButton().getAttribute('aria-label')).toBe('Theme selector (current: system)');
  });

  it.each(['yes', 'TRUE', '1', ''])('ignores an invalid saved grid visibility (%j)', (value) => {
    localStorage.setItem(SHOW_GRID_KEY, value);
    const { gridSwitch } = renderSettings();
    expect(gridSwitch().getAttribute('aria-checked')).toBe('false');
  });

  it('saves theme and grid changes, and the system theme by removing the saved one', () => {
    const { chooseTheme, gridSwitch } = renderSettings();

    chooseTheme('Light');
    expect(stored(THEME_KEY)).toBe('light');
    chooseTheme('Dark');
    expect(stored(THEME_KEY)).toBe('dark');
    chooseTheme('System');
    expect(stored(THEME_KEY)).toBeNull();
    fireEvent.click(gridSwitch());
    expect(stored(SHOW_GRID_KEY)).toBe('true');
    fireEvent.click(gridSwitch());
    expect(stored(SHOW_GRID_KEY)).toBe('false');
  });

  it('saves each change exactly once, and nothing on mount, in Strict Mode too', () => {
    const writes = watchWrites();
    const { settings } = renderProbe({ strict: true });
    expect(writes.all()).toEqual([]);

    act(() => settings().setTheme('dark'));
    act(() => settings().toggleTheme());
    act(() => settings().setShowGrid(true));
    act(() => settings().setShowTierGuides(true));
    act(() => settings().setShowTierGuides(false));
    expect(writes.all()).toEqual([
      [THEME_KEY, 'dark'],
      [THEME_KEY, null],
      [SHOW_GRID_KEY, 'true'],
      [SHOW_TIER_GUIDES_KEY, 'true'],
      [SHOW_TIER_GUIDES_KEY, 'false'],
    ]);
  });

  it('saves nothing when the OS colour scheme changes under the system theme', () => {
    const setSystemDark = fakeSystemScheme();
    const writes = watchWrites();
    const { settings } = renderProbe();
    expect(settings().resolvedTheme).toBe('light');

    setSystemDark(true);
    expect(settings().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setSystemDark(false);
    expect(settings().resolvedTheme).toBe('light');
    expect(writes.all()).toEqual([]);

    // A theme chosen afterwards is still saved
    act(() => settings().setTheme('dark'));
    expect(writes.all()).toEqual([[THEME_KEY, 'dark']]);
  });

  it('ignores the unprefixed keys used before, and leaves them as they are', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('showGrid', 'true');
    const writes = watchWrites();
    const { themeButton, gridSwitch, themeClass, chooseTheme } = renderSettings();

    expect(themeButton().getAttribute('aria-label')).toBe('Theme selector (current: system)');
    expect(themeClass()).toBe('light');
    expect(gridSwitch().getAttribute('aria-checked')).toBe('false');
    expect(writes.all()).toEqual([]);

    // Changes are saved under the new keys only: the old ones are neither read, moved nor removed
    chooseTheme('Light');
    fireEvent.click(gridSwitch());
    expect(stored(THEME_KEY)).toBe('light');
    expect(stored(SHOW_GRID_KEY)).toBe('true');
    expect(stored('theme')).toBe('dark');
    expect(stored('showGrid')).toBe('true');
  });
});

describe('DisplaySettingsProvider colours', () => {
  it('starts from the default colours, and saves nothing until they change', () => {
    const writes = watchWrites();
    const { settings, unmount } = renderProbe();

    expect(settings().backgroundColor).toEqual(DEFAULT_BACKGROUND);
    expect(settings().glyphColor).toEqual(DEFAULT_GLYPH);
    unmount();
    expect(writes(BACKGROUND_COLOR_KEY)).toEqual([]);
    expect(writes(GLYPH_COLOR_KEY)).toEqual([]);
  });

  it('starts from the saved colours, alpha included', () => {
    localStorage.setItem(BACKGROUND_COLOR_KEY, '{"r":10,"g":20,"b":30,"a":0.4}');
    localStorage.setItem(GLYPH_COLOR_KEY, '{"r":200,"g":100,"b":0,"a":0}');
    const { settings } = renderProbe();

    expect(settings().backgroundColor).toEqual({ r: 10, g: 20, b: 30, a: 0.4 });
    expect(settings().glyphColor).toEqual({ r: 200, g: 100, b: 0, a: 0 });
  });

  it.each([
    ['malformed JSON', '{"r":10'],
    ['a missing field', '{"r":10,"g":20,"b":30}'],
    ['an unexpected field', '{"r":10,"g":20,"b":30,"a":1,"x":0}'],
    ['an out-of-range channel', '{"r":300,"g":20,"b":30,"a":1}'],
    ['an out-of-range alpha', '{"r":10,"g":20,"b":30,"a":2}'],
    ['a non-finite value', '{"r":10,"g":20,"b":30,"a":1e999}'],
    ['a CSS colour', 'rgba(10, 20, 30, 1)'],
  ])('uses the default colours instead of %s, and the other settings still load', (_name, value) => {
    localStorage.setItem(BACKGROUND_COLOR_KEY, value);
    localStorage.setItem(GLYPH_COLOR_KEY, value);
    localStorage.setItem(THEME_KEY, 'dark');
    localStorage.setItem(SHOW_GRID_KEY, 'true');
    const { settings } = renderProbe();

    expect(settings().backgroundColor).toEqual(DEFAULT_BACKGROUND);
    expect(settings().glyphColor).toEqual(DEFAULT_GLYPH);
    expect(settings().theme).toBe('dark');
    expect(settings().showGrid).toBe(true);
  });

  it('applies each change at once, and saves only the latest colour of each, 300 ms after the last change', () => {
    vi.useFakeTimers();
    const writes = watchWrites();
    const backgroundWrites = () => writes(BACKGROUND_COLOR_KEY);
    const glyphWrites = () => writes(GLYPH_COLOR_KEY);
    const { settings } = renderProbe();

    // As while dragging a picker: many changes in quick succession
    for (let r = 1; r <= 5; r++) {
      act(() => settings().setBackgroundColor({ r, g: 0, b: 0, a: 1 }));
      expect(settings().backgroundColor).toEqual({ r, g: 0, b: 0, a: 1 });
      act(() => vi.advanceTimersByTime(100));
    }
    act(() => settings().setGlyphColor({ r: 9, g: 8, b: 7, a: 0.65 }));

    // Each change restarts the delay
    act(() => vi.advanceTimersByTime(299));
    expect(backgroundWrites()).toEqual([]);
    expect(glyphWrites()).toEqual([]);

    act(() => vi.advanceTimersByTime(1));
    expect(backgroundWrites()).toEqual(['{"r":5,"g":0,"b":0,"a":1}']);
    expect(glyphWrites()).toEqual(['{"r":9,"g":8,"b":7,"a":0.65}']);

    // Nothing more is saved later
    act(() => vi.advanceTimersByTime(1000));
    expect(backgroundWrites()).toHaveLength(1);
    expect(glyphWrites()).toHaveLength(1);
  });

  it('saves the latest colours at once when the provider unmounts, and not again later', () => {
    vi.useFakeTimers();
    const writes = watchWrites();
    const { settings, unmount } = renderProbe();

    act(() => settings().setBackgroundColor({ r: 1, g: 2, b: 3, a: 1 }));
    act(() => settings().setBackgroundColor({ r: 4, g: 5, b: 6, a: 0.5 }));
    act(() => settings().setGlyphColor({ r: 7, g: 8, b: 9, a: 0.25 }));
    act(() => vi.advanceTimersByTime(50));
    unmount();

    expect(storedColor(BACKGROUND_COLOR_KEY)).toEqual({ r: 4, g: 5, b: 6, a: 0.5 });
    expect(storedColor(GLYPH_COLOR_KEY)).toEqual({ r: 7, g: 8, b: 9, a: 0.25 });
    vi.advanceTimersByTime(1000);
    expect(writes(BACKGROUND_COLOR_KEY)).toEqual(['{"r":4,"g":5,"b":6,"a":0.5}']);
  });

  it('saves the latest colour at once when the page is left (pagehide)', () => {
    vi.useFakeTimers();
    const { settings } = renderProbe();

    act(() => settings().setGlyphColor({ r: 1, g: 2, b: 3, a: 0.3 }));
    expect(stored(GLYPH_COLOR_KEY)).toBeNull();
    window.dispatchEvent(new Event('pagehide'));
    expect(storedColor(GLYPH_COLOR_KEY)).toEqual({ r: 1, g: 2, b: 3, a: 0.3 });
  });

  it('saves the latest colour at once when the page is hidden, but not when it is shown', () => {
    vi.useFakeTimers();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { settings } = renderProbe();

    act(() => settings().setBackgroundColor({ r: 1, g: 2, b: 3, a: 1 }));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(stored(BACKGROUND_COLOR_KEY)).toBeNull();

    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(storedColor(BACKGROUND_COLOR_KEY)).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it('restores saved colours after the provider mounts again', () => {
    const first = renderProbe();
    act(() => first.settings().setBackgroundColor({ r: 11, g: 22, b: 33, a: 0.44 }));
    act(() => first.settings().setGlyphColor({ r: 55, g: 66, b: 77, a: 0.88 }));
    first.unmount();

    const second = renderProbe();
    expect(second.settings().backgroundColor).toEqual({ r: 11, g: 22, b: 33, a: 0.44 });
    expect(second.settings().glyphColor).toEqual({ r: 55, g: 66, b: 77, a: 0.88 });
  });

  it('saves a colour chosen with the colour picker, alpha included', () => {
    vi.useFakeTimers();
    render(
      <DisplaySettingsProvider>
        <DisplaySettings />
      </DisplaySettingsProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Glyph color:' }));
    // react-colorful moves its sliders with the arrow keys: right (39) and left (37)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Color' }), { keyCode: 39 });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Alpha' }), { keyCode: 37 });
    expect(stored(GLYPH_COLOR_KEY)).toBeNull();

    act(() => vi.advanceTimersByTime(300));
    const saved = storedColor(GLYPH_COLOR_KEY);
    expect(saved.a).toBe(0.95);
    expect(Object.keys(saved).sort()).toEqual(['a', 'b', 'g', 'r']);
    expect(stored(BACKGROUND_COLOR_KEY)).toBeNull();
  });
});

describe('DisplaySettingsProvider tier guide visibility', () => {
  it('is off by default, and offered to components without any control of its own', () => {
    const { settings } = renderProbe();
    expect(settings().showTierGuides).toBe(false);

    cleanup();
    render(
      <DisplaySettingsProvider>
        <App />
      </DisplaySettingsProvider>
    );
    expect(screen.queryByRole('switch', { name: /tier guides/i })).toBeNull();
  });

  it('starts from the saved value, and ignores invalid ones', () => {
    localStorage.setItem(SHOW_TIER_GUIDES_KEY, 'true');
    expect(renderProbe().settings().showTierGuides).toBe(true);
    cleanup();

    localStorage.setItem(SHOW_TIER_GUIDES_KEY, 'on');
    expect(renderProbe().settings().showTierGuides).toBe(false);
  });

  it('saves changes under its own key, independently of the grid', () => {
    const { settings } = renderProbe();

    act(() => settings().setShowTierGuides(true));
    expect(settings().showTierGuides).toBe(true);
    expect(settings().showGrid).toBe(false);
    expect(stored(SHOW_TIER_GUIDES_KEY)).toBe('true');
    expect(stored(SHOW_GRID_KEY)).toBeNull();

    act(() => settings().setShowTierGuides(false));
    expect(stored(SHOW_TIER_GUIDES_KEY)).toBe('false');
  });
});

describe('DisplaySettingsProvider without usable storage', () => {
  it('uses the defaults and still changes settings when the storage itself is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(blocked);
    expectDefaultsThatStillChange(renderSettings());
  });

  it('uses the defaults and still changes settings when saved settings cannot be read', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    localStorage.setItem(SHOW_GRID_KEY, 'true');
    localStorage.setItem(BACKGROUND_COLOR_KEY, '{"r":1,"g":2,"b":3,"a":1}');
    localStorage.setItem(SHOW_TIER_GUIDES_KEY, 'true');
    failStorage('getItem');
    expectDefaultsThatStillChange(renderSettings());
    cleanup();

    const { settings } = renderProbe();
    expect(settings().backgroundColor).toEqual(DEFAULT_BACKGROUND);
    expect(settings().showTierGuides).toBe(false);
  });

  it('keeps colour and tier guide changes for the visit when the storage itself is blocked', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(blocked);
    const { settings, unmount } = renderProbe();

    act(() => settings().setGlyphColor({ r: 1, g: 2, b: 3, a: 0.5 }));
    act(() => settings().setShowTierGuides(true));
    expect(settings().glyphColor).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
    expect(settings().showTierGuides).toBe(true);
    // The delayed save, a page-lifecycle save and the save on unmount all fail quietly
    act(() => vi.advanceTimersByTime(300));
    act(() => settings().setGlyphColor({ r: 4, g: 5, b: 6, a: 1 }));
    window.dispatchEvent(new Event('pagehide'));
    expect(() => unmount()).not.toThrow();
  });

  it('keeps changes for the visit, unsaved, when settings cannot be written', () => {
    const setItem = failStorage('setItem', () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    const removeItem = failStorage('removeItem');
    const settings = renderSettings();

    expectDefaultsThatStillChange(settings);
    // Every change was attempted, and none was saved
    expect(setItem).toHaveBeenCalledWith(THEME_KEY, 'dark');
    expect(setItem).toHaveBeenCalledWith(SHOW_GRID_KEY, 'true');
    expect(removeItem).toHaveBeenCalledWith(THEME_KEY);
    expect(stored(THEME_KEY)).toBeNull();
    expect(stored(SHOW_GRID_KEY)).toBeNull();

    // A colour change is attempted when it is due, and fails quietly too
    cleanup();
    const probe = renderProbe();
    act(() => probe.settings().setBackgroundColor({ r: 1, g: 2, b: 3, a: 1 }));
    expect(probe.settings().backgroundColor).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    probe.unmount();
    expect(setItem).toHaveBeenCalledWith(BACKGROUND_COLOR_KEY, '{"r":1,"g":2,"b":3,"a":1}');
    expect(stored(BACKGROUND_COLOR_KEY)).toBeNull();
  });

  it('renders the whole app, which still converts numbers, when the storage is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(blocked);
    render(
      <DisplaySettingsProvider>
        <App />
      </DisplaySettingsProvider>
    );

    expect(screen.getByRole('heading', { name: /Convert to Mayan Numerals/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Decimal integer'), { target: { value: '123' } });
    expect(
      screen.getByRole('img', {
        name: 'Mayan numeral for 123: 2 stacked base-20 digits, highest place value at the top',
      })
    ).toBeTruthy();
  });
});
