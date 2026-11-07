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

/**
 * Waits until the viewer's zoom animation (UI-13, slice 6), if any, has ended: the paper's own
 * Web Animations finished or cancelled, so its transform no longer applies and boxes on screen
 * are the final layout's. Waits on the animations themselves, never for a fixed time.
 */
async function settleZoom(page: Page) {
  await page.evaluate(async () => {
    const paper = document.querySelector('[data-numeral-paper]');
    if (!paper) return;
    // Any animation started meanwhile is waited for too
    for (let running = paper.getAnimations(); running.length > 0; running = paper.getAnimations()) {
      await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
    }
  });
}

/**
 * The viewer card, marked `data-viewer-card` (UI-13), around its heading, which is in the
 * viewer's header row with a result (UI-13, slice 5a) and directly in the card without one
 */
const viewerCard = (page: Page) =>
  page.locator('[data-viewer-card]').filter({ has: page.getByRole('heading', { name: 'Mayan Numeral Stack', exact: true }) });

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
    const result = viewerCard(page);
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
    await settleZoom(page); // the final layout, not the zoom animation's (UI-13, slice 6)
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

  test('keeps the stage’s structure: the scroller, a padded, clipping stage content, the paper, then the numeral image', async ({ page }) => {
    // Changed deliberately in UI-13: the stage spans the viewer card's content (card less its
    // 16 px padding at each side) instead of 384 px, and its height is the screen's
    for (const [width, height] of [[375, 900], [768, 900], [1280, 900]] as const) {
      await page.setViewportSize({ width, height });
      const viewer = await showNumber(page, FIFTY_DIGITS);
      const card = (await viewerCard(page).boundingBox())!;
      const box = (await viewer.boundingBox())!;
      expect(box.width, `${width}px`).toBe(card.width - 32);
      expect(box.height, `${width}px`).toBe(width >= 1024 ? 620 : 480);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px`).toBeLessThanOrEqual(width);
      const structure = await viewer.evaluate((scroller) => {
        const content = scroller.firstElementChild as HTMLElement;
        const style = getComputedStyle(content);
        const s = content.getBoundingClientRect();
        // Changed deliberately in UI-13: the paper, with its 12 px padding, between the stage content and the numeral image
        const paper = content.firstElementChild as HTMLElement;
        const image = paper.firstElementChild as HTMLElement;
        const svg = image.querySelector('svg.mep-svg')!;
        return {
          // Changed deliberately in UI-13: the scroller is the stage, and its child the stage content
          stage: scroller.hasAttribute('data-numeral-stage'),
          viewerCard: scroller.closest('[data-viewer-card]') !== null,
          children: scroller.children.length,
          content: content.hasAttribute('data-numeral-stage-content'),
          overflow: style.overflow,
          padding: style.padding,
          // The stage content spans the whole scrollable area, and at least the scroller
          covers: s.width === scroller.scrollWidth && s.height === scroller.scrollHeight
            && s.width >= scroller.clientWidth && s.height >= scroller.clientHeight,
          contentChildren: content.children.length,
          paper: paper.hasAttribute('data-numeral-paper'),
          paperPadding: getComputedStyle(paper).padding,
          paperChildren: paper.children.length,
          image: image.hasAttribute('data-numeral-image'),
          wrapper: image.getAttribute('role'),
          // The SVG artwork, the source of the exports, has none of the viewer's DOM names
          svgParent: svg.parentElement === image,
          svgMarked: [...svg.attributes].some((a) => a.name.startsWith('data-') || a.name.startsWith('aria-') || a.name === 'role'),
          scrollers: [...scroller.querySelectorAll('*')].filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)).length,
        };
      });
      expect(structure, `${width}px`).toEqual({
        stage: true, viewerCard: true, children: 1, content: true, overflow: 'clip', padding: '16px', covers: true,
        contentChildren: 1, paper: true, paperPadding: '12px', paperChildren: 1, image: true, wrapper: 'img',
        svgParent: true, svgMarked: false, scrollers: 0,
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

  /**
   * Steps the zoom with its buttons to the given level, e.g. "50%", and waits for its animation
   * to end, so what follows sees the final layout
   */
  async function zoomTo(page: Page, level: string) {
    for (;;) {
      const current = (await zoomLevel(page).textContent())!.split(' ')[0];
      const steps = LEVELS.indexOf(level) - LEVELS.indexOf(current);
      if (steps === 0) return settleZoom(page);
      await page.getByRole('button', { name: steps > 0 ? 'Zoom in' : 'Zoom out' }).click();
      await expect(zoomLevel(page)).not.toHaveText(new RegExp(`^${current}`));
    }
  }

  /**
   * The numeral as laid out in the viewer, measured from the boxes on screen: its SVG's size in CSS
   * px and logical size in SVG units, its left edge in the scrollable area, the scroll position,
   * the point at the viewer's centre in SVG units, and any page-level horizontal overflow. Once
   * any zoom animation has ended: the final layout
   */
  const measure = async (page: Page) => {
    await settleZoom(page);
    return page.evaluate(() => {
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
  };

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
    const card = viewerCard(page);
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
      // (the slab fits with the stage's 16 px and the paper's 12 px of padding at each side)
      if (m.width + 56 <= m.clientWidth) expect(Math.abs(m.left - m.right), what).toBeLessThanOrEqual(1);
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
        // The top tier, the highest place value, after the stage's 16 px padding and the
        // paper's 12 px (changed deliberately in UI-13; the paper's does not zoom)
        expect(top.top, what).toBe(28);
        expect(await wholeInView(0), what).toBe(true);
        await viewer.evaluate((el) => el.scrollTo(el.scrollLeft, el.scrollHeight));
        const bottom = await measure(page);
        // The bottom tier, the units, with both paddings below it: the scrollable area is the numeral and the paddings
        expect(bottom.scrollHeight - bottom.top - bottom.height, what).toBe(28);
        expect(bottom.scrollHeight, what).toBe(bottom.height + 56);
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

  test.describe('viewer header and zoom toolbar (UI-13 slice 5a)', () => {
    const heading = (page: Page) => page.getByRole('heading', { level: 2, name: 'Mayan Numeral Stack', exact: true });
    const controls = (page: Page) => page.getByRole('group', { name: 'Zoom controls' });

    /** The heading's cluster in the header row: the heading and the tier-direction indicator (slice 5b) */
    const cluster = (page: Page) => heading(page).locator('xpath=..');
    const indicator = (page: Page) => heading(page).locator('xpath=following-sibling::*[1]');

    /** The header row's parts and the stage, as laid out on screen, and the card's content box */
    const headerLayout = async (page: Page) => {
      const card = (await viewerCard(page).boundingBox())!;
      const [h, c, stage, cl, ind] = await Promise.all(
        [heading(page), controls(page), page.getByRole('group', { name: 'Numeral viewer' }), cluster(page), indicator(page)]
          .map(async (locator) => (await locator.boundingBox())!));
      const parts = await controls(page).evaluate((group) =>
        [...group.children].map((el) => {
          const b = el.getBoundingClientRect();
          return { tag: el.tagName.toLowerCase(), name: el.getAttribute('aria-label') ?? el.textContent!.trim(), x: b.x, y: b.y, width: b.width, height: b.height };
        }));
      const content = { left: card.x + 16, right: card.x + card.width - 16, width: card.width - 32 };
      return { card, content, heading: h, controls: c, stage, parts, cluster: cl, indicator: ind };
    };

    // The six approved sizes, the lg boundary and a tablet width
    const SIZES = [...SCREENS, { width: 1024, height: 768 }, { width: 768, height: 1024 }];

    test('puts the heading and the zoom controls in one header row above the stage, wrapping only where they do not fit', async ({ page }) => {
      test.slow();
      for (const size of SIZES) {
        const what = `${size.width} × ${size.height}`;
        await page.setViewportSize({ width: size.width, height: size.height });
        await showNumber(page, FIFTY_DIGITS);
        const { card, content, heading: h, controls: c, stage, parts, cluster: cl, indicator: ind } = await headerLayout(page);

        // At the top of the card, within its content box, with no page-level overflow
        expect(Math.min(h.y, c.y) - card.y, what).toBeCloseTo(16, 0);
        for (const box of [h, c, ind]) {
          expect(box.x, what).toBeGreaterThanOrEqual(content.left - 0.5);
          expect(box.x + box.width, what).toBeLessThanOrEqual(content.right + 0.5);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), what).toBe(0);

        // Beside the heading where both fit with the 12 px gap, otherwise on their own line under it,
        // never overlapping it. Changed deliberately in UI-13 (slice 5b): the heading is in a
        // cluster with the tier-direction indicator, which wraps first, so the controls still go
        // under it only where the heading alone leaves no room; beside it, they are centred on
        // the cluster, which has two lines where the indicator is under the heading
        const wraps = h.width + 12 + c.width > content.width;
        if (wraps) {
          expect(c.y, what).toBeGreaterThanOrEqual(cl.y + cl.height);
          expect(c.x, what).toBeCloseTo(content.left, 0);
        } else {
          expect(Math.abs(c.y + c.height / 2 - (cl.y + cl.height / 2)), what).toBeLessThanOrEqual(1);
          expect(c.x + c.width, what).toBeCloseTo(content.right, 0);
          expect(cl.x + cl.width, what).toBeLessThanOrEqual(c.x - 12 + 0.5);
        }
        // Phones wrap; tablets and desktops stay on one row (the measured threshold, 462 px since
        // the compact toolbar, is recorded in the roadmap rather than asserted here, so font
        // metrics can move it)
        expect(wraps, what).toBe(size.width <= 375);

        // The indicator: beside the heading, centred on it, where it fits in the room the controls
        // leave; otherwise under the heading, at its start
        const room = wraps ? content.width : content.width - 12 - c.width;
        const indicatorWraps = h.width + 12 + ind.width > room;
        if (indicatorWraps) {
          expect(ind.y, what).toBeGreaterThanOrEqual(h.y + h.height);
          expect(ind.x, what).toBeCloseTo(h.x, 0);
        } else {
          expect(Math.abs(ind.y + ind.height / 2 - (h.y + h.height / 2)), what).toBeLessThanOrEqual(1);
          expect(ind.x, what).toBeCloseTo(h.x + h.width + 12, 0);
        }
        // Robust at these sizes: one row on desktops; both wrapped on phones (the measured
        // thresholds are in the roadmap)
        if (size.width >= 1280) expect(indicatorWraps, what).toBe(false);
        if (size.width <= 375) expect(indicatorWraps, what).toBe(true);
        // The heading on one line, the indicator never wrapping within itself or clipped
        expect(h.height, what).toBeLessThanOrEqual(28.5);
        expect(ind.height, what).toBeLessThanOrEqual(20.5);
        expect(await indicator(page).evaluate((el) => el.scrollWidth - el.clientWidth), what).toBeLessThanOrEqual(0);

        // The controls in one row, in order, with buttons of at least 24 × 24 px
        expect(parts.map((p) => p.name), what).toEqual(['Zoom out', '100%', 'Zoom in', '', 'Reset']);
        for (const p of parts) expect(Math.abs(p.y + p.height / 2 - (c.y + c.height / 2)), `${what}: ${p.name}`).toBeLessThanOrEqual(1);
        for (let i = 1; i < parts.length; i++) expect(parts[i].x, what).toBeGreaterThan(parts[i - 1].x + parts[i - 1].width - 0.5);
        for (const p of parts.filter((part) => part.tag === 'button')) {
          expect(p.width, `${what}: ${p.name}`).toBeGreaterThanOrEqual(24);
          expect(p.height, `${what}: ${p.name}`).toBeGreaterThanOrEqual(24);
        }

        // The stage 12 px under the header row; its height is unchanged (17.5rem offset kept)
        expect(stage.y - Math.max(cl.y + cl.height, c.y + c.height), what).toBeCloseTo(12, 0);
        // 1024 × 768: 100svh − 17.5rem; 768 × 1024: the 30rem maximum below lg
        const expected = 'stage' in size ? size.stage : size.width >= 1024 ? size.height - 280 : 480;
        expect(stage.height, what).toBeCloseTo(expected, 0);
        if (size.width >= 1024) expect(card.y + card.height, what).toBeLessThanOrEqual(size.height);
      }
    });

    test('shows the tier-direction indicator for the tallest group, within the card, without overflow (slice 5b)', async ({ page }) => {
      for (const width of [1280, 1024, 375, 320]) {
        await page.setViewportSize({ width, height: 800 });
        for (const [digits, shown] of [['7', '1 tier · 20⁰'], [MAX_DIGITS, 'Top: 20⁹⁸ ↓ Bottom: 20⁰']]) {
          await showNumber(page, digits);
          await expect(indicator(page).locator('[aria-hidden="true"]'), `${width}px`).toHaveText(shown);
          const { content, indicator: ind } = await headerLayout(page);
          expect(ind.x, `${width}px`).toBeGreaterThanOrEqual(content.left - 0.5);
          expect(ind.x + ind.width, `${width}px`).toBeLessThanOrEqual(content.right + 0.5);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px`).toBe(0);
        }
      }
      // Date mode: the year's three tiers, not the day's one
      await showDate(page);
      await expect(indicator(page).locator('[aria-hidden="true"]')).toHaveText('Top: 20² ↓ Bottom: 20⁰');
      await expect(indicator(page)).toHaveText(/Top tier 20 to the power of 2, down to the bottom tier, 20 to the power of 0$/);
      // The heading's accessible name is unchanged, and the indicator is not part of the numeral
      await expect(heading(page)).toHaveAccessibleName('Mayan Numeral Stack');
      expect(await page.locator('svg.mep-svg').evaluate((svg) => svg.textContent)).not.toMatch(/Top|tier/);
    });

    test('keeps Zoom in, Reset and the percentage in place at every zoom level', async ({ page }) => {
      for (const size of [{ width: 1280, height: 800 }, { width: 320, height: 568 }]) {
        await page.setViewportSize(size);
        await showNumber(page, FIFTY_DIGITS);
        const positions = new Set<string>();
        for (const level of LEVELS) {
          await zoomTo(page, level);
          const { parts } = await headerLayout(page);
          positions.add(JSON.stringify(parts.map((p) => [p.x, p.width].map((v) => Math.round(v * 2) / 2))));
        }
        expect(positions.size, `${size.width} × ${size.height}`).toBe(1);
        await page.getByRole('button', { name: 'Reset' }).click();
      }
    });

    test('keeps the tab order and the shortcuts: Zoom out, Zoom in, Reset, then the viewer', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const viewer = await showNumber(page, FIFTY_DIGITS);
      await page.getByRole('button', { name: 'Zoom out' }).focus();
      for (const name of ['Zoom in', 'Reset']) {
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
      }
      await page.keyboard.press('Tab');
      await expect(viewer).toBeFocused();
      await page.keyboard.press('+');
      await expect(zoomLevel(page)).toHaveText('150%');
      await page.keyboard.press('0');
      await expect(zoomLevel(page)).toHaveText('100%');
      // The percentage and the separator are never focused
      await expect(controls(page).locator('span[aria-live], span[aria-hidden="true"]')).toHaveCount(2);
      expect(await controls(page).locator('span').evaluateAll((spans) => spans.filter((s) => (s as HTMLElement).tabIndex >= 0).length)).toBe(0);
    });

    test('keeps the point at the viewer’s centre while the header wraps and unwraps', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const viewer = await showNumber(page, MAX_DIGITS);
      await zoomTo(page, '400%');
      await viewer.evaluate((el) => el.scrollTo(300, 5000));
      // Two frames, for the scroll event to be followed
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      const start = await measure(page);
      for (const [width, height, wraps] of [[375, 667, true], [768, 1024, false], [320, 568, true], [768, 1024, false]] as const) {
        await page.setViewportSize({ width, height });
        await expect.poll(async () => {
          const m = await measure(page);
          return Math.max(Math.abs(m.centre.x - start.centre.x), Math.abs(m.centre.y - start.centre.y)) * m.pxPerUnit;
        }, `${width} × ${height}`).toBeLessThanOrEqual(1);
        const { heading: h, controls: c } = await headerLayout(page);
        expect(c.y >= h.y + h.height, `${width} × ${height}`).toBe(wraps);
      }
      // Back at the starting size, exactly where it was
      expect(Math.abs((await measure(page)).scrollTop - start.scrollTop)).toBeLessThanOrEqual(1);
    });
  });

  test.describe('glyph key (UI-13 slice 5c)', () => {
    const key = (page: Page) => page.getByRole('list', { name: 'Glyph key' });
    // The theme's muted text colour, the labels'; and its accent text colour, the glyphs'
    const FG_MUTED = { light: 'rgb(79, 71, 56)', dark: 'rgb(194, 182, 157)' } as const;
    const ACCENT_FG = { light: 'rgb(115, 92, 0)', dark: 'rgb(229, 193, 88)' } as const;

    /** The key, its entries' glyphs and labels, and the stage and card around it, as laid out */
    const keyLayout = (page: Page) =>
      key(page).evaluate((list) => {
        const box = (el: Element) => {
          const { x, y, width, height } = el.getBoundingClientRect();
          return { x, y, width, height };
        };
        const stage = document.querySelector('[role="group"][aria-label="Numeral viewer"]')!;
        const card = stage.closest('[data-viewer-card]')!;
        return {
          list: box(list),
          stage: box(stage),
          card: box(card),
          entries: [...list.children].map((item) => {
            const svg = item.querySelector('svg')!;
            const glyph = (svg.firstElementChild as SVGGraphicsElement).getBBox();
            const { x, y, width, height } = svg.viewBox.baseVal;
            return {
              item: box(item),
              svg: box(svg),
              label: box(item.querySelector('span')!),
              text: item.textContent!,
              viewBox: { x, y, width, height },
              glyph: { x: glyph.x, y: glyph.y, width: glyph.width, height: glyph.height },
              color: getComputedStyle(svg).color,
              overflow: getComputedStyle(svg).overflow,
              labelColor: getComputedStyle(item).color,
              clipped: item.scrollWidth - item.clientWidth,
            };
          }),
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

    test('shows the actual glyphs at 0.6 of their size beside their labels, in one row under the stage, in both themes', async ({ page }) => {
      // Seven screen sizes in each theme
      test.slow();
      for (const theme of ['light', 'dark'] as const) {
        await page.evaluate((theme) => localStorage.setItem('mayastack:theme', theme), theme);
        for (const screen of [...SCREENS, { width: 1024, height: 768, stage: 488 }]) {
          const what = `${theme}, ${screen.width} × ${screen.height}`;
          await page.setViewportSize(screen);
          await page.goto('./');
          await showNumber(page, FIFTY_DIGITS);
          const { list, stage, card, entries, pageOverflow } = await keyLayout(page);

          expect(entries.map((e) => e.text), what).toEqual(['Shell = 0', 'Dot = 1', 'Bar = 5']);
          // 12 px under the stage, the last thing in the card, across its content box
          expect(list.y - (stage.y + stage.height), what).toBeCloseTo(12, 0);
          expect(card.y + card.height - (list.y + list.height), what).toBeCloseTo(16, 0);
          expect(list.x, what).toBeCloseTo(card.x + 16, 0);
          expect(list.width, what).toBeCloseTo(card.width - 32, 0);
          // The stage's height is unchanged (slice 5d refines it); from lg, the card still fits the screen
          expect(stage.height, what).toBeCloseTo(screen.stage, 0);
          if (screen.width >= 1024) expect(card.y + card.height, what).toBeLessThanOrEqual(screen.height);
          expect(pageOverflow, what).toBe(0);

          // One row at every approved size, starting at the content edge, in line with the
          // heading and the stage: it fits 256 px, the narrowest content box
          const first = entries[0].item;
          for (const e of entries) expect(e.item.y, what).toBeCloseTo(first.y, 0);
          expect(first.x, what).toBeCloseTo(list.x, 1);
          expect(first.x, what).toBeCloseTo(stage.x, 1);

          for (const e of entries) {
            const which = `${what}: ${e.text}`;
            // The glyph fills its viewBox exactly, drawn at scale 1: the shell's outline with its
            // stroke's outer half; the dot's circle; the bar's line, whose 6-unit stroke its box omits
            if (e.text === 'Shell = 0') {
              expect(e.viewBox.x, which).toBeCloseTo(e.glyph.x - 0.75, 3);
              expect(e.viewBox.y, which).toBeCloseTo(e.glyph.y - 0.75, 3);
              expect(e.viewBox.width, which).toBeCloseTo(e.glyph.width + 1.5, 3);
              expect(e.viewBox.height, which).toBeCloseTo(e.glyph.height + 1.5, 3);
            } else if (e.text === 'Dot = 1') {
              expect(e.viewBox, which).toEqual(e.glyph);
            } else {
              expect([e.viewBox.x, e.viewBox.width, e.viewBox.height], which).toEqual([e.glyph.x, e.glyph.width, 6]);
              expect(e.glyph.y, which).toBe(3);
            }
            // At 0.6 of the viewer's size at 100%, keeping the glyph's proportions
            expect(e.svg.width, which).toBeCloseTo(e.viewBox.width * 0.6, 1);
            expect(e.svg.height, which).toBeCloseTo(e.viewBox.height * 0.6, 1);
            // Before its label, centred on it, nothing clipped; the glyph in the accent text
            // colour, not clipped to its flush viewBox, and the label in the muted text colour
            expect(Math.abs(e.svg.y + e.svg.height / 2 - (e.label.y + e.label.height / 2)), which).toBeLessThanOrEqual(0.5);
            expect(e.svg.x + e.svg.width, which).toBeLessThanOrEqual(e.label.x);
            expect(e.clipped, which).toBe(0);
            expect(e.color, which).toBe(ACCENT_FG[theme]);
            expect(e.overflow, which).toBe('visible');
            expect(e.labelColor, which).toBe(FG_MUTED[theme]);
          }
        }
      }
    });

    test('wraps whole entries, each glyph staying beside its label, where the key is narrow', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await showNumber(page, '26');
      // Narrower than any screen makes it, to see how it wraps
      await key(page).evaluate((list) => { list.style.width = '120px'; });
      const { list, entries } = await keyLayout(page);

      expect(new Set(entries.map((e) => Math.round(e.item.y))).size).toBeGreaterThan(1);
      for (const e of entries) {
        expect(Math.abs(e.svg.y + e.svg.height / 2 - (e.label.y + e.label.height / 2)), e.text).toBeLessThanOrEqual(0.5);
        expect(e.svg.x + e.svg.width, e.text).toBeLessThanOrEqual(e.label.x);
        expect(e.item.x, e.text).toBeGreaterThanOrEqual(list.x - 0.5);
        expect(e.item.x + e.item.width, e.text).toBeLessThanOrEqual(list.x + list.width + 0.5);
        expect(e.clipped, e.text).toBe(0);
      }
    });

    test('is in Date mode too, outside the numeral’s SVG, and not shown without a result', async ({ page }) => {
      await showDate(page);
      await expect(key(page).getByRole('listitem')).toHaveText(['Shell = 0', 'Dot = 1', 'Bar = 5']);
      expect(await key(page).evaluate((list) => list.closest('svg, [role="group"][aria-label="Numeral viewer"]'))).toBeNull();
      expect(await page.locator('svg.mep-svg').evaluate((svg) => svg.textContent)).not.toMatch(/Shell|Dot|Bar/);

      await page.getByRole('radio', { name: 'Number' }).check();
      await page.getByLabel('Decimal integer').fill('');
      await expect(key(page)).toHaveCount(0);
    });
  });

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
      const resultCard = viewerCard(page);

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

  // UI-13, slice 5c: the glyph key, on screen beside the numeral, is never exported
  test('exports only the numeral’s own glyphs, at its own size, with the glyph key on screen', async ({ page }) => {
    // 26 = 1 × 20¹ + 6 × 20⁰: two dots and a bar; the key draws one more dot, outside the SVG
    await showNumber(page, '26');
    const key = page.getByRole('list', { name: 'Glyph key' });
    await expect(key).toBeVisible();
    expect(await page.locator('svg.mep-svg circle').count()).toBe(2);
    expect(await key.locator('circle').count()).toBe(1);

    const svg = (await exportFile(page, 'svg')).data.toString('utf-8');
    expect(svg).toContain('width="350" height="160" viewBox="0 0 350 160"');
    expect(svg.match(/<circle/g)).toHaveLength(2);
    expect(svg).not.toMatch(/Shell|Dot = |Bar = |Glyph key|<ul|<li/);
    expect(pngSize((await exportFile(page, 'png')).data)).toEqual({ width: 350, height: 160 });
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
    (await viewerCard(page).boundingBox())!.y;

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
    // Once any zoom animation has ended: the final layout
    settleZoom(page).then(() => page.evaluate((stacksPerGroup) => {
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
        // Across the group's whole width, exactly as its cards (changed deliberately in UI-13,
        // from 3% in at each side): in Number mode, the whole numeral
        const expectedLeft = svg.left + group * (groupWidth + 25) * unit;
        const expectedWidth = groupWidth * unit;

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
    }, stacksPerGroup));

  /**
   * Checks every band in view against the rendered numeral: it covers its tier's 80-unit cell,
   * less 2 units at its top and bottom, spans exactly its group, and contains its tier's digit
   * stack. Each group has exactly one band per tier of its own, and none above them.
   * Returns how many bands were checked, and what was wrong.
   */
  const checkBands = (page: Page, stacksPerGroup: number[]) =>
    settleZoom(page).then(() => page.evaluate((stacksPerGroup) => {
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
        // Across the group's whole width (changed deliberately in UI-13, from 3% in at each side,
        // as the hairlines): in Number mode, the whole numeral
        const expectedLeft = svg.left + group * (groupWidth + 25) * unit;
        const expectedWidth = groupWidth * unit;

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
    }, stacksPerGroup));

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
    await expect(viewerCard(page).getByRole('switch')).toHaveCount(0);
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
    // On screen only, the SVG's own background is transparent. Changed deliberately in UI-13:
    // the viewer's paper paints it, behind the cards' layer, which paints only the cards
    const styles = await viewerGroup(page).evaluate((viewer) => {
      const svg = viewer.querySelector('svg.mep-svg')!;
      return {
        svgPosition: getComputedStyle(svg).position,
        rectFill: getComputedStyle(svg.querySelector('rect')!).fill,
        rectAttribute: svg.querySelector('rect')!.getAttribute('fill'),
        layer: getComputedStyle(viewer.querySelector('[data-place-tier-guides]')!).backgroundColor,
        paper: getComputedStyle(viewer.querySelector('[data-numeral-paper]')!).backgroundColor,
      };
    });
    expect(styles).toEqual({
      svgPosition: 'relative',
      rectFill: 'rgba(0, 0, 0, 0)',
      rectAttribute: 'rgba(255, 255, 255, 1)',
      layer: 'rgba(0, 0, 0, 0)',
      paper: 'rgb(255, 255, 255)',
    });

    // Without the cards, the SVG is not lifted, and its background stays transparent over the paper
    await bandsSwitch(page).click();
    const plain = await viewerGroup(page).evaluate((viewer) => {
      const svg = viewer.querySelector('svg.mep-svg')!;
      return [
        getComputedStyle(svg).position,
        getComputedStyle(svg.querySelector('rect')!).fill,
        getComputedStyle(viewer.querySelector('[data-numeral-paper]')!).backgroundColor,
      ];
    });
    expect(plain).toEqual(['static', 'rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)']);
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
     * from 15 to 335 units across, within the card (0 to 350 since UI-13), crossing its vertical lines
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

    // Without the guides, the paper's background shows under the same grid (UI-13: the SVG's own stays transparent)
    await page.getByRole('switch', { name: 'Show Grid:' }).click();
    await bandsSwitch(page).click();
    await hairlinesSwitch(page).click();
    await expect(bands(page)).toHaveCount(0);
    await expect(hairlines(page)).toHaveCount(0);
    const plain = await rects();
    expect(plain).toMatchObject({ svgPosition: 'static', first: 'rect', firstFill: 'rgba(0, 0, 0, 0)', gridIsFirst: false });
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
        // any glyph, a point of its card near its side (UI-13: the cards have no side inset), and
        // a point in the 4-unit gap between the top two tiers' cards
        const bar = (await viewer.locator('g[data-digit-index="0"] path').first().boundingBox())!;
        const svg = (await viewer.locator('svg.mep-svg').boundingBox())!;
        const unit = svg.width / 350;
        const points = {
          glyph: { x: Math.round(bar.x + bar.width / 2), y: Math.round(bar.y + bar.height / 2) },
          card: { x: Math.round(svg.x + 30 * unit), y: Math.round(svg.y + 40 * unit) },
          side: { x: Math.round(svg.x + 4 * unit), y: Math.round(svg.y + 40 * unit) },
          gap: { x: Math.round(svg.x + 30 * unit), y: Math.round(svg.y + 80 * unit) },
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
      // With them: the card is visible, also near its side, the gap between cards is not, and
      // the glyph is drawn over the card
      const carded = over(cardColour, background);
      close(on.card, carded);
      close(on.side, carded);
      close(off.side, background);
      close(on.gap, background);
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

  /**
   * UI-13: the viewer's paper, between the stage box and the zoom wrapper, paints the numeral's
   * background once across its fixed 12 px padding and the numeral, with the SVG's own
   * background rectangle transparent on screen; the guides keep their geometry inside the zoom
   * wrapper, and the exports are the SVG alone.
   */
  test.describe('viewer paper (UI-13)', () => {
    // 1 × 20³: 4 tiers, 350 × 320 units; at 150%, 525 × 480 px, which with both paddings fits
    // the 1440 × 900 stage (686 × 620 px), centred, away from its inset shadow and the Export trigger
    const FOUR_TIERS = '8000';
    const TRANSLUCENT = { r: 20, g: 40, b: 90, a: 0.35 };

    /** The paper's and the zoom wrapper's boxes on screen, in CSS px */
    /** Once any zoom animation has ended: the final layout */
    const boxes = (page: Page) =>
      settleZoom(page).then(() => page.evaluate(() => {
        const rect = (el: Element) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        const paper = document.querySelector('[data-numeral-paper]')!;
        const wrapper = paper.querySelector(':scope > [data-numeral-image]')!;
        return { paper: rect(paper), wrapper: rect(wrapper), svg: rect(wrapper.querySelector('svg.mep-svg')!), dpr: devicePixelRatio };
      }));

    test('keeps a fixed 12 px margin around the zoom wrapper, clear of the guides, which keep their geometry', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await openWith(page, BOTH_ON);
      const viewer = await showNumber(page, FIVE_TIERS);
      const zoomIn = page.getByRole('button', { name: 'Zoom in' });
      const zoomOut = page.getByRole('button', { name: 'Zoom out' });
      for (const [level, button, presses] of [['100%', zoomIn, 0], ['25%', zoomOut, 3], ['150%', zoomIn, 4], ['400%', zoomIn, 3]] as const) {
        for (let i = 0; i < presses; i++) await button.click();
        await expect(zoomLevel(page)).toHaveText(new RegExp(`^${level}`));
        await viewer.evaluate((el) => el.scrollTo(0, 0));
        const { paper, wrapper, svg } = await boxes(page);
        // The same 12 px at every zoom level, on all four sides: the padding does not zoom
        for (const [side, gap] of Object.entries({
          left: wrapper.left - paper.left, top: wrapper.top - paper.top,
          right: paper.right - wrapper.right, bottom: paper.bottom - wrapper.bottom,
        })) expect(gap, `${side} at ${level}`).toBeCloseTo(12, 1);
        // The zoom wrapper is the numeral's box, at its zoomed size
        expect(svg, level).toEqual(wrapper);
        expect(wrapper.width, level).toBeCloseTo(350 * (parseFloat(level) / 100), 1);

        // Every band and hairline lies within the zoom wrapper, never in the paper's margin
        const outside = await viewer.evaluate((el, w) =>
          [...el.querySelectorAll('[data-place-tier-band], [data-tier-hairline]')]
            .map((g) => g.getBoundingClientRect())
            .filter((r) => r.left < w.left - 0.5 || r.right > w.right + 0.5 || r.top < w.top - 0.5 || r.bottom > w.bottom + 0.5).length,
        wrapper);
        expect(outside, level).toBe(0);
        // Each band and each hairline spans the zoom wrapper exactly, from its left edge to its
        // right (UI-13), so the hairlines' ends meet the bands' sides
        const spans = (selector: string) => viewer.evaluate((el, selector) =>
          [...el.querySelectorAll(selector)].map((b) => {
            const r = b.getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width };
          }), selector);
        for (const [guide, count] of [['[data-place-tier-band]', 5], ['[data-tier-hairline]', 4]] as const) {
          const found = await spans(guide);
          expect(found, `${guide} at ${level}`).toHaveLength(count);
          for (const box of found) {
            expect(Math.abs(box.left - wrapper.left), `${guide} at ${level}: left`).toBeLessThanOrEqual(0.05);
            expect(Math.abs(box.right - wrapper.right), `${guide} at ${level}: right`).toBeLessThanOrEqual(0.05);
            expect(Math.abs(box.width - wrapper.width), `${guide} at ${level}: width`).toBeLessThanOrEqual(0.05);
          }
        }
        // And they keep their alignment with the tiers, the cards' insets and the gaps between them
        for (const result of [await checkBands(page, [5]), await checkHairlines(page, [5])]) {
          expect(result.checked, level).toBeGreaterThan(0);
          expect(result.problems, level).toEqual([]);
        }
      }
      // Hairlines between the tiers only: 4 for 5 tiers
      await expect(hairlines(page)).toHaveCount(4);
    });

    /**
     * Samples, from a screenshot of the paper at device resolution, four lines that cross from
     * the paper's padding into the SVG, one across each edge, all clear of the glyphs, the cards
     * and the hairlines: the side rows in the 4-unit gap between the top two tiers' cards, midway
     * between the upper card's bottom edge and the hairline's top edge (both cards and hairline
     * span the numeral's width since UI-13); the columns within the cards' 2-unit top and bottom
     * insets. Returns each line's pixels, in device pixels.
     */
    async function boundaryLines(page: Page) {
      await page.mouse.move(0, 0); // no card hovered
      // The page at its top, where the whole viewer is on screen, clear of the sticky header
      // (clicking the guide switches may have scrolled it)
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      const { paper, wrapper, dpr } = await boxes(page);
      const header = await page.evaluate(() => document.querySelector('header')?.getBoundingClientRect().bottom ?? 0);
      expect(paper.top, 'the paper below the page header').toBeGreaterThan(header);
      const unit = wrapper.width / 350;
      // Inside the paper's box, clear of its edge and shadow, which are drawn outside it
      const clip = {
        x: Math.ceil(paper.left) + 1, y: Math.ceil(paper.top) + 1,
        width: Math.floor(paper.right) - 1 - (Math.ceil(paper.left) + 1),
        height: Math.floor(paper.bottom) - 1 - (Math.ceil(paper.top) + 1),
      };
      // The upper card ends 2 units above the boundary at 80 units; the 1 px hairline is centred on it
      const tierGap = wrapper.top + (78 * unit + (80 * unit - 0.5)) / 2;
      const midX = wrapper.left + wrapper.width / 2;
      // [from, to] in CSS px, along x for a row and along y for a column, each across one edge
      const lines = {
        left: { along: 'x', at: tierGap, from: clip.x, to: wrapper.left + 8 * unit, edge: wrapper.left },
        right: { along: 'x', at: tierGap, from: wrapper.right - 8 * unit, to: clip.x + clip.width, edge: wrapper.right },
        top: { along: 'y', at: midX, from: clip.y, to: wrapper.top + 1 * unit, edge: wrapper.top },
        bottom: { along: 'y', at: midX, from: wrapper.bottom - 1 * unit, to: clip.y + clip.height, edge: wrapper.bottom },
      } as const;
      for (const [name, line] of Object.entries(lines)) {
        // Each line reaches at least 1.4 CSS px into the padding and into the SVG
        expect(Math.min(line.edge - line.from, line.to - line.edge), name).toBeGreaterThanOrEqual(1.4);
      }
      const png = await page.screenshot({ clip });
      return page.evaluate(async ({ data, clip, dpr, lines }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        [canvas.width, canvas.height] = [image.width, image.height];
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const pixel = (x: number, y: number) => {
          const [r, g, b] = context.getImageData(x, y, 1, 1).data;
          return { r, g, b };
        };
        return {
          scale: image.width / clip.width,
          dpr,
          lines: Object.fromEntries(Object.entries(lines).map(([name, l]) => {
            const origin = l.along === 'x' ? clip.x : clip.y;
            const across = Math.round(((l.along === 'x' ? l.at - clip.y : l.at - clip.x)) * dpr);
            const [from, to] = [Math.ceil((l.from - origin) * dpr), Math.floor((l.to - origin) * dpr) - 1];
            const pixels = [];
            for (let p = from; p <= to; p++) pixels.push(l.along === 'x' ? pixel(p, across) : pixel(across, p));
            return [name, pixels];
          })),
        };
      }, { data: png.toString('base64'), clip, dpr, lines });
    }

    /** Expects every pixel of every line to be the background, composited once over the canvas */
    function expectSinglePaint(sampled: Awaited<ReturnType<typeof boundaryLines>>, expected: Rgb, what: string) {
      for (const [name, pixels] of Object.entries(sampled.lines)) {
        expect(pixels.length, `${what}, ${name}`).toBeGreaterThanOrEqual(4);
        for (const [i, p] of pixels.entries()) {
          for (const c of ['r', 'g', 'b'] as const) {
            // No seam: every pixel, on both sides of the edge, as its neighbour (rounding only)
            if (i > 0) expect(Math.abs(p[c] - pixels[i - 1][c]), `${what}, ${name}, pixel ${i}: ${JSON.stringify(pixels)}`).toBeLessThanOrEqual(1);
            // Painted once: a second translucent layer would darken it far beyond rounding
            expect(Math.abs(p[c] - expected[c]), `${what}, ${name}, pixel ${i}: ${JSON.stringify(p)} vs ${JSON.stringify(expected)}`).toBeLessThanOrEqual(2);
          }
        }
      }
    }

    for (const [dpr, themes] of [[1.5, ['light', 'dark']], [2, ['light']]] as const) {
      test.describe(`at ${dpr * 100}% display scaling`, () => {
        test.use({ deviceScaleFactor: dpr, viewport: { width: 1440, height: 900 } });

        for (const theme of themes) {
          test(`paints the background once across the padding and the SVG, with no seam, at 150% zoom, guides off and on (${theme})`, async ({ page }) => {
            for (const [name, background] of [['translucent', TRANSLUCENT], ['opaque white', { r: 255, g: 255, b: 255, a: 1 }]] as const) {
              await openWith(page, {
                'mayastack:theme': theme,
                'mayastack:backgroundColor': JSON.stringify(background),
                'mayastack:showPlaceTierGuides': 'false',
                'mayastack:showTierHairlines': 'false',
              });
              const viewer = await showNumber(page, FOUR_TIERS);
              await page.getByRole('button', { name: 'Zoom in' }).click();
              await expect(zoomLevel(page)).toHaveText('150%');
              await viewer.scrollIntoViewIfNeeded();
              // Short enough to be centred, so nothing scrolls
              expect(await viewer.evaluate((el) => [el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight])).toEqual([0, 0]);
              const expected = over(background, BACKDROP[theme]);

              const off = await boundaryLines(page);
              expect(off.dpr).toBe(dpr);
              expect(off.scale).toBeCloseTo(dpr, 1);
              // A fractional device-pixel position, where separately painted areas would leave a seam
              expectSinglePaint(off, expected, `${name}, guides off`);

              await bandsSwitch(page).click();
              await hairlinesSwitch(page).click();
              await expect(bands(page)).toHaveCount(4);
              await expect(hairlines(page)).toHaveCount(3);
              expectSinglePaint(await boundaryLines(page), expected, `${name}, guides on`);
              // Reset for the next background (saved preferences, overridden by the next init script)
              await page.evaluate(() => localStorage.clear());
            }
          });
        }
      });
    }

    test('exports neither the paper nor its padding, with the SVG’s own translucent background and size unchanged', async ({ page }) => {
      await openWith(page, { 'mayastack:backgroundColor': JSON.stringify(TRANSLUCENT) });
      await showNumber(page, FOUR_TIERS);
      const svgBefore = await exportFile(page, 'svg');
      const pngBefore = await exportFile(page, 'png');
      await page.getByRole('button', { name: '📦 Export' }).click(); // close the menu

      // Zoomed and with both guides, where the paper paints the background on screen
      await page.getByRole('button', { name: 'Zoom in' }).click();
      await expect(zoomLevel(page)).toHaveText('150%');
      await bandsSwitch(page).click();
      await hairlinesSwitch(page).click();
      const svgAfter = await exportFile(page, 'svg');
      const pngAfter = await exportFile(page, 'png');
      expect(svgAfter.data.equals(svgBefore.data)).toBe(true);
      expect(pngAfter.data.equals(pngBefore.data)).toBe(true);

      // The SVG's background rectangle keeps its fill in the file; no paper, padding or edge
      const svg = svgAfter.data.toString('utf-8');
      expect(svg).toMatch(/^<svg[^>]* width="350" height="320"/);
      expect(svg).toMatch(/<rect x="0" y="0" width="100%" height="100%" fill="rgba\(20, 40, 90, 0\.35\)"/);
      expect(svg).not.toMatch(/numeral-paper|ring-|shadow|padding/);
      // The PNG is the numeral alone, at its own size, its corner the translucent background
      expect(pngSize(pngAfter.data)).toEqual({ width: 350, height: 320 });
      const corner = await page.evaluate(async (data) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        [canvas.width, canvas.height] = [image.width, image.height];
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const [r, g, b, a] = context.getImageData(1, 1, 1, 1).data;
        return { r, g, b, a };
      }, pngAfter.data.toString('base64'));
      expect(Math.abs(corner.a - Math.round(0.35 * 255))).toBeLessThanOrEqual(1);
      for (const c of ['r', 'g', 'b'] as const) expect(Math.abs(corner[c] - TRANSLUCENT[c])).toBeLessThanOrEqual(3);
    });
  });
});

