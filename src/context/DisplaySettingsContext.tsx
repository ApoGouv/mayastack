import React, { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from 'react';
import { DisplaySettingsContext } from '@/context/display-settings-context-value';
import type { RgbaColor, ColorTheme } from '@/types/colors';
import { parseRgbaColor, serializeRgbaColor } from '@utils/colors';

const THEMES: ColorTheme[] = ['light', 'dark', 'system'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

// Each preference has its own key. The prefix keeps them apart from other sites on the same
// origin (apogouv.github.io). The unprefixed keys used before ('theme', 'showGrid') are ignored.
// index.html reads the theme key too, to apply the theme before the first paint.
const THEME_KEY = 'mayastack:theme';
const SHOW_GRID_KEY = 'mayastack:showGrid';
const BACKGROUND_COLOR_KEY = 'mayastack:backgroundColor';
const GLYPH_COLOR_KEY = 'mayastack:glyphColor';
const SHOW_TIER_GUIDES_KEY = 'mayastack:showTierGuides';

// Colours change continuously while a picker is dragged, so a colour is saved only once it
// has stayed the same this long (ms)
const COLOR_SAVE_DELAY_MS = 300;

// Browser storage may be unavailable: when a browser blocks site data, even reading
// `localStorage` throws, and a write can also fail (e.g. when storage is full). Settings are
// then not saved: they start from their defaults and still change for the current visit.

// A saved setting, or null if there is none or storage can't be read
const readStored = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Saves a setting, or removes it for null; if storage can't be written, it is simply not saved
const writeStored = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Not saved: the setting still applies until the page is reloaded
  }
};

// Read the saved theme once, on first render (ignore invalid values)
const readSavedTheme = (): ColorTheme => {
  const saved = readStored(THEME_KEY) as ColorTheme | null;
  return saved && THEMES.includes(saved) ? saved : 'system';
};

// Read a saved on/off setting once, on first render: 'true' or 'false', otherwise the default
const readSavedBoolean = (key: string, fallback: boolean): boolean => {
  const saved = readStored(key);
  return saved === 'true' ? true : saved === 'false' ? false : fallback;
};

// Read a saved colour once, on first render: only a valid one, otherwise the default
const readSavedColor = (key: string, fallback: RgbaColor): RgbaColor =>
  parseRgbaColor(readStored(key)) ?? fallback;

// The system theme is the default, so it is saved by removing any saved theme
const saveTheme = (theme: ColorTheme) => writeStored(THEME_KEY, theme !== 'system' ? theme : null);
const saveShowGrid = (show: boolean) => writeStored(SHOW_GRID_KEY, String(show));
const saveShowTierGuides = (show: boolean) => writeStored(SHOW_TIER_GUIDES_KEY, String(show));

// Saves a setting each time it changes, but not on first render: a setting is saved when it
// is changed, not just because the app was opened. The ref holds the value last started from
// or saved, so React Strict Mode running the effect twice on mount saves nothing either.
const useSaveOnChange = <T,>(value: T, save: (value: T) => void) => {
  const savedValue = useRef(value);
  useEffect(() => {
    if (Object.is(value, savedValue.current)) return;
    savedValue.current = value;
    save(value);
  }, [value, save]);
};

