import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

type Theme = 'light' | 'dark';

/** Opens the app in a theme and enters a number, so the whole workspace is shown */
async function openWorkspace(page: Page, theme: Theme, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((saved) => localStorage.setItem('theme', saved), theme);
  await page.goto('./');
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
  await page.getByLabel('Decimal integer').fill('8000400019');
  await expect(page.getByRole('group', { name: 'Numeral viewer' })).toBeVisible();
}

/** The workspace's four cards: input, base-20 representation, viewer and settings */
function cards(page: Page) {
  return {
    input: page.locator('section').filter({ has: page.getByLabel('Decimal integer') }),
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
      await expect(page.getByLabel('Decimal integer')).toHaveValue('0');
      await expect(page.getByRole('img', { name: /^Mayan numeral for 0: 1 stacked base-20 digit,/ })).toBeVisible();
      await expect(base20).toContainText('0 × 200');
      await expect(exportButton).toBeVisible();
      await expectWorkspace();

      await page.getByLabel('Decimal integer').fill('');
      await expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');

      await page.getByLabel('Decimal integer').fill('8000400019');
      await expect(numeral).toBeVisible();
      await expect(base20).toContainText('6 × 207 • 5 × 206');
      await expect(exportButton).toBeVisible();
      await expectWorkspace();

      // Invalid after a valid number: no stale result
      await page.getByLabel('Decimal integer').fill('12.5');
      await expectNoResult('Correct the number to see its Mayan numeral.', 'Correct the number to see it in base 20.');

      await page.getByLabel('Decimal integer').fill('');
      await expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');

      // Changed deliberately in UI-06: Zero returns to 0, with its numeral and Export,
      // and Clear empties the field
      await page.getByRole('button', { name: 'Zero', exact: true }).click();
      await expect(page.getByLabel('Decimal integer')).toHaveValue('0');
      await expect(page.getByRole('img', { name: /^Mayan numeral for 0: 1 stacked base-20 digit,/ })).toBeVisible();
      await expect(base20).toHaveText('Base-20 RepresentationNumber0 × 200');
      await expect(exportButton).toBeVisible();
      await expectWorkspace();
      await page.getByRole('button', { name: 'Clear input' }).click();
      await expect(page.getByLabel('Decimal integer')).toHaveValue('');
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
      await expect(page.getByRole('status').filter({ hasText: 'download started' })).toBeVisible();

      // While the toast is shown, nothing it covers is one of these controls
      expect({ trigger: await onTopAtCentre(trigger), dialogExport: await onTopAtCentre(dialogExport), themeButton: await onTopAtCentre(themeButton) })
        .toEqual({ trigger: true, dialogExport: true, themeButton: true });
      // And the trigger takes a real click: it closes the dialog
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('status').filter({ hasText: 'download started' })).toBeVisible();
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

test.describe('number input: initial 0, actions, count, quick steps and arrow keys', () => {
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
      test(`starts at 0 with the number actions, count and steps in the input card at ${width}px in the ${theme} theme`, async ({ page }) => {
        const errors = await openApp(page, theme, width);
        const { input: inputCard, base20 } = cards(page);
        const input = page.getByLabel('Decimal integer');
        const label = page.getByText('Decimal integer', { exact: true });
        const count = page.getByText('1 digit', { exact: true });
        const inField = ['Random number', 'Copy number', 'Clear input'].map((name) => page.getByRole('button', { name }));
        const steps = ['+1', '+5', '+20', '+400'].map((name) => page.getByRole('button', { name, exact: true }));
        const zero = page.getByRole('button', { name: 'Zero', exact: true });

        await expect(input).toHaveValue('0');
        await expect(page.getByRole('img', { name: zeroNumeral })).toBeVisible();
        await expect(base20).toHaveText('Base-20 RepresentationNumber0 × 200');
        await expect(page.getByRole('button', { name: '📦 Export' })).toBeVisible();

        const [card, field, labelBox, countBox, zeroBox] = [
          await box(inputCard), await box(input), await box(label), await box(count), await box(zero),
        ];
        // The input type's title on the left, its segments on the right, above the field: in one
        // row from 768px, and on a phone the segments wrap under the title, still on the right
        const [legendBox, segmentsBox] = [
          await box(inputCard.locator('legend')),
          await box(page.getByRole('radio', { name: 'Number' }).locator('xpath=../..')),
        ];
        expect(segmentsBox.x + segmentsBox.width).toBeCloseTo(field.x + field.width, 0);
        if (width >= 768) {
          expect(segmentsBox.x).toBeGreaterThan(legendBox.x + legendBox.width);
          expect(legendBox.y + legendBox.height / 2).toBeCloseTo(segmentsBox.y + segmentsBox.height / 2, -1);
        } else {
          expect(segmentsBox.y).toBeGreaterThanOrEqual(legendBox.y + legendBox.height);
        }
        expect(segmentsBox.y + segmentsBox.height).toBeLessThanOrEqual(labelBox.y);
        // The field fills the card's content width
        const padding = await inputCard.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft) + parseFloat(getComputedStyle(el).paddingRight));
        expect(field.width).toBeCloseTo(card.width - padding, 0);
        // The label and the count above the field
        expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(field.y);
        expect(countBox.y + countBox.height).toBeLessThanOrEqual(field.y);
        expect(countBox.x).toBeGreaterThan(labelBox.x + labelBox.width);
        // Random, Copy and Clear inside the field, in that order, after the end of its text
        const textEnd = await input.evaluate((el) => {
          const s = getComputedStyle(el);
          return el.getBoundingClientRect().right - parseFloat(s.paddingRight) - parseFloat(s.borderRightWidth);
        });
        let previousEnd = textEnd;
        for (const button of inField) {
          const b = await box(button);
          expect(b.x).toBeGreaterThanOrEqual(previousEnd);
          expect(b.y).toBeGreaterThanOrEqual(field.y);
          expect(b.y + b.height).toBeLessThanOrEqual(field.y + field.height);
          expect(b.width).toBeGreaterThanOrEqual(24);
          previousEnd = b.x + b.width;
        }
        expect(previousEnd).toBeLessThanOrEqual(field.x + field.width);
        // The arrow-key hint: the field's title, and a visually hidden description, not visible text
        await expect(input).toHaveAttribute('title', 'Enter a decimal integer. Use ↑/↓ to change by 1.');
        await expect(page.getByText('Up and Down arrow keys add or subtract 1.', { exact: true })).toHaveClass(/\bsr-only\b/);
        // A visible 1px boundary while valid (its contrast is checked in design-foundation.e2e.ts)
        const border = await input.evaluate((el) => ({ width: getComputedStyle(el).borderTopWidth, color: getComputedStyle(el).borderTopColor }));
        expect(border.width).toBe('1px');
        expect(border.color).not.toBe('rgba(0, 0, 0, 0)');
        // The steps under the field, wrapping as needed, and Zero at the right
        const stepBoxes = await Promise.all(steps.map(box));
        for (const b of [...stepBoxes, zeroBox]) expect(b.y).toBeGreaterThanOrEqual(field.y + field.height);
        expect(zeroBox.x + zeroBox.width).toBeCloseTo(field.x + field.width, 0);
        expect(zeroBox.x).toBeGreaterThan(stepBoxes[3].x + stepBoxes[3].width);
        await expect(zero).toHaveAttribute('title', '0 (Shell)');
        for (const b of [field, labelBox, countBox, ...stepBoxes, zeroBox]) {
          expect(b.x).toBeGreaterThanOrEqual(card.x);
          expect(b.x + b.width).toBeLessThanOrEqual(card.x + card.width);
          expect(b.y + b.height).toBeLessThanOrEqual(card.y + card.height);
        }
        // Nothing, e.g. the floating Export trigger, covers the input or its actions
        for (const target of [input, ...inField, ...steps, zero]) expect(await onTopAtCentre(target)).toBe(true);
        expect(await pageOverflow(page)).toBe(0);

        // The longest number scrolls inside the field without widening anything
        await input.fill('9'.repeat(500));
        expect(await pageOverflow(page)).toBe(0);
        expect((await box(input)).width).toBeCloseTo(field.width, 0);
        expect(errors).toEqual([]);
      });
    }
  }

  test('replaces the initial 0 with typed digits and edits without redundant leading zeros', async ({ page }) => {
    await openApp(page, 'light', 1280);
    const input = page.getByLabel('Decimal integer');
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
    await expect(page.getByText('1 digit', { exact: true })).toBeVisible();

    // Invalid text keeps its leading zeros and its message
    await input.fill('012a');
    await expect(input).toHaveValue('012a');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(/^Use digits 0–9 only/)).toBeVisible();
    await expect(page.getByText(/^\d+ digits?$/)).toHaveCount(0);
  });

  test('copies, cuts and pastes with the usual shortcuts', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page, 'light', 1280);
    const input = page.getByLabel('Decimal integer');
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
    const input = page.getByLabel('Decimal integer');
    await input.focus();
    // The page can scroll at this size; the arrow keys must not scroll it
    await page.evaluate(() => window.scrollTo(0, 40));
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('0');
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('20');
    await expect(page.getByText('2 digits', { exact: true })).toBeVisible();
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
    await expect(page.getByText('500 digits', { exact: true })).toBeVisible();
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

  test('reaches the number actions with Tab, in reading order', async ({ page }) => {
    await openApp(page, 'light', 375);
    await page.getByLabel('Decimal integer').focus();
    for (const name of ['Random number', 'Copy number', 'Clear input', '+1', '+5', '+20', '+400', 'Zero']) {
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
    }
  });

  // Changed deliberately in UI-06: Clear empties the field; Zero sets it to 0
  test('empties the field with Clear and sets it to 0 with Zero from the keyboard, keeping the focus', async ({ page }) => {
    await openApp(page, 'dark', 768);
    const input = page.getByLabel('Decimal integer');
    const clear = page.getByRole('button', { name: 'Clear input' });
    const zero = page.getByRole('button', { name: 'Zero', exact: true });

    for (const [text, key] of [['9'.repeat(500), 'Enter'], ['12.5', 'Space'], ['', 'Enter'], ['0', 'Space'], ['9'.repeat(501), 'Enter']]) {
      await input.fill(text);
      await clear.focus();
      await page.keyboard.press(key);
      await expect(input).toHaveValue('');
      await expect(clear).toBeFocused();
      await expect(page.getByText('Enter a whole number to see its Mayan numeral.', { exact: true })).toBeVisible();
      await expect(page.getByText(/^\d+ digits?$/)).toHaveCount(0);

      await input.fill(text);
      await zero.focus();
      await page.keyboard.press(key);
      await expect(input).toHaveValue('0');
      await expect(zero).toBeFocused();
      await expect(page.getByRole('img', { name: zeroNumeral })).toBeAttached();
      await expect(page.getByText('1 digit', { exact: true })).toBeVisible();
    }
  });

  test('adds the quick steps exactly, up to the 500-digit maximum and not past it', async ({ page }) => {
    const errors = await openApp(page, 'light', 375);
    const input = page.getByLabel('Decimal integer');
    const step = (name: string) => page.getByRole('button', { name, exact: true });

    // From the keyboard: Enter and Space, with the focus kept on the step
    await step('+20').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(input).toHaveValue('40');
    await expect(step('+20')).toBeFocused();
    await step('+400').click();
    await step('+5').click();
    await step('+1').click();
    await expect(input).toHaveValue('446');
    await expect(cards(page).base20).toContainText('1 × 202 • 2 × 201 • 6 × 200');
    await expect(page.getByText('3 digits', { exact: true })).toBeVisible();
    // The title names what the step adds in the numeral
    await expect(step('+400')).toHaveAttribute('title', '+400 (Tier ×2)');

    // Surrounding whitespace is accepted as by the arrow keys, and stepped to canonical text
    await input.fill(' 7 ');
    await step('+5').click();
    await expect(input).toHaveValue('12');

    // Near the maximum: the steps that would go past it are unavailable, and do nothing
    const max = BigInt('9'.repeat(500));
    await input.fill((max - 20n).toString());
    for (const [name, blocked] of [['+1', 'false'], ['+5', 'false'], ['+20', 'false'], ['+400', 'true']]) {
      await expect(step(name)).toHaveAttribute('aria-disabled', blocked);
    }
    await expect(page.getByText('Steps that would go past the 500-digit maximum are unavailable.', { exact: true })).toBeVisible();
    // Pressed from the keyboard: Playwright doesn't click aria-disabled buttons
    await step('+400').focus();
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue((max - 20n).toString());
    await step('+20').click();
    await expect(input).toHaveValue('9'.repeat(500));
    await expect(input).toHaveAttribute('aria-invalid', 'false');
    for (const name of ['+1', '+5', '+20', '+400']) await expect(step(name)).toHaveAttribute('aria-disabled', 'true');

    // Empty and invalid text: every step unavailable, with the reason, and the text kept
    for (const text of ['', '12.5', '9'.repeat(501)]) {
      await input.fill(text);
      await expect(page.getByText('Enter a whole number to copy it or use the steps.', { exact: true })).toBeVisible();
      await step('+1').focus();
      await page.keyboard.press('Enter');
      await expect(step('+1')).toBeFocused();
      await expect(input).toHaveValue(text);
    }
    expect(await pageOverflow(page)).toBe(0);
    expect(errors).toEqual([]);
  });

  test('replaces any text with a Random positive integer of 1 to 10 digits, and announces its length', async ({ page }) => {
    const errors = await openApp(page, 'dark', 1280);
    const input = page.getByLabel('Decimal integer');
    const random = page.getByRole('button', { name: 'Random number' });
    const lengths = new Set<number>();

    for (const text of ['0', '', '12.5', '9'.repeat(501), '57', '', '-3', '42', '', '1']) {
      await input.fill(text);
      await random.focus();
      await page.keyboard.press('Enter');
      await expect(random).toBeFocused();
      const value = await input.inputValue();
      expect(value).toMatch(/^[1-9]\d{0,9}$/);
      lengths.add(value.length);
      const digits = `${value.length} ${value.length === 1 ? 'digit' : 'digits'}`;
      await expect(input).toHaveAttribute('aria-invalid', 'false');
      await expect(page.getByText(`${value.length} ${value.length === 1 ? 'digit' : 'digits'}`, { exact: true })).toBeVisible();
      // A polite, visually hidden status with the length, not the number
      const status = page.getByRole('status').filter({ hasText: 'Random number generated' });
      await expect(status).toHaveText(`Random number generated, ${digits}.`);
      await expect(status).toHaveClass(/\bsr-only\b/);
      await expect(page.getByRole('group', { name: 'Numeral viewer' })).toBeVisible();
    }
    expect(lengths.size).toBeGreaterThan(1);
    expect(errors).toEqual([]);
  });

  test('copies the current number, says so, and copies nothing without a valid number', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const errors = await openApp(page, 'light', 1280);
    const input = page.getByLabel('Decimal integer');
    const copy = page.getByRole('button', { name: 'Copy number' });
    const clipboard = () => page.evaluate(() => navigator.clipboard.readText());

    for (const [text, copied] of [['8000400019', '8000400019'], ['9'.repeat(500), '9'.repeat(500)], [' 007', '7']]) {
      await input.fill(text);
      await copy.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByText('Number copied to the clipboard.', { exact: true })).toBeVisible();
      await expect(copy).toBeFocused();
      expect(await clipboard()).toBe(copied);
      await expect(input).toHaveValue(text);
    }
    await expect(page.getByText('Number copied to the clipboard.', { exact: true })).toHaveCount(1);

    // Empty and invalid text: Copy is unavailable and leaves the clipboard as it was
    await page.evaluate(() => navigator.clipboard.writeText('unchanged'));
    for (const text of ['', '12.5']) {
      await input.fill(text);
      await expect(copy).toHaveAttribute('aria-disabled', 'true');
      await copy.focus();
      await page.keyboard.press('Enter');
      await expect(copy).toBeFocused();
      expect(await clipboard()).toBe('unchanged');
    }
    expect(errors).toEqual([]);
  });

  test('reports a failed copy without claiming success', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
      });
    });
    await openApp(page, 'dark', 375);
    await page.getByLabel('Decimal integer').fill('42');
    await page.getByRole('button', { name: 'Copy number' }).click();
    await expect(page.getByText('The number could not be copied. Select it and copy it with Ctrl+C or ⌘+C.', { exact: true })).toBeVisible();
    await expect(page.getByText('Number copied to the clipboard.', { exact: true })).toHaveCount(0);
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

    await page.getByLabel('Decimal integer').focus();
    await page.keyboard.press('ArrowUp');
    expect((await exportSvg()).suggestedFilename()).toBe('mayan-numeral-number-1.svg');

    // A quick step and Zero
    await page.getByRole('button', { name: '+400', exact: true }).click();
    expect((await exportSvg()).suggestedFilename()).toBe('mayan-numeral-number-401.svg');
    await page.getByRole('button', { name: 'Zero', exact: true }).click();
    expect((await exportSvg()).suggestedFilename()).toBe('mayan-numeral-number-0.svg');

    // A Random number, named as a typed one is, with the complete numeral
    await page.getByRole('button', { name: 'Random number' }).click();
    const generated = await page.getByLabel('Decimal integer').inputValue();
    const download = await exportSvg();
    const name = generated.length <= 30
      ? `mayan-numeral-number-${generated}.svg`
      : `mayan-numeral-number-${generated.slice(0, 10)}...${generated.slice(-10)}-${generated.length}-digits.svg`;
    expect(download.suggestedFilename()).toBe(name);
    const exported = await readFile(await download.path(), 'utf8');
    const digits = await page.evaluate((svg) =>
      [...new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('g[data-digit-index]')]
        .map((g) => [g.getAttribute('data-digit-value')!, g.getAttribute('data-digit-exponent')!]), exported);
    expect(digits.reduce((sum, [digit, exponent]) => sum + BigInt(digit) * 20n ** BigInt(exponent), 0n)).toBe(BigInt(generated));
  });

  test('leaves Date mode and its clear button as they were, and keeps the number', async ({ page }) => {
    await openApp(page, 'light', 1280);
    await page.getByLabel('Decimal integer').fill('57');
    await page.getByRole('radio', { name: 'Date' }).check();
    for (const name of ['Random number', 'Copy number', 'Clear input', '+1', 'Zero']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    }
    await expect(page.getByText(/^\d+ digits?$/)).toHaveCount(0);

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
    await expect(page.getByLabel('Decimal integer')).toHaveValue('57');
  });
});