test.describe('zoom animation (UI-13 slice 6)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  /** Something the sampler does in the page, at a frame: a zoom control, a scroll, or a stage resize */
  type Step =
    | { at: number; do: 'zoom in' | 'zoom out' | 'reset' | 'key +' | 'key -' }
    | { at: number; do: 'scroll by'; top: number }
    | { at: number; do: 'stage height'; height: string };

  /**
   * Samples every frame in the page, from just before the first step until the paper has had no
   * running animation for 3 frames (at most 2 s): the numeral image's box as drawn, the stage's
   * scroll extent and position, and the paper's running animations; and every animation started
   * on the paper meanwhile, with its final play state. Each frame is sampled first, as painted,
   * then its steps run, in the page, so a step lands during an animation deterministically; the
   * next frame is the first to show its result. Clicks and key events are the real controls'
   * (`click()` and `keydown` on the viewer), handled by React.
   * The viewer's `stage height` step sets an inline height on the stage, as a layout change would,
   * and an empty height removes it again: a test-only resize, observed by the viewer.
   */
  const sample = (page: Page, steps: Step[]) =>
    page.evaluate(async (steps) => {
      const viewer = document.querySelector<HTMLElement>('[data-numeral-stage]')!;
      const paper = document.querySelector<HTMLElement>('[data-numeral-paper]')!;
      const image = document.querySelector<HTMLElement>('[data-numeral-image]')!;
      const units = document.querySelector<SVGSVGElement>('svg.mep-svg')!.viewBox.baseVal.width;
      const button = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
      const frames: {
        image: { left: number; top: number; width: number; height: number };
        centre: { x: number; y: number };
        pxPerUnit: number;
        scrollWidth: number;
        scrollHeight: number;
        scrollTop: number;
        animations: { duration: unknown; easing: unknown; transform: string }[];
      }[] = [];
      // Every animation started on the paper, also one cancelled before any frame sampled it
      const seen: Animation[] = [];
      const animate = paper.animate;
      paper.animate = function (...args: Parameters<HTMLElement['animate']>) {
        const animation = animate.apply(paper, args);
        seen.push(animation);
        return animation;
      };
      const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      let still = 0;
      for (let frame = 0; frame < 120 && still < 3; frame++) {
        await nextFrame();
        const r = image.getBoundingClientRect();
        const v = viewer.getBoundingClientRect();
        const pxPerUnit = r.width / units;
        const running = paper.getAnimations();
        frames.push({
          image: { left: r.left, top: r.top, width: r.width, height: r.height },
          centre: {
            x: (v.left + viewer.clientLeft + viewer.clientWidth / 2 - r.left) / pxPerUnit,
            y: (v.top + viewer.clientTop + viewer.clientHeight / 2 - r.top) / pxPerUnit,
          },
          pxPerUnit,
          scrollWidth: viewer.scrollWidth,
          scrollHeight: viewer.scrollHeight,
          scrollTop: viewer.scrollTop,
          animations: running.map((a) => {
            const timing = a.effect!.getTiming();
            return { duration: timing.duration, easing: timing.easing, transform: getComputedStyle(paper).transform };
          }),
        });
        const lastStep = Math.max(...steps.map((s) => s.at));
        still = frame >= lastStep && running.length === 0 ? still + 1 : 0;
        // Then this frame's steps: sampled from the next frame on
        for (const step of steps.filter((s) => s.at === frame)) {
          if (step.do === 'zoom in') button('Zoom in').click();
          else if (step.do === 'zoom out') button('Zoom out').click();
          else if (step.do === 'reset') button('Reset').click();
          else if (step.do === 'key +' || step.do === 'key -') {
            viewer.dispatchEvent(new KeyboardEvent('keydown', { key: step.do.slice(-1), bubbles: true, cancelable: true }));
          } else if (step.do === 'scroll by') viewer.scrollBy({ top: step.top, behavior: 'instant' });
          else if (step.do === 'stage height') viewer.style.height = step.height;
        }
      }
      delete (paper as Partial<HTMLElement>).animate; // the prototype's again
      return {
        frames,
        animations: seen.map((a) => a.playState),
        paperTransform: getComputedStyle(paper).transform,
        paperStyle: paper.getAttribute('style'),
      };
    }, steps);

  type Sampled = Awaited<ReturnType<typeof sample>>;

  /** How far each frame's drawn centre point is from a point, in CSS px at the drawn scale */
  const drift = ({ frames }: Sampled, point: { x: number; y: number }) =>
    frames.map((f) => Math.max(Math.abs(f.centre.x - point.x), Math.abs(f.centre.y - point.y)) * f.pxPerUnit);

  /** Counts the paper's `animate` calls from now on, whatever triggers them */
  const countAnimations = (page: Page) =>
    page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('[data-numeral-paper]')!;
      const original = paper.animate.bind(paper);
      (window as unknown as { zoomAnimations: number }).zoomAnimations = 0;
      paper.animate = (...args: Parameters<HTMLElement['animate']>) => {
        (window as unknown as { zoomAnimations: number }).zoomAnimations++;
        return original(...args);
      };
    });
  const animationCount = (page: Page) => page.evaluate(() => (window as unknown as { zoomAnimations: number }).zoomAnimations);

  /** The 99-tier numeral, scrolled to its middle, where no zoom is clamped; the point at the centre */
  async function showLargeAtMiddle(page: Page) {
    const viewer = await showNumber(page, MAX_DIGITS);
    await viewer.scrollIntoViewIfNeeded();
    await viewer.evaluate((el) => el.scrollTo({ top: (el.scrollHeight - el.clientHeight) / 2, behavior: 'instant' }));
    // The scroll event arrives, and is taken as the user's view
    await viewer.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return viewer;
  }

  /** The point at the stage's centre in the final layout, in SVG units, once nothing animates */
  const layoutCentre = async (page: Page) => {
    await settleZoom(page);
    return page.evaluate(() => {
      const viewer = document.querySelector<HTMLElement>('[data-numeral-stage]')!;
      const r = document.querySelector('[data-numeral-image]')!.getBoundingClientRect();
      const v = viewer.getBoundingClientRect();
      const pxPerUnit = r.width / document.querySelector<SVGSVGElement>('svg.mep-svg')!.viewBox.baseVal.width;
      return {
        x: (v.left + viewer.clientLeft + viewer.clientWidth / 2 - r.left) / pxPerUnit,
        y: (v.top + viewer.clientTop + viewer.clientHeight / 2 - r.top) / pxPerUnit,
      };
    });
  };

  test('eases the paper from the earlier scale to the final layout, keeping the anchor, zooming in and out', async ({ page }) => {
    await showLargeAtMiddle(page);
    const point = await layoutCentre(page);

    for (const [step, from, to] of [['zoom in', 350, 525], ['zoom out', 525, 350], ['zoom out', 350, 262.5]] as const) {
      const sampled = await sample(page, [{ at: 1, do: step }]);
      const { frames } = sampled;
      // From the frame after the step's, the zoom's first laid out
      const after = frames.slice(2);
      // One animation, on the paper, with the approved timing; ended with nothing left on the paper
      expect(sampled.animations, step).toEqual(['finished']);
      const timings = after.flatMap((f) => f.animations);
      expect(timings.length, `${step}: frames animated`).toBeGreaterThanOrEqual(3);
      for (const t of timings) expect([t.duration, t.easing], step).toEqual([200, 'cubic-bezier(0.4, 0, 0.2, 1)']);
      expect(sampled.paperTransform, step).toBe('none');
      expect(sampled.paperStyle, step).not.toMatch(/transform/);
      // Drawn at the earlier size at first, then easing, only ever between the two, to the final one
      expect(frames[0].image.width, step).toBeCloseTo(from, 1);
      const widths = after.map((f) => f.image.width);
      for (const w of widths) expect(Math.min(from, to) - 0.5 <= w && w <= Math.max(from, to) + 0.5, `${step}: ${w}`).toBe(true);
      expect(widths.some((w) => Math.abs(w - from) > 1 && Math.abs(w - to) > 1), `${step}: an intermediate frame`).toBe(true);
      expect(widths.at(-1), step).toBeCloseTo(to, 3);
      // The anchor stays at the centre in every frame, and the scrollable area is the final layout's throughout
      for (const [i, d] of drift(sampled, point).entries()) expect(d, `${step}, frame ${i}`).toBeLessThanOrEqual(1);
      const final = frames.at(-1)!;
      for (const f of after) expect([f.scrollWidth, f.scrollHeight], step).toEqual([final.scrollWidth, final.scrollHeight]);
    }
    // The final layout: the paper's 12 px padding, and the exact width
    const paper = await page.evaluate(() => {
      const p = document.querySelector('[data-numeral-paper]')!.getBoundingClientRect();
      const i = document.querySelector('[data-numeral-image]')!.getBoundingClientRect();
      return [i.left - p.left, i.top - p.top, p.right - i.right, p.bottom - i.bottom, i.width];
    });
    for (const gap of paper.slice(0, 4)) expect(gap).toBeCloseTo(12, 1);
    expect(paper[4]).toBeCloseTo(262.5, 3);
  });

  test('keeps the anchor and the final scrollable area through 25% to 400% and back, on the 99-tier numeral', async ({ page }) => {
    test.slow();
    await showLargeAtMiddle(page);
    const point = await layoutCentre(page);
    // With the keyboard shortcuts, each step's animation running to its end
    const expected = [262.5, 175, 87.5, 175, 262.5, 350, 525, 700, 1050, 1400, 1050, 700, 525, 350];
    const keys = ['-', '-', '-', '+', '+', '+', '+', '+', '+', '+', '-', '-', '-', '-'] as const;
    for (const [i, key] of keys.entries()) {
      const sampled = await sample(page, [{ at: 1, do: `key ${key}` }]);
      const what = `step ${i + 1} (${key}) to ${expected[i]} px`;
      expect(sampled.animations, what).toEqual(['finished']);
      const final = sampled.frames.at(-1)!;
      expect(final.image.width, what).toBeCloseTo(expected[i], 3);
      for (const f of sampled.frames.slice(2)) expect([f.scrollWidth, f.scrollHeight], what).toEqual([final.scrollWidth, final.scrollHeight]);
      expect(Math.max(...drift(sampled, point)), what).toBeLessThanOrEqual(1);
    }
    await expect(zoomLevel(page)).toHaveText('100%');
  });

  test('animates the real controls and the keyboard shortcuts, but not Reset, a new numeral, Date mode or a limit', async ({ page }) => {
    const viewer = await showNumber(page, FIFTY_DIGITS);
    await countAnimations(page);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await settleZoom(page);
    await viewer.focus();
    await page.keyboard.press('+');
    await settleZoom(page);
    await page.keyboard.press('-');
    await settleZoom(page);
    expect(await animationCount(page)).toBe(3);
    // Reset, the button and 0: instant
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await settleZoom(page);
    await viewer.focus();
    await page.keyboard.press('0');
    await expect(zoomLevel(page)).toHaveText('100%');
    expect(await animationCount(page)).toBe(4);
    // A new numeral, and Date mode: no animation
    await showNumber(page, '8000');
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    await expect(page.getByRole('img', { name: /^Mayan numerals for day 15/ })).toBeVisible();
    expect(await page.locator('[data-numeral-paper]').evaluate((p) => p.getAnimations().length)).toBe(0);
    // At the limit, a further zoom changes nothing and animates nothing (the paper may be new)
    await countAnimations(page);
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoomLevel(page)).toHaveText(/^400%/);
    await settleZoom(page);
    const atLimit = await animationCount(page);
    // aria-disabled at the limit, so not clickable for Playwright: the click event itself
    await page.getByRole('button', { name: 'Zoom in' }).dispatchEvent('click');
    await expect(zoomLevel(page)).toHaveText(/^400%/);
    expect(await animationCount(page)).toBe(atLimit);
    expect(await page.locator('[data-numeral-paper]').evaluate((p) => p.getAnimations().length)).toBe(0);
  });

  test('follows each Date-mode zoom with the numeral centred, as without the animation', async ({ page }) => {
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 25th, \d{4}$/ }).first().click();
    await expect(page.getByRole('img', { name: /^Mayan numerals for day 25/ })).toBeVisible();
    await page.getByRole('group', { name: 'Numeral viewer' }).scrollIntoViewIfNeeded();
    // 350 × 240 units: centred in the stage at 100% and at 150%, so the anchor is its middle
    const point = await layoutCentre(page);
    expect(point.x).toBeCloseTo(175, 0);
    for (const step of ['zoom in', 'zoom out'] as const) {
      const sampled = await sample(page, [{ at: 1, do: step }]);
      expect(sampled.animations, step).toEqual(['finished']);
      expect(Math.max(...drift(sampled, point)), step).toBeLessThanOrEqual(1);
    }
    await expect(zoomLevel(page)).toHaveText('100%');
  });

  test('retargets rapid zooms from where the numeral is drawn, one animation at a time, ending exactly', async ({ page }) => {
    await showLargeAtMiddle(page);
    const point = await layoutCentre(page);
    // Three zooms in, two frames apart, then two out: each during the previous one's animation
    const sampled = await sample(page, [
      { at: 1, do: 'zoom in' },
      { at: 3, do: 'zoom in' },
      { at: 5, do: 'key +' },
      { at: 7, do: 'zoom out' },
      { at: 9, do: 'key -' },
    ]);
    expect(sampled.animations).toEqual(['idle', 'idle', 'idle', 'idle', 'finished']);
    for (const f of sampled.frames) expect(f.animations.length).toBeLessThanOrEqual(1);
    // No jump back at a retarget: each new animation continues from where the numeral is drawn,
    // so every frame's drawn width is between the previous frame's and the layout width then in
    // effect (laid out from the frame after each step's), never past either. A restart from
    // either layout would leave that range. Changed deliberately with the slower-starting easing
    // (2026-11-07): the zoom out at frame 7 can still grow the numeral, drawn short of the 300%
    // layout, towards 200%'s, so "only shrinks after frame 7" no longer holds; this checks the
    // same property directly
    const widths = sampled.frames.map((f) => f.image.width);
    const layoutWidth = (frame: number) => {
      const done = [350, 525, 700, 1050, 700, 525].slice(0, 1 + [1, 3, 5, 7, 9].filter((at) => at < frame).length);
      return done.at(-1)!;
    };
    for (let i = 1; i < widths.length; i++) {
      const [from, to] = [widths[i - 1], layoutWidth(i)];
      const within = Math.min(from, to) - 0.5 <= widths[i] && widths[i] <= Math.max(from, to) + 0.5;
      expect(within, `frame ${i}: ${widths[i]}, not from ${from} towards ${to} (${widths})`).toBe(true);
    }
    // The anchor holds in every frame, and the end is the final layout of 150%, exactly
    expect(Math.max(...drift(sampled, point))).toBeLessThanOrEqual(1);
    expect(widths.at(-1)).toBeCloseTo(525, 3);
    expect(sampled.paperTransform).toBe('none');
    await expect(zoomLevel(page)).toHaveText('150%');
  });

  test('ends the animation for a resize during it, and keeps the anchor through resizes during and after', async ({ page }) => {
    const viewer = await showLargeAtMiddle(page);
    const point = await layoutCentre(page);
    // The stage made shorter two frames into the zoom's animation
    const during = await sample(page, [{ at: 1, do: 'zoom in' }, { at: 3, do: 'stage height', height: '300px' }]);
    expect(during.animations).toEqual(['idle']); // cancelled by the resize correction, not finished
    expect(during.paperTransform).toBe('none');
    // In every frame, the resize's correction included
    expect(Math.max(...drift(during, point))).toBeLessThanOrEqual(1);
    expect(await viewer.evaluate((el) => el.clientHeight)).toBeLessThan(300);
    // Back to its own height, then the window resized immediately after the next zoom
    await sample(page, [{ at: 1, do: 'stage height', height: '' }]);
    expect((await layoutCentre(page)).y).toBeCloseTo(point.y, 0);
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await page.setViewportSize({ width: 1024, height: 768 });
    await settleZoom(page);
    const after = await layoutCentre(page);
    const pxPerUnit = 350 / 350;
    expect(Math.abs(after.y - point.y) * pxPerUnit).toBeLessThanOrEqual(1);
    expect(Math.abs(after.x - point.x) * pxPerUnit).toBeLessThanOrEqual(1);
  });

  test('ends the animation for the user’s scrolling, which then becomes the view to keep', async ({ page }) => {
    const viewer = await showLargeAtMiddle(page);
    const scrolled = await sample(page, [{ at: 1, do: 'zoom in' }, { at: 3, do: 'scroll by', top: 400 }]);
    expect(scrolled.animations).toEqual(['idle']);
    expect(scrolled.paperTransform).toBe('none');
    // The scrolled-to point is kept by the next zoom
    const point = await layoutCentre(page);
    const next = await sample(page, [{ at: 1, do: 'zoom out' }]);
    expect(Math.max(...drift(next, point))).toBeLessThanOrEqual(1);

    // A real mouse wheel, right after a zoom: the view follows it once its animation has ended
    const box = (await viewer.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const top = await viewer.evaluate((el) => el.scrollTop);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.mouse.wheel(0, 500);
    await expect.poll(() => viewer.evaluate((el) => el.scrollTop)).toBeGreaterThan(top + 100);
    await settleZoom(page);
    const wheeled = await layoutCentre(page);
    const kept = await sample(page, [{ at: 1, do: 'zoom in' }]);
    expect(Math.max(...drift(kept, wheeled))).toBeLessThanOrEqual(1);
  });

  test('zooms at once, with no animation, when reduced motion is preferred, and animates again without it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await showLargeAtMiddle(page);
    const point = await layoutCentre(page);
    // Levels at which the numeral fits the stage's width (150%, 100% and 75% at 1280 px); wider
    // levels with reduced motion are tested in the click-only group's reduced-motion tests,
    // with the zoom wrapper's own transitions
    const reduced = await sample(page, [{ at: 1, do: 'zoom in' }, { at: 4, do: 'key -' }, { at: 7, do: 'zoom out' }]);
    expect(reduced.animations).toEqual([]);
    // Nor on the zoom wrapper: no transitions, which the global reduced-motion rule would give it
    expect(await page.locator('[data-numeral-image]').evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
    for (const f of reduced.frames) expect(f.animations).toEqual([]);
    // Each zoom's final width from its first laid-out frame on, never an intermediate one
    expect(reduced.frames.map((f) => f.image.width)).toEqual([350, 350, 525, 525, 525, 350, 350, 350, 262.5, 262.5]);
    expect(Math.max(...drift(reduced, point))).toBeLessThanOrEqual(1);

    // A change of preference applies from the next zoom
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const animated = await sample(page, [{ at: 1, do: 'zoom out' }]);
    expect(animated.animations).toEqual(['finished']);
  });

  test('exports the same SVG after an animated zoom has ended as before it', async ({ page }) => {
    await showNumber(page, FIFTY_DIGITS);
    const before = await exportFile(page, 'svg');
    await page.getByRole('button', { name: '📦 Export' }).click(); // close the menu
    const sampled = await sample(page, [{ at: 1, do: 'zoom in' }, { at: 2, do: 'zoom in' }]);
    expect(sampled.animations).toEqual(['idle', 'finished']);
    const after = await exportFile(page, 'svg');
    expect(after.data.equals(before.data)).toBe(true);
  });

  /*
   * The zoom buttons and the + and - shortcuts are click-only: one level per activation, nothing
   * on pointerdown, nothing repeated while a button or a key is held. A held press's timing is
   * driven by Playwright's clock, installed once the page is set up, so each test runs exactly
   * the time it names, and no test waits for a fixed time. The zoom animations are the
   * browser's, in real time, and are waited for through `settleZoom`.
   */
  test.describe('click-only zoom buttons and shortcuts', () => {
    const zoomIn = (page: Page) => page.getByRole('button', { name: 'Zoom in' });
    const zoomOut = (page: Page) => page.getByRole('button', { name: 'Zoom out' });

    /** Records every animation started on the paper from now on, for its final play state */
    const recordAnimations = (page: Page) =>
      page.evaluate(() => {
        const paper = document.querySelector<HTMLElement>('[data-numeral-paper]')!;
        const seen: Animation[] = [];
        (window as unknown as { recordedAnimations: Animation[] }).recordedAnimations = seen;
        const animate = paper.animate.bind(paper);
        paper.animate = (...args: Parameters<HTMLElement['animate']>) => {
          const animation = animate(...args);
          seen.push(animation);
          return animation;
        };
      });
    const recorded = (page: Page) =>
      page.evaluate(() => (window as unknown as { recordedAnimations: Animation[] }).recordedAnimations.map((a) => a.playState));
    const runningOnPaper = (page: Page) =>
      page.locator('[data-numeral-paper]').evaluate((paper) => paper.getAnimations().length);

    /** Presses the primary mouse button over a button, and holds it */
    const mouseDownOn = async (page: Page, button: ReturnType<typeof zoomIn>) => {
      const box = (await button.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
    };

    /**
     * The 99-tier numeral at its middle, then the clock, paused, so timers run only through
     * `runFor`, and every paper animation recorded
     */
    async function setUp(page: Page) {
      const errors: Error[] = [];
      page.on('pageerror', (error) => errors.push(error));
      await showLargeAtMiddle(page);
      await page.clock.install();
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
      await recordAnimations(page);
      return errors;
    }

    /*
     * The reduced-motion regression (UI-13, slice 6 refinement): the global reduced-motion rule
     * gave the zoom wrapper a 0.01 ms width transition, so a zoom's anchored scroll position was
     * measured on the previous level's layout, and clamped to it, once the numeral was wider than
     * the stage (at 1280 × 800, from the 99-tier numeral's middle: 0, 72 and 201 px of horizontal
     * scroll at 200%, 300% and 400% instead of 36, 211 and 386).
     */
    test.describe('with reduced motion, at levels wider than the stage', () => {
      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
      });

      /**
       * Zooms with a button click or a key, run in the page, and reads, once React has laid out
       * the new level (the wrapper's inline width changed): the wrapper's running animations and
       * its transition property, before any frame passes
       */
      const zoomAndInspect = (page: Page, how: 'button' | 'key') =>
        page.evaluate(
          (how) =>
            new Promise<{ animations: string[]; transitionProperty: string; paper: number }>((resolve) => {
              const image = document.querySelector<HTMLElement>('[data-numeral-image]')!;
              const paper = document.querySelector<HTMLElement>('[data-numeral-paper]')!;
              new MutationObserver((_, observer) => {
                observer.disconnect();
                resolve({
                  animations: image.getAnimations().map((a) => `${a.constructor.name}:${(a as CSSTransition).transitionProperty ?? ''}`),
                  transitionProperty: getComputedStyle(image).transitionProperty,
                  paper: paper.getAnimations().length,
                });
              }).observe(image, { attributes: true, attributeFilter: ['style'] });
              if (how === 'button') document.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')!.click();
              else {
                document
                  .querySelector('[data-numeral-stage]')!
                  .dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }));
              }
            }),
          how
        );

      /** The stage's horizontal scroll position, and its largest */
      const scrollX = (page: Page) =>
        page.locator('[data-numeral-stage]').evaluate((el) => ({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth }));

      for (const how of ['button', 'key'] as const) {
        test(`keeps the anchor both ways, with no width transition, zooming in with the ${how}`, async ({ page }) => {
          await showLargeAtMiddle(page);
          const point = await layoutCentre(page);
          expect(point.x).toBeCloseTo(175, 0);
          // 100% → 150% (still fitting), then 200%, 300% and 400%, each wider than the stage
          for (const [level, expectedLeft] of [['150%', 0], ['200%', 36], ['300%', 211], ['400%', 386]] as const) {
            const inspected = await zoomAndInspect(page, how);
            expect(inspected, level).toEqual({ animations: [], transitionProperty: 'none', paper: 0 });
            await expect(zoomLevel(page)).toHaveText(new RegExp(`^${level}`));
            const zoom = parseInt(level) / 100;
            const centre = await layoutCentre(page);
            expect(Math.abs(centre.x - point.x) * zoom, `${level}: horizontally`).toBeLessThanOrEqual(1);
            expect(Math.abs(centre.y - point.y) * zoom, `${level}: vertically`).toBeLessThanOrEqual(1);
            const { left, max } = await scrollX(page);
            // The reported positions, at this viewport, where the stage is 684 px wide
            expect(Math.abs(left - expectedLeft), `${level}: scrollLeft ${left}`).toBeLessThanOrEqual(1);
            if (level !== '150%') expect(left, level).toBeLessThan(max);
          }
        });
      }

      test('keeps the anchor zooming out too, each step instant, with no width transition', async ({ page }) => {
        await showLargeAtMiddle(page);
        const point = await layoutCentre(page);
        for (const level of ['150%', '200%', '300%', '400%']) {
          await zoomIn(page).click();
          await expect(zoomLevel(page)).toHaveText(new RegExp(`^${level}`));
        }
        for (const [level, width] of [['300%', 1050], ['200%', 700], ['150%', 525], ['100%', 350]] as const) {
          await zoomOut(page).click();
          await expect(zoomLevel(page)).toHaveText(new RegExp(`^${level}`));
          // The final width at once, laid out: no transition on the zoom wrapper
          const wrapper = await page.locator('[data-numeral-image]').evaluate((el) => ({
            style: el.style.width,
            box: el.getBoundingClientRect().width,
            animations: el.getAnimations().length,
            transitionProperty: getComputedStyle(el).transitionProperty,
          }));
          expect(wrapper, level).toEqual({ style: `${width}px`, box: width, animations: 0, transitionProperty: 'none' });
          expect(await runningOnPaper(page), level).toBe(0);
          const centre = await layoutCentre(page);
          const zoom = parseInt(level) / 100;
          expect(Math.abs(centre.x - point.x) * zoom, `${level}: horizontally`).toBeLessThanOrEqual(1);
          expect(Math.abs(centre.y - point.y) * zoom, `${level}: vertically`).toBeLessThanOrEqual(1);
        }
      });
    });

    test('changes exactly one level for a click, with nothing repeated after it', async ({ page }) => {
      const errors = await setUp(page);
      await zoomIn(page).click();
      await expect(zoomLevel(page)).toHaveText('150%');
      await page.clock.runFor(3000);
      await expect(zoomLevel(page)).toHaveText('150%');
      await settleZoom(page);
      await zoomOut(page).click();
      await page.clock.runFor(3000);
      await expect(zoomLevel(page)).toHaveText('100%');
      await settleZoom(page);
      expect(await recorded(page)).toEqual(['finished', 'finished']);
      expect(errors).toEqual([]);
    });

    test('does not zoom on press, however long the button is held: one level, from its click', async ({ page }) => {
      const errors = await setUp(page);
      await mouseDownOn(page, zoomIn(page));
      // Nothing on pointerdown, and nothing while it is held
      await page.clock.runFor(3000);
      await expect(zoomLevel(page)).toHaveText('100%');
      expect(await recorded(page)).toEqual([]);
      await page.mouse.up(); // the click
      await expect(zoomLevel(page)).toHaveText('150%');
      await page.clock.runFor(3000);
      await expect(zoomLevel(page)).toHaveText('150%');
      await settleZoom(page);
      expect(await recorded(page)).toEqual(['finished']);
      expect(errors).toEqual([]);
    });

    test('does not zoom for a press released outside the button, and leaves nothing pending for the next click', async ({ page }) => {
      await setUp(page);
      await mouseDownOn(page, zoomOut(page));
      await page.mouse.move(5, 5);
      await page.mouse.up(); // no click on the button
      await page.clock.runFor(3000);
      await expect(zoomLevel(page)).toHaveText('100%');
      expect(await recorded(page)).toEqual([]);
      // The next activation, by the mouse or the keyboard, is a step
      await zoomOut(page).click();
      await expect(zoomLevel(page)).toHaveText('75%');
      await zoomOut(page).focus();
      await page.keyboard.press('Enter');
      await expect(zoomLevel(page)).toHaveText('50%');
    });

    test('stops at the limits, without errors or further animations, and the other button then works', async ({ page }) => {
      const errors = await setUp(page);
      for (const level of ['150%', '200%', '300%', '400%']) {
        await zoomIn(page).click();
        await expect(zoomLevel(page)).toHaveText(new RegExp(`^${level}`));
        await settleZoom(page);
      }
      await expect(zoomLevel(page)).toHaveText('400% (maximum zoom)');
      expect(await recorded(page)).toHaveLength(4);
      // At the limit, a press and its click do nothing
      await mouseDownOn(page, zoomIn(page));
      await page.clock.runFor(3000);
      await page.mouse.up();
      await expect(zoomLevel(page)).toHaveText('400% (maximum zoom)');
      expect(await recorded(page)).toHaveLength(4);
      expect(await runningOnPaper(page)).toBe(0);
      // The other button, as usual, and down to the minimum
      for (const level of ['300%', '200%', '150%', '100%', '75%', '50%', '25%']) {
        await zoomOut(page).click();
        await expect(zoomLevel(page)).toHaveText(new RegExp(`^${level}`));
        await settleZoom(page);
      }
      await expect(zoomLevel(page)).toHaveText('25% (minimum zoom)');
      await mouseDownOn(page, zoomOut(page));
      await page.clock.runFor(3000);
      await page.mouse.up();
      await expect(zoomLevel(page)).toHaveText('25% (minimum zoom)');
      expect(await recorded(page)).toHaveLength(11);
      expect(errors).toEqual([]);
    });

    test('keeps one level per Enter or Space on a button, and the viewer’s shortcuts', async ({ page }) => {
      await setUp(page);
      await zoomIn(page).focus();
      await page.keyboard.press('Enter');
      await expect(zoomLevel(page)).toHaveText('150%');
      await page.keyboard.press('Space');
      await expect(zoomLevel(page)).toHaveText('200%');
      await page.clock.runFor(3000);
      await expect(zoomLevel(page)).toHaveText('200%');
      await expect(zoomIn(page)).toBeFocused();
      const viewer = page.getByRole('group', { name: 'Numeral viewer' });
      await viewer.focus();
      await page.keyboard.press('+');
      await expect(zoomLevel(page)).toHaveText('300%');
      await page.keyboard.press('-');
      await expect(zoomLevel(page)).toHaveText('200%');
      await page.keyboard.press('0');
      await expect(zoomLevel(page)).toHaveText('100%');
    });

    test('zooms one level for a held + or - shortcut: the key repeating is ignored', async ({ page }) => {
      await setUp(page);
      await page.getByRole('group', { name: 'Numeral viewer' }).focus();
      await page.evaluate(() => {
        const w = window as unknown as { keydowns: boolean[] };
        w.keydowns = [];
        document.querySelector('[data-numeral-stage]')!.addEventListener('keydown', (e) => w.keydowns.push((e as KeyboardEvent).repeat));
      });
      // A key held down: the first keydown, then repeated ones (Playwright sends a keydown for a key
      // already down with `repeat` set, as the operating system's auto-repeat does)
      const hold = async (key: string) => {
        for (let i = 0; i < 6; i++) await page.keyboard.down(key);
        await page.keyboard.up(key);
      };
      await hold('+');
      await expect(zoomLevel(page)).toHaveText('150%');
      await page.clock.runFor(3000);
      await expect(zoomLevel(page)).toHaveText('150%');
      // Released and pressed again: a new key press
      await hold('+');
      await expect(zoomLevel(page)).toHaveText('200%');
      await hold('-');
      await expect(zoomLevel(page)).toHaveText('150%');
      await hold('-');
      await expect(zoomLevel(page)).toHaveText('100%');
      const keydowns = await page.evaluate(() => (window as unknown as { keydowns: boolean[] }).keydowns);
      expect(keydowns.filter((repeat) => !repeat)).toHaveLength(4);
      expect(keydowns.filter((repeat) => repeat)).toHaveLength(20);
      await settleZoom(page);
      // One animation for each key press, none for a repeat (a press may retarget the one before)
      const states = await recorded(page);
      expect(states).toHaveLength(4);
      expect(states.at(-1)).toBe('finished');
    });

    test.describe('with touch', () => {
      test.use({ hasTouch: true });

      /** One finger, through Chromium's touch input: touch(type, at) starts, moves or lifts it */
      const finger = async (page: Page) => {
        const cdp = await page.context().newCDPSession(page);
        return (type: 'touchStart' | 'touchMove' | 'touchEnd', at?: { x: number; y: number }) =>
          cdp.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [{ x: at.x, y: at.y }] : [] });
      };
      const centreOf = async (button: ReturnType<typeof zoomIn>) => {
        const box = (await button.boundingBox())!;
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };

      test('changes exactly one level for a tap, its click included', async ({ page }) => {
        await setUp(page);
        await zoomIn(page).tap();
        await expect(zoomLevel(page)).toHaveText('150%');
        await page.clock.runFor(3000);
        await expect(zoomLevel(page)).toHaveText('150%');
        await settleZoom(page);
        expect(await recorded(page)).toEqual(['finished']);
      });

      test('does not zoom when a touch begins on a button and the browser takes it over to scroll', async ({ page }) => {
        await setUp(page);
        const touch = await finger(page);
        const at = await centreOf(zoomIn(page));
        await page.evaluate(() => {
          const w = window as unknown as { cancelledPointer?: string };
          window.addEventListener('pointercancel', (e) => (w.cancelledPointer = e.pointerType), { once: true });
        });
        await touch('touchStart', at);
        // Nothing on the touch itself, nor while the finger rests on the button
        await page.clock.runFor(3000);
        await expect(zoomLevel(page)).toHaveText('100%');
        // A drag from the button: the page pans, which cancels the pointer, and sends no click
        for (let dy = 20; dy <= 200; dy += 20) await touch('touchMove', { x: at.x, y: at.y + dy });
        await expect.poll(() => page.evaluate(() => (window as unknown as { cancelledPointer?: string }).cancelledPointer)).toBe('touch');
        await touch('touchEnd');
        await page.clock.runFor(3000);
        await expect(zoomLevel(page)).toHaveText('100%');
        expect(await recorded(page)).toEqual([]);
      });
    });
  });
});
