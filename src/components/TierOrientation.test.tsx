// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { spokenText, visibleText } from '@/test/text';
import TierOrientation from './TierOrientation';

afterEach(cleanup);

describe('TierOrientation', () => {
  it.each([
    [1, '1 tier · 20⁰', 'One tier, 20 to the power of 0'],
    [2, 'Top: 20¹ ↓ Bottom: 20⁰', 'Top tier 20 to the power of 1, down to the bottom tier, 20 to the power of 0'],
    [3, 'Top: 20² ↓ Bottom: 20⁰', 'Top tier 20 to the power of 2, down to the bottom tier, 20 to the power of 0'],
    [12, 'Top: 20¹¹ ↓ Bottom: 20⁰', 'Top tier 20 to the power of 11, down to the bottom tier, 20 to the power of 0'],
    [99, 'Top: 20⁹⁸ ↓ Bottom: 20⁰', 'Top tier 20 to the power of 98, down to the bottom tier, 20 to the power of 0'],
  ])('shows %i tiers from the top tier down, and reads it in words', (tiers, shown, spoken) => {
    const { container } = render(<TierOrientation tiers={tiers} />);

    expect(visibleText(container)).toBe(shown);
    expect(spokenText(container)).toBe(spoken);
  });

  it('hides the visible text from assistive technology and is not a live region', () => {
    const { container } = render(<TierOrientation tiers={3} />);
    const indicator = container.firstElementChild as HTMLElement;
    const [shown, spoken] = [...indicator.children] as HTMLElement[];

    expect(shown.getAttribute('aria-hidden')).toBe('true');
    expect(spoken.className).toBe('sr-only');
    expect(spoken.hasAttribute('aria-hidden')).toBe(false);
    for (const el of [indicator, ...indicator.querySelectorAll('*')]) {
      expect(el.hasAttribute('aria-live')).toBe(false);
      expect(el.hasAttribute('role')).toBe(false);
    }
    // Never wraps within itself: the header cluster moves it under the heading instead
    expect(indicator.className.split(' ')).toContain('whitespace-nowrap');
  });

  it('refuses a numeral without tiers instead of showing a power it does not have', () => {
    expect(() => render(<TierOrientation tiers={0} />)).toThrow(RangeError);
  });
});
