import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// The design system's palette lives in src/index.css. These tests read the browser's computed
// values instead of repeating them, and check a deliberate set of contrast-critical pairs.

type Theme = 'light' | 'dark';

/**
 * Opens the app with the given saved theme (and, optionally, other saved settings, by name,
 * e.g. showGrid; each is saved under its key, e.g. mayastack:showGrid)
 */
async function openWithTheme(page: Page, theme: Theme, settings: Record<string, string> = {}) {
  await page.addInitScript(
    (saved) => Object.entries(saved).forEach(([name, value]) => localStorage.setItem(`mayastack:${name}`, value)),
    { theme, ...settings }
  );
  await page.goto('./');
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
}

/** The computed value of each colour token, by token name (e.g. "fg" for --color-fg) */
function readTokens(page: Page, names: readonly string[]) {
  return page.evaluate((tokens) => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(tokens.map((name) => [name, style.getPropertyValue(`--color-${name}`).trim()]));
  }, [...names]);
}

/** WCAG 2.x contrast ratio of two #rgb or #rrggbb colours */
function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** A computed, opaque rgb() colour as #rrggbb, for contrast() */
function hex(rgb: string) {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).map(Number);
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Waits until every running CSS transition and animation has finished */
const settle = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

/** Exports the current numeral through the Export menu and returns the file */
async function exportFile(page: Page, format: 'svg' | 'png') {
  const menuButton = page.getByRole('button', { name: '📦 Export' });
  if ((await menuButton.getAttribute('aria-expanded')) !== 'true') await menuButton.click();
  await page.getByLabel('Export Format').selectOption(format);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: new RegExp(`^Export ${format.toUpperCase()} image`) }).click(),
  ]);
  return readFile(await download.path());
}

/** Every semantic colour token (names only: the values belong to src/index.css) */
const TOKENS = [
  'canvas', 'surface', 'surface-raised', 'surface-hover', 'surface-active', 'well',
  'line', 'line-strong', 'fg', 'fg-muted', 'fg-subtle', 'fg-disabled',
  'accent', 'accent-hover', 'accent-active', 'on-accent', 'accent-fg', 'accent-subtle',
  'jade', 'danger', 'focus', 'inverse', 'on-inverse', 'toggle-thumb',
] as const;

type Token = (typeof TOKENS)[number];

/** Text pairs: at least 4.5:1 (WCAG 1.4.3) */
const TEXT_PAIRS: [Token, Token][] = [
  ['fg', 'canvas'], ['fg', 'surface'], ['fg', 'surface-raised'], ['fg', 'surface-hover'], ['fg', 'surface-active'],
  ['fg-muted', 'surface'], ['fg-subtle', 'well'], ['fg-subtle', 'surface'],
  // Menus, popovers and the export dialog sit on surface-raised
  ['fg-muted', 'surface-raised'], ['fg-subtle', 'surface-raised'], ['danger', 'surface-raised'],
  ['accent-fg', 'surface'], ['accent-fg', 'canvas'], ['fg', 'accent-subtle'],
  ['on-accent', 'accent'], ['on-accent', 'accent-hover'], ['on-accent', 'accent-active'],
  ['jade', 'surface'], ['danger', 'surface'], ['danger', 'well'], ['on-inverse', 'inverse'],
];

/** Boundaries, indicators and focus: at least 3:1 (WCAG 1.4.11) */
const NON_TEXT_PAIRS: [Token, Token][] = [
  ['line-strong', 'surface'], ['line-strong', 'well'], ['line-strong', 'canvas'], ['line-strong', 'surface-raised'],
  // A control's boundary stays visible while it is hovered or pressed
  ['line-strong', 'surface-hover'], ['line-strong', 'surface-active'],
  ['accent-fg', 'surface'], ['accent-fg', 'surface-raised'], ['accent-fg', 'accent-subtle'],
  ['jade', 'surface'], ['toggle-thumb', 'jade'], ['toggle-thumb', 'line-strong'],
  ['focus', 'canvas'], ['focus', 'surface'], ['focus', 'surface-raised'], ['focus', 'well'],
];

