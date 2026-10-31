// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPlaceValues, toBase20 } from '@utils/base20';
import { formatGroupedInteger } from '@utils/formatInteger';
import { spokenText, visibleText } from '@/test/text';
import Base20Expansion, { TierBadge } from './Base20Expansion';

// The real formatter, watched, to count how many rows render again
vi.mock('@utils/formatInteger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@utils/formatInteger')>();
  return { ...actual, formatGroupedInteger: vi.fn(actual.formatGroupedInteger) };
});

afterEach(() => {
  act(() => toast.remove());
  cleanup();
  vi.restoreAllMocks();
  delete (navigator as { clipboard?: unknown }).clipboard;
});

/** Digits grouped in threes with commas, the first group 1 to 3 digits long */
const GROUPED = /^\d{1,3}(,\d{3})*$/;

/** Gives navigator a clipboard (or none), as the browser would */
function mockClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
}

interface HarnessProps {
  value: bigint;
  /** Whether the breakdown starts open, as the parent may have kept it */
  initiallyOpen?: boolean;
  onBreakdownOpenChange?: (open: boolean) => void;
}

/** Keeps whether the breakdown is open, as HomeView does */
function Harness({ value, initiallyOpen = false, onBreakdownOpenChange }: HarnessProps) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Base20Expansion
      digits={toBase20(value)}
      breakdownOpen={open}
      onBreakdownOpenChange={(next) => {
        onBreakdownOpenChange?.(next);
        setOpen(next);
      }}
    />
  );
}

/** Renders the expansion of a number with the app's toasts, which report copying */
function renderExpansion(value: bigint, props: Omit<HarnessProps, 'value'> = {}) {
  render(<Toaster />);
  return render(<Harness value={value} {...props} />);
}

/** happy-dom does no layout: makes every element report the given content and box heights */
function mockHeights(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
}

/** The formula: the element after the panel's label row */
const formulaBox = () => screen.getByText('Positional Sum Formula').parentElement!.nextElementSibling as HTMLElement;
const copyButton = () => screen.getByRole('button', { name: 'Copy Formula' });
const breakdownToggle = () => screen.getByRole('button', { name: 'Analytical breakdown' });
const openBreakdown = () => fireEvent.click(breakdownToggle());
const breakdownRegion = () => screen.getByRole('region', { name: 'Analytical breakdown' });
/** The element that fades the breakdown in and out */
const fadingBreakdown = () => breakdownRegion().parentElement!;
const endAnimation = (animationName: string) => fireEvent.animationEnd(fadingBreakdown(), { animationName });
const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
/** The multiplier's notation, the anchor of its tooltip */
const multiplierTrigger = (row: HTMLElement) => row.children[1].querySelector<HTMLElement>('[data-exponent]')!;
/** Shows a multiplier's tooltip by focusing its notation, and returns the tooltip */
async function focusMultiplier(row: HTMLElement) {
  act(() => multiplierTrigger(row).focus());
  return screen.findByRole('tooltip');
}
/** A compact subtotal's notation, the anchor of its tooltip, if the subtotal is compact */
const subtotalTrigger = (row: HTMLElement) => row.children[3].querySelector<HTMLElement>('[data-subtotal]');
/**
 * The value a subtotal cell shows, read back from what a screen reader hears: "1,200", or
 * "2,560 times 10 to the power of 6", computed exactly
 */
function shownSubtotal(row: HTMLElement): bigint {
  const spoken = spokenText(row.children[3]);
  const compact = /^([\d,]+) times 10 to the power of (\d+)$/.exec(spoken);
  if (compact) return BigInt(compact[1].replaceAll(',', '')) * 10n ** BigInt(compact[2]);
  expect(spoken).toMatch(GROUPED);
  return BigInt(spoken.replaceAll(',', ''));
}

