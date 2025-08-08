import type { RgbaColor } from '@/types/colors';

export function rgbaToCss({ r, g, b, a }: RgbaColor): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function getReadableTextColor({ r, g, b, a }: RgbaColor): string {
  if (a === 0) return '#000'; // Transparent → black text by default

  // Normalize RGB to [0,1]
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  // Luminance formula
  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

  // Contrast with white and black
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;

  return contrastWithWhite > contrastWithBlack ? '#fff' : '#000';
}
