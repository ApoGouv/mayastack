import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const FIFTY_DIGITS = '12345678901234567890123456789012345678901234567890';
const MAX_DIGITS = '9'.repeat(128);

/** Enters a number and waits for its numeral viewer */
async function showNumber(page: Page, digits: string) {
  await page.getByLabel('Decimal integer').fill(digits);
  const viewer = page.getByRole('group', { name: 'Numeral viewer' });
  await expect(viewer).toBeVisible();
  return viewer;
}

/** The first and last digit stacks (by data-digit-index) visible in the viewer */
function visibleStacks(page: Page) {
  return page.evaluate(() => {
    const viewer = document.querySelector('[role="group"][aria-label="Numeral viewer"]')!;
    const box = viewer.getBoundingClientRect();
    const visible = [...viewer.querySelectorAll('g[data-digit-index]')]
      .filter((g) => {
        const r = g.getBoundingClientRect();
        return r.bottom > box.top + 1 && r.top < box.bottom - 1;
      })
      .map((g) => Number(g.getAttribute('data-digit-index')));
    return { first: Math.min(...visible), last: Math.max(...visible), total: viewer.querySelectorAll('g[data-digit-index]').length };
  });
}

const zoomLevel = (page: Page) => page.getByRole('group', { name: 'Zoom controls' }).locator('[aria-live]');

/** Exports through the real Export menu and returns the downloaded file */
async function exportFile(page: Page, format: 'svg' | 'png') {
  await page.getByRole('group', { name: 'Numeral viewer' }).scrollIntoViewIfNeeded();
  const menuButton = page.getByRole('button', { name: '📦 Export' });
  await expect(menuButton).toBeVisible();
  if ((await menuButton.getAttribute('aria-expanded')) !== 'true') await menuButton.click();
  await page.getByLabel('Export Format').selectOption(format);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: new RegExp(`^Export ${format.toUpperCase()} image`) }).click(),
  ]);
  return { name: download.suggestedFilename(), data: await readFile(await download.path()) };
}

