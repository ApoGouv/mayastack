// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
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

  return { enter, renderedPlaceValues };
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
