import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { DisplaySettingsContext } from '@/context/display-settings-context-value';
import type { RgbaColor, ColorTheme } from '@/types/colors';

const THEMES: ColorTheme[] = ['light', 'dark', 'system'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

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
  const saved = readStored('theme') as ColorTheme | null;
  return saved && THEMES.includes(saved) ? saved : 'system';
};

// Read the saved grid visibility once, on first render
const readSavedShowGrid = (): boolean => {
  const saved = readStored('showGrid');
  return saved === null ? defaultShowGrid : saved === 'true';
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

  const [backgroundColor, setBackgroundColor] = useState<RgbaColor>(
    defaultBackgroundColor
  );
  const [glyphColor, setGlyphColor] = useState<RgbaColor>(defaultGlyphColor);

  const [showGrid, setShowGrid] = useState<boolean>(readSavedShowGrid);

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

    // The system theme is the default, so it is saved by removing any saved theme
    writeStored('theme', theme !== 'system' ? theme : null);
  }, [theme, resolvedTheme]);

  // Persist grid visibility setting
  useEffect(() => {
    writeStored('showGrid', String(showGrid));
  }, [showGrid]);

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
        setShowGrid
      }}
    >
      {children}
    </DisplaySettingsContext.Provider>
  );
};