/** Width and height from a PNG's IHDR header */
const pngSize = (png: Buffer) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test.describe('bounded numeral viewport', () => {
  test('keeps the viewer and the numeral result bounded for 1 to 128 digits', async ({ page }) => {
    const result = page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..');
    const heights: Record<string, { viewer: number; result: number }> = {};
    for (const digits of ['7', FIFTY_DIGITS, '9'.repeat(100), MAX_DIGITS]) {
      const viewer = await showNumber(page, digits);
      heights[digits.length] = { viewer: (await viewer.boundingBox())!.height, result: (await result.boundingBox())!.height };
      expect(heights[digits.length].viewer).toBeLessThanOrEqual(480);
    }
    // A single digit keeps its natural height; long numbers stop at the cap
    expect(heights[1].viewer).toBeLessThan(200);
    expect(heights[50].viewer).toBe(480);
    expect(heights[128].viewer).toBe(480);
    // The result no longer grows with the number (the 128-digit SVG alone is 7,920 px tall)
    expect(heights[100].result).toBe(heights[50].result);
    expect(heights[128].result).toBe(heights[50].result);
    expect(heights[128].result).toBeLessThan(800);
  });

  test('starts at the top and scrolls to the middle and the bottom', async ({ page }) => {
    const viewer = await showNumber(page, MAX_DIGITS);
    const start = await visibleStacks(page);
    expect(start.total).toBe(99);
    expect(start.first).toBe(0);

    await viewer.focus();
    // Keyboard scrolling is animated: each key is pressed once the previous scroll has finished
    for (let i = 0; i < 5; i++) {
      const top = await viewer.evaluate((el) => el.scrollTop);
      await page.keyboard.press('PageDown');
      await expect.poll(() => viewer.evaluate((el) => el.scrollTop)).toBeGreaterThan(top);
    }
    const middle = await visibleStacks(page);
    expect(middle.first).toBeGreaterThan(start.last);
    expect(middle.last).toBeLessThan(98);

    await page.keyboard.press('End');
    await expect.poll(async () => (await visibleStacks(page)).last).toBe(98);

    await page.keyboard.press('Home');
    await expect.poll(async () => (await visibleStacks(page)).first).toBe(0);
  });

  test('zooms in, out and resets to 100% at the top', async ({ page }) => {
    const viewer = await showNumber(page, FIFTY_DIGITS);
    const svg = viewer.locator('svg');
    const width = (await svg.boundingBox())!.width;

    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoomLevel(page)).toHaveText('200%');
    expect((await svg.boundingBox())!.width / width).toBeCloseTo(2, 2);

    await page.getByRole('button', { name: 'Zoom out' }).click();
    await expect(zoomLevel(page)).toHaveText('150%');

    await viewer.evaluate((el) => el.scrollTo(200, 1500));
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(zoomLevel(page)).toHaveText('100%');
    expect(await viewer.evaluate((el) => [el.scrollLeft, el.scrollTop])).toEqual([0, 0]);
    expect((await svg.boundingBox())!.width / width).toBeCloseTo(1, 2);
  });

  test('marks the zoom limits', async ({ page }) => {
    await showNumber(page, FIFTY_DIGITS);
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    for (let i = 0; i < 4; i++) await zoomIn.click(); // 150%, 200%, 300%, 400%
    await expect(zoomLevel(page)).toHaveText('400% (maximum zoom)');
    await expect(zoomIn).toHaveAttribute('aria-disabled', 'true');
    // Still focused, and Playwright (like assistive technology) treats it as disabled
    await expect(zoomIn).toBeFocused();
    await expect(zoomIn).toBeDisabled();
  });

  test('uses + - 0 only while the viewer has focus', async ({ page }) => {
    const viewer = await showNumber(page, FIFTY_DIGITS);
    await viewer.focus();
    await page.keyboard.press('+');
    await expect(zoomLevel(page)).toHaveText('150%');
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    await expect(zoomLevel(page)).toHaveText('75%');
    await page.keyboard.press('0');
    await expect(zoomLevel(page)).toHaveText('100%');

    // Typing in the number input is not a shortcut: "0" is typed, the zoom stays
    await page.keyboard.press('+');
    const input = page.getByLabel('Decimal integer');
    await input.focus();
    await input.press('End');
    await input.press('0');
    await expect(input).toHaveValue(`${FIFTY_DIGITS}0`);
    await expect(zoomLevel(page)).toHaveText('150%');
  });

  test('works on a phone-sized screen without widening the page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const viewer = await showNumber(page, MAX_DIGITS);
    expect((await viewer.boundingBox())!.height).toBeLessThanOrEqual(480);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });

  test('also bounds date results', async ({ page }) => {
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    await expect(page.getByRole('img', { name: /^Mayan numerals for day 15, month \d+ and year \d+$/ })).toBeVisible();
    expect((await page.getByRole('group', { name: 'Numeral viewer' }).boundingBox())!.height).toBeLessThanOrEqual(480);
  });
});

