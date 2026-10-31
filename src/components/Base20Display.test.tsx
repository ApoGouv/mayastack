// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toBase20 } from '@utils/base20';
import Base20Display from './Base20Display';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** The expanded-form box (the element carrying the tooltip) */
const expandedBox = (container: HTMLElement) => container.querySelector('[data-tooltip-id]') as HTMLElement;

/** happy-dom does no layout: makes every element report the given content and box heights */
function mockHeights(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
}

describe('Base20Display', () => {
  it('shows a short representation as plain text in the expanded form', () => {
    const { container } = render(<Base20Display label="Number" digits={[6, 3]} />);
    const box = expandedBox(container);

    expect(screen.getByText('Number')).toBeTruthy();
    expect(box.innerHTML).toBe('6 × 20<sup>1</sup> • 3 × 20<sup>0</sup>');
    expect(box.getAttribute('role')).toBeNull();
    expect(box.hasAttribute('tabindex')).toBe(false);
  });

  it('keeps the complete, exact representation of the largest 128-digit number', () => {
    const value = 10n ** 128n - 1n;
    const digits = toBase20(value);
    const { container } = render(<Base20Display label="Number" digits={digits} />);

    const terms = [...expandedBox(container).innerHTML.matchAll(/(\d+) × 20<sup>(\d+)<\/sup>/g)];
    expect(terms).toHaveLength(99);
    // Most significant term first, every exponent from 98 down to 0, summing to exactly the number
    expect(terms.map(([, , exponent]) => Number(exponent))).toEqual(digits.map((_, i) => 98 - i));
    expect(terms.reduce((sum, [, digit, exponent]) => sum + BigInt(digit) * 20n ** BigInt(exponent), 0n)).toBe(value);
  });

  it('caps the height of the expanded form so long representations scroll', () => {
    const { container } = render(<Base20Display label="Number" digits={toBase20(10n ** 128n - 1n)} />);
    const box = expandedBox(container);

    expect(box.className).toContain('max-h-64');
    expect(box.className).toContain('overflow-y-auto');
  });

  it('becomes a focusable, labelled region once its content overflows', () => {
    mockHeights(2500, 256);
    const { container } = render(<Base20Display label="Number" digits={toBase20(10n ** 128n - 1n)} />);

    const region = screen.getByRole('region', { name: 'Number in base 20, expanded form' });
    expect(region).toBe(expandedBox(container));
    expect(region.tabIndex).toBe(0);
  });

  it('opens the notation tooltip on hover, but not when the region is focused for scrolling', async () => {
    mockHeights(2500, 256);
    render(<Base20Display label="Number" digits={toBase20(10n ** 128n - 1n)} />);
    const region = screen.getByRole('region', { name: 'Number in base 20, expanded form' });

    region.focus();
    expect(document.activeElement).toBe(region);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(region);
    expect((await screen.findByRole('tooltip')).textContent).toContain('Notation: 3,3,2,3,');
  });

  it('stays plain text while its content fits', () => {
    mockHeights(74, 74);
    render(<Base20Display label="Day" digits={[15]} />);

    expect(screen.queryByRole('region')).toBeNull();
  });
});
