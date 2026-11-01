import { describe, expect, it } from 'vitest';
import type { RgbaColor } from '@/types/colors';
import {
  compositeOver,
  contrastRatio,
  getGuideColors,
  PLACE_TIER_CARD_CONTRAST,
  PLACE_TIER_CARD_HOVER_CONTRAST,
  PLACE_TIER_CARD_INKS,
  relativeLuminance,
  TIER_HAIRLINE_CONTRAST,
  TIER_HAIRLINE_INKS,
  TIER_HAIRLINE_MIN_ALPHA,
  VIEWER_BACKDROP,
  type RgbColor,
} from './guideColors';

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };
const opaque = (c: RgbColor): RgbaColor => ({ ...c, a: 1 });
const grey = (v: number): RgbaColor => ({ r: v, g: v, b: v, a: 1 });

/** The contrasts the guides reach, composited over the background the viewer shows */
function contrasts(background: RgbaColor, backdrop: RgbColor = VIEWER_BACKDROP.light) {
  const colors = getGuideColors(background, backdrop);
  const shown = colors.background;
  const card = compositeOver(colors.card, shown);
  const hover = compositeOver(colors.cardHover, shown);
  const line = compositeOver(colors.hairline, shown);
  return {
    colors,
    line: contrastRatio(line, shown),
    lineOnCard: contrastRatio(line, card),
    card: contrastRatio(card, shown),
    hover: contrastRatio(hover, shown),
  };
}

describe('relativeLuminance and contrastRatio', () => {
  it('follow WCAG 2.x', () => {
    expect(relativeLuminance(BLACK)).toBe(0);
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 12);
    // #777777 and #767676, either side of 4.5:1 on white
    expect(relativeLuminance({ r: 119, g: 119, b: 119 })).toBeCloseTo(0.1845, 4);
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 10);
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 10);
    expect(contrastRatio({ r: 118, g: 118, b: 118 }, WHITE)).toBeCloseTo(4.54, 2);
    expect(contrastRatio({ r: 119, g: 119, b: 119 }, WHITE)).toBeCloseTo(4.48, 2);
    expect(contrastRatio({ r: 10, g: 200, b: 30 }, { r: 10, g: 200, b: 30 })).toBe(1);
  });

  it('weigh green most and blue least', () => {
    const [r, g, b] = [{ ...BLACK, r: 255 }, { ...BLACK, g: 255 }, { ...BLACK, b: 255 }].map(relativeLuminance);
    expect(r).toBeCloseTo(0.2126, 4);
    expect(g).toBeCloseTo(0.7152, 4);
    expect(b).toBeCloseTo(0.0722, 4);
  });
});

describe('compositeOver', () => {
  it('paints a colour over an opaque one by its alpha', () => {
    expect(compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, WHITE)).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
    expect(compositeOver({ r: 10, g: 20, b: 30, a: 1 }, WHITE)).toEqual({ r: 10, g: 20, b: 30 });
    expect(compositeOver({ r: 10, g: 20, b: 30, a: 0 }, WHITE)).toEqual(WHITE);
  });
});