test.describe('export with the viewport', () => {
  // The trigger's placement below sm (375px) and from sm (768px)
  for (const width of [375, 768]) {
    test(`offers Export for the largest number wherever the page is scrolled at ${width}px`, async ({ page }) => {
      // In the one-column layout (below 1024px), the base-20 and settings cards follow the result
      // card: at the end of the page it is scrolled out of view, above the viewport
      await page.setViewportSize({ width, height: 400 });
      await showNumber(page, MAX_DIGITS);
      const exportButton = page.getByRole('button', { name: '📦 Export' });
      const resultCard = page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..');

      // Top of the page
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(exportButton).toBeInViewport();

      // End of the page: the result card is out of view
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const pageEnd = await page.evaluate(() => window.scrollY);
      expect(pageEnd).toBeGreaterThan(0);
      await expect(resultCard).not.toBeInViewport();
      await expect(exportButton).toBeInViewport();

      // Export works from there, with its whole dialog in view, without scrolling the page
      await exportButton.click();
      await expect(exportButton).toHaveAttribute('aria-expanded', 'true');
      const dialog = page.getByRole('dialog', { name: 'Export Options' });
      const dialogExport = page.getByRole('button', { name: /^Export SVG image/ });
      for (const control of [dialog, page.getByLabel('Export Format'), page.getByLabel('Size Preset'), dialogExport]) {
        await expect(control).toBeInViewport({ ratio: 1 });
      }
      const [download] = await Promise.all([page.waitForEvent('download'), dialogExport.click()]);
      expect(download.suggestedFilename()).toBe('mayan-numeral-number-9999999999...9999999999-128-digits.svg');
      expect(await page.evaluate(() => window.scrollY)).toBe(pageEnd);
      await expect(resultCard).not.toBeInViewport();
      await exportButton.click(); // close the menu
      await expect(exportButton).toBeInViewport();

      // No result, no Export
      await page.getByLabel('Decimal integer').fill('12.5');
      await expect(exportButton).toHaveCount(0);
    });
  }

  test('exports the same complete SVG before and after zooming and scrolling', async ({ page }) => {
    const viewer = await showNumber(page, MAX_DIGITS);
    const before = await exportFile(page, 'svg');

    await page.getByRole('button', { name: '📦 Export' }).click(); // close the menu
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await viewer.evaluate((el) => el.scrollTo(100, 12000));
    const after = await exportFile(page, 'svg');

    expect(after.name).toBe('mayan-numeral-number-9999999999...9999999999-128-digits.svg');
    expect(after.data.equals(before.data)).toBe(true);
    const svg = after.data.toString('utf-8');
    expect(svg).toContain('width="350" height="7920" viewBox="0 0 350 7920"');
    expect(svg.match(/data-digit-index=/g)).toHaveLength(99);
  });

  test('exports a complete, identical PNG at the original size before and after zooming', async ({ page }) => {
    const viewer = await showNumber(page, FIFTY_DIGITS);
    const before = await exportFile(page, 'png');

    await page.getByRole('button', { name: '📦 Export' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await viewer.evaluate((el) => el.scrollTo(50, 800));
    const after = await exportFile(page, 'png');

    expect(after.name).toBe('mayan-numeral-number-1234567890...1234567890-50-digits.png');
    // 38 base-20 digits × 80 units tall, 350 units wide: the whole numeral
    expect(pngSize(after.data)).toEqual({ width: 350, height: 3040 });
    expect(after.data.equals(before.data)).toBe(true);
  });
});

test.describe('PNG export size limits', () => {
  /** Opens the Export menu with the given format selected */
  async function openExportMenu(page: Page, format: 'svg' | 'png') {
    await page.getByRole('button', { name: '📦 Export' }).click();
    await page.getByLabel('Export Format').selectOption(format);
  }

  test('marks PNG sizes that are too large, before they can be chosen', async ({ page }) => {
    await showNumber(page, MAX_DIGITS);
    await openExportMenu(page, 'png');

    const sizes = page.getByLabel('Size Preset');
    await expect(sizes.getByRole('option', { name: /^Original Size \(350×7920px\)$/ })).toBeEnabled();
    await expect(sizes.getByRole('option', { name: /^Custom Size/ })).toBeEnabled();
    // Within the limits at 128 digits: Small and Medium; only Large is too tall
    await expect(sizes.getByRole('option', { name: /^Small \(600×13577px\)$/ })).toBeEnabled();
    await expect(sizes.getByRole('option', { name: /^Medium \(1200×27154px\)$/ })).toBeEnabled();
    await expect(sizes.getByRole('option', { name: /^Large \(2400×54309px\) – PNG too large$/ })).toBeDisabled();
  });

  test('explains an unsupported PNG size and still exports it as SVG', async ({ page }) => {
    await showNumber(page, MAX_DIGITS);
    await openExportMenu(page, 'svg');
    await page.getByLabel('Size Preset').selectOption('large');

    // Switching to PNG keeps the chosen size, explains why it is unavailable and blocks the export
    await page.getByLabel('Export Format').selectOption('png');
    await expect(page.getByRole('alert')).toHaveText(
      'PNG isn’t available at this size. PNG export is limited to 32,767 px in width and height, the most some browsers can draw; this one would be 2,400 × 54,309 px. Choose a smaller size, or export as SVG.'
    );
    await expect(page.getByRole('button', { name: /^Export PNG image/ })).toBeDisabled();

    // The same size as SVG exports the complete numeral at that size
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.getByLabel('Export Format').selectOption('svg');
        await page.getByRole('button', { name: /^Export SVG image/ }).click();
      })(),
    ]);
    const svg = (await readFile(await download.path())).toString('utf-8');
    expect(svg).toContain('width="2400" height="54309" viewBox="0 0 350 7920"');
    expect(svg.match(/data-digit-index=/g)).toHaveLength(99);
  });

  test('offers the real sizes immediately after a number is entered, with no transient 0 × 0', async ({ page }) => {
    await page.getByLabel('Decimal integer').fill(FIFTY_DIGITS);
    await openExportMenu(page, 'png');

    const sizes = page.getByLabel('Size Preset');
    await expect(sizes.getByRole('option', { name: 'Original Size (350×3040px)' })).toBeEnabled();
    await expect(sizes.getByRole('option', { name: 'Small (600×5211px)' })).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Export PNG image/ })).toBeEnabled();
  });

  test('exports the complete PNG of the largest number at its original size', async ({ page }) => {
    await showNumber(page, MAX_DIGITS);
    const png = await exportFile(page, 'png');

    expect(png.name).toBe('mayan-numeral-number-9999999999...9999999999-128-digits.png');
    expect(pngSize(png.data)).toEqual({ width: 350, height: 7920 });
  });
});

