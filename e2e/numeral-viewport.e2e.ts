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
    // Changed deliberately in UI-13: the stage has the screen's height (448 px at 1280 × 720,
    // the default), whatever the numeral's, instead of a 480 px maximum and a short numeral's own
    const result = page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..');
    const heights: Record<string, { viewer: number; result: number }> = {};
    for (const digits of ['7', FIFTY_DIGITS, '9'.repeat(100), MAX_DIGITS]) {
      const viewer = await showNumber(page, digits);
      heights[digits.length] = { viewer: (await viewer.boundingBox())!.height, result: (await result.boundingBox())!.height };
      expect(heights[digits.length].viewer, `${digits.length} digits`).toBe(448);
    }
    // The result no longer grows with the number (the 128-digit SVG alone is 7,920 px tall)
    expect(heights[1].result).toBe(heights[50].result);
    expect(heights[100].result).toBe(heights[50].result);
    expect(heights[128].result).toBe(heights[50].result);
    expect(heights[128].result).toBeLessThan(720);
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

  test('keeps the stage’s structure: the scroller, a padded, clipping stage box, then the slab', async ({ page }) => {
    // Changed deliberately in UI-13: the stage spans the viewer card's content (card less its
    // 16 px padding at each side) instead of 384 px, and its height is the screen's
    for (const [width, height] of [[375, 900], [768, 900], [1280, 900]] as const) {
      await page.setViewportSize({ width, height });
      const viewer = await showNumber(page, FIFTY_DIGITS);
      const card = (await page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..').boundingBox())!;
      const box = (await viewer.boundingBox())!;
      expect(box.width, `${width}px`).toBe(card.width - 32);
      expect(box.height, `${width}px`).toBe(width >= 1024 ? 620 : 480);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px`).toBeLessThanOrEqual(width);
      const structure = await viewer.evaluate((scroller) => {
        const stage = scroller.firstElementChild as HTMLElement;
        const style = getComputedStyle(stage);
        const s = stage.getBoundingClientRect();
        return {
          children: scroller.children.length,
          stage: stage.hasAttribute('data-numeral-stage'),
          overflow: style.overflow,
          padding: style.padding,
          // The stage box spans the whole scrollable area, and at least the scroller
          covers: s.width === scroller.scrollWidth && s.height === scroller.scrollHeight
            && s.width >= scroller.clientWidth && s.height >= scroller.clientHeight,
          wrapper: stage.firstElementChild!.getAttribute('role'),
          scrollers: [...scroller.querySelectorAll('*')].filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)).length,
        };
      });
      expect(structure, `${width}px`).toEqual({
        children: 1, stage: true, overflow: 'clip', padding: '16px', covers: true, wrapper: 'img', scrollers: 0,
      });
    }
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

test.describe('numeral scale and position', () => {
  const LEVELS = ['25%', '50%', '75%', '100%', '150%', '200%', '300%', '400%'];

  /** Steps the zoom with its buttons to the given level, e.g. "50%" */
  async function zoomTo(page: Page, level: string) {
    for (;;) {
      const current = (await zoomLevel(page).textContent())!.split(' ')[0];
      const steps = LEVELS.indexOf(level) - LEVELS.indexOf(current);
      if (steps === 0) return;
      await page.getByRole('button', { name: steps > 0 ? 'Zoom in' : 'Zoom out' }).click();
      await expect(zoomLevel(page)).not.toHaveText(new RegExp(`^${current}`));
    }
  }

  /**
   * The numeral as laid out in the viewer, measured from the boxes on screen: its SVG's size in CSS
   * px and logical size in SVG units, its left edge in the scrollable area, the scroll position,
   * the point at the viewer's centre in SVG units, and any page-level horizontal overflow
   */
  const measure = (page: Page) =>
    page.evaluate(() => {
      const viewer = document.querySelector<HTMLElement>('[role="group"][aria-label="Numeral viewer"]')!;
      const svg = viewer.querySelector('svg')!;
      // The scroller's padding box, inside its border: the scrollable area's origin, at scroll 0
      const box = viewer.getBoundingClientRect();
      const v = { left: box.left + viewer.clientLeft, top: box.top + viewer.clientTop };
      const n = svg.getBoundingClientRect();
      const units = svg.viewBox.baseVal;
      const pxPerUnit = n.width / units.width;
      return {
        width: n.width,
        height: n.height,
        units: { width: units.width, height: units.height },
        left: n.left - v.left + viewer.scrollLeft,
        top: n.top - v.top + viewer.scrollTop,
        scrollLeft: viewer.scrollLeft,
        scrollTop: viewer.scrollTop,
        scrollWidth: viewer.scrollWidth,
        scrollHeight: viewer.scrollHeight,
        clientWidth: viewer.clientWidth,
        clientHeight: viewer.clientHeight,
        sideways: viewer.scrollWidth - viewer.clientWidth,
        pxPerUnit,
        centre: {
          x: (v.left + viewer.clientWidth / 2 - n.left) / pxPerUnit,
          y: (v.top + viewer.clientHeight / 2 - n.top) / pxPerUnit,
        },
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

  /** Expects a measured centre point to be within `px` CSS pixels of a point, at its zoom level */
  const expectCentre = (m: Awaited<ReturnType<typeof measure>>, point: { x: number; y: number }, px: number, what: string) => {
    expect(Math.abs(m.centre.x - point.x) * m.pxPerUnit, `${what}: x`).toBeLessThanOrEqual(px);
    expect(Math.abs(m.centre.y - point.y) * m.pxPerUnit, `${what}: y`).toBeLessThanOrEqual(px);
  };

  /** Chooses the 15th of the calendar's month in Date mode and waits for its numeral */
  async function showDate(page: Page) {
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    await expect(page.getByRole('img', { name: /^Mayan numerals for day 15/ })).toBeVisible();
  }

  test('shows the numeral 350 CSS px wide at 100% at every viewport width, in Number and Date modes', async ({ page }) => {
    for (const width of [320, 375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const digits of ['7', FIFTY_DIGITS]) {
        await showNumber(page, digits);
        const m = await measure(page);
        expect(m.units.width, `${width}px`).toBe(350);
        expect(m.width, `${width}px, ${digits.length} digits`).toBe(350);
        expect(m.height, `${width}px, ${digits.length} digits`).toBe(m.units.height);
      }
    }
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('./');
      await showDate(page);
      const m = await measure(page);
      expect(m.units.width, `date, ${width}px`).toBe(350);
      expect(m.width, `date, ${width}px`).toBe(350);
    }
  });

  test('scales the numeral exactly at every zoom level, without page-level horizontal overflow', async ({ page }) => {
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await showNumber(page, FIFTY_DIGITS);
      for (const level of LEVELS) {
        await zoomTo(page, level);
        const zoom = parseFloat(level) / 100;
        const m = await measure(page);
        expect(m.width, `${width}px at ${level}`).toBe(350 * zoom);
        expect(m.height, `${width}px at ${level}`).toBe(m.units.height * zoom);
        expect(m.pageOverflow, `${width}px at ${level}`).toBe(0);
      }
      await page.getByRole('button', { name: 'Reset' }).click();
    }
  });

  test('centres a numeral narrower than the viewer, which then has no sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [digits, level] of [['7', '100%'], [FIFTY_DIGITS, '100%'], [FIFTY_DIGITS, '50%'], [FIFTY_DIGITS, '25%']] as const) {
      await showNumber(page, digits);
      await zoomTo(page, level);
      const m = await measure(page);
      expect(m.width, `${digits.length} digits at ${level}`).toBeLessThan(m.clientWidth);
      expect(m.left, `${digits.length} digits at ${level}`).toBeCloseTo((m.clientWidth - m.width) / 2, 3);
      expect(m.sideways, `${digits.length} digits at ${level}`).toBe(0);
      expect(m.centre.x, `${digits.length} digits at ${level}`).toBeCloseTo(175, 3);
      await page.getByRole('button', { name: 'Reset' }).click();
    }
    // Also on a phone, once zoomed out below the viewer's width
    await page.setViewportSize({ width: 375, height: 667 });
    await zoomTo(page, '50%');
    const m = await measure(page);
    expect(m.left).toBeCloseTo((m.clientWidth - 175) / 2, 3);
    expect(m.sideways).toBe(0);
  });

  test('starts a new numeral wider than the viewer at its top, with its horizontal centre in view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const viewer = await showNumber(page, FIFTY_DIGITS);
    const start = await measure(page);
    expect(start.width).toBeGreaterThan(start.clientWidth);
    expect(start.scrollTop).toBe(0);
    // Scroll positions are whole pixels: the centre is within half a pixel
    expect(Math.abs(start.scrollLeft - start.sideways / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(start.centre.x - 175)).toBeLessThanOrEqual(0.5);

    // A new numeral, from anywhere in the previous one, and at another zoom level
    for (const [digits, level] of [[MAX_DIGITS, '100%'], [FIFTY_DIGITS, '200%']] as const) {
      await zoomTo(page, level);
      await viewer.evaluate((el) => el.scrollTo(0, 1500));
      await showNumber(page, digits);
      await expect.poll(() => viewer.evaluate((el) => el.scrollTop), `${digits.length} digits at ${level}`).toBe(0);
      const m = await measure(page);
      expect(Math.abs(m.centre.x - 175) * m.pxPerUnit, `${digits.length} digits at ${level}`).toBeLessThanOrEqual(0.5);
    }
  });

  test('resets to 100% at the top, centred horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const viewer = await showNumber(page, FIFTY_DIGITS);
    // From another zoom level, and from 100%
    for (const level of ['200%', '100%']) {
      await zoomTo(page, level);
      await viewer.evaluate((el) => el.scrollTo(0, 1500));
      await page.getByRole('button', { name: 'Reset' }).click();
      await expect(zoomLevel(page)).toHaveText('100%');
      const m = await measure(page);
      expect(m.scrollTop, `from ${level}`).toBe(0);
      expect(Math.abs(m.centre.x - 175), `from ${level}`).toBeLessThanOrEqual(0.5);
    }
  });

  test('keeps the point at the viewer’s centre in place while zooming a numeral wider than the viewer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const viewer = await showNumber(page, FIFTY_DIGITS);
    await viewer.evaluate((el) => el.scrollTo(10, 900));
    let previous = await measure(page);
    for (const level of ['150%', '200%', '300%', '400%', '300%', '200%', '150%', '100%']) {
      await zoomTo(page, level);
      const m = await measure(page);
      expect(m.width, level).toBeGreaterThan(m.clientWidth);
      // Within the whole-pixel rounding of the scroll position, at the new zoom level
      expectCentre(m, previous.centre, 1, level);
      previous = m;
    }
  });

  test('keeps the point at the viewer’s centre in place while zooming a numeral narrower than the viewer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const viewer = await showNumber(page, FIFTY_DIGITS);
    await zoomTo(page, '50%');
    await viewer.evaluate((el) => el.scrollTo(0, 500));
    const start = await measure(page);
    expect(start.width).toBeLessThan(start.clientWidth);
    expect(start.centre.x).toBeCloseTo(175, 3);
    let previous = start;
    // Narrower, then narrower again, then one step at a time to wider than the viewer and back
    for (const level of ['25%', '50%', '75%', '100%', '150%', '200%', '150%', '100%', '75%', '50%']) {
      await zoomTo(page, level);
      const m = await measure(page);
      expectCentre(m, previous.centre, 1, level);
      // Still the numeral's horizontal centre: off by at most the whole-pixel rounding of the
      // scroll positions on the way (e.g. 86.5 px at 150%), never by a share of the viewer's width
      expect(Math.abs(m.centre.x - 175), level).toBeLessThanOrEqual(1);
      previous = m;
    }
  });

  /** The approved screen sizes and the stage's expected height at each (UI-13, provisional) */
  const SCREENS = [
    { width: 1280, height: 720, stage: 448 }, // the lg minimum, 28rem
    { width: 1280, height: 800, stage: 520 },
    { width: 1440, height: 900, stage: 620 },
    { width: 375, height: 667, stage: 400.2 }, // 60svh
    { width: 375, height: 812, stage: 480 }, // the maximum below lg, 30rem
    { width: 320, height: 568, stage: 340.8 },
  ] as const;

  test('gives the stage the approved height at every approved screen size, the same at every zoom level', async ({ page }) => {
    // Six screen sizes, three zoom levels each, every zoom step waited for
    test.slow();
    const card = page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..');
    for (const screen of SCREENS) {
      const what = `${screen.width} × ${screen.height}`;
      await page.setViewportSize(screen);
      const viewer = await showNumber(page, FIFTY_DIGITS);
      for (const level of ['25%', '100%', '400%']) {
        await zoomTo(page, level);
        const box = (await viewer.boundingBox())!;
        expect(box.height, `${what} at ${level}`).toBeCloseTo(screen.stage, 0);
        expect((await measure(page)).pageOverflow, `${what} at ${level}`).toBe(0);
      }
      // The stage spans the card's content; from lg, where the card sits beside the others, it fits the screen
      const c = (await card.boundingBox())!;
      expect((await viewer.boundingBox())!.width, what).toBe(c.width - 32);
      if (screen.width >= 1024) expect(c.y + c.height, what).toBeLessThanOrEqual(screen.height);
      await page.getByRole('button', { name: 'Reset' }).click();
    }
  });

  test('centres a short numeral both ways in the stage, in Number and Date modes, also while it is wider', async ({ page }) => {
    /** The slab's margins in the scrollable area, and whether the stage scrolls each way */
    const margins = async () => {
      const m = await measure(page);
      return {
        ...m,
        top: m.top, bottom: m.scrollHeight - m.top - m.height,
        left: m.left, right: m.scrollWidth - m.left - m.width,
      };
    };
    for (const screen of SCREENS) {
      // A new numeral at each size: a resize alone keeps the scroll position (see the roadmap)
      await page.setViewportSize(screen);
      await page.goto('./');
      await showNumber(page, '7');
      const m = await margins();
      const what = `${screen.width} × ${screen.height}`;
      // Vertically: centred, with no vertical scrolling
      expect(m.scrollHeight, what).toBe(m.clientHeight);
      expect(Math.abs(m.top - m.bottom), what).toBeLessThanOrEqual(1);
      // Horizontally: centred where it fits; on a phone, wider than the stage, it starts at its centre
      if (m.width + 32 <= m.clientWidth) expect(Math.abs(m.left - m.right), what).toBeLessThanOrEqual(1);
      else expect(Math.abs(m.centre.x - 175), what).toBeLessThanOrEqual(0.5);
    }

    // At 400%, 1,400 px wide and 320 px tall: scrolling sideways, still centred vertically
    for (const screen of [SCREENS[0], SCREENS[4]]) {
      await page.setViewportSize(screen);
      await zoomTo(page, '400%');
      const m = await margins();
      expect(m.sideways).toBeGreaterThan(0);
      expect(m.scrollHeight).toBe(m.clientHeight);
      expect(Math.abs(m.top - m.bottom)).toBeLessThanOrEqual(1);
      await page.getByRole('button', { name: 'Reset' }).click();
    }

    // Date mode's three groups, at most 3 tiers (240 units) tall
    for (const screen of [SCREENS[1], SCREENS[5]]) {
      await page.setViewportSize(screen);
      await page.goto('./');
      await showDate(page);
      const m = await margins();
      expect(m.scrollHeight).toBe(m.clientHeight);
      expect(Math.abs(m.top - m.bottom)).toBeLessThanOrEqual(1);
    }
  });

  test('scrolls a long numeral from its top tier to its bottom tier, with nothing clipped', async ({ page }) => {
    /** Whether the digit stack of an index is drawn whole inside the stage, within its border */
    const wholeInView = (index: number) =>
      page.evaluate((i) => {
        const viewer = document.querySelector<HTMLElement>('[role="group"][aria-label="Numeral viewer"]')!;
        const v = viewer.getBoundingClientRect();
        const g = viewer.querySelector(`g[data-digit-index="${i}"]`)!.getBoundingClientRect();
        return g.height > 0 && g.top >= v.top + viewer.clientTop && g.bottom <= v.top + viewer.clientTop + viewer.clientHeight;
      }, index);
    for (const screen of SCREENS) {
      await page.setViewportSize(screen);
      const viewer = await showNumber(page, MAX_DIGITS);
      for (const level of screen.width === 1280 && screen.height === 720 ? ['100%', '400%'] : ['100%']) {
        await zoomTo(page, level);
        const what = `${screen.width} × ${screen.height} at ${level}`;
        await viewer.evaluate((el) => el.scrollTo(el.scrollLeft, 0));
        const top = await measure(page);
        // The top tier, the highest place value, after the stage's 16 px padding
        expect(top.top, what).toBe(16);
        expect(await wholeInView(0), what).toBe(true);
        await viewer.evaluate((el) => el.scrollTo(el.scrollLeft, el.scrollHeight));
        const bottom = await measure(page);
        // The bottom tier, the units, with the stage's padding below it: the scrollable area is the slab and its padding
        expect(bottom.scrollHeight - bottom.top - bottom.height, what).toBe(16);
        expect(bottom.scrollHeight, what).toBe(bottom.height + 32);
        expect(await wholeInView(98), what).toBe(true);
      }
      await page.getByRole('button', { name: 'Reset' }).click();
    }
  });

  test('keeps the anchor in the numeral’s own coordinates with the stage’s padding, where a share of the scrollable area would not', async ({ page }) => {
    /**
     * Zooms one step from the start of an axis, where the padding counts the most, and expects
     * the centre point to stay within 1 px, while the position a share of the scrollable area
     * (the anchor before UI-13) would give is at least 3 px away, beyond the rounding
     */
    async function step(level: string, axis: 'x' | 'y') {
      await page.getByRole('group', { name: 'Numeral viewer' }).evaluate(
        (el, a) => (a === 'x' ? el.scrollTo(0, el.scrollTop) : el.scrollTo(el.scrollLeft, 0)), axis);
      const before = await measure(page);
      await zoomTo(page, level);
      const after = await measure(page);
      expectCentre(after, before.centre, 1, `${axis} at ${level}`);
      const [offset, client, size, newClient, newSize, actual] = axis === 'x'
        ? [before.scrollLeft, before.clientWidth, before.scrollWidth, after.clientWidth, after.scrollWidth, after.scrollLeft]
        : [before.scrollTop, before.clientHeight, before.scrollHeight, after.clientHeight, after.scrollHeight, after.scrollTop];
      const share = (offset + client / 2) / size;
      const byShare = Math.min(Math.max(share * newSize - newClient / 2, 0), newSize - newClient);
      expect(Math.abs(actual - byShare), `${axis} at ${level}: a share would give ${byShare}`).toBeGreaterThanOrEqual(3);
    }

    // Horizontally: on a narrow phone, where the numeral is wider than the stage
    await page.setViewportSize({ width: 320, height: 568 });
    const viewer = await showNumber(page, FIFTY_DIGITS);
    await zoomTo(page, '200%');
    await viewer.evaluate((el) => el.scrollTo(0, 600));
    for (const level of ['300%', '400%']) await step(level, 'x');

    // Vertically: the largest numeral, from 25%, where the padding is largest against its height
    await page.setViewportSize({ width: 1280, height: 800 });
    await showNumber(page, MAX_DIGITS);
    await zoomTo(page, '25%');
    for (const level of ['50%', '75%', '100%']) await step(level, 'y');
  });

  test('keeps the zoom controls and stage above the floating Export trigger on phones, and the zoom controls and glyphs clear of it on desktop at 100% and 400%', async ({ page }) => {
    // Seven screen and mode combinations, two zoom levels each on desktop
    test.slow();
    const exportButton = page.getByRole('button', { name: '📦 Export' });
    const intersects = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const zoomButtons = () => Promise.all(['Zoom out', 'Zoom in', 'Reset'].map(async (name) =>
      (await page.getByRole('button', { name, exact: true }).boundingBox())!));

    // On phones the trigger floats over the page: with the viewer's controls scrolled to the top
    // of the screen, the controls and the whole stage are above it
    for (const screen of [SCREENS[3], SCREENS[4], SCREENS[5]]) {
      await page.setViewportSize(screen);
      const viewer = await showNumber(page, MAX_DIGITS);
      await page.getByRole('group', { name: 'Zoom controls' }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
      const trigger = (await exportButton.boundingBox())!;
      const stage = (await viewer.boundingBox())!;
      expect(stage.y + stage.height, `${screen.width} × ${screen.height}`).toBeLessThanOrEqual(trigger.y);
      for (const button of await zoomButtons()) expect(intersects(button, trigger)).toBe(false);
    }

    // From lg it covers the stage's bottom-right corner (a known limitation, for UI-11). The
    // trigger does not overlap the zoom controls or glyphs in the tested desktop configurations
    // (100% and 400%, scrolled to the bottom-right corner); other zoom levels are not covered
    for (const screen of [SCREENS[0], SCREENS[1]]) {
      await page.setViewportSize(screen);
      for (const mode of ['number', 'date'] as const) {
        await page.goto('./');
        const viewer = mode === 'number' ? await showNumber(page, MAX_DIGITS) : (await showDate(page), page.getByRole('group', { name: 'Numeral viewer' }));
        for (const level of ['100%', '400%']) {
          await zoomTo(page, level);
          await viewer.evaluate((el) => el.scrollTo(el.scrollWidth, el.scrollHeight));
          const trigger = (await exportButton.boundingBox())!;
          const glyphs = await viewer.locator('g[data-digit-index]').evaluateAll((gs) =>
            gs.map((g) => g.getBoundingClientRect()).filter((r) => r.height > 0).map(({ x, y, width, height }) => ({ x, y, width, height })));
          const what = `${screen.width} × ${screen.height}, ${mode} at ${level}`;
          expect(glyphs.filter((g) => intersects(g, trigger)), what).toEqual([]);
          for (const button of await zoomButtons()) expect(intersects(button, trigger), what).toBe(false);
        }
      }
    }
  });

  // Wider than the viewer at 100% to 400% on a phone; through every level for the vertical anchor
  for (const [width, digits, cycle] of [
    [375, FIFTY_DIGITS, ['400%', '100%']],
    [1280, MAX_DIGITS, ['25%', '400%', '100%']],
  ] as const) {
    test(`returns to the same position after switching between zoom levels repeatedly, without drift, at ${width}px`, async ({ page }) => {
      // Five cycles of up to 14 zoom steps each, every step waited for
      test.slow();
      await page.setViewportSize({ width, height: 900 });
      const viewer = await showNumber(page, digits);
      await page.getByRole('button', { name: 'Reset' }).click();
      await viewer.evaluate((el) => el.scrollTo(20, 2000));
      const start = await measure(page);
      const ends: { scrollLeft: number; scrollTop: number }[] = [];
      for (let i = 0; i < 5; i++) {
        for (const level of cycle) await zoomTo(page, level);
        const m = await measure(page);
        // Within the rounding of the smallest level visited, never further with each cycle
        expectCentre(m, start.centre, width === 375 ? 1 : 4, `${width}px, cycle ${i + 1}`);
        ends.push({ scrollLeft: m.scrollLeft, scrollTop: m.scrollTop });
      }
      expect(ends.slice(1), `${width}px`).toEqual(Array(4).fill(ends[0]));
    });
  }

  test.describe('resizing the screen (UI-13 slice 4.1)', () => {
    /** Waits two frames: for scroll events and resize reports from what happened before */
    const settle = (page: Page) =>
      page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

    /** Resizes the screen and waits until the viewer shows a point at its centre again */
    async function resizeTo(page: Page, size: { width: number; height: number }, point: { x: number; y: number }, what: string) {
      await page.setViewportSize(size);
      await expect.poll(async () => {
        const m = await measure(page);
        return Math.max(Math.abs(m.centre.x - point.x), Math.abs(m.centre.y - point.y)) * m.pxPerUnit;
      }, what).toBeLessThanOrEqual(1);
    }

    test('keeps the point at the viewer’s centre, both ways, through resizes', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      const viewer = await showNumber(page, MAX_DIGITS);
      await zoomTo(page, '400%');
      await viewer.evaluate((el) => el.scrollTo(300, 5000));
      await settle(page);
      const start = await measure(page);
      expect(start.width).toBeGreaterThan(start.clientWidth);

      // Slice 4 measured a shift of 188 CSS px from 1280 to 375 px at 400%, before this slice
      for (const size of [{ width: 375, height: 667 }, { width: 320, height: 568 }, { width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
        await resizeTo(page, size, start.centre, `${size.width} × ${size.height}`);
        const m = await measure(page);
        expect(m.pageOverflow, `${size.width} × ${size.height}`).toBe(0);
      }
    });

    test('keeps a new numeral’s start, and the start after Reset, through resizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const viewer = await showNumber(page, MAX_DIGITS);
      for (const size of [{ width: 1280, height: 720 }, { width: 320, height: 568 }]) {
        await page.setViewportSize(size);
        await settle(page);
        const m = await measure(page);
        expect(m.scrollTop, `${size.width}px`).toBe(0);
        expect(Math.abs(m.centre.x - 175) * m.pxPerUnit, `${size.width}px`).toBeLessThanOrEqual(1);
      }

      await zoomTo(page, '200%');
      await viewer.evaluate((el) => el.scrollTo(100, 3000));
      await settle(page);
      await page.getByRole('button', { name: 'Reset' }).click();
      await expect(zoomLevel(page)).toHaveText('100%');
      await page.setViewportSize({ width: 1440, height: 900 });
      await settle(page);
      const m = await measure(page);
      expect(m.scrollTop).toBe(0);
      expect(Math.abs(m.centre.x - 175) * m.pxPerUnit).toBeLessThanOrEqual(1);
    });

    test('keeps a point scrolled to after a resize correction, then returns to a point a wider viewer clamped', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const viewer = await showNumber(page, MAX_DIGITS);
      await zoomTo(page, '400%');
      await viewer.evaluate((el) => el.scrollTo(200, 4000));
      await settle(page);
      const first = (await measure(page)).centre;
      await resizeTo(page, { width: 1280, height: 800 }, first, 'first point at 1280px');

      // Scrolled after the correction: the new point is kept
      await viewer.evaluate((el) => el.scrollTo(el.scrollWidth, 9000));
      await settle(page);
      const second = await measure(page);
      expect(second.scrollLeft).toBe(second.sideways); // at the right edge
      await resizeTo(page, { width: 375, height: 667 }, second.centre, 'second point at 375px');

      // At the right edge of the narrow viewer: wider, it can only come part of the way...
      await viewer.evaluate((el) => el.scrollTo(el.scrollWidth, 9000));
      await settle(page);
      const edge = await measure(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      await settle(page);
      const clamped = await measure(page);
      expect(clamped.scrollLeft).toBe(clamped.sideways);
      expect(Math.abs(clamped.centre.x - edge.centre.x) * clamped.pxPerUnit).toBeGreaterThan(50);
      // ...and narrow again, it returns to the point it was showing
      await resizeTo(page, { width: 375, height: 667 }, edge.centre, 'back at 375px');
    });

    // Headless Chromium still reports whole-pixel scroll positions at this scale; fractional
    // positions are covered by NumeralViewport.test.tsx
    test.describe('at 150% display scaling', () => {
      test.use({ deviceScaleFactor: 1.5 });

      test('keeps the point through repeated resizes, without drift', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        const viewer = await showNumber(page, MAX_DIGITS);
        await zoomTo(page, '300%');
        await viewer.evaluate((el) => el.scrollTo(250.4, 4321.7));
        await settle(page);
        const start = await measure(page);
        const ends: number[][] = [];
        for (let i = 0; i < 4; i++) {
          await resizeTo(page, { width: 375, height: 667 }, start.centre, `cycle ${i + 1} at 375px`);
          await resizeTo(page, { width: 1280, height: 800 }, start.centre, `cycle ${i + 1} at 1280px`);
          const m = await measure(page);
          ends.push([m.scrollLeft, m.scrollTop]);
        }
        expect(ends.slice(1)).toEqual(Array(3).fill(ends[0]));
      });
    });
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

test.describe('screen-only tier guides', () => {
  // 19 × 20⁴ + 0 × 20³ + 19 × 20² + 1 × 20 + 0: 5 tiers, with the tallest digit (19) and the shell (0)
  const FIVE_TIERS = '3047620';

  const settingsPanel = (page: Page) => page.getByRole('group', { name: 'Stela Material & Glyph Settings' });
  const bandsSwitch = (page: Page) => page.getByRole('switch', { name: 'Show Place Tier Guides:' });
  const hairlinesSwitch = (page: Page) => page.getByRole('switch', { name: 'Show Dividing Hairlines:' });
  const viewerGroup = (page: Page) => page.getByRole('group', { name: 'Numeral viewer' });
  const hairlines = (page: Page) => viewerGroup(page).locator('[data-tier-hairline]');
  const bands = (page: Page) => viewerGroup(page).locator('[data-place-tier-band]');

  /** Opens the app with saved settings, as a returning visitor would */
  async function openWith(page: Page, saved: Record<string, string>) {
    await page.addInitScript((saved) => {
      for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value);
    }, saved);
    await page.reload();
  }
  const BOTH_ON = { 'mayastack:showPlaceTierGuides': 'true', 'mayastack:showTierHairlines': 'true' };

  /**
   * Checks every hairline in view against the rendered numeral: its centre is where its boundary
   * falls in the SVG, between the stacks above and below it, and it spans exactly its group.
   * `stacksPerGroup` is each group's number of digit stacks, in their order in the SVG.
   * Returns how many hairlines were checked, and what was wrong.
   */
  const checkHairlines = (page: Page, stacksPerGroup: number[]) =>
    page.evaluate((stacksPerGroup) => {
      const TOLERANCE = 1; // px: HTML and SVG positions may round differently
      const viewer = document.querySelector('[role="group"][aria-label="Numeral viewer"]')!;
      const view = viewer.getBoundingClientRect();
      const svg = viewer.querySelector('svg.mep-svg')!.getBoundingClientRect();
      const stacks = [...viewer.querySelectorAll('g[data-digit-index]')].map((g) => g.getBoundingClientRect());
      const maxTiers = Math.max(...stacksPerGroup);
      // px per SVG unit: groups 100 units wide, 25 apart (Number mode has one group, 350 wide)
      const groupWidth = stacksPerGroup.length === 1 ? 350 : 100;
      const unit = svg.width / (stacksPerGroup.length * groupWidth + (stacksPerGroup.length - 1) * 25);
      const problems: string[] = [];
      let checked = 0;

      for (const guide of viewer.querySelectorAll<HTMLElement>('[data-tier-hairline]')) {
        const box = guide.getBoundingClientRect();
        const y = box.top + box.height / 2;
        if (y < view.top || y > view.bottom) continue; // scrolled out of view
        checked++;
        const group = Number(guide.dataset.groupIndex);
        const k = Number(guide.dataset.boundary);
        const first = stacksPerGroup.slice(0, group).reduce((sum, n) => sum + n, 0);
        const above = stacks[first + stacksPerGroup[group] - 1 - k];
        const below = stacks[first + stacksPerGroup[group] - k];
        const expectedY = svg.top + ((maxTiers - k) / maxTiers) * svg.height;
        // 3% of the group's width in from each side, as the cards
        const expectedLeft = svg.left + (group * (groupWidth + 25) + 0.03 * groupWidth) * unit;
        const expectedWidth = 0.94 * groupWidth * unit;

        const name = `group ${group}, boundary ${k}`;
        if (Math.abs(y - expectedY) > TOLERANCE) problems.push(`${name}: y ${y}, expected ${expectedY}`);
        if (y < above.bottom - TOLERANCE) problems.push(`${name}: over the stack above (bottom ${above.bottom}, y ${y})`);
        if (y > below.top + TOLERANCE) problems.push(`${name}: over the stack below (top ${below.top}, y ${y})`);
        if (Math.abs(box.left - expectedLeft) > TOLERANCE) problems.push(`${name}: left ${box.left}, expected ${expectedLeft}`);
        if (Math.abs(box.width - expectedWidth) > TOLERANCE) problems.push(`${name}: width ${box.width}, expected ${expectedWidth}`);
        for (const stack of [above, below]) {
          if (stack.left < box.left - TOLERANCE || stack.right > box.right + TOLERANCE) problems.push(`${name}: narrower than its stacks`);
        }
        if (box.height > 1.01) problems.push(`${name}: ${box.height} px thick`);
      }
      return { checked, problems };
    }, stacksPerGroup);

  /**
   * Checks every band in view against the rendered numeral: it covers its tier's 80-unit cell,
   * less 2 units at its top and bottom, spans exactly its group, and contains its tier's digit
   * stack. Each group has exactly one band per tier of its own, and none above them.
   * Returns how many bands were checked, and what was wrong.
   */
  const checkBands = (page: Page, stacksPerGroup: number[]) =>
    page.evaluate((stacksPerGroup) => {
      const TOLERANCE = 1; // px
      const viewer = document.querySelector('[role="group"][aria-label="Numeral viewer"]')!;
      const view = viewer.getBoundingClientRect();
      const svg = viewer.querySelector('svg.mep-svg')!.getBoundingClientRect();
      const stacks = [...viewer.querySelectorAll('g[data-digit-index]')].map((g) => g.getBoundingClientRect());
      const maxTiers = Math.max(...stacksPerGroup);
      const groupWidth = stacksPerGroup.length === 1 ? 350 : 100;
      const unit = svg.width / (stacksPerGroup.length * groupWidth + (stacksPerGroup.length - 1) * 25);
      const problems: string[] = [];
      let checked = 0;

      const all = [...viewer.querySelectorAll<HTMLElement>('[data-place-tier-band]')];
      stacksPerGroup.forEach((tiers, group) => {
        const exponents = all.filter((b) => Number(b.dataset.groupIndex) === group).map((b) => Number(b.dataset.exponent));
        if (exponents.join() !== [...Array(tiers).keys()].join()) problems.push(`group ${group}: bands ${exponents}, expected ${tiers}`);
      });

      for (const band of all) {
        const box = band.getBoundingClientRect();
        if (box.bottom < view.top || box.top > view.bottom) continue; // scrolled out of view
        checked++;
        const group = Number(band.dataset.groupIndex);
        const e = Number(band.dataset.exponent);
        const first = stacksPerGroup.slice(0, group).reduce((sum, n) => sum + n, 0);
        const stack = stacks[first + stacksPerGroup[group] - 1 - e];
        const cellTop = svg.top + ((maxTiers - 1 - e) / maxTiers) * svg.height;
        // 3% of the group's width in from each side, as the hairlines
        const expectedLeft = svg.left + (group * (groupWidth + 25) + 0.03 * groupWidth) * unit;
        const expectedWidth = 0.94 * groupWidth * unit;

        const name = `group ${group}, exponent ${e}`;
        if (Math.abs(box.top - (cellTop + 2 * unit)) > TOLERANCE) problems.push(`${name}: top ${box.top}, expected ${cellTop + 2 * unit}`);
        if (Math.abs(box.height - 76 * unit) > TOLERANCE) problems.push(`${name}: height ${box.height}, expected ${76 * unit}`);
        if (Math.abs(box.left - expectedLeft) > TOLERANCE) problems.push(`${name}: left ${box.left}, expected ${expectedLeft}`);
        if (Math.abs(box.width - expectedWidth) > TOLERANCE) problems.push(`${name}: width ${box.width}, expected ${expectedWidth}`);
        if (stack.top < box.top - TOLERANCE || stack.bottom > box.bottom + TOLERANCE
          || stack.left < box.left - TOLERANCE || stack.right > box.right + TOLERANCE) {
          problems.push(`${name}: does not contain its stack`);
        }
      }
      return { checked, problems };
    }, stacksPerGroup);

  const enterDate25th = async (page: Page) => {
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 25th, \d{4}$/ }).first().click();
    await expect(page.getByRole('img', { name: /^Mayan numerals for day 25, month \d+ and year \d+$/ })).toBeVisible();
  };

  test('are off by default, in the settings panel, and each stays on after a reload on its own', async ({ page }) => {
    await showNumber(page, FIVE_TIERS);
    const guidesGroup = settingsPanel(page).getByRole('group', { name: 'Viewer guides' });
    await expect(guidesGroup.getByRole('switch')).toHaveCount(2);
    await expect(guidesGroup.getByText('Shown on screen only, not included in exports.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..').getByRole('switch')).toHaveCount(0);
    await expect(bandsSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await expect(hairlinesSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('[data-place-tier-guides], [data-tier-hairlines]')).toHaveCount(0);

    await bandsSwitch(page).click();
    await expect(bands(page)).toHaveCount(5);
    await expect(hairlines(page)).toHaveCount(0);
    const saved = () => page.evaluate(() => [localStorage.getItem('mayastack:showPlaceTierGuides'), localStorage.getItem('mayastack:showTierHairlines')]);
    expect(await saved()).toEqual(['true', null]);
    // Not the exportable grid, which stays off
    await expect(page.getByRole('switch', { name: 'Show Grid:' })).toHaveAttribute('aria-checked', 'false');

    await page.reload();
    await showNumber(page, FIVE_TIERS);
    await expect(bandsSwitch(page)).toHaveAttribute('aria-checked', 'true');
    await expect(hairlinesSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await expect(bands(page)).toHaveCount(5);

    await hairlinesSwitch(page).click();
    await bandsSwitch(page).click();
    expect(await saved()).toEqual(['false', 'true']);
    await page.reload();
    await showNumber(page, FIVE_TIERS);
    await expect(bandsSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await expect(hairlinesSwitch(page)).toHaveAttribute('aria-checked', 'true');
    await expect(hairlines(page)).toHaveCount(4);
    await expect(bands(page)).toHaveCount(0);
  });

  test('stay aligned with the tiers at 25%, 100% and 400% zoom', async ({ page }) => {
    await openWith(page, BOTH_ON);
    await showNumber(page, FIVE_TIERS);
    const zoomOut = page.getByRole('button', { name: 'Zoom out' });
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });

    for (const [level, button, presses] of [['100%', zoomIn, 0], ['25%', zoomOut, 3], ['400%', zoomIn, 7]] as const) {
      for (let i = 0; i < presses; i++) await button.click();
      await expect(zoomLevel(page)).toHaveText(new RegExp(`^${level}`));
      const lines = await checkHairlines(page, [5]);
      const shaded = await checkBands(page, [5]);
      // At 400% the numeral is taller than the viewer, which shows only some of the guides
      if (level === '400%') {
        expect(lines.checked, level).toBeGreaterThan(0);
        expect(shaded.checked, level).toBeGreaterThan(0);
      } else {
        expect(lines.checked, level).toBe(4);
        expect(shaded.checked, level).toBe(5);
      }
      expect(lines.problems, level).toEqual([]);
      expect(shaded.problems, level).toEqual([]);
    }
  });

  test('stay aligned while a large numeral is scrolled', async ({ page }) => {
    await openWith(page, BOTH_ON);
    const viewer = await showNumber(page, MAX_DIGITS);
    await expect(hairlines(page)).toHaveCount(98);
    await expect(bands(page)).toHaveCount(99);
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoomLevel(page)).toHaveText(/^400%/);

    for (const fraction of [0, 0.37, 0.5, 1]) {
      await viewer.evaluate((el, f) => el.scrollTo((el.scrollWidth - el.clientWidth) * f, (el.scrollHeight - el.clientHeight) * f), fraction);
      for (const result of [await checkHairlines(page, [99]), await checkBands(page, [99])]) {
        expect(result.checked, `scrolled to ${fraction}`).toBeGreaterThan(0);
        expect(result.problems, `scrolled to ${fraction}`).toEqual([]);
      }
    }
  });

  test('follow each Date-mode group, whose tier counts differ, and shade nothing above a shorter one', async ({ page }) => {
    await openWith(page, BOTH_ON);
    await enterDate25th(page);

    // Day 25: 2 tiers, one hairline; any month: 1 tier, none; a year from 400 to 7,999: 3 tiers, two
    const groupsOf = (locator: ReturnType<typeof bands>) =>
      locator.evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.groupIndex));
    expect(await groupsOf(hairlines(page))).toEqual(['0', '2', '2']);
    expect(await groupsOf(bands(page))).toEqual(['0', '0', '1', '2', '2', '2']);
    for (const [level, presses] of [['100%', 0], ['25%', 3], ['400%', 7]] as const) {
      const button = page.getByRole('button', { name: level === '400%' ? 'Zoom in' : 'Zoom out' });
      for (let i = 0; i < presses; i++) await button.click();
      await expect(zoomLevel(page)).toHaveText(new RegExp(`^${level}`));
      const lines = await checkHairlines(page, [2, 1, 3]);
      const shaded = await checkBands(page, [2, 1, 3]);
      // At 400% the numeral is taller than the viewer, which shows only some of the guides
      if (level === '400%') {
        expect(lines.checked, level).toBeGreaterThan(0);
        expect(shaded.checked, level).toBeGreaterThan(0);
      } else {
        expect(lines.checked, level).toBe(3);
        expect(shaded.checked, level).toBe(6);
      }
      expect(lines.problems, level).toEqual([]);
      expect(shaded.problems, level).toEqual([]);
    }
  });

  /** A computed CSS colour, `rgb(…)` or `rgba(…)`, as channels and alpha */
  const parseColour = (css: string) => {
    const [r, g, b, a = 1] = css.match(/[\d.]+/g)!.map(Number);
    return { r, g, b, a };
  };
  type Rgb = { r: number; g: number; b: number };
  const over = (top: Rgb & { a: number }, under: Rgb): Rgb => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
  });
  /** WCAG 2.x contrast ratio of two opaque colours */
  const contrast = (x: Rgb, y: Rgb) => {
    const lum = ({ r, g, b }: Rgb) =>
      [r, g, b]
        .map((v) => v / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  };
  // The viewer's canvas behind a translucent numeral background (VIEWER_BACKDROP in src/utils/guideColors.ts)
  const BACKDROP = { light: { r: 246, g: 241, b: 231 }, dark: { r: 16, g: 19, b: 25 } };

  test('match the viewer backdrop the guide colours assume, in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((theme) => localStorage.setItem('mayastack:theme', theme), theme);
      await page.reload();
      await showNumber(page, FIVE_TIERS);
      // The backdrop is marked once, on the viewer's scroller, whose colour is the one shown through it
      const backdrop = page.locator('[data-numeral-backdrop]');
      await expect(backdrop).toHaveCount(1);
      expect(await backdrop.evaluate((el) => el.matches('[role="group"][aria-label="Numeral viewer"]'))).toBe(true);
      const canvas = await backdrop.evaluate((el) => {
        let bg = 'rgba(0, 0, 0, 0)';
        for (let e: Element | null = el; e && bg === 'rgba(0, 0, 0, 0)'; e = e.parentElement) bg = getComputedStyle(e).backgroundColor;
        return bg;
      });
      const { r, g, b } = BACKDROP[theme];
      expect(canvas, theme).toBe(`rgb(${r}, ${g}, ${b})`);
    }
  });

  for (const [name, background, theme] of [
    ['white', { r: 255, g: 255, b: 255, a: 1 }, 'light'],
    ['the default background in the dark theme', { r: 255, g: 255, b: 255, a: 1 }, 'dark'],
    ['mid grey', { r: 119, g: 119, b: 119, a: 1 }, 'light'],
    ['navy', { r: 20, g: 40, b: 90, a: 1 }, 'light'],
    ['black', { r: 0, g: 0, b: 0, a: 1 }, 'dark'],
    ['transparent, over the light canvas', { r: 0, g: 0, b: 0, a: 0 }, 'light'],
    ['transparent, over the dark canvas', { r: 0, g: 0, b: 0, a: 0 }, 'dark'],
  ] as const) {
    test(`adapt their colours to a ${name} background: hairlines at 3:1, subtle cards`, async ({ page }) => {
      await openWith(page, {
        ...BOTH_ON,
        'mayastack:theme': theme,
        'mayastack:backgroundColor': JSON.stringify(background),
        'mayastack:glyphColor': '{"r":212,"g":175,"b":55,"a":0.8}',
      });
      await showNumber(page, FIVE_TIERS);
      const colours = (locator: ReturnType<typeof bands>) =>
        locator.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
      const lineColours = await colours(hairlines(page));
      const cardColours = await colours(bands(page));
      expect(new Set(lineColours).size).toBe(1);
      expect(new Set(cardColours).size).toBe(1);

      // The background as the viewer shows it, then each guide composited over it
      const shown = over(background, BACKDROP[theme]);
      const card = over(parseColour(cardColours[0]), shown);
      const line = over(parseColour(lineColours[0]), shown);
      expect(contrast(line, shown)).toBeGreaterThanOrEqual(3);
      expect(contrast(line, card)).toBeGreaterThanOrEqual(3);
      expect(contrast(card, shown)).toBeGreaterThanOrEqual(1.24);
      expect(contrast(card, shown)).toBeLessThan(1.27);

      // The glyph colour plays no part
      await page.evaluate(() => localStorage.setItem('mayastack:glyphColor', '{"r":0,"g":0,"b":0,"a":1}'));
      await page.reload();
      await showNumber(page, FIVE_TIERS);
      expect(await colours(hairlines(page))).toEqual(lineColours);
      expect(await colours(bands(page))).toEqual(cardColours);
    });
  }

  test('draw the cards behind the SVG and the hairlines over it', async ({ page }) => {
    await openWith(page, BOTH_ON);
    await showNumber(page, FIVE_TIERS);
    const layers = await page.getByRole('img', { name: /^Mayan numeral for 3047620/ }).evaluate((wrapper) =>
      [...wrapper.children].map((el) =>
        el.hasAttribute('data-place-tier-guides') ? 'cards' : el.hasAttribute('data-tier-hairlines') ? 'hairlines' : el.tagName.toLowerCase()
      )
    );
    expect(layers).toEqual(['cards', 'svg', 'hairlines']);
    // On screen only, the SVG's own background is transparent over the cards' layer, which paints it
    const styles = await viewerGroup(page).evaluate((viewer) => {
      const svg = viewer.querySelector('svg.mep-svg')!;
      return {
        svgPosition: getComputedStyle(svg).position,
        rectFill: getComputedStyle(svg.querySelector('rect')!).fill,
        rectAttribute: svg.querySelector('rect')!.getAttribute('fill'),
        layer: getComputedStyle(viewer.querySelector('[data-place-tier-guides]')!).backgroundColor,
      };
    });
    expect(styles).toEqual({
      svgPosition: 'relative',
      rectFill: 'rgba(0, 0, 0, 0)',
      rectAttribute: 'rgba(255, 255, 255, 1)',
      layer: 'rgb(255, 255, 255)',
    });

    // Without the cards, the SVG is as before
    await bandsSwitch(page).click();
    const plain = await viewerGroup(page).evaluate((viewer) => {
      const svg = viewer.querySelector('svg.mep-svg')!;
      return [getComputedStyle(svg).position, getComputedStyle(svg.querySelector('rect')!).fill];
    });
    expect(plain).toEqual(['static', 'rgb(255, 255, 255)']);
  });

  // The screen-only rule keys on the SVG's first child: with the grid on, that must still be the
  // background, made transparent, while the grid's rectangle is painted over the cards
  test('keep the exportable grid painted over the cards, with only the background transparent', async ({ page }) => {
    const background = { r: 60, g: 60, b: 70 }; // dark, so the grid's light #ddd lines stand out
    await openWith(page, {
      ...BOTH_ON,
      'mayastack:showGrid': 'true',
      'mayastack:backgroundColor': JSON.stringify({ ...background, a: 1 }),
    });
    const viewer = await showNumber(page, FIVE_TIERS);
    await page.mouse.move(0, 0); // no card hovered
    await expect(bands(page)).toHaveCount(5);
    await expect(hairlines(page)).toHaveCount(4);

    const rects = () =>
      viewerGroup(page).evaluate((viewer) => {
        const svg = viewer.querySelector('svg.mep-svg')!;
        const first = svg.firstElementChild!;
        const grid = svg.querySelector(':scope > rect[fill="url(#grid)"]')!;
        return {
          svgPosition: getComputedStyle(svg).position,
          first: first.localName,
          firstAttribute: first.getAttribute('fill'),
          firstFill: getComputedStyle(first).fill,
          gridIsFirst: grid === first,
          gridFill: getComputedStyle(grid).fill,
        };
      });
    expect(await rects()).toEqual({
      svgPosition: 'relative',
      first: 'rect',
      firstAttribute: 'rgba(60, 60, 70, 1)',
      firstFill: 'rgba(0, 0, 0, 0)',
      gridIsFirst: false,
      gridFill: expect.stringMatching(/^url\(.*#grid"?\)$/),
    });

    /**
     * The colours along a row of the top tier, from a screenshot: 30 units down, between the
     * grid's horizontal lines (every 20 units) and clear of the glyphs (from about 41 units), and
     * from 15 to 335 units across, within the card (10.5 to 339.5), crossing its vertical lines
     */
    const row = async () => {
      await viewer.scrollIntoViewIfNeeded();
      const svg = (await viewer.locator('svg.mep-svg').boundingBox())!;
      const unit = svg.width / 350;
      const y = Math.round(svg.y + 30 * unit);
      const [from, to] = [Math.ceil(svg.x + 15 * unit), Math.floor(svg.x + 335 * unit)];
      const png = await page.screenshot({ clip: { x: from, y, width: to - from, height: 1 } });
      return page.evaluate(async (data) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        [canvas.width, canvas.height] = [image.width, image.height];
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, image.width, 1).data;
        return Array.from({ length: image.width }, (_, x) => ({ r: pixels[4 * x], g: pixels[4 * x + 1], b: pixels[4 * x + 2] }));
      }, png.toString('base64'));
    };
    // The grid's vertical lines crossing the row: runs of pixels lighter than the card or
    // background around them. At about 1 px per unit, a line is antialiased over one or two
    // pixels, at about half strength, so each run must add up to a clear lift (at least 40)
    const lighterBy = (pixel: Rgb, base: Rgb) => Math.min(...(['r', 'g', 'b'] as const).map((c) => pixel[c] - base[c]));
    const gridLines = (pixels: Rgb[], base: Rgb) => {
      const runs: number[] = [];
      let run = 0;
      for (const lift of [...pixels.map((p) => lighterBy(p, base)), 0]) {
        if (lift >= 8) run += lift;
        else if (run > 0) {
          runs.push(run);
          run = 0;
        }
      }
      return { lines: runs.filter((sum) => sum >= 40).length, runs: runs.length };
    };
    const nearly = (pixels: Rgb[], base: Rgb) =>
      pixels.filter((p) => (['r', 'g', 'b'] as const).every((c) => Math.abs(p[c] - base[c]) <= 2)).length;

    const carded = over(parseColour(await bands(page).first().evaluate((el) => getComputedStyle(el).backgroundColor)), background);
    expect(Math.max(...(['r', 'g', 'b'] as const).map((c) => Math.abs(carded[c] - background[c])))).toBeGreaterThanOrEqual(5);

    // The grid's vertical lines (16 cross the row) show over the card, which shows between them
    const withGrid = await row();
    expect(gridLines(withGrid, carded)).toEqual({ lines: 16, runs: 16 });
    expect(nearly(withGrid, carded)).toBeGreaterThan(withGrid.length / 2);

    // Those light pixels are the grid's: without it, the row is the card alone
    await page.getByRole('switch', { name: 'Show Grid:' }).click();
    await page.mouse.move(0, 0);
    const cardOnly = await row();
    expect(gridLines(cardOnly, carded)).toEqual({ lines: 0, runs: 0 });
    expect(nearly(cardOnly, carded)).toBe(cardOnly.length);

    // Without the guides, the SVG paints its own background again, under the same grid
    await page.getByRole('switch', { name: 'Show Grid:' }).click();
    await bandsSwitch(page).click();
    await hairlinesSwitch(page).click();
    await expect(bands(page)).toHaveCount(0);
    await expect(hairlines(page)).toHaveCount(0);
    const plain = await rects();
    expect(plain).toMatchObject({ svgPosition: 'static', first: 'rect', firstFill: 'rgb(60, 60, 70)', gridIsFirst: false });
    const withoutGuides = await row();
    expect(gridLines(withoutGuides, background)).toEqual({ lines: 16, runs: 16 });
    expect(nearly(withoutGuides, background)).toBeGreaterThan(withoutGuides.length / 2);
  });

  test('never change the exported SVG or PNG', async ({ page }) => {
    await showNumber(page, FIVE_TIERS);
    const svgOff = await exportFile(page, 'svg');
    const pngOff = await exportFile(page, 'png');
    await page.getByRole('button', { name: '📦 Export' }).click(); // close the menu

    await bandsSwitch(page).click();
    await hairlinesSwitch(page).click();
    await expect(bands(page)).toHaveCount(5);
    await expect(hairlines(page)).toHaveCount(4);
    // With a card hovered too
    const viewer = viewerGroup(page);
    await viewer.scrollIntoViewIfNeeded();
    const card = (await bands(page).last().boundingBox())!;
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await expect(bands(page).last()).toHaveAttribute('data-hovered', 'true');
    const svgOn = await exportFile(page, 'svg');
    const pngOn = await exportFile(page, 'png');

    expect(svgOn.data.equals(svgOff.data)).toBe(true);
    expect(pngOn.data.equals(pngOff.data)).toBe(true);
    expect(svgOn.data.toString('utf-8')).not.toMatch(/tier-(guide|band|hairline)|underlay/);
    // 5 tiers × 80 units tall, 350 wide: the numeral alone
    expect(pngSize(pngOn.data)).toEqual({ width: 350, height: 400 });
    await expect(viewerGroup(page).locator('svg')).toHaveCount(1);
  });

  // The cards are behind the SVG, so the glyphs are drawn over them exactly as over the
  // background: an opaque glyph keeps its colour, and a translucent one shows the card through it
  for (const alpha of [1, 0.5]) {
    test(`leave glyphs with an alpha of ${alpha} drawn over the cards, unchanged`, async ({ page }) => {
      const glyph = { r: 180, g: 40, b: 20 };
      const background = { r: 240, g: 230, b: 200 };
      await openWith(page, {
        'mayastack:glyphColor': JSON.stringify({ ...glyph, a: alpha }),
        'mayastack:backgroundColor': JSON.stringify({ ...background, a: 1 }),
      });
      const viewer = await showNumber(page, FIVE_TIERS);
      await page.mouse.move(0, 0); // no card hovered

      /** The colour of each point, from a screenshot of the numeral, measured where it is now */
      const sample = async () => {
        await viewer.scrollIntoViewIfNeeded();
        // The middle of the top tier's lowest bar (19: three bars), a point of its card clear of
        // any glyph, and a point in the card's side inset
        const bar = (await viewer.locator('g[data-digit-index="0"] path').first().boundingBox())!;
        const svg = (await viewer.locator('svg.mep-svg').boundingBox())!;
        const unit = svg.width / 350;
        const points = {
          glyph: { x: Math.round(bar.x + bar.width / 2), y: Math.round(bar.y + bar.height / 2) },
          card: { x: Math.round(svg.x + 30 * unit), y: Math.round(svg.y + 40 * unit) },
          inset: { x: Math.round(svg.x + 4 * unit), y: Math.round(svg.y + 40 * unit) },
        };
        const clip = { x: Math.floor(svg.x), y: Math.floor(svg.y), width: Math.ceil(svg.width), height: Math.ceil(Math.min(svg.height, 200)) };
        const png = await page.screenshot({ clip });
        return page.evaluate(async ({ data, points, clip }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          [canvas.width, canvas.height] = [image.width, image.height];
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0);
          return Object.fromEntries(Object.entries(points).map(([name, { x, y }]) => {
            const [r, g, b] = context.getImageData(x - clip.x, y - clip.y, 1, 1).data;
            return [name, { r, g, b }];
          }));
        }, { data: png.toString('base64'), points, clip });
      };

      const off = await sample();
      await bandsSwitch(page).click();
      await expect(bands(page)).toHaveCount(5);
      await page.mouse.move(0, 0);
      const on = await sample();
      const cardColour = parseColour(await bands(page).last().evaluate((el) => getComputedStyle(el).backgroundColor));

      // Compositing in the browser rounds to whole channel values
      const close = (actual: Rgb, expected: Rgb) =>
        (['r', 'g', 'b'] as const).forEach((c) =>
          expect(Math.abs(actual[c] - expected[c]), `${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`).toBeLessThanOrEqual(2)
        );

      // Without cards: the glyph over the background
      close(off.glyph, over({ ...glyph, a: alpha }, background));
      close(off.card, background);
      // With them: the card is visible, the side inset is not, and the glyph is drawn over the card
      const carded = over(cardColour, background);
      close(on.card, carded);
      close(on.inset, background);
      close(on.glyph, over({ ...glyph, a: alpha }, carded));
      expect(Math.max(...(['r', 'g', 'b'] as const).map((c) => Math.abs(on.card[c] - off.card[c])))).toBeGreaterThanOrEqual(5);
      // An opaque glyph keeps its exact colour
      if (alpha === 1) expect(on.glyph).toEqual(off.glyph);
    });
  }

  test('strengthen the card under the mouse, with a shadow, without taking the pointer', async ({ page }) => {
    await openWith(page, { 'mayastack:showPlaceTierGuides': 'true' });
    const viewer = await showNumber(page, FIVE_TIERS);
    await viewer.scrollIntoViewIfNeeded();
    const hovered = () =>
      bands(page).evaluateAll((els) => els.filter((el) => el.hasAttribute('data-hovered')).map((el) => (el as HTMLElement).dataset.exponent));
    const top = bands(page).last(); // exponent 4, at the top
    const resting = await top.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await hovered()).toEqual([]);

    const box = (await top.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(hovered).toEqual(['4']);
    const style = await top.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, shadow: s.boxShadow, duration: s.transitionDuration };
    });
    expect(parseColour(style.bg).a).toBeGreaterThan(parseColour(resting).a);
    expect(style.shadow).not.toBe('none');
    expect(style.duration).toBe('0.15s');

    // Under the pointer is the SVG, never the cards' layer
    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y)!;
      return { inCards: !!el.closest('[data-place-tier-guides]'), inViewer: !!el.closest('[aria-label="Numeral viewer"]') };
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(hit).toEqual({ inCards: false, inViewer: true });

    // Between two cards, none is hovered; leaving the numeral clears it too
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 2);
    await expect.poll(hovered).toEqual([]);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(hovered).toEqual(['4']);
    await page.mouse.move(0, 0);
    await expect.poll(hovered).toEqual([]);

    // The viewer still scrolls under the pointer, and the hover follows the card now under it
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoomLevel(page)).toHaveText(/^400%/);
    await viewer.evaluate((el) => el.scrollTo(0, 0)); // zooming kept the middle in view
    await viewer.scrollIntoViewIfNeeded();
    const view = (await viewer.boundingBox())!;
    await page.mouse.move(view.x + view.width / 2, view.y + 40);
    await expect.poll(hovered).toEqual(['4']);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => viewer.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect.poll(async () => (await hovered())[0] ?? 'gap').not.toBe('4');
    expect((await hovered()).length).toBeLessThanOrEqual(1);
  });

  test('change the hovered card without a transition when reduced motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openWith(page, { 'mayastack:showPlaceTierGuides': 'true' });
    await showNumber(page, FIVE_TIERS);
    // The app's reduced-motion rule leaves 0.01 ms (src/index.css), and the cards add no transition of their own
    const duration = await bands(page).first().evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(duration)).toBeLessThanOrEqual(0.00001);
  });

  test('let the pointer through to the viewer, which still scrolls under them', async ({ page }) => {
    await openWith(page, BOTH_ON);
    const viewer = await showNumber(page, MAX_DIGITS);
    await viewer.scrollIntoViewIfNeeded();
    // The topmost hairline and band, in view while the viewer is at its top (the first are at the bottom)
    for (const guide of [hairlines(page).last(), bands(page).last()]) {
      const box = (await guide.boundingBox())!;
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y)!;
        return { inOverlay: !!el.closest('[data-place-tier-guides], [data-tier-hairlines]'), inViewer: !!el.closest('[aria-label="Numeral viewer"]') };
      }, [x, y]);
      expect(hit).toEqual({ inOverlay: false, inViewer: true });
    }

    const box = (await bands(page).last().boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => viewer.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });

  test('switch with the keyboard after Show Grid, and leave the viewer’s controls as they were', async ({ page }) => {
    const viewer = await showNumber(page, FIVE_TIERS);
    // The viewer follows Reset directly again
    await page.getByRole('button', { name: 'Reset' }).focus();
    await page.keyboard.press('Tab');
    await expect(viewer).toBeFocused();

    await page.getByRole('switch', { name: 'Show Grid:' }).focus();
    await page.keyboard.press('Tab');
    await expect(bandsSwitch(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(bandsSwitch(page)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Tab');
    await expect(hairlinesSwitch(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(hairlinesSwitch(page)).toHaveAttribute('aria-checked', 'true');
    await expect(bands(page)).toHaveCount(5);
    await expect(hairlines(page)).toHaveCount(4);
    await expect(page.getByRole('switch', { name: 'Show Grid:' })).toHaveAttribute('aria-checked', 'false');

    await viewer.focus();
    await page.keyboard.press('+');
    await expect(zoomLevel(page)).toHaveText('150%');
    await page.keyboard.press('0');
    await expect(zoomLevel(page)).toHaveText('100%');
    // The numeral is still one labelled image, the guides hidden from assistive technology
    await expect(page.getByRole('img', { name: /^Mayan numeral for 3047620: 5 stacked/ })).toBeVisible();
    await expect(page.locator('[data-place-tier-guides]')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-tier-hairlines]')).toHaveAttribute('aria-hidden', 'true');
  });

  for (const width of [375, 768, 1280]) {
    test(`keep the guide switches in the settings card at ${width}px, without widening the page`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await showNumber(page, FIVE_TIERS);
      await bandsSwitch(page).click();
      await hairlinesSwitch(page).click();
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Zoom in' }).click();
      await expect(zoomLevel(page)).toHaveText(/^400%/);

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const panel = (await settingsPanel(page).boundingBox())!;
      for (const label of ['Show Place Tier Guides:', 'Show Dividing Hairlines:', 'Shown on screen only, not included in exports.']) {
        await expect(page.getByText(label, { exact: true })).toBeVisible();
      }
      // Each switch and its label inside the panel, side by side, without overlapping
      for (const toggle of [bandsSwitch(page), hairlinesSwitch(page)]) {
        await expect(toggle).toBeVisible();
        const box = (await toggle.boundingBox())!;
        const name = (await toggle.getAttribute('id'))!;
        const label = (await page.locator(`label[for="${name}"]`).boundingBox())!;
        for (const b of [box, label]) {
          expect(b.x).toBeGreaterThanOrEqual(panel.x - 1);
          expect(b.x + b.width).toBeLessThanOrEqual(panel.x + panel.width + 1);
        }
        expect(label.x + label.width).toBeLessThanOrEqual(box.x + 1);
      }
      // The second switch is below the first
      const [first, second] = [(await bandsSwitch(page).boundingBox())!, (await hairlinesSwitch(page).boundingBox())!];
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
    });
  }
});
