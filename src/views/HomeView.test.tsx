// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import { MAX_DIGITS_IN_FILENAME, prepareSvgCloneForExport } from '@utils/exportUtils';
import { toBase20, toBase20Formula } from '@utils/base20';
import { spokenText, visibleText } from '@/test/text';
import HomeView from './HomeView';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderHomeView = () => {
  const { container } = render(
    <DisplaySettingsProvider>
      <HomeView />
    </DisplaySettingsProvider>
  );
  const input = screen.getByLabelText('Decimal integer') as HTMLInputElement;
  const enter = (text: string) => fireEvent.change(input, { target: { value: text } });
  /** The base-10 place value (digit × 20^exponent) of each rendered digit stack */
  const renderedPlaceValues = () =>
    [...container.querySelectorAll('svg.mep-svg g[data-digit-index]')].map((group) => {
      const digit = BigInt(group.getAttribute('data-digit-value') ?? '');
      const exponent = BigInt(group.getAttribute('data-digit-exponent') ?? '');
      return (digit * 20n ** exponent).toString();
    });

  /** The rendered numeral SVG, the source of SVG and PNG export */
  const numeralSvg = () => container.querySelector('svg.mep-svg') as SVGSVGElement;

  /** Presses a key in the number input, as the arrow keys are pressed */
  const press = (key: string) => fireEvent.keyDown(input, { key });
  const clear = () => fireEvent.click(screen.getByRole('button', { name: 'Clear input' }));
  const zero = () => fireEvent.click(screen.getByRole('button', { name: 'Zero' }));
  const step = (amount: string) => fireEvent.click(screen.getByRole('button', { name: amount }));

  return { input, enter, press, clear, zero, step, renderedPlaceValues, numeralSvg };
};

/** A workspace card, from its heading */
const card = (heading: string) => screen.getByRole('heading', { level: 2, name: heading }).parentElement!;

/** The whole text of a workspace card, from its heading */
const cardText = (heading: string) => card(heading).textContent;

/** What a screen reader reads in the base-20 card: exponents as "to the power of" */
const spokenBase20 = () => spokenText(card('Base-20 Representation'));

/** The Number-mode formula in the base-20 card, as a screen reader reads it */
const spokenFormula = () => spokenBase20().match(/Copy Formula(.*)Analytical breakdown$/)?.[1];

/** The export clone of an SVG at its logical size, serialized as an exported file would be */
const exportedMarkup = (svg: SVGSVGElement) => {
  const placeholder = document.createElement('div');
  const clone = prepareSvgCloneForExport(
    svg,
    Number(svg.getAttribute('width')),
    Number(svg.getAttribute('height')),
    placeholder
  );
  return new XMLSerializer().serializeToString(clone as SVGSVGElement);
};

describe('HomeView number mode', () => {
  // Changed deliberately in UI-05 (roadmap G §4.1): the input starts at 0 instead of empty
  it('starts at 0 with the zero glyph, and renders no glyphs while the input is emptied', () => {
    const { input, enter, renderedPlaceValues, numeralSvg } = renderHomeView();
    expect(input.value).toBe('0');
    expect(renderedPlaceValues()).toEqual(['0']);
    // The existing zero digit stack: one shell, no dots or bars
    const stack = numeralSvg().querySelector('g[data-digit-index]')!;
    expect(stack.getAttribute('data-digit-value')).toBe('0');
    expect(stack.getAttribute('data-digit-exponent')).toBe('0');
    expect(spokenFormula()).toBe('0 × 20 to the power of 0');

    enter('42');
    enter('');
    expect(renderedPlaceValues()).toEqual([]);
  });

  it('renders the glyphs of a valid integer', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    enter('123');
    expect(renderedPlaceValues()).toEqual(['120', '3']);
  });

  it('converts leading zeros to the same value', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    enter('007');
    expect(renderedPlaceValues()).toEqual(['7']);
  });

  it('renders no glyphs for invalid input instead of converting a different number', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    for (const text of ['12.5', '-3', '1e5', '12abc']) {
      enter(text);
      expect(renderedPlaceValues()).toEqual([]);
    }
  });

  it('renders very large integers exactly', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    enter('123456789012345678901234567890');

    // The rendered place values add up to exactly the entered number
    const total = renderedPlaceValues().reduce((sum, value) => sum + BigInt(value), 0n);
    expect(total).toBe(123456789012345678901234567890n);
  });

  it('renders the largest integer within the 128-digit limit exactly', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    const maxDigits = '9'.repeat(128);
    enter(maxDigits);

    const placeValues = renderedPlaceValues();
    expect(placeValues).toHaveLength(99);
    expect(placeValues.reduce((sum, value) => sum + BigInt(value), 0n)).toBe(BigInt(maxDigits));
  });

  it('renders no glyphs for integers beyond the limits', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    for (const text of ['9'.repeat(129), '0'.repeat(1001)]) {
      enter(text);
      expect(renderedPlaceValues()).toEqual([]);
    }
  });
});

