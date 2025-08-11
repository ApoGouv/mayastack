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
): Record<ExportSize, SizePreset> => {
  // Calculate safe aspect ratio or fallback to 1 (square)
  const safeAspectRatio =
    original.aspectRatio && original.aspectRatio > 0 ? original.aspectRatio : 1;

  return {
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
        height: Math.round(600 / safeAspectRatio),
      }),
    },
    medium: {
      label: 'Medium',
      getDimensions: () => ({
        width: 1200,
        height: Math.round(1200 / safeAspectRatio),
      }),
    },
    large: {
      label: 'Large',
      getDimensions: () => ({
        width: 2400,
        height: Math.round(2400 / safeAspectRatio),
      }),
    },
    custom: {
      label: 'Custom Size',
      getDimensions: () => ({
        width: customWidth,
        height: customHeight,
      }),
    },
  };
};
