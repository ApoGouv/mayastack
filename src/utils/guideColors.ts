/**
 * Colours of the screen-only tier guides, chosen from the viewer's background, never from the
 * glyph colour.
 *
 * Each guide has a pair of inks: a dark one, laid over light backgrounds, and a light one,
 * laid over dark backgrounds. Its opacity is the lowest that gives the composited guide a
 * target contrast ratio (WCAG 2.x relative luminance) against the background it lies on:
 * - Dividing Hairlines, which mark the tier boundaries: 3:1 (WCAG 2.1 SC 1.4.11, non-text
 *   contrast), against the background and against a resting place tier card.
 * - Place Tier Guides, a supplementary shading behind each tier: a deliberately subtle ratio,
 *   well below 3:1, so they never compete with the glyphs.
 *
 * The opacity varies continuously with the background. The only switch is between the dark and
 * the light inks, at the background luminance where black and white contrast with it equally,
 * where both inks reach their targets.
 */
import type { RgbaColor } from '@/types/colors';

/** An opaque colour, with channels from 0 to 255 (not necessarily whole numbers once composited) */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * What the viewer shows behind a numeral whose background is not opaque: the `canvas` colour
 * of the panel around it (`src/index.css`), per theme. A browser test checks these values.
 */
export const VIEWER_BACKDROP: Record<'light' | 'dark', RgbColor> = {
  light: { r: 246, g: 241, b: 231 }, // #f6f1e7
  dark: { r: 16, g: 19, b: 25 }, // #101319
};

/** The hairlines' contrast with the background and with a resting card (WCAG 2.1 SC 1.4.11) */
export const TIER_HAIRLINE_CONTRAST = 3;
/** The resting cards' contrast with the background: subtle, as supplementary shading */
export const PLACE_TIER_CARD_CONTRAST = 1.25;
/** A hovered card's contrast with the background: a little stronger than at rest */
export const PLACE_TIER_CARD_HOVER_CONTRAST = 1.5;
/** The least opacity of a hairline, as in the design reference, where its target allows less */
export const TIER_HAIRLINE_MIN_ALPHA = 0.3;

/**
 * The inks. Hairlines: a deep bronze and a pale gold, after the reference rgb(77 70 53 / 0.3),
 * darker and lighter so that 3:1 can be reached against any background. Cards: the reference
 * rgb(39 42 48) and a light neutral.
 */
export const TIER_HAIRLINE_INKS = { dark: { r: 34, g: 22, b: 0 }, light: { r: 250, g: 232, b: 180 } } as const;
export const PLACE_TIER_CARD_INKS = { dark: { r: 39, g: 42, b: 48 }, light: { r: 225, g: 226, b: 235 } } as const;

/** A hovered card's shadow, over light and dark backgrounds */
export const PLACE_TIER_CARD_HOVER_SHADOWS = {
  dark: '0 2px 6px rgba(0, 0, 0, 0.18)',
  light: '0 2px 8px rgba(0, 0, 0, 0.5)',
} as const;

const isChannel = (value: number) => Number.isFinite(value) && value >= 0 && value <= 255;
const isAlpha = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

function assertRgb(color: RgbColor, name: string): void {
  if (!isChannel(color.r) || !isChannel(color.g) || !isChannel(color.b)) {
    throw new RangeError(`Invalid ${name}: ${JSON.stringify(color)}`);
  }
}

function assertRgba(color: RgbaColor, name: string): void {
  assertRgb(color, name);
  if (!isAlpha(color.a)) throw new RangeError(`Invalid ${name}: ${JSON.stringify(color)}`);
}

// One sRGB channel (0 to 255) as linear light (0 to 1)
const linear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** The relative luminance of an opaque colour (WCAG 2.x), from 0 for black to 1 for white */
export function relativeLuminance(color: RgbColor): number {
  assertRgb(color, 'colour');
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/** The contrast ratio of two opaque colours (WCAG 2.x), from 1 to 21 */
export function contrastRatio(a: RgbColor, b: RgbColor): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** A colour composited over an opaque one ("source over"), as the browser paints it */
export function compositeOver(top: RgbaColor, bottom: RgbColor): RgbColor {
  assertRgba(top, 'colour');
  assertRgb(bottom, 'backdrop');
  const mix = (t: number, b: number) => t * top.a + b * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b) };
}

// Opacities are rounded up to whole steps of 1/255, the precision at which browsers keep a
// colour's alpha, so a guide never falls short of its target once rendered
const ALPHA_STEPS = 255;

/**
 * The lowest opacity of `ink` at which it contrasts with every colour of `against` by at least
 * `target` when laid over `over`, or 1 if none does. Contrast grows with the opacity, as the
 * ink lies beyond the backgrounds' luminance, so a bisection finds it.
 */
function lowestAlpha(ink: RgbColor, over: RgbColor, against: RgbColor[], target: number): number {
  const reaches = (a: number) => {
    const color = compositeOver({ ...ink, a }, over);
    return against.every((other) => contrastRatio(color, other) >= target);
  };
  if (!reaches(1)) return 1;
  let [low, high] = [0, 1];
  for (let i = 0; i < 30; i++) {
    const middle = (low + high) / 2;
    if (reaches(middle)) high = middle;
    else low = middle;
  }
  return Math.min(1, Math.ceil(high * ALPHA_STEPS) / ALPHA_STEPS);
}

/** The guides' colours for one background */
export interface GuideColors {
  /** The opaque colour the viewer shows behind the guides: the background over the backdrop */
  background: RgbColor;
  /** Which inks were used: dark ones over a light background, light ones over a dark one */
  tone: 'dark' | 'light';
  hairline: RgbaColor;
  card: RgbaColor;
  cardHover: RgbaColor;
  cardHoverShadow: string;
}

/**
 * The guides' colours for a viewer background, independent of the glyph colour. The same
 * background and backdrop always give the same colours.
 *
 * @param background - The numeral's background colour, which may be translucent
 * @param backdrop - What the viewer shows behind a translucent background (VIEWER_BACKDROP)
 * @throws RangeError for a channel outside 0 to 255 or an alpha outside 0 to 1
 */
export function getGuideColors(background: RgbaColor, backdrop: RgbColor): GuideColors {
  const shown = compositeOver(background, backdrop);
  const luminance = relativeLuminance(shown);
  // Dark inks where black contrasts with the background at least as much as white does
  const tone = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? 'dark' : 'light';

  const cardInk = PLACE_TIER_CARD_INKS[tone];
  const cardAlpha = lowestAlpha(cardInk, shown, [shown], PLACE_TIER_CARD_CONTRAST);
  const hoverAlpha = lowestAlpha(cardInk, shown, [shown], PLACE_TIER_CARD_HOVER_CONTRAST);
  const restingCard = compositeOver({ ...cardInk, a: cardAlpha }, shown);

  const hairlineInk = TIER_HAIRLINE_INKS[tone];
  const hairlineAlpha = Math.max(
    TIER_HAIRLINE_MIN_ALPHA,
    lowestAlpha(hairlineInk, shown, [shown, restingCard], TIER_HAIRLINE_CONTRAST)
  );

  return {
    background: shown,
    tone,
    hairline: { ...hairlineInk, a: hairlineAlpha },
    card: { ...cardInk, a: cardAlpha },
    cardHover: { ...cardInk, a: hoverAlpha },
    cardHoverShadow: PLACE_TIER_CARD_HOVER_SHADOWS[tone],
  };
}