describe('getGuideColors', () => {
  it('reaches the hairlines’ 3:1 against the background and a resting card, on light, dark and intermediate backgrounds', () => {
    expect(TIER_HAIRLINE_CONTRAST).toBe(3);
    for (const background of [
      grey(255), grey(230), grey(200), grey(153), grey(119), grey(118), grey(100), grey(85), grey(40), grey(0),
      opaque(VIEWER_BACKDROP.light), opaque(VIEWER_BACKDROP.dark),
      { r: 212, g: 175, b: 55, a: 1 }, { r: 20, g: 40, b: 90, a: 1 }, { r: 179, g: 38, b: 30, a: 1 },
      { r: 197, g: 197, b: 0, a: 1 }, { r: 0, g: 160, b: 255, a: 1 },
    ]) {
      const { line, lineOnCard } = contrasts(background);
      expect(line, JSON.stringify(background)).toBeGreaterThanOrEqual(3);
      expect(lineOnCard, JSON.stringify(background)).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives cards their subtle contrast, stronger when hovered, well below 3:1', () => {
    expect([PLACE_TIER_CARD_CONTRAST, PLACE_TIER_CARD_HOVER_CONTRAST]).toEqual([1.25, 1.5]);
    for (const background of [grey(255), grey(119), grey(118), grey(0), { r: 20, g: 40, b: 90, a: 1 }]) {
      const { card, hover } = contrasts(background);
      // At least the target, and no more than rounding up to a whole 1/255 of alpha adds
      expect(card).toBeGreaterThanOrEqual(1.25);
      expect(card).toBeLessThan(1.27);
      expect(hover).toBeGreaterThanOrEqual(1.5);
      expect(hover).toBeLessThan(1.53);
    }
  });

  it('uses dark inks over light backgrounds and light inks over dark ones', () => {
    const light = getGuideColors(grey(255), VIEWER_BACKDROP.light);
    expect(light.tone).toBe('dark');
    expect(light.hairline).toMatchObject(TIER_HAIRLINE_INKS.dark);
    expect(light.card).toMatchObject(PLACE_TIER_CARD_INKS.dark);
    expect(light.cardHover).toMatchObject(PLACE_TIER_CARD_INKS.dark);

    const dark = getGuideColors(grey(0), VIEWER_BACKDROP.light);
    expect(dark.tone).toBe('light');
    expect(dark.hairline).toMatchObject(TIER_HAIRLINE_INKS.light);
    expect(dark.card).toMatchObject(PLACE_TIER_CARD_INKS.light);
    // The switch: where black and white contrast equally with the background (#767676 / #777777)
    expect(getGuideColors(grey(119), VIEWER_BACKDROP.light).tone).toBe('dark');
    expect(getGuideColors(grey(117), VIEWER_BACKDROP.light).tone).toBe('light');
  });

  it('changes its opacities gradually with the background, within each tone', () => {
    let previous = getGuideColors(grey(255), VIEWER_BACKDROP.light);
    for (let v = 254; v >= 118; v--) {
      const colors = getGuideColors(grey(v), VIEWER_BACKDROP.light);
      expect(colors.tone).toBe('dark');
      expect(Math.abs(colors.hairline.a - previous.hairline.a)).toBeLessThan(0.02);
      expect(Math.abs(colors.card.a - previous.card.a)).toBeLessThan(0.01);
      previous = colors;
    }
  });

  it('rounds opacities up to whole steps of 1/255, as browsers keep them', () => {
    for (const v of [0, 60, 119, 200, 255]) {
      const colors = getGuideColors(grey(v), VIEWER_BACKDROP.light);
      for (const { a } of [colors.card, colors.cardHover]) expect(Math.abs(a * 255 - Math.round(a * 255))).toBeLessThan(1e-9);
    }
  });

  it('keeps the hairlines at least as strong as the design reference', () => {
    expect(TIER_HAIRLINE_MIN_ALPHA).toBe(0.3);
    for (const v of [0, 60, 120, 200, 255]) {
      expect(getGuideColors(grey(v), VIEWER_BACKDROP.light).hairline.a).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('composites a translucent background over the viewer’s backdrop for the theme', () => {
    const transparent = { r: 0, g: 0, b: 0, a: 0 };
    expect(getGuideColors(transparent, VIEWER_BACKDROP.light).background).toEqual(VIEWER_BACKDROP.light);
    expect(getGuideColors(transparent, VIEWER_BACKDROP.dark).background).toEqual(VIEWER_BACKDROP.dark);
    expect(getGuideColors(transparent, VIEWER_BACKDROP.light).tone).toBe('dark');
    expect(getGuideColors(transparent, VIEWER_BACKDROP.dark).tone).toBe('light');
    // Half-transparent black over the light backdrop: a mid tone, composited first
    const half = getGuideColors({ r: 0, g: 0, b: 0, a: 0.5 }, VIEWER_BACKDROP.light);
    expect(half.background).toEqual({ r: 123, g: 120.5, b: 115.5 });
    const { line, lineOnCard } = contrasts({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(Math.min(line, lineOnCard)).toBeGreaterThanOrEqual(3);
    // An opaque background ignores the backdrop
    expect(getGuideColors(grey(200), VIEWER_BACKDROP.dark)).toEqual(getGuideColors(grey(200), VIEWER_BACKDROP.light));
  });

  it('gives the same colours for the same background, every time', () => {
    const background = { r: 90, g: 140, b: 60, a: 0.7 };
    expect(getGuideColors(background, VIEWER_BACKDROP.dark)).toEqual(getGuideColors({ ...background }, VIEWER_BACKDROP.dark));
  });

  it('takes no glyph colour: only the background decides', () => {
    // The API has no glyph parameter, and the colours are those of the inks, whatever the glyphs
    expect(getGuideColors.length).toBe(2);
    const colors = getGuideColors(grey(255), VIEWER_BACKDROP.light);
    for (const ink of [colors.hairline, colors.card, colors.cardHover]) {
      expect([TIER_HAIRLINE_INKS.dark, PLACE_TIER_CARD_INKS.dark]).toContainEqual({ r: ink.r, g: ink.g, b: ink.b });
    }
  });

  it('rejects invalid colours', () => {
    for (const background of [
      { r: -1, g: 0, b: 0, a: 1 },
      { r: 256, g: 0, b: 0, a: 1 },
      { r: NaN, g: 0, b: 0, a: 1 },
      { r: 0, g: 0, b: 0, a: 1.5 },
      { r: 0, g: 0, b: 0, a: -0.1 },
      { r: 0, g: 0, b: 0, a: NaN },
    ]) {
      expect(() => getGuideColors(background, VIEWER_BACKDROP.light), JSON.stringify(background)).toThrow(RangeError);
    }
    expect(() => getGuideColors(grey(0), { r: 0, g: Infinity, b: 0 })).toThrow(RangeError);
    expect(() => relativeLuminance({ r: 0, g: 300, b: 0 })).toThrow(RangeError);
  });
});
