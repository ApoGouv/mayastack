// @vitest-environment happy-dom
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateRandomNumberText } from '@utils/randomNumber';
import NumberInput from './NumberInput';

// The real generator unless a test chooses its result
vi.mock('@utils/randomNumber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@utils/randomNumber')>();
  return { ...actual, generateRandomNumberText: vi.fn(actual.generateRandomNumberText) };
});

afterEach(() => {
  cleanup();
  act(() => toast.remove());
  vi.mocked(generateRandomNumberText).mockClear();
});

/** Renders NumberInput controlled by state, as HomeView does, and returns the input */
function renderNumberInput(initialValue = '') {
  function ControlledNumberInput() {
    const [value, setValue] = useState(initialValue);
    return <NumberInput value={value} onChange={setValue} />;
  }

  render(<ControlledNumberInput />);
  return screen.getByLabelText('Decimal integer') as HTMLInputElement;
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
    const hundredDigits = '1234567890'.repeat(10);
    enterText(input, hundredDigits);
    expect(input.value).toBe(hundredDigits);
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('accepts an integer with the maximum number of digits without a message', () => {
    const input = renderNumberInput();
    enterText(input, '9'.repeat(128));
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
  });

  it('flags an integer with too many digits without shortening it', () => {
    const input = renderNumberInput();
    const tooManyDigits = '9'.repeat(129);
    enterText(input, tooManyDigits);
    expect(input.value).toBe(tooManyDigits);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage(input)).toContain('at most 128 digits');
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
    enterText(input, '9'.repeat(129));
    expect(validationMessage(input)).toContain('at most 128 digits');

    enterText(input, '9'.repeat(128));
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
    const maxDigits = '9'.repeat(128);
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
    ['0' + '9'.repeat(129), 'at most 128 digits'],
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
    expect(digitCount(input)).toBe('1 digit');
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
    expect(digitCount(input)).toBe('2 digits');
  });

  it('crosses digit boundaries exactly', () => {
    const input = renderNumberInput('9');
    press(input, 'ArrowUp');
    expect(input.value).toBe('10');
    expect(digitCount(input)).toBe('2 digits');
    press(input, 'ArrowDown');
    expect(input.value).toBe('9');
    expect(digitCount(input)).toBe('1 digit');
  });

  it('keeps zero at zero', () => {
    const input = renderNumberInput('0');
    expect(press(input, 'ArrowDown')).toBe(false);
    expect(input.value).toBe('0');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('keeps the largest 128-digit value instead of going to 129 digits', () => {
    const maxDigits = '9'.repeat(128);
    const input = renderNumberInput(maxDigits);
    expect(press(input, 'ArrowUp')).toBe(false);
    expect(input.value).toBe(maxDigits);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(digitCount(input)).toBe('128 digits');
    press(input, 'ArrowDown');
    expect(input.value).toBe('9'.repeat(127) + '8');
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

  it.each(['', '12.5', '-3', 'abc', '9'.repeat(129)])(
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

  // Changed in UI-06: the hint is no longer visible text; pointer users get the field's title
  it('keeps the hint visually hidden, with a title on the field and its visible label as its name', () => {
    const input = renderNumberInput('0');
    expect(document.getElementById('number-input-hint')?.classList.contains('sr-only')).toBe(true);
    expect(input.title).toBe('Enter a decimal integer. Use ↑/↓ to change by 1.');
    expect(screen.getByLabelText('Decimal integer')).toBe(input);
  });

  it('has the line-strong boundary while valid or empty, and the red border while invalid', () => {
    const input = renderNumberInput('0');
    expect(input.classList.contains('border-line-strong')).toBe(true);
    enterText(input, '');
    expect(input.classList.contains('border-line-strong')).toBe(true);
    enterText(input, '12.5');
    expect(input.classList.contains('border-danger')).toBe(true);
    expect(input.classList.contains('border-line-strong')).toBe(false);
  });
});

describe('NumberInput significant-digit count', () => {
  it.each([
    ['0', '1 digit'],
    ['7', '1 digit'],
    ['1000', '4 digits'],
    ['9007199254740993', '16 digits'],
    // 2^256 and a googol
    [(2n ** 256n).toString(), '78 digits'],
    ['1' + '0'.repeat(100), '101 digits'],
    ['1' + '0'.repeat(127), '128 digits'],
    ['9'.repeat(128), '128 digits'],
  ])('counts "%s" as %s', (text, count) => {
    const input = renderNumberInput(text);
    expect(digitCount(input)).toBe(count);
  });

  it('counts the digits of a value typed with leading zeros, without them', () => {
    const input = renderNumberInput('0');
    enterText(input, '007');
    expect(digitCount(input)).toBe('1 digit');
    enterText(input, '0001000');
    expect(digitCount(input)).toBe('4 digits');
  });

  it.each(['', '   ', '12.5', '-3', '1e5', '9'.repeat(129), '0'.repeat(1001)])('shows no count for "%s"', (text) => {
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

describe('NumberInput label and in-field actions', () => {
  it('is labelled "Decimal integer" by its visible label', () => {
    const input = renderNumberInput('0');
    const label = document.querySelector('label[for="number-input"]')!;
    expect(label.textContent).toBe('Decimal integer');
    expect(label.classList.contains('sr-only')).toBe(false);
    expect(input.hasAttribute('aria-label')).toBe(false);
  });

  it('names the icon-only buttons, with their icons hidden, as native buttons in reading order', () => {
    renderNumberInput('0');
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(names).toEqual(['Random number', 'Copy number', 'Clear input', '+1', '+5', '+20', '+400', 'Zero']);
    for (const name of ['Random number', 'Copy number', 'Clear input']) {
      const button = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(button.type).toBe('button');
      // A native title for pointer users, the same as the accessible name
      expect(button.title).toBe(name);
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    }
  });
});

describe('NumberInput Clear and Zero', () => {
  const clearButton = () => screen.getByRole('button', { name: 'Clear input' }) as HTMLButtonElement;
  const zeroButton = () => screen.getByRole('button', { name: 'Zero' }) as HTMLButtonElement;
  const states = [
    ['zero', '0'],
    ['a valid number', '123'],
    ['a 128-digit number', '9'.repeat(128)],
    ['text with surrounding whitespace', ' 7 '],
    ['an invalid number', '12.5'],
    ['an over-limit number', '9'.repeat(129)],
    ['over-long text', '0'.repeat(1001)],
    ['an empty field', ''],
  ];

  // Changed deliberately in UI-06: Clear empties the field instead of setting it to 0, which is now Zero
  it.each(states)('empties %s with Clear, keeping the focus on the button', (_, text) => {
    const input = renderNumberInput(text);
    const button = clearButton();
    button.focus();
    fireEvent.click(button);
    expect(input.value).toBe('');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
    expect(digitCount(input)).toBeNull();
    expect(descriptionIds(input)).toEqual(['number-input-hint']);
    expect(document.activeElement).toBe(button);
  });

  it.each(states)('sets %s to 0 with Zero, keeping the focus on the button', (_, text) => {
    const input = renderNumberInput(text);
    const button = zeroButton();
    button.focus();
    fireEvent.click(button);
    expect(input.value).toBe('0');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(validationMessage(input)).toBe('');
    expect(digitCount(input)).toBe('1 digit');
    expect(descriptionIds(input)).toEqual(['number-input-count', 'number-input-hint']);
    expect(document.activeElement).toBe(button);
  });

  it('keeps Clear and Zero available in every state, as plain native buttons', () => {
    renderNumberInput('');
    for (const button of [clearButton(), zeroButton()]) {
      expect(button.type).toBe('button');
      expect(button.disabled).toBe(false);
      expect(button.hasAttribute('aria-disabled')).toBe(false);
    }
  });

  it('tells empty and zero apart: Clear then Zero, and back', () => {
    const input = renderNumberInput('0');
    fireEvent.click(clearButton());
    expect(input.value).toBe('');
    expect(digitCount(input)).toBeNull();
    fireEvent.click(zeroButton());
    expect(input.value).toBe('0');
    expect(digitCount(input)).toBe('1 digit');
  });
});

/** Whether a button is marked unavailable */
const blocked = (button: HTMLElement) => button.getAttribute('aria-disabled') === 'true';

/** The text of the descriptions linked to an element through aria-describedby */
const description = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent).join(' ');

const UNAVAILABLE_REASON = 'Enter a whole number to copy it or use the steps.';

describe('NumberInput quick steps', () => {
  const step = (amount: string) => screen.getByRole('button', { name: amount }) as HTMLButtonElement;

  it.each([['+1', '42'], ['+5', '46'], ['+20', '61'], ['+400', '441']])('adds exactly %s', (amount, result) => {
    const input = renderNumberInput('41');
    fireEvent.click(step(amount));
    expect(input.value).toBe(result);
  });

  it('groups the steps under their visible label, with the concept titles', () => {
    renderNumberInput('0');
    const group = screen.getByRole('group', { name: 'Steps' });
    expect([...group.querySelectorAll('button')].map((b) => [b.textContent, b.title])).toEqual([
      ['+1', '+1'], ['+5', '+5 (1 Bar)'], ['+20', '+20 (Tier ×1)'], ['+400', '+400 (Tier ×2)'],
    ]);
    expect(group.contains(screen.getByRole('button', { name: 'Zero' }))).toBe(false);
    // Zero's title names the glyph it shows, without changing its accessible name
    expect(screen.getByRole('button', { name: 'Zero' }).title).toBe('0 (Shell)');
  });

  it('adds up exactly from 0 across base-20 place values, keeping the focus', () => {
    const input = renderNumberInput('0');
    const button = step('+20');
    button.focus();
    for (let i = 0; i < 20; i++) fireEvent.click(button);
    expect(input.value).toBe('400');
    expect(document.activeElement).toBe(button);
    fireEvent.click(step('+400'));
    fireEvent.click(step('+5'));
    fireEvent.click(step('+1'));
    expect(input.value).toBe('806');
    expect(digitCount(input)).toBe('3 digits');
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER', () => {
    const input = renderNumberInput('9007199254740992');
    fireEvent.click(step('+1'));
    expect(input.value).toBe('9007199254740993');
    enterText(input, '9'.repeat(100));
    fireEvent.click(step('+400'));
    expect(input.value).toBe('1' + '0'.repeat(97) + '399');
  });

  it('gives canonical text for text with surrounding whitespace, as the arrow keys do', () => {
    const input = renderNumberInput(' 7 ');
    fireEvent.click(step('+20'));
    expect(input.value).toBe('27');
  });

  it.each(['', '   ', '12.5', '-3', 'abc', '9'.repeat(129), '0'.repeat(1001)])(
    'leaves "%s" unchanged, with every step unavailable and the reason linked',
    (text) => {
      const input = renderNumberInput(text);
      const message = validationMessage(input);
      for (const amount of ['+1', '+5', '+20', '+400']) {
        const button = step(amount);
        expect(blocked(button)).toBe(true);
        expect(button.disabled).toBe(false);
        expect(description(button)).toBe(UNAVAILABLE_REASON);
        fireEvent.click(button);
      }
      expect(input.value).toBe(text);
      expect(validationMessage(input)).toBe(message);
    }
  );

  it('makes available only the steps that stay within 128 digits, landing exactly on the largest value', () => {
    const max = BigInt('9'.repeat(128));
    const input = renderNumberInput((max - 5n).toString());
    expect(['+1', '+5', '+20', '+400'].map((amount) => blocked(step(amount)))).toEqual([false, false, true, true]);
    const reason = 'Steps that would go past the 128-digit maximum are unavailable.';
    expect(description(step('+20'))).toBe(reason);
    expect(step('+5').hasAttribute('aria-describedby')).toBe(false);

    // A step that would go past the maximum does nothing, instead of stopping at it
    const button = step('+400');
    button.focus();
    fireEvent.click(button);
    expect(input.value).toBe((max - 5n).toString());
    expect(document.activeElement).toBe(button);

    fireEvent.click(step('+5'));
    expect(input.value).toBe('9'.repeat(128));
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(['+1', '+5', '+20', '+400'].map((amount) => blocked(step(amount)))).toEqual([true, true, true, true]);
    expect(description(step('+1'))).toBe(reason);
  });

  it('shows no reason while every step is available', () => {
    renderNumberInput('41');
    expect(screen.queryByText(/are unavailable|use the steps/)).toBeNull();
    for (const amount of ['+1', '+5', '+20', '+400']) expect(blocked(step(amount))).toBe(false);
  });

  it('leaves the Up and Down arrow keys at 1', () => {
    const input = renderNumberInput('41');
    fireEvent.click(step('+20'));
    press(input, 'ArrowUp');
    expect(input.value).toBe('62');
    press(input, 'ArrowDown');
    press(input, 'ArrowDown');
    expect(input.value).toBe('60');
  });
});

describe('NumberInput Random', () => {
  const randomButton = () => screen.getByRole('button', { name: 'Random number' }) as HTMLButtonElement;
  const status = () => screen.getByRole('status');

  it.each(['0', '123', '', '   ', '12.5', '9'.repeat(129), '0'.repeat(1001)])(
    'replaces "%s" with the generated number, keeping the focus on the button',
    (text) => {
      vi.mocked(generateRandomNumberText).mockReturnValueOnce('8000400019');
      const input = renderNumberInput(text);
      const button = randomButton();
      button.focus();
      fireEvent.click(button);
      expect(input.value).toBe('8000400019');
      expect(input.getAttribute('aria-invalid')).toBe('false');
      expect(validationMessage(input)).toBe('');
      expect(digitCount(input)).toBe('10 digits');
      expect(document.activeElement).toBe(button);
    }
  );

  it('generates valid positive integers of 1 to 10 digits, counted exactly', () => {
    const input = renderNumberInput('0');
    for (let i = 0; i < 20; i++) {
      fireEvent.click(randomButton());
      expect(input.value).toMatch(/^[1-9]\d{0,9}$/);
      expect(input.getAttribute('aria-invalid')).toBe('false');
      expect(digitCount(input)).toBe(`${input.value.length} ${input.value.length === 1 ? 'digit' : 'digits'}`);
    }
  });

  it('announces the digit count politely, without the number', () => {
    const number = '1234567890'.repeat(23) + '1234567';
    vi.mocked(generateRandomNumberText).mockReturnValueOnce(number).mockReturnValueOnce('7');
    renderNumberInput('0');
    expect(status().textContent).toBe('');
    expect(status().classList.contains('sr-only')).toBe(true);

    fireEvent.click(randomButton());
    expect(status().textContent).toBe('Random number generated, 237 digits.');
    expect(status().textContent).not.toContain('1234567');
    fireEvent.click(randomButton());
    expect(status().textContent).toBe('Random number generated, 1 digit.');
  });

  it('announces a repeated message again, as a new node', () => {
    vi.mocked(generateRandomNumberText).mockReturnValueOnce('12').mockReturnValueOnce('34');
    renderNumberInput('0');
    fireEvent.click(randomButton());
    const first = status().firstElementChild;
    fireEvent.click(randomButton());
    expect(status().textContent).toBe('Random number generated, 2 digits.');
    expect(status().firstElementChild).not.toBe(first);
  });

  it('drops the announcement once the number is changed in any way', () => {
    vi.mocked(generateRandomNumberText).mockReturnValue('12');
    const input = renderNumberInput('0');
    for (const change of [
      () => enterText(input, '125'),
      () => press(input, 'ArrowUp'),
      () => fireEvent.click(screen.getByRole('button', { name: '+5' })),
      () => fireEvent.click(screen.getByRole('button', { name: 'Clear input' })),
      () => fireEvent.click(screen.getByRole('button', { name: 'Zero' })),
    ]) {
      fireEvent.click(randomButton());
      expect(status().textContent).not.toBe('');
      change();
      expect(status().textContent).toBe('');
    }
    vi.mocked(generateRandomNumberText).mockReset();
  });

  it.each([
    ['the arrow keys', (input: HTMLInputElement) => { press(input, 'ArrowUp'); press(input, 'ArrowDown'); }],
    ['typing', (input: HTMLInputElement) => { enterText(input, '123'); enterText(input, '12'); }],
    ['Clear and typing', (input: HTMLInputElement) => { fireEvent.click(screen.getByRole('button', { name: 'Clear input' })); enterText(input, '12'); }],
    ['Zero and a step', (input: HTMLInputElement) => {
      vi.mocked(generateRandomNumberText).mockReturnValueOnce('5');
      fireEvent.click(randomButton());
      fireEvent.click(screen.getByRole('button', { name: 'Zero' }));
      fireEvent.click(screen.getByRole('button', { name: '+5' }));
      expect(input.value).toBe('5');
    }],
  ])('does not announce it again when edits with %s bring back the generated number', (_, edit) => {
    vi.mocked(generateRandomNumberText).mockReturnValueOnce('12');
    const input = renderNumberInput('0');
    fireEvent.click(randomButton());
    expect(status().textContent).not.toBe('');
    edit(input);
    expect(status().textContent).toBe('');
    expect(status().children).toHaveLength(0);
  });
});

describe('NumberInput Copy', () => {
  const copyButton = () => screen.getByRole('button', { name: 'Copy number' }) as HTMLButtonElement;

  /** Gives navigator a clipboard (or none), as the browser would */
  function mockClipboard(clipboard: Partial<Clipboard> | undefined) {
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  }

  afterEach(() => {
    delete (navigator as { clipboard?: unknown }).clipboard;
  });

  /** Renders the input with the app's toasts, which report the result of copying */
  function renderWithToasts(value: string) {
    render(<Toaster />);
    return renderNumberInput(value);
  }

  it.each([
    ['8000400019', '8000400019'],
    ['9'.repeat(128), '9'.repeat(128)],
    ['0', '0'],
    [' 7 ', '7'],
  ])('copies "%s" as the canonical text "%s" and says so, keeping the number and the focus', async (text, copied) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard({ writeText });
    const input = renderWithToasts(text);
    const button = copyButton();
    expect(blocked(button)).toBe(false);
    expect(button.hasAttribute('aria-describedby')).toBe(false);
    button.focus();
    fireEvent.click(button);

    expect(await screen.findByText('Number copied to the clipboard.')).toBeTruthy();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(copied);
    expect(input.value).toBe(text);
    expect(document.activeElement).toBe(button);
  });

  it('reports a failed write instead of success', async () => {
    mockClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) });
    renderWithToasts('42');
    fireEvent.click(copyButton());
    expect(await screen.findByText('The number could not be copied. Select it and copy it with Ctrl+C or ⌘+C.')).toBeTruthy();
    expect(screen.queryByText('Number copied to the clipboard.')).toBeNull();
  });

  it('reports a browser without the Clipboard API instead of success', async () => {
    mockClipboard(undefined);
    renderWithToasts('42');
    fireEvent.click(copyButton());
    expect(await screen.findByText(/^This browser can’t copy to the clipboard here\./)).toBeTruthy();
    expect(screen.queryByText('Number copied to the clipboard.')).toBeNull();
  });

  it('shows one copy message at a time', async () => {
    mockClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    renderWithToasts('42');
    fireEvent.click(copyButton());
    await screen.findByText('Number copied to the clipboard.');
    fireEvent.click(copyButton());
    await screen.findByText('Number copied to the clipboard.');
    expect(screen.getAllByText('Number copied to the clipboard.')).toHaveLength(1);
  });

  it.each(['', '   ', '12.5', '-3', '9'.repeat(129), '0'.repeat(1001)])(
    'is unavailable for "%s", with the reason linked, and copies nothing',
    async (text) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      mockClipboard({ writeText });
      const input = renderWithToasts(text);
      const button = copyButton();
      expect(blocked(button)).toBe(true);
      expect(button.disabled).toBe(false);
      expect(description(button)).toBe(UNAVAILABLE_REASON);
      fireEvent.click(button);
      await act(async () => {});
      expect(writeText).not.toHaveBeenCalled();
      expect(screen.queryByText(/copied|could not be copied|can’t copy/)).toBeNull();
      expect(input.value).toBe(text);
    }
  );

  it('becomes unavailable as soon as the number is cleared, without copying the earlier number', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard({ writeText });
    renderWithToasts('42');
    fireEvent.click(screen.getByRole('button', { name: 'Clear input' }));
    expect(blocked(copyButton())).toBe(true);
    fireEvent.click(copyButton());
    await act(async () => {});
    expect(writeText).not.toHaveBeenCalled();
  });
});
