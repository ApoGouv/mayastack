import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// The design system's palette lives in src/index.css. These tests read the browser's computed
// values instead of repeating them, and check a deliberate set of contrast-critical pairs.

type Theme = 'light' | 'dark';

/** Opens the app with the given saved theme (and, optionally, other saved settings) */
async function openWithTheme(page: Page, theme: Theme, settings: Record<string, string> = {}) {
  await page.addInitScript(
    (saved) => Object.entries(saved).forEach(([key, value]) => localStorage.setItem(key, value)),
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
    await page.getByLabel('Number input').fill('123');
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
   * The elements that use the heading font. Stage 1 PR 1 adds the font without applying it;
   * PR 2 applies it to the main heading and section headings, and lists them here.
   */
  const HEADING_FONT_ELEMENTS: string[] = [];

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
    await page.getByLabel('Number input').fill('8000400019');
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