describe('Base20Expansion formula', () => {
  it('shows every term with a superscript exponent, joined by +', () => {
    renderExpansion(1202n);
    const box = formulaBox();

    expect(visibleText(box)).toBe('3 × 202 + 0 × 201 + 2 × 200');
    expect([...box.querySelectorAll('sup')].map((sup) => sup.textContent)).toEqual(['2', '1', '0']);
    expect(box.textContent).not.toMatch(/[⁰¹²³⁴⁵⁶⁷⁸⁹•]/);
  });

  it('is labelled "Positional Sum Formula", with Copy Formula beside the label', () => {
    renderExpansion(1202n);
    const labelRow = screen.getByText('Positional Sum Formula').parentElement!;

    expect(within(labelRow).getByRole('button', { name: 'Copy Formula' })).toBe(copyButton());
    expect(screen.queryByText('Base-20 Expansion')).toBeNull();
  });

  it('emphasises each digit, in order, apart from the operators and powers of 20', () => {
    renderExpansion(1202n);
    const digits = [...formulaBox().querySelectorAll('.font-bold')];

    expect(digits.map((digit) => digit.textContent)).toEqual(['3', '0', '2']);
    expect(digits.every((digit) => digit.className.includes('text-accent-fg'))).toBe(true);
  });

  it('reads each exponent once, as "20 to the power of n"', () => {
    renderExpansion(1202n);
    const box = formulaBox();

    expect(spokenText(box)).toBe('3 × 20 to the power of 2 + 0 × 20 to the power of 1 + 2 × 20 to the power of 0');
    expect([...box.querySelectorAll('sup')].every((sup) => sup.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('keeps zero as its single term, and digits above 9', () => {
    renderExpansion(0n);
    expect(spokenText(formulaBox())).toBe('0 × 20 to the power of 0');
    cleanup();

    renderExpansion(399n);
    expect(spokenText(formulaBox())).toBe('19 × 20 to the power of 1 + 19 × 20 to the power of 0');
  });

  it('has no notation tooltip', () => {
    const { container } = renderExpansion(1202n);
    expect(container.querySelector('[data-tooltip-id]')).toBeNull();
  });

  it('stays plain text while it fits', () => {
    mockHeights(74, 74);
    renderExpansion(1202n);

    expect(formulaBox().getAttribute('role')).toBeNull();
    expect(formulaBox().hasAttribute('tabindex')).toBe(false);
  });

  it('becomes a focusable region named by its label once it overflows', () => {
    mockHeights(2500, 256);
    renderExpansion(10n ** 128n - 1n);

    const region = screen.getByRole('region', { name: 'Positional Sum Formula' });
    expect(region).toBe(formulaBox());
    expect(region.tabIndex).toBe(0);
    expect(region.className).toContain('max-h-64');
  });
});

describe('Base20Expansion analytical breakdown', () => {
  it('is collapsed by default, without rendering its rows', () => {
    renderExpansion(1202n);

    expect(breakdownToggle().getAttribute('aria-expanded')).toBe('false');
    expect(breakdownToggle().hasAttribute('aria-controls')).toBe(false);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('opens on demand, fading in a region named by its button', () => {
    renderExpansion(1202n);
    openBreakdown();

    const region = breakdownRegion();
    expect(breakdownToggle().getAttribute('aria-expanded')).toBe('true');
    expect(breakdownToggle().getAttribute('aria-controls')).toBe(region.id);
    expect(region.getAttribute('aria-labelledby')).toBe(breakdownToggle().id);
    expect(within(region).getByRole('table')).toBeTruthy();
    expect(fadingBreakdown().className).toBe('animate-fade-in');
    // The formula stays visible
    expect(spokenText(formulaBox())).toContain('3 × 20 to the power of 2');
  });

  it('closes for the parent at once, and removes the table once it has faded out', () => {
    const onBreakdownOpenChange = vi.fn();
    renderExpansion(1202n, { onBreakdownOpenChange });
    openBreakdown();
    fireEvent.click(breakdownToggle());

    expect(onBreakdownOpenChange.mock.calls).toEqual([[true], [false]]);
    expect(breakdownToggle().getAttribute('aria-expanded')).toBe('false');
    expect(breakdownToggle().hasAttribute('aria-controls')).toBe(false);
    // Still there while it fades out
    expect(fadingBreakdown().className).toBe('animate-fade-out');
    expect(screen.getByRole('table')).toBeTruthy();

    // Another animation ending (e.g. one inside) leaves it in place
    endAnimation('fade-in');
    expect(screen.getByRole('table')).toBeTruthy();

    endAnimation('fade-out');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('stays open when reopened while fading out, whatever animation ends later', () => {
    const onBreakdownOpenChange = vi.fn();
    renderExpansion(1202n, { onBreakdownOpenChange });
    openBreakdown();
    fireEvent.click(breakdownToggle());
    const table = screen.getByRole('table');

    fireEvent.click(breakdownToggle());
    expect(onBreakdownOpenChange.mock.calls).toEqual([[true], [false], [true]]);
    expect(breakdownToggle().getAttribute('aria-expanded')).toBe('true');
    expect(fadingBreakdown().className).toBe('animate-fade-in');
    // The same table, kept rather than rendered again
    expect(screen.getByRole('table')).toBe(table);

    // A late end of the cancelled fade-out must not remove the reopened breakdown
    endAnimation('fade-out');
    endAnimation('fade-in');
    expect(screen.getByRole('table')).toBe(table);
    expect(breakdownToggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('appears without fading in when it is shown already open', () => {
    renderExpansion(1202n, { initiallyOpen: true });

    expect(breakdownToggle().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(fadingBreakdown().hasAttribute('class')).toBe(false);
  });

  it('is a table with a caption, column headers in words and a row header per tier', () => {
    renderExpansion(1202n);
    openBreakdown();
    const table = screen.getByRole('table', { name: 'Place-value contribution of each base-20 tier' });

    // The notation in brackets is hidden from screen readers; the names say it in words
    for (const name of ['Tier', 'Multiplier, 20 to the power of n', 'Digit', 'Subtotal, digit times multiplier']) {
      expect(within(table).getByRole('columnheader', { name })).toBeTruthy();
    }
    expect(within(table).getAllByRole('columnheader').map((header) => spokenText(header))).toEqual([
      'Tier', 'Multiplier', 'Digit', 'Subtotal',
    ]);
    expect(within(table).getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['Tier 2', 'Tier 1', 'Tier 0']);
  });

  it('keeps the headers’ notation out of their uppercase lettering', () => {
    renderExpansion(1202n);
    openBreakdown();
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader');

    expect(headers.every((header) => header.className.includes('uppercase'))).toBe(true);
    expect(headers.slice(1).every((header) => header.querySelector('[aria-hidden="true"]')!.className.includes('normal-case'))).toBe(true);
  });

  it('shows each tier highest first, with "20ⁿ" multipliers and grouped subtotals read as words', () => {
    renderExpansion(1202n);
    openBreakdown();

    expect(bodyRows().map((row) => [...row.children].map(spokenText))).toEqual([
      ['Tier 2', '20 to the power of 2', '3', '1,200'],
      ['Tier 1', '20 to the power of 1', '0', '0'],
      ['Tier 0', '20 to the power of 0', '2', '2'],
    ]);
    // Only the power of 20 is shown: its value is in the tooltip
    expect(visibleText(bodyRows()[0].children[1])).toBe('202');
    expect(bodyRows()[0].children[1].querySelector('sup')!.textContent).toBe('2');
    expect(bodyRows()[0].textContent).not.toContain('=');
  });

  it('has a chevron that points down while closed and up while open', () => {
    renderExpansion(1202n);
    const chevron = () => breakdownToggle().querySelector('svg')!.getAttribute('class')!;

    expect(chevron()).not.toMatch(/rotate/);
    openBreakdown();
    expect(chevron()).toContain('rotate-180');
    fireEvent.click(breakdownToggle());
    expect(chevron()).not.toMatch(/rotate/);
  });

  it('is always tinted, with a darker hover', () => {
    renderExpansion(1202n);
    const classes = breakdownToggle().className.split(' ');

    expect(classes).toContain('bg-surface-hover');
    expect(classes).toContain('hover:bg-surface-active');
    expect(classes).toContain('focus-ring');
    expect(classes).toContain('w-full');
  });

  it('centres and emphasises the digits', () => {
    renderExpansion(1202n);
    openBreakdown();
    const digitHeader = within(screen.getByRole('table')).getByRole('columnheader', { name: 'Digit' });

    expect(digitHeader.className).toContain('text-center');
    for (const row of bodyRows()) {
      expect(row.children[2].className).toContain('text-center');
      expect(row.children[2].className).toContain('text-accent-fg');
    }
  });

  it('gives each multiplier’s exact value in a tooltip, on keyboard focus and on hover', async () => {
    renderExpansion(1202n);
    openBreakdown();
    const rows = bodyRows();
    // Not in the page until a multiplier is focused or hovered
    expect(screen.queryByRole('tooltip')).toBeNull();

    const tooltip = await focusMultiplier(rows[0]);
    expect(tooltip.textContent).toBe('400');
    await vi.waitFor(() => expect(multiplierTrigger(rows[0]).getAttribute('aria-describedby')).toBe(tooltip.id));

    act(() => multiplierTrigger(rows[0]).blur());
    fireEvent.mouseEnter(multiplierTrigger(rows[1]));
    await vi.waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe('20'));
    await vi.waitFor(() => expect(multiplierTrigger(rows[1]).getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id));
    expect(multiplierTrigger(rows[0]).hasAttribute('aria-describedby')).toBe(false);
  });

  it('makes only the multipliers focusable, one per row, without a native title', () => {
    renderExpansion(1202n);
    openBreakdown();
    const focusable = [...screen.getByRole('table').querySelectorAll('[tabindex]')];

    expect(focusable).toEqual(bodyRows().map(multiplierTrigger));
    expect(focusable.every((element) => element.getAttribute('tabindex') === '0')).toBe(true);
    expect(screen.getByRole('table').querySelector('[title]')).toBeNull();
  });

  it('keeps exact values beyond Number.MAX_SAFE_INTEGER', async () => {
    const value = 9007199254740993n;
    renderExpansion(value);
    openBreakdown();
    const placeValues = getPlaceValues(toBase20(value));
    const rows = bodyRows();

    expect((await focusMultiplier(rows[0])).textContent).toBe('4,096,000,000,000,000');
    // 8,192,000,000,000,000, with 12 trailing zeros, is shown compact
    expect(visibleText(rows[0].children[3])).toBe('8,192 × 1012');
    expect(subtotalTrigger(rows[0])!.dataset.subtotal).toBe('8192000000000000');
    rows.forEach((row, index) => {
      expect(multiplierTrigger(row).dataset.exponent).toBe(String(placeValues[index].exponent));
      expect(shownSubtotal(row)).toBe(placeValues[index].value);
    });
    expect(rows.reduce((sum, row) => sum + shownSubtotal(row), 0n)).toBe(value);
  });

  it('shows subtotals with 6 or more trailing zeros as a power-of-ten multiple, read in words', () => {
    // 2 × 20⁷ + 5 × 20⁵ + 3 × 20²: 2,560,000,000 (7 trailing zeros), 16,000,000 (exactly 6), 1,200 (2)
    renderExpansion(2_576_001_200n);
    openBreakdown();
    const rows = bodyRows();

    expect(rows.map((row) => visibleText(row.children[3]))).toEqual(['2,560 × 106', '0', '16 × 106', '0', '0', '1,200', '0', '0']);
    expect(spokenText(rows[0].children[3])).toBe('2,560 times 10 to the power of 6');
    expect(spokenText(rows[2].children[3])).toBe('16 times 10 to the power of 6');
    // The exponent is a superscript, and "× 10ⁿ" stays on one line
    expect(rows[0].children[3].querySelector('sup')!.textContent).toBe('6');
    expect(rows[0].children[3].querySelector('.whitespace-nowrap')!.textContent).toContain('× 10');
    expect(rows.map(shownSubtotal)).toEqual(getPlaceValues(toBase20(2_576_001_200n)).map(({ value }) => value));
    // Values written in full, including zero, have no tooltip
    expect(rows.map((row) => subtotalTrigger(row) != null)).toEqual([true, false, true, false, false, false, false, false]);
  });

  it('lets a long subtotal break only after a separator, never inside a group of digits', () => {
    // 3 × 20⁹⁸ is compact, with a 32-digit coefficient; 19 × 20⁴ = 3,040,000 is written in full
    renderExpansion(3n * 20n ** 98n + 19n * 20n ** 4n);
    openBreakdown();
    const rows = bodyRows();
    const compact = rows[0].children[3];
    const full = rows[94].children[3];

    // A line-break opportunity right after every comma, and nowhere else
    for (const cell of [compact, full]) {
      const breaks = [...cell.querySelectorAll('wbr')];
      expect(breaks).toHaveLength((cell.textContent!.match(/,/g) ?? []).length);
      expect(breaks.length).toBeGreaterThan(0);
      expect(breaks.every((wbr) => wbr.previousSibling?.textContent?.endsWith(','))).toBe(true);
    }
    expect(full.textContent).toBe('3,040,000');
    // The text read and copied is unchanged
    expect(visibleText(compact)).toBe('95,073,795,017,117,205,112,252,740,403,200 × 1096');
    expect(spokenText(compact)).toBe('95,073,795,017,117,205,112,252,740,403,200 times 10 to the power of 96');
    // "× 10ⁿ" still never breaks
    expect(compact.querySelector('.whitespace-nowrap wbr')).toBeNull();
  });

  it('gives a compact subtotal’s exact value in the same tooltip, on keyboard focus and on hover', async () => {
    renderExpansion(2_576_001_200n);
    openBreakdown();
    const rows = bodyRows();

    act(() => subtotalTrigger(rows[0])!.focus());
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toBe('2,560,000,000');
    await vi.waitFor(() => expect(subtotalTrigger(rows[0])!.getAttribute('aria-describedby')).toBe(tooltip.id));

    act(() => subtotalTrigger(rows[0])!.blur());
    fireEvent.mouseEnter(subtotalTrigger(rows[2])!);
    await vi.waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe('16,000,000'));
    expect(screen.getByRole('tooltip').id).toBe(tooltip.id);
  });

  it('makes only the multipliers and compact subtotals focusable', () => {
    renderExpansion(2_576_001_200n);
    openBreakdown();
    const focusable = [...screen.getByRole('table').querySelectorAll('[tabindex]')];
    const rows = bodyRows();

    expect(focusable).toEqual(rows.flatMap((row) => [multiplierTrigger(row), subtotalTrigger(row)].filter(Boolean)));
    expect(focusable).toHaveLength(8 + 2);
    expect(screen.getByRole('table').querySelector('[title]')).toBeNull();
  });

  it('shows all 99 tiers of the largest number exactly, in a capped scrolling region', async () => {
    const value = 10n ** 128n - 1n;
    renderExpansion(value);
    openBreakdown();
    const rows = bodyRows();

    expect(rows).toHaveLength(99);
    expect(rows[0].children[0].textContent).toBe('Tier 98');
    // Every subtotal, compact or not, is exactly its place value, and they add up to the number
    const placeValues = getPlaceValues(toBase20(value));
    rows.forEach((row, index) => {
      expect(shownSubtotal(row)).toBe(placeValues[index].value);
      const trigger = subtotalTrigger(row);
      if (trigger) expect(trigger.dataset.subtotal).toBe(placeValues[index].value.toString());
    });
    expect(rows.reduce((sum, row) => sum + shownSubtotal(row), 0n)).toBe(value);
    // The top subtotal, 3 × 20⁹⁸ (128 digits), is shown with a 32-digit coefficient
    expect(visibleText(rows[0].children[3])).toBe('95,073,795,017,117,205,112,252,740,403,200 × 1096');

    const region = breakdownRegion();
    expect(region.className).toContain('max-h-75');
    expect(region.className).toContain('overflow-y-auto');
    // Long values wrap inside their cells rather than widening the table: between groups of
    // digits, and inside one only as a last resort
    expect(rows[0].children[3].className).toContain('wrap-break-word');
    expect(rows[0].children[3].className).not.toContain('wrap-anywhere');

    // The 128-digit multiplier and subtotal, exact, in a tooltip that wraps, without scrolling
    const tooltip = await focusMultiplier(rows[0]);
    expect(tooltip.textContent).toMatch(GROUPED);
    expect(tooltip.textContent!.replaceAll(',', '')).toBe((20n ** 98n).toString());
    expect(tooltip.className).toMatch(/max-w-\[/);
    expect(tooltip.className).toContain('wrap-anywhere');
    expect(tooltip.className).not.toMatch(/max-h-|overflow-y-auto/);
    act(() => multiplierTrigger(rows[0]).blur());
    act(() => subtotalTrigger(rows[0])!.focus());
    await vi.waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe(formatGroupedInteger(3n * 20n ** 98n)));
  });

  it('renders again only the rows whose digit changed', () => {
    const { rerender } = renderExpansion(1202n, { initiallyOpen: true });
    const rows = bodyRows();
    vi.mocked(formatGroupedInteger).mockClear();

    rerender(<Harness value={1203n} initiallyOpen />);
    // Only Tier 0 changed (2 to 3): one subtotal formatted again, the other rows kept
    expect(vi.mocked(formatGroupedInteger).mock.calls).toEqual([[3n]]);
    expect(bodyRows()).toEqual(rows);
    expect(shownSubtotal(bodyRows()[2])).toBe(3n);
  });

  it('is in the tab order only while it has something to scroll', () => {
    mockHeights(2500, 300);
    renderExpansion(10n ** 30n);
    openBreakdown();
    expect(breakdownRegion().tabIndex).toBe(0);
    cleanup();

    vi.restoreAllMocks();
    mockHeights(120, 120);
    renderExpansion(1202n);
    openBreakdown();
    expect(breakdownRegion().hasAttribute('tabindex')).toBe(false);
  });
});

describe('Base20Expansion Copy Formula', () => {
  it('copies the canonical plain-text formula and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard({ writeText });
    renderExpansion(1202n);

    fireEvent.click(copyButton());

    expect(await screen.findByText('Formula copied to the clipboard.')).toBeTruthy();
    expect(writeText).toHaveBeenCalledExactlyOnceWith('3 × 20² + 0 × 20¹ + 2 × 20⁰ = 1202');
  });

  it('reports success only once the clipboard has accepted the text', async () => {
    let accept!: () => void;
    mockClipboard({ writeText: vi.fn(() => new Promise<void>((resolve) => { accept = resolve; })) });
    renderExpansion(1202n);

    fireEvent.click(copyButton());
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.queryByText('Formula copied to the clipboard.')).toBeNull();

    await act(async () => accept());
    expect(await screen.findByText('Formula copied to the clipboard.')).toBeTruthy();
  });

  it('copies the largest number without grouping, ending with its exact value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard({ writeText });
    renderExpansion(10n ** 128n - 1n);

    fireEvent.click(copyButton());
    await screen.findByText('Formula copied to the clipboard.');

    const copied: string = writeText.mock.calls[0][0];
    expect(copied.split(' + ')).toHaveLength(99);
    expect(copied.startsWith('3 × 20⁹⁸ + ')).toBe(true);
    expect(copied.endsWith(` × 20⁰ = ${'9'.repeat(128)}`)).toBe(true);
    expect(copied).not.toMatch(/[,<>]/);
  });

  it('copies the formula of the digits shown now', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard({ writeText });
    const { rerender } = renderExpansion(1202n);
    rerender(<Harness value={20n} />);

    fireEvent.click(copyButton());
    await screen.findByText('Formula copied to the clipboard.');
    expect(writeText).toHaveBeenCalledExactlyOnceWith('1 × 20¹ + 0 × 20⁰ = 20');
  });

  it('reports a refused or failed write instead of success, without telling to copy by hand', async () => {
    mockClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) });
    renderExpansion(1202n);

    fireEvent.click(copyButton());

    expect(await screen.findByText('The formula could not be copied. Please try again.')).toBeTruthy();
    expect(screen.queryByText('Formula copied to the clipboard.')).toBeNull();
    expect(screen.queryByText(/select/i)).toBeNull();
  });

  it('reports a browser without the Clipboard API instead of success', async () => {
    mockClipboard(undefined);
    renderExpansion(1202n);

    fireEvent.click(copyButton());

    expect(await screen.findByText('This browser can’t copy to the clipboard here.')).toBeTruthy();
    expect(screen.queryByText('Formula copied to the clipboard.')).toBeNull();
    expect(screen.queryByText(/select/i)).toBeNull();
  });

  it('shows one message at a time, however often it is used', async () => {
    mockClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    renderExpansion(1202n);

    fireEvent.click(copyButton());
    await screen.findByText('Formula copied to the clipboard.');
    fireEvent.click(copyButton());
    await screen.findByText('Formula copied to the clipboard.');

    expect(screen.getAllByText('Formula copied to the clipboard.')).toHaveLength(1);
  });
});

describe('TierBadge', () => {
  it.each([
    [1, '1 tier · 20⁰', '1 tier, 20 to the power of 0'],
    [2, '2 tiers · 20⁰–20¹', '2 tiers, powers of 20 from 0 to 1'],
    [12, '12 tiers · 20⁰–20¹¹', '12 tiers, powers of 20 from 0 to 11'],
    [99, '99 tiers · 20⁰–20⁹⁸', '99 tiers, powers of 20 from 0 to 98'],
  ])('shows %i tiers with their range, and reads it in words', (tiers, shown, spoken) => {
    const { container } = render(<TierBadge tiers={tiers} />);

    expect(visibleText(container)).toBe(shown);
    expect(spokenText(container)).toBe(spoken);
  });
});
