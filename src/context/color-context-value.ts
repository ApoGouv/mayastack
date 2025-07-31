import { createContext } from 'react';
import type { ColorContextType } from './ColorContextTypes';

export const ColorContext = createContext<ColorContextType | undefined>(
  undefined
);
