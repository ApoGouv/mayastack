import type { RgbaColor, ColorTheme } from '@/types/colors';

/**
 * Describes the shape of the ColorContext, including current
 * background and glyph colors, along with their setters.
 */
export interface ColorContextType {
  backgroundColor: RgbaColor;
  setBackgroundColor: (color: RgbaColor) => void;
  glyphColor: RgbaColor;
  setGlyphColor: (color: RgbaColor) => void;
  theme: ColorTheme;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: ColorTheme) => void;
}