test.describe('design tokens', () => {
  test('defines every token in both themes, with distinct light and dark palettes', async ({ page }) => {
    await openWithTheme(page, 'light');
    const light = await readTokens(page, TOKENS);
    await openWithTheme(page, 'dark');
    const dark = await readTokens(page, TOKENS);

    for (const token of TOKENS) {
      expect(light[token], `light --color-${token}`).toMatch(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i);
      expect(dark[token], `dark --color-${token}`).toMatch(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i);
    }
    expect(dark.canvas).not.toBe(light.canvas);
    expect(dark.fg).not.toBe(light.fg);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`meets the contrast minimums for critical pairs in the ${theme} theme`, async ({ page }) => {
      await openWithTheme(page, theme);
      const tokens = await readTokens(page, TOKENS);
      const failures = [
        ...TEXT_PAIRS.map(([fg, bg]) => ({ pair: `${fg} on ${bg}`, ratio: contrast(tokens[fg], tokens[bg]), min: 4.5 })),
        ...NON_TEXT_PAIRS.map(([fg, bg]) => ({ pair: `${fg} against ${bg}`, ratio: contrast(tokens[fg], tokens[bg]), min: 3 })),
      ].filter(({ ratio, min }) => ratio < min);
      expect(failures).toEqual([]);
    });
  }
});

test.describe('reduced motion', () => {
  /** The animation of the open theme menu and the transition of its options, in seconds */
  async function themeMenuMotion(page: Page) {
    await page.getByRole('button', { name: /^Theme selector/ }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    return {
      animation: parseFloat(await menu.evaluate((el) => getComputedStyle(el).animationDuration)),
      transition: parseFloat(await page.getByRole('menuitem').first().evaluate((el) => getComputedStyle(el).transitionDuration)),
    };
  }

  test('keeps animations and transitions by default', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('./');
    const motion = await themeMenuMotion(page);
    expect(motion.animation).toBeGreaterThan(0.1);
    expect(motion.transition).toBeGreaterThan(0.1);
  });

  test('shortens animations and transitions when reduced motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    const motion = await themeMenuMotion(page);
    expect(motion.animation).toBeLessThan(0.001);
    expect(motion.transition).toBeLessThan(0.001);
  });

  /**
   * The duration of the entrance animation of the toast an export shows, in seconds.
   * react-hot-toast sets the animation inline once it has measured the toast, so this waits
   * for an animation to be applied before reading its duration.
   */
  async function toastAnimation(page: Page) {
    await page.goto('./');
    await page.getByLabel('Decimal integer').fill('123');
    await exportFile(page, 'svg');
    const bar = page.getByRole('status').filter({ hasText: 'SVG download started' }).locator('xpath=..');
    // Read in one step, as soon as the animation is applied: the toast closes after a few seconds
    let duration = NaN;
    await expect
      .poll(async () => {
        duration = await bar.evaluate((el) => {
          const style = getComputedStyle(el);
          return style.animationName === 'none' ? NaN : parseFloat(style.animationDuration);
        });
        return Number.isNaN(duration);
      })
      .toBe(false);
    return duration;
  }

  test('keeps the toast entrance animation by default', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(await toastAnimation(page)).toBeGreaterThan(0.1);
  });

  test('shortens the toast entrance animation when reduced motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await toastAnimation(page)).toBeLessThan(0.001);
  });
});

