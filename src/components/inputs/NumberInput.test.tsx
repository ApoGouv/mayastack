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

/** The ids of the descriptions linked to the input through aria-describedby */
function descriptionIds(input: HTMLInputElement) {
  return (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
}

/** The validation message linked to the input through aria-describedby, or '' */
function validationMessage(input: HTMLInputElement) {
  return descriptionIds(input).includes('number-input-error')
    ? (document.getElementById('number-input-error')?.textContent ?? '')
    : '';
}

/** The significant-digit count linked to the input through aria-describedby, or null */
function digitCount(input: HTMLInputElement) {
  const count = document.getElementById('number-input-count');
  expect(descriptionIds(input).includes('number-input-count')).toBe(count !== null);
  return count?.textContent ?? null;
}

/**
 * Edits the field as the browser does when typing, deleting or pasting: the field gets
 * the new text and the caret (or selection), then an input event. The value is set past
 * React's own tracking, so React sees it as a change, as it does for a real edit.
 */
function editText(input: HTMLInputElement, text: string, selectionStart = text.length, selectionEnd = selectionStart) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
  input.setSelectionRange(selectionStart, selectionEnd);
  fireEvent.input(input);
}

/** Presses a key in the input; returns false when the input prevented its default action */
function press(input: HTMLInputElement, key: string, modifiers: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}) {
  return fireEvent.keyDown(input, { key, ...modifiers });
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

  // Changed deliberately in UI-05: the leading zeros of a valid integer are removed, which
  // keeps its value (before, "007" stayed as typed)
  it('removes the leading zeros of a valid integer, keeping its value', () => {
    const input = renderNumberInput();
    enterText(input, '007');
    expect(input.value).toBe('7');
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

describe('NumberInput editing without redundant leading zeros', () => {
  it('replaces the initial 0 with the first digit typed after it', () => {
    const input = renderNumberInput('0');
    editText(input, '05');
    expect(input.value).toBe('5');
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 1]);
    editText(input, '57');
    expect(input.value).toBe('57');
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2]);
  });

  it('keeps a single 0 when another 0 is typed', () => {
    const input = renderNumberInput('0');
    editText(input, '00');
    expect(input.value).toBe('0');
    expect(input.selectionStart).toBe(1);
  });

  it('keeps a digit typed before the initial 0 as text typed there', () => {
    const input = renderNumberInput('0');
    editText(input, '50', 1);
    expect(input.value).toBe('50');
    expect(input.selectionStart).toBe(1);
  });

  it('replaces selected text with what is typed', () => {
    const input = renderNumberInput('123');
    input.setSelectionRange(0, 3);
    editText(input, '9');
    expect(input.value).toBe('9');
    // A 0 typed over the selected leading digit of "120" leaves "20", caret before the 2
    editText(input, '120');
    editText(input, '020', 1);
    expect(input.value).toBe('20');
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 0]);
  });

  it('edits the middle of a value without moving the caret', () => {
    const input = renderNumberInput('57');
    editText(input, '537', 2);
    expect(input.value).toBe('537');
    expect(input.selectionStart).toBe(2);
    editText(input, '57', 1);
    expect(input.value).toBe('57');
    expect(input.selectionStart).toBe(1);
  });

  it('keeps the caret on the same digits when deleting the first digit leaves a leading zero', () => {
    const input = renderNumberInput('1052');
    editText(input, '052', 0);
    expect(input.value).toBe('52');
    expect(input.selectionStart).toBe(0);
    editText(input, '5052', 1);
    editText(input, '5002', 3);
    expect(input.value).toBe('5002');
    expect(input.selectionStart).toBe(3);
  });

  it('keeps a selection on the same digits', () => {
    const input = renderNumberInput('0');
    editText(input, '00123', 3, 5);
    expect(input.value).toBe('123');
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
  });

  it('removes the leading zeros of a pasted value, and keeps a pasted zero', () => {
    const input = renderNumberInput('0');
    editText(input, '007');
    expect(input.value).toBe('7');
    expect(input.selectionStart).toBe(1);
    editText(input, '000');
    expect(input.value).toBe('0');
    const maxDigits = '9'.repeat(500);
    editText(input, '000' + maxDigits);
    expect(input.value).toBe(maxDigits);
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('can be emptied while editing, without a message or a value', () => {
    const input = renderNumberInput('5');
    editText(input, '');
    expect(input.value).toBe('');
    expect(validationMessage(input)).toBe('');
    expect(digitCount(input)).toBeNull();
  });

  it.each([
    ['012a', 'Use digits'],
    ['-05', 'Negative numbers'],
    ['05.5', 'Decimal numbers'],
    ['0' + '9'.repeat(501), 'at most 500 digits'],
    ['0'.repeat(1001), 'at most 1000 characters'],
  ])('keeps the leading zeros of invalid text "%s", with its message', (text, message) => {
    const input = renderNumberInput('0');
    editText(input, text, 1);
    expect(input.value).toBe(text);
    expect(input.selectionStart).toBe(1);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage(input)).toContain(message);
  });

  it('keeps text with surrounding whitespace as it is', () => {
    const input = renderNumberInput('0');
    editText(input, ' 007');
    expect(input.value).toBe(' 007');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(digitCount(input)).toBe('1 significant digit');
  });
});

