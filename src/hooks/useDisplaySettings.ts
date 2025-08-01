import { useContext } from 'react';
import { DisplaySettingsContext } from '@/context/display-settings-context-value';
import type { DisplaySettingsContextType } from '@/context/DisplaySettingsContextTypes';

/**
 * Custom hook to access the display settings
 *
 * @returns DisplaySettingsContextType
 *
 * @throws Error if used outside of a DisplaySettingsProvider
 */
export const useDisplaySettings = (): DisplaySettingsContextType => {
  const ctx = useContext(DisplaySettingsContext);
  if (!ctx) {
    throw new Error(
      'useDisplaySettings must be used within a DisplaySettingsProvider'
    );
  }
  return ctx;
};
