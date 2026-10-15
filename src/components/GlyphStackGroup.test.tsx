import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GlyphStackGroup from './GlyphStackGroup';

// Base-20 digits of 123456789012345678901234567890 (computed independently)
const THIRTY_DIGIT = 123456789012345678901234567890n;
const THIRTY_DIGIT_DIGITS = [
  2, 18, 17, 7, 10, 5, 10, 3, 14, 18, 7, 4, 2, 14, 2, 1, 11, 15, 16, 0, 19, 14, 10,
];

/** Renders the group and returns the data-digit-* attributes of each digit stack */
const renderDigitAttributes = (digits: number[]) => {
  const markup = renderToStaticMarkup(
    <svg>
      <GlyphStackGroup
        digits={digits}
        centerX={50}
        totalHeight={digits.length * 80}
        heightPerGlyphStack={80}
      />
    </svg>
  );

  return [...markup.matchAll(/<g ([^>]*data-digit-index[^>]*)>/g)].map(([, attributes]) =>
    Object.fromEntries(
      [...attributes.matchAll(/data-digit-([a-z0-9-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name,
        value,
      ])
    )
  );
};

describe('GlyphStackGroup data-digit attributes', () => {
  it('keeps the existing attribute values for small numbers', () => {
    expect(renderDigitAttributes([6, 3])).toEqual([
      { index: '0', value: '6', exponent: '1', multiplier: '20', 'base10-value': '120' },
      { index: '1', value: '3', exponent: '0', multiplier: '1', 'base10-value': '3' },
    ]);
  });

  it('writes exact integer strings for large place values', () => {
    const attributes = renderDigitAttributes(THIRTY_DIGIT_DIGITS);

    expect(attributes).toHaveLength(THIRTY_DIGIT_DIGITS.length);
    for (const { multiplier, 'base10-value': base10Value } of attributes) {
      expect(multiplier).toMatch(/^\d+$/);
      expect(base10Value).toMatch(/^\d+$/);
    }
    expect(attributes[0].multiplier).toBe((20n ** 22n).toString());
    expect(attributes[0]['base10-value']).toBe('83886080000000000000000000000');
    expect(
      attributes.reduce((total, attribute) => total + BigInt(attribute['base10-value']), 0n)
    ).toBe(THIRTY_DIGIT);
  });
});
