// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import { prepareSvgCloneForExport } from '@utils/exportUtils';
import HomeView from './HomeView';

afterEach(cleanup);

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

  return { enter, renderedPlaceValues, numeralSvg };
};

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
  it('renders no glyphs while the input is empty', () => {
    const { enter, renderedPlaceValues } = renderHomeView();
    expect(renderedPlaceValues()).toEqual([]);
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

  it('offers Export exactly while there is a result to export', () => {
    const { enter } = renderHomeView();
    const exportButton = () => screen.queryByRole('button', { name: '📦 Export' });

    expect(exportButton()).toBeNull();
    enter('9'.repeat(500));
    expect(exportButton()).not.toBeNull();
    enter('12.5');
    expect(exportButton()).toBeNull();
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
});