test.describe('base-20 representation', () => {
  // Changed deliberately in UI-07: Number mode's formula is its own region, named after the
  // "Positional Sum Formula" label, with "+" between the terms and spoken exponents
  const representation = (page: Page) => page.getByRole('region', { name: 'Positional Sum Formula' });
  const resultTop = async (page: Page) =>
    (await page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..').boundingBox())!.y;

  test('stops growing with the number, so the page stays the same height', async ({ page }) => {
    await showNumber(page, '9'.repeat(100));
    const at100 = { box: (await representation(page).boundingBox())!.height, result: await resultTop(page) };
    await showNumber(page, MAX_DIGITS);
    const atMax = { box: (await representation(page).boundingBox())!.height, result: await resultTop(page) };

    // Capped: more digits, same height
    expect(atMax.box).toBe(at100.box);
    expect(atMax.result).toBe(at100.result);
    expect(atMax.box).toBeLessThan(400);
  });

  test('keeps the complete, exact representation of the largest number', async ({ page }) => {
    await showNumber(page, MAX_DIGITS);
    const html = await representation(page).innerHTML();
    // Each term: the emphasised digit, then "× 20" and its exponent
    const terms = [...html.matchAll(/>(\d+)<\/span> × 20<sup aria-hidden="true">(\d+)<\/sup>/g)];

    expect(terms).toHaveLength(99);
    expect(terms.reduce((sum, [, digit, exponent]) => sum + BigInt(digit) * 20n ** BigInt(exponent), 0n)).toBe(BigInt(MAX_DIGITS));
  });

  test('can be scrolled from beginning to end with the keyboard', async ({ page }) => {
    await showNumber(page, MAX_DIGITS);
    const region = representation(page);
    const position = () => region.evaluate((el) => ({ top: el.scrollTop, atEnd: el.scrollTop + el.clientHeight >= el.scrollHeight - 1 }));

    await region.focus();
    await expect(region).toBeFocused();
    // Keyboard scrolling is animated: each key is pressed once the previous scroll has finished
    await page.keyboard.press('End');
    await expect.poll(async () => (await position()).atEnd).toBe(true);
    await page.keyboard.press('Home');
    await expect.poll(async () => (await position()).top).toBe(0);
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await position()).top).toBeGreaterThan(0);
  });

  test('stays plain text, at its natural height, for small numbers and dates', async ({ page }) => {
    await showNumber(page, '123');
    const base20 = page.getByRole('heading', { name: 'Base-20 Representation', exact: true }).locator('..');
    // As screen readers get it: exponents in words, not "6 × 201"
    await expect.poll(() => base20.ariaSnapshot()).toContain('- text: 6 × 20 to the power of 1 + 3 × 20 to the power of 0\n');
    await expect(representation(page)).toHaveCount(0);

    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    await expect(page.getByText('15 × 200', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: /in base 20, expanded form/ })).toHaveCount(0);
  });
});

