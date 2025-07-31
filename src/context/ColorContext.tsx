import React, { useState, useEffect, useMemo } from 'react';
import { ColorContext } from '@context/color-context-value';
import type { RgbaColor, ColorTheme } from '@/types/colors';

// Default color values
const defaultBackgroundColor: RgbaColor = { r: 255, g: 255, b: 255, a: 1 }; // white
const defaultGlyphColor: RgbaColor = { r: 0, g: 0, b: 0, a: 1 }; // black

/**
 * Provides shared color state for background and glyph colors
 * to the rest of the application via React Context.
 */
export const ColorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ColorTheme>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  const [backgroundColor, setBackgroundColor] = useState<RgbaColor>(
    defaultBackgroundColor
  );
  const [glyphColor, setGlyphColor] = useState<RgbaColor>(defaultGlyphColor);

  // Get system preference and watch for changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ColorTheme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

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

    if (theme !== 'system') {
      localStorage.setItem('theme', theme);
    } else {
      localStorage.removeItem('theme');
    }
  }, [theme, resolvedTheme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <ColorContext.Provider
      value={{
        backgroundColor,
        setBackgroundColor,
        glyphColor,
        setGlyphColor,
        theme,
        resolvedTheme,
        toggleTheme,
        setTheme
      }}
    >
      {children}
    </ColorContext.Provider>
  );
};
