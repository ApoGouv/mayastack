import type { RgbaColor } from '@/types/colors';

export function rgbaToCss({ r, g, b, a }: RgbaColor): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** The fields of a stored colour: exactly these, no more and no fewer */
const RGBA_FIELDS = ['r', 'g', 'b', 'a'] as const;

const isChannel = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255;

const isAlpha = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

/**
 * Writes a colour as stored: JSON with its four fields, e.g. {"r":255,"g":255,"b":255,"a":1}
 */
export function serializeRgbaColor({ r, g, b, a }: RgbaColor): string {
  return JSON.stringify({ r, g, b, a });
}

/**
 * Reads a stored colour, or returns null if it is not exactly a valid one: JSON for an object
 * with only the fields r, g and b, integers from 0 to 255, and a, a number from 0 to 1, as the
 * colour picker produces. Anything else is rejected rather than clamped or rounded.
 *
 * @param stored - The stored text, or null if nothing is stored
 */
export function parseRgbaColor(stored: string | null): RgbaColor | null {
  if (stored === null) return null;

  let value: unknown;
  try {
    // A number too large for a double, such as 1e999, is parsed as Infinity and rejected below
    value = JSON.parse(stored);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const fields = Object.keys(value);
  if (fields.length !== RGBA_FIELDS.length || !RGBA_FIELDS.every((field) => fields.includes(field))) {
    return null;
  }

  const { r, g, b, a } = value as Record<string, unknown>;
  if (!isChannel(r) || !isChannel(g) || !isChannel(b) || !isAlpha(a)) return null;
  return { r, g, b, a };
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
