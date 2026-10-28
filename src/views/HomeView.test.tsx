// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import { prepareSvgCloneForExport } from '@utils/exportUtils';
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
  const input = screen.getByLabelText('Number input') as HTMLInputElement;
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
  const clear = () => fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

  return { input, enter, press, clear, renderedPlaceValues, numeralSvg };
};

/** The whole text of a workspace card, from its heading */
const cardText = (heading: string) =>
  screen.getByRole('heading', { level: 2, name: heading }).parentElement!.textContent;

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
    expect(cardText('Base-20 Representation')).toContain('0 × 200');

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

  it('renders the largest integer within the 500-digit limit exactly', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    const maxDigits = '9'.repeat(500);
    enter(maxDigits);

    const placeValues = renderedPlaceValues();
    expect(placeValues).toHaveLength(385);
    expect(placeValues.reduce((sum, value) => sum + BigInt(value), 0n)).toBe(BigInt(maxDigits));
  });

  it('renders no glyphs for integers beyond the limits', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    for (const text of ['9'.repeat(501), '0'.repeat(1001)]) {
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
    enter('9'.repeat(500));

    const image = screen.getByRole('img', {
      name: 'Mayan numeral for a 500-digit number: 385 stacked base-20 digits, highest place value at the top',
    });
    const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
    expect(viewer.contains(image)).toBe(true);
    expect(viewer.style.maxHeight).toBe('480px');
  });

  // Changed deliberately in UI-05 (roadmap G §4.1): the initial 0 is a result, so Export is offered at once
  it('offers Export exactly while there is a result to export', () => {
    const { enter, clear } = renderHomeView();
    const exportButton = () => screen.queryByRole('button', { name: '📦 Export' });

    expect(exportButton()).not.toBeNull();
    enter('');
    expect(exportButton()).toBeNull();
    enter('9'.repeat(500));
    expect(exportButton()).not.toBeNull();
    enter('12.5');
    expect(exportButton()).toBeNull();
    clear();
    expect(exportButton()).not.toBeNull();
  });

  // Changed deliberately in UI-05: starts at 0 instead of empty, and Clear returns to 0
  it('keeps every workspace card in place for empty, invalid and valid input, without stale results', () => {
    const { input, enter, clear, renderedPlaceValues } = renderHomeView();
    const card = cardText;
    const expectNoResult = (viewer: string, base20: string) => {
      expect(card('Mayan Numeral')).toBe(`Mayan Numeral${viewer}`);
      expect(card('Base-20 Representation')).toBe(`Base-20 Representation${base20}`);
      expect(screen.getByRole('group', { name: 'SVG Display Settings' })).not.toBeNull();
      expect(renderedPlaceValues()).toEqual([]);
    };

    expect(input.value).toBe('0');
    expect(renderedPlaceValues()).toEqual(['0']);
    enter('');
    expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');
    enter('123');
    expect(card('Base-20 Representation')).toContain('6 × 201 • 3 × 200');
    expect(renderedPlaceValues()).toEqual(['120', '3']);
    // Invalid after a valid number: nothing of 123 is left
    enter('12.5');
    expectNoResult('Correct the number to see its Mayan numeral.', 'Correct the number to see it in base 20.');
    clear();
    expect(renderedPlaceValues()).toEqual(['0']);
    enter('123');
    enter('');
    expectNoResult('Enter a whole number to see its Mayan numeral.', 'Enter a whole number to see it in base 20.');
    fireEvent.click(screen.getByRole('radio', { name: 'Date' }));
    expectNoResult('Choose a date to see its Mayan numerals.', 'Choose a date to see it in base 20.');
  });

  it('exports the same complete SVG before and after zooming and scrolling', () => {
    const { enter, numeralSvg } = renderHomeView();
    enter('9'.repeat(500));
    const before = exportedMarkup(numeralSvg());

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    screen.getByRole('group', { name: 'Numeral viewer' }).scrollTop = 4000;
    const after = exportedMarkup(numeralSvg());

    expect(after).toBe(before);
    // The full logical drawing: 385 stacks of 80 units, 350 units wide
    expect(after).toContain('width="350" height="30800" viewBox="0 0 350 30800"');
    expect(after.match(/data-digit-index=/g)).toHaveLength(385);
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
    enter('9'.repeat(500));
    expect(await exportedSvgName()).toBe('mayan-numeral-number-9999999999...9999999999-500-digits.svg');
  });

  it('exports the complete numeral of the largest number under its short filename', async () => {
    const { enter, numeralSvg } = renderHomeView();
    enter('9'.repeat(500));

    await exportedSvgName();
    expect(numeralSvg().querySelectorAll('g[data-digit-index]')).toHaveLength(385);
    expect(exportedMarkup(numeralSvg())).toContain('width="350" height="30800" viewBox="0 0 350 30800"');
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
    enter('1'.repeat(500));
    const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
    viewer.scrollTop = 4000;

    enter('1'.repeat(250) + '2' + '1'.repeat(249));
    expect(viewer.scrollTop).toBe(0);
  });
});

