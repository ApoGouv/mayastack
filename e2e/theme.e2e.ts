import { expect, test, type Page } from '@playwright/test';

type Theme = 'light' | 'dark';

/**
 * The canvas token each theme declares, read from the stylesheet the page loaded (the light
 * values on :root, the dark ones under .dark), so the tests do not copy palette values
 */
function declaredCanvas(page: Page): Promise<Record<Theme, string | null>> {
  return page.evaluate(() => {
    const found: Record<string, string | null> = { light: null, dark: null };
    const visit = (rules: CSSRuleList) => {
      for (const rule of [...rules]) {
        if (rule instanceof CSSStyleRule) {
          const value = rule.style.getPropertyValue('--color-canvas').trim();
          if (value && rule.selectorText.split(',').some((s) => s.trim() === ':root')) found.light = value;
          if (value && rule.selectorText.trim() === '.dark') found.dark = value;
        }
        if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of [...document.styleSheets]) visit(sheet.cssRules);
    return found as Record<'light' | 'dark', string | null>;
  });
}

/** Makes reading localStorage throw, as in a browser that blocks site data */
const blockStorage = () =>
  Object.defineProperty(window, 'localStorage', {
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });

/**
 * Opens the app with a saved theme (or none) and the given system colour scheme. The theme is
 * saved under the app's key, or under another, such as the unprefixed 'theme' used before.
 */
async function open(page: Page, saved: string | null, system: Theme, { withApp = true, key = 'mayastack:theme' } = {}) {
  await page.emulateMedia({ colorScheme: system });
  if (saved !== null) {
    await page.addInitScript(({ key, theme }) => localStorage.setItem(key, theme), { key, theme: saved });
  }
  // Without the app's scripts React never mounts: what remains is the first paint
  if (!withApp) await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
  await page.goto('./');
}

/** The theme class, colour scheme, active canvas token and backgrounds of the document */
function themeState(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const app = document.querySelector('#root > div');
    return {
      theme: root.classList.contains('dark') ? 'dark' : root.classList.contains('light') ? 'light' : null,
      usingSystem: root.classList.contains('using-system'),
      // The scheme native controls (scrollbars, selects) are drawn in
      colorScheme: getComputedStyle(root).colorScheme,
      // The active theme's palette, as the variable resolves on the root
      canvas: getComputedStyle(root).getPropertyValue('--color-canvas').trim(),
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      appBackground: app ? getComputedStyle(app).backgroundColor : null,
    };
  });
}

const PREFERENCES: { name: string; saved: string | null; system: Theme; expected: Theme; usingSystem: boolean }[] = [
  { name: 'a saved light theme on a dark system', saved: 'light', system: 'dark', expected: 'light', usingSystem: false },
  { name: 'a saved dark theme on a light system', saved: 'dark', system: 'light', expected: 'dark', usingSystem: false },
  { name: 'the system theme on a light system', saved: null, system: 'light', expected: 'light', usingSystem: true },
  { name: 'the system theme on a dark system', saved: null, system: 'dark', expected: 'dark', usingSystem: true },
  { name: 'an invalid saved theme, as the system theme', saved: 'purple', system: 'light', expected: 'light', usingSystem: true },
];