describe('HomeView numeral viewport', () => {
  it('describes a short number in full as one image', () => {
    const { enter } = renderHomeView();
    enter('123');
    expect(
      screen.getByRole('img', {
        name: 'Mayan numeral for 123: 2 stacked base-20 digits, highest place value at the top',
      })
    ).toBeTruthy();
  });

  it('describes a single-digit number in the singular', () => {
    const { enter } = renderHomeView();
    enter('7');
    expect(
      screen.getByRole('img', {
        name: 'Mayan numeral for 7: 1 stacked base-20 digit, highest place value at the top',
      })
    ).toBeTruthy();
  });

  it('describes the largest number by its length, inside the bounded viewer', () => {
    const { enter } = renderHomeView();
    enter('9'.repeat(128));

    const image = screen.getByRole('img', {
      name: 'Mayan numeral for a 128-digit number: 99 stacked base-20 digits, highest place value at the top',
    });
    const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
    expect(viewer.contains(image)).toBe(true);
    expect(viewer.style.maxHeight).toBe('480px');
  });

  // Changed deliberately in UI-05 (roadmap G §4.1): the initial 0 is a result, so Export is offered at once
  it('offers Export exactly while there is a result to export', () => {
    const { enter, clear, zero } = renderHomeView();
    const exportButton = () => screen.queryByRole('button', { name: '📦 Export' });

    expect(exportButton()).not.toBeNull();
    enter('');
    expect(exportButton()).toBeNull();
    enter('9'.repeat(128));
    expect(exportButton()).not.toBeNull();
    enter('12.5');
    expect(exportButton()).toBeNull();
    zero();
    expect(exportButton()).not.toBeNull();
    clear();
    expect(exportButton()).toBeNull();
  });

  // Changed deliberately in UI-05: starts at 0 instead of empty. Changed in UI-06: Zero returns
  // to 0, and Clear empties the field
  it('keeps every workspace card in place for empty, invalid and valid input, without stale results', () => {
    const { input, enter, clear, zero, renderedPlaceValues } = renderHomeView();
    const expectNoResult = (viewer: string, base20: string) => {
      expect(cardText('Mayan Numeral')).toBe(`Mayan Numeral${viewer}`);
      expect(cardText('Base-20 Representation')).toBe(`Base-20 Representation${base20}`);
      expect(screen.getByRole('group', { name: 'SVG Display Settings' })).not.toBeNull();
      expect(renderedPlaceValues()).toEqual([]);
    };

    expect(input.value).toBe('0');
    expect(renderedPlaceValues()).toEqual(['0']);
    enter('');
    expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');
    enter('123');
    expect(spokenFormula()).toBe('6 × 20 to the power of 1 + 3 × 20 to the power of 0');
    expect(renderedPlaceValues()).toEqual(['120', '3']);
    // Invalid after a valid number: nothing of 123 is left
    enter('12.5');
    expectNoResult('Correct the number to see its Mayan numeral.', 'Correct the number to see it in base 20.');
    zero();
    expect(renderedPlaceValues()).toEqual(['0']);
    clear();
    expect(input.value).toBe('');
    expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');
    enter('123');
    enter('');
    expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');
    fireEvent.click(screen.getByRole('radio', { name: 'Date' }));
    expectNoResult('Choose a date to see its Mayan numerals.', 'Choose a date to see it in base 20.');
  });

  it('exports the same complete SVG before and after zooming and scrolling', () => {
    const { enter, numeralSvg } = renderHomeView();
    enter('9'.repeat(128));
    const before = exportedMarkup(numeralSvg());

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    screen.getByRole('group', { name: 'Numeral viewer' }).scrollTop = 4000;
    const after = exportedMarkup(numeralSvg());

    expect(after).toBe(before);
    // The full logical drawing: 99 stacks of 80 units, 350 units wide
    expect(after).toContain('width="350" height="7920" viewBox="0 0 350 7920"');
    expect(after.match(/data-digit-index=/g)).toHaveLength(99);
  });
});