test.describe('heading font', () => {
  // The unmodified official file (docs/DESIGN_SYSTEM.md, "Heading font licence and provenance")
  const FONT = { bytes: 300_724, sha256: 'c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6' };

  /**
   * The elements that use the heading font: the main heading and the section headings
   * (docs/DESIGN_SYSTEM.md, "Typography"), with a number shown
   */
  const HEADING_FONT_ELEMENTS: string[] = [
    'h1: 🌄 Convert to Mayan Numerals',
    'h2: Mayan Numeral',
    'h2: Base-20 Representation',
    // Changed deliberately in UI-07: the decorative icon in the base-20 heading inherits its font,
    // but has no text for it to render
    'svg: ',
    'path: ',
  ];

  /** The URL the stylesheet loads the heading font from */
  const fontUrl = (page: Page) =>
    page.evaluate(() => {
      for (const sheet of [...document.styleSheets]) {
        for (const rule of [...sheet.cssRules]) {
          if (rule instanceof CSSFontFaceRule && rule.style.getPropertyValue('font-family').includes('Playfair Display')) {
            const src = rule.style.getPropertyValue('src');
            return new URL(src.match(/url\("?([^")]+)"?\)/)![1], sheet.href ?? location.href).href;
          }
        }
      }
      return null;
    });

  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('serves the unmodified official font file under the base path', async ({ page }) => {
    const url = await fontUrl(page);
    expect(url).not.toBeNull();
    expect(new URL(url!).pathname).toBe('/mayastack/fonts/playfair-display/PlayfairDisplay%5Bwght%5D.ttf');

    const response = await page.request.get(url!);
    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(body.length).toBe(FONT.bytes);
    expect(createHash('sha256').update(body).digest('hex')).toBe(FONT.sha256);
  });

  test('serves the font licence and FONTLOG beside it', async ({ page }) => {
    const base = new URL('fonts/playfair-display/', page.url());
    const licence = await page.request.get(new URL('OFL.txt', base).href);
    expect(licence.status()).toBe(200);
    const licenceText = await licence.text();
    expect(licenceText).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(licenceText).toContain('with Reserved Font Name "Playfair Display"');
    // The served licence is the file in the repository
    expect(licenceText).toBe(await readFile('public/fonts/playfair-display/OFL.txt', 'utf8'));

    const fontlog = await page.request.get(new URL('FONTLOG.txt', base).href);
    expect(fontlog.status()).toBe(200);
    expect(await fontlog.text()).toContain('FONTLOG for the Playfair Display fonts');
  });

  test('loads, and is used only by the intended headings', async ({ page }) => {
    const loaded = await page.evaluate(async () => {
      const faces = await document.fonts.load('600 32px "Playfair Display"');
      return { faces: faces.length, ready: document.fonts.check('600 32px "Playfair Display"') };
    });
    expect(loaded.faces).toBeGreaterThan(0);
    expect(loaded.ready).toBe(true);

    // With a result, so that the result content is checked too
    await page.getByLabel('Decimal integer').fill('20');
    await expect(page.getByRole('group', { name: 'Numeral viewer' })).toBeVisible();
    const users = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((el) => getComputedStyle(el).fontFamily.includes('Playfair Display'))
        .map((el) => `${el.tagName.toLowerCase()}: ${el.textContent?.trim()}`)
    );
    expect(users).toEqual(HEADING_FONT_ELEMENTS);
  });
});

