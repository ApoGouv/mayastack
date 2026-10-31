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

/** An element's text as a screen reader gets it: with visually hidden text, without aria-hidden content */
const spokenText = (locator: Locator) =>
  locator.evaluate((el) => {
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
    return clone.textContent;
  });

/** The base-20 card at 0, as a screen reader gets it (UI-07: tier badge, label, Copy Formula, formula, breakdown) */
const ZERO_BASE20_SPOKEN =
  'Base-20 Representation1 tier, 20 to the power of 0Positional Sum FormulaCopy Formula0 × 20 to the power of 0Analytical breakdown';

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
      // Changed deliberately in UI-07: the expansion with its badge, Copy Formula and breakdown
      await expect.poll(() => spokenText(base20)).toBe(ZERO_BASE20_SPOKEN);
      await expect(exportButton).toBeVisible();
      await expectWorkspace();

      await page.getByLabel('Decimal integer').fill('');
      await expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');

      await page.getByLabel('Decimal integer').fill('8000400019');
      await expect(numeral).toBeVisible();
      await expect.poll(() => spokenText(base20)).toContain('6 × 20 to the power of 7 + 5 × 20 to the power of 6');
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
      await expect.poll(() => spokenText(base20)).toBe(ZERO_BASE20_SPOKEN);
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
        await expect.poll(() => spokenText(base20)).toBe(ZERO_BASE20_SPOKEN);
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
        await input.fill('9'.repeat(128));
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

  test('adds and subtracts 1 with the arrow keys, within 0 and 128 digits, without scrolling', async ({ page }) => {
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
    await expect.poll(() => spokenText(cards(page).base20)).toContain('Copy Formula1 × 20 to the power of 1 + 0 × 20 to the power of 0Analytical');
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('19');
    await expect.poll(() => spokenText(cards(page).base20)).toContain('Copy Formula19 × 20 to the power of 0Analytical');
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);

    // Exact beyond Number.MAX_SAFE_INTEGER
    await input.fill('9007199254740992');
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('9007199254740993');

    // At the largest value, ArrowUp keeps it
    const maxDigits = '9'.repeat(128);
    await input.fill(maxDigits);
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue(maxDigits);
    await expect(input).toHaveAttribute('aria-invalid', 'false');
    await expect(page.getByText('128 digits', { exact: true })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('9'.repeat(127) + '8');

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

    for (const [text, key] of [['9'.repeat(128), 'Enter'], ['12.5', 'Space'], ['', 'Enter'], ['0', 'Space'], ['9'.repeat(129), 'Enter']]) {
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

  test('adds the quick steps exactly, up to the 128-digit maximum and not past it', async ({ page }) => {
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
    await expect.poll(() => spokenText(cards(page).base20)).toContain('1 × 20 to the power of 2 + 2 × 20 to the power of 1 + 6 × 20 to the power of 0');
    await expect(page.getByText('3 digits', { exact: true })).toBeVisible();
    // The title names what the step adds in the numeral
    await expect(step('+400')).toHaveAttribute('title', '+400 (Tier ×2)');

    // Surrounding whitespace is accepted as by the arrow keys, and stepped to canonical text
    await input.fill(' 7 ');
    await step('+5').click();
    await expect(input).toHaveValue('12');

    // Near the maximum: the steps that would go past it are unavailable, and do nothing
    const max = BigInt('9'.repeat(128));
    await input.fill((max - 20n).toString());
    for (const [name, blocked] of [['+1', 'false'], ['+5', 'false'], ['+20', 'false'], ['+400', 'true']]) {
      await expect(step(name)).toHaveAttribute('aria-disabled', blocked);
    }
    await expect(page.getByText('Steps that would go past the 128-digit maximum are unavailable.', { exact: true })).toBeVisible();
    // Pressed from the keyboard: Playwright doesn't click aria-disabled buttons
    await step('+400').focus();
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue((max - 20n).toString());
    await step('+20').click();
    await expect(input).toHaveValue('9'.repeat(128));
    await expect(input).toHaveAttribute('aria-invalid', 'false');
    for (const name of ['+1', '+5', '+20', '+400']) await expect(step(name)).toHaveAttribute('aria-disabled', 'true');

    // Empty and invalid text: every step unavailable, with the reason, and the text kept
    for (const text of ['', '12.5', '9'.repeat(129)]) {
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

    for (const text of ['0', '', '12.5', '9'.repeat(129), '57', '', '-3', '42', '', '1']) {
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

    for (const [text, copied] of [['8000400019', '8000400019'], ['9'.repeat(128), '9'.repeat(128)], [' 007', '7']]) {
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

test.describe('base-20 expansion: formula, Copy Formula and analytical breakdown', () => {
  /** Opens the app, enters a number, and collects page errors */
  async function showNumber(page: Page, theme: Theme, width: number, text: string) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((saved) => localStorage.setItem('theme', saved), theme);
    await page.goto('./');
    await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
    await page.getByLabel('Decimal integer').fill(text);
    return errors;
  }

  const breakdown = (page: Page) => page.getByRole('region', { name: 'Analytical breakdown' });
  const toggle = (page: Page) => page.getByRole('button', { name: 'Analytical breakdown' });

  test('copies the canonical plain-text formula with the keyboard, says so, and keeps the focus', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const errors = await showNumber(page, 'light', 1280, '0');
    const input = page.getByLabel('Decimal integer');
    const copy = page.getByRole('button', { name: 'Copy Formula' });
    const clipboard = () => page.evaluate(() => navigator.clipboard.readText());

    for (const [text, formula] of [
      ['1202', '3 × 20² + 0 × 20¹ + 2 × 20⁰ = 1202'],
      ['20', '1 × 20¹ + 0 × 20⁰ = 20'],
      ['9007199254740993', '2 × 20¹² + 3 × 20¹¹ + 19 × 20¹⁰ + 12 × 20⁹ + 3 × 20⁸ + 14 × 20⁷ + 8 × 20⁶ + 7 × 20⁵ + 2 × 20⁴ + 2 × 20³ + 12 × 20² + 9 × 20¹ + 13 × 20⁰ = 9007199254740993'],
    ]) {
      await input.fill(text);
      await copy.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByText('Formula copied to the clipboard.', { exact: true })).toBeVisible();
      await expect(copy).toBeFocused();
      expect(await clipboard()).toBe(formula);
    }

    // The largest number: every tier, no grouping, ending with its exact value
    await input.fill('9'.repeat(128));
    await copy.click();
    await expect.poll(clipboard).toMatch(/ = 9{128}$/);
    const copied = await clipboard();
    expect(copied.split(' + ')).toHaveLength(99);
    expect(copied).not.toMatch(/[,<>]/);
    await expect(page.getByText('Formula copied to the clipboard.', { exact: true })).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('reports a failed formula copy without claiming success or telling to copy by hand', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
      });
    });
    await showNumber(page, 'dark', 375, '1202');
    await page.getByRole('button', { name: 'Copy Formula' }).click();
    await expect(page.getByText('The formula could not be copied. Please try again.', { exact: true })).toBeVisible();
    await expect(page.getByText('Formula copied to the clipboard.', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/select/i)).toHaveCount(0);
  });

  test('gives screen readers exponents and table headers in words', async ({ page }) => {
    await showNumber(page, 'light', 1280, '1202');
    const base20 = cards(page).base20;
    await toggle(page).click();

    const snapshot = await base20.ariaSnapshot();
    expect(snapshot).toContain('- text: 3 tiers, powers of 20 from 0 to 2 Positional Sum Formula\n');
    expect(snapshot).toContain('- text: 3 × 20 to the power of 2 + 0 × 20 to the power of 1 + 2 × 20 to the power of 0\n');
    expect(snapshot).not.toMatch(/20[²¹⁰]|× 20[0-2] /);
    for (const name of ['Tier', 'Multiplier, 20 to the power of n', 'Digit', 'Subtotal, digit times multiplier']) {
      await expect(page.getByRole('columnheader', { name, exact: true })).toHaveCount(1);
    }
    const rows = breakdown(page).locator('tbody tr');
    await expect(rows.first()).toHaveAccessibleName('Tier 2 20 to the power of 2 3 1,200');
    await expect(rows.nth(1).getByRole('cell').first()).toHaveAccessibleName('20 to the power of 1');
    // The region takes its name from the button, and the caption does not repeat it
    await expect(breakdown(page)).toHaveAttribute('aria-labelledby', (await toggle(page).getAttribute('id'))!);
    await expect(breakdown(page).getByRole('table')).toHaveAccessibleName('Place-value contribution of each base-20 tier');
  });

  test('lays out the formula panel, the full-width disclosure and the table as designed', async ({ page }) => {
    await showNumber(page, 'light', 1280, '1202');
    const base20 = cards(page).base20;
    const label = base20.getByText('Positional Sum Formula', { exact: true });
    const panel = label.locator('../..');

    // An inset panel, darker than the card, with an uppercase label, Copy Formula beside it and a
    // monospace formula whose digits stand out
    const styles = await panel.evaluate((el) => {
      const style = getComputedStyle(el);
      const card = getComputedStyle(el.closest('.bg-surface')!);
      return { panel: style.backgroundColor, card: card.backgroundColor, shadow: style.boxShadow };
    });
    expect(styles.panel).not.toBe(styles.card);
    expect(styles.shadow).toContain('inset');
    expect(await label.evaluate((el) => getComputedStyle(el).textTransform)).toBe('uppercase');
    const copy = page.getByRole('button', { name: 'Copy Formula' });
    expect(Math.abs((await box(copy)).y + (await box(copy)).height / 2 - ((await box(label)).y + (await box(label)).height / 2))).toBeLessThanOrEqual(2);
    expect((await box(copy)).height).toBeGreaterThanOrEqual(24);
    const formula = label.locator('xpath=../following-sibling::div[1]');
    expect(await formula.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono/i);
    const digit = formula.locator('.font-bold').first();
    expect(await digit.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700');

    // The disclosure spans the expansion's width, tinted apart from the card and darker on hover,
    // with a chevron pointing down while closed; it opens and closes with Enter and Space
    const expansion = panel.locator('..');
    expect((await box(toggle(page))).width).toBeCloseTo((await box(expansion)).width, 0);
    const background = () => toggle(page).evaluate((el) => getComputedStyle(el).backgroundColor);
    const rotation = () => toggle(page).locator('svg').evaluate((el) => getComputedStyle(el).rotate);
    const resting = await background();
    expect(resting).not.toBe(styles.card);
    expect(resting).not.toBe('rgba(0, 0, 0, 0)');
    expect(await rotation()).toBe('none');
    await toggle(page).hover();
    await expect.poll(background).not.toBe(resting);
    await page.mouse.move(0, 0);
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(breakdown(page)).toBeVisible();
    // Up while open
    await expect.poll(rotation).toBe('180deg');
    expect(await toggle(page).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.keyboard.press('Space');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(breakdown(page)).toHaveCount(0);
    await page.keyboard.press('Space');
    await expect(breakdown(page)).toBeVisible();

    // Uppercase headers, but not their notation; centred digits; "20ⁿ" alone on one line
    const table = breakdown(page).getByRole('table');
    const header = table.getByRole('columnheader', { name: 'Digit', exact: true });
    expect(await header.evaluate((el) => getComputedStyle(el).textTransform)).toBe('uppercase');
    expect(await header.locator('[aria-hidden="true"]').evaluate((el) => getComputedStyle(el).textTransform)).toBe('none');
    expect(await header.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
    const firstRow = table.locator('tbody tr').first();
    expect(await firstRow.locator('td').nth(1).evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
    await expect(firstRow.locator('th')).toHaveText('Tier 2');
    const multiplier = firstRow.locator('td').first();
    const lineHeight = await multiplier.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    const padding = await multiplier.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom));
    expect((await box(multiplier)).height - padding).toBeLessThan(lineHeight * 1.5);
    await expect(multiplier).toHaveText(/^202/);
    await expect(multiplier).not.toContainText('=');
  });

  for (const [theme, width] of [['light', 375], ['dark', 768], ['dark', 1280]] as const) {
    test(`gives Tier, Multiplier and Digit fixed widths and the rest to Subtotal at ${width}px`, async ({ page }) => {
      await showNumber(page, theme, width, '1202');
      await toggle(page).click();
      const table = breakdown(page).getByRole('table');
      const widths = await table.getByRole('columnheader').evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
      const tableWidth = (await box(table)).width;

      // Subtotal takes what the others leave, and the table never scrolls sideways
      expect(widths[3]).toBeCloseTo(tableWidth - widths[0] - widths[1] - widths[2], 0);
      // The widest column from 640px; at 375px about as wide as Multiplier, the narrowest that
      // fits "Multiplier" (Subtotal had about 82px when the two shared the space)
      expect(widths[3]).toBeGreaterThan(width < 640 ? widths[0] : Math.max(widths[0], widths[1], widths[2]));
      expect(await breakdown(page).evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      expect(await pageOverflow(page)).toBe(0);
      // The notation never spills out of its column
      for (const cell of await table.locator('thead th, tbody tr:first-child > *').all()) {
        expect(await cell.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const [theme, width] of [['dark', 375], ['light', 1280]] as const) {
    test(`wraps long subtotals only between groups of digits at ${width}px`, async ({ page }) => {
      const errors = await showNumber(page, theme, width, '9'.repeat(128));
      await toggle(page).click();
      const cells = breakdown(page).locator('tbody tr > td:last-child');

      const layout = await cells.evaluateAll((tds) => tds.map((td) => {
        const lineHeight = parseFloat(getComputedStyle(td).lineHeight);
        // Each group of digits is its own text node, so a group split over two lines has two boxes
        const groups: Text[] = [];
        const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (/^\d+$/.test(node.textContent!) && !node.parentElement!.closest('sup, .sr-only')) groups.push(node as Text);
        }
        const splitGroups = groups.filter((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getClientRects().length > 1;
        }).length;
        const power = td.querySelector('.whitespace-nowrap [aria-hidden="true"]');
        return {
          groups: groups.length,
          splitGroups,
          powerLines: power ? Math.round(power.getBoundingClientRect().height / lineHeight) : 1,
          spill: td.scrollWidth - td.clientWidth,
        };
      }));

      expect(layout).toHaveLength(99);
      expect(layout.reduce((sum, cell) => sum + cell.groups, 0)).toBeGreaterThan(99);
      expect(layout.filter((cell) => cell.splitGroups > 0)).toEqual([]);
      expect(layout.filter((cell) => cell.powerLines > 1 || cell.spill > 0)).toEqual([]);
      // At 375px the longest values do wrap, so the breaks above were actually tested
      if (width === 375) expect(await cells.first().evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(60);
      expect(await breakdown(page).evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      expect(await pageOverflow(page)).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  for (const width of [375, 1280]) {
    test(`keeps the focused value clear of the sticky header while tabbing backwards at ${width}px`, async ({ page }) => {
      const errors = await showNumber(page, 'light', width, '9'.repeat(128));
      await toggle(page).click();
      const focusable = breakdown(page).locator('[tabindex="0"]');
      await focusable.last().focus();

      // Backwards from the last value, the browser scrolls each one to the top of the box: it,
      // with its focus ring, must end below the sticky header and inside the box
      for (let press = 0; press < 30; press++) {
        await page.keyboard.press('Shift+Tab');
        const placement = await page.evaluate(() => {
          const focused = document.activeElement as HTMLElement;
          const box = focused.closest('[role="region"]')!;
          const header = box.querySelector('thead th')!.getBoundingClientRect();
          const style = getComputedStyle(focused);
          const ring = parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
          const rect = focused.getBoundingClientRect();
          return {
            inTable: focused.closest('tbody') != null,
            ringTop: rect.top - ring,
            bottom: rect.bottom,
            headerBottom: header.bottom,
            boxBottom: box.getBoundingClientRect().bottom,
          };
        });
        expect(placement.inTable, `press ${press + 1}`).toBe(true);
        // 0.5px for sub-pixel rounding
        expect(placement.ringTop, `press ${press + 1}`).toBeGreaterThanOrEqual(placement.headerBottom - 0.5);
        expect(placement.bottom, `press ${press + 1}`).toBeLessThanOrEqual(placement.boxBottom + 0.5);
      }
      expect(errors).toEqual([]);
    });
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`shows a multiplier's exact value in a tooltip on hover and keyboard focus in the ${theme} theme`, async ({ page }) => {
      const errors = await showNumber(page, theme, 1280, '1202');
      await toggle(page).click();
      const multiplier = breakdown(page).locator('tbody tr').first().locator('[data-exponent]');
      const tooltip = page.getByRole('tooltip');

      await multiplier.hover();
      await expect(tooltip).toHaveText('400');
      await expect(multiplier).toHaveAttribute('aria-describedby', (await tooltip.getAttribute('id'))!);
      // Inverse colours, legible in either theme
      const colours = await tooltip.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
      expect(colours[0]).not.toBe(colours[1]);
      await page.mouse.move(0, 0);
      await expect(tooltip).toHaveCount(0);

      // The keyboard: the multiplier is the only stop in its row, and Escape closes the tooltip
      await toggle(page).focus();
      await page.keyboard.press('Tab');
      await expect(multiplier).toBeFocused();
      await expect(tooltip).toHaveText('400');
      await page.keyboard.press('Escape');
      await expect(tooltip).toHaveCount(0);
      await page.keyboard.press('Tab');
      await expect(breakdown(page).locator('tbody tr').nth(1).locator('[data-exponent]')).toBeFocused();
      await expect(tooltip).toHaveText('20');
      expect(errors).toEqual([]);
    });
  }

  for (const [theme, width] of [['light', 375], ['dark', 768], ['light', 1280]] as const) {
    test(`writes subtotals with 6 or more trailing zeros compactly, exact in a tooltip, at ${width}px`, async ({ page }) => {
      // 2 × 20⁷ + 5 × 20⁵ + 3 × 20²: 2,560,000,000, 16,000,000 and 1,200
      const errors = await showNumber(page, theme, width, '2576001200');
      await toggle(page).click();
      const rows = breakdown(page).locator('tbody tr');
      const subtotal = (row: number) => rows.nth(row).locator('td').last();
      const compact = subtotal(0).locator('[data-subtotal]');

      await expect(subtotal(0)).toHaveAccessibleName('2,560 times 10 to the power of 6');
      expect(await spokenText(subtotal(2))).toBe('16 times 10 to the power of 6');
      await expect(subtotal(5)).toHaveText('1,200');
      await expect(subtotal(5).locator('[data-subtotal]')).toHaveCount(0);
      // On one line, right-aligned, with nothing spilling out
      const lineHeight = await subtotal(0).evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      expect((await box(compact)).height).toBeLessThan(lineHeight * 1.5);
      expect(await subtotal(0).evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      expect(await pageOverflow(page)).toBe(0);

      // The exact value on hover, then from the keyboard: the multiplier, then the compact subtotal
      const tooltip = page.getByRole('tooltip');
      await compact.hover();
      await expect(tooltip).toHaveText('2,560,000,000');
      await expect(compact).toHaveAttribute('aria-describedby', (await tooltip.getAttribute('id'))!);
      await page.mouse.move(0, 0);
      await expect(tooltip).toHaveCount(0);
      await rows.first().locator('[data-exponent]').focus();
      await page.keyboard.press('Tab');
      await expect(compact).toBeFocused();
      await expect(tooltip).toHaveText('2,560,000,000');
      expect(await compact.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
      expect(errors).toEqual([]);
    });
  }

  test('keeps the formula panel header in view while its 128-digit formula scrolls, with themed scrollbars', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      const errors = await showNumber(page, theme, 375, '9'.repeat(128));
      const label = cards(page).base20.getByText('Positional Sum Formula', { exact: true });
      const copy = page.getByRole('button', { name: 'Copy Formula' });
      const formula = page.getByRole('region', { name: 'Positional Sum Formula' });

      expect((await box(formula)).height).toBeLessThanOrEqual(258);
      const scroll = await formula.evaluate((el) => ({
        colour: getComputedStyle(el).scrollbarColor,
        sideways: el.scrollWidth - el.clientWidth,
        lineStrong: getComputedStyle(document.documentElement).getPropertyValue('--color-line-strong').trim(),
      }));
      // The scrollbar in the theme's line-strong colour (headless Chromium hides scrollbars, so
      // their visibility is checked in screenshots), and nothing to scroll sideways
      expect(scroll.colour).toMatch(/^rgb\(/);
      expect(scroll.colour).toContain(await page.evaluate((hex) => {
        const n = parseInt(hex.slice(1), 16);
        return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
      }, scroll.lineStrong));
      expect(scroll.sideways).toBeLessThanOrEqual(0);

      await formula.focus();
      await page.keyboard.press('End');
      await expect.poll(() => formula.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 1)).toBe(true);
      // The label and Copy Formula stay above the scrolled formula
      await expect(label).toBeInViewport();
      await expect(copy).toBeInViewport();
      expect((await box(copy)).y + (await box(copy)).height).toBeLessThanOrEqual((await box(formula)).y);
      expect(await pageOverflow(page)).toBe(0);
      expect(errors).toEqual([]);
    }
  });

  for (const width of [375, 768]) {
    test(`moves the focused disclosure clear of the floating Export trigger at ${width}px`, async ({ page }) => {
      await showNumber(page, 'light', width, '1202');
      const exportTrigger = page.getByRole('button', { name: /Export/ });
      const exportTop = (await box(exportTrigger)).y;
      // Scroll so that the disclosure sits in the trigger's band, then Tab onto it
      const toggleTop = await toggle(page).evaluate((el) => el.getBoundingClientRect().top + scrollY);
      await page.evaluate((y) => window.scrollTo(0, y), toggleTop - exportTop - 4);
      expect((await box(toggle(page))).y + (await box(toggle(page))).height).toBeGreaterThan(exportTop);
      await page.getByRole('button', { name: 'Copy Formula' }).evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));

      await page.keyboard.press('Tab');
      await expect(toggle(page)).toBeFocused();
      await expect.poll(async () => (await box(toggle(page))).y + (await box(toggle(page))).height).toBeLessThanOrEqual(exportTop);
      // The chevron, on the right, is clear of the trigger, and the trigger still works
      await expect(toggle(page).locator('svg')).toBeInViewport();
      await exportTrigger.click();
      await expect(page.getByRole('heading', { name: 'Export Options' })).toBeAttached();
    });
  }

  for (const width of [375, 768, 1280]) {
    test(`lets the end of the page scroll clear of the floating Export trigger at ${width}px`, async ({ page }) => {
      for (const open of [false, true]) {
        await showNumber(page, 'light', width, '1202');
        await page.setViewportSize({ width, height: 600 });
        if (open) await toggle(page).click();
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const exportTop = (await box(page.getByRole('button', { name: /Export/ }))).y;

        // At the end of the page, every card ends above the trigger, with a gap
        const cardBottoms = await page.locator('main .bg-surface.rounded-lg').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().bottom));
        expect(cardBottoms.length).toBeGreaterThan(0);
        for (const bottom of cardBottoms) expect(bottom).toBeLessThanOrEqual(exportTop - 8);

        // The disclosure, chevron included, can be brought fully above the trigger by scrolling
        await toggle(page).evaluate((el) => el.scrollIntoView({ block: 'end' }));
        expect((await box(toggle(page))).y + (await box(toggle(page))).height).toBeLessThanOrEqual(exportTop);
        expect(await pageOverflow(page)).toBe(0);
      }
    });
  }

  test('fades the breakdown out and removes it at once when reduced motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await showNumber(page, 'dark', 375, '1202');
    await toggle(page).click();
    const fading = breakdown(page).locator('..');
    expect(await fading.evaluate((el) => getComputedStyle(el).animationDuration)).toBe('1e-05s');
    expect(await toggle(page).locator('svg').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('1e-05s');

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(breakdown(page)).toHaveCount(0);
  });

  test('groups the table values exactly, beyond Number.MAX_SAFE_INTEGER', async ({ page }) => {
    await showNumber(page, 'light', 1280, '9007199254740993');
    await toggle(page).click();
    const top = breakdown(page).locator('tbody tr').first();
    await top.locator('[data-exponent]').focus();
    await expect(page.getByRole('tooltip')).toHaveText('4,096,000,000,000,000');
    // 8,192,000,000,000,000, compact, exact in the tooltip
    await expect(top.locator('td').last()).toHaveAccessibleName('8,192 times 10 to the power of 12');
    await top.locator('[data-subtotal]').focus();
    await expect(page.getByRole('tooltip')).toHaveText('8,192,000,000,000,000');

    await page.getByLabel('Decimal integer').fill('1202');
    await expect(breakdown(page).locator('tbody tr').first().locator('td').last()).toHaveText('1,200');
  });

  for (const [theme, width] of [['dark', 375], ['light', 768], ['light', 1280]] as const) {
    test(`opens the 128-digit breakdown without overflow, with a sticky header and keyboard scrolling at ${width}px`, async ({ page }) => {
      const errors = await showNumber(page, theme, width, '9'.repeat(128));
      const base20 = cards(page).base20;
      await expect(base20.getByText('99 tiers · 20⁰–20⁹⁸', { exact: true })).toBeVisible();
      await expect(breakdown(page)).toHaveCount(0);

      await toggle(page).focus();
      await page.keyboard.press('Enter');
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
      const region = breakdown(page);
      await expect(region.locator('tbody tr')).toHaveCount(99);

      // Bounded: about 300px tall, no horizontal scrolling inside or on the page
      expect((await box(region)).height).toBeLessThanOrEqual(302);
      expect(await region.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      expect(await pageOverflow(page)).toBe(0);
      // The top subtotal, 3 × 20⁹⁸, compact; a long coefficient may wrap, but never "× 10⁹⁶"
      const topSubtotal = region.locator('tbody tr').first().locator('td').last();
      await expect(topSubtotal).toHaveAccessibleName('95,073,795,017,117,205,112,252,740,403,200 times 10 to the power of 96');
      const lineHeight = await topSubtotal.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      const powerHeights = await region.locator('td .whitespace-nowrap').evaluateAll((powers) => powers.map((el) => el.getBoundingClientRect().height));
      expect(powerHeights.length).toBeGreaterThan(80);
      for (const height of powerHeights) expect(height).toBeLessThan(lineHeight * 1.5);
      expect(await region.locator('td, th').evaluateAll((cells) => cells.filter((cell) => cell.scrollWidth > cell.clientWidth).length)).toBe(0);

      // The longest multiplier, 20⁹⁸, and subtotal, exact in a tooltip that wraps inside the
      // screen, without scrolling
      const tooltip = page.getByRole('tooltip');
      for (const [anchor, exact] of [['[data-exponent]', 20n ** 98n], ['[data-subtotal]', 3n * 20n ** 98n]] as const) {
        await region.locator('tbody tr').first().locator(anchor).hover();
        await expect(tooltip).toHaveText(/^\d{1,3}(,\d{3})+$/);
        expect((await tooltip.textContent())!.replaceAll(',', '')).toBe(exact.toString());
        const tip = await box(tooltip);
        expect(tip.x).toBeGreaterThanOrEqual(0);
        expect(tip.x + tip.width).toBeLessThanOrEqual(width);
        expect(tip.y).toBeGreaterThanOrEqual(0);
        expect(await tooltip.evaluate((el) => [getComputedStyle(el).overflowWrap, getComputedStyle(el).overflowY])).toEqual(['anywhere', 'visible']);
        expect(await pageOverflow(page)).toBe(0);
        await page.mouse.move(0, 0);
        await expect(tooltip).toHaveCount(0);
      }

      // Next in the tab order, with the focus ring, and scrollable with the keyboard
      await toggle(page).focus();
      await page.keyboard.press('Tab');
      await expect(region).toBeFocused();
      expect(await region.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
      await page.keyboard.press('End');
      await expect.poll(() => region.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 1)).toBe(true);
      // The header stays at the top of the scrolled region
      const header = region.getByRole('columnheader', { name: 'Tier', exact: true });
      expect(Math.abs((await box(header)).y - (await box(region)).y)).toBeLessThanOrEqual(2);
      await expect(region.locator('tbody tr').last().locator('th')).toBeInViewport();
      expect(await pageOverflow(page)).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test('leaves Date mode without the badge, Copy Formula or breakdown', async ({ page }) => {
    await showNumber(page, 'light', 1280, '1202');
    await page.getByRole('radio', { name: 'Date' }).check();
    await page.getByLabel('Date input').click();
    await page.getByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ }).first().click();
    const base20 = cards(page).base20;

    await expect(base20.getByText('Day', { exact: true })).toBeVisible();
    expect(await base20.getByText('Day', { exact: true }).locator('xpath=following-sibling::div[1]').innerHTML()).toBe('15 × 20<sup>0</sup>');
    await expect(base20.getByText(/tiers?|Positional Sum Formula/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Copy Formula' })).toHaveCount(0);
    await expect(toggle(page)).toHaveCount(0);
  });
});
