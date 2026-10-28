import { readFile } from 'node:fs/promises';
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

      // Changed deliberately in UI-05: the input starts at 0, with its numeral and Export
      await expect(page.getByLabel('Number input')).toHaveValue('0');
      await expect(page.getByRole('img', { name: /^Mayan numeral for 0: 1 stacked base-20 digit,/ })).toBeVisible();
      await expect(base20).toContainText('0 × 200');
      await expect(exportButton).toBeVisible();
      await expectWorkspace();

      await page.getByLabel('Number input').fill('');
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

      // Clear returns to 0, with its numeral and Export
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await expect(page.getByLabel('Number input')).toHaveValue('0');
      await expect(page.getByRole('img', { name: /^Mayan numeral for 0: 1 stacked base-20 digit,/ })).toBeVisible();
      await expect(base20).toHaveText('Base-20 RepresentationNumber0 × 200');
      await expect(exportButton).toBeVisible();
      await expectWorkspace();
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

test.describe('number input: initial 0, Clear, count and arrow keys', () => {
  const zeroNumeral = /^Mayan numeral for 0: 1 stacked base-20 digit,/;

  /** The caret (or selection) of the number input */
  const selection = (input: Locator) =>
    input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd]);

  /** Opens the app as it starts, without entering anything, and collects page errors */
  async function openApp(page: Page, theme: Theme, width: number, height = 900) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height });
    await page.addInitScript((saved) => localStorage.setItem('theme', saved), theme);
    await page.goto('./');
    await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
    return errors;
  }

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [375, 768, 1280]) {
      test(`starts at 0 with Clear and the count in the input card at ${width}px in the ${theme} theme`, async ({ page }) => {
        const errors = await openApp(page, theme, width);
        const { input: inputCard, base20 } = cards(page);
        const input = page.getByLabel('Number input');
        const clear = page.getByRole('button', { name: 'Clear', exact: true });
        const count = page.getByText('1 significant digit', { exact: true });
        const hint = page.getByText('Up and Down arrow keys add or subtract 1.', { exact: true });

        await expect(input).toHaveValue('0');
        await expect(page.getByRole('img', { name: zeroNumeral })).toBeVisible();
        await expect(base20).toHaveText('Base-20 RepresentationNumber0 × 200');
        await expect(page.getByRole('button', { name: '📦 Export' })).toBeVisible();

        // Clear on the input's row, the count and hint under it, all inside the input card
        const [card, field, button, countBox, hintBox] = [
          await box(inputCard), await box(input), await box(clear), await box(count), await box(hint),
        ];
        expect(button.x).toBeGreaterThanOrEqual(field.x + field.width);
        expect(button.y + button.height / 2).toBeCloseTo(field.y + field.height / 2, 0);
        expect(countBox.y).toBeGreaterThanOrEqual(field.y + field.height);
        expect(hintBox.y).toBeGreaterThanOrEqual(field.y + field.height);
        for (const b of [field, button, countBox, hintBox]) {
          expect(b.x).toBeGreaterThanOrEqual(card.x);
          expect(b.x + b.width).toBeLessThanOrEqual(card.x + card.width);
          expect(b.y + b.height).toBeLessThanOrEqual(card.y + card.height);
        }
        // Nothing, e.g. the floating Export trigger, covers Clear or the input
        expect(await onTopAtCentre(clear)).toBe(true);
        expect(await onTopAtCentre(input)).toBe(true);
        expect(await pageOverflow(page)).toBe(0);
        expect(errors).toEqual([]);
      });
    }
  }

  test('replaces the initial 0 with typed digits and edits without redundant leading zeros', async ({ page }) => {
    await openApp(page, 'light', 1280);
    const input = page.getByLabel('Number input');
    await input.click();
    await page.keyboard.press('End');

    await page.keyboard.type('5');
    await expect(input).toHaveValue('5');
    await page.keyboard.type('7');
    await expect(input).toHaveValue('57');
    expect(await selection(input)).toEqual([2, 2]);
    await expect(page.getByRole('img', { name: /^Mayan numeral for 57: 2 stacked/ })).toBeVisible();

    // A digit typed in the middle stays where it was typed, with the caret after it
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('3');
    await expect(input).toHaveValue('537');
    expect(await selection(input)).toEqual([2, 2]);

    // Deleting the first digit of 1052 leaves 52, with the caret before the 5
    await input.fill('1052');
    await page.keyboard.press('Home');
    await page.keyboard.press('Delete');
    await expect(input).toHaveValue('52');
    expect(await selection(input)).toEqual([0, 0]);
    await page.keyboard.type('9');
    await expect(input).toHaveValue('952');

    // Select all and type over it
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('4');
    await expect(input).toHaveValue('4');

    // Emptied while editing: no result, then a new value
    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('');
    await expect(page.getByText('Enter a whole number to see its Mayan numeral.', { exact: true })).toBeVisible();
    await page.keyboard.type('0');
    await expect(input).toHaveValue('0');
    await page.keyboard.type('0');
    await expect(input).toHaveValue('0');

    // Pasted text with leading zeros keeps its value, without the zeros
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('007');
    await expect(input).toHaveValue('7');
    await expect(page.getByText('1 significant digit', { exact: true })).toBeVisible();

    // Invalid text keeps its leading zeros and its message
    await input.fill('012a');
    await expect(input).toHaveValue('012a');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(/^Use digits 0–9 only/)).toBeVisible();
    await expect(page.getByText(/significant digit/)).toHaveCount(0);
  });

  test('copies, cuts and pastes with the usual shortcuts', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page, 'light', 1280);
    const input = page.getByLabel('Number input');
    await input.fill('8000400019');
    await input.focus();

    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+x');
    await expect(input).toHaveValue('');
    await page.keyboard.press('ControlOrMeta+v');
    await expect(input).toHaveValue('8000400019');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+c');
    await page.keyboard.press('End');
    await page.keyboard.press('ControlOrMeta+v');
    await expect(input).toHaveValue('80004000198000400019');

    // Shift with the arrow keys selects, as usual, without stepping
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    expect(await selection(input)).toEqual([18, 20]);
    await page.keyboard.press('Shift+ArrowUp');
    await expect(input).toHaveValue('80004000198000400019');
    expect(await selection(input)).toEqual([0, 20]);
  });

  test('adds and subtracts 1 with the arrow keys, within 0 and 500 digits, without scrolling', async ({ page }) => {
    const errors = await openApp(page, 'light', 375, 500);
    const input = page.getByLabel('Number input');
    await input.focus();
    // The page can scroll at this size; the arrow keys must not scroll it
    await page.evaluate(() => window.scrollTo(0, 40));
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('0');
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('20');
    await expect(page.getByText('2 significant digits', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /^Mayan numeral for 20: 2 stacked base-20 digits,/ })).toBeAttached();
    await expect(cards(page).base20).toContainText('1 × 201 • 0 × 200');
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('19');
    await expect(cards(page).base20).toContainText('19 × 200');
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);

    // Exact beyond Number.MAX_SAFE_INTEGER
    await input.fill('9007199254740992');
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('9007199254740993');

    // At the largest value, ArrowUp keeps it
    const maxDigits = '9'.repeat(500);
    await input.fill(maxDigits);
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue(maxDigits);
    await expect(input).toHaveAttribute('aria-invalid', 'false');
    await expect(page.getByText('500 significant digits', { exact: true })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('9'.repeat(499) + '8');

    // Empty and invalid text stay as they are
    for (const text of ['', '12.5']) {
      await input.fill(text);
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowDown');
      await expect(input).toHaveValue(text);
    }
    expect(errors).toEqual([]);
  });

  test('clears to 0 from the keyboard, keeping the focus on Clear', async ({ page }) => {
    await openApp(page, 'dark', 768);
    const input = page.getByLabel('Number input');
    const clear = page.getByRole('button', { name: 'Clear', exact: true });

    for (const [text, key] of [['9'.repeat(500), 'Enter'], ['12.5', 'Space'], ['', 'Enter'], ['0', 'Space']]) {
      await input.fill(text);
      await input.focus();
      await page.keyboard.press('Tab');
      await expect(clear).toBeFocused();
      await page.keyboard.press(key);
      await expect(input).toHaveValue('0');
      await expect(clear).toBeFocused();
      await expect(page.getByRole('img', { name: zeroNumeral })).toBeAttached();
      await expect(page.getByText('1 significant digit', { exact: true })).toBeVisible();
    }
  });

  test('exports the initial 0 and stepped values under their filenames', async ({ page }) => {
    await openApp(page, 'light', 1280);
    const exportSvg = async () => {
      await page.getByRole('button', { name: '📦 Export' }).click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /^Export SVG image/ }).click(),
      ]);
      await page.getByRole('button', { name: '📦 Export' }).click();
      return download;
    };

    const zero = await exportSvg();
    expect(zero.suggestedFilename()).toBe('mayan-numeral-number-0.svg');
    const svg = await readFile(await zero.path(), 'utf8');
    expect(svg.match(/data-digit-index=/g)).toHaveLength(1);
    expect(svg).toContain('data-digit-value="0"');

    await page.getByLabel('Number input').focus();
    await page.keyboard.press('ArrowUp');
    expect((await exportSvg()).suggestedFilename()).toBe('mayan-numeral-number-1.svg');
  });

  test('leaves Date mode and its clear button as they were, and keeps the number', async ({ page }) => {
    await openApp(page, 'light', 1280);
    await page.getByLabel('Number input').fill('57');
    await page.getByRole('radio', { name: 'Date' }).check();
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toHaveCount(0);
    await expect(page.getByText(/significant digit/)).toHaveCount(0);

    const dateInput = page.getByLabel('Date input');
    await dateInput.click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    await expect(page.getByRole('img', { name: /^Mayan numerals for day 15,/ })).toBeVisible();
    const date = await dateInput.inputValue();
    // The arrow keys are the date picker's own, never number steps
    await dateInput.focus();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    expect(await dateInput.inputValue()).toBe(date);
    await page.locator('.react-datepicker__close-icon').click();
    await expect(dateInput).toHaveValue('');
    await expect(page.getByText('Choose a date to see its Mayan numerals.', { exact: true })).toBeVisible();

    await page.getByRole('radio', { name: 'Number' }).check();
    await expect(page.getByLabel('Number input')).toHaveValue('57');
  });
});