test.describe('date input', () => {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /** The expanded base-20 HTML of a number, e.g. "1 × 20<sup>1</sup> • 5 × 20<sup>0</sup>" for 25 */
  const expanded = (n: number) => {
    const digits: number[] = [];
    for (let rest = n; rest > 0 || digits.length === 0; rest = Math.floor(rest / 20)) digits.unshift(rest % 20);
    return digits.map((digit, i) => `${digit} × 20<sup>${digits.length - 1 - i}</sup>`).join(' • ');
  };

  /** The base-20 representation shown under a label (Day, Month or Year) */
  const representation = (page: Page, label: string) =>
    page.getByText(label, { exact: true }).locator('xpath=following-sibling::div[1]');

  /** The day, month and year of the calendar day that has focus, from its name */
  const focusedDay = async (page: Page) => {
    const name = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
    const [, month, day, year] = /^Choose \w+, (\w+) (\d+)\w\w, (\d{4})$/.exec(name)!;
    return { day: Number(day), month: MONTHS.indexOf(month) + 1, year: Number(year) };
  };

  const expectRepresentations = async (page: Page, date: { day: number; month: number; year: number }) => {
    await expect(representation(page, 'Day')).toHaveJSProperty('innerHTML', expanded(date.day));
    await expect(representation(page, 'Month')).toHaveJSProperty('innerHTML', expanded(date.month));
    await expect(representation(page, 'Year')).toHaveJSProperty('innerHTML', expanded(date.year));
  };

  test('can open the calendar and choose and change a date with the keyboard alone', async ({ page }) => {
    const field = page.getByLabel('Date input');
    const calendarDays = page.getByRole('gridcell', { name: /^Choose / });
    await page.getByRole('radio', { name: 'Date' }).check();

    // Tab from the mode selection opens the calendar on the field
    await page.keyboard.press('Tab');
    await expect(field).toBeFocused();
    await expect(calendarDays.first()).toBeVisible();

    // Escape closes it, and Enter reopens it
    await page.keyboard.press('Escape');
    await expect(calendarDays).toHaveCount(0);
    await expect(field).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(calendarDays.first()).toBeVisible();

    // The arrow keys move through the days and Enter chooses one, closing the calendar
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    const chosen = await focusedDay(page);
    await page.keyboard.press('Enter');
    await expect(calendarDays).toHaveCount(0);
    await expect(field).toBeFocused();
    const pad = (n: number) => String(n).padStart(2, '0');
    await expect(field).toHaveValue(`${pad(chosen.day)}-${pad(chosen.month)}-${chosen.year}`);
    await expectRepresentations(page, chosen);

    // Choosing another date updates the representations
    await page.keyboard.press('ArrowDown');
    await expect(calendarDays.first()).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const changed = await focusedDay(page);
    await page.keyboard.press('Enter');
    await expect(field).toHaveValue(`${pad(changed.day)}-${pad(changed.month)}-${changed.year}`);
    await expectRepresentations(page, changed);
  });

  test('still opens and chooses a date with the mouse', async ({ page }) => {
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    await expect(representation(page, 'Day')).toHaveJSProperty('innerHTML', expanded(15));

    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 16th, \d{4}$/ }).first().click();
    await expect(page.getByRole('gridcell', { name: /^Choose / })).toHaveCount(0);
    await expect(representation(page, 'Day')).toHaveJSProperty('innerHTML', expanded(16));
  });
});

