import { expect, test, type Page } from '@playwright/test';

/** The brand colour each theme declares in src/index.css */
const BRAND = { light: '#d95d39', dark: '#c24d30' } as const;
/** The same colours as computed in a ring's box-shadow */
const BRAND_RGB = { light: 'rgb(217, 93, 57)', dark: 'rgb(194, 77, 48)' } as const;

type Theme = keyof typeof BRAND;

/** Makes reading localStorage throw, as in a browser that blocks site data */
const blockStorage = () =>
  Object.defineProperty(window, 'localStorage', {
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });

/** Opens the app with a saved theme (or none) and the given system colour scheme */
async function open(page: Page, saved: string | null, system: Theme, { withApp = true } = {}) {
  await page.emulateMedia({ colorScheme: system });
  if (saved !== null) {
    await page.addInitScript((theme) => localStorage.setItem('theme', theme), saved);
  }
  // Without the app's scripts React never mounts: what remains is the first paint
  if (!withApp) await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
  await page.goto('./');
}

/** The theme class, brand token and backgrounds of the document */
function themeState(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const app = document.querySelector('#root > div');
    return {
      theme: root.classList.contains('dark') ? 'dark' : root.classList.contains('light') ? 'light' : null,
      usingSystem: root.classList.contains('using-system'),
      brand: getComputedStyle(root).getPropertyValue('--color-ms-brand-500').trim(),
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
      const firstPaint = await themeState(page);
      expect(firstPaint).toMatchObject({ theme: expected, usingSystem, brand: BRAND[expected] });

      await page.unrouteAll();
      await page.reload();
      await expect(page.getByRole('heading', { name: /Convert to Mayan Numerals/ })).toBeVisible();
      const started = await themeState(page);
      expect(started).toMatchObject({ theme: expected, usingSystem, brand: BRAND[expected] });
      // The page behind the app has the app's own background, before and after it starts
      expect(started.bodyBackground).toBe(started.appBackground);
      expect(firstPaint.bodyBackground).toBe(started.bodyBackground);
    });
  }

  for (const system of ['light', 'dark'] as const) {
    test(`uses the ${system} system theme from the first paint when storage is blocked`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(blockStorage);
      await open(page, null, system, { withApp: false });
      expect(await themeState(page)).toMatchObject({ theme: system, usingSystem: true, brand: BRAND[system] });

      await page.unrouteAll();
      await page.reload();
      await expect(page.getByRole('heading', { name: /Convert to Mayan Numerals/ })).toBeVisible();
      expect(await themeState(page)).toMatchObject({ theme: system, usingSystem: true, brand: BRAND[system] });
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
      const styles = await options.evaluateAll((items) =>
        items.map((item) => ({
          selected: item.getAttribute('aria-current') === 'true',
          ring: getComputedStyle(item).boxShadow,
          background: getComputedStyle(item).backgroundColor,
        }))
      );
      // Close it again with its button (the theme menu does not close on Escape)
      await themeButton.click();
      await expect(options).toHaveCount(0);
      return styles;
    };

    const expectSelectionVisible = async (selected: number, theme: Theme) => {
      const styles = await optionStyles();
      styles.forEach((style, index) => {
        expect(style.selected).toBe(index === selected);
        if (index === selected) {
          // Ringed in the active theme's brand colour, on a tinted background
          expect(style.ring).toContain(BRAND_RGB[theme]);
          expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
        } else {
          expect(style.ring).toBe('none');
          expect(style.background).toBe('rgba(0, 0, 0, 0)');
        }
      });
    };

    // System, resolved to the emulated light scheme
    expect(await themeState(page)).toMatchObject({ theme: 'light', brand: BRAND.light });
    await expectSelectionVisible(2, 'light');

    await chooseTheme('Dark');
    expect(await themeState(page)).toMatchObject({ theme: 'dark', usingSystem: false, brand: BRAND.dark });
    await expectSelectionVisible(1, 'dark');

    await chooseTheme('Light');
    expect(await themeState(page)).toMatchObject({ theme: 'light', usingSystem: false, brand: BRAND.light });
    await expectSelectionVisible(0, 'light');

    await chooseTheme('System');
    expect(await themeState(page)).toMatchObject({ theme: 'light', usingSystem: true, brand: BRAND.light });
  });
});
