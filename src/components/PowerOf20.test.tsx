// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { spokenText, visibleText } from '@/test/text';
import PowerOf20 from './PowerOf20';

afterEach(cleanup);

describe('PowerOf20', () => {
  it('shows a superscript exponent, hidden from screen readers', () => {
    const { container } = render(<p><PowerOf20 exponent={2} /></p>);
    const sup = container.querySelector('sup')!;

    expect(sup.textContent).toBe('2');
    expect(sup.getAttribute('aria-hidden')).toBe('true');
    expect(visibleText(container)).toBe('202');
  });

  it('is read as "20 to the power of n", announcing the exponent once', () => {
    const { container } = render(<p><PowerOf20 exponent={384} /></p>);

    expect(spokenText(container)).toBe('20 to the power of 384');
  });

  it('keeps the spoken words out of a selection to copy', () => {
    const { container } = render(<p><PowerOf20 exponent="n" /></p>);
    const words = container.querySelector('.sr-only')!;

    expect(words.textContent).toBe(' to the power of n');
    expect(words.className).toContain('select-none');
  });
});