test.describe('custom export size', () => {
  test('exports a PNG at the width and height typed from the keyboard', async ({ page }) => {
    await showNumber(page, '123');
    await page.getByRole('button', { name: '📦 Export' }).click();
    await page.getByLabel('Export Format').selectOption('png');
    await page.getByLabel('Size Preset').selectOption('custom');

    const width = page.getByLabel('Width (px)');
    const height = page.getByLabel('Height (px)');
    const exportButton = page.getByRole('button', { name: /^Export PNG image/ });

    // Clearing a field leaves it empty, with a message, and nothing to export
    await width.fill('');
    await expect(width).toHaveValue('');
    await expect(width).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter a width from 100 to 5,000 px.')).toBeVisible();
    await expect(exportButton).toBeDisabled();

    // Out-of-range values are reported, not changed
    await width.pressSequentially('50');
    await expect(width).toHaveValue('50');
    await expect(page.getByText('Width must be from 100 to 5,000 px.')).toBeVisible();
    await expect(exportButton).toBeDisabled();

    await width.fill('');
    await width.pressSequentially('500');
    await height.fill('');
    await height.pressSequentially('400');
    await expect(width).toHaveValue('500');
    await expect(height).toHaveValue('400');
    await expect(exportButton).toBeEnabled();

    const png = await exportFile(page, 'png');
    expect(pngSize(png.data)).toEqual({ width: 500, height: 400 });
  });
});