test.describe('initial theme', () => {
  for (const { name, saved, system, expected, usingSystem } of PREFERENCES) {
    test(`renders ${name} from the first paint, as the app keeps it`, async ({ page }) => {
      await open(page, saved, system, { withApp: false });
      await expect(page.locator('#root')).toBeEmpty();
      const canvas = await declaredCanvas(page);
      expect(canvas.light).not.toBe(canvas.dark);
      const firstPaint = await themeState(page);
      expect(firstPaint).toMatchObject({ theme: expected, usingSystem, canvas: canvas[expected], colorScheme: expected });

      await page.unrouteAll();
      await page.reload();
      await expect(page.getByRole('heading', { name: /Convert to Mayan Numerals/ })).toBeVisible();
      const started = await themeState(page);
      expect(started).toMatchObject({ theme: expected, usingSystem, canvas: canvas[expected], colorScheme: expected });
      // The page behind the app has the app's own background, before and after it starts
      expect(started.bodyBackground).toBe(started.appBackground);
      expect(firstPaint.bodyBackground).toBe(started.bodyBackground);
    });
  }

  test('ignores a theme saved under the unprefixed key used before, from the first paint', async ({ page }) => {
    await open(page, 'dark', 'light', { withApp: false, key: 'theme' });
    await expect(page.locator('#root')).toBeEmpty();
    expect(await themeState(page)).toMatchObject({ theme: 'light', usingSystem: true, colorScheme: 'light' });

    await page.unrouteAll();
    await page.reload();
    await expect(page.getByRole('heading', { name: /Convert to Mayan Numerals/ })).toBeVisible();
    expect(await themeState(page)).toMatchObject({ theme: 'light', usingSystem: true, colorScheme: 'light' });
    await expect(page.getByRole('button', { name: /^Theme selector/ })).toHaveAttribute('aria-label', 'Theme selector (current: system)');
    // Left as it was: neither read, moved nor removed
    expect(await page.evaluate(() => [localStorage.getItem('theme'), localStorage.getItem('mayastack:theme')])).toEqual(['dark', null]);
  });

  test('saves a chosen theme under its key and starts from it, before the first paint, after a reload', async ({ page }) => {
    await open(page, null, 'light');
    await page.getByRole('button', { name: /^Theme selector/ }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    expect(await page.evaluate(() => localStorage.getItem('mayastack:theme'))).toBe('dark');

    // Without the app's scripts, only index.html's first-paint script can apply it
    await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
    await page.reload();
    await expect(page.locator('#root')).toBeEmpty();
    expect(await themeState(page)).toMatchObject({ theme: 'dark', usingSystem: false, colorScheme: 'dark' });
  });

  for (const system of ['light', 'dark'] as const) {
    test(`uses the ${system} system theme from the first paint when storage is blocked`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(blockStorage);
      await open(page, null, system, { withApp: false });
      const canvas = await declaredCanvas(page);
      expect(await themeState(page)).toMatchObject({ theme: system, usingSystem: true, canvas: canvas[system], colorScheme: system });

      await page.unrouteAll();
      await page.reload();
      await expect(page.getByRole('heading', { name: /Convert to Mayan Numerals/ })).toBeVisible();
      expect(await themeState(page)).toMatchObject({ theme: system, usingSystem: true, canvas: canvas[system], colorScheme: system });
      expect(errors).toEqual([]);
    });
  }
});

test.describe('theme switching', () => {
  test('switches the theme tokens and marks the selected option visibly in both themes', async ({ page }) => {
    await open(page, null, 'light');
    const themeButton = page.getByRole('button', { name: /^Theme selector/ });

    const chooseTheme = async (name: 'Light' | 'Dark' | 'System') => {
      await themeButton.click();
      await page.getByRole('menuitem', { name }).click();
      // The menu fades out before it is removed: wait for that, so the next check opens a new
      // menu instead of reading options whose selection styles are still transitioning
      await expect(page.getByRole('menuitem')).toHaveCount(0);
    };

    /** The computed ring and background of each option in the open menu */
    const optionStyles = async () => {
      await themeButton.click();
      const options = page.getByRole('menuitem');
      await expect(options).toHaveCount(3);
      const styles = await options.evaluateAll((items) => {
        // The active theme's accent-fg, resolved by the browser in the format of a computed ring
        const probe = document.createElement('div');
        probe.style.color = 'var(--color-accent-fg)';
        document.body.append(probe);
        const accentFg = getComputedStyle(probe).color;
        probe.remove();
        return items.map((item) => ({
          selected: item.getAttribute('aria-current') === 'true',
          ring: getComputedStyle(item).boxShadow,
          background: getComputedStyle(item).backgroundColor,
          accentFg,
        }));
      });
      // Close it again with its button (the theme menu does not close on Escape)
      await themeButton.click();
      await expect(options).toHaveCount(0);
      return styles;
    };

    const expectSelectionVisible = async (selected: number, theme: Theme) => {
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
      const styles = await optionStyles();
      styles.forEach((style, index) => {
        expect(style.selected).toBe(index === selected);
        if (index === selected) {
          // Ringed in the active theme's accent-fg, on a tinted background
          expect(style.ring).toContain(style.accentFg);
          expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
        } else {
          expect(style.ring).toBe('none');
          expect(style.background).toBe('rgba(0, 0, 0, 0)');
        }
      });
    };

    const canvas = await declaredCanvas(page);

    // System, resolved to the emulated light scheme
    expect(await themeState(page)).toMatchObject({ theme: 'light', canvas: canvas.light, colorScheme: 'light' });
    await expectSelectionVisible(2, 'light');

    await chooseTheme('Dark');
    expect(await themeState(page)).toMatchObject({ theme: 'dark', usingSystem: false, canvas: canvas.dark, colorScheme: 'dark' });
    await expectSelectionVisible(1, 'dark');

    await chooseTheme('Light');
    expect(await themeState(page)).toMatchObject({ theme: 'light', usingSystem: false, canvas: canvas.light, colorScheme: 'light' });
    await expectSelectionVisible(0, 'light');

    await chooseTheme('System');
    expect(await themeState(page)).toMatchObject({ theme: 'light', usingSystem: true, canvas: canvas.light, colorScheme: 'light' });
  });
});
