import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const FIFTY_DIGITS = '12345678901234567890123456789012345678901234567890';
const MAX_DIGITS = '9'.repeat(500);

/** Enters a number and waits for its numeral viewer */
async function showNumber(page: Page, digits: string) {
  await page.getByLabel('Number input').fill(digits);
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
  test('keeps the viewer and the numeral result bounded for 1 to 500 digits', async ({ page }) => {
    const result = page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..');
    const heights: Record<string, { viewer: number; result: number }> = {};
    for (const digits of ['7', FIFTY_DIGITS, '9'.repeat(400), MAX_DIGITS]) {
      const viewer = await showNumber(page, digits);
      heights[digits.length] = { viewer: (await viewer.boundingBox())!.height, result: (await result.boundingBox())!.height };
      expect(heights[digits.length].viewer).toBeLessThanOrEqual(480);
    }
    // A single digit keeps its natural height; long numbers stop at the cap
    expect(heights[1].viewer).toBeLessThan(200);
    expect(heights[50].viewer).toBe(480);
    expect(heights[500].viewer).toBe(480);
    // The result no longer grows with the number (the 500-digit SVG alone is about 31,000 px tall)
    expect(heights[400].result).toBe(heights[50].result);
    expect(heights[500].result).toBe(heights[50].result);
    expect(heights[500].result).toBeLessThan(800);
  });

  test('starts at the top and scrolls to the middle and the bottom', async ({ page }) => {
    const viewer = await showNumber(page, MAX_DIGITS);
    const start = await visibleStacks(page);
    expect(start.total).toBe(385);
    expect(start.first).toBe(0);

    await viewer.focus();
    for (let i = 0; i < 20; i++) await page.keyboard.press('PageDown');
    const middle = await visibleStacks(page);
    expect(middle.first).toBeGreaterThan(start.last);
    expect(middle.last).toBeLessThan(384);

    await page.keyboard.press('End');
    await expect.poll(async () => (await visibleStacks(page)).last).toBe(384);

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
    const input = page.getByLabel('Number input');
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
  test('offers Export for the largest number wherever the page is scrolled', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await showNumber(page, MAX_DIGITS);
    const exportButton = page.getByRole('button', { name: '📦 Export' });
    const resultCard = page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..');

    // Top of the page: the result card is below the fold
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(resultCard).not.toBeInViewport();
    await expect(exportButton).toBeInViewport();

    // Bottom of the page
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(exportButton).toBeInViewport();

    // No result, no Export
    await page.getByLabel('Number input').fill('12.5');
    await expect(exportButton).toHaveCount(0);
  });

  test('exports the same complete SVG before and after zooming and scrolling', async ({ page }) => {
    const viewer = await showNumber(page, MAX_DIGITS);
    const before = await exportFile(page, 'svg');

    await page.getByRole('button', { name: '📦 Export' }).click(); // close the menu
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await viewer.evaluate((el) => el.scrollTo(100, 12000));
    const after = await exportFile(page, 'svg');

    expect(after.name).toBe(`mayan-numeral-number-${MAX_DIGITS}.svg`);
    expect(after.data.equals(before.data)).toBe(true);
    const svg = after.data.toString('utf-8');
    expect(svg).toContain('width="350" height="30800" viewBox="0 0 350 30800"');
    expect(svg.match(/data-digit-index=/g)).toHaveLength(385);
  });

  test('exports a complete, identical PNG at the original size before and after zooming', async ({ page }) => {
    const viewer = await showNumber(page, FIFTY_DIGITS);
    const before = await exportFile(page, 'png');

    await page.getByRole('button', { name: '📦 Export' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await viewer.evaluate((el) => el.scrollTo(50, 800));
    const after = await exportFile(page, 'png');

    expect(after.name).toBe(`mayan-numeral-number-${FIFTY_DIGITS}.png`);
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
    await expect(sizes.getByRole('option', { name: /^Original Size \(350×30800px\)$/ })).toBeEnabled();
    await expect(sizes.getByRole('option', { name: /^Custom Size/ })).toBeEnabled();
    for (const name of [/^Small .* – PNG too large$/, /^Medium .* – PNG too large$/, /^Large .* – PNG too large$/]) {
      await expect(sizes.getByRole('option', { name })).toBeDisabled();
    }
  });

  test('explains an unsupported PNG size and still exports it as SVG', async ({ page }) => {
    await showNumber(page, MAX_DIGITS);
    await openExportMenu(page, 'svg');
    await page.getByLabel('Size Preset').selectOption('large');

    // Switching to PNG keeps the chosen size, explains why it is unavailable and blocks the export
    await page.getByLabel('Export Format').selectOption('png');
    await expect(page.getByRole('alert')).toHaveText(
      'PNG isn’t available at this size. PNG export is limited to 32,767 px in width and height, the most some browsers can draw; this one would be 2,400 × 211,200 px. Choose a smaller size, or export as SVG.'
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
    expect(svg).toContain('width="2400" height="211200" viewBox="0 0 350 30800"');
    expect(svg.match(/data-digit-index=/g)).toHaveLength(385);
  });

  test('offers the real sizes immediately after a number is entered, with no transient 0 × 0', async ({ page }) => {
    await page.getByLabel('Number input').fill(FIFTY_DIGITS);
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

    expect(png.name).toBe(`mayan-numeral-number-${MAX_DIGITS}.png`);
    expect(pngSize(png.data)).toEqual({ width: 350, height: 30800 });
  });
});