describe('NumberInput Up and Down arrow keys', () => {
  it('adds 1 with ArrowUp and subtracts 1 with ArrowDown, handling the key', () => {
    const input = renderNumberInput('41');
    expect(press(input, 'ArrowUp')).toBe(false);
    expect(input.value).toBe('42');
    expect(press(input, 'ArrowDown')).toBe(false);
    expect(press(input, 'ArrowDown')).toBe(false);
    expect(input.value).toBe('40');
    expect(digitCount(input)).toBe('2 significant digits');
  });

  it('crosses digit boundaries exactly', () => {
    const input = renderNumberInput('9');
    press(input, 'ArrowUp');
    expect(input.value).toBe('10');
    expect(digitCount(input)).toBe('2 significant digits');
    press(input, 'ArrowDown');
    expect(input.value).toBe('9');
    expect(digitCount(input)).toBe('1 significant digit');
  });

  it('keeps zero at zero', () => {
    const input = renderNumberInput('0');
    expect(press(input, 'ArrowDown')).toBe(false);
    expect(input.value).toBe('0');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('keeps the largest 500-digit value instead of going to 501 digits', () => {
    const maxDigits = '9'.repeat(500);
    const input = renderNumberInput(maxDigits);
    expect(press(input, 'ArrowUp')).toBe(false);
    expect(input.value).toBe(maxDigits);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(digitCount(input)).toBe('500 significant digits');
    press(input, 'ArrowDown');
    expect(input.value).toBe('9'.repeat(499) + '8');
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER', () => {
    const input = renderNumberInput('9007199254740992');
    press(input, 'ArrowUp');
    expect(input.value).toBe('9007199254740993');
    const hundredDigits = '1' + '0'.repeat(99);
    enterText(input, hundredDigits);
    press(input, 'ArrowDown');
    expect(input.value).toBe('9'.repeat(99));
  });

  it.each(['', '12.5', '-3', 'abc', '9'.repeat(501)])(
    'leaves "%s" and its message unchanged, and the key its usual effect',
    (text) => {
      const input = renderNumberInput(text);
      const message = validationMessage(input);
      expect(press(input, 'ArrowUp')).toBe(true);
      expect(press(input, 'ArrowDown')).toBe(true);
      expect(input.value).toBe(text);
      expect(validationMessage(input)).toBe(message);
    }
  );

  it.each([{ shiftKey: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }])(
    'leaves the arrow keys with modifiers %o to the browser',
    (modifiers) => {
      const input = renderNumberInput('41');
      expect(press(input, 'ArrowUp', modifiers)).toBe(true);
      expect(press(input, 'ArrowDown', modifiers)).toBe(true);
      expect(input.value).toBe('41');
    }
  );

  it.each([
    ['ArrowLeft'], ['ArrowRight'], ['Home'], ['End'], ['Backspace'], ['Delete'], ['Enter'], ['Escape'],
  ])('leaves %s to the browser', (key) => {
    const input = renderNumberInput('41');
    expect(press(input, key)).toBe(true);
    expect(input.value).toBe('41');
  });

  it.each(['a', 'c', 'v', 'x'])('leaves Ctrl+%s and ⌘+%s to the browser', (key) => {
    const input = renderNumberInput('41');
    expect(press(input, key, { ctrlKey: true })).toBe(true);
    expect(press(input, key, { metaKey: true })).toBe(true);
    expect(input.value).toBe('41');
  });

  it('describes the keys to assistive technology', () => {
    const input = renderNumberInput('0');
    expect(input.getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown');
    expect(descriptionIds(input)).toContain('number-input-hint');
    expect(document.getElementById('number-input-hint')?.textContent).toBe('Up and Down arrow keys add or subtract 1.');
  });
});

describe('NumberInput significant-digit count', () => {
  it.each([
    ['0', '1 significant digit'],
    ['7', '1 significant digit'],
    ['1000', '4 significant digits'],
    ['9007199254740993', '16 significant digits'],
    ['1' + '0'.repeat(499), '500 significant digits'],
    ['9'.repeat(500), '500 significant digits'],
  ])('counts "%s" as %s', (text, count) => {
    const input = renderNumberInput(text);
    expect(digitCount(input)).toBe(count);
  });

  it('counts the digits of a value typed with leading zeros, without them', () => {
    const input = renderNumberInput('0');
    enterText(input, '007');
    expect(digitCount(input)).toBe('1 significant digit');
    enterText(input, '0001000');
    expect(digitCount(input)).toBe('4 significant digits');
  });

  it.each(['', '   ', '12.5', '-3', '1e5', '9'.repeat(501), '0'.repeat(1001)])('shows no count for "%s"', (text) => {
    const input = renderNumberInput(text);
    expect(digitCount(input)).toBeNull();
  });

  it('is not a live region, and lists the error first when there is one', () => {
    const input = renderNumberInput('12');
    expect(document.getElementById('number-input-count')?.closest('[aria-live]')).toBeNull();
    expect(descriptionIds(input)).toEqual(['number-input-count', 'number-input-hint']);
    enterText(input, '12.5');
    expect(descriptionIds(input)).toEqual(['number-input-error', 'number-input-hint']);
  });
});

describe('NumberInput Clear', () => {
  const clearButton = () => screen.getByRole('button', { name: 'Clear' }) as HTMLButtonElement;

  it.each([
    ['a valid number', '123'],
    ['an invalid number', '12.5'],
    ['an empty field', ''],
    ['a 500-digit number', '9'.repeat(500)],
    ['an over-limit number', '9'.repeat(501)],
    ['zero', '0'],
  ])('resets %s to 0, keeping the focus on the button', (_, text) => {
    const input = renderNumberInput(text);
    const button = clearButton();
    button.focus();
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(input.value).toBe('0');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
    expect(digitCount(input)).toBe('1 significant digit');
    expect(document.activeElement).toBe(button);
  });

  it('is a native button, so Enter and Space activate it', () => {
    renderNumberInput('5');
    expect(clearButton().type).toBe('button');
    expect(clearButton().tagName).toBe('BUTTON');
  });
});
