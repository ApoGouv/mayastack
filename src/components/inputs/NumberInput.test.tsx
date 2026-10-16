// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import NumberInput from './NumberInput';

afterEach(cleanup);

/** Renders NumberInput controlled by state, as HomeView does, and returns the input */
function renderNumberInput(initialValue = '') {
  function ControlledNumberInput() {
    const [value, setValue] = useState(initialValue);
    return <NumberInput value={value} onChange={setValue} />;
  }

  render(<ControlledNumberInput />);
  return screen.getByLabelText('Number input') as HTMLInputElement;
}

/** Typing and pasting both end in a change event carrying the new text */
function enterText(input: HTMLInputElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
}

/** The validation message linked to the input through aria-describedby, or '' */
function validationMessage(input: HTMLInputElement) {
  const messageId = input.getAttribute('aria-describedby');
  return messageId ? (document.getElementById(messageId)?.textContent ?? '') : '';
}

describe('NumberInput', () => {
  it('is a text input with a numeric keyboard hint, so long integers are not altered by the browser', () => {
    const input = renderNumberInput();
    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('numeric');
  });

  it('accepts a positive integer without a message', () => {
    const input = renderNumberInput();
    enterText(input, '2025');
    expect(input.value).toBe('2025');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
  });

  it('accepts zero', () => {
    const input = renderNumberInput();
    enterText(input, '0');
    expect(input.value).toBe('0');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('keeps leading zeros while editing', () => {
    const input = renderNumberInput();
    enterText(input, '007');
    expect(input.value).toBe('007');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('can be cleared without showing a message', () => {
    const input = renderNumberInput('42');
    enterText(input, '');
    expect(input.value).toBe('');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
  });

  it('flags a decimal value without turning 12.5 into 125', () => {
    const input = renderNumberInput();
    enterText(input, '12.5');
    expect(input.value).toBe('12.5');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage(input)).toContain('Decimal numbers');
  });

  it('flags a negative value without dropping the minus sign', () => {
    const input = renderNumberInput();
    enterText(input, '-3');
    expect(input.value).toBe('-3');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage(input)).toContain('Negative numbers');
  });

  it.each(['abc', '12abc', '1e5', '1,000'])('flags "%s" without stripping characters', (text) => {
    const input = renderNumberInput();
    enterText(input, text);
    expect(input.value).toBe(text);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage(input)).toContain('Use digits');
  });

  it('flags invalid text that replaces a valid value, as a paste does', () => {
    const input = renderNumberInput('42');
    enterText(input, '3.14');
    expect(input.value).toBe('3.14');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage(input)).toContain('Decimal numbers');
  });

  it('keeps a very large integer exactly as entered', () => {
    const input = renderNumberInput();
    const fourHundredDigits = '1234567890'.repeat(40);
    enterText(input, fourHundredDigits);
    expect(input.value).toBe(fourHundredDigits);
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('accepts an integer with the maximum number of digits without a message', () => {
    const input = renderNumberInput();
    enterText(input, '9'.repeat(500));
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
  });

  it('flags an integer with too many digits without shortening it', () => {
    const input = renderNumberInput();
    const tooManyDigits = '9'.repeat(501);
    enterText(input, tooManyDigits);
    expect(input.value).toBe(tooManyDigits);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage(input)).toContain('at most 500 digits');
  });

  it('flags over-long text without truncating it', () => {
    const input = renderNumberInput();
    const tooLong = '0'.repeat(1001);
    enterText(input, tooLong);
    expect(input.value).toBe(tooLong);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage(input)).toContain('at most 1000 characters');
  });

  it('removes the too-many-digits message once the input is shortened', () => {
    const input = renderNumberInput();
    enterText(input, '9'.repeat(501));
    expect(validationMessage(input)).toContain('at most 500 digits');

    enterText(input, '9'.repeat(500));
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
  });

  it('removes the message once the input is corrected', () => {
    const input = renderNumberInput();
    enterText(input, '12.5');
    expect(validationMessage(input)).toContain('Decimal numbers');

    enterText(input, '125');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
  });

  it('keeps an empty live region in the page, so screen readers announce new messages', () => {
    renderNumberInput();
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent).toBe('');
  });
});