test.describe('export and the interface theme', () => {
  /** The size and a hash of the decoded pixels of a PNG */
  const pngPixels = (page: Page, png: Buffer) =>
    page.evaluate(async (base64) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height).data;
      const digest = await crypto.subtle.digest('SHA-256', pixels);
      return { width: image.width, height: image.height, hash: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('') };
    }, png.toString('base64'));

  /**
   * Shows the same numeral with the same display settings in the light theme, exports it, then
   * switches to the dark theme and exports it again. The grid is on, and the export colours keep
   * their defaults: they are display settings, chosen by the user, not part of the theme.
   * (Two downloads per test, as elsewhere in the suite.)
   */
  async function exportInBothThemes(page: Page, format: 'svg' | 'png') {
    await openWithTheme(page, 'light', { showGrid: 'true' });
    await page.getByLabel('Decimal integer').fill('8000400019');
    await expect(page.getByRole('group', { name: 'Numeral viewer' })).toBeVisible();
    const light = await exportFile(page, format);

    await page.getByRole('button', { name: /^Theme selector/ }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    const dark = await exportFile(page, format);
    return { light, dark };
  }

  test('exports the same SVG in the light and dark themes', async ({ page }) => {
    const { light, dark } = await exportInBothThemes(page, 'svg');
    const svg = light.toString('utf8');
    expect(svg).toContain('data-digit-index');
    expect(svg).toContain('url(#grid)');
    // A guard, not proof of a correct export: a token used inside the artwork would be written
    // as the same unresolved var() in both themes, so the comparison below could not see it,
    // and outside the app the exported file would have no value for it
    expect(svg).not.toContain('var(--');
    expect(dark.toString('utf8')).toBe(svg);
  });

  test('exports the same PNG pixels in the light and dark themes', async ({ page }) => {
    const { light, dark } = await exportInBothThemes(page, 'png');
    expect(await pngPixels(page, dark)).toEqual(await pngPixels(page, light));
  });
});

/**
 * The design system applied to the existing components (UI-03 acceptance criteria): measured on
 * the rendered elements, in both themes, after their transitions have finished.
 */
