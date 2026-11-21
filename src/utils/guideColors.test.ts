import { describe, expect, it } from 'vitest';
import type { RgbaColor } from '@/types/colors';
import {
  ANNOTATION_LABEL_CONTRAST,
  ANNOTATION_LABEL_INKS,
  compositeOver,
  contrastRatio,
  getAnnotationLabelColors,
  getGuideColors,
  inkTone,
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

describe('inkTone', () => {
  it('chooses dark inks where black contrasts at least as much as white, as getGuideColors always has', () => {
    // The rule getGuideColors used inline before it was shared
    const previousRule = (l: number) => ((l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? 'dark' : 'light');
    for (let v = 0; v <= 255; v++) {
      const l = relativeLuminance({ r: v, g: v, b: v });
      expect(inkTone(l), String(v)).toBe(previousRule(l));
      expect(getGuideColors(grey(v), VIEWER_BACKDROP.light).tone, String(v)).toBe(previousRule(l));
    }
    expect([inkTone(0), inkTone(1)]).toEqual(['light', 'dark']);
  });
});

describe('getAnnotationLabelColors', () => {
  const hex = (s: string): RgbColor => ({
    r: parseInt(s.slice(1, 3), 16),
    g: parseInt(s.slice(3, 5), 16),
    b: parseInt(s.slice(5, 7), 16),
  });

  /** Every opaque grey, then a 16 × 16 × 16 lattice of colours (channels 0, 17, … 255) */
  const SWEEP: RgbColor[] = [
    ...Array.from({ length: 256 }, (_, v) => ({ r: v, g: v, b: v })),
    ...Array.from({ length: 16 ** 3 }, (_, i) => ({
      r: 17 * (i % 16),
      g: 17 * (Math.floor(i / 16) % 16),
      b: 17 * Math.floor(i / 256),
    })),
  ];

  /** Where a label is, relative to its gutter: on the tone's side, at the contrast it reaches */
  const check = (background: RgbColor) => {
    const colors = getAnnotationLabelColors(background);
    const l = relativeLuminance(background);
    for (const ink of [colors.power, colors.digit]) {
      const onSide = colors.tone === 'dark' ? relativeLuminance(ink) <= l : relativeLuminance(ink) >= l;
      expect(onSide, JSON.stringify({ background, ink })).toBe(true);
    }
    return {
      colors,
      power: contrastRatio(colors.power, background),
      digit: contrastRatio(colors.digit, background),
    };
  };

  it('uses the theme tokens’ values as its preferred inks, and SC 1.4.3’s 4.5:1', () => {
    expect(ANNOTATION_LABEL_CONTRAST).toBe(4.5);
    expect(ANNOTATION_LABEL_INKS).toEqual({
      dark: { power: hex('#6b6250'), digit: hex('#735c00') },
      light: { power: hex('#a59a84'), digit: hex('#e5c158') },
    });
  });

  it('gives the representative papers these inks, each label at least 4.5:1, whatever the theme', () => {
    // [paper, tone, power ink, its contrast, digit ink, its contrast]; the measured failures of
    // the theme's tokens on these papers are in docs/plans/ui-redesign-roadmap.md (UI-14)
    const cases = [
      ['#ffffff', 'dark', '#6b6250', 6.02, '#735c00', 6.44], // White: the light theme's tokens, kept
      ['#faf8f5', 'dark', '#6b6250', 5.68, '#735c00', 6.08], // Limestone: kept
      ['#c7bc9f', 'dark', '#524c3e', 4.52, '#5d4a00', 4.55], // Weathered Limestone: darkened
      ['#1d2026', 'light', '#a59a84', 5.87, '#e5c158', 9.4], // Dark Stela: the dark theme's, kept
      ['#090b0e', 'light', '#a59a84', 7.09, '#e5c158', 11.35], // Obsidian Basalt: kept
      ['#000000', 'light', '#a59a84', 7.56, '#e5c158', 12.1], // Black: kept
      ['#777777', 'dark', '#070605', 4.52, '#080700', 4.51], // Mid grey: nearly black
    ] as const;
    for (const [paper, tone, power, powerRatio, digit, digitRatio] of cases) {
      const result = check(hex(paper));
      expect(result.colors, paper).toEqual({ tone, power: hex(power), digit: hex(digit) });
      expect(result.power, paper).toBeGreaterThanOrEqual(4.5);
      expect(result.digit, paper).toBeGreaterThanOrEqual(4.5);
      expect(result.power, paper).toBeCloseTo(powerRatio, 2);
      expect(result.digit, paper).toBeCloseTo(digitRatio, 2);
    }
  });

  it('keeps a preferred ink exactly wherever it already reaches 4.5:1 on the tone’s side', () => {
    for (const background of SWEEP) {
      const colors = getAnnotationLabelColors(background);
      const l = relativeLuminance(background);
      for (const kind of ['power', 'digit'] as const) {
        const preferred = ANNOTATION_LABEL_INKS[colors.tone][kind];
        const side = colors.tone === 'dark' ? relativeLuminance(preferred) <= l : relativeLuminance(preferred) >= l;
        if (side && contrastRatio(preferred, background) >= 4.5) expect(colors[kind]).toEqual(preferred);
        // Otherwise it moved towards the tone's extreme, never away from it
        else if (colors.tone === 'dark') expect(relativeLuminance(colors[kind])).toBeLessThan(relativeLuminance(preferred));
        else expect(relativeLuminance(colors[kind])).toBeGreaterThan(relativeLuminance(preferred));
      }
    }
  });

  it('reaches 4.5:1 for both labels, in whole channels, on every one of 4,352 opaque backgrounds', () => {
    expect(SWEEP).toHaveLength(4352);
    let lowest = Infinity;
    for (const background of SWEEP) {
      const { colors, power, digit } = check(background);
      for (const ink of [colors.power, colors.digit]) {
        for (const channel of [ink.r, ink.g, ink.b]) {
          expect(Number.isInteger(channel) && channel >= 0 && channel <= 255, JSON.stringify(ink)).toBe(true);
        }
      }
      expect(colors.tone).toBe(inkTone(relativeLuminance(background)));
      lowest = Math.min(lowest, power, digit);
    }
    expect(lowest).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * The procedure's candidates are mixes of the preferred ink towards the tone's extreme
   * (compositeOver, an amount `t` from 0 to 1), ordered by `t`. The least `t` that reaches 4.5:1 is
   * found by 30 halvings, so to within 2^-30; only then are the channels rounded towards the
   * extreme. Minimality is therefore a property of the unrounded amount, at that precision. It is
   * not a property of the whole-channel colour: the rounding, kept conservative so the rendered
   * colour never falls short, moves it slightly further (measured over the 4,352-background sweep:
   * 1 to 4 whole-channel steps along the mix, at most 3 per channel), so the preceding
   * whole-channel colour on the mix can still reach 4.5:1, and is not asserted to fail.
   */
  it('mixes a failing ink by the least amount that reaches 4.5:1, at the bisection’s precision, then rounds towards the extreme', () => {
    const PRECISION = 2 ** -30;
    const cases = [
      ['#c7bc9f', 'dark'], // Weathered Limestone: both labels darkened
      ['#777777', 'dark'], // Mid grey, the last dark-tone grey: nearly black
      ['#757575', 'light'], // The first light-tone grey: both labels lightened
      ['#3355aa', 'light'], // A mid blue: both labels lightened
    ] as const;
    for (const [paper, tone] of cases) {
      const background = hex(paper);
      const colors = getAnnotationLabelColors(background);
      expect(colors.tone, paper).toBe(tone);
      const l = relativeLuminance(background);
      const extreme = tone === 'dark' ? BLACK : WHITE;
      const towardsExtreme = tone === 'dark' ? Math.floor : Math.ceil;
      const reaches = (c: RgbColor) =>
        (tone === 'dark' ? relativeLuminance(c) <= l : relativeLuminance(c) >= l) && contrastRatio(c, background) >= 4.5;
      for (const kind of ['power', 'digit'] as const) {
        const label = `${paper} ${kind}`;
        const preferred = ANNOTATION_LABEL_INKS[tone][kind];
        const mix = (t: number) => compositeOver({ ...extreme, a: t }, preferred);
        const rounded = (t: number) => {
          const m = mix(t);
          return { r: towardsExtreme(m.r), g: towardsExtreme(m.g), b: towardsExtreme(m.b) };
        };
        // An adjusted case: the preferred ink falls short
        expect(reaches(preferred), label).toBe(false);
        // The least amount, found here to a far finer precision than the procedure's
        let [low, high] = [0, 1];
        for (let i = 0; i < 60; i++) {
          const middle = (low + high) / 2;
          if (reaches(mix(middle))) high = middle;
          else low = middle;
        }
        const least = high;
        // At the procedure's precision: the least amount reaches 4.5:1, one step less does not
        expect(reaches(mix(least)), label).toBe(true);
        expect(reaches(mix(least - PRECISION)), label).toBe(false);
        expect(contrastRatio(mix(least - PRECISION), background), label).toBeLessThan(4.5);
        // The returned colour is that least amount, within the procedure's precision, rounded
        // towards the extreme: not a larger mix
        expect([rounded(least), rounded(least + PRECISION)], label).toContainEqual(colors[kind]);
        // And, rounded so, it reaches 4.5:1 itself
        expect(reaches(colors[kind]), label).toBe(true);
        expect(contrastRatio(colors[kind], background), label).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('gives the same colours for the same background, every time, from its colour alone', () => {
    for (const background of [hex('#c7bc9f'), hex('#777777'), { r: 123, g: 120.5, b: 115.5 }]) {
      expect(getAnnotationLabelColors(background)).toEqual(getAnnotationLabelColors({ ...background }));
    }
    // The API has no theme or glyph parameter
    expect(getAnnotationLabelColors.length).toBe(1);
  });

  it('accepts the fractional channels of a translucent paper composited over the canvas', () => {
    const shown = getGuideColors({ r: 0, g: 0, b: 0, a: 0.5 }, VIEWER_BACKDROP.light).background;
    const { power, digit } = check(shown);
    expect(Math.min(power, digit)).toBeGreaterThanOrEqual(4.5);
  });

  it('rejects invalid colours', () => {
    for (const background of [{ r: -1, g: 0, b: 0 }, { r: 256, g: 0, b: 0 }, { r: NaN, g: 0, b: 0 }]) {
      expect(() => getAnnotationLabelColors(background), JSON.stringify(background)).toThrow(RangeError);
    }
  });
});
