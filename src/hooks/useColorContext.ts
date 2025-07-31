import { useContext } from 'react';
import { ColorContext } from '@context/color-context-value';
import type { ColorContextType } from '@context/ColorContextTypes';

/**
 * Custom hook to access the ColorContext
 *
 * @returns ColorContextType
 *
 * @throws Error if used outside of a ColorProvider
 */
export const useColorContext = (): ColorContextType => {
  const ctx = useContext(ColorContext);
  if (!ctx) {
    throw new Error('useColorContext must be used within a ColorProvider');
  }
  return ctx;
};
