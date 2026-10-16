// @vitest-environment happy-dom
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import MayanRenderer from '@components/MayanRenderer';
import { toBase20 } from './base20';
import { prepareSvgCloneForExport } from './exportUtils';

afterEach(cleanup);

/** Renders the glyphs of a number, as HomeView does, and returns the SVG element */
const renderNumberSvg = (value: bigint) => {
  const { container } = render(
    createElement(
      DisplaySettingsProvider,
      null,
      createElement(MayanRenderer, {
        digitGroups: [toBase20(value)],
        heightPerGlyphStack: 80,
        widthPerGroup: 350,
      })
    )
  );
  return container.querySelector('svg') as SVGSVGElement;
};

describe('prepareSvgCloneForExport', () => {
  it('keeps every digit stack and its metadata for the largest 500-digit number', () => {
    const value = 10n ** 500n - 1n;
    const svg = renderNumberSvg(value);
    const placeholder = document.createElement('div');

    const clone = prepareSvgCloneForExport(svg, 700, 61600, placeholder);

    expect(clone).not.toBeNull();
    expect(clone?.getAttribute('width')).toBe('700');
    expect(clone?.getAttribute('height')).toBe('61600');

    const groups = [...(clone?.querySelectorAll('g[data-digit-index]') ?? [])];
    expect(groups).toHaveLength(385);
    // The exported digit stacks still describe exactly the original number
    expect(
      groups.reduce(
        (total, group) =>
          total +
          BigInt(group.getAttribute('data-digit-value') ?? '') *
            20n ** BigInt(group.getAttribute('data-digit-exponent') ?? ''),
        0n
      )
    ).toBe(value);
  });
});
