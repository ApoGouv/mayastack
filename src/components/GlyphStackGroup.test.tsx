import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { toBase20 } from '@utils/base20';
import GlyphStackGroup from './GlyphStackGroup';

// Base-20 digits of 123456789012345678901234567890 (computed independently)
const THIRTY_DIGIT = 123456789012345678901234567890n;
const THIRTY_DIGIT_DIGITS = [
  2, 18, 17, 7, 10, 5, 10, 3, 14, 18, 7, 4, 2, 14, 2, 1, 11, 15, 16, 0, 19, 14, 10,
];

/** Renders the group as static SVG markup */
const renderMarkup = (digits: number[]) =>
  renderToStaticMarkup(
    <svg>
      <GlyphStackGroup
        digits={digits}
        centerX={50}
        totalHeight={digits.length * 80}
        heightPerGlyphStack={80}
      />
    </svg>
  );

/** Renders the group and returns the data-digit-* attributes of each digit stack */
const renderDigitAttributes = (digits: number[]) =>
  [...renderMarkup(digits).matchAll(/<g ([^>]*data-digit-index[^>]*)>/g)].map(([, attributes]) =>
    Object.fromEntries(
      [...attributes.matchAll(/data-digit-([a-z0-9-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name,
        value,
      ])
    )
  );

describe('GlyphStackGroup data-digit attributes', () => {
  it('writes the index, digit and exponent of each digit stack', () => {
    expect(renderDigitAttributes([6, 3])).toEqual([
      { index: '0', value: '6', exponent: '1' },
      { index: '1', value: '3', exponent: '0' },
    ]);
  });

  it('describes large numbers exactly through each digit and its exponent', () => {
    const attributes = renderDigitAttributes(THIRTY_DIGIT_DIGITS);

    expect(attributes).toHaveLength(THIRTY_DIGIT_DIGITS.length);
    expect(attributes[0]).toEqual({ index: '0', value: '2', exponent: '22' });
    // Each place value is digit × 20^exponent; together they are exactly the number
    expect(
      attributes.reduce(
        (total, { value, exponent }) => total + BigInt(value) * 20n ** BigInt(exponent),
        0n
      )
    ).toBe(THIRTY_DIGIT);
  });
});

describe('GlyphStackGroup output size', () => {
  // 500 decimal digits, the number input limit, are 385 base-20 digits. The markup of a
  // digit stack must not grow with its place value: written-out place values made the
  // SVG of such a number grow quadratically, to about twice this budget.
  const BYTES_PER_DIGIT_STACK = 650;

  it('keeps the markup of the largest digit within a fixed budget at any position', () => {
    // 19 is drawn with the most shapes: three bars and four dots
    const digits = Array<number>(385).fill(19);
    expect(renderMarkup(digits).length).toBeLessThan(digits.length * BYTES_PER_DIGIT_STACK);
  });

  it('keeps the markup of the largest 500-digit number within the budget', () => {
    const digits = toBase20(10n ** 500n - 1n);
    expect(digits).toHaveLength(385);
    expect(renderMarkup(digits).length).toBeLessThan(digits.length * BYTES_PER_DIGIT_STACK);
  });
});