describe('HomeView date mode', () => {
  it('describes the date numerals in the viewer', () => {
    renderHomeView();
    fireEvent.click(screen.getByRole('radio', { name: 'Date' }));
    fireEvent.click(screen.getByLabelText('Date input'));
    fireEvent.click(screen.getAllByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ })[0]);

    const image = screen.getByRole('img', { name: /^Mayan numerals for day 15, month \d{1,2} and year \d{4}$/ });
    expect(screen.getByRole('group', { name: 'Numeral viewer' }).contains(image)).toBe(true);
  });

  it('shows the base-20 representation of the day, month and year', () => {
    renderHomeView();
    fireEvent.click(screen.getByRole('radio', { name: 'Date' }));
    fireEvent.click(screen.getByLabelText('Date input'));
    fireEvent.click(screen.getAllByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ })[0]);

    // Day 15 is the single base-20 digit 15; month and year follow in their own groups
    for (const label of ['Day', 'Month', 'Year']) expect(screen.getByText(label)).toBeTruthy();
    const day = screen.getByText('Day').nextElementSibling as HTMLElement;
    expect(day.innerHTML).toBe('15 × 20<sup>0</sup>');
    expect(screen.queryByRole('region', { name: /in base 20, expanded form/ })).toBeNull();
  });

  // UI-07 changes Number mode only: Date mode keeps its expanded forms, "•" and tooltips
  it('keeps the date representation without the Number-mode expansion, badge or breakdown', () => {
    renderHomeView();
    fireEvent.click(screen.getByRole('radio', { name: 'Date' }));
    fireEvent.click(screen.getByLabelText('Date input'));
    fireEvent.click(screen.getAllByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ })[0]);

    // Every year from 400 to 7999 has three base-20 digits
    const year = screen.getByText('Year').nextElementSibling as HTMLElement;
    expect(year.innerHTML).toMatch(/^\d+ × 20<sup>2<\/sup> • \d+ × 20<sup>1<\/sup> • \d+ × 20<sup>0<\/sup>$/);
    for (const label of ['Day', 'Month', 'Year']) {
      expect((screen.getByText(label).nextElementSibling as HTMLElement).hasAttribute('data-tooltip-id')).toBe(true);
    }
    const base20 = card('Base-20 Representation');
    expect(base20.textContent).not.toMatch(/tiers?|Positional Sum Formula/);
    expect(screen.queryByRole('button', { name: 'Copy Formula' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Analytical breakdown' })).toBeNull();
  });
});