describe('HomeView initial 0, Clear and arrow keys', () => {
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
    expect(screen.getByText('1 significant digit')).toBeTruthy();
    expect(await exportedSvgName()).toBe('mayan-numeral-number-0.svg');
    const markup = exportedMarkup(numeralSvg());
    expect(markup.match(/data-digit-index=/g)).toHaveLength(1);
    expect(markup).toContain('data-digit-value="0"');
  });

  it('rebuilds everything from 0 after Clear, with nothing left of a 500-digit number', async () => {
    const { input, enter, clear, renderedPlaceValues, numeralSvg } = renderHomeView();
    enter('9'.repeat(500));
    expect(renderedPlaceValues()).toHaveLength(385);

    clear();
    expect(input.value).toBe('0');
    expect(renderedPlaceValues()).toEqual(['0']);
    expect(screen.getByRole('img', { name: numeralName('0', 1) })).toBeTruthy();
    expect(cardText('Base-20 Representation')).toBe('Base-20 RepresentationNumber0 × 200');
    expect(screen.getByText('1 significant digit')).toBeTruthy();
    expect(await exportedSvgName()).toBe('mayan-numeral-number-0.svg');
    expect(exportedMarkup(numeralSvg()).match(/data-digit-index=/g)).toHaveLength(1);
  });

  it('resets empty and invalid input to 0 with Clear', () => {
    const { input, enter, clear, renderedPlaceValues } = renderHomeView();
    for (const text of ['', '12.5', '9'.repeat(501)]) {
      enter(text);
      expect(renderedPlaceValues()).toEqual([]);
      clear();
      expect(input.value).toBe('0');
      expect(renderedPlaceValues()).toEqual(['0']);
    }
  });

  it('updates the input, count, numeral, base-20 card and filename together with the arrow keys', async () => {
    const { input, press, renderedPlaceValues } = renderHomeView();
    for (let i = 0; i < 20; i++) press('ArrowUp');
    expect(input.value).toBe('20');
    expect(screen.getByText('2 significant digits')).toBeTruthy();
    expect(renderedPlaceValues()).toEqual(['20', '0']);
    expect(screen.getByRole('img', { name: numeralName('20', 2) })).toBeTruthy();
    expect(cardText('Base-20 Representation')).toContain('1 × 201 • 0 × 200');
    expect(await exportedSvgName()).toBe('mayan-numeral-number-20.svg');

    press('ArrowDown');
    expect(input.value).toBe('19');
    expect(screen.getByText('2 significant digits')).toBeTruthy();
    expect(renderedPlaceValues()).toEqual(['19']);
    expect(cardText('Base-20 Representation')).toContain('19 × 200');
    expect(await exportedSvgName()).toBe('mayan-numeral-number-19.svg');
  });

  it('keeps zero at zero and the largest value at 500 digits with the arrow keys', () => {
    const { input, enter, press, renderedPlaceValues } = renderHomeView();
    press('ArrowDown');
    expect(input.value).toBe('0');
    expect(renderedPlaceValues()).toEqual(['0']);

    const maxDigits = '9'.repeat(500);
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

  it('keeps the zoom level through Clear and the arrow keys', () => {
    const { enter, press, clear } = renderHomeView();
    enter('123');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const zoomed = zoomText();
    expect(zoomed).not.toBe('100%');
    press('ArrowUp');
    expect(zoomText()).toBe(zoomed);
    clear();
    expect(zoomText()).toBe(zoomed);
  });

  it('keeps the number through a switch to Date mode, where there is no Clear or count', () => {
    const { enter } = renderHomeView();
    enter('57');
    fireEvent.click(screen.getByRole('radio', { name: 'Date' }));
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    expect(screen.queryByText(/significant digit/)).toBeNull();
    expect(screen.queryByText('Up and Down arrow keys add or subtract 1.')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Number' }));
    expect((screen.getByLabelText('Number input') as HTMLInputElement).value).toBe('57');
    expect(screen.getByText('2 significant digits')).toBeTruthy();
  });
});