// Subscribe to OS dark-mode changes (used by useSyncExternalStore)
const subscribeToSystemTheme = (onChange: () => void) => {
  const mediaQuery = window.matchMedia(DARK_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
};

const getSystemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

// Default color values
const defaultBackgroundColor: RgbaColor = { r: 255, g: 255, b: 255, a: 1 }; // white
const defaultGlyphColor: RgbaColor = { r: 0, g: 0, b: 0, a: 1 }; // black
const defaultShowGrid = false; // Hide grid by default
const defaultShowTierGuides = false; // Hide tier guides by default

/**
 * Provides shared display settings state to the application via React Context.
 * Includes color themes, color settings, and other display preferences.
 */
export const DisplaySettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ColorTheme>(readSavedTheme);

  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemPrefersDark
  );

  const [backgroundColor, setBackgroundColorState] = useState<RgbaColor>(() =>
    readSavedColor(BACKGROUND_COLOR_KEY, defaultBackgroundColor)
  );
  const [glyphColor, setGlyphColorState] = useState<RgbaColor>(() =>
    readSavedColor(GLYPH_COLOR_KEY, defaultGlyphColor)
  );

  const [showGrid, setShowGrid] = useState<boolean>(() =>
    readSavedBoolean(SHOW_GRID_KEY, defaultShowGrid)
  );
  const [showTierGuides, setShowTierGuides] = useState<boolean>(() =>
    readSavedBoolean(SHOW_TIER_GUIDES_KEY, defaultShowTierGuides)
  );

  // Colours waiting to be saved, by key (the latest value of each), and the timer that saves them
  const pendingColors = useRef(new Map<string, string>());
  const colorSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saves every waiting colour now
  const saveColors = useCallback(() => {
    if (colorSaveTimer.current !== null) {
      clearTimeout(colorSaveTimer.current);
      colorSaveTimer.current = null;
    }
    pendingColors.current.forEach((value, key) => writeStored(key, value));
    pendingColors.current.clear();
  }, []);

  // Saves a colour once it has stayed the same for COLOR_SAVE_DELAY_MS
  const saveColorSoon = useCallback(
    (key: string, color: RgbaColor) => {
      pendingColors.current.set(key, serializeRgbaColor(color));
      if (colorSaveTimer.current !== null) clearTimeout(colorSaveTimer.current);
      colorSaveTimer.current = setTimeout(saveColors, COLOR_SAVE_DELAY_MS);
    },
    [saveColors]
  );

  // A waiting colour is saved at once when the page is hidden or left, and when the provider
  // unmounts, so the latest choice is never lost to the delay
  useEffect(() => {
    const saveIfHidden = () => {
      if (document.visibilityState === 'hidden') saveColors();
    };
    window.addEventListener('pagehide', saveColors);
    document.addEventListener('visibilitychange', saveIfHidden);
    return () => {
      window.removeEventListener('pagehide', saveColors);
      document.removeEventListener('visibilitychange', saveIfHidden);
      saveColors();
    };
  }, [saveColors]);

  const setBackgroundColor = useCallback(
    (color: RgbaColor) => {
      setBackgroundColorState(color);
      saveColorSoon(BACKGROUND_COLOR_KEY, color);
    },
    [saveColorSoon]
  );

  const setGlyphColor = useCallback(
    (color: RgbaColor) => {
      setGlyphColorState(color);
      saveColorSoon(GLYPH_COLOR_KEY, color);
    },
    [saveColorSoon]
  );

  // Calculate resolved theme (actual theme being used)
  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemPrefersDark]);

  // Apply theme class to document root
  useEffect(() => {
    const html = document.documentElement;
    // Remove all theme classes first
    html.classList.remove('light', 'dark');

    // Add the current resolved theme class
    html.classList.add(resolvedTheme);

    // Also add a class indicating if we're using system preference
    html.classList.toggle('using-system', theme === 'system');
  }, [theme, resolvedTheme]);

  // Persist the chosen theme, grid and tier guide visibility when they change. The theme saved
  // is the one chosen, so an OS colour-scheme change under the system theme saves nothing.
  useSaveOnChange(theme, saveTheme);
  useSaveOnChange(showGrid, saveShowGrid);
  useSaveOnChange(showTierGuides, saveShowTierGuides);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <DisplaySettingsContext.Provider
      value={{
        backgroundColor,
        setBackgroundColor,
        glyphColor,
        setGlyphColor,
        theme,
        resolvedTheme,
        toggleTheme,
        setTheme,
        showGrid,
        setShowGrid,
        showTierGuides,
        setShowTierGuides
      }}
    >
      {children}
    </DisplaySettingsContext.Provider>
  );
};