describe('HomeView base-20 expansion', () => {
  const badge = () => visibleText(card('Base-20 Representation')).match(/^Base-20 Representation(.*)Positional Sum Formula/)?.[1];
  const breakdownRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
  /** Each breakdown row's cells as a screen reader reads them: tier, multiplier ("20ⁿ"), digit, subtotal */
  const breakdownCells = () => breakdownRows().map((row) => [...row.children].map(spokenText));
  const toggle = () => screen.getByRole('button', { name: 'Analytical breakdown' });
  const chooseMode = (mode: 'Number (Decimal)' | 'Date') => fireEvent.click(screen.getByRole('radio', { name: mode }));

  it('marks the heading with a decorative icon, keeping its name', () => {
    renderHomeView();
    const heading = screen.getByRole('heading', { level: 2, name: 'Base-20 Representation' });

    expect(heading.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(heading.textContent!.trim()).toBe('Base-20 Representation');
  });

  it('shows the tier badge for the current number only', () => {
    const { enter } = renderHomeView();
    expect(badge()).toBe('1 tier · 20⁰');
    enter('20');
    expect(badge()).toBe('2 tiers · 20⁰–20¹');
    expect(spokenBase20()).toContain('2 tiers, powers of 20 from 0 to 1');
    enter('9'.repeat(128));
    expect(badge()).toBe('99 tiers · 20⁰–20⁹⁸');
    expect(spokenBase20()).toContain('99 tiers, powers of 20 from 0 to 98');

    for (const text of ['', '12.5', '9'.repeat(129)]) {
      enter(text);
      expect(cardText('Base-20 Representation')).not.toMatch(/tiers?/);
      expect(screen.queryByRole('button', { name: 'Copy Formula' })).toBeNull();
    }
  });

  it('shows the formula without the notation tooltip', () => {
    const { enter } = renderHomeView();
    enter('1202');
    expect(spokenFormula()).toBe('3 × 20 to the power of 2 + 0 × 20 to the power of 1 + 2 × 20 to the power of 0');
    expect(card('Base-20 Representation').querySelector('[data-tooltip-id]')).toBeNull();
  });

  it('keeps an open breakdown in step with every change to the number', () => {
    const { enter, step, zero } = renderHomeView();
    enter('1202');
    fireEvent.click(screen.getByRole('button', { name: 'Analytical breakdown' }));
    expect(breakdownCells()).toEqual([
      ['Tier 2', '20 to the power of 2', '3', '1,200'],
      ['Tier 1', '20 to the power of 1', '0', '0'],
      ['Tier 0', '20 to the power of 0', '2', '2'],
    ]);

    step('+400');
    expect(breakdownCells()).toEqual([
      ['Tier 2', '20 to the power of 2', '4', '1,600'],
      ['Tier 1', '20 to the power of 1', '0', '0'],
      ['Tier 0', '20 to the power of 0', '2', '2'],
    ]);
    zero();
    expect(breakdownCells()).toEqual([['Tier 0', '20 to the power of 0', '0', '0']]);
    // 30 nines: 24 tiers (the 128-digit table is checked in Base20Expansion.test.tsx)
    enter('9'.repeat(30));
    expect(breakdownRows()).toHaveLength(24);
  });

  it('keeps the breakdown open through Clear, invalid input and Date mode, showing it only for a valid number', () => {
    const { enter, clear } = renderHomeView();
    enter('1202');
    fireEvent.click(toggle());
    expect(breakdownRows()).toHaveLength(3);

    // Clear: no number, so no breakdown; the next number shows it open again
    clear();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Analytical breakdown' })).toBeNull();
    enter('20');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(breakdownCells()).toEqual([
      ['Tier 1', '20 to the power of 1', '1', '20'],
      ['Tier 0', '20 to the power of 0', '0', '0'],
    ]);

    // Invalid input, then a valid number
    enter('12.5');
    expect(screen.queryByRole('table')).toBeNull();
    enter('400');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(breakdownRows()).toHaveLength(3);

    // Date mode and back
    chooseMode('Date');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Analytical breakdown' })).toBeNull();
    chooseMode('Number (Decimal)');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(breakdownRows()).toHaveLength(3);
  });

  it('keeps a closed breakdown closed through the same changes', () => {
    const { enter, clear } = renderHomeView();
    enter('1202');
    clear();
    enter('20');
    enter('12.5');
    enter('400');
    chooseMode('Date');
    chooseMode('Number (Decimal)');

    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('stays closed when Clear or a switch to Date mode comes before the fade-out ends', () => {
    const { enter, clear } = renderHomeView();

    for (const interrupt of [clear, () => chooseMode('Date')]) {
      enter('1202');
      if (toggle().getAttribute('aria-expanded') === 'false') fireEvent.click(toggle());
      expect(screen.getByRole('table')).toBeTruthy();

      // Closed, still fading out, when the breakdown is removed
      fireEvent.click(toggle());
      expect(screen.getByRole('table')).toBeTruthy();
      interrupt();
      expect(screen.queryByRole('table')).toBeNull();

      chooseMode('Number (Decimal)');
      enter('1202');
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByRole('table')).toBeNull();
    }
  });

  it('copies the formula of the current number after a step, Zero and Random', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      const { input, enter, step, zero } = renderHomeView();
      const copyFormula = async () => {
        writeText.mockClear();
        fireEvent.click(screen.getByRole('button', { name: 'Copy Formula' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
        return writeText.mock.calls[0][0] as string;
      };

      enter('1202');
      step('+400');
      expect(await copyFormula()).toBe('4 × 20² + 0 × 20¹ + 2 × 20⁰ = 1602');
      zero();
      expect(await copyFormula()).toBe('0 × 20⁰ = 0');
      fireEvent.click(screen.getByRole('button', { name: 'Random number' }));
      expect(await copyFormula()).toBe(toBase20Formula(toBase20(BigInt(input.value))));
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });
});

describe('HomeView export filenames', () => {
  /** Exports an SVG through the Export menu and returns the name of the file downloaded */
  async function exportedSvgName() {
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    fireEvent.click(screen.getByRole('button', { name: '📦 Export' }));
    fireEvent.click(screen.getByRole('button', { name: /^Export SVG image/ }));
    await waitFor(() => expect(names).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '📦 Export' })); // close the menu
    vi.mocked(HTMLAnchorElement.prototype.click).mockRestore();
    return names[0];
  }

  it('names an export after the number, abbreviating only long numbers', async () => {
    const { enter } = renderHomeView();

    enter('123');
    expect(await exportedSvgName()).toBe('mayan-numeral-number-123.svg');
    enter('007');
    expect(await exportedSvgName()).toBe('mayan-numeral-number-7.svg');
    enter('9'.repeat(128));
    expect(await exportedSvgName()).toBe('mayan-numeral-number-9999999999...9999999999-128-digits.svg');
  });

  it('exports the complete numeral of the largest number under its short filename', async () => {
    const { enter, numeralSvg } = renderHomeView();
    enter('9'.repeat(128));

    await exportedSvgName();
    expect(numeralSvg().querySelectorAll('g[data-digit-index]')).toHaveLength(99);
    expect(exportedMarkup(numeralSvg())).toContain('width="350" height="7920" viewBox="0 0 350 7920"');
  });

  it('keeps naming date exports after the day, month and year', async () => {
    renderHomeView();
    fireEvent.click(screen.getByRole('radio', { name: 'Date' }));
    fireEvent.click(screen.getByLabelText('Date input'));
    fireEvent.click(screen.getAllByRole('gridcell', { name: /^Choose .* 15th, \d{4}$/ })[0]);

    const [, month, year] = (screen.getByLabelText('Date input') as HTMLInputElement).value.split('-').map(Number);
    expect(await exportedSvgName()).toBe(`mayan-numeral-date-15-${month}-${year}.svg`);
  });

  it('still returns the viewer to the top for a long number with the same short filename', () => {
    const { enter } = renderHomeView();
    // Same length, first 10 and last 10 digits, so the same export filename
    enter('1'.repeat(128));
    const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
    viewer.scrollTop = 4000;

    enter('1'.repeat(64) + '2' + '1'.repeat(63));
    expect(viewer.scrollTop).toBe(0);
  });
});

describe('HomeView initial 0, Zero, Clear and arrow keys', () => {
  const numeralName = (number: string, digits: number) =>
    `Mayan numeral for ${number}: ${digits} stacked base-20 ${digits === 1 ? 'digit' : 'digits'}, highest place value at the top`;
  const zoomText = () => screen.getByRole('group', { name: 'Zoom controls' }).textContent;

  /** The name of the SVG file the Export menu downloads */
  async function exportedSvgName() {
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    fireEvent.click(screen.getByRole('button', { name: '📦 Export' }));
    fireEvent.click(screen.getByRole('button', { name: /^Export SVG image/ }));
    await waitFor(() => expect(names).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '📦 Export' }));
    vi.mocked(HTMLAnchorElement.prototype.click).mockRestore();
    return names[0];
  }

  it('exports the initial 0 as its zero glyph, under the zero filename', async () => {
    const { numeralSvg } = renderHomeView();
    expect(screen.getByRole('img', { name: numeralName('0', 1) })).toBeTruthy();
    expect(screen.getByText('1 digit')).toBeTruthy();
    expect(await exportedSvgName()).toBe('mayan-numeral-number-0.svg');
    const markup = exportedMarkup(numeralSvg());
    expect(markup.match(/data-digit-index=/g)).toHaveLength(1);
    expect(markup).toContain('data-digit-value="0"');
  });

  // Changed deliberately in UI-06: Zero, not Clear, returns to 0
  it('rebuilds everything from 0 after Zero, with nothing left of a 128-digit number', async () => {
    const { input, enter, zero, renderedPlaceValues, numeralSvg } = renderHomeView();
    enter('9'.repeat(128));
    expect(renderedPlaceValues()).toHaveLength(99);

    zero();
    expect(input.value).toBe('0');
    expect(renderedPlaceValues()).toEqual(['0']);
    expect(screen.getByRole('img', { name: numeralName('0', 1) })).toBeTruthy();
    // Changed deliberately in UI-07: the tier badge, the "Positional Sum Formula" label, Copy
    // Formula and the collapsed breakdown, with nothing left of the 128-digit number
    expect(visibleText(card('Base-20 Representation'))).toBe(
      'Base-20 Representation1 tier · 20⁰Positional Sum FormulaCopy Formula0 × 200Analytical breakdown'
    );
    expect(spokenBase20()).toBe(
      'Base-20 Representation1 tier, 20 to the power of 0Positional Sum FormulaCopy Formula0 × 20 to the power of 0Analytical breakdown'
    );
    expect(screen.getByText('1 digit')).toBeTruthy();
    expect(await exportedSvgName()).toBe('mayan-numeral-number-0.svg');
    expect(exportedMarkup(numeralSvg()).match(/data-digit-index=/g)).toHaveLength(1);
  });

  it('resets empty and invalid input to 0 with Zero', () => {
    const { input, enter, zero, renderedPlaceValues } = renderHomeView();
    for (const text of ['', '12.5', '9'.repeat(129)]) {
      enter(text);
      expect(renderedPlaceValues()).toEqual([]);
      zero();
      expect(input.value).toBe('0');
      expect(renderedPlaceValues()).toEqual(['0']);
    }
  });

  // Changed deliberately in UI-06: Clear empties the field instead of setting it to 0
  it('empties zero, valid and invalid input with Clear, leaving no result rather than the zero glyph', () => {
    const { input, enter, clear, renderedPlaceValues } = renderHomeView();
    for (const text of ['0', '123', '12.5', '9'.repeat(129)]) {
      enter(text);
      clear();
      expect(input.value).toBe('');
      expect(renderedPlaceValues()).toEqual([]);
      expect(screen.queryByText(/^\d+ digits?$/)).toBeNull();
      expect(screen.queryByRole('button', { name: '📦 Export' })).toBeNull();
      expect(cardText('Base-20 Representation')).toBe('Base-20 RepresentationEnter a whole number to see it in base 20.');
    }
  });

  it('updates the input, count, numeral, base-20 card and filename together with the arrow keys', async () => {
    const { input, press, renderedPlaceValues } = renderHomeView();
    for (let i = 0; i < 20; i++) press('ArrowUp');
    expect(input.value).toBe('20');
    expect(screen.getByText('2 digits')).toBeTruthy();
    expect(renderedPlaceValues()).toEqual(['20', '0']);
    expect(screen.getByRole('img', { name: numeralName('20', 2) })).toBeTruthy();
    expect(spokenFormula()).toBe('1 × 20 to the power of 1 + 0 × 20 to the power of 0');
    expect(await exportedSvgName()).toBe('mayan-numeral-number-20.svg');

    press('ArrowDown');
    expect(input.value).toBe('19');
    expect(screen.getByText('2 digits')).toBeTruthy();
    expect(renderedPlaceValues()).toEqual(['19']);
    expect(spokenFormula()).toBe('19 × 20 to the power of 0');
    expect(await exportedSvgName()).toBe('mayan-numeral-number-19.svg');
  });

  it('keeps zero at zero and the largest value at 128 digits with the arrow keys', () => {
    const { input, enter, press, renderedPlaceValues } = renderHomeView();
    press('ArrowDown');
    expect(input.value).toBe('0');
    expect(renderedPlaceValues()).toEqual(['0']);

    const maxDigits = '9'.repeat(128);
    enter(maxDigits);
    press('ArrowUp');
    expect(input.value).toBe(maxDigits);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(renderedPlaceValues().reduce((sum, value) => sum + BigInt(value), 0n)).toBe(BigInt(maxDigits));
  });

  it('steps exactly beyond Number.MAX_SAFE_INTEGER', () => {
    const { input, enter, press, renderedPlaceValues } = renderHomeView();
    enter('9007199254740992');
    press('ArrowUp');
    expect(input.value).toBe('9007199254740993');
    expect(screen.getByRole('img', { name: numeralName('9007199254740993', 13) })).toBeTruthy();
    expect(renderedPlaceValues().reduce((sum, value) => sum + BigInt(value), 0n)).toBe(9007199254740993n);
  });

  it('leaves empty and invalid input unchanged with the arrow keys', () => {
    const { input, enter, press, renderedPlaceValues } = renderHomeView();
    for (const text of ['', '12.5']) {
      enter(text);
      press('ArrowUp');
      press('ArrowDown');
      expect(input.value).toBe(text);
      expect(renderedPlaceValues()).toEqual([]);
    }
  });

  it('keeps the zoom level through Zero, the quick steps, Random and the arrow keys', () => {
    const { enter, press, zero, step } = renderHomeView();
    enter('123');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const zoomed = zoomText();
    expect(zoomed).not.toBe('100%');
    press('ArrowUp');
    expect(zoomText()).toBe(zoomed);
    zero();
    expect(zoomText()).toBe(zoomed);
    step('+400');
    expect(zoomText()).toBe(zoomed);
    // A fixed random source: a 3-digit number, so the test stays quick
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = 2;
      return array;
    });
    fireEvent.click(screen.getByRole('button', { name: 'Random number' }));
    expect(screen.getByLabelText<HTMLInputElement>('Decimal integer').value).toBe('322');
    expect(zoomText()).toBe(zoomed);
  });

  it('keeps the number through a switch to Date mode, where there are no number actions or count', () => {
    const { enter } = renderHomeView();
    enter('57');
    fireEvent.click(screen.getByRole('radio', { name: 'Date' }));
    for (const name of ['Random number', 'Copy number', 'Clear input', '+1', '+5', '+20', '+400', 'Zero']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByText(/^\d+ digits?$/)).toBeNull();
    expect(screen.queryByText('Up and Down arrow keys add or subtract 1.')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Number (Decimal)' }));
    expect((screen.getByLabelText('Decimal integer') as HTMLInputElement).value).toBe('57');
    expect(screen.getByText('2 digits')).toBeTruthy();
  });
});

