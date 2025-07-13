import React, { createContext, useContext, useState } from "react";

import type { RgbaColor } from "@/types/colors";

/**
 * Describes the shape of the ColorContext, including current
 * background and glyph colors, along with their setters.
 */
export interface ColorContextType {
  backgroundColor: RgbaColor;
  setBackgroundColor: (color: RgbaColor) => void;
  glyphColor: RgbaColor;
  setGlyphColor: (color: RgbaColor) => void;
}

// Default color values
const defaultBackgroundColor: RgbaColor = { r: 255, g: 255, b: 255, a: 1 }; // white
const defaultGlyphColor: RgbaColor = { r: 0, g: 0, b: 0, a: 1 }; // black

// Create the context with initial undefined (to ensure it's used within a provider)
const ColorContext = createContext<ColorContextType | undefined>(undefined);

/**
 * Provides shared color state for background and glyph colors
 * to the rest of the application via React Context.
 */
export const ColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [backgroundColor, setBackgroundColor] = useState<RgbaColor>(defaultBackgroundColor);
  const [glyphColor, setGlyphColor] = useState<RgbaColor>(defaultGlyphColor);

  return (
    <ColorContext.Provider value={{ backgroundColor, setBackgroundColor, glyphColor, setGlyphColor }}>
      {children}
    </ColorContext.Provider>
  );
};

/**
 * Custom hook to access the ColorContext.
 * Throws an error if used outside of a ColorProvider.
 */
export const useColorContext = (): ColorContextType => {
  const ctx = useContext(ColorContext);
  if (!ctx) throw new Error("useColorContext must be used within a ColorProvider");
  return ctx;
};