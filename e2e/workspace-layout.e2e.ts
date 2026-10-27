import { expect, test, type Locator, type Page } from '@playwright/test';

type Theme = 'light' | 'dark';

/** Opens the app in a theme and enters a number, so the whole workspace is shown */
async function openWorkspace(page: Page, theme: Theme, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((saved) => localStorage.setItem('theme', saved), theme);
  await page.goto('./');
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
  await page.getByLabel('Number input').fill('8000400019');
  await expect(page.getByRole('group', { name: 'Numeral viewer' })).toBeVisible();
}

/** The workspace's four cards: input, base-20 representation, viewer and settings */
function cards(page: Page) {
  return {
    input: page.locator('section').filter({ has: page.getByLabel('Number input') }),
    base20: page.getByRole('heading', { name: 'Base-20 Representation', exact: true }).locator('..'),
    viewer: page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..'),
    settings: page.getByRole('group', { name: 'SVG Display Settings' }).locator('..'),
  };
}

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  expect(b).not.toBeNull();
  return b!;
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Whether the element on top at the centre of `target` belongs to it, i.e. a click there reaches it */
const onTopAtCentre = (target: Locator) =>
  target.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return !!hit && el.contains(hit);
  });

test.describe('workspace layout', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [375, 768]) {
      test(`stacks input, viewer, base-20 and settings in one column at ${width}px in the ${theme} theme`, async ({ page }) => {
        await openWorkspace(page, theme, width);
        const { input, base20, viewer, settings } = cards(page);
        const [i, b, v, s] = [await box(input), await box(base20), await box(viewer), await box(settings)];

        // In this order, each full width
        expect(v.y).toBeGreaterThan(i.y + i.height - 1);
        expect(b.y).toBeGreaterThan(v.y + v.height - 1);
        expect(s.y).toBeGreaterThan(b.y + b.height - 1);
        expect(b.width).toBeCloseTo(i.width, 0);
        expect(v.width).toBeCloseTo(i.width, 0);
        expect(s.width).toBeCloseTo(i.width, 0);
        expect(await pageOverflow(page)).toBe(0);
      });
    }

    for (const width of [1024, 1280]) {
      test(`shows input, base-20 and settings beside the viewer at ${width}px in the ${theme} theme`, async ({ page }) => {
        await openWorkspace(page, theme, width);
        const { input, base20, viewer, settings } = cards(page);
        const [i, b, v, s] = [await box(input), await box(base20), await box(viewer), await box(settings)];

        // Left: the input, with the base-20 card and then the settings directly under it;
        // right: the wider viewer, level with the input
        expect(v.x).toBeGreaterThan(i.x + i.width);
        expect(v.y).toBeCloseTo(i.y, 0);
        expect(v.width).toBeGreaterThan(i.width);
        for (const card of [b, s]) {
          expect(card.x).toBeCloseTo(i.x, 0);
          expect(card.width).toBeCloseTo(i.width, 0);
        }
        expect(b.y - (i.y + i.height)).toBeGreaterThan(0);
        expect(b.y - (i.y + i.height)).toBeLessThanOrEqual(24);
        expect(s.y - (b.y + b.height)).toBeGreaterThan(0);
        expect(s.y - (b.y + b.height)).toBeLessThanOrEqual(24);
        expect(await pageOverflow(page)).toBe(0);
      });
    }
  }

  for (const width of [375, 1280]) {
    test(`keeps every card in place for empty, invalid and valid input at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('./');
      const { input, base20, viewer, settings } = cards(page);
      const exportButton = page.getByRole('button', { name: '📦 Export' });
      const numeral = page.getByRole('group', { name: 'Numeral viewer' });

      // All four cards, in the layout of this width
      const expectWorkspace = async () => {
        const [i, b, v, s] = [await box(input), await box(base20), await box(viewer), await box(settings)];
        if (width < 1024) {
          expect(v.y).toBeGreaterThan(i.y + i.height - 1);
          expect(b.y).toBeGreaterThan(v.y + v.height - 1);
          expect(s.y).toBeGreaterThan(b.y + b.height - 1);
        } else {
          expect(b.y).toBeGreaterThan(i.y + i.height - 1);
          expect(v.x).toBeGreaterThan(i.x + i.width);
          expect(v.y).toBeCloseTo(i.y, 0);
          expect(b.x).toBeCloseTo(i.x, 0);
          expect(s.x).toBeCloseTo(i.x, 0);
          expect(s.y).toBeGreaterThan(b.y + b.height - 1);
        }
        expect(await pageOverflow(page)).toBe(0);
      };
      // No result: the viewer and the base-20 card say why, with no numeral, representation,
      // viewer controls or Export
      const expectNoResult = async (message: string, base20Message: string) => {
        await expect(viewer.getByText(message, { exact: true })).toBeVisible();
        await expect(base20).toHaveText(`Base-20 Representation${base20Message}`);
        await expect(numeral).toHaveCount(0);
        await expect(page.locator('svg.mep-svg')).toHaveCount(0);
        await expect(page.getByRole('group', { name: 'Zoom controls' })).toHaveCount(0);
        await expect(exportButton).toHaveCount(0);
        await expectWorkspace();
      };

      await expect(page.getByLabel('Number input')).toHaveValue('');
      await expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');

      await page.getByLabel('Number input').fill('8000400019');
      await expect(numeral).toBeVisible();
      await expect(base20).toContainText('6 × 207 • 5 × 206');
      await expect(exportButton).toBeVisible();
      await expectWorkspace();

      // Invalid after a valid number: no stale result
      await page.getByLabel('Number input').fill('12.5');
      await expectNoResult('Correct the number to see its Mayan numeral.', 'Correct the number to see it in base 20.');

      await page.getByLabel('Number input').fill('');
      await expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');
      expect(errors).toEqual([]);
    });
  }

  test('keeps the two-column layout for date results, without widening the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    await expect(page.getByRole('img', { name: /^Mayan numerals for day 15, month \d+ and year \d+$/ })).toBeVisible();

    const viewer = await box(page.getByRole('heading', { name: 'Mayan Numeral', exact: true }).locator('..'));
    const input = await box(page.locator('section').filter({ has: page.getByLabel('Date input') }));
    expect(viewer.x).toBeGreaterThan(input.x + input.width);
    expect(await pageOverflow(page)).toBe(0);
  });

  test('outlines the page with one h1 and h2 section headings', async ({ page }) => {
    await openWorkspace(page, 'light', 1280);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2, name: 'Base-20 Representation' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Mayan Numeral' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(0);
  });
});

test.describe('floating Export with the workspace', () => {
  for (const width of [375, 1280]) {
    test(`keeps Export, its dialog and the theme menu operable while a toast shows at ${width}px`, async ({ page }) => {
      await openWorkspace(page, 'light', width);
      const trigger = page.getByRole('button', { name: '📦 Export' });
      const themeButton = page.getByRole('button', { name: /^Theme selector/ });
      await trigger.click();
      const dialogExport = page.getByRole('button', { name: /^Export SVG image/ });
      await Promise.all([page.waitForEvent('download'), dialogExport.click()]);
      await expect(page.getByRole('status')).toBeVisible();

      // While the toast is shown, nothing it covers is one of these controls
      expect({ trigger: await onTopAtCentre(trigger), dialogExport: await onTopAtCentre(dialogExport), themeButton: await onTopAtCentre(themeButton) })
        .toEqual({ trigger: true, dialogExport: true, themeButton: true });
      // And the trigger takes a real click: it closes the dialog
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('status')).toBeVisible();
    });
  }

  test('lets the last colour popover scroll clear of Export on a phone-sized screen', async ({ page }) => {
    await openWorkspace(page, 'light', 375);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.getByRole('button', { name: 'Glyph color:' }).click();
    const popover = page.locator('.react-colorful');
    await expect(popover).toBeVisible();

    // Scrolled to the end of the page, the popover's lowest slider is clear of the trigger
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const alpha = await box(popover.locator('.react-colorful__alpha'));
    const trigger = await box(page.getByRole('button', { name: '📦 Export' }));
    expect(alpha.y + alpha.height).toBeLessThanOrEqual(trigger.y);
    expect(await pageOverflow(page)).toBe(0);
  });

  test('keeps the colour popover inside the screen at 768px', async ({ page }) => {
    await openWorkspace(page, 'light', 768);
    for (const name of ['Background color:', 'Glyph color:']) {
      await page.getByRole('button', { name }).click();
      const popover = await box(page.locator('.react-colorful').locator('..'));
      expect(popover.x).toBeGreaterThanOrEqual(0);
      expect(popover.x + popover.width).toBeLessThanOrEqual(768);
      expect(await pageOverflow(page)).toBe(0);
      await page.keyboard.press('Escape');
    }
  });
});