describe('HomeView quick steps and Random', () => {
  const numeralName = (number: string, digits: number) =>
    `Mayan numeral for ${number}: ${digits} stacked base-20 ${digits === 1 ? 'digit' : 'digits'}, highest place value at the top`;

  /** The name of the SVG file the Export menu downloads */
  async function exportedSvgName() {
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    fireEvent.click(screen.getByRole('button', { name: '📦 Export' }));
    fireEvent.click(screen.getByRole('button', { name: /^Export SVG image/ }));
    await waitFor(() => expect(names).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '📦 Export' }));
    vi.mocked(HTMLAnchorElement.prototype.click).mockRestore();
    return names[0];
  }

  it('updates the input, count, numeral, base-20 card and filename together with each step', async () => {
    const { input, step, renderedPlaceValues } = renderHomeView();
    step('+20');
    expect(input.value).toBe('20');
    expect(screen.getByText('2 digits')).toBeTruthy();
    expect(renderedPlaceValues()).toEqual(['20', '0']);
    expect(screen.getByRole('img', { name: numeralName('20', 2) })).toBeTruthy();
    expect(spokenFormula()).toBe('1 × 20 to the power of 1 + 0 × 20 to the power of 0');
    expect(await exportedSvgName()).toBe('mayan-numeral-number-20.svg');

    step('+400');
    step('+5');
    step('+1');
    expect(input.value).toBe('426');
    expect(renderedPlaceValues()).toEqual(['400', '20', '6']);
    expect(spokenFormula()).toBe('1 × 20 to the power of 2 + 1 × 20 to the power of 1 + 6 × 20 to the power of 0');
    expect(await exportedSvgName()).toBe('mayan-numeral-number-426.svg');
  });

  it('renders the largest value reached with a step, and goes no further', () => {
    const { input, enter, step, renderedPlaceValues } = renderHomeView();
    const max = BigInt('9'.repeat(128));
    enter((max - 400n).toString());
    step('+400');
    expect(input.value).toBe('9'.repeat(128));
    step('+1');
    expect(input.value).toBe('9'.repeat(128));
    expect(renderedPlaceValues()).toHaveLength(99);
    expect(renderedPlaceValues().reduce((sum, value) => sum + BigInt(value), 0n)).toBe(max);
  });

  it('leaves empty and invalid input unchanged with the steps', () => {
    const { input, enter, step, renderedPlaceValues } = renderHomeView();
    for (const text of ['', '12.5', '9'.repeat(129)]) {
      enter(text);
      step('+1');
      step('+400');
      expect(input.value).toBe(text);
      expect(renderedPlaceValues()).toEqual([]);
    }
  });

  it('renders and names a Random number like a typed one, from empty or invalid input too', async () => {
    const { input, enter, renderedPlaceValues } = renderHomeView();
    // A fixed random source, so the test always renders a 10-digit number (9 + 1, the longest);
    // the generator itself is tested in randomNumber.test.ts
    const draws = [9, 4, 7, 0, 9, 2, 5];
    for (const text of ['', '12.5']) {
      let i = 0;
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
        (array as Uint32Array)[0] = draws[i++ % draws.length];
        return array;
      });
      enter(text);
      fireEvent.click(screen.getByRole('button', { name: 'Random number' }));
      const generated = input.value;
      vi.mocked(crypto.getRandomValues).mockRestore();
      expect(generated).toMatch(/^[1-9]\d{9}$/);
      expect(renderedPlaceValues().reduce((sum, value) => sum + BigInt(value), 0n)).toBe(BigInt(generated));
      expect(screen.getByText(`${generated.length} ${generated.length === 1 ? 'digit' : 'digits'}`)).toBeTruthy();
      expect(screen.getByRole('status').textContent).toMatch(/^Random number generated, \d+ digits?\.$/);
      const name = await exportedSvgName();
      if (generated.length <= MAX_DIGITS_IN_FILENAME) expect(name).toBe(`mayan-numeral-number-${generated}.svg`);
      else expect(name).toBe(`mayan-numeral-number-${generated.slice(0, 10)}...${generated.slice(-10)}-${generated.length}-digits.svg`);
    }
  });
});