test.describe('browser storage', () => {
  test('the app works with default settings when site storage is blocked', async ({ page }) => {
    // As in a browser that blocks site data: reading localStorage itself throws
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await page.goto('./');

    await expect(page.getByRole('heading', { name: /Convert to Mayan Numerals/ })).toBeVisible();
    const themeButton = page.getByRole('button', { name: /^Theme selector/ });
    await expect(themeButton).toHaveAttribute('aria-label', 'Theme selector (current: system)');

    // Settings still change for the visit, without being saved
    await themeButton.click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await expect(themeButton).toHaveAttribute('aria-label', 'Theme selector (current: dark)');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await themeButton.click();
    await page.getByRole('menuitem', { name: 'Light' }).click();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);

    await showNumber(page, '123');
    const grid = page.getByRole('switch', { name: 'Show Grid:' });
    await grid.click();
    await expect(grid).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('button', { name: '📦 Export' })).toBeVisible();

    // Colours too, including the save that waits for the picker to settle, which fails quietly
    await page.clock.install();
    await page.getByRole('button', { name: 'Glyph color:' }).click();
    await page.getByRole('slider', { name: 'Alpha' }).press('ArrowLeft');
    await expect(page.locator('svg.mep-svg')).toHaveAttribute('style', /rgba\(0, 0, 0, 0\.95\)/);
    await page.clock.runFor(300);
    expect(errors).toEqual([]);
  });

  /** The glyph colour (from the SVG's style) and the background fill of the rendered numeral */
  const renderedColours = (page: Page) =>
    page.locator('svg.mep-svg').evaluate((svg) => ({
      glyph: (svg as SVGSVGElement).style.color,
      background: svg.querySelector('rect')!.getAttribute('fill'),
    }));

  test('starts from valid saved colours, alpha included, and ignores invalid ones', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mayastack:backgroundColor', '{"r":10,"g":20,"b":30,"a":0.5}');
      localStorage.setItem('mayastack:glyphColor', '{"r":300,"g":0,"b":0,"a":1}');
    });
    await page.reload();

    // The initial 0 is shown: its numeral has the saved background and the default glyph colour
    expect(await renderedColours(page)).toEqual({ glyph: 'rgb(0, 0, 0)', background: 'rgba(10, 20, 30, 0.5)' });
    const exported = (await exportFile(page, 'svg')).data.toString('utf-8');
    expect(exported).toContain('fill="rgba(10, 20, 30, 0.5)"');
  });

  test('saves colours chosen with the picker once they settle, or at once when the page is left', async ({ page }) => {
    // Paused, timers stand still until the test moves them, so only leaving the page can save a
    // waiting colour
    await page.clock.install();
    await page.reload();
    await showNumber(page, '123');
    await page.clock.pauseAt(Date.now() + 1000);
    const saved = () =>
      page.evaluate(() => [localStorage.getItem('mayastack:backgroundColor'), localStorage.getItem('mayastack:glyphColor')]);

    // The background colour: saved 300 ms after the last change
    await page.getByRole('button', { name: 'Background color:' }).click();
    await page.getByRole('slider', { name: 'Color' }).press('ArrowRight');
    await page.getByRole('slider', { name: 'Alpha' }).press('ArrowLeft');
    await page.clock.runFor(299);
    expect(await saved()).toEqual([null, null]);
    await page.clock.runFor(1);
    const [background] = await saved();
    expect(JSON.parse(background!)).toMatchObject({ a: 0.95 });
    await page.keyboard.press('Escape');

    // The glyph colour: left waiting, then saved by the reload
    await page.getByRole('button', { name: 'Glyph color:' }).click();
    await page.getByRole('slider', { name: 'Color' }).press('ArrowRight');
    await page.getByRole('slider', { name: 'Alpha' }).press('ArrowLeft');
    expect((await saved())[1]).toBeNull();
    const chosen = await renderedColours(page);
    expect(chosen.glyph).not.toBe('rgb(0, 0, 0)');

    await page.reload();
    expect(JSON.parse((await saved())[1]!)).toMatchObject({ a: 0.95 });
    expect(await renderedColours(page)).toEqual(chosen);
    // The export uses the restored colours, alpha included
    const exported = (await exportFile(page, 'svg')).data.toString('utf-8');
    expect(exported).toContain(`fill="${chosen.background}"`);
    expect(exported).toMatch(/style="color: rgba\(\d+, \d+, \d+, 0\.95\);?"/);
  });
});

test.describe('export filenames', () => {
  test('names SVG and PNG exports after the number', async ({ page }) => {
    await showNumber(page, '123');
    expect((await exportFile(page, 'svg')).name).toBe('mayan-numeral-number-123.svg');
    expect((await exportFile(page, 'png')).name).toBe('mayan-numeral-number-123.png');
  });

  test('writes out numbers of up to 30 digits and abbreviates longer ones', async ({ page }) => {
    const thirtyDigits = '123456789012345678901234567890';
    await showNumber(page, thirtyDigits);
    expect((await exportFile(page, 'svg')).name).toBe(`mayan-numeral-number-${thirtyDigits}.svg`);

    await showNumber(page, MAX_DIGITS);
    const svg = await exportFile(page, 'svg');
    expect(svg.name).toBe('mayan-numeral-number-9999999999...9999999999-128-digits.svg');
    expect(svg.name.length).toBeLessThanOrEqual(59);
    // Only the name is shortened: the file holds the complete numeral
    expect(svg.data.toString('utf-8').match(/data-digit-index=/g)).toHaveLength(99);
  });

  test('names date exports after the day, month and year', async ({ page }) => {
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    const [, month, year] = (await page.getByLabel('Date input').inputValue()).split('-').map(Number);

    expect((await exportFile(page, 'svg')).name).toBe(`mayan-numeral-date-15-${month}-${year}.svg`);
    expect((await exportFile(page, 'png')).name).toBe(`mayan-numeral-date-15-${month}-${year}.png`);
  });
});
