// src/utils/exportPresets.ts
import type { Dimensions, ExportSize } from '@/types/exportTypes';

export interface SizePreset {
  label: string;
  getDimensions: () => { width: number; height: number };
}

export const getSizePresets = (
  original: Dimensions,
  customWidth: number,
  customHeight: number
): Record<ExportSize, SizePreset> => ({
  original: {
    label: 'Original Size',
    getDimensions: () => ({
      width: original.width,
      height: original.height,
    }),
  },
  small: {
    label: 'Small',
    getDimensions: () => ({
      width: 600,
      height: Math.round(600 / original.aspectRatio),
    }),
  },
  medium: {
    label: 'Medium',
    getDimensions: () => ({
      width: 1200,
      height: Math.round(1200 / original.aspectRatio),
    }),
  },
  large: {
    label: 'Large',
    getDimensions: () => ({
      width: 2400,
      height: Math.round(2400 / original.aspectRatio),
    }),
  },
  custom: {
    label: 'Custom Size',
    getDimensions: () => ({
      width: customWidth,
      height: customHeight,
    }),
  },
});