test.describe('design system on the components', () => {
  /** A token's colour as the browser computes it, e.g. "rgb(115, 92, 0)" */
  const token = (page: Page, name: string) =>
    page.evaluate((t) => {
      const probe = document.createElement('div');
      probe.style.color = `var(--color-${t})`;
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    }, name);

  /** Gives keyboard focus (so :focus-visible applies) and returns the outline drawn */
  const keyboardFocus = async (page: Page, target: ReturnType<Page['locator']>) => {
    await page.keyboard.press('Shift');
    await target.focus();
    await settle(page);
    return target.evaluate((el) => {
      const s = getComputedStyle(el);
      return { focusVisible: el.matches(':focus-visible'), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}` };
    });
  };

  for (const theme of ['light', 'dark'] as const) {
    test(`meets the contrast minimums on the controls in the ${theme} theme`, async ({ page }) => {
      await openWithTheme(page, theme);
      const input = page.getByLabel('Decimal integer');
      const results: { what: string; ratio: number; min: number }[] = [];
      const check = (what: string, fg: string, bg: string, min: number) => results.push({ what, ratio: contrast(hex(fg), hex(bg)), min });

      // The number input: placeholder (while empty), text, and boundary against its card
      await input.fill('');
      const field = await input.evaluate((el) => ({
        placeholder: getComputedStyle(el, '::placeholder').color, background: getComputedStyle(el).backgroundColor,
        border: getComputedStyle(el).borderTopColor, card: getComputedStyle(el.closest('section')!).backgroundColor,
      }));
      check('number input placeholder', field.placeholder, field.background, 4.5);
      check('number input boundary', field.border, field.card, 3);

      /** The text colour of an element, and the first opaque background behind it */
      const colours = (target: ReturnType<Page['locator']>) => target.evaluate((el) => {
        let bg = 'rgba(0, 0, 0, 0)';
        for (let e: Element | null = el; e && bg.startsWith('rgba'); e = e.parentElement) bg = getComputedStyle(e).backgroundColor;
        return { color: getComputedStyle(el).color, border: getComputedStyle(el).borderTopColor, bg };
      });
      // Why Copy and the steps are unavailable, shown while the field is empty
      const reason = await colours(page.getByText('Enter a whole number to copy it or use the steps.', { exact: true }));
      check('unavailable reason', reason.color, reason.bg, 4.5);

      await input.fill('8000400019');
      await settle(page);
      check('number input text', await input.evaluate((el) => getComputedStyle(el).color), field.background, 4.5);

      // Muted labels on their cards
      for (const text of [
        'Input Type', 'Decimal integer', '10 digits', 'Steps',
        'SVG Display Settings', 'Background color:', 'Show Grid:',
      ]) {
        const label = await colours(page.getByText(text, { exact: true }).first());
        check(`label "${text}"`, label.color, label.bg, 4.5);
      }

      // The quick steps and Zero: their labels on their fills, their boundaries against the card
      for (const name of ['+20', 'Zero']) {
        const button = await colours(page.getByRole('button', { name, exact: true }));
        check(`"${name}" label`, button.color, button.bg, 4.5);
        check(`"${name}" boundary`, button.border, field.card, 3);
      }
      // Zero while hovered: its gold tint and border
      const zero = page.getByRole('button', { name: 'Zero', exact: true });
      await zero.hover();
      await settle(page);
      const zeroHovered = await colours(zero);
      check('"Zero" label (hover)', zeroHovered.color, zeroHovered.bg, 4.5);
      check('"Zero" boundary (hover)', zeroHovered.border, field.card, 3);
      await page.mouse.move(0, 0);

      // The input-type segments: the selected (gold) and the other one, and their dots, which
      // mark each option (the control itself has no border, as in design-reference concept 3)
      for (const name of ['Number', 'Date']) {
        const segment = await page.getByRole('radio', { name }).evaluate((radio) => {
          const label = radio.closest('label')!;
          let bg = 'rgba(0, 0, 0, 0)';
          for (let e: Element | null = label; e && bg.startsWith('rgba'); e = e.parentElement) bg = getComputedStyle(e).backgroundColor;
          return { checked: (radio as HTMLInputElement).checked, color: getComputedStyle(label).color, dot: getComputedStyle(radio).borderTopColor, bg };
        });
        check(`"${name}" segment label (${segment.checked ? 'selected' : 'not selected'})`, segment.color, segment.bg, 4.5);
        check(`"${name}" segment dot`, segment.dot, segment.bg, 3);
      }

      // The icons of the in-field buttons against the field (non-text contrast)
      for (const name of ['Random number', 'Copy number', 'Clear input']) {
        const icon = await colours(page.getByRole('button', { name }));
        check(`"${name}" icon`, icon.color, field.background, 3);
      }

      // The Export button's label, default and hovered
      const exportButton = page.getByRole('button', { name: '📦 Export' });
      for (const state of ['default', 'hover'] as const) {
        if (state === 'hover') await exportButton.hover();
        await settle(page);
        const b = await exportButton.evaluate((el) => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
        check(`Export label (${state})`, b.color, b.bg, 4.5);
      }
      await page.mouse.move(0, 0);

      // The toggle's tracks against the card, and its thumb against each track
      const toggle = page.getByRole('switch', { name: 'Show Grid:' });
      for (let i = 0; i < 2; i++) {
        await settle(page);
        const t = await toggle.evaluate((el) => {
          let card = 'rgba(0, 0, 0, 0)';
          for (let e: Element | null = el.parentElement; e && card.startsWith('rgba'); e = e.parentElement) card = getComputedStyle(e).backgroundColor;
          return { state: el.getAttribute('aria-checked'), track: getComputedStyle(el).backgroundColor, thumb: getComputedStyle(el.firstElementChild!).backgroundColor, card };
        });
        check(`toggle track (${t.state === 'true' ? 'on' : 'off'})`, t.track, t.card, 3);
        check(`toggle thumb (${t.state === 'true' ? 'on' : 'off'})`, t.thumb, t.track, 3);
        await toggle.click();
      }

      // Error text on its card
      await input.fill('12a');
      await settle(page);
      // The input lists its error first among its descriptions
      const errorId = (await input.getAttribute('aria-describedby'))!.split(' ')[0];
      const error = await page.locator(`#${errorId}`).evaluate((el) => ({
        color: getComputedStyle(el).color, card: getComputedStyle(el.closest('section')!).backgroundColor,
      }));
      check('error text', error.color, error.card, 4.5);
      // The field's red border while invalid, against its card
      check('number input error boundary', await input.evaluate((el) => getComputedStyle(el).borderTopColor), field.card, 3);

      expect(results.filter(({ ratio, min }) => ratio < min)).toEqual([]);
    });

    test(`draws gold controls with the accent-fg border in every state in the ${theme} theme`, async ({ page }) => {
      await openWithTheme(page, theme);
      await page.getByLabel('Decimal integer').fill('20');
      const accentFg = await token(page, 'accent-fg');
      const border = async (target: ReturnType<Page['locator']>) => {
        await settle(page);
        return target.evaluate((el) => `${getComputedStyle(el).borderTopWidth} ${getComputedStyle(el).borderTopColor}`);
      };
      const states = async (target: ReturnType<Page['locator']>) => {
        const seen: Record<string, string> = { default: await border(target) };
        await target.hover();
        seen.hover = await border(target);
        // Pressed: the button down, then released elsewhere, so it is not clicked
        await page.mouse.down();
        seen.pressed = await border(target);
        await page.mouse.move(0, 0);
        await page.mouse.up();
        await keyboardFocus(page, target);
        seen.focused = await border(target);
        return seen;
      };
      const expected = { default: `1px ${accentFg}`, hover: `1px ${accentFg}`, pressed: `1px ${accentFg}`, focused: `1px ${accentFg}` };

      const trigger = page.getByRole('button', { name: '📦 Export' });
      expect(await states(trigger)).toEqual(expected);
      await trigger.click();
      expect(await states(page.getByRole('button', { name: /^Export SVG image/ }))).toEqual(expected);
    });

    test(`marks the selected input type in forced-colours mode in the ${theme} theme`, async ({ page }) => {
      // Forced colours replace the segments' gold and the dot's fill with the background, so
      // only the dot, filled in the system text colour, still tells the modes apart
      await page.emulateMedia({ forcedColors: 'active' });
      await openWithTheme(page, theme);
      const dots = () => page.locator('input[name="renderMode"]').evaluateAll((radios) =>
        radios.map((radio) => {
          const s = getComputedStyle(radio);
          return { checked: (radio as HTMLInputElement).checked, filled: s.backgroundColor === s.borderTopColor };
        }));
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
      expect(await dots()).toEqual([{ checked: true, filled: true }, { checked: false, filled: false }]);
      await page.getByRole('radio', { name: 'Date' }).check();
      expect(await dots()).toEqual([{ checked: false, filled: false }, { checked: true, filled: true }]);
    });

    test(`shows the focus ring on keyboard focus in the ${theme} theme`, async ({ page }) => {
      await openWithTheme(page, theme);
      await page.getByLabel('Decimal integer').fill('20');
      const ring = `solid 2px ${await token(page, 'focus')} 2px`;
      // Text fields draw it over their own boundary, inside the field's box
      const insetRing = `solid 2px ${await token(page, 'focus')} -2px`;
      const seen: Record<string, { focusVisible: boolean; outline: string }> = {};
      const expected: typeof seen = {};
      const focusOn = async (name: string, target: ReturnType<Page['locator']>, outline = ring) => {
        seen[name] = await keyboardFocus(page, target);
        expected[name] = { focusVisible: true, outline };
      };

      await focusOn('number input', page.getByLabel('Decimal integer'), insetRing);
      // The inset ring lies between the card and the field's fill, so it needs 3:1 against both
      const sides = await page.getByLabel('Decimal integer').evaluate((el) => ({
        ring: getComputedStyle(el).outlineColor, fill: getComputedStyle(el).backgroundColor,
        card: getComputedStyle(el.closest('section')!).backgroundColor,
      }));
      expect(contrast(hex(sides.ring), hex(sides.fill))).toBeGreaterThanOrEqual(3);
      expect(contrast(hex(sides.ring), hex(sides.card))).toBeGreaterThanOrEqual(3);
      for (const name of ['Random number', 'Copy number', 'Clear input']) {
        await focusOn(`"${name}" button`, page.getByRole('button', { name }));
      }
      await focusOn('quick step', page.getByRole('button', { name: '+20', exact: true }));
      await focusOn('Zero button', page.getByRole('button', { name: 'Zero', exact: true }));
      // A radio button: its segment draws the ring
      seen['input-type segment'] = await keyboardFocus(page, page.getByRole('radio', { name: 'Number' })).then(() =>
        page.getByRole('radio', { name: 'Number' }).evaluate((radio) => {
          const s = getComputedStyle(radio.closest('label')!);
          return { focusVisible: radio.matches(':focus-visible'), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}` };
        }));
      expected['input-type segment'] = { focusVisible: true, outline: ring };
      await focusOn('zoom button', page.getByRole('button', { name: 'Zoom in' }));
      await focusOn('colour swatch', page.getByRole('button', { name: 'Background color:' }));
      const trigger = page.getByRole('button', { name: '📦 Export' });
      await focusOn('Export trigger', trigger);

      // The Export dialog's controls
      await trigger.click();
      await focusOn('Export Format select', page.getByLabel('Export Format'));
      await focusOn('dialog Export button', page.getByRole('button', { name: /^Export SVG image/ }));
      await trigger.click();

      // A theme option, in the open theme menu
      const themeButton = page.getByRole('button', { name: /^Theme selector/ });
      await themeButton.click();
      await focusOn('theme option', page.getByRole('menuitem').first());
      await themeButton.click();
      await expect(page.getByRole('menuitem')).toHaveCount(0);

      // A date-picker day, reached with the keyboard: Tab opens the calendar, ArrowDown enters it
      await page.getByRole('radio', { name: 'Date' }).check();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('gridcell', { name: /^Choose / }).first()).toBeVisible();
      await settle(page);
      seen['date input'] = await page.getByLabel('Date input').evaluate((el) => {
        const s = getComputedStyle(el);
        return { focusVisible: el.matches(':focus-visible'), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}` };
      });
      expected['date input'] = { focusVisible: true, outline: insetRing };
      await page.keyboard.press('ArrowDown');
      await settle(page);
      seen['date-picker day'] = await page.evaluate(() => {
        const el = document.activeElement!; const s = getComputedStyle(el);
        return { focusVisible: el.matches('.react-datepicker__day:focus-visible'), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}` };
      });
      expected['date-picker day'] = { focusVisible: true, outline: ring };

      expect(seen).toEqual(expected);
    });

    test(`themes the date picker, toasts and colour-picker popover in the ${theme} theme`, async ({ page }) => {
      await openWithTheme(page, theme);
      const raised = await token(page, 'surface-raised');
      const fg = await token(page, 'fg');
      await page.getByLabel('Decimal integer').fill('20');
      const surfaces: Record<string, string> = {};

      // The colour-picker popover
      await page.getByRole('button', { name: 'Background color:' }).click();
      surfaces['colour-picker popover'] = await page.locator('.react-colorful').locator('xpath=..').evaluate((el) => getComputedStyle(el).backgroundColor);
      await page.keyboard.press('Escape');

      // A toast, after an export
      await exportFile(page, 'svg');
      surfaces.toast = await page.getByRole('status').filter({ hasText: 'download started' }).locator('xpath=..').evaluate((el) => `${getComputedStyle(el).backgroundColor} / ${getComputedStyle(el).color}`);

      // The date picker
      await page.getByRole('radio', { name: 'Date' }).check();
      await page.getByLabel('Date input').click();
      surfaces['date picker'] = await page.locator('.react-datepicker').evaluate((el) => `${getComputedStyle(el).backgroundColor} / ${getComputedStyle(el).color}`);

      expect(surfaces).toEqual({ 'colour-picker popover': raised, toast: `${raised} / ${fg}`, 'date picker': `${raised} / ${fg}` });
    });
  }
});
