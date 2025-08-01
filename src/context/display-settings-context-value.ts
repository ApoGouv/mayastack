import { createContext } from 'react';
import type { DisplaySettingsContextType } from './DisplaySettingsContextTypes';

export const DisplaySettingsContext = createContext<
  DisplaySettingsContextType | undefined
>(undefined);
